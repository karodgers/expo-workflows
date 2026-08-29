/**
 * The dashboard webview entry point. It renders every screen from typed data
 * instead of markup strings, and it never receives HTML from the extension
 * host: the only things crossing the boundary are the protocol messages in
 * webviewProtocol.
 *
 * The modules split as follows:
 *   store       — shared state, the VS Code API handle, and the render hook
 *   navigation  — the screen transitions
 *   dom         — the element builder every view is written with
 *   views/*     — one module per screen
 *   render      — chooses the screen and paints it
 *   messages    — applies messages from the extension host
 */
import { setDocsOpener } from './dom';
import { listenForExtensionMessages } from './messages';
import { goCatalog, goDashboard } from './navigation';
import { installRenderer, render } from './render';
import { runCommand, state, vscode } from './store';
import { cancelPrompt } from './views/prompt';

/** Escape backs out one level: a wizard step, then a screen. */
function installEscapeHandler(): void {
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    if (state.prompt && !state.prompt.pending) cancelPrompt(state.prompt.id);
    else if (state.screen === 'action' && !state.run) goCatalog();
    else if (state.screen === 'catalog' && !state.run) goDashboard();
  });
}

function start(): void {
  installRenderer();
  setDocsOpener((url) => runCommand('novaExpo.docs.open', url));
  document
    .getElementById('create-project')
    ?.addEventListener('click', () => runCommand('novaExpo.project.create'));
  installEscapeHandler();
  listenForExtensionMessages();
  render();
  // The host replays the current state and any open wizard in response, which
  // is what repopulates a webview that was hidden and rebuilt.
  vscode.postMessage({ type: 'ready' });
}

start();
