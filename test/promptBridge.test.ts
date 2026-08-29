import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { PromptBridge } from '../src/promptBridge';
import type { ExtensionMessage } from '../src/webviewProtocol';

/** Collects what the bridge posts and lets a test answer by prompt index. */
function createBridge() {
  const posted: ExtensionMessage[] = [];
  const bridge = new PromptBridge((message) => posted.push(message));
  const prompts = () =>
    posted.filter((m) => m.type === 'prompt') as (ExtensionMessage & {
      type: 'prompt';
      id: string;
      title: string;
    })[];
  const answer = (index: number, value: string | string[] | undefined) =>
    bridge.handleMessage({ type: 'promptResponse', id: prompts()[index].id, value });
  return { bridge, posted, prompts, answer };
}

/** Resolves once pending microtasks have run, so a settled promise is observable. */
const settle = () => new Promise((resolve) => setImmediate(resolve));

test('an answer resolves the question that asked for it', async () => {
  const { bridge, prompts, answer } = createBridge();
  const pick = bridge.pick('Choose a platform', [
    { label: 'Android', value: 'android' },
    { label: 'iOS', value: 'ios' },
  ]);
  assert.equal(prompts().length, 1);
  answer(0, 'ios');
  assert.equal(await pick, 'ios');
  assert.equal(bridge.hasPendingPrompt, false);
});

test('a cancelled question resolves as undefined so the flow unwinds', async () => {
  const { bridge, answer } = createBridge();
  const input = bridge.input('Release notes');
  answer(0, undefined);
  assert.equal(await input, undefined);
});

test('an answer to a question that is no longer open is ignored', async () => {
  const { bridge, prompts, answer } = createBridge();
  const first = bridge.pick('First', [{ label: 'a', value: 'a' }]);
  answer(0, 'a');
  assert.equal(await first, 'a');

  const second = bridge.pick('Second', [{ label: 'b', value: 'b' }]);
  // Replaying the stale id must not resolve the question now on screen.
  answer(0, 'a');
  assert.equal(bridge.hasPendingPrompt, true);
  answer(1, 'b');
  assert.equal(await second, 'b');
  assert.equal(prompts().length, 2);
});

/**
 * The regression this file exists for. Starting a second flow while the first
 * is still waiting used to leave the first suspended forever, and `replay`
 * would later push its forgotten question at the user — who could answer it
 * and unknowingly resume a release they had walked away from.
 */
test('a second flow supersedes an unanswered one instead of orphaning it', async () => {
  const { bridge, prompts, answer } = createBridge();

  let abandonedSettled = false;
  const abandoned = bridge
    .pick('Choose an EAS build profile', [{ label: 'production', value: 'production' }])
    .then((value) => {
      abandonedSettled = true;
      return value;
    });

  // The user ignores that question and starts something else.
  const replacement = bridge.pick('Project health', [{ label: 'Check', value: 'check' }]);
  await settle();

  assert.equal(abandonedSettled, true, 'the abandoned flow must not stay suspended');
  assert.equal(await abandoned, undefined, 'it unwinds as a cancellation');

  answer(1, 'check');
  assert.equal(await replacement, 'check');
  assert.equal(prompts().length, 2);
});

test('a superseded question is never replayed to a rebuilt view', async () => {
  const { bridge, posted, prompts } = createBridge();
  void bridge.pick('Choose an EAS build profile', [{ label: 'production', value: 'production' }]);
  void bridge.pick('Project health', [{ label: 'Check', value: 'check' }]);
  await settle();

  const before = posted.length;
  bridge.replay();
  const replayed = posted.slice(before).filter((m) => m.type === 'prompt') as { title: string }[];
  assert.deepEqual(
    replayed.map((m) => m.title),
    ['Project health'],
    'only the live question is restored',
  );
  assert.equal(prompts().length, 3);
});

test('replay restores the open question so a hidden sidebar does not lose a wizard', async () => {
  const { bridge, posted, answer } = createBridge();
  const pick = bridge.pick('Choose a platform', [{ label: 'iOS', value: 'ios' }]);
  const before = posted.length;
  bridge.replay();
  assert.equal(posted.length, before + 1, 'the pending question is re-posted');

  // Either copy of the question carries the same id, so either can answer it.
  answer(1, 'ios');
  assert.equal(await pick, 'ios');
});

test('nothing is replayed once every question has been answered', async () => {
  const { bridge, posted, answer } = createBridge();
  const confirm = bridge.confirm('Create an EAS build?', {
    description: 'Uploads source to EAS.',
    confirmLabel: 'Create Build',
  });
  answer(0, 'confirm');
  assert.equal(await confirm, true);

  const before = posted.length;
  bridge.replay();
  assert.equal(posted.length, before);
  assert.equal(bridge.hasPendingPrompt, false);
});

test('disposing cancels the open question rather than leaving it hanging', async () => {
  const { bridge } = createBridge();
  const pick = bridge.pick('Choose a platform', [{ label: 'iOS', value: 'ios' }]);
  bridge.dispose();
  assert.equal(await pick, undefined);
  assert.equal(bridge.hasPendingPrompt, false);
});

test('each prompt kind narrows its answer to the shape the caller expects', async () => {
  const { bridge, answer } = createBridge();

  const multi = bridge.multiPick('Packages', [{ label: 'zustand', value: 'zustand' }]);
  answer(0, ['zustand']);
  assert.deepEqual(await multi, ['zustand']);

  // A pick that somehow receives an array, or an input that receives one, is
  // treated as no answer rather than coerced.
  const pick = bridge.pick('Platform', [{ label: 'iOS', value: 'ios' }]);
  answer(1, ['ios']);
  assert.equal(await pick, undefined);

  const confirmed = bridge.confirm('Sure?', { description: 'd', confirmLabel: 'Yes' });
  answer(2, 'something-else');
  assert.equal(await confirmed, false, 'only the exact confirm token accepts');
});
