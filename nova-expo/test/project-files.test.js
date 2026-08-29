const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { updateAppConfig } = require('../lib/project-files');

test('optional package mocks do not require deselected packages to exist', () => {
  const setup = fs.readFileSync(path.resolve(__dirname, '..', 'jest.setup.js'), 'utf8');
  for (const packageName of [
    '@expo/vector-icons',
    'expo-secure-store',
    'react-native-mmkv',
    'react-native-reanimated',
    'react-native-worklets',
  ]) {
    const escaped = packageName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    assert.match(setup, new RegExp(`jest\\.mock\\('${escaped}'[\\s\\S]*?\\{ virtual: true \\}\\);`));
  }
});

test('generates environment-aware app variants with fingerprint runtimes', () => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-project-files-'));
  try {
    fs.writeFileSync(
      path.join(projectDirectory, 'app.json'),
      JSON.stringify({ expo: { name: 'Base', slug: 'base', plugins: [] } }),
    );

    updateAppConfig(projectDirectory, {
      appIdentifier: 'com.acme.mobile',
      displayName: 'Acme Mobile',
      packageName: 'acme-mobile',
    });

    const dynamicConfig = fs.readFileSync(path.join(projectDirectory, 'app.config.js'), 'utf8');
    assert.match(dynamicConfig, /com\.acme\.mobile\.dev/);
    assert.match(dynamicConfig, /com\.acme\.mobile\.preview/);
    assert.match(dynamicConfig, /policy: 'fingerprint'/);
    assert.match(dynamicConfig, /module\.exports = \(\{ config \}\)/);
    assert.doesNotMatch(dynamicConfig, /require\(['"]\.\/app\.json['"]\)/);

    const createConfig = require(path.join(projectDirectory, 'app.config.js'));
    const resolved = createConfig({ config: { name: 'Base', slug: 'base', extra: { retained: true } } });
    assert.equal(resolved.slug, 'base');
    assert.equal(resolved.extra.retained, true);
    assert.equal(resolved.android.package, 'com.acme.mobile');
  } finally {
    fs.rmSync(projectDirectory, { recursive: true });
  }
});

test('only configures native plugins for selected packages', () => {
  const projectDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-project-plugins-'));
  try {
    fs.writeFileSync(
      path.join(projectDirectory, 'app.json'),
      JSON.stringify({ expo: { name: 'Base', slug: 'base', plugins: [] } }),
    );
    updateAppConfig(projectDirectory, {
      displayName: 'Lean App',
      packageName: 'lean-app',
      packageNames: ['expo-router', 'expo-secure-store', 'expo-splash-screen'],
    });
    const { expo } = JSON.parse(fs.readFileSync(path.join(projectDirectory, 'app.json'), 'utf8'));
    assert.equal(expo.plugins.includes('expo-router'), true);
    assert.equal(expo.plugins.includes('expo-secure-store'), true);
    assert.equal(expo.plugins.includes('expo-notifications'), false);
    assert.equal(expo.plugins.some((plugin) => Array.isArray(plugin) && plugin[0] === 'expo-splash-screen'), true);
  } finally {
    fs.rmSync(projectDirectory, { recursive: true });
  }
});
