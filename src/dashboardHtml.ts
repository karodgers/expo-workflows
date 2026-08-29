import { randomBytes } from 'node:crypto';
import type * as vscode from 'vscode';
import { DASHBOARD_STYLES } from './dashboardStyles';

function nonce(): string {
  return randomBytes(24).toString('base64url');
}

/**
 * Builds the dashboard document shell. The webview receives no markup from the
 * extension host beyond this shell: everything inside `#root` is rendered by
 * the webview bundle from the typed messages in webviewProtocol, so the CSP
 * below can forbid every source except the nonced inline style and script.
 */
export function renderDashboard(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  const basePath = extensionUri.path.endsWith('/')
    ? extensionUri.path.slice(0, -1)
    : extensionUri.path;
  const codiconUri = webview.asWebviewUri(
    extensionUri.with({ path: `${basePath}/resources/codicons/codicon.css` }),
  );
  const scriptUri = webview.asWebviewUri(
    extensionUri.with({ path: `${basePath}/dist/webview.js` }),
  );
  const nonceValue = nonce();
  const csp = [
    `default-src 'none'`,
    `style-src ${webview.cspSource} 'nonce-${nonceValue}'`,
    `font-src ${webview.cspSource}`,
    `script-src 'nonce-${nonceValue}'`,
  ].join('; ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="Content-Security-Policy" content="${csp}">
<link href="${codiconUri}" rel="stylesheet">
<style nonce="${nonceValue}">${DASHBOARD_STYLES}</style>
</head>
<body>
<header class="masthead">
  <div class="masthead-mark" aria-hidden="true"><span class="codicon codicon-rocket"></span></div>
  <div class="masthead-copy">
    <div class="masthead-title">Nova Expo</div>
    <div class="masthead-subtitle">Project operations, from dev to store</div>
  </div>
  <button class="icon-button" id="create-project" title="Create a Nova Expo project" aria-label="Create a Nova Expo project"><span class="codicon codicon-add"></span></button>
</header>
<div id="loading" hidden></div>
<main id="root"></main>
<script nonce="${nonceValue}" src="${scriptUri}"></script>
</body>
</html>`;
}
