import * as vscode from 'vscode';
import {
  findToolkitAction,
  SUCCESS_NEXT_STEPS,
  TOOLKIT_ACTIONS,
  type ToolkitAction,
} from '../toolkitCatalog';
import type { CompletionAction } from '../webviewProtocol';
import { CommandContext } from './context';
import { prepareToolkitAction } from './toolkitArgs';

/**
 * The follow-up offered once an action succeeds.
 *
 * A workflow that ends with nothing but "completed successfully" leaves the
 * user to work out the next move themselves, which for a release sequence is
 * the entire question. Actions with a natural successor name it; the rest fall
 * back to their own documentation, so no success is a dead end.
 */
function completionFor(action: ToolkitAction): CompletionAction {
  const next = SUCCESS_NEXT_STEPS[action.id];
  if (next) return { ...next, docsUrl: action.docsUrl };
  return {
    label: 'Open Expo Docs',
    description: `${action.label} finished. Read the Expo documentation to decide what to do with the result.`,
    command: 'novaExpo.docs.open',
    args: [action.docsUrl],
    docsUrl: action.docsUrl,
  };
}

/**
 * The generic entry point into the workflow catalog. Every catalog action runs
 * through here, whether it was picked in the dashboard, chosen from the command
 * palette, or named by a recovery suggestion.
 */
export function registerWorkflowCommands(context: CommandContext): vscode.Disposable[] {
  const { dashboard, requireProjectRoot, ensureIdle, confirm } = context;

  return [
    vscode.commands.registerCommand('novaExpo.moreActions', () => dashboard.showActionCatalog()),

    vscode.commands.registerCommand(
      'novaExpo.toolkitAction',
      async (actionId?: string, reviewed?: string) => {
        const root = await requireProjectRoot();
        const project = dashboard.getCurrentProject();
        if (!root || !project || !(await ensureIdle())) return;
        let action = actionId ? findToolkitAction(actionId) : undefined;
        // Only an invocation with no id at all falls back to the palette; an
        // unknown id is an error rather than an invitation to pick something else.
        if (!action && !actionId) {
          const picked = await vscode.window.showQuickPick(
            TOOLKIT_ACTIONS.map((entry) => ({
              label: entry.label,
              description: entry.description,
              detail: entry.category,
              entry,
            })),
            { title: 'Nova Expo workflows', matchOnDescription: true, matchOnDetail: true },
          );
          action = picked?.entry;
        }
        if (!action) {
          await dashboard.showFeedback(
            'error',
            'Unknown workflow',
            'The requested Nova Expo workflow is not available.',
          );
          return;
        }
        const args = await prepareToolkitAction(context, action, project);
        if (!args) return;
        // The dashboard's action-detail screen is itself the confirmation, so a
        // workflow launched from there is not confirmed a second time.
        if (action.confirm && reviewed !== 'reviewed') {
          if (
            !(await confirm(
              action.label,
              action.explanation,
              action.confirmationLabel ?? 'Continue',
              action.effects,
            ))
          )
            return;
        }
        const code = await dashboard.run(action.script, args, root, action.label, {
          interactive: action.interactive,
        });
        // An interactive action resolves null the moment its terminal opens, so
        // there is no outcome to attach a follow-up to yet.
        if (code === 0) dashboard.attachTaskCompletion(completionFor(action));
      },
    ),
  ];
}
