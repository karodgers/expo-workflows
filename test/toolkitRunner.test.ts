import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { test } from 'node:test';
import Module from 'node:module';

/**
 * toolkitRunner decides which file on disk a workflow name resolves to, so its
 * guards are the last thing between a catalog entry and an executed script.
 *
 * It imports the vscode runtime, which does not exist outside the editor, so a
 * stub is registered in the module loader before the module under test is
 * required. Only the two APIs it actually calls are provided.
 */
let toolkitPathSetting = '';
let workspaceToolkitPathSetting: string | undefined;

const vscodeStub = {
  workspace: {
    // `inspect` is what the module under test reads, precisely so a workspace
    // value can be seen and ignored rather than silently taking effect.
    getConfiguration: () => ({
      inspect: (_key: string) => ({
        defaultValue: '',
        globalValue: toolkitPathSetting || undefined,
        workspaceValue: workspaceToolkitPathSetting,
        workspaceFolderValue: workspaceToolkitPathSetting,
      }),
    }),
  },
};

const loader = Module as unknown as {
  _load: (request: string, parent: unknown, isMain: boolean) => unknown;
};
const originalLoad = loader._load;
loader._load = function (request, parent, isMain) {
  if (request === 'vscode') return vscodeStub;
  return originalLoad.call(this, request, parent, isMain);
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { resolveScriptPath, resolveInitializerPath } = require('../src/toolkitRunner');

/** Builds a throwaway extension directory laid out the way a .vsix unpacks. */
function createExtensionDir(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-toolkit-'));
  fs.mkdirSync(path.join(root, 'resources', 'workflows'), { recursive: true });
  fs.mkdirSync(path.join(root, 'resources', 'nova-expo', 'bin'), { recursive: true });
  fs.writeFileSync(path.join(root, 'resources', 'workflows', 'build.sh'), '#!/bin/bash\n');
  fs.writeFileSync(path.join(root, 'resources', 'workflows', 'release-check.sh'), '#!/bin/bash\n');
  fs.mkdirSync(path.join(root, 'resources', 'workflows', 'lib'), { recursive: true });
  fs.writeFileSync(path.join(root, 'resources', 'workflows', 'lib', 'common.sh'), '# lib\n');
  fs.writeFileSync(
    path.join(root, 'resources', 'nova-expo', 'bin', 'nova-expo.js'),
    '#!/usr/bin/env node\n',
  );
  // A file that must never be reachable by escaping the workflows directory.
  fs.writeFileSync(path.join(root, 'secret.sh'), '#!/bin/bash\n');
  return root;
}

function contextFor(root: string) {
  return { extensionPath: root } as never;
}

test('a bundled workflow resolves to the file inside the extension', () => {
  const root = createExtensionDir();
  toolkitPathSetting = '';
  const resolved = resolveScriptPath(contextFor(root), 'build.sh');
  assert.equal(resolved, path.join(root, 'resources', 'workflows', 'build.sh'));
});

test('a name that is not a plain lowercase .sh file is refused', () => {
  const root = createExtensionDir();
  toolkitPathSetting = '';
  for (const name of [
    'build.SH',
    'Build.sh',
    'build.bash',
    'build',
    'build.sh.txt',
    'build sh',
    'build;rm -rf /.sh',
    '',
  ]) {
    assert.equal(resolveScriptPath(contextFor(root), name), undefined, `${name} must be refused`);
  }
});

test('a workflow name cannot escape the workflows directory', () => {
  const root = createExtensionDir();
  toolkitPathSetting = '';
  for (const name of [
    '../secret.sh',
    '../../secret.sh',
    'lib/common.sh',
    '/etc/passwd.sh',
    './build.sh',
    '..%2Fsecret.sh',
  ]) {
    assert.equal(resolveScriptPath(contextFor(root), name), undefined, `${name} must be refused`);
  }
  // The file it was reaching for does exist, so the refusal is the guard
  // working rather than the target simply being absent.
  assert.equal(fs.existsSync(path.join(root, 'secret.sh')), true);
});

test('a workflow that is not bundled resolves to nothing rather than throwing', () => {
  const root = createExtensionDir();
  toolkitPathSetting = '';
  assert.equal(resolveScriptPath(contextFor(root), 'no-such-workflow.sh'), undefined);
});

test('an absolute toolkitPath setting overrides the bundled copy', () => {
  const root = createExtensionDir();
  const custom = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-custom-'));
  fs.writeFileSync(path.join(custom, 'build.sh'), '#!/bin/bash\n');
  toolkitPathSetting = custom;
  assert.equal(resolveScriptPath(contextFor(root), 'build.sh'), path.join(custom, 'build.sh'));
  // The traversal guard still applies to a custom directory.
  assert.equal(resolveScriptPath(contextFor(root), '../secret.sh'), undefined);
});

test('a workspace-supplied toolkitPath is ignored in favour of the bundled copy', () => {
  const root = createExtensionDir();
  const repository = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-repo-'));
  fs.writeFileSync(path.join(repository, 'build.sh'), '#!/bin/bash\necho pwned\n');
  toolkitPathSetting = '';
  workspaceToolkitPathSetting = repository;
  // A repository that ships .vscode/settings.json must not be able to choose
  // which scripts the dashboard executes.
  assert.equal(
    resolveScriptPath(contextFor(root), 'build.sh', { fsPath: repository } as never),
    path.join(root, 'resources', 'workflows', 'build.sh'),
  );
  workspaceToolkitPathSetting = undefined;
});

test('a relative toolkitPath is refused rather than resolved against the workspace', () => {
  const root = createExtensionDir();
  const workspace = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-ws-'));
  fs.mkdirSync(path.join(workspace, 'my-workflows'));
  fs.writeFileSync(path.join(workspace, 'my-workflows', 'build.sh'), '#!/bin/bash\n');
  toolkitPathSetting = 'my-workflows';
  assert.equal(
    resolveScriptPath(contextFor(root), 'build.sh', { fsPath: workspace } as never),
    path.join(root, 'resources', 'workflows', 'build.sh'),
  );
  toolkitPathSetting = '';
});

test('a directory sharing a workflow name is not mistaken for a script', () => {
  const root = createExtensionDir();
  toolkitPathSetting = '';
  fs.mkdirSync(path.join(root, 'resources', 'workflows', 'decoy.sh'));
  assert.equal(resolveScriptPath(contextFor(root), 'decoy.sh'), undefined);
});

test('the bundled initializer resolves, and is absent rather than fatal when missing', () => {
  const root = createExtensionDir();
  assert.equal(
    resolveInitializerPath(contextFor(root)),
    path.join(root, 'resources', 'nova-expo', 'bin', 'nova-expo.js'),
  );

  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-empty-'));
  assert.equal(resolveInitializerPath(contextFor(empty)), undefined);
});
