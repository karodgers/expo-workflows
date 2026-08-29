import * as vscode from 'vscode';
import { DashboardViewProvider } from '../dashboardViewProvider';
import { createCommandContext } from './context';
import { registerDashboardCommands } from './dashboardCommands';
import { registerDevelopmentCommands } from './developmentCommands';
import { registerProjectCommands } from './projectCommands';
import { registerReleaseCommands } from './releaseCommands';
import { registerWorkflowCommands } from './workflowCommands';

export { createCommandContext, type CommandContext } from './context';

/**
 * Registers every Nova Expo command against one shared command context.
 *
 * The groups are independent, so a command can move between them freely; what
 * they share is the context, which is the only place a guard such as “is a task
 * already running” or “is EAS configured” is written down.
 */
export function registerCommands(dashboard: DashboardViewProvider): vscode.Disposable[] {
  const context = createCommandContext(dashboard);
  return [
    ...registerDashboardCommands(context),
    ...registerProjectCommands(context),
    ...registerDevelopmentCommands(context),
    ...registerReleaseCommands(context),
    ...registerWorkflowCommands(context),
  ];
}
