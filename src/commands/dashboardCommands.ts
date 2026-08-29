import * as vscode from 'vscode';
import { isDocumentationUrl } from '../dashboardSecurity';
import { CommandContext } from './context';

/**
 * Commands that drive the dashboard shell itself — refreshing, the managed
 * task, and the handful of entries that only forward to a built-in VS Code
 * command so the webview never has to name one directly.
 */
export function registerDashboardCommands(context: CommandContext): vscode.Disposable[] {
  const { dashboard } = context;

  return [
    vscode.commands.registerCommand('novaExpo.refresh', () => dashboard.refresh()),
    vscode.commands.registerCommand('novaExpo.settings.open', () =>
      vscode.commands.executeCommand(
        'workbench.action.openSettings',
        '@ext:karodgers.nova-expo',
      ),
    ),
    vscode.commands.registerCommand('novaExpo.workspace.trust', () =>
      vscode.commands.executeCommand('workbench.trust.manage'),
    ),
    vscode.commands.registerCommand('novaExpo.scm.open', () =>
      vscode.commands.executeCommand('workbench.view.scm'),
    ),
    vscode.commands.registerCommand('novaExpo.task.show', () => dashboard.showTask()),
    vscode.commands.registerCommand('novaExpo.task.stop', async () => {
      if (!dashboard.stopTask()) {
        await dashboard.showFeedback(
          'info',
          'No active task',
          'There is no managed Nova Expo task to stop.',
        );
      }
    }),
    vscode.commands.registerCommand('novaExpo.task.clear', () => dashboard.clearTask()),

    // Opening a link is the only action here that leaves the editor, so the
    // destination is re-checked at the point of use: the catalog and the
    // recovery table are the only intended callers, but the command is
    // reachable from the webview like every other entry in the allowlist.
    vscode.commands.registerCommand('novaExpo.docs.open', async (url?: string) => {
      if (typeof url !== 'string' || !isDocumentationUrl(url)) {
        await dashboard.showFeedback(
          'error',
          'Documentation link is unavailable',
          'Nova Expo only opens links to the official Expo documentation, and this one was not recognized. Browse the documentation at docs.expo.dev instead.',
        );
        return;
      }
      await vscode.env.openExternal(vscode.Uri.parse(url));
    }),
  ];
}
