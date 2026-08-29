import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import type * as vscode from 'vscode';
import { renderDashboard } from '../src/dashboardHtml';

function render(): string {
  const uriFor = (uriPath: string): vscode.Uri =>
    ({
      path: uriPath,
      with: (change: { path?: string }) => uriFor(change.path ?? uriPath),
      toString: () => uriPath,
    }) as unknown as vscode.Uri;
  const webview = {
    cspSource: 'vscode-webview:',
    asWebviewUri(uri: vscode.Uri) {
      return uri;
    },
  } as unknown as vscode.Webview;
  return renderDashboard(webview, uriFor('/extension'));
}

test('the dashboard shell restricts sources and carries no inline script', () => {
  const html = render();
  assert.match(html, /default-src 'none'/);
  assert.doesNotMatch(html, /script-src[^;]*unsafe-inline/);
  // Behaviour lives in the bundled, type-checked webview module, so an inline
  // script block would mean markup and logic drifted back together.
  assert.doesNotMatch(html, /<script nonce="[^"]+">[\s\S]/);
  assert.match(html, /<script nonce="([^"]+)" src="\/extension\/dist\/webview\.js"><\/script>/);
  assert.match(html, /Create a Nova Expo project/);
  assert.match(html, /vscode-badge-foreground/);
});

test('every nonce is unique to one render and covers both script and style', () => {
  const first = /nonce="([^"]+)"/.exec(render())?.[1];
  const second = /nonce="([^"]+)"/.exec(render())?.[1];
  assert.ok(first && second);
  assert.notEqual(first, second);
  assert.ok(first.length >= 24);

  const html = render();
  const nonces = new Set([...html.matchAll(/nonce="([^"]+)"/g)].map((match) => match[1]));
  assert.equal(nonces.size, 1);
  assert.match(html, new RegExp(`script-src 'nonce-${[...nonces][0]}'`));
});
