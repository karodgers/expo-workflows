import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';

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
