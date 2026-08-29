import * as vscode from 'vscode';
import { CommandContext } from './context';

/**
 * Commands for the local development loop: Metro, project health, and the two
 * dependency operations that both this group and the recovery suggestions in
 * recovery.ts route through.
 */
export function registerDevelopmentCommands(context: CommandContext): vscode.Disposable[] {
  const { dashboard, requireProjectRoot, ensureIdle, confirm } = context;

  const installDependencies = async (): Promise<void> => {
    const root = await requireProjectRoot();
    const project = dashboard.getCurrentProject();
    if (!root || !project || !(await ensureIdle())) return;
    const packageManager = project.packageManager ?? 'npm';
    if (
      !(await confirm(
        'Install project dependencies?',
        `Nova will run ${packageManager} install in the active project.`,
        'Install Dependencies',
        ['Creates or updates node_modules', 'May update the project lockfile'],
        'default',
      ))
    )
      return;
    await dashboard.runExecutable(
      packageManager,
      ['install'],
      root,
      `Dependencies · ${packageManager} install`,
      'dependencies.install',
    );
  };

  const fixDependencies = async (): Promise<void> => {
    const root = await requireProjectRoot();
    if (!root || !(await ensureIdle())) return;
    if (
      !(await confirm(
        'Fix Expo dependencies?',
        'This installs Expo-compatible package versions and reruns project health checks.',
        'Fix Dependencies',
        [
          'May update package.json, node_modules, and the lockfile',
          'Review dependency changes afterward',
        ],
      ))
    )
      return;
    await dashboard.run('doctor.sh', ['fix'], root, 'Project Health · fix dependencies');
  };

  return [
    vscode.commands.registerCommand('novaExpo.dependencies.install', installDependencies),
    vscode.commands.registerCommand('novaExpo.doctor.fix', fixDependencies),

    /**
     * Metro runs in a real terminal, not as a managed dashboard task.
     *
     * The dev server is driven almost entirely by keystrokes — `r` to reload,
     * `a`/`i`/`w` to open a target, `j` for the debugger, `m` for the menu — and
     * a managed task closes stdin and strips ANSI, which also mangles the Expo
     * Go QR code into unreadable text. Reproducing that as dashboard buttons
     * would mean reimplementing a protocol Expo owns and changes.
     *
     * A terminal also frees the single managed-task slot, so Metro can keep
     * running while a build or an update publishes in the dashboard — which is
     * the normal way of working, and was previously impossible.
     */
    vscode.commands.registerCommand('novaExpo.dev.start', async () => {
      const root = await requireProjectRoot();
      if (!root) return;
      const choice = await dashboard.pick('Start development', [
        {
          label: 'Metro launcher',
          description: 'Start Metro with the launcher menu',
          detail: 'Opens a terminal; press r to reload, a or i to open a target',
          value: 'start',
        },
        {
          label: 'Expo Go',
          description: 'Open the project in Expo Go',
          detail: 'Scan the QR code the terminal prints with the Expo Go app',
          value: 'go',
        },
        {
          label: 'Development client',
          description: 'Use an installed development client',
          detail: 'For a project with native modules Expo Go cannot load',
          value: 'client',
        },
        { label: 'Android', description: 'Open the project on Android', value: 'android' },
        { label: 'iOS', description: 'Open the project on iOS', value: 'ios' },
        { label: 'Web', description: 'Open the project in a browser', value: 'web' },
      ]);
      if (!choice) return;
      await dashboard.run('dev.sh', [choice], root, `Development · ${choice}`, {
        interactive: true,
      });
    }),

    vscode.commands.registerCommand('novaExpo.doctor', async () => {
      const root = await requireProjectRoot();
      if (!root || !(await ensureIdle())) return;
      const choice = await dashboard.pick('Project health', [
        {
          label: 'Check project',
          description: 'Expo Doctor and SDK dependency alignment; does not change files',
          value: 'check',
        },
        {
          label: 'Fix dependencies',
          description: 'Installs aligned package versions, then reruns checks',
          value: 'fix',
        },
        {
          label: 'Full validation',
          description: 'Also runs the package.json validate script',
          value: 'validate',
        },
      ]);
      if (!choice) return;
      // Fixing is destructive enough to want its own confirmation, so it is
      // handed to the same implementation the standalone command uses.
      if (choice === 'fix') {
        await fixDependencies();
        return;
      }
      await dashboard.run('doctor.sh', [choice], root, `Project Health · ${choice}`);
    }),
  ];
}
