import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { ExpoProjectInfo } from '../projectInfo';
import { CommandContext } from './context';

/**
 * The four commands that can reach users: cloud builds, store submissions, OTA
 * updates, and the readiness gate they all run first.
 *
 * Anything bound for a store or a production channel goes through
 * `runReleaseGate` before the real command starts, and the confirmation card
 * says so up front, so a release is never one click away from a dirty tree.
 */
export function registerReleaseCommands(context: CommandContext): vscode.Disposable[] {
  const {
    dashboard,
    requireProjectRoot,
    ensureIdle,
    confirm,
    askValidated,
    requireEasConfiguration,
    pickPlatform,
    pickProfile,
    runReleaseGate,
    validateRequiredText,
  } = context;

  /**
   * Store metadata is optional right up until the submission path, so it is
   * suggested as a follow-up on a passing check rather than demanded earlier.
   */
  const suggestStoreMetadata = async (
    root: string,
    project: ExpoProjectInfo | undefined,
  ): Promise<void> => {
    if (project?.hasStoreMetadata || fs.existsSync(path.join(root, 'store.config.json'))) return;
    dashboard.attachTaskCompletion({
      label: 'Set Up Store Metadata',
      description:
        'Store metadata is not configured yet. Generate store.config.json before the app-store submission path.',
      command: 'novaExpo.toolkitAction',
      args: ['release.store-setup'],
    });
  };

  return [
    vscode.commands.registerCommand('novaExpo.build', async (profileArg?: string) => {
      const root = await requireProjectRoot();
      const project = dashboard.getCurrentProject();
      if (!root || !(await ensureIdle()) || !(await requireEasConfiguration(project))) return;
      const profiles = project!.buildProfiles.map((profile) => profile.name);
      // A profile passed from the dashboard must still exist in eas.json.
      if (profileArg && !profiles.includes(profileArg)) return;
      const profile = profileArg ?? (await pickProfile('Choose an EAS build profile', profiles));
      if (!profile) return;
      const platform = await pickPlatform('Choose a build platform', true);
      if (!platform) return;
      const selectedProfile = project!.buildProfiles.find((item) => item.name === profile);
      const storeDistribution = selectedProfile?.distribution !== 'internal';
      if (
        !(await confirm(
          'Create an EAS build?',
          'This uploads project source to EAS and may consume cloud build quota.',
          'Create Build',
          [
            `Profile: ${profile}`,
            `Platform: ${platform === 'all' ? 'Android and iOS' : platform}`,
            ...(storeDistribution
              ? [
                  'This appears to be a store-distribution profile, so a production readiness gate runs first.',
                ]
              : []),
          ],
        ))
      )
        return;
      if (storeDistribution) {
        const gate = await runReleaseGate(
          root,
          ['build', '--profile', profile, '--platform', platform],
          'Readiness · production build',
        );
        if (gate !== 0) return;
      }
      const code = await dashboard.run(
        'build.sh',
        ['create'],
        root,
        `Build · ${profile} · ${platform}`,
        { environment: { EAS_PROFILE: profile, EXPO_PLATFORM: platform } },
      );
      if (code === 0) {
        dashboard.attachTaskCompletion(
          storeDistribution
            ? {
                label: 'Submit to the Store',
                description:
                  'The build is queued on EAS. Once it completes, send it to the Apple or Google store account configured in eas.json.',
                command: 'novaExpo.submit',
                docsUrl: 'https://docs.expo.dev/deploy/submit-to-app-stores/',
              }
            : {
                label: 'View Build History',
                description:
                  'The build is queued on EAS. Follow it to completion and collect the install link for testers.',
                command: 'novaExpo.toolkitAction',
                args: ['builds.list'],
                docsUrl: 'https://docs.expo.dev/build/internal-distribution/',
              },
        );
      }
    }),

    vscode.commands.registerCommand('novaExpo.submit', async () => {
      const root = await requireProjectRoot();
      const project = dashboard.getCurrentProject();
      if (!root || !(await ensureIdle()) || !(await requireEasConfiguration(project))) return;
      const platform = await pickPlatform('Choose a submission platform', false);
      if (!platform) return;
      const profile = await pickProfile('Choose a submission profile', project!.submitProfiles);
      if (!profile) return;
      const source = await dashboard.pick('Choose the build to submit', [
        {
          label: 'Latest completed build',
          description: 'Use the newest compatible EAS build',
          value: 'latest',
        },
        { label: 'Build ID', description: 'Submit a specific EAS build', value: 'id' },
        {
          label: 'Local app file',
          description: 'Choose an .aab, .apk, or .ipa from this computer',
          value: 'path',
        },
      ]);
      if (!source) return;
      const sourceArgs: string[] = [];
      if (source === 'latest') sourceArgs.push('--latest');
      if (source === 'id') {
        const buildId = await askValidated(
          'EAS build ID',
          '',
          'Paste the ID of the completed EAS build.',
          validateRequiredText('Enter a build ID.'),
        );
        if (!buildId) return;
        sourceArgs.push('--id', buildId);
      }
      if (source === 'path') {
        const file = await vscode.window.showOpenDialog({
          title: 'Choose a build to submit',
          canSelectFiles: true,
          canSelectFolders: false,
          canSelectMany: false,
          filters: { 'Mobile builds': ['aab', 'apk', 'ipa'] },
        });
        if (!file?.[0]) return;
        sourceArgs.push('--path', file[0].fsPath);
      }
      if (
        !(await confirm(
          'Submit to the app store?',
          'This sends the selected build to the configured Apple or Google store account.',
          'Submit Build',
          [
            `Platform: ${platform}`,
            `Profile: ${profile}`,
            `Source: ${source}`,
            'A production readiness gate runs first.',
          ],
        ))
      )
        return;
      const gate = await runReleaseGate(
        root,
        ['submit', '--profile', profile, '--platform', platform],
        'Readiness · store submission',
      );
      if (gate !== 0) return;
      const code = await dashboard.run(
        'submit.sh',
        ['create', ...sourceArgs],
        root,
        `Submit · ${platform}`,
        { environment: { EAS_PROFILE: profile, EXPO_PLATFORM: platform } },
      );
      if (code === 0) {
        dashboard.attachTaskCompletion({
          label: 'Check Submission Status',
          description:
            'The build was handed to the store. Store processing continues after this task ends, so check the status before announcing a release.',
          command: 'novaExpo.toolkitAction',
          args: ['submissions.status'],
          docsUrl: 'https://docs.expo.dev/deploy/submit-to-app-stores/',
        });
      }
    }),

    vscode.commands.registerCommand('novaExpo.update.publish', async () => {
      const root = await requireProjectRoot();
      const project = dashboard.getCurrentProject();
      if (!root || !(await ensureIdle()) || !(await requireEasConfiguration(project))) return;
      if (!project?.hasUpdates) {
        await dashboard.showFeedback(
          'warning',
          'EAS Update is not configured',
          'Install and configure expo-updates before publishing.',
          {
            label: 'Configure updates',
            command: 'novaExpo.toolkitAction',
            args: ['project.update-config'],
          },
        );
        return;
      }
      const channels = [
        ...new Set(project.buildProfiles.map((profile) => profile.channel).filter(Boolean)),
      ] as string[];
      if (channels.length === 0) {
        await dashboard.showFeedback(
          'error',
          'No update channels found',
          'Add a channel to an EAS build profile before publishing an update. Nova Expo will not guess a production destination.',
          {
            label: 'Configure EAS Build',
            command: 'novaExpo.toolkitAction',
            args: ['project.build-config'],
          },
        );
        return;
      }
      const channel = await dashboard.pick(
        'Choose an update channel',
        channels.map((name) => ({ label: name, value: name })),
      );
      if (!channel) return;
      // An update reaches whoever installed a build pointed at this channel, so
      // a channel serving any store-distribution profile counts as production.
      const channelProfiles = project.buildProfiles.filter(
        (profile) => profile.channel === channel,
      );
      const releaseProfile =
        channelProfiles.find((profile) => profile.distribution !== 'internal') ??
        channelProfiles[0];
      const productionAudience =
        channel === 'production' ||
        channelProfiles.some((profile) => profile.distribution !== 'internal');
      const message = await askValidated(
        'Release notes',
        '',
        'Describe what changed in this update.',
        validateRequiredText('Release notes are required for traceable updates.'),
      );
      if (!message) return;
      if (
        !(await confirm(
          'Publish an OTA update?',
          'This exports the JavaScript bundle and publishes it to devices on the selected channel.',
          'Publish Update',
          [
            `Channel: ${channel}`,
            `Message: ${message}`,
            ...(productionAudience
              ? [
                  'This channel serves a store-distribution profile, so a production readiness gate runs first.',
                ]
              : []),
          ],
        ))
      )
        return;
      if (productionAudience) {
        const environment = releaseProfile?.environment ?? 'production';
        const gate = await runReleaseGate(
          root,
          [
            'update',
            '--profile',
            releaseProfile?.name ?? 'production',
            '--platform',
            'all',
            '--environment',
            environment,
          ],
          'Readiness · production update',
        );
        if (gate !== 0) return;
      }
      const code = await dashboard.run('update.sh', ['publish'], root, `Update · ${channel}`, {
        environment: {
          EAS_UPDATE_CHANNEL: channel,
          EAS_UPDATE_MESSAGE: message,
          ...(releaseProfile?.environment ? { EAS_ENVIRONMENT: releaseProfile.environment } : {}),
        },
      });
      if (code === 0) {
        dashboard.attachTaskCompletion({
          label: 'Inspect Update Adoption',
          description: `The update is live on ${channel}. Devices pick it up on their next launch, so check adoption and crash metrics before assuming it landed cleanly.`,
          command: 'novaExpo.toolkitAction',
          args: ['updates.insights'],
          docsUrl: 'https://docs.expo.dev/eas-update/how-it-works/',
        });
      }
    }),

    vscode.commands.registerCommand('novaExpo.releaseCheck', async () => {
      const root = await requireProjectRoot();
      if (!root || !(await ensureIdle())) return;
      const project = dashboard.getCurrentProject();
      const kind = await dashboard.pick('Check production readiness for', [
        { label: 'Build', description: 'Validate a production cloud build', value: 'build' },
        {
          label: 'Store submission',
          description: 'Validate store identifiers, credentials, and metadata',
          value: 'submit',
        },
        {
          label: 'OTA update',
          description: 'Validate runtime and update compatibility',
          value: 'update',
        },
      ]);
      if (!kind) return;
      const depth = await dashboard.pick('Choose validation depth', [
        {
          label: 'Standard',
          description: 'Configuration, dependencies, and release safety checks',
          value: 'standard',
        },
        {
          label: 'Full',
          description: 'Also validate the app and export a production bundle',
          value: 'full',
        },
      ]);
      if (!depth) return;
      // Submissions are profiled in eas.json's submit block, but fall back to
      // build profile names when a project has not split the two.
      const profileNames =
        kind === 'submit'
          ? project?.submitProfiles.length
            ? project.submitProfiles
            : (project?.buildProfiles.map((profile) => profile.name) ?? [])
          : (project?.buildProfiles.map((profile) => profile.name) ?? []);
      const profile = await pickProfile('Choose the profile to validate', profileNames);
      if (!profile) return;
      const platform = await pickPlatform('Choose the platform to validate', true);
      if (!platform) return;
      const args = [kind, '--profile', profile, '--platform', platform];
      if (kind === 'update') {
        const environment =
          project?.buildProfiles.find((item) => item.name === profile)?.environment ?? 'production';
        args.push('--environment', environment);
      }
      const code = await runReleaseGate(
        root,
        args,
        `Readiness · ${kind}`,
        depth === 'full' ? ['--full'] : [],
      );
      if (code === 0 && kind === 'submit') await suggestStoreMetadata(root, project);
    }),
  ];
}
