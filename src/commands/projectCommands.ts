import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { CommandContext } from './context';
import { runCreateProjectWizard } from './projectWizard';

/** Sentinels for switch-project entries that open a flow instead of selecting a project. */
const BROWSE_FOR_PROJECT = '__nova_open_another_project__';
const CREATE_NEW_PROJECT = '__nova_create_new_project__';

/**
 * Commands that choose, open, or create the project the dashboard acts on.
 *
 * The folder produced by the last create run is held in this closure rather
 * than in the provider: it is only ever a shortcut for the “Open Project”
 * follow-up, so it should not survive a reload or be mistaken for the active
 * project.
 */
export function registerProjectCommands(context: CommandContext): vscode.Disposable[] {
  const { dashboard, requireProjectRoot, openProjectDirectory } = context;
  let createdProjectRoot: string | undefined;

  return [
    vscode.commands.registerCommand('novaExpo.openFolder', () => openProjectDirectory()),

    vscode.commands.registerCommand('novaExpo.project.openCreated', async () => {
      if (!createdProjectRoot || !fs.existsSync(createdProjectRoot)) {
        await dashboard.showFeedback(
          'error',
          'Created project is unavailable',
          'The created folder could not be found. It may have been moved or removed.',
        );
        return;
      }
      await openProjectDirectory(createdProjectRoot);
    }),

    vscode.commands.registerCommand('novaExpo.project.create', async () => {
      const created = await runCreateProjectWizard(context);
      // A cancelled or unusable run leaves the previous created folder intact,
      // so its “Open Project” action keeps working.
      if (created) createdProjectRoot = created;
    }),

    vscode.commands.registerCommand('novaExpo.project.select', async () => {
      await dashboard.refresh();
      const projects = dashboard.getProjects();
      const currentRoot = dashboard.getCurrentProjectRoot();
      const selection = await dashboard.pick('Switch project', [
        ...projects.map((project) => ({
          label: project.root === currentRoot ? `${project.name} · Current` : project.name,
          description: project.relativePath,
          detail: project.slug ? `Expo slug: ${project.slug}` : undefined,
          value: project.root,
        })),
        {
          label: 'Open another project…',
          description: 'Choose a project folder from your computer',
          value: BROWSE_FOR_PROJECT,
        },
        {
          label: 'Create new…',
          description: 'Create a new Nova Expo project',
          value: CREATE_NEW_PROJECT,
        },
      ]);
      if (!selection) return;
      if (selection === BROWSE_FOR_PROJECT) {
        await openProjectDirectory();
      } else if (selection === CREATE_NEW_PROJECT) {
        await vscode.commands.executeCommand('novaExpo.project.create');
      } else {
        await dashboard.selectProject(selection);
      }
    }),

    vscode.commands.registerCommand('novaExpo.project.openConfig', async () => {
      const root = await requireProjectRoot();
      if (!root) return;
      const configFile = dashboard.getCurrentProject()?.configFile ?? 'package.json';
      const document = await vscode.workspace.openTextDocument(path.join(root, configFile));
      await vscode.window.showTextDocument(document);
    }),
  ];
}
