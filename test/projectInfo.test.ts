import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, test } from 'node:test';
import { isExpoProjectRoot, readExpoProjectInfo } from '../src/projectInfo';

const temporaryDirectories: string[] = [];

function temporaryProject(): string {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'nova-expo-extension-'));
  temporaryDirectories.push(directory);
  return directory;
}

function writeJson(root: string, name: string, value: unknown): void {
  fs.writeFileSync(path.join(root, name), JSON.stringify(value));
}

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('reads Expo, EAS, and release metadata from a project', () => {
  const workspace = temporaryProject();
  const root = path.join(workspace, 'apps', 'mobile');
  fs.mkdirSync(root, { recursive: true });
  writeJson(root, 'package.json', {
    name: '@example/mobile',
    dependencies: { expo: '~54.0.12', 'expo-updates': '^0.28.0' },
  });
  writeJson(root, 'app.json', {
    expo: {
      name: 'Example Mobile',
      slug: 'example-mobile',
      android: { package: 'com.example.mobile' },
      ios: { bundleIdentifier: 'com.example.mobile' },
      extra: { eas: { projectId: 'project-id' } },
    },
  });
  writeJson(root, 'eas.json', {
    build: {
      preview: { distribution: 'internal', channel: 'preview' },
      production: { channel: 'production', environment: 'production' },
    },
  });
  writeJson(root, 'store.config.json', { configVersion: 0 });
  fs.writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
  fs.mkdirSync(path.join(root, 'node_modules', 'expo'), { recursive: true });
  writeJson(path.join(root, 'node_modules', 'expo'), 'package.json', { name: 'expo' });

  const project = readExpoProjectInfo(root, workspace);
  assert.ok(project);
  assert.equal(project.name, 'Example Mobile');
  assert.equal(project.sdkVersion, '54');
  assert.equal(project.relativePath, path.join('apps', 'mobile'));
  assert.equal(project.packageManager, 'pnpm');
  assert.equal(project.projectId, 'project-id');
  assert.equal(project.hasDependencies, true);
  assert.equal(project.hasStoreMetadata, true);
  assert.equal(project.hasUpdates, true);
  assert.deepEqual(
    project.buildProfiles.map((profile) => profile.name),
    ['preview', 'production'],
  );
});

test('detects dynamic-config projects without evaluating project code', () => {
  const root = temporaryProject();
  writeJson(root, 'package.json', { name: 'dynamic-app', devDependencies: { expo: '^53.0.0' } });
  fs.writeFileSync(path.join(root, 'app.config.ts'), 'throw new Error("must not execute");');

  assert.equal(isExpoProjectRoot(root), true);
  const project = readExpoProjectInfo(root);
  assert.ok(project);
  assert.equal(project.name, 'dynamic-app');
  assert.equal(project.configFile, 'app.config.ts');
  assert.equal(project.sdkVersion, '53');
});

test('detects hoisted monorepo dependencies and the workspace package manager', () => {
  const workspace = temporaryProject();
  const root = path.join(workspace, 'apps', 'mobile');
  fs.mkdirSync(root, { recursive: true });
  writeJson(root, 'package.json', { name: 'mobile', dependencies: { expo: '^57.0.0' } });
  fs.writeFileSync(path.join(workspace, 'yarn.lock'), '');
  fs.mkdirSync(path.join(workspace, 'node_modules', 'expo'), { recursive: true });
  writeJson(path.join(workspace, 'node_modules', 'expo'), 'package.json', { name: 'expo' });

  const project = readExpoProjectInfo(root, workspace);
  assert.ok(project);
  assert.equal(project.packageManager, 'yarn');
  assert.equal(project.hasDependencies, true);
});

test('rejects package directories that do not declare Expo', () => {
  const root = temporaryProject();
  writeJson(root, 'package.json', { name: 'server', dependencies: { express: '^5.0.0' } });
  assert.equal(isExpoProjectRoot(root), false);
  assert.equal(readExpoProjectInfo(root), undefined);
});
