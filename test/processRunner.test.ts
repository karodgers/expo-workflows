import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ProcessRunner } from '../src/processRunner';
import { ExtensionMessage, isWebviewMessage } from '../src/webviewProtocol';

test('streams sanitized task output and reports completion', async () => {
  const messages: ExtensionMessage[] = [];
  const runner = new ProcessRunner((message) => messages.push(message));
  const code = await runner.run(
    process.execPath,
    ['-e', "process.stdout.write('\\u001b[31mready\\u001b[0m\\n')"],
    { cwd: process.cwd(), title: 'Test task' },
  );

  assert.equal(code, 0);
  assert.equal(runner.isBusy, false);
  assert.equal(
    messages
      .filter((message) => message.type === 'runOutput')
      .map((message) => message.chunk)
      .join(''),
    'ready\n',
  );
  assert.equal(messages.at(-1)?.type, 'runEnd');
  assert.equal(runner.snapshot?.status, 'success');
  assert.match(runner.snapshot?.output ?? '', /ready/);
});

test('cancels the active process group and reports cancellation', async () => {
  const messages: ExtensionMessage[] = [];
  const runner = new ProcessRunner((message) => messages.push(message));
  const completion = runner.run(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {
    cwd: process.cwd(),
    title: 'Long task',
  });
  const start = messages.find((message) => message.type === 'runStart');
  assert.ok(start && start.type === 'runStart');
  runner.handleMessage({ type: 'runCancel', id: start.id });

  await completion;
  const end = messages.find((message) => message.type === 'runEnd');
  assert.ok(end && end.type === 'runEnd');
  assert.equal(end.cancelled, true);
  assert.equal(runner.snapshot?.status, 'cancelled');
});

test('webview protocol rejects arbitrary commands and malformed arguments', () => {
  assert.equal(
    isWebviewMessage({ type: 'command', command: 'novaExpo.build', args: ['preview'] }),
    true,
  );
  assert.equal(
    isWebviewMessage({
      type: 'command',
      command: 'novaExpo.build',
      args: [{ profile: 'preview' }],
    }),
    false,
  );
  assert.equal(isWebviewMessage({ type: 'runCancel', id: 42 }), false);
});

test('retains recovery actions for a failed external task', () => {
  const messages: ExtensionMessage[] = [];
  const runner = new ProcessRunner((message) => messages.push(message));
  runner.recordExternalFailure('Interactive setup', 'Terminal exited with code 1.\n', 1);
  runner.attachRecoveries([
    {
      id: 'login',
      label: 'Log In',
      description: 'Authenticate with Expo.',
      command: 'novaExpo.toolkitAction',
      args: ['account.login'],
    },
  ]);

  assert.equal(runner.snapshot?.status, 'error');
  assert.equal(runner.snapshot?.recoveries?.[0].id, 'login');
  assert.equal(messages.at(-1)?.type, 'runRecovery');
});

test('retains a completion action for a successful task', async () => {
  const messages: ExtensionMessage[] = [];
  const runner = new ProcessRunner((message) => messages.push(message));
  await runner.run(process.execPath, ['-e', 'process.exit(0)'], {
    cwd: process.cwd(),
    title: 'Create project',
  });
  runner.attachCompletion({
    label: 'Open Project',
    description: 'Open the newly created project in this VS Code window.',
    command: 'novaExpo.project.openCreated',
  });

  assert.equal(runner.snapshot?.completion?.command, 'novaExpo.project.openCreated');
  assert.equal(messages.at(-1)?.type, 'runCompletion');
});

test('reassembles escape sequences and multi-byte characters split across chunks', async () => {
  const messages: ExtensionMessage[] = [];
  const runner = new ProcessRunner((message) => messages.push(message));
  // Writes an SGR sequence and a multi-byte character one byte at a time, which
  // is how a slow CLI writing through a pipe reaches the extension.
  const script = [
    "const bytes = Buffer.from('\\u001b[32mgrün\\u001b[0m done\\n', 'utf8');",
    'let index = 0;',
    'const timer = setInterval(() => {',
    '  if (index >= bytes.length) { clearInterval(timer); return; }',
    '  process.stdout.write(bytes.subarray(index, index + 1));',
    '  index += 1;',
    '}, 1);',
  ].join('');
  const code = await runner.run(process.execPath, ['-e', script], {
    cwd: process.cwd(),
    title: 'Split output',
  });

  assert.equal(code, 0);
  assert.equal(runner.snapshot?.output, 'grün done\n');
});

test('a second concurrent run is refused rather than started invisibly', async () => {
  const messages: ExtensionMessage[] = [];
  const runner = new ProcessRunner((message) => messages.push(message));

  const first = runner.run(process.execPath, ['-e', 'setTimeout(() => {}, 200)'], {
    cwd: process.cwd(),
    title: 'First task',
  });
  // The runner reports one task and can stop one task, so a second process
  // started here would be unreachable from the dashboard.
  assert.equal(runner.isBusy, true);
  assert.equal(
    await runner.run(process.execPath, ['-e', ''], { cwd: process.cwd(), title: 'Second task' }),
    null,
  );
  assert.equal(runner.snapshot?.title, 'First task');
  assert.equal(messages.filter((message) => message.type === 'runStart').length, 1);

  runner.dispose();
  await first;
});
