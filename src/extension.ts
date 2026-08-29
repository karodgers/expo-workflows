import * as vscode from 'vscode';
import { registerCommands } from './commands';
import { DashboardViewProvider } from './dashboardViewProvider';
import { registerWorkspaceWatchers } from './workspaceWatchers';

const WELCOME_SHOWN_KEY = 'novaExpo.hasOpenedDashboard';

export function activate(context: vscode.ExtensionContext): void {
  const dashboard = new DashboardViewProvider(context);
  // The dashboard is not retained while hidden: the view provider restores the
  // active task, the open wizard, and the current screen when the view returns,
  // so keeping a full webview alive would only hold the memory.
  const provider = vscode.window.registerWebviewViewProvider('novaExpo.dashboard', dashboard);

  context.subscriptions.push(
    dashboard,
    provider,
    ...registerWorkspaceWatchers(dashboard),
    ...registerCommands(dashboard),
  );

  // Opening the view once on first install is what makes the extension
  // discoverable; every later session leaves the user's layout alone.
  if (!context.globalState.get<boolean>(WELCOME_SHOWN_KEY)) {
    void context.globalState.update(WELCOME_SHOWN_KEY, true);
    void vscode.commands.executeCommand('novaExpo.dashboard.focus');
  }
}

export function deactivate(): void {}
