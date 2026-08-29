import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

/**
 * Reads `novaExpo.toolkitPath` from the user's own settings and nowhere else.
 *
 * This setting names the scripts the extension executes, so a repository must
 * never be able to point it at code it ships. `scope: machine` in package.json
 * already makes VS Code drop workspace and folder values, and `inspect` is read
 * here rather than `get` so that stays true even if the declared scope is later
 * widened by accident. On a remote connection the remote user settings are the
 * global value, so a remote profile keeps working.
 *
 * The value must be absolute. A relative path was previously resolved against
 * the workspace folder, which made a repository-relative layout the natural way
 * to write one — exactly the shape this guard exists to refuse.
 */
function readUserToolkitPath(resource?: vscode.Uri): string | undefined {
  const setting = vscode.workspace
    .getConfiguration('novaExpo', resource)
    .inspect<string>('toolkitPath');
  const value = setting?.globalValue ?? setting?.defaultValue;
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed.length > 0 && path.isAbsolute(trimmed) ? trimmed : undefined;
}

function resolveToolkitDir(context: vscode.ExtensionContext, resource?: vscode.Uri): string {
  return (
    readUserToolkitPath(resource) ?? path.join(context.extensionPath, 'resources', 'workflows')
  );
}

export function resolveScriptPath(
  context: vscode.ExtensionContext,
  script: string,
  resource?: vscode.Uri,
): string | undefined {
  if (path.basename(script) !== script || !/^[a-z0-9-]+\.sh$/.test(script)) return undefined;
  const toolkitDir = path.resolve(resolveToolkitDir(context, resource));
  const scriptPath = path.resolve(toolkitDir, script);
  if (path.dirname(scriptPath) !== toolkitDir) return undefined;
  try {
    return fs.statSync(scriptPath).isFile() ? scriptPath : undefined;
  } catch {
    return undefined;
  }
}

export function resolveInitializerPath(context: vscode.ExtensionContext): string | undefined {
  const initializerPath = path.join(
    context.extensionPath,
    'resources',
    'nova-expo',
    'bin',
    'nova-expo.js',
  );
  try {
    return fs.statSync(initializerPath).isFile() ? initializerPath : undefined;
  } catch {
    return undefined;
  }
}
