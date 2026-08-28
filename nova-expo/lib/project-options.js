const path = require('node:path');

function toPackageName(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toDisplayName(projectDirectory) {
  const basename = path.basename(projectDirectory);
  return basename
    .replace(/[-_.]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function toDefaultAppIdentifier(packageName) {
  let suffix = packageName.replace(/[^a-z0-9]/g, '');
  if (!/^[a-z]/.test(suffix)) {
    suffix = `app${suffix}`;
  }
  return `com.example.${suffix || 'app'}`;
}

function validatePackageName(packageName) {
  if (packageName.length > 214) {
    throw new Error('Package name must be 214 characters or fewer.');
  }
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(packageName)) {
    throw new Error(
      'Package name must contain lowercase letters, numbers, and single hyphens only.',
    );
  }
}

function validateAppIdentifier(appIdentifier) {
  if (!/^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/.test(appIdentifier)) {
    throw new Error(
      'App identifier must use lowercase reverse-domain format with letters and numbers, such as com.yourcompany.myapp.',
    );
  }
}

function resolveProjectOptions(options) {
  const inferredPackageName = toPackageName(path.basename(options.projectDirectory));
  const packageName = options.packageName || inferredPackageName;
  const displayName = options.displayName || toDisplayName(options.projectDirectory);

  if (!packageName) {
    throw new Error('Could not derive a package name from the project directory.');
  }
  if (!displayName.trim()) {
    throw new Error('App display name cannot be empty.');
  }

  validatePackageName(packageName);
  if (options.appIdentifier) {
    validateAppIdentifier(options.appIdentifier);
  }

  return {
    appIdentifier: options.appIdentifier,
    displayName: displayName.trim(),
    packageName,
  };
}

module.exports = {
  resolveProjectOptions,
  toDefaultAppIdentifier,
  toDisplayName,
  toPackageName,
  validateAppIdentifier,
  validatePackageName,
};
