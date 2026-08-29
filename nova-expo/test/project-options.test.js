const test = require('node:test');
const assert = require('node:assert/strict');

const {
  resolveProjectOptions,
  toDefaultAppIdentifier,
  toDisplayName,
  toPackageName,
  validateAppIdentifier,
} = require('../lib/project-options');

test('creates beginner-friendly defaults from a project folder', () => {
  assert.equal(toPackageName('My First App'), 'my-first-app');
  assert.equal(toDisplayName('/projects/my-first-app'), 'My First App');
  assert.equal(toDefaultAppIdentifier('my-first-app'), 'com.example.myfirstapp');
});

test('resolves explicit app naming options', () => {
  assert.deepEqual(
    resolveProjectOptions({
      appIdentifier: 'com.acme.mobile',
      displayName: 'Acme Mobile',
      packageName: 'acme-mobile',
      projectDirectory: './mobile',
    }),
    {
      appIdentifier: 'com.acme.mobile',
      displayName: 'Acme Mobile',
      packageName: 'acme-mobile',
    },
  );
});

test('rejects an invalid mobile application identifier', () => {
  assert.throws(
    () => validateAppIdentifier('My App'),
    /reverse-domain format/,
  );
  assert.throws(
    () => validateAppIdentifier('com.acme.mobile_app'),
    /letters and numbers/,
  );
});
