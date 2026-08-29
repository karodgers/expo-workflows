import * as vscode from 'vscode';
import { DashboardViewProvider } from '../dashboardViewProvider';
import { ExpoProjectInfo } from '../projectInfo';
import { validateCommandValue } from '../projectCreation';
import { UNCOMMITTED_CHANGES_PATTERNS } from '../recovery';

/**
 * The shared vocabulary every dashboard command is written in. Each helper
 * routes through the dashboard rather than the VS Code quick-pick API so a
 * multi-step flow stays inside the webview, and each one resolves to
 * `undefined` or `false` when the user backs out — which is why every command
 * body reads as a chain of early returns.
 *
 * Commands receive this object instead of reaching for the provider directly,
 * so the guards below stay identical across every workflow.
 */
export interface CommandContext {
  readonly dashboard: DashboardViewProvider;

  /**
   * Resolves the active project root, rescanning once before giving up so a
   * command invoked from the palette during startup still finds a project.
   */
  requireProjectRoot(): Promise<string | undefined>;

  /** Nova runs one managed task at a time so output and cancellation stay reliable. */
  ensureIdle(): Promise<boolean>;

  /** Shows the in-dashboard confirmation card and clears it when declined. */
  confirm(
    title: string,
    description: string,
    confirmLabel: string,
    details?: string[],
    tone?: 'default' | 'warning',
  ): Promise<boolean>;

  /** Re-prompts with the validation message attached until the answer passes or is cancelled. */
  askValidated(
    title: string,
    value: string,
    description: string,
    validate: (answer: string) => string | undefined,
  ): Promise<string | undefined>;

  /** Requires a linked EAS project; points at guided setup when there is none. */
  requireEasProject(project: ExpoProjectInfo | undefined): Promise<boolean>;

  /** Requires a linked EAS project that also declares at least one build profile. */
  requireEasConfiguration(project: ExpoProjectInfo | undefined): Promise<boolean>;

  pickPlatform(title: string, allowAll: boolean): Promise<string | undefined>;

  /** Offers the profiles detected in eas.json, plus an escape hatch for one that was not. */
  pickProfile(title: string, profiles: string[], fallback?: string): Promise<string | undefined>;

  /**
   * Runs the production safety gate. The gate refuses a working tree with
   * uncommitted or untracked files so a release can be traced back to a commit.
   * That is the right default and the wrong dead end, so the single recoverable
   * case is offered as an explicit, separately confirmed decision instead of
   * being silently allowed or silently blocked.
   */
  runReleaseGate(
    root: string,
    args: string[],
    title: string,
    toolkitFlags?: string[],
  ): Promise<number | null>;

  /** Builds a validator that rejects empty answers and shell-ambiguous values alike. */
  validateRequiredText(message: string): (value: string) => string | undefined;

  /** Opens a project folder, asking for one when the caller has no path in hand. */
  openProjectDirectory(directory?: string): Promise<void>;
}

export function createCommandContext(dashboard: DashboardViewProvider): CommandContext {
  const requireProjectRoot = async (): Promise<string | undefined> => {
    let root = dashboard.getCurrentProjectRoot();
    if (!root) {
      await dashboard.refresh();
      root = dashboard.getCurrentProjectRoot();
    }
    if (!root) {
      await dashboard.showFeedback(
        'error',
        'No Expo project selected',
        'Open an Expo project or create a new Nova project before running this action.',
        { label: 'Create project', command: 'novaExpo.project.create' },
      );
    }
    return root;
  };

  const ensureIdle = async (): Promise<boolean> => {
    if (!dashboard.hasRunningTask) return true;
    await dashboard.showFeedback(
      'warning',
      'A task is already running',
      'Nova Expo runs one managed dashboard task at a time so output and cancellation remain reliable.',
      { label: 'View task', command: 'novaExpo.task.show' },
    );
    return false;
  };

  const confirm = async (
    title: string,
    description: string,
    confirmLabel: string,
    details: string[] = [],
    tone: 'default' | 'warning' = 'warning',
  ): Promise<boolean> => {
    const accepted = await dashboard.confirm(title, { description, confirmLabel, details, tone });
    if (!accepted) dashboard.dismissPrompt();
    return accepted;
  };

  const askValidated = async (
    title: string,
    value: string,
    description: string,
    validate: (answer: string) => string | undefined,
  ): Promise<string | undefined> => {
    let validationMessage: string | undefined;
    let currentValue = value;
    while (true) {
      const answer = await dashboard.input(title, {
        description,
        value: currentValue,
        validationMessage,
      });
      if (answer === undefined) return undefined;
      currentValue = answer.trim();
      validationMessage = validate(currentValue);
      if (!validationMessage) return currentValue;
    }
  };

  const requireEasProject = async (project: ExpoProjectInfo | undefined): Promise<boolean> => {
    if (project?.hasEasConfig) return true;
    await dashboard.showFeedback(
      'warning',
      'EAS is not configured',
      'Configure EAS before running submissions, updates, or cloud workflows.',
      { label: 'Configure EAS', command: 'novaExpo.toolkitAction', args: ['project.setup'] },
    );
    dashboard.dismissPrompt();
    return false;
  };

  const requireEasConfiguration = async (
    project: ExpoProjectInfo | undefined,
  ): Promise<boolean> => {
    if (!(await requireEasProject(project))) return false;
    if (project!.buildProfiles.length > 0) return true;
    await dashboard.showFeedback(
      'warning',
      'No EAS build profiles found',
      'Add at least one build profile to eas.json before building, submitting, or publishing an update.',
      { label: 'Configure EAS', command: 'novaExpo.toolkitAction', args: ['project.build-config'] },
    );
    dashboard.dismissPrompt();
    return false;
  };

  const pickPlatform = (title: string, allowAll: boolean): Promise<string | undefined> =>
    dashboard.pick(title, [
      ...(allowAll
        ? [{ label: 'Android and iOS', description: 'Run for both platforms', value: 'all' }]
        : []),
      { label: 'Android', value: 'android' },
      { label: 'iOS', value: 'ios' },
    ]);

  const pickProfile = async (
    title: string,
    profiles: string[],
    fallback = 'production',
  ): Promise<string | undefined> => {
    const choices = [...new Set(profiles.length > 0 ? profiles : [fallback])];
    const customValue = '__nova_custom_profile__';
    const selected = await dashboard.pick(title, [
      ...choices.map((name) => ({ label: name, value: name })),
      {
        label: 'Enter another profile…',
        description: 'Use a profile not detected from eas.json',
        value: customValue,
      },
    ]);
    if (!selected || selected !== customValue) return selected;
    return askValidated(
      'EAS profile name',
      '',
      'Enter the exact profile key from eas.json.',
      (value) =>
        /^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)
          ? undefined
          : 'Use letters, numbers, underscores, or hyphens.',
    );
  };

  const runReleaseGate = async (
    root: string,
    args: string[],
    title: string,
    toolkitFlags: string[] = [],
  ): Promise<number | null> => {
    const code = await dashboard.run('release-check.sh', args, root, title, {
      deferFailureReport: true,
      toolkitFlags,
    });
    if (code === 0 || code === null) return code;
    const output = dashboard.getLatestTaskOutput();
    if (!UNCOMMITTED_CHANGES_PATTERNS.some((pattern) => pattern.test(output))) {
      await dashboard.reportTaskFailure(title, 'release-check.sh', args, root);
      return code;
    }
    const accepted = await confirm(
      'Release with uncommitted changes?',
      'The readiness gate stopped because this project has uncommitted or untracked files. Continuing releases the working tree as it is now.',
      'Include Uncommitted Changes',
      [
        'The released artifact will not match any commit',
        'Untracked files are included in the same way',
        'Commit or stash instead to keep the release traceable',
      ],
    );
    if (!accepted) {
      await dashboard.reportTaskFailure(title, 'release-check.sh', args, root);
      return code;
    }
    // `--allow-dirty` travels as a toolkit flag, not as an argument: it is on
    // the reserved list so that no answer a user types can ever become it, and
    // this is the one place it is legitimately earned.
    return dashboard.run(
      'release-check.sh',
      args,
      root,
      `${title} · uncommitted changes included`,
      { toolkitFlags: [...toolkitFlags, '--allow-dirty'] },
    );
  };

  const validateRequiredText =
    (message: string) =>
    (value: string): string | undefined =>
      value ? validateCommandValue(value) : message;

  const openProjectDirectory = async (directory?: string): Promise<void> => {
    let target = directory ? vscode.Uri.file(directory) : undefined;
    if (!target) {
      const selection = await vscode.window.showOpenDialog({
        title: 'Open an Expo project',
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Open Project',
      });
      target = selection?.[0];
    }
    if (target) await vscode.commands.executeCommand('vscode.openFolder', target, false);
  };

  return {
    dashboard,
    requireProjectRoot,
    ensureIdle,
    confirm,
    askValidated,
    requireEasProject,
    requireEasConfiguration,
    pickPlatform,
    pickProfile,
    runReleaseGate,
    validateRequiredText,
    openProjectDirectory,
  };
}
