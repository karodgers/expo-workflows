import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import {
  OPTIONAL_PACKAGES,
  classifyCreationFailure,
  parseAdditionalPackages,
  toDefaultAppIdentifier,
  toDisplayName,
  toPackageName,
  validateAppIdentifier,
  validateDisplayName,
  validatePackageName,
  validateProjectFolderName,
} from '../projectCreation';
import { CommandContext } from './context';

type SetupMode = 'full' | 'fast' | 'files';

/** Every answer the create wizard collects, resolved and validated. */
interface ProjectPlan {
  parentDirectory: string;
  folderName: string;
  targetDirectory: string;
  displayName: string;
  packageName: string;
  appIdentifier: string;
  /** A numeric SDK major, or `latest` to resolve the newest stable one at creation time. */
  sdk: string;
  selectedPackages: string[];
  customPackages: string[];
  setupMode: SetupMode;
}

const SETUP_MODE_SUMMARY: Record<SetupMode, string> = {
  full: 'install and validate',
  fast: 'install without final validation',
  files: 'files only',
};

/**
 * Walks the create-project questionnaire. Resolves `undefined` as soon as the
 * user backs out of any step or a precondition fails, in which case nothing on
 * disk has been touched yet — every question here runs before the initializer.
 */
async function collectProjectPlan(context: CommandContext): Promise<ProjectPlan | undefined> {
  const { dashboard, askValidated } = context;
  const parentSelection = await vscode.window.showOpenDialog({
    title: 'Choose where to create the Nova Expo project',
    canSelectFiles: false,
    canSelectFolders: true,
    canSelectMany: false,
    openLabel: 'Use This Folder',
  });
  const parentDirectory = parentSelection?.[0]?.fsPath;
  if (!parentDirectory) return undefined;

  const folderName = await askValidated(
    'Project folder',
    'my-expo-app',
    `A new folder will be created inside ${parentDirectory}. Existing folders are never replaced.`,
    validateProjectFolderName,
  );
  if (!folderName) return undefined;
  const targetDirectory = path.join(parentDirectory, folderName);
  if (fs.existsSync(targetDirectory)) {
    await dashboard.showFeedback(
      'error',
      'Folder already exists',
      `Choose another name. Nova Expo will not overwrite ${targetDirectory}.`,
    );
    return undefined;
  }
  try {
    fs.accessSync(parentDirectory, fs.constants.W_OK);
  } catch {
    await dashboard.showFeedback(
      'error',
      'Folder is not writable',
      `Nova Expo cannot create a project inside ${parentDirectory}.`,
    );
    return undefined;
  }

  const displayName = await askValidated(
    'App display name',
    toDisplayName(folderName),
    'This is the name users see on their device.',
    validateDisplayName,
  );
  if (!displayName) return undefined;
  const packageName = await askValidated(
    'Package name and Expo slug',
    toPackageName(folderName),
    'Used in package.json and as the Expo project slug.',
    validatePackageName,
  );
  if (!packageName) return undefined;
  const appIdentifier = await askValidated(
    'Android and iOS application identifier',
    toDefaultAppIdentifier(packageName),
    'Replace “example” with your company or domain before publishing.',
    validateAppIdentifier,
  );
  if (!appIdentifier) return undefined;

  const sdkChoice = await dashboard.pick('Expo SDK', [
    {
      label: 'Latest stable',
      description: 'Resolve the latest stable SDK from npm when creating the project',
      value: 'latest',
    },
    {
      label: 'SDK 57',
      description: 'Use the version pinned by the bundled Nova contract',
      value: '57',
    },
    {
      label: 'Another SDK major…',
      description: 'Enter a numeric Expo SDK major supported by create-expo-app',
      value: 'custom',
    },
  ]);
  if (!sdkChoice) return undefined;
  const sdk =
    sdkChoice === 'custom'
      ? await askValidated(
          'Expo SDK major',
          '57',
          'Enter a numeric SDK major. Package compatibility is validated during setup.',
          (value) =>
            /^[1-9]\d*$/.test(value) ? undefined : 'Enter a numeric Expo SDK major, such as 57.',
        )
      : sdkChoice;
  if (!sdk) return undefined;

  const packageSelection = await dashboard.multiPick(
    'Choose optional packages',
    OPTIONAL_PACKAGES.map((item) => ({
      label: item.label,
      description: item.description,
      detail: `${item.category} · ${item.name}`,
      value: item.name,
      picked: item.selected,
    })),
    'Core Expo, Router, React Native, and quality tooling are always included.',
  );
  if (!packageSelection) return undefined;
  // The selection round-trips through the webview, so it is re-checked against
  // the catalog rather than trusted as a list of names to install.
  const allowedPackages = new Set(OPTIONAL_PACKAGES.map((item) => item.name));
  if (packageSelection.some((name) => !allowedPackages.has(name))) {
    await dashboard.showFeedback(
      'error',
      'Invalid package selection',
      'The package selection contained an item outside the Nova catalog. No project was created.',
    );
    return undefined;
  }
  const selectedPackages = [...new Set(packageSelection)];

  let customInput = '';
  let customPackages: string[] = [];
  let customError: string | undefined;
  do {
    const answer = await dashboard.input('Additional npm packages', {
      description:
        'Optional. Separate package names with spaces or commas; versions are supported, for example date-fns@^4.0.0.',
      placeholder: '@sentry/react-native date-fns@^4.0.0',
      value: customInput,
      validationMessage: customError,
    });
    if (answer === undefined) return undefined;
    customInput = answer.trim();
    const parsed = parseAdditionalPackages(customInput);
    customPackages = parsed.packages;
    customError = parsed.error;
  } while (customError);

  const setupMode = await dashboard.pick('Installation and validation', [
    {
      label: 'Install and validate',
      description:
        'Install packages, align Expo versions, then run health, type, format, and test checks',
      value: 'full',
    },
    {
      label: 'Install without validation',
      description: 'Install and align packages, but skip the final test suite',
      value: 'fast',
    },
    {
      label: 'Create files only',
      description: 'Skip dependency installation and validation',
      value: 'files',
    },
  ]);
  if (!setupMode) return undefined;

  return {
    parentDirectory,
    folderName,
    targetDirectory,
    displayName,
    packageName,
    appIdentifier,
    sdk,
    selectedPackages,
    customPackages,
    setupMode: setupMode as SetupMode,
  };
}

/** Optional packages are opted out of by name, so the catalog stays the source of truth. */
function excludedPackages(plan: ProjectPlan): string[] {
  return OPTIONAL_PACKAGES.filter((item) => !plan.selectedPackages.includes(item.name)).map(
    (item) => item.name,
  );
}

function toInitializerArgs(plan: ProjectPlan): string[] {
  const args = [
    plan.folderName,
    '--name',
    plan.displayName,
    '--package-name',
    plan.packageName,
    '--app-id',
    plan.appIdentifier,
    '--sdk',
    plan.sdk,
    ...excludedPackages(plan).flatMap((name) => ['--exclude', name]),
    ...plan.customPackages.flatMap((specifier) => ['--add', specifier]),
  ];
  if (plan.setupMode === 'fast') args.push('--skip-validation');
  if (plan.setupMode === 'files') args.push('--skip-install');
  return args;
}

async function confirmPlan(context: CommandContext, plan: ProjectPlan): Promise<boolean> {
  return context.confirm(
    'Create Nova Expo project?',
    'Nova will download the official Expo template, create a new folder, and apply the selected project contract.',
    'Create Project',
    [
      `Location: ${plan.targetDirectory}`,
      `App: ${plan.displayName} (${plan.packageName})`,
      `Identifier: ${plan.appIdentifier}`,
      `SDK: ${plan.sdk === 'latest' ? 'latest stable' : plan.sdk}`,
      `Optional packages: ${plan.selectedPackages.length} selected${plan.customPackages.length ? ` + ${plan.customPackages.length} custom` : ''}`,
      `Setup: ${SETUP_MODE_SUMMARY[plan.setupMode]}`,
      ...(plan.appIdentifier.startsWith('com.example.')
        ? ['Warning: replace com.example before publishing to a store.']
        : []),
    ],
  );
}

/**
 * Explains a non-zero initializer exit. A partially created project is never
 * deleted: a failed validation still leaves a usable app, and a failed setup
 * still leaves logs and generated files worth reading, so both are reported as
 * something to open rather than something that was rolled back.
 */
async function reportCreationFailure(
  context: CommandContext,
  plan: ProjectPlan,
): Promise<'created' | 'failed'> {
  const { dashboard } = context;
  const failureKind = classifyCreationFailure(
    fs.existsSync(plan.targetDirectory),
    fs.existsSync(path.join(plan.targetDirectory, 'package.json')),
    dashboard.getLatestTaskOutput(),
  );
  if (failureKind === 'validation') {
    dashboard.attachTaskRecoveries([
      {
        id: 'open-created-project',
        label: 'Open Project',
        description:
          'The project files and dependencies were created. Open the project to address the reported validation issue.',
        command: 'novaExpo.project.openCreated',
      },
    ]);
    await dashboard.showFeedback(
      'warning',
      'Project created; validation needs attention',
      `Nova created ${plan.displayName} at ${plan.targetDirectory}, but a final quality check did not pass. The project is available and has not been discarded.`,
      { label: 'Open Project', command: 'novaExpo.project.openCreated' },
    );
    return 'created';
  }
  if (failureKind === 'setup') {
    await dashboard.showFeedback(
      'error',
      'Project setup stopped before completion',
      `Nova kept the partial folder at ${plan.targetDirectory} so logs and generated files are not destroyed. Review the task output before retrying with the same name.`,
    );
  } else {
    await dashboard.showFeedback(
      'error',
      'Project creation failed',
      'Nova could not create the project folder. Review the retained task output for the cause.',
    );
  }
  return 'failed';
}

/**
 * Runs the full create-project flow.
 *
 * Resolves the created project root whenever a folder exists on disk that the
 * user should be able to open — including the validation-failure case, where
 * the app itself was created successfully — and `undefined` when the flow was
 * cancelled or nothing usable was produced.
 */
export async function runCreateProjectWizard(context: CommandContext): Promise<string | undefined> {
  const { dashboard, ensureIdle } = context;
  if (!(await ensureIdle())) return undefined;
  const plan = await collectProjectPlan(context);
  if (!plan) return undefined;
  if (!(await confirmPlan(context, plan))) return undefined;
  // The questionnaire is slow enough that the folder can appear while it runs.
  if (fs.existsSync(plan.targetDirectory)) {
    await dashboard.showFeedback(
      'error',
      'Folder appeared during setup',
      'The target now exists, so creation was stopped without changing it.',
    );
    return undefined;
  }

  const code = await dashboard.runInitializer(
    toInitializerArgs(plan),
    plan.parentDirectory,
    `Create · ${plan.displayName}`,
  );
  if (code === null) return undefined;
  if (code !== 0) {
    return (await reportCreationFailure(context, plan)) === 'created'
      ? plan.targetDirectory
      : undefined;
  }

  await dashboard.refresh();
  dashboard.attachTaskCompletion({
    label: 'Open Project',
    description: `${plan.displayName} was created successfully. Open it to start developing with Nova Expo.`,
    command: 'novaExpo.project.openCreated',
  });
  return plan.targetDirectory;
}
