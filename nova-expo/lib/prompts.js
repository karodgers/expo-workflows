const { createInterface } = require('node:readline/promises');
const path = require('node:path');

const {
  toDefaultAppIdentifier,
  toDisplayName,
  toPackageName,
  validateAppIdentifier,
  validatePackageName,
} = require('./project-options');

async function askRequired(readline, label) {
  while (true) {
    const answer = (await readline.question(`  ${label}: `)).trim();
    if (answer) {
      return answer;
    }
    process.stdout.write('  Please enter a value.\n');
  }
}

async function askWithDefault(readline, label, defaultValue) {
  const answer = (await readline.question(`  ${label} [${defaultValue}]: `)).trim();
  return answer || defaultValue;
}

async function askUntilValid(readline, label, defaultValue, validate) {
  while (true) {
    const answer = await askWithDefault(readline, label, defaultValue);
    try {
      validate(answer);
      return answer;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stdout.write(`  ${message}\n`);
    }
  }
}

async function askYesNo(readline, label, defaultValue = true) {
  const hint = defaultValue ? 'Y/n' : 'y/N';
  const answer = (await readline.question(`  ${label} [${hint}]: `)).trim().toLowerCase();
  if (!answer) {
    return defaultValue;
  }
  return answer === 'y' || answer === 'yes';
}

async function collectInteractiveOptions(options, input = process.stdin, output = process.stdout) {
  const readline = createInterface({ input, output });

  try {
    output.write('  Answer a few questions. Press Enter to accept a suggested value.\n\n');

    const projectDirectory = options.projectDirectory || (await askRequired(readline, 'Project folder'));
    const defaultDisplayName = options.displayName || toDisplayName(projectDirectory);
    const displayName = await askWithDefault(readline, 'App name shown on the device', defaultDisplayName);
    const defaultPackageName = options.packageName || toPackageName(path.basename(projectDirectory));
    const packageName = await askUntilValid(
      readline,
      'Package name / Expo slug',
      defaultPackageName,
      validatePackageName,
    );
    const defaultAppIdentifier =
      options.appIdentifier || toDefaultAppIdentifier(packageName);

    output.write(
      '\n  The app identifier is used by Android and iOS. Replace "example" with your name or company before publishing.\n',
    );
    const appIdentifier = await askUntilValid(
      readline,
      'Android/iOS app identifier',
      defaultAppIdentifier,
      validateAppIdentifier,
    );
    const runValidation = await askYesNo(
      readline,
      'Run all checks after installation',
      !options.skipValidation,
    );

    output.write('\n  Setup summary\n');
    output.write(`    Folder:       ${projectDirectory}\n`);
    output.write(`    Display name: ${displayName}\n`);
    output.write(`    Package name: ${packageName}\n`);
    output.write(`    App ID:       ${appIdentifier}\n`);
    output.write(`    Expo SDK:     ${options.sdk}\n`);
    output.write(`    Validation:   ${runValidation ? 'yes' : 'no'}\n\n`);

    const confirmed = await askYesNo(readline, 'Create this project', true);

    return {
      ...options,
      appIdentifier,
      cancelled: !confirmed,
      displayName,
      packageName,
      projectDirectory,
      skipValidation: !runValidation,
    };
  } finally {
    readline.close();
  }
}

module.exports = { askYesNo, collectInteractiveOptions };
