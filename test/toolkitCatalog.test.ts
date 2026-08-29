import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ACTION_CATEGORIES,
  findToolkitAction,
  SUCCESS_NEXT_STEPS,
  TOOLKIT_ACTIONS,
} from '../src/toolkitCatalog';
import { isDocumentationUrl } from '../src/dashboardSecurity';

test('workflow catalog has unique, safe, resolvable entries', () => {
  const ids = new Set<string>();
  const categories = new Set(ACTION_CATEGORIES.map((category) => category.id));
  for (const action of TOOLKIT_ACTIONS) {
    assert.equal(ids.has(action.id), false, `duplicate action id: ${action.id}`);
    ids.add(action.id);
    assert.match(action.script, /^[a-z0-9-]+\.sh$/);
    assert.equal(categories.has(action.category), true, `unknown category: ${action.category}`);
    assert.equal(
      action.args.every((argument) => typeof argument === 'string' && argument.length > 0),
      true,
    );
    assert.equal(findToolkitAction(action.id), action);
  }
  assert.equal(ids.size, TOOLKIT_ACTIONS.length);
});

test('mutating setup and release operations require confirmation', () => {
  for (const id of [
    'project.setup',
    'development.prebuild',
    'release.metadata-push',
    'cloud.deploy-preview',
  ]) {
    assert.ok(findToolkitAction(id)?.confirm, `${id} should require confirmation`);
  }
});

test('TTY-dependent operations are routed to an interactive terminal', () => {
  for (const id of [
    'project.init',
    'updates.compare-fingerprint',
    'release.credentials',
    'account.login',
  ]) {
    assert.equal(findToolkitAction(id)?.interactive, true, `${id} should be interactive`);
  }
});

test('locally compiling actions open a terminal and say what they change', () => {
  // These run a full native build, write android/ or ios/, and ask which
  // device to use. Left unmarked they would run on a single click and the
  // detail screen would badge them "Read only".
  for (const id of ['development.prebuild', 'development.android', 'development.ios']) {
    const action = findToolkitAction(id);
    assert.ok(action, `${id} should exist`);
    assert.equal(action.interactive, true, `${id} must open an interactive terminal`);
    assert.ok(action.confirm, `${id} must require confirmation`);
    assert.ok(action.explanation, `${id} must explain what it does`);
    assert.ok(action.effects?.length, `${id} must list what it can change`);
  }
});

test('EAS actions with required values stay in the prepared dashboard path', () => {
  for (const id of ['updates.list', 'updates.insights', 'account.usage', 'account.audit']) {
    const action = findToolkitAction(id);
    assert.ok(action, `${id} should exist`);
    assert.equal(
      action.interactive,
      undefined,
      `${id} should collect dashboard input before running`,
    );
    assert.equal(action?.confirm, undefined, `${id} should not show a mutation confirmation`);
  }
});

test('every action explains itself, says what it touches, and links to Expo docs', () => {
  // The review screen is the only place a user is told what an action does
  // before taking it, and it renders these three fields. An entry missing one
  // is an action taken on trust.
  for (const action of TOOLKIT_ACTIONS) {
    assert.ok(action.explanation.length > 40, `${action.id} needs a real explanation`);
    assert.notEqual(
      action.explanation,
      action.description,
      `${action.id} should explain more than its one-line description`,
    );
    assert.ok(action.effects.length > 0, `${action.id} must say what it touches`);
    assert.ok(
      action.effects.every((effect) => effect.length > 0),
      `${action.id} has an empty effect`,
    );
    assert.ok(
      isDocumentationUrl(action.docsUrl),
      `${action.id} docsUrl must pass the host allowlist: ${action.docsUrl}`,
    );
  }
});

test('an action that changes nothing says so, and one that does requires confirmation', () => {
  for (const action of TOOLKIT_ACTIONS) {
    const readOnly = action.effects.includes('Changes nothing');
    if (readOnly) {
      assert.equal(
        action.confirm,
        undefined,
        `${action.id} reads only, so it should not ask for confirmation`,
      );
    }
  }
});

test('every success next step names a real action and a reachable command', () => {
  const ids = new Set(TOOLKIT_ACTIONS.map((action) => action.id));
  for (const [source, next] of Object.entries(SUCCESS_NEXT_STEPS)) {
    assert.ok(ids.has(source), `${source} is not a catalog action`);
    assert.ok(next.label.length > 0 && next.description.length > 0, `${source} next step is bare`);
    if (next.command === 'novaExpo.toolkitAction') {
      assert.ok(ids.has(next.args?.[0] ?? ''), `${source} points at an unknown action`);
    }
    assert.notEqual(next.args?.[0], source, `${source} must not point back at itself`);
  }
});
