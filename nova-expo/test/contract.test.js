const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const {
  createProjectManifest,
  packageNames,
  parsePackageSpecifier,
  readContract,
  REQUIRED_DEPENDENCIES,
} = require('../lib/contract');

test('keeps exactly the package names in the dependency contract', () => {
  const contract = {
    dependencies: {
      expo: '~56.0.0',
      axios: '^1.0.0',
      react: '19.1.0',
      'react-dom': '^19.1.0',
    },
    devDependencies: { typescript: '~5.0.0', 'react-test-renderer': '19.1.0' },
  };
  const generated = {
    dependencies: { expo: '~57.0.11', react: '19.2.3', unwanted: '1.0.0' },
    devDependencies: { typescript: '~6.0.3', alsoUnwanted: '1.0.0' },
  };

  const manifest = createProjectManifest(generated, contract, 'example-app');

  assert.deepEqual(packageNames(manifest), [
    'axios',
    'expo',
    'react',
    'react-dom',
    'react-test-renderer',
    'typescript',
  ]);
  assert.equal(manifest.dependencies.expo, '~57.0.11');
  assert.equal(manifest.dependencies.axios, '^1.0.0');
  assert.equal(manifest.devDependencies.typescript, '~6.0.3');
  assert.equal(manifest.dependencies['react-dom'], '19.2.3');
  assert.equal(manifest.devDependencies['react-test-renderer'], '19.2.3');
  assert.equal(manifest.main, 'expo-router/entry');
  assert.equal(manifest.scripts.workflow, 'nova-workflows');
});

test('supports optional exclusions and custom npm packages', () => {
  const contract = {
    dependencies: { expo: '~57.0.0', react: '19.2.0', axios: '^1.0.0', zustand: '^5.0.0' },
    devDependencies: { typescript: '~6.0.0' },
  };
  const manifest = createProjectManifest({}, contract, 'custom-app', {
    excludedPackages: ['axios', 'zustand'],
    additionalPackages: ['@sentry/react-native@^7.0.0'],
    additionalDevPackages: ['tsx@latest'],
  });
  assert.equal(manifest.dependencies.axios, undefined);
  assert.equal(manifest.dependencies.zustand, undefined);
  assert.equal(manifest.dependencies['@sentry/react-native'], '^7.0.0');
  assert.equal(manifest.devDependencies.tsx, 'latest');
});

test('an empty optional selection installs only the required runtime contract', () => {
  const contract = readContract(path.resolve(__dirname, '..'));
  const optionalPackages = Object.keys(contract.dependencies).filter(
    (name) => !REQUIRED_DEPENDENCIES.has(name),
  );
  const manifest = createProjectManifest({}, contract, 'minimal-app', {
    excludedPackages: optionalPackages,
  });

  assert.equal(optionalPackages.length, 24);
  assert.equal(optionalPackages.every((name) => manifest.dependencies[name] === undefined), true);
  assert.equal(
    Object.keys(manifest.dependencies).every((name) => REQUIRED_DEPENDENCIES.has(name)),
    true,
  );
});

test('protects required template and development packages', () => {
  const contract = {
    dependencies: { expo: '~57.0.0', react: '19.2.0' },
    devDependencies: { typescript: '~6.0.0' },
  };
  assert.throws(
    () => createProjectManifest({}, contract, 'broken-app', { excludedPackages: ['expo'] }),
    /required by the Nova project template/,
  );
  assert.throws(
    () => createProjectManifest({}, contract, 'broken-app', { excludedPackages: ['typescript'] }),
    /required by the Nova development toolchain/,
  );
});

test('validates npm package specifiers', () => {
  assert.deepEqual(parsePackageSpecifier('@sentry/react-native@^7.0.0'), ['@sentry/react-native', '^7.0.0']);
  assert.deepEqual(parsePackageSpecifier('date-fns'), ['date-fns', 'latest']);
  assert.throws(() => parsePackageSpecifier('not a package'), /Invalid npm package name/);
});
