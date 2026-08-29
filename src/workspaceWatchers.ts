import * as vscode from 'vscode';
import { DashboardViewProvider } from './dashboardViewProvider';

/** Manifests whose contents feed the project scan, so a change invalidates it. */
const PROJECT_MANIFEST_GLOB =
  '**/{package.json,app.json,app.config.js,app.config.ts,app.config.mjs,eas.json}';

/**
 * Bursts of manifest writes are common — an install rewrites package.json and
 * the lockfile repeatedly — so refreshes are coalesced into one trailing scan.
 */
const REFRESH_DEBOUNCE_MS = 250;

/**
 * Keeps the dashboard in step with the workspace: manifest edits, folder and
 * trust changes, and Nova's own settings all trigger a debounced rescan.
 *
 * Returns the disposables the caller must register; disposing them stops the
 * watchers and cancels any refresh still pending.
 */
export function registerWorkspaceWatchers(dashboard: DashboardViewProvider): vscode.Disposable[] {
  let refreshTimer: NodeJS.Timeout | undefined;
  const scheduleRefresh = () => {
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void dashboard.refresh(), REFRESH_DEBOUNCE_MS);
  };

  /**
   * Installs and builds rewrite the watched manifests many times. Rescanning
   * the workspace mid-task would repeatedly walk every package and resend the
   * retained task output, so file-driven refreshes wait for the task to end;
   * the dashboard already refreshes itself when a task finishes.
   */
  const scheduleProjectRescan = () => {
    if (dashboard.hasRunningTask) return;
    scheduleRefresh();
  };

  const watcher = vscode.workspace.createFileSystemWatcher(PROJECT_MANIFEST_GLOB);

  return [
    watcher,
    watcher.onDidChange(scheduleProjectRescan),
    watcher.onDidCreate(scheduleProjectRescan),
    watcher.onDidDelete(scheduleProjectRescan),
    vscode.workspace.onDidChangeWorkspaceFolders(scheduleRefresh),
    vscode.workspace.onDidGrantWorkspaceTrust(scheduleRefresh),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('novaExpo')) scheduleRefresh();
    }),
    new vscode.Disposable(() => {
      if (refreshTimer) clearTimeout(refreshTimer);
    }),
  ];
}
