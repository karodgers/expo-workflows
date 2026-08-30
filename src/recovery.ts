import { ExpoProjectInfo } from './projectInfo';
import { TOOLKIT_ACTIONS } from './toolkitCatalog';
import { RecoveryAction } from './webviewProtocol';

export interface FailureContext {
  script?: string;
  args?: string[];
  output: string;
  project?: ExpoProjectInfo;
}

/**
 * The readiness gate's refusal to release a dirty working tree.
 *
 * This is a contract with release-check.sh, which emits the wording, and it is
 * relied on twice: to offer source control as a correction here, and to decide
 * in the release gate whether the failure is the one recoverable case worth
 * offering to override. A test pins it against the bundled script, because if
 * the wording drifts nothing fails loudly — the override simply becomes
 * unreachable and the gate turns into a dead end.
 */
export const UNCOMMITTED_CHANGES_PATTERNS = [
  /working tree has uncommitted changes/i,
  /uncommitted changes.*(?:commit|stash)/i,
  /git working (?:tree|directory) (?:is )?(?:dirty|not clean)/i,
];

const RECOVERIES = {
  installDependencies: {
    id: 'install-dependencies',
    label: 'Install Dependencies',
    description:
      'Install this project’s dependencies with its detected package manager, then retry.',
    command: 'novaExpo.dependencies.install',
    docsUrl: 'https://docs.expo.dev/get-started/set-up-your-environment/',
  },
  fixDependencies: {
    id: 'fix-dependencies',
    label: 'Fix Dependencies',
    description:
      'Align installed package versions with the current Expo SDK, then rerun project checks.',
    command: 'novaExpo.doctor.fix',
    docsUrl: 'https://docs.expo.dev/more/expo-cli/#install',
  },
  openConfig: {
    id: 'open-app-config',
    label: 'Open App Config',
    description: 'Open the active Expo configuration so the reported value can be corrected.',
    command: 'novaExpo.project.openConfig',
    docsUrl: 'https://docs.expo.dev/workflow/configuration/',
  },
  login: {
    id: 'expo-login',
    label: 'Log In to Expo',
    description: 'Open the guided Expo login terminal, then retry the cloud operation.',
    command: 'novaExpo.toolkitAction',
    args: ['account.login'],
    docsUrl: 'https://docs.expo.dev/accounts/programmatic-access/',
  },
  linkProject: {
    id: 'link-eas-project',
    label: 'Link EAS Project',
    description: 'Connect this local app to an Expo project before using EAS cloud services.',
    command: 'novaExpo.toolkitAction',
    args: ['project.init'],
    docsUrl: 'https://docs.expo.dev/build/setup/',
  },
  completeEasSetup: {
    id: 'complete-eas-setup',
    label: 'Complete EAS Setup',
    description: 'Link the project and configure EAS Build and EAS Update in one guided terminal.',
    command: 'novaExpo.toolkitAction',
    args: ['project.setup'],
    docsUrl: 'https://docs.expo.dev/build/setup/',
  },
  configureBuilds: {
    id: 'configure-eas-build',
    label: 'Configure EAS Build',
    description: 'Create or repair eas.json build profiles before retrying this action.',
    command: 'novaExpo.toolkitAction',
    args: ['project.build-config'],
    docsUrl: 'https://docs.expo.dev/build/eas-json/',
  },
  configureUpdates: {
    id: 'configure-eas-update',
    label: 'Configure EAS Update',
    description: 'Install expo-updates and connect the project to EAS Update.',
    command: 'novaExpo.toolkitAction',
    args: ['project.update-config'],
    docsUrl: 'https://docs.expo.dev/eas-update/getting-started/',
  },
  configureVariants: {
    id: 'configure-identifiers',
    label: 'Configure App Variants',
    description:
      'Set the application identifiers and environment-aware development, preview, and production variants.',
    command: 'novaExpo.toolkitAction',
    args: ['development.variants'],
    docsUrl: 'https://docs.expo.dev/tutorial/eas/multiple-app-variants/',
  },
  credentials: {
    id: 'configure-credentials',
    label: 'Manage Credentials',
    description: 'Open EAS signing credential management for the affected platform.',
    command: 'novaExpo.toolkitAction',
    args: ['release.credentials'],
    docsUrl: 'https://docs.expo.dev/app-signing/app-credentials/',
  },
  developmentBuild: {
    id: 'create-development-build',
    label: 'Create Development Build',
    description:
      'Open the guided development-build workflow for native modules that Expo Go cannot load.',
    command: 'novaExpo.toolkitAction',
    args: ['builds.dev'],
    docsUrl: 'https://docs.expo.dev/develop/development-builds/introduction/',
  },
  createBuild: {
    id: 'create-eas-build',
    label: 'Create a Build',
    description:
      'Create a compatible EAS build before retrying this submission or update operation.',
    command: 'novaExpo.build',
    docsUrl: 'https://docs.expo.dev/build/introduction/',
  },
  notifications: {
    id: 'configure-notifications',
    label: 'Set Up Notifications',
    description:
      'Install the Expo notification packages and scaffold permission and push-token handling.',
    command: 'novaExpo.toolkitAction',
    args: ['development.notifications'],
    docsUrl: 'https://docs.expo.dev/push-notifications/overview/',
  },
  storeMetadata: {
    id: 'configure-store-metadata',
    label: 'Set Up Store Metadata',
    description: 'Create the local store metadata configuration required by the release workflow.',
    command: 'novaExpo.toolkitAction',
    args: ['release.store-setup'],
    docsUrl: 'https://docs.expo.dev/eas/metadata/',
  },
  workflowTemplates: {
    id: 'install-workflow-templates',
    label: 'Install Workflow Templates',
    description: 'Install Nova’s EAS Workflow and Maestro templates into this project.',
    command: 'novaExpo.toolkitAction',
    args: ['project.templates'],
    docsUrl: 'https://docs.expo.dev/eas/workflows/get-started/',
  },
  reviewChanges: {
    id: 'review-source-control',
    label: 'Review Source Control',
    description:
      'Commit or stash the uncommitted changes so the release gate can verify exactly what ships.',
    command: 'novaExpo.scm.open',
    docsUrl: 'https://docs.expo.dev/build/building-from-github/',
  },
  openSettings: {
    id: 'open-nova-settings',
    label: 'Open Nova Settings',
    description: 'Configure the Node or Bash executable required to run Nova Expo actions.',
    command: 'novaExpo.settings.open',
    docsUrl: 'https://docs.expo.dev/get-started/set-up-your-environment/',
  },
  checkProjectHealth: {
    id: 'check-project-health',
    label: 'Check Project Health',
    description:
      'Run Expo Doctor and the SDK dependency check, which surface the misconfigurations behind most otherwise unexplained failures.',
    command: 'novaExpo.doctor',
    docsUrl: 'https://docs.expo.dev/more/expo-cli/',
  },
  readDocumentation: {
    id: 'read-expo-documentation',
    label: 'Open Expo Docs',
    description: 'Read the Expo documentation for the operation that failed.',
    command: 'novaExpo.docs.open',
    docsUrl: 'https://docs.expo.dev/',
  },
} satisfies Record<string, RecoveryAction>;

/**
 * Documentation for the failing operation, found by matching the script and
 * subcommand back to the catalog entry that launched it.
 *
 * Imported from the catalog rather than duplicated: an action's own `docsUrl`
 * is already the right page to read when that action fails.
 */
function documentationFor(context: FailureContext): string | undefined {
  if (!context.script) return undefined;
  const action = TOOLKIT_ACTIONS.find(
    (entry) =>
      entry.script === context.script &&
      entry.args.every((argument, index) => context.args?.[index] === argument),
  );
  return action?.docsUrl;
}

function includesAny(output: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(output));
}

function isCloudScript(script: string | undefined): boolean {
  return Boolean(
    script &&
    [
      'account.sh',
      'auth.sh',
      'build.sh',
      'channels.sh',
      'credentials.sh',
      'deploy.sh',
      'devices.sh',
      'env.sh',
      'fingerprint.sh',
      'metadata.sh',
      'observe.sh',
      'project.sh',
      'sim.sh',
      'submit.sh',
      'testflight.sh',
      'update.sh',
      'webhooks.sh',
      'workflow.sh',
    ].includes(script),
  );
}

export function classifyFailure(context: FailureContext): RecoveryAction[] {
  const output = context.output.toLocaleLowerCase();
  const suggestions: RecoveryAction[] = [];
  const add = (suggestion: RecoveryAction) => {
    if (!suggestions.some((item) => item.id === suggestion.id)) suggestions.push({ ...suggestion });
  };

  if (
    includesAny(output, [
      /node 22\.13 or newer is required/,
      // ENOENT is a missing executable; EINVAL is Windows refusing to spawn a
      // `.cmd` shim, which is how a broken npm launch surfaces there.
      /spawn (?:node|bash|npm|npx|[^\s]*[\\/](?:node|bash|npm|npx)) (?:enoent|einval)/,
      /(?:node|bash|npm|npx): command not found/,
      /could not run (?:node|bash|npm|npx):/,
    ])
  )
    add(RECOVERIES.openSettings);

  if (includesAny(output, UNCOMMITTED_CHANGES_PATTERNS)) add(RECOVERIES.reviewChanges);

  if (
    includesAny(output, [
      /cannot find module/,
      /module_not_found/,
      /node_modules.*(?:missing|not found)/,
      /could not determine executable to run/,
      /expo(?: command)? not found/,
    ])
  )
    add(RECOVERIES.installDependencies);

  if (
    includesAny(output, [
      /expo install --fix/,
      /dependencies? (?:is|are) (?:invalid|incompatible|misaligned)/,
      /expected package .* but found/,
      /package versions? .* expo sdk/,
    ]) &&
    !(context.script === 'doctor.sh' && context.args?.[0] === 'fix')
  ) {
    add(RECOVERIES.fixDependencies);
  }

  if (
    includesAny(output, [
      /expo config for common issues/,
      /app\.json .*app\.config/,
      /app config .*invalid/,
    ])
  )
    add(RECOVERIES.openConfig);

  if (
    includesAny(output, [
      /not logged in/,
      /not authenticated/,
      /authentication (?:is )?required/,
      /log in (?:to|with) (?:expo|eas)/,
      /login required/,
      /invalid (?:access )?token/,
    ]) &&
    !(context.script === 'auth.sh' && context.args?.[0] === 'login')
  ) {
    add(RECOVERIES.login);
  }

  if (
    includesAny(output, [
      /eas project (?:is )?not (?:linked|configured|found)/,
      /project id is missing/,
      /eas project id is missing/,
      /eas project:init/,
    ]) &&
    !(context.script === 'project.sh' && ['init', 'setup'].includes(context.args?.[0] ?? ''))
  ) {
    add(RECOVERIES.linkProject);
  }

  if (
    includesAny(output, [
      /eas\.json .*missing/,
      /eas build profile .* missing/,
      /build profile ['"].*['"] is missing/,
      /builds? (?:are|is) not configured/,
    ]) &&
    !(
      context.script === 'project.sh' && ['build-config', 'setup'].includes(context.args?.[0] ?? '')
    )
  ) {
    add(RECOVERIES.configureBuilds);
  }

  if (
    includesAny(output, [
      /expo-updates .*not (?:installed|configured)/,
      /eas update .*not configured/,
      /update (?:channel|url) .*missing/,
      /runtimeversion.*(?:missing|required)/,
    ]) &&
    !(
      context.script === 'project.sh' &&
      ['update-config', 'setup'].includes(context.args?.[0] ?? '')
    )
  ) {
    add(RECOVERIES.configureUpdates);
  }

  if (
    includesAny(output, [
      /android\.package is missing/,
      /ios\.bundleidentifier is missing/,
      /application identifier .*missing/,
    ])
  ) {
    const project = context.project;
    const customDynamicConfig = Boolean(
      project?.configFile && project.configFile !== 'app.json' && !project.hasGeneratedConfig,
    );
    add(customDynamicConfig ? RECOVERIES.openConfig : RECOVERIES.configureVariants);
  }

  if (
    includesAny(output, [
      /credentials?.*(?:missing|required|not configured|not found)/,
      /distribution certificate.*(?:missing|expired)/,
      /keystore.*(?:missing|required|not found)/,
    ]) &&
    context.script !== 'credentials.sh'
  )
    add(RECOVERIES.credentials);

  if (
    includesAny(output, [
      /development build.*(?:not installed|not found|required)/,
      /expo go.*(?:not supported|cannot|incompatible).*native/,
      /custom native module.*(?:requires|needs).*development build/,
    ])
  )
    add(RECOVERIES.developmentBuild);

  if (
    includesAny(output, [
      /no (?:completed|compatible) builds? (?:found|available)/,
      /build is required before (?:submission|submitting|publishing)/,
    ]) &&
    context.script !== 'build.sh'
  )
    add(RECOVERIES.createBuild);

  if (
    includesAny(output, [
      /expo-notifications.*(?:missing|not installed|cannot find)/,
      /expo-device.*(?:missing|not installed|cannot find)/,
    ]) &&
    context.script !== 'notifications.sh'
  )
    add(RECOVERIES.notifications);

  if (
    includesAny(output, [
      /store\.config\.json is missing/,
      /store metadata.*(?:missing|required|not configured)/,
      /privacy policy.*(?:missing|required)/,
    ])
  )
    add(RECOVERIES.storeMetadata);

  if (
    includesAny(output, [
      /\.eas\/workflows.*(?:missing|not found)/,
      /workflow (?:file|template).*(?:missing|not found)/,
      /\.maestro.*(?:missing|not found)/,
    ])
  )
    add(RECOVERIES.workflowTemplates);

  const project = context.project;
  if (project && !project.hasDependencies && context.script !== 'dependencies.install') {
    add(RECOVERIES.installDependencies);
  }
  if (
    isCloudScript(context.script) &&
    project &&
    !['account.sh', 'auth.sh'].includes(context.script ?? '')
  ) {
    if (
      !project.hasEasConfig &&
      !(context.script === 'project.sh' && ['init', 'setup'].includes(context.args?.[0] ?? ''))
    )
      add(RECOVERIES.completeEasSetup);
    else if (
      !project.projectId &&
      project.configFile === 'app.json' &&
      !(context.script === 'project.sh' && ['init', 'setup'].includes(context.args?.[0] ?? ''))
    )
      add(RECOVERIES.linkProject);
    if (
      ['build.sh', 'submit.sh'].includes(context.script ?? '') &&
      project.buildProfiles.length === 0
    ) {
      add(RECOVERIES.configureBuilds);
    }
    if (context.script === 'update.sh' && !project.hasUpdates) add(RECOVERIES.configureUpdates);
  }
  if (
    context.script === 'project.sh' &&
    ['init', 'setup'].includes(context.args?.[0] ?? '') &&
    (!output.trim() || output.includes('interactive terminal exited'))
  )
    add(RECOVERIES.login);

  if (suggestions.length === 0) {
    if (context.script !== 'doctor.sh') add(RECOVERIES.checkProjectHealth);
    const docs = documentationFor(context) ?? 'https://docs.expo.dev/';
    add({ ...RECOVERIES.readDocumentation, args: [docs], docsUrl: docs });
  }
  return suggestions.slice(0, 3);
}

export function setupRecommendation(project: ExpoProjectInfo): RecoveryAction | undefined {
  if (!project.hasDependencies) return { ...RECOVERIES.installDependencies };
  if (!project.hasEasConfig || project.buildProfiles.length === 0)
    return { ...RECOVERIES.completeEasSetup };
  if (!project.projectId && project.configFile === 'app.json') return { ...RECOVERIES.linkProject };
  if (!project.hasUpdates) return { ...RECOVERIES.configureUpdates };
  return undefined;
}

export { RECOVERIES };
