import * as path from 'node:path';
import * as vscode from 'vscode';
import { ExpoProjectInfo, readExpoProjectInfo } from './projectInfo';

/**
 * Directories that either hold dependencies rather than source, or are
 * generated output. Scanning them would surface packages the user did not
 * write as selectable projects.
 */
const IGNORED_DIRECTORIES = '**/{node_modules,.git,.expo,android,ios,dist,build,coverage}/**';

/**
 * A monorepo can hold many packages, but a workspace with hundreds of them is
 * past the point where a dashboard picker helps; the cap keeps a mistakenly
 * opened home directory from turning into an unbounded scan.
 */
const MAX_PACKAGE_FILES = 200;

/**
 * Finds every Expo app in the workspace by reading each package manifest.
 *
 * `readExpoProjectInfo` returns undefined for a package that does not declare
 * Expo, so a monorepo's libraries and tooling packages drop out here and only
 * runnable apps are offered. Results are sorted by name, then path, so the
 * ordering is stable across scans and the default selection does not move.
 */
export async function discoverExpoProjects(): Promise<ExpoProjectInfo[]> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders?.length) return [];

  const packageFiles = await vscode.workspace.findFiles(
    '**/package.json',
    IGNORED_DIRECTORIES,
    MAX_PACKAGE_FILES,
  );
  const projects: ExpoProjectInfo[] = [];
  for (const packageFile of packageFiles) {
    const folder = vscode.workspace.getWorkspaceFolder(packageFile);
    if (!folder) continue;
    const root = path.dirname(packageFile.fsPath);
    const project = readExpoProjectInfo(root, folder.uri.fsPath);
    if (project) projects.push(project);
  }
  return projects.sort((left, right) =>
    `${left.name}\0${left.relativePath}`.localeCompare(`${right.name}\0${right.relativePath}`),
  );
}
