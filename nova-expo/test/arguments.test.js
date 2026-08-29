const test = require('node:test');
const assert = require('node:assert/strict');

const { parseArguments } = require('../lib/arguments');

test('parses a project directory with default options', () => {
  assert.deepEqual(parseArguments(['my-app']), {
    appIdentifier: undefined,
    additionalDevPackages: [],
    additionalPackages: [],
    cancelled: false,
    displayName: undefined,
    excludedPackages: [],
    help: false,
    interactive: false,
    packageName: undefined,
    projectDirectory: 'my-app',
    sdk: 'latest',
    skipInstall: false,
    skipValidation: false,
    version: false,
  });
});

test('parses repeatable package customization options', () => {
  const options = parseArguments([
    'my-app',
    '--exclude',
    'axios',
    '--exclude',
    'zustand',
    '--add',
    'sentry-expo@^7.0.0',
    '--add-dev',
    '@types/uuid@latest',
  ]);

  assert.deepEqual(options.excludedPackages, ['axios', 'zustand']);
  assert.deepEqual(options.additionalPackages, ['sentry-expo@^7.0.0']);
  assert.deepEqual(options.additionalDevPackages, ['@types/uuid@latest']);
});

test('parses SDK and validation options', () => {
  const options = parseArguments(['apps/mobile', '--sdk', '57', '--skip-validation']);

  assert.equal(options.projectDirectory, 'apps/mobile');
  assert.equal(options.sdk, '57');
  assert.equal(options.skipValidation, true);
});

test('parses beginner setup values supplied by an advanced user', () => {
  const options = parseArguments([
    'apps/mobile',
    '--name',
    'Acme Mobile',
    '--package-name',
    'acme-mobile',
    '--app-id',
    'com.acme.mobile',
  ]);

  assert.equal(options.displayName, 'Acme Mobile');
  assert.equal(options.packageName, 'acme-mobile');
  assert.equal(options.appIdentifier, 'com.acme.mobile');
});

test('rejects an invalid SDK value', () => {
  assert.throws(
    () => parseArguments(['my-app', '--sdk', 'beta']),
    /must be "latest" or a numeric SDK major/,
  );
});

test('rejects multiple project directories', () => {
  assert.throws(() => parseArguments(['first', 'second']), /Only one project directory/);
});

test('windows shell launches refuse anything that is not a bare token', () => {
  const { assertShellSafe, quoteForWindowsShell } = require('../lib/commands');

  // Every argument the initializer builds is already a bare token.
  assert.doesNotThrow(() =>
    assertShellSafe('npx', ['--yes', 'create-expo-app@latest', 'my-app', '--no-install']),
  );
  assert.doesNotThrow(() => assertShellSafe('npx', ['expo-doctor@^1.20.3']));

  // A path with a space would be split into two arguments by cmd.exe, and a
  // quote or a percent sign would end the quoting the launch depends on.
  for (const argument of ['C:\\Users\\My Name\\app', 'a"b', '%PATH%', 'a&b', 'a|b']) {
    assert.throws(() => assertShellSafe('npm', [argument]), /not a bare argument/);
  }

  // Quoting is what keeps a caret range a range rather than an exact version.
  assert.equal(quoteForWindowsShell('expo-doctor@^1.20.3'), '"expo-doctor@^1.20.3"');
});
