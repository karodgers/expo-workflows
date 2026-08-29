const fs = require('node:fs');
const path = require('node:path');

const { HELP_TEXT, parseArguments } = require('./arguments');
const { runCommand } = require('./commands');
const { createProjectManifest, packageNames, readContract, validatePackageSelection } = require('./contract');
const { collectInteractiveOptions } = require('./prompts');
const { configureProjectFiles } = require('./project-files');
const { resolveProjectOptions } = require('./project-options');

const PACKAGE_ROOT = path.resolve(__dirname, '..');

function printBanner() {
  process.stdout.write('\n  Nova · Expo project initializer\n\n');
}

function printStep(number, total, label) {
  process.stdout.write(`\n  ${number}/${total}  ${label}\n\n`);
}

function readOwnManifest() {
  return JSON.parse(fs.readFileSync(path.join(PACKAGE_ROOT, 'package.json'), 'utf8'));
}

function readPackageVersion() {
  return readOwnManifest().version;
}

/**
 * Version range a tool is fetched at when it is not already in the project.
 * Pinning keeps an unattended `npx` from pulling a newly published major
 * mid-validation; the range stays overridable through the environment, and
 * mirrors `toolkit_pinned_version` in the workflow runtime.
 */
function pinnedVersion(name) {
  return readOwnManifest().nova?.pinned?.[name] ?? 'latest';
}

function assertSupportedNodeVersion() {
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major < 22 || (major === 22 && minor < 13)) {
    throw new Error(
      `Node 22.13 or newer is required by the latest Expo SDK. Found ${process.versions.node}.`,
    );
  }
}

function resolveSdkMajor(sdkOption) {
  if (sdkOption !== 'latest') {
    return Number(sdkOption);
  }

  const output = runCommand('npm', ['view', 'expo', 'dist-tags.latest', '--json'], {
    capture: true,
  });
  const latestVersion = JSON.parse(output);
  const match = /^(\d+)\./.exec(latestVersion);

  if (!match) {
    throw new Error(`npm returned an invalid Expo version: ${latestVersion}`);
  }

  return Number(match[1]);
}

function assertTargetAvailable(projectDirectory) {
  if (fs.existsSync(projectDirectory)) {
    throw new Error(`Target directory already exists: ${projectDirectory}`);
  }

  const parentDirectory = path.dirname(projectDirectory);
  if (!fs.existsSync(parentDirectory)) {
    throw new Error(`Parent directory does not exist: ${parentDirectory}`);
  }
}

function writeProjectManifest(projectDirectory, manifest) {
  fs.writeFileSync(
    path.join(projectDirectory, 'package.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
  );
}

function alignDependencies(projectDirectory) {
  runCommand('npx', ['expo', 'install', '--fix', '--npm'], { cwd: projectDirectory });
  runCommand('npm', ['dedupe'], { cwd: projectDirectory });
  runCommand('npm', ['run', 'format'], { cwd: projectDirectory });
}

function validateProject(projectDirectory) {
  runCommand('npx', ['expo', 'install', '--check'], { cwd: projectDirectory });
  const expoDoctor = process.env.EXPO_DOCTOR_VERSION || pinnedVersion('expoDoctor');
  runCommand('npx', [`expo-doctor@${expoDoctor}`], { cwd: projectDirectory });
  runCommand('npm', ['run', 'typecheck'], { cwd: projectDirectory });
  runCommand('npm', ['run', 'format:check'], { cwd: projectDirectory });
  runCommand('npm', ['test', '--', '--runInBand'], { cwd: projectDirectory });
}

async function runCli(argumentsList) {
  let options = parseArguments(argumentsList);

  if (options.help) {
    process.stdout.write(HELP_TEXT);
    return;
  }

  if (options.version) {
    process.stdout.write(`${readPackageVersion()}\n`);
    return;
  }

  assertSupportedNodeVersion();
  printBanner();

  const shouldPrompt = options.interactive || !options.projectDirectory;
  if (shouldPrompt) {
    if (!process.stdin.isTTY) {
      process.stdout.write(HELP_TEXT);
      throw new Error('Interactive setup requires a terminal. Provide a project directory instead.');
    }
    options = await collectInteractiveOptions(options);
  }

  if (options.cancelled) {
    process.stdout.write('\n  Setup cancelled. No project was created.\n\n');
    return;
  }

  if (!options.projectDirectory) {
    throw new Error('A project directory is required.');
  }

  const projectDirectory = path.resolve(process.cwd(), options.projectDirectory);
  const projectOptions = resolveProjectOptions(options);
  assertTargetAvailable(projectDirectory);
  const contract = readContract(PACKAGE_ROOT);
  validatePackageSelection(contract, options);

  const totalSteps = options.skipInstall ? 3 : options.skipValidation ? 5 : 6;

  printStep(1, totalSteps, 'Resolve the Expo SDK');
  const sdkMajor = resolveSdkMajor(options.sdk);
  process.stdout.write(`  Using stable Expo SDK ${sdkMajor}.\n`);

  printStep(2, totalSteps, 'Create the official Expo base project');
  // The folder name rather than the absolute path: the working directory is
  // already the parent, and a bare name keeps every argument shell-safe for the
  // Windows launch path, where a home directory containing a space would
  // otherwise be split into two arguments.
  runCommand(
    'npx',
    [
      '--yes',
      'create-expo-app@latest',
      path.basename(projectDirectory),
      '--template',
      `blank-typescript@sdk-${sdkMajor}`,
      '--no-install',
      '--yes',
    ],
    { cwd: path.dirname(projectDirectory) },
  );

  printStep(3, totalSteps, 'Apply the Nova project contract');
  const generatedManifest = JSON.parse(
    fs.readFileSync(path.join(projectDirectory, 'package.json'), 'utf8'),
  );
  const projectManifest = createProjectManifest(
    generatedManifest,
    contract,
    projectOptions.packageName,
    options,
  );
  writeProjectManifest(projectDirectory, projectManifest);
  configureProjectFiles(PACKAGE_ROOT, projectDirectory, {
    ...projectOptions,
    packageNames: packageNames(projectManifest),
  });
  process.stdout.write(`  Configured ${packageNames(projectManifest).length} direct packages.\n`);

  if (options.skipInstall) {
    process.stdout.write(`\n  Project created at ${projectDirectory}\n`);
    process.stdout.write(
      '  Run npm install, npx expo install --fix --npm, npm dedupe, npm run format, and npm run validate before use.\n\n',
    );
    return;
  }

  printStep(4, totalSteps, 'Install the dependency contract');
  runCommand('npm', ['install'], { cwd: projectDirectory });

  printStep(5, totalSteps, 'Align native packages with Expo');
  alignDependencies(projectDirectory);

  if (!options.skipValidation) {
    printStep(6, totalSteps, 'Validate the finished project');
    validateProject(projectDirectory);
  }

  process.stdout.write(`\n  Project ready at ${projectDirectory}\n\n`);
  process.stdout.write(`  cd ${JSON.stringify(path.relative(process.cwd(), projectDirectory) || '.')}\n`);
  process.stdout.write('  npm start\n\n');
}

module.exports = { assertSupportedNodeVersion, resolveSdkMajor, runCli, validateProject };
