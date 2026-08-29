import * as vscode from 'vscode';
import { renderDashboard } from './dashboardHtml';
import { findReservedFlag, isWebviewCommand } from './dashboardSecurity';
import { discoverExpoProjects } from './projectDiscovery';
import { ExpoProjectInfo } from './projectInfo';
import { ConfirmOptions, InputOptions, PromptBridge } from './promptBridge';
import { ProcessRunner } from './processRunner';
import { classifyFailure, FailureContext, setupRecommendation } from './recovery';
import { resolveInitializerPath, resolveScriptPath } from './toolkitRunner';
import {
  CompletionAction,
  FeedbackAction,
  isWebviewMessage,
  PickItem,
  RecoveryAction,
} from './webviewProtocol';

const ACTIVE_PROJECT_KEY = 'novaExpo.activeProjectRoot';
export interface RunScriptOptions {
  /** Opens a real integrated terminal instead of the managed dashboard task. */
  interactive?: boolean;
  /** Values handed to the workflow runtime instead of the command line. */
  environment?: NodeJS.ProcessEnv;
  /** Leaves failure reporting to the caller. */
  deferFailureReport?: boolean;
  /**
   * Reserved options the extension adds itself, appended after the check that
   * refuses them in `args`.
   *
   * They are reserved precisely because a user-entered value must never become
   * one — `--allow-dirty` switches the release gate off. Passing them here
   * rather than in `args` keeps that check meaningful while still letting the
   * one caller that has earned the flag, by asking, actually send it.
   */
  toolkitFlags?: string[];
}

export class DashboardViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
  private view: vscode.WebviewView | undefined;
  private project: ExpoProjectInfo | undefined;
  private projects: ExpoProjectInfo[] = [];
  private readonly bridge: PromptBridge;
  private refreshVersion = 0;
  private readonly runner: ProcessRunner;
  private readonly viewDisposables: vscode.Disposable[] = [];
  private readonly terminalListeners = new Set<vscode.Disposable>();

  constructor(private readonly context: vscode.ExtensionContext) {
    // The bridge and the runner both outlive any single webview so a wizard or
    // a task survives the view being hidden, moved, or reloaded.
    this.bridge = new PromptBridge((message) => {
      void this.view?.webview.postMessage(message);
    });
    this.runner = new ProcessRunner(
      (message) => {
        void this.view?.webview.postMessage(message);
      },
      (snapshot) => {
        void vscode.commands.executeCommand(
          'setContext',
          'novaExpo.taskRunning',
          snapshot?.status === 'running' || snapshot?.status === 'stopping',
        );
      },
    );
  }

  resolveWebviewView(webviewView: vscode.WebviewView): void {
    this.clearViewDisposables();
    this.view = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'resources'),
        vscode.Uri.joinPath(this.context.extensionUri, 'dist'),
      ],
    };
    webviewView.webview.html = renderDashboard(webviewView.webview, this.context.extensionUri);

    this.viewDisposables.push(
      webviewView.webview.onDidReceiveMessage((message: unknown) => {
        if (!isWebviewMessage(message)) return;
        if (this.bridge.handleMessage(message)) return;
        if (this.runner.handleMessage(message)) return;
        if (message.type === 'command') {
          if (!isWebviewCommand(message.command)) return;
          void vscode.commands.executeCommand(message.command, ...(message.args ?? []));
          return;
        }
        if (message.type === 'ready') {
          // A reloaded webview starts empty, so replay what it is meant to be
          // showing rather than waiting for the next workspace scan.
          this.postState(false);
          this.bridge.replay();
        }
      }),
      webviewView.onDidChangeVisibility(() => {
        if (!webviewView.visible) return;
        void this.refresh();
        this.bridge.replay();
      }),
      webviewView.onDidDispose(() => {
        this.view = undefined;
        this.clearViewDisposables();
      }),
    );

    void this.refresh();
  }

  getCurrentProjectRoot(): string | undefined {
    return this.project?.root;
  }

  getCurrentProject(): ExpoProjectInfo | undefined {
    return this.project;
  }

  getProjects(): readonly ExpoProjectInfo[] {
    return this.projects;
  }

  get hasRunningTask(): boolean {
    return this.runner.isBusy;
  }

  async refresh(): Promise<void> {
    const version = ++this.refreshVersion;
    this.postState(true);
    const projects = await discoverExpoProjects();
    if (version !== this.refreshVersion) return;

    this.projects = projects;
    const savedRoot = this.context.workspaceState.get<string>(ACTIVE_PROJECT_KEY);
    this.project = projects.find((candidate) => candidate.root === savedRoot) ?? projects[0];
    if (this.project?.root !== savedRoot) {
      await this.context.workspaceState.update(ACTIVE_PROJECT_KEY, this.project?.root);
    }
    this.postState(false);
  }

  async selectProject(root: string): Promise<boolean> {
    const project = this.projects.find((candidate) => candidate.root === root);
    if (!project) return false;
    this.project = project;
    await this.context.workspaceState.update(ACTIVE_PROJECT_KEY, root);
    this.postState(false);
    return true;
  }

  async pick(title: string, items: PickItem[]): Promise<string | undefined> {
    if (items.length === 0) return undefined;
    if (this.view) {
      this.view.show(true);
      return this.bridge.pick(title, items);
    }
    const selected = await vscode.window.showQuickPick(items, { title, ignoreFocusOut: true });
    return selected?.value;
  }

  async multiPick(
    title: string,
    items: PickItem[],
    description?: string,
  ): Promise<string[] | undefined> {
    if (this.view) {
      this.view.show(true);
      return this.bridge.multiPick(title, items, description);
    }
    const selected = await vscode.window.showQuickPick(items, {
      title,
      placeHolder: description,
      canPickMany: true,
      ignoreFocusOut: true,
    });
    return selected?.map((item) => item.value);
  }

  async input(title: string, options: InputOptions | string = {}): Promise<string | undefined> {
    const resolvedOptions = typeof options === 'string' ? { placeholder: options } : options;
    if (this.view) {
      this.view.show(true);
      return this.bridge.input(title, resolvedOptions);
    }
    return vscode.window.showInputBox({
      title,
      prompt: resolvedOptions.validationMessage ?? resolvedOptions.description,
      placeHolder: resolvedOptions.placeholder,
      value: resolvedOptions.value,
      password: resolvedOptions.password,
      ignoreFocusOut: true,
    });
  }

  async confirm(title: string, options: ConfirmOptions): Promise<boolean> {
    if (this.view) {
      this.view.show(true);
      return this.bridge.confirm(title, options);
    }
    const detail = [options.description, ...(options.details ?? [])].join('\n');
    const choice =
      options.tone === 'warning'
        ? await vscode.window.showWarningMessage(
            title,
            { modal: true, detail },
            options.confirmLabel,
          )
        : await vscode.window.showInformationMessage(
            title,
            { modal: true, detail },
            options.confirmLabel,
          );
    return choice === options.confirmLabel;
  }

  async showActionCatalog(): Promise<void> {
    await this.reveal();
    void this.view?.webview.postMessage({ type: 'showActionCatalog' });
  }

  /**
   * Clears the prompt screen after a flow ends without an answer.
   *
   * Skipped while a question is outstanding: a flow that was superseded by a
   * newer one still runs its own cleanup, and dismissing here would take the
   * replacement question off screen while the command behind it kept waiting.
   */
  dismissPrompt(): void {
    if (this.bridge.hasPendingPrompt) return;
    void this.view?.webview.postMessage({ type: 'dismissPrompt' });
  }

  async showTask(): Promise<void> {
    await this.reveal();
    void this.view?.webview.postMessage({ type: 'showTask' });
  }

  stopTask(): boolean {
    return this.runner.cancelActive();
  }

  clearTask(): void {
    this.runner.clearLatest();
    this.postState(false);
  }

  attachTaskCompletion(completion: CompletionAction): void {
    this.runner.attachCompletion(completion);
  }

  attachTaskRecoveries(recoveries: RecoveryAction[]): void {
    this.runner.attachRecoveries(recoveries);
  }

  getLatestTaskOutput(): string {
    return this.runner.snapshot?.output ?? '';
  }

  async showFeedback(
    level: 'info' | 'warning' | 'error',
    title: string,
    message: string,
    action?: FeedbackAction,
  ): Promise<void> {
    await this.reveal();
    void this.view?.webview.postMessage({ type: 'feedback', level, title, message, action });
  }

  async run(
    script: string,
    args: string[],
    projectRoot: string,
    title: string,
    options: RunScriptOptions = {},
  ): Promise<number | null> {
    const {
      interactive = false,
      environment,
      deferFailureReport = false,
      toolkitFlags = [],
    } = options;
    if (!vscode.workspace.isTrusted) {
      await this.showFeedback(
        'error',
        'Workspace is not trusted',
        'Trust this workspace before running project commands.',
        { label: 'Manage workspace trust', command: 'novaExpo.workspace.trust' },
      );
      this.dismissPrompt();
      return null;
    }
    const reserved = findReservedFlag(args);
    if (reserved) {
      await this.showFeedback(
        'error',
        'Unsupported value in a workflow option',
        `A value passed to “${script}” would be read as the reserved “${reserved}” option, so the workflow was not started. Re-enter the value without a leading dash.`,
      );
      this.dismissPrompt();
      return null;
    }
    const scriptPath = resolveScriptPath(this.context, script, vscode.Uri.file(projectRoot));
    if (!scriptPath) {
      await this.showFeedback(
        'error',
        'Workflow is unavailable',
        `Nova Expo could not find “${script}” in the toolkit directory it runs workflows from. ` +
          'If you set novaExpo.toolkitPath, it must be an absolute path in your own user settings; ' +
          'clear it to fall back to the workflows bundled with the extension.',
        { label: 'Open Nova settings', command: 'novaExpo.settings.open' },
      );
      this.dismissPrompt();
      return null;
    }

    const config = vscode.workspace.getConfiguration('novaExpo', vscode.Uri.file(projectRoot));
    const shellPath = config.get<string>('shellPath', 'bash').trim() || 'bash';
    if (interactive) {
      const terminal = vscode.window.createTerminal({
        name: `Nova Expo · ${title}`,
        cwd: projectRoot,
        shellPath,
        shellArgs: [
          scriptPath,
          ...args,
          ...toolkitFlags,
          '--project',
          projectRoot,
          '--interactive',
        ],
        env: { CI: null, EXPO_TOOLKIT_NON_INTERACTIVE: '0', NO_COLOR: '1', ...environment },
        iconPath: new vscode.ThemeIcon('rocket'),
        message: `Nova Expo · ${title}`,
      });
      const closeListener = vscode.window.onDidCloseTerminal((closedTerminal) => {
        if (closedTerminal !== terminal) return;
        this.terminalListeners.delete(closeListener);
        closeListener.dispose();
        const code = closedTerminal.exitStatus?.code;
        if (code === 0) {
          void this.refresh();
        } else if (typeof code === 'number') {
          const output = `Interactive terminal exited with code ${code}. Review the terminal output for the original error.\n`;
          this.runner.recordExternalFailure(title, output, code);
          void this.presentFailure(title, {
            script,
            args,
            output,
            project: this.project?.root === projectRoot ? this.project : undefined,
          });
        }
      });
      this.terminalListeners.add(closeListener);
      terminal.show(false);
      this.dismissPrompt();
      return null;
    }

    await this.reveal();
    if (this.runner.isBusy) {
      await this.showFeedback(
        'warning',
        'A task is already running',
        'Stop the active task before starting another one.',
        { label: 'View task', command: 'novaExpo.task.show' },
      );
      this.dismissPrompt();
      return null;
    }
    const code = await this.runner.run(
      shellPath,
      [scriptPath, ...args, ...toolkitFlags, '--project', projectRoot],
      {
        cwd: projectRoot,
        title,
        environment,
      },
    );
    if (code === 0) void this.refresh();
    else if (this.runner.snapshot?.status === 'error') {
      void this.refresh();
      if (!deferFailureReport) await this.reportTaskFailure(title, script, args, projectRoot);
    }
    return code;
  }

  /**
   * Presents the failure of the most recent task. Callers that inspect a
   * failure themselves defer the report so the user is not asked to react to
   * the same failure twice.
   */
  async reportTaskFailure(
    title: string,
    script: string,
    args: string[],
    projectRoot: string,
  ): Promise<void> {
    await this.presentFailure(title, {
      script,
      args,
      output: this.runner.snapshot?.output ?? '',
      project: this.project?.root === projectRoot ? this.project : undefined,
    });
  }

  async runInitializer(
    args: string[],
    parentDirectory: string,
    title: string,
  ): Promise<number | null> {
    const initializerPath = resolveInitializerPath(this.context);
    if (!initializerPath) {
      await this.showFeedback(
        'error',
        'Initializer is unavailable',
        'The bundled Nova Expo initializer could not be found. Reinstall the extension.',
      );
      return null;
    }
    const nodePath =
      vscode.workspace.getConfiguration('novaExpo').get<string>('nodePath', 'node').trim() ||
      'node';
    return this.runProcess(
      nodePath,
      [initializerPath, ...args],
      parentDirectory,
      title,
      {
        script: 'nova-expo-initializer',
        args,
        output: '',
      },
      false,
    );
  }

  async runExecutable(
    command: string,
    args: string[],
    cwd: string,
    title: string,
    scriptId: string,
  ): Promise<number | null> {
    // Package managers ship as `.cmd` shims on Windows, which Node refuses to
    // spawn directly; the command and its arguments are extension-controlled.
    const shell = process.platform === 'win32';
    return this.runProcess(
      command,
      args,
      cwd,
      title,
      {
        script: scriptId,
        args,
        output: '',
        project: this.project?.root === cwd ? this.project : undefined,
      },
      true,
      shell,
    );
  }

  dispose(): void {
    this.bridge.dispose();
    this.runner.dispose();
    for (const listener of this.terminalListeners) listener.dispose();
    this.terminalListeners.clear();
    this.clearViewDisposables();
  }

  private postState(loading: boolean): void {
    void this.view?.webview.postMessage({
      type: 'state',
      project: this.project ?? null,
      projects: this.projects,
      loading,
      hasWorkspace: Boolean(vscode.workspace.workspaceFolders?.length),
      isTrusted: vscode.workspace.isTrusted,
      task: this.runner.snapshot ?? null,
      nextStep: this.project ? (setupRecommendation(this.project) ?? null) : null,
    });
  }

  private async reveal(): Promise<void> {
    if (!this.view) await vscode.commands.executeCommand('novaExpo.dashboard.focus');
    this.view?.show(true);
  }

  private async runProcess(
    command: string,
    args: string[],
    cwd: string,
    title: string,
    failureContext: FailureContext,
    reportFailure = true,
    shell = false,
  ): Promise<number | null> {
    if (!vscode.workspace.isTrusted) {
      await this.showFeedback(
        'error',
        'Workspace is not trusted',
        'Trust this workspace before creating or modifying projects.',
        { label: 'Manage workspace trust', command: 'novaExpo.workspace.trust' },
      );
      this.dismissPrompt();
      return null;
    }
    await this.reveal();
    if (this.runner.isBusy) {
      await this.showFeedback(
        'warning',
        'A task is already running',
        'Stop the active task before starting another one.',
        { label: 'View task', command: 'novaExpo.task.show' },
      );
      this.dismissPrompt();
      return null;
    }
    const code = await this.runner.run(command, args, { cwd, title, shell });
    if (reportFailure && code !== 0 && this.runner.snapshot?.status === 'error') {
      await this.presentFailure(title, {
        ...failureContext,
        output: this.runner.snapshot.output,
      });
    }
    return code;
  }

  private async presentFailure(title: string, context: FailureContext): Promise<void> {
    const recoveries = classifyFailure(context);
    this.runner.attachRecoveries(recoveries);
    // VS Code collapses a notification's surplus buttons into an overflow menu,
    // which hid the very corrections this notification exists to offer. Only
    // the first one is promoted here; the task screen shows all of them, and
    // "View Output" is the way through to it.
    const promoted = recoveries.slice(0, 1).map((recovery) => recovery.label);
    const message = recoveries[0]
      ? `${title} failed. Suggested next step: ${recoveries[0].description}`
      : `${title} failed. Review the retained output for the cause.`;
    const choice = await vscode.window.showErrorMessage(message, 'View Output', ...promoted);
    if (choice === 'View Output') {
      await this.showTask();
      return;
    }
    const recovery = recoveries.find((item) => item.label === choice);
    if (recovery) await this.executeRecovery(recovery);
  }

  private async executeRecovery(recovery: RecoveryAction): Promise<void> {
    await vscode.commands.executeCommand(recovery.command, ...(recovery.args ?? []));
  }

  private clearViewDisposables(): void {
    while (this.viewDisposables.length > 0) this.viewDisposables.pop()?.dispose();
  }
}
