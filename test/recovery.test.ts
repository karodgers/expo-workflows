import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { ExpoProjectInfo } from '../src/projectInfo';
import { classifyFailure, setupRecommendation } from '../src/recovery';

function project(overrides: Partial<ExpoProjectInfo> = {}): ExpoProjectInfo {
  return {
    root: '/workspace/app',
    relativePath: '.',
    name: 'Example',
    configFile: 'app.json',
    hasGeneratedConfig: false,
    packageManager: 'npm',
    hasDependencies: true,
    hasEasConfig: true,
    hasStoreMetadata: true,
    hasUpdates: true,
    projectId: 'project-id',
    buildProfiles: [{ name: 'production', channel: 'production' }],
    submitProfiles: ['production'],
    ...overrides,
  };
}

test('maps missing modules and dependency alignment failures to executable corrections', () => {
  const missing = classifyFailure({
    script: 'doctor.sh',
    args: ['check'],
    output: "Error: Cannot find module 'expo/package.json'",
    project: project({ hasDependencies: false }),
  });
  assert.equal(missing[0].command, 'novaExpo.dependencies.install');

  const mismatch = classifyFailure({
    script: 'doctor.sh',
    args: ['check'],
    output: 'Dependencies are incompatible with the installed Expo SDK. Run expo install --fix.',
    project: project(),
  });
  assert.equal(mismatch[0].command, 'novaExpo.doctor.fix');
});

test('maps cloud and release failures to the corresponding toolkit workflow', () => {
  const auth = classifyFailure({
    script: 'build.sh',
    args: ['create'],
    output: 'Authentication is required. Log in to Expo and try again.',
    project: project(),
  });
  assert.deepEqual(auth[0].args, ['account.login']);

  const release = classifyFailure({
    script: 'release-check.sh',
    args: ['submit'],
    output: [
      "EAS build profile 'production' is missing",
      'android.package is missing from app.json',
      'store.config.json is missing',
    ].join('\n'),
    project: project(),
  });
  assert.deepEqual(
    release.map((item) => item.id),
    ['configure-eas-build', 'configure-identifiers', 'configure-store-metadata'],
  );
});

test('does not suggest repeating a corrective action that just failed', () => {
  const suggestions = classifyFailure({
    script: 'doctor.sh',
    args: ['fix'],
    output: 'Dependencies are incompatible. Run expo install --fix.',
    project: project(),
  });
  assert.equal(
    suggestions.some((item) => item.id === 'fix-dependencies'),
    false,
  );

  const setupFailure = classifyFailure({
    script: 'project.sh',
    args: ['init'],
    output: 'Interactive terminal exited with code 1.',
    project: project({ projectId: undefined }),
  });
  assert.deepEqual(
    setupFailure.map((item) => item.id),
    ['expo-login'],
  );

  // A failed login is not offered "log in" again, but it is never left with
  // nothing either: the fallback is what keeps an unclassified failure from
  // ending at a bare exit code.
  const loginFailure = classifyFailure({
    script: 'auth.sh',
    args: ['login'],
    output: 'Interactive terminal exited with code 1.',
    project: project({ projectId: undefined }),
  });
  assert.deepEqual(
    loginFailure.map((item) => item.id),
    ['check-project-health', 'read-expo-documentation'],
  );
  assert.equal(
    loginFailure.some((item) => item.id === 'expo-login'),
    false,
  );
});

test('an unclassified failure still offers a next step and the right documentation', () => {
  const unknown = classifyFailure({
    script: 'build.sh',
    args: ['list'],
    output: 'Request failed with an unrecognized server error.',
    project: project(),
  });
  assert.ok(unknown.length > 0, 'a failure must never be a dead end');
  const docs = unknown.find((item) => item.id === 'read-expo-documentation');
  // The link is the failing action's own page, not a generic docs landing page.
  assert.equal(docs?.args?.[0], 'https://docs.expo.dev/build/introduction/');
  assert.equal(docs?.command, 'novaExpo.docs.open');
});

test('a failed health check is not told to run the health check again', () => {
  const doctorFailure = classifyFailure({
    script: 'doctor.sh',
    args: ['check'],
    output: 'Something unrecognized went wrong.',
    project: project(),
  });
  assert.equal(
    doctorFailure.some((item) => item.id === 'check-project-health'),
    false,
  );
  assert.ok(doctorFailure.some((item) => item.id === 'read-expo-documentation'));
});

test('new-project guidance recommends the next incomplete setup step', () => {
  assert.equal(
    setupRecommendation(project({ hasDependencies: false }))?.id,
    'install-dependencies',
  );
  assert.equal(setupRecommendation(project({ hasEasConfig: false }))?.id, 'complete-eas-setup');
  assert.equal(setupRecommendation(project({ projectId: undefined }))?.id, 'link-eas-project');
  assert.equal(setupRecommendation(project({ hasUpdates: false }))?.id, 'configure-eas-update');
  assert.equal(setupRecommendation(project()), undefined);
});

test('an uncommitted working tree points at source control instead of a retry', () => {
  const dirty = classifyFailure({
    script: 'release-check.sh',
    args: ['build', '--profile', 'production'],
    output:
      'error: the git working tree has uncommitted changes; commit them or explicitly use --allow-dirty\n',
    project: project(),
  });
  assert.deepEqual(
    dirty.map((item) => item.id),
    ['review-source-control'],
  );
  assert.equal(dirty[0].command, 'novaExpo.scm.open');
});
