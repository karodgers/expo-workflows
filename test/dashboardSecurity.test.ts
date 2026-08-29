import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { findReservedFlag, isDocumentationUrl, isWebviewCommand } from '../src/dashboardSecurity';

/**
 * These two allowlists sit between the dashboard webview and command
 * execution. Neither has a runtime dependency, so the guard they provide is
 * checked directly here rather than only through the flows that use it.
 */

test('a value that would be read as a reserved workflow option is rejected', () => {
  // The extension supplies each of these itself; one arriving from a user
  // answer would redirect the project directory or turn a release into a
  // no-op dry run.
  for (const flag of [
    '--project',
    '--dry-run',
    '--non-interactive',
    '--interactive',
    '--allow-dirty',
    '--full',
  ]) {
    assert.equal(findReservedFlag(['status', flag]), flag, `${flag} must be caught`);
    assert.equal(
      findReservedFlag(['status', `${flag}=/somewhere/else`]),
      `${flag}=/somewhere/else`,
      `${flag}= must be caught`,
    );
  }
});

test('the reserved-flag check reports the offending argument wherever it sits', () => {
  assert.equal(findReservedFlag(['--dry-run', 'list']), '--dry-run');
  assert.equal(findReservedFlag(['list', '--branch', 'main', '--project', '/etc']), '--project');
});

test('ordinary arguments and lookalikes are left alone', () => {
  assert.equal(findReservedFlag([]), undefined);
  assert.equal(findReservedFlag(['create', '--profile', 'production']), undefined);
  assert.equal(findReservedFlag(['list', '--branch', 'main']), undefined);
  // Prefix and suffix collisions must not trip the check.
  assert.equal(findReservedFlag(['--projects']), undefined);
  assert.equal(findReservedFlag(['--dry-run-please']), undefined);
  assert.equal(findReservedFlag(['not--project']), undefined);
  // A value that merely contains a reserved flag is not an option itself.
  assert.equal(findReservedFlag(['a value mentioning --project']), undefined);
});

test('the webview may invoke Nova commands and nothing else', () => {
  assert.equal(isWebviewCommand('novaExpo.build'), true);
  assert.equal(isWebviewCommand('novaExpo.toolkitAction'), true);
  assert.equal(isWebviewCommand('novaExpo.workspace.trust'), true);

  // Built-in commands would run arbitrary editor actions on a webview's say-so.
  assert.equal(isWebviewCommand('workbench.action.terminal.new'), false);
  assert.equal(isWebviewCommand('workbench.action.tasks.runTask'), false);
  assert.equal(isWebviewCommand('vscode.openFolder'), false);
  // A Nova-looking name that was never registered is still refused.
  assert.equal(isWebviewCommand('novaExpo.notARealCommand'), false);
  assert.equal(isWebviewCommand(''), false);
});

test('the allowlist does not expose commands the dashboard never offers', () => {
  // novaExpo.refresh is a view-title menu command, invoked by VS Code rather
  // than by the webview; listing it here would widen the surface for nothing.
  assert.equal(isWebviewCommand('novaExpo.refresh'), false);
});

test('only Expo documentation over https can be opened from the dashboard', () => {
  for (const url of [
    'https://docs.expo.dev/build/introduction/',
    'https://docs.expo.dev/eas-insights/introduction/#app-observability',
    'https://expo.dev/accounts',
  ]) {
    assert.equal(isDocumentationUrl(url), true, `${url} should be allowed`);
  }

  for (const url of [
    'http://docs.expo.dev/build/introduction/',
    'https://docs.expo.dev.example.com/',
    'https://evil.test/docs.expo.dev',
    'https://notexpo.dev/',
    'javascript:alert(1)',
    'file:///etc/passwd',
    'vscode://ms-vscode.node-debug',
    '',
    'docs.expo.dev',
  ]) {
    assert.equal(isDocumentationUrl(url), false, `${url} must be refused`);
  }
});

test('the documentation command is reachable from the webview', () => {
  // The link is rendered as a host command rather than an anchor, so the
  // allowlist has to carry it or every docs link silently does nothing.
  assert.equal(isWebviewCommand('novaExpo.docs.open'), true);
});

test('the gate flags the extension adds are exactly the ones users may not supply', () => {
  // These two are on the reserved list so no typed answer can become them, and
  // the release gate adds them itself after asking. They therefore have to
  // travel through `toolkitFlags`, appended after this check — passing them in
  // `args` would make the gate refuse its own override and dead-end the flow.
  for (const flag of ['--allow-dirty', '--full']) {
    assert.equal(findReservedFlag(['build', flag]), flag, `${flag} must be caught in args`);
  }

  // A profile or branch name that merely resembles one is still a value.
  assert.equal(findReservedFlag(['build', '--profile', 'allow-dirty']), undefined);
  assert.equal(findReservedFlag(['update', '--branch', 'full']), undefined);
});
