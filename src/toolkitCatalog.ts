export type ActionCategory =
  'project' | 'development' | 'builds' | 'updates' | 'release' | 'cloud' | 'account';

export interface ActionCategorySpec {
  id: ActionCategory;
  label: string;
  description: string;
  icon: string;
}

export interface ToolkitAction {
  id: string;
  category: ActionCategory;
  script: string;
  args: string[];
  label: string;
  description: string;
  icon: string;
  explanation: string;
  effects: string[];
  docsUrl: string;
  confirm?: string;
  interactive?: boolean;
  confirmationLabel?: string;
}

// prettier-ignore
export const ACTION_CATEGORIES: ActionCategorySpec[] = [
  { id: 'project', label: 'Project setup', description: 'Inspect and configure the Expo project', icon: 'tools' },
  { id: 'development', label: 'Development', description: 'Native projects, variants, and notifications', icon: 'code' },
  { id: 'builds', label: 'Builds & submissions', description: 'Inspect and manage EAS builds and submissions', icon: 'package' },
  { id: 'updates', label: 'Updates & channels', description: 'OTA history, branches, channels, and fingerprints', icon: 'rocket' },
  { id: 'release', label: 'Store & release', description: 'Metadata, credentials, devices, and TestFlight', icon: 'verified' },
  { id: 'cloud', label: 'EAS cloud', description: 'Workflows, hosting, variables, and observability', icon: 'cloud' },
  { id: 'account', label: 'Account & toolkit', description: 'Expo account, usage, security, and versions', icon: 'account' },
];

// prettier-ignore
export const TOOLKIT_ACTIONS: ToolkitAction[] = [
  { id: 'project.inspect', category: 'project', script: 'project.sh', args: ['inspect'], label: 'Inspect Expo config', description: 'Print the resolved public Expo configuration', icon: 'json', explanation: "Resolves the Expo config the way Expo itself does \u2014 merging app.json with any dynamic app.config file \u2014 and prints the public result. Use it to see the values a build will actually receive.", effects: ["Reads app.json and any app.config file", "Changes nothing"], docsUrl: 'https://docs.expo.dev/workflow/configuration/' },
  { id: 'project.info', category: 'project', script: 'project.sh', args: ['info'], label: 'EAS project info', description: 'Show the linked EAS project', icon: 'info', explanation: "Shows which EAS cloud project this app is linked to, including the account that owns it and the project ID stored in the app config.", effects: ["Reads the linked EAS project from Expo servers", "Changes nothing"], docsUrl: 'https://docs.expo.dev/build/setup/' },
  { id: 'project.init', category: 'project', script: 'project.sh', args: ['init'], label: 'Link EAS project', description: 'Create or link this app to EAS', icon: 'link', confirm: 'Create or link the current Expo project on EAS?', interactive: true, explanation: 'Connects the local Expo configuration to an EAS cloud project. EAS may ask you to choose an account or existing project.', effects: ['May create a project on Expo services', 'May write the EAS project ID into app configuration'], confirmationLabel: 'Open setup terminal', docsUrl: 'https://docs.expo.dev/build/setup/' },
  { id: 'project.build-config', category: 'project', script: 'project.sh', args: ['build-config'], label: 'Configure EAS Build', description: 'Create or update the EAS Build configuration', icon: 'settings-gear', confirm: 'Configure EAS Build for this project?', interactive: true, explanation: "Creates or repairs eas.json, the file that defines your build profiles. EAS asks about platforms and build types in the terminal, and existing profiles are preserved.", effects: ["Creates or updates eas.json", "May ask about platforms and credentials"], docsUrl: 'https://docs.expo.dev/build/eas-json/' },
  { id: 'project.update-config', category: 'project', script: 'project.sh', args: ['update-config'], label: 'Configure EAS Update', description: 'Install expo-updates and configure EAS Update', icon: 'settings-gear', confirm: 'Install and configure EAS Update in this project?', interactive: true, explanation: "Installs expo-updates and points the project at EAS Update, so published updates can reach installed builds. Sets the runtime version policy that keeps JavaScript and native code compatible.", effects: ["Installs expo-updates", "Updates app config and eas.json", "Sets a runtime version policy"], docsUrl: 'https://docs.expo.dev/eas-update/getting-started/' },
  { id: 'project.setup', category: 'project', script: 'project.sh', args: ['setup'], label: 'Complete EAS setup', description: 'Link the project and configure builds and updates', icon: 'wand', confirm: 'Run the complete EAS setup for this project?', interactive: true, explanation: 'Runs EAS project linking, EAS Build configuration, and EAS Update configuration as one guided terminal workflow.', effects: ['May create or link an EAS cloud project', 'Writes eas.json and update configuration', 'May install expo-updates'], confirmationLabel: 'Open setup terminal', docsUrl: 'https://docs.expo.dev/build/setup/' },
  { id: 'project.templates', category: 'project', script: 'workflow-templates.sh', args: ['install'], label: 'Install workflow templates', description: 'Add Nova CI/CD and Maestro workflow recipes', icon: 'files', confirm: 'Install Nova workflow templates into .eas/workflows?', explanation: 'Copies maintained validation, preview, production, pull-request, and Maestro workflows into the project without replacing existing files.', effects: ['Creates files under .eas/workflows', 'Creates .maestro/home.yml'], confirmationLabel: 'Install templates', docsUrl: 'https://docs.expo.dev/eas/workflows/get-started/' },

  { id: 'development.prebuild', category: 'development', script: 'native.sh', args: ['prebuild'], label: 'Generate native projects', description: 'Run Expo prebuild for Android and iOS', icon: 'symbol-structure', confirm: 'Generate the native Android and iOS project directories?', interactive: true, explanation: 'Generates native Android and iOS projects from the current Expo configuration, in a terminal because prebuild asks before it overwrites an existing android/ or ios/ directory. Review source control afterward: native files can change substantially.', effects: ['Creates or updates android/ and ios/', 'Runs Expo config plugins', 'Prompts in the terminal when native directories already exist'], confirmationLabel: 'Open prebuild terminal', docsUrl: 'https://docs.expo.dev/workflow/continuous-native-generation/' },
  { id: 'development.android', category: 'development', script: 'native.sh', args: ['android'], label: 'Run Android locally', description: 'Compile and launch the native Android app', icon: 'device-mobile', confirm: 'Compile and install the native Android app on a device or emulator?', interactive: true, explanation: 'Runs a full native Gradle build, then installs and launches the app. This takes minutes, generates the android/ directory if it is missing, and asks in the terminal which device to use when more than one is attached.', effects: ['Creates or updates android/ via prebuild', 'Installs the app on the selected device or emulator', 'Prompts for a device when several are connected'], confirmationLabel: 'Open Android build terminal', docsUrl: 'https://docs.expo.dev/guides/local-app-development/' },
  { id: 'development.ios', category: 'development', script: 'native.sh', args: ['ios'], label: 'Run iOS locally', description: 'Compile and launch the native iOS app', icon: 'device-mobile', confirm: 'Compile and install the native iOS app on a simulator or device?', interactive: true, explanation: 'Runs a full native Xcode build, then installs and launches the app. This takes minutes, generates the ios/ directory if it is missing, and asks in the terminal which simulator or device to use. Requires Xcode on macOS.', effects: ['Creates or updates ios/ via prebuild', 'Runs pod install and an Xcode build', 'Prompts for a simulator or device'], confirmationLabel: 'Open iOS build terminal', docsUrl: 'https://docs.expo.dev/guides/local-app-development/' },
  { id: 'development.variants', category: 'development', script: 'variants.sh', args: ['setup'], label: 'Configure app variants', description: 'Set up development, preview, production, and E2E variants', icon: 'layers', confirm: 'Configure independently installable app variants?', explanation: 'Creates distinct application identifiers, names, schemes, EAS profiles, channels, and environments so development and release builds can coexist.', effects: ['Writes app.config.js and eas.json', 'Changes application identifiers by environment'], confirmationLabel: 'Configure variants', docsUrl: 'https://docs.expo.dev/tutorial/eas/multiple-app-variants/' },
  { id: 'development.notifications', category: 'development', script: 'notifications.sh', args: ['setup'], label: 'Set up notifications', description: 'Scaffold permissions and push-token handling', icon: 'bell', confirm: 'Add notification setup code to this project?', explanation: "Installs the Expo notification packages and writes a notifications service that requests permission and registers an Expo push token. Existing custom code in that file is never replaced.", effects: ["Installs expo-notifications, expo-device, and expo-constants", "Adds the expo-notifications config plugin to app config", "Creates src/services/notifications/index.ts"], docsUrl: 'https://docs.expo.dev/push-notifications/overview/' },
  { id: 'development.notification-credentials', category: 'development', script: 'notifications.sh', args: ['credentials'], label: 'Notification credentials', description: 'Open FCM and APNs credential management', icon: 'key', interactive: true, explanation: "Opens EAS credential management for push notifications, where you upload an FCM key for Android or an APNs key for iOS. Without these, push notifications silently never arrive.", effects: ["Reads and may change push credentials stored by EAS", "Prompts for the platform and key files"], docsUrl: 'https://docs.expo.dev/push-notifications/fcm-credentials/' },

  { id: 'builds.list', category: 'builds', script: 'build.sh', args: ['list'], label: 'Build history', description: 'List recent EAS builds', icon: 'history', explanation: "Lists recent EAS cloud builds with their status, platform, profile, and artifact links, newest first.", effects: ["Reads build history from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/build/introduction/' },
  { id: 'builds.dev', category: 'builds', script: 'build.sh', args: ['dev'], label: 'Development build', description: 'Create or manage a development build', icon: 'beaker', interactive: true, explanation: 'Opens the guided EAS development-build command in a terminal. It may create a remote build and consume build quota.', effects: ['May start a billable EAS cloud build', 'May prompt for platform and credentials'], confirmationLabel: 'Open build terminal', docsUrl: 'https://docs.expo.dev/develop/development-builds/introduction/' },
  { id: 'builds.versions', category: 'builds', script: 'build.sh', args: ['version-get'], label: 'App versions', description: 'Read remote app version values', icon: 'versions', explanation: "Reads the version numbers EAS is tracking remotely for the selected platform and profile \u2014 the values it will assign to the next build when appVersionSource is remote.", effects: ["Reads remote app version values from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/build-reference/app-versions/' },
  { id: 'builds.sync-versions', category: 'builds', script: 'build.sh', args: ['version-sync'], label: 'Sync app versions', description: 'Synchronize local and remote app versions', icon: 'sync', confirm: 'Synchronize app version values with EAS?', explanation: 'Synchronizes version values between the project and EAS. Select the platform and profile carefully because remote version state can change.', effects: ['Reads and may update remote app version values'], confirmationLabel: 'Sync versions', docsUrl: 'https://docs.expo.dev/build-reference/app-versions/' },
  { id: 'submissions.list', category: 'builds', script: 'submit.sh', args: ['list'], label: 'Submission history', description: 'List recent app-store submissions', icon: 'list-ordered', explanation: "Lists recent submissions to the Apple App Store and Google Play, with the status each one reached.", effects: ["Reads submission history from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/deploy/submit-to-app-stores/' },
  { id: 'submissions.status', category: 'builds', script: 'submit.sh', args: ['status'], label: 'Submission status', description: 'Inspect submission processing status', icon: 'pulse', explanation: "Shows how far a submission has progressed through store processing for the selected platform and profile, including any rejection reason.", effects: ["Reads submission status from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/deploy/submit-to-app-stores/' },

  { id: 'updates.list', category: 'updates', script: 'update.sh', args: ['list'], label: 'Update history', description: 'List published EAS updates', icon: 'history', explanation: "Lists published EAS updates. Pick a channel to see what the builds following it are currently serving, or a branch to see one series of updates directly.", effects: ["Reads update history from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas-update/how-it-works/' },
  { id: 'updates.insights', category: 'updates', script: 'update.sh', args: ['insights'], label: 'Update insights', description: 'Inspect adoption and update metrics', icon: 'graph', explanation: "Shows how many devices have adopted a specific update group and what it did to your crash rate. Needs the update group ID, which the update list reports.", effects: ["Reads adoption and crash metrics from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas-insights/introduction/' },
  { id: 'updates.channels', category: 'updates', script: 'channels.sh', args: ['channel', 'list'], label: 'Channels', description: 'List EAS Update channels', icon: 'git-branch', explanation: "Lists EAS Update channels and the branch each one currently points at. A channel is what a build follows; repointing one is how an update reaches an existing build.", effects: ["Reads channels from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas-update/deployment-patterns/' },
  { id: 'updates.branches', category: 'updates', script: 'channels.sh', args: ['branch', 'list'], label: 'Branches', description: 'List EAS Update branches', icon: 'source-control', explanation: "Lists EAS Update branches. A branch is a series of updates; builds reach one through the channel mapped to it.", effects: ["Reads branches from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas-update/deployment-patterns/' },
  { id: 'updates.fingerprint', category: 'updates', script: 'fingerprint.sh', args: ['generate'], label: 'Generate fingerprint', description: 'Calculate the native runtime fingerprint', icon: 'inspect', explanation: "Calculates the fingerprint of this project's native layer for the selected platform and profile. Two builds share updates only when their fingerprints match.", effects: ["Reads the project's native configuration", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas-update/runtime-versions/' },
  { id: 'updates.compare-fingerprint', category: 'updates', script: 'fingerprint.sh', args: ['compare'], label: 'Compare fingerprints', description: 'Compare local and remote native fingerprints', icon: 'diff', interactive: true, explanation: 'Opens EAS fingerprint comparison in a terminal so you can choose a hash, build, update, or local fingerprint comparison mode. Use it to find out why an update is not reaching a build: differing fingerprints mean incompatible native layers.', effects: ['Reads fingerprints from EAS and the local project', 'Changes nothing'], confirmationLabel: 'Open compare terminal', docsUrl: 'https://docs.expo.dev/eas-update/runtime-versions/' },

  { id: 'release.metadata-lint', category: 'release', script: 'metadata.sh', args: ['lint'], label: 'Validate store metadata', description: 'Lint the local EAS Metadata configuration', icon: 'checklist', explanation: "Validates the local store.config.json against the rules EAS Metadata enforces, so a bad value is caught here rather than by App Store Connect.", effects: ["Reads store.config.json", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas/metadata/' },
  { id: 'release.store-setup', category: 'release', script: 'store.sh', args: ['setup'], label: 'Set up store metadata', description: 'Create the local Apple store metadata configuration', icon: 'note', confirm: 'Create store.config.json and connect it to the production submission profile?', explanation: 'Collects the app title, support URL, and privacy-policy URL, then creates the local EAS Metadata configuration used for Apple store releases.', effects: ['Creates store.config.json', 'Updates the production submission profile in eas.json'], confirmationLabel: 'Create metadata', docsUrl: 'https://docs.expo.dev/eas/metadata/' },
  { id: 'release.metadata-pull', category: 'release', script: 'metadata.sh', args: ['pull'], label: 'Pull store metadata', description: 'Download current Apple store metadata', icon: 'cloud-download', confirm: 'Download store metadata into this project?', explanation: "Downloads the current App Store Connect metadata for the selected submission profile into the local store.config.json, overwriting what is there.", effects: ["Overwrites the local store.config.json", "Reads metadata from App Store Connect"], docsUrl: 'https://docs.expo.dev/eas/metadata/' },
  { id: 'release.metadata-push', category: 'release', script: 'metadata.sh', args: ['push'], label: 'Push store metadata', description: 'Upload local metadata to App Store Connect', icon: 'cloud-upload', confirm: 'Upload local store metadata to App Store Connect?', explanation: 'Uploads the local EAS Metadata files to App Store Connect for the selected submission profile.', effects: ['Changes remote App Store Connect metadata'], confirmationLabel: 'Upload metadata', docsUrl: 'https://docs.expo.dev/eas/metadata/' },
  { id: 'release.credentials', category: 'release', script: 'credentials.sh', args: ['manage'], label: 'Signing credentials', description: 'Manage Android and iOS signing credentials', icon: 'key', interactive: true, explanation: "Opens EAS credential management for the selected platform: Android keystores, iOS distribution certificates, and provisioning profiles. Lost signing keys can lock you out of updating a published app.", effects: ["Reads and may change signing credentials stored by EAS", "May generate or revoke certificates and keystores"], docsUrl: 'https://docs.expo.dev/app-signing/app-credentials/' },
  { id: 'release.devices', category: 'release', script: 'devices.sh', args: ['list'], label: 'Apple devices', description: 'List devices registered for internal distribution', icon: 'device-mobile', explanation: "Lists the Apple devices registered for internal distribution. A device missing from this list cannot install an internal build.", effects: ["Reads registered devices from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/build/internal-distribution/' },
  { id: 'release.testflight-crashes', category: 'release', script: 'testflight.sh', args: ['crashes'], label: 'TestFlight crashes', description: 'Inspect TestFlight crash reports', icon: 'bug', explanation: "Shows crash reports collected from TestFlight testers for this app.", effects: ["Reads TestFlight crash reports from App Store Connect", "Changes nothing"], docsUrl: 'https://docs.expo.dev/review/overview/' },
  { id: 'release.testflight-feedback', category: 'release', script: 'testflight.sh', args: ['feedback'], label: 'TestFlight feedback', description: 'Inspect tester feedback', icon: 'comment-discussion', explanation: "Shows written feedback and screenshots submitted by TestFlight testers.", effects: ["Reads TestFlight feedback from App Store Connect", "Changes nothing"], docsUrl: 'https://docs.expo.dev/review/overview/' },

  { id: 'cloud.deployments', category: 'cloud', script: 'deploy.sh', args: ['browse'], label: 'Web deployments', description: 'List EAS Hosting deployments', icon: 'globe', explanation: "Lists EAS Hosting deployments of the web build, with the alias each one is serving under.", effects: ["Reads deployments from EAS Hosting", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas/hosting/deployments-and-aliases/' },
  { id: 'cloud.deploy-preview', category: 'cloud', script: 'deploy.sh', args: ['preview'], label: 'Deploy web preview', description: 'Export and deploy a preview to EAS Hosting', icon: 'preview', confirm: 'Export and deploy a web preview to EAS Hosting?', explanation: 'Exports the web app locally and uploads the resulting bundle as a preview deployment to EAS Hosting.', effects: ['Creates a local web export', 'Creates a remote preview deployment'], confirmationLabel: 'Deploy preview', docsUrl: 'https://docs.expo.dev/eas/hosting/get-started/' },
  { id: 'cloud.env', category: 'cloud', script: 'env.sh', args: ['list'], label: 'Environment variables', description: 'List EAS environment variables', icon: 'symbol-variable', explanation: "Lists the environment variables EAS holds for this project, by environment. Values marked secret are shown only as their names.", effects: ["Reads environment variable names from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas/environment-variables/' },
  { id: 'cloud.webhooks', category: 'cloud', script: 'webhooks.sh', args: ['list'], label: 'Webhooks', description: 'List EAS Build and Submit webhooks', icon: 'radio-tower', explanation: "Lists the webhooks EAS calls when a build or submission finishes, with the URL and event each one is bound to.", effects: ["Reads webhooks from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas/webhooks/' },
  { id: 'cloud.workflows', category: 'cloud', script: 'workflow.sh', args: ['runs'], label: 'Workflow runs', description: 'List recent EAS Workflow runs', icon: 'server-process', explanation: "Lists recent EAS Workflow runs \u2014 the CI pipelines defined under .eas/workflows \u2014 with the status each reached.", effects: ["Reads workflow runs from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas/workflows/syntax/' },
  { id: 'cloud.observability', category: 'cloud', script: 'observe.sh', args: ['versions'], label: 'App observability', description: 'Inspect observed application versions', icon: 'graph-line', explanation: "Lists the application versions EAS has observed running in the field, which is how you tell what your users are actually on.", effects: ["Reads observed versions from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas-insights/introduction/#app-observability' },
  { id: 'cloud.metrics', category: 'cloud', script: 'observe.sh', args: ['metrics-summary'], label: 'Metrics summary', description: 'Show an application metrics summary', icon: 'dashboard', explanation: "Summarizes the application metrics EAS has collected, such as launches and errors, across observed versions.", effects: ["Reads metrics from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/eas-insights/introduction/#app-observability' },
  { id: 'cloud.simulators', category: 'cloud', script: 'sim.sh', args: ['list'], label: 'Cloud simulators', description: 'List EAS cloud simulator sessions', icon: 'vm', explanation: "Lists your EAS cloud simulator sessions \u2014 remote simulators for trying a build without local Android or Xcode tooling.", effects: ["Reads simulator sessions from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/build-reference/simulators/' },

  { id: 'account.status', category: 'account', script: 'auth.sh', args: ['status'], label: 'Expo login status', description: 'Show the current Expo account', icon: 'account', explanation: "Shows which Expo account the EAS CLI is currently signed in as. Cloud actions run as this account.", effects: ["Reads the current session from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/accounts/account-types/' },
  { id: 'account.login', category: 'account', script: 'auth.sh', args: ['login'], label: 'Log in to Expo', description: 'Authenticate the EAS CLI', icon: 'sign-in', interactive: true, explanation: "Signs the EAS CLI in to an Expo account, in a terminal because the prompt asks for a password and a one-time code. The session is stored on this machine and is used by every cloud action.", effects: ["Stores an Expo session on this machine", "Prompts for credentials and two-factor code"], docsUrl: 'https://docs.expo.dev/accounts/programmatic-access/' },
  { id: 'account.usage', category: 'account', script: 'account.sh', args: ['usage'], label: 'Account usage', description: 'Inspect current EAS usage', icon: 'graph', explanation: "Shows the named account's current EAS usage against its plan limits \u2014 build minutes, update bandwidth, and concurrency.", effects: ["Reads usage for the named account from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/accounts/account-types/' },
  { id: 'account.audit', category: 'account', script: 'account.sh', args: ['audit'], label: 'Security audit', description: 'Review account security configuration', icon: 'shield', explanation: "Reviews the named account's security configuration, including two-factor enrolment and access tokens.", effects: ["Reads account security settings from EAS", "Changes nothing"], docsUrl: 'https://docs.expo.dev/accounts/two-factor/' },
  { id: 'toolkit.status', category: 'account', script: 'version.sh', args: ['status'], label: 'Toolkit versions', description: 'Show toolkit, Expo, and EAS versions', icon: 'versions', explanation: "Reports the versions in play: this toolkit, the project's Expo SDK, and the EAS CLI, and whether each meets the minimum Nova supports.", effects: ["Reads local package versions", "Changes nothing"], docsUrl: 'https://docs.expo.dev/more/expo-cli/' },
  { id: 'toolkit.update-check', category: 'account', script: 'version.sh', args: ['check'], label: 'Check toolkit update', description: 'Check npm for a newer toolkit release', icon: 'cloud-download', explanation: "Asks npm whether a newer release of the Nova toolkit is published.", effects: ["Reads the published version from npm", "Changes nothing"], docsUrl: 'https://docs.expo.dev/more/expo-cli/#install' },
];

export function findToolkitAction(id: string): ToolkitAction | undefined {
  return TOOLKIT_ACTIONS.find((action) => action.id === id);
}

/**
 * What to offer once an action succeeds, keyed by action id.
 *
 * A finished task that says only "completed successfully" leaves the user to
 * work out what the next move is, which for a release sequence is the whole
 * question. Actions absent from this map still get a documentation link, so
 * every success leads somewhere.
 */
export interface NextStep {
  label: string;
  description: string;
  command: string;
  args?: string[];
}

export const SUCCESS_NEXT_STEPS: Record<string, NextStep> = {
  'project.init': {
    label: 'Configure EAS Build',
    description:
      'The project is linked to EAS. Define the build profiles that decide how each build is produced.',
    command: 'novaExpo.toolkitAction',
    args: ['project.build-config'],
  },
  'project.build-config': {
    label: 'Configure EAS Update',
    description:
      'Build profiles are in place. Add EAS Update so you can ship JavaScript fixes without a new store release.',
    command: 'novaExpo.toolkitAction',
    args: ['project.update-config'],
  },
  'project.update-config': {
    label: 'Create a Build',
    description: 'EAS Update is configured. Create a build to install and test on a device.',
    command: 'novaExpo.build',
  },
  'project.setup': {
    label: 'Create a Build',
    description: 'EAS setup is complete. Create your first cloud build.',
    command: 'novaExpo.build',
  },
  'project.templates': {
    label: 'View Workflow Runs',
    description:
      'The workflow recipes are installed. Commit them, then watch their runs from the dashboard.',
    command: 'novaExpo.toolkitAction',
    args: ['cloud.workflows'],
  },
  'development.prebuild': {
    label: 'Run Android Locally',
    description:
      'Native projects were generated. Compile and launch one to confirm the native layer builds.',
    command: 'novaExpo.toolkitAction',
    args: ['development.android'],
  },
  'development.variants': {
    label: 'Create a Build',
    description:
      'Variants are configured. Build the development profile to install it alongside production.',
    command: 'novaExpo.build',
  },
  'development.notifications': {
    label: 'Set Up Push Credentials',
    description:
      'The client code is in place. Upload the FCM or APNs key, without which pushes never arrive.',
    command: 'novaExpo.toolkitAction',
    args: ['development.notification-credentials'],
  },
  'builds.dev': {
    label: 'Start the Dev Server',
    description: 'Install the development build, then start Metro for it to connect to.',
    command: 'novaExpo.dev.start',
  },
  'updates.list': {
    label: 'Inspect Update Adoption',
    description: 'Take an update group ID from the list to see how many devices took it.',
    command: 'novaExpo.toolkitAction',
    args: ['updates.insights'],
  },
  'updates.fingerprint': {
    label: 'Compare Fingerprints',
    description:
      'Compare this fingerprint against a build or update to see whether they can share updates.',
    command: 'novaExpo.toolkitAction',
    args: ['updates.compare-fingerprint'],
  },
  'release.store-setup': {
    label: 'Validate Store Metadata',
    description: 'Metadata was created. Lint it before a submission depends on it.',
    command: 'novaExpo.toolkitAction',
    args: ['release.metadata-lint'],
  },
  'release.metadata-pull': {
    label: 'Validate Store Metadata',
    description: 'Metadata was downloaded. Lint it before pushing anything back.',
    command: 'novaExpo.toolkitAction',
    args: ['release.metadata-lint'],
  },
  'release.metadata-lint': {
    label: 'Submit to the Store',
    description: 'Metadata is valid. Send a build to the store when you are ready.',
    command: 'novaExpo.submit',
  },
  'release.credentials': {
    label: 'Create a Build',
    description: 'Credentials are in place. Create the build that will be signed with them.',
    command: 'novaExpo.build',
  },
  'account.login': {
    label: 'Check the Linked Project',
    description: 'You are signed in. Confirm which EAS project this app is linked to.',
    command: 'novaExpo.toolkitAction',
    args: ['project.info'],
  },
  'cloud.deploy-preview': {
    label: 'View Deployments',
    description: 'The preview is deployed. Open the deployment list to find its URL.',
    command: 'novaExpo.toolkitAction',
    args: ['cloud.deployments'],
  },
  'builds.list': {
    label: 'Submit to the Store',
    description: 'Pick a completed build from the list and send it to a store.',
    command: 'novaExpo.submit',
  },
};
