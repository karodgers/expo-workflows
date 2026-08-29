import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  OPTIONAL_PACKAGES,
  classifyCreationFailure,
  parseAdditionalPackages,
  toDefaultAppIdentifier,
  toDisplayName,
  toPackageName,
  validateAppIdentifier,
  validateCommandValue,
  validateDisplayName,
  validatePackageName,
  validateProjectFolderName,
} from '../src/projectCreation';

test('distinguishes final validation failures from incomplete creation', () => {
  assert.equal(
    classifyCreationFailure(true, true, '6/6  Validate the finished project\nFAIL test'),
    'validation',
  );
  assert.equal(classifyCreationFailure(true, true, 'npm install failed'), 'setup');
  assert.equal(classifyCreationFailure(false, false, 'Node could not start'), 'creation');
});

test('derives safe defaults for the creation wizard', () => {
  assert.equal(toDisplayName('acme-mobile_app'), 'Acme Mobile App');
  assert.equal(toPackageName('Ácme Mobile App'), 'acme-mobile-app');
  assert.equal(toDefaultAppIdentifier('acme-mobile'), 'com.example.acmemobile');
});

test('validates project, package, and application identifiers', () => {
  assert.equal(validateProjectFolderName('mobile-app'), undefined);
  assert.match(validateProjectFolderName('../mobile') ?? '', /letters, numbers/);
  assert.match(validateProjectFolderName('CON') ?? '', /Windows/);
  assert.match(validateProjectFolderName('mobile.') ?? '', /end with a dot/);
  assert.equal(validatePackageName('mobile-app'), undefined);
  assert.match(validatePackageName('Mobile App') ?? '', /lowercase/);
  assert.equal(validateAppIdentifier('com.acme.mobile'), undefined);
  assert.match(validateAppIdentifier('acme') ?? '', /reverse-domain/);
  assert.match(validateAppIdentifier('com.acme.mobile_app') ?? '', /letters and numbers/);
});

test('parses custom packages with optional versions and removes duplicates', () => {
  assert.deepEqual(parseAdditionalPackages('@sentry/react-native@^7.0.0, date-fns date-fns'), {
    packages: ['@sentry/react-native@^7.0.0', 'date-fns'],
  });
  assert.match(
    parseAdditionalPackages('not/a/valid/package').error ?? '',
    /not a valid npm package/,
  );
});

test('optional package catalog contains unique npm package names', () => {
  const names = OPTIONAL_PACKAGES.map((item) => item.name);
  assert.equal(new Set(names).size, names.length);
  assert.equal(names.length > 20, true);
  assert.equal(
    OPTIONAL_PACKAGES.every((item) => item.selected === false),
    true,
  );
});

test('rejects prompt values that a command line would read as options', () => {
  assert.equal(validateCommandValue('Nova Release 1.2'), undefined);
  assert.ok(validateCommandValue('--dry-run'));
  assert.ok(validateCommandValue('-p'));
  assert.ok(validateDisplayName('--project'));
});
