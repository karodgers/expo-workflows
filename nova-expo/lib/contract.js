const fs = require('node:fs');
const path = require('node:path');

const PROJECT_SCRIPTS = {
  start: 'expo start',
  android: 'expo run:android',
  ios: 'expo run:ios',
  lint: 'eslint . --ext .js,.jsx,.ts,.tsx',
  'lint:fix': 'eslint . --ext .js,.jsx,.ts,.tsx --fix',
  'lint:strict': 'eslint . --ext .js,.jsx,.ts,.tsx --max-warnings 0',
  format: 'prettier --write "**/*.{js,jsx,ts,tsx,json,md}"',
  'format:check': 'prettier --check "**/*.{js,jsx,ts,tsx,json,md}"',
  typecheck: 'tsc --noEmit',
  test: 'jest --passWithNoTests',
  'test:coverage': 'jest --coverage',
  'deps:check': 'expo install --check',
  doctor: 'npx expo-doctor',
  validate:
    'npm run deps:check && npm run doctor && npm run typecheck && npm run lint:strict && npm run format:check && npm test',
  prepare: 'husky',
  prebuild: 'expo prebuild --clean',
  workflow: 'nova-workflows',
};

const LINT_STAGED = {
  '!(.eslintrc|.prettierrc)*.{js,jsx,ts,tsx}': [
    'eslint --fix --max-warnings 0',
    'prettier --write',
  ],
  '*.{json,md,yml,yaml}': ['prettier --write'],
};

const REQUIRED_DEPENDENCIES = new Set([
  'babel-preset-expo',
  'expo',
  'expo-constants',
  'expo-linking',
  'expo-router',
  'expo-status-bar',
  'react',
  'react-dom',
  'react-native',
  'react-native-safe-area-context',
  'react-native-screens',
]);

function parsePackageSpecifier(specifier) {
  const scoped = specifier.startsWith('@');
  const separator = specifier.lastIndexOf('@');
  const hasVersion = separator > (scoped ? specifier.indexOf('/') : 0);
  const name = hasVersion ? specifier.slice(0, separator) : specifier;
  const version = hasVersion ? specifier.slice(separator + 1) : 'latest';
  if (!/^(?:@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*|[a-z0-9][a-z0-9._-]*)$/.test(name)) {
    throw new Error(`Invalid npm package name: ${specifier}`);
  }
  if (!version || /\s/.test(version)) {
    throw new Error(`Invalid npm package version: ${specifier}`);
  }
  return [name, version];
}

function applyPackageSelection(packages, excludedPackages, additionalPackages) {
  const selected = { ...packages };
  for (const name of excludedPackages) {
    if (REQUIRED_DEPENDENCIES.has(name)) {
      throw new Error(`${name} is required by the Nova project template and cannot be excluded.`);
    }
    delete selected[name];
  }
  for (const specifier of additionalPackages) {
    const [name, version] = parsePackageSpecifier(specifier);
    selected[name] = version;
  }
  return selected;
}

function validatePackageSelection(contract, packageSelection = {}) {
  const excludedPackages = packageSelection.excludedPackages || [];
  const knownPackages = new Set([...Object.keys(contract.dependencies), ...Object.keys(contract.devDependencies)]);
  for (const name of excludedPackages) {
    if (!knownPackages.has(name)) throw new Error(`Cannot exclude unknown Nova package: ${name}`);
    if (Object.hasOwn(contract.devDependencies, name)) {
      throw new Error(`${name} is required by the Nova development toolchain and cannot be excluded.`);
    }
    if (REQUIRED_DEPENDENCIES.has(name)) {
      throw new Error(`${name} is required by the Nova project template and cannot be excluded.`);
    }
  }
  for (const specifier of [...(packageSelection.additionalPackages || []), ...(packageSelection.additionalDevPackages || [])]) {
    parsePackageSpecifier(specifier);
  }
}

function readContract(packageRoot) {
  const contractPath = path.join(packageRoot, 'template', 'dependencies.json');
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

function selectVersions(requestedPackages, generatedPackages = {}) {
  return Object.fromEntries(
    Object.entries(requestedPackages).map(([name, requestedVersion]) => [
      name,
      generatedPackages[name] || requestedVersion,
    ]),
  );
}

function createProjectManifest(generatedManifest, contract, packageName, packageSelection = {}) {
  const excludedPackages = packageSelection.excludedPackages || [];
  const additionalPackages = packageSelection.additionalPackages || [];
  const additionalDevPackages = packageSelection.additionalDevPackages || [];
  validatePackageSelection(contract, packageSelection);
  const dependencies = applyPackageSelection(
    selectVersions(contract.dependencies, generatedManifest.dependencies),
    excludedPackages,
    additionalPackages,
  );
  const devDependencies = applyPackageSelection(
    selectVersions(contract.devDependencies, generatedManifest.devDependencies),
    [],
    additionalDevPackages,
  );

  if (dependencies.react) {
    dependencies['react-dom'] = dependencies.react;
    devDependencies['react-test-renderer'] = dependencies.react;
  }

  return {
    name: packageName,
    version: '1.0.0',
    main: 'expo-router/entry',
    scripts: PROJECT_SCRIPTS,
    dependencies,
    devDependencies,
    private: true,
    'lint-staged': LINT_STAGED,
  };
}

function packageNames(manifest) {
  return [...Object.keys(manifest.dependencies), ...Object.keys(manifest.devDependencies)].sort();
}

module.exports = { createProjectManifest, packageNames, parsePackageSpecifier, readContract, REQUIRED_DEPENDENCIES, validatePackageSelection };
