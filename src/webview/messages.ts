import type { ExtensionMessage } from '../webviewProtocol';
import { goCatalog } from './navigation';
import { appendOutput } from './output';
import { type ActivePrompt, render, state, type TaskSnapshot } from './store';
import { hasOutputElement, scheduleOutputFlush, snapshotToRun } from './views/run';

type StateMessage = Extract<ExtensionMessage, { type: 'state' }>;
type PromptMessage = Extract<ExtensionMessage, { type: 'prompt' }>;

/**
 * Flattens a prompt message into the screen's view model. Only the `pick` and
 * `multiPick` kinds carry items, so the other two get an empty list rather than
 * forcing every reader to test for it.
 */
function toActivePrompt(message: PromptMessage): ActivePrompt {
  return {
    ...message,
    items: 'items' in message ? message.items : [],
    pending: false,
  };
}

/**
 * Applies a workspace-state message. The webview already holds the streamed
 * lines of a task it is showing, so those are reused rather than re-parsing the
 * retained output of that run.
 */
function applyState(message: StateMessage): void {
  state.project = message.project;
  state.projects = message.projects || [];
  state.loading = Boolean(message.loading);
  state.hasWorkspace = Boolean(message.hasWorkspace);
  state.isTrusted = message.isTrusted !== false;
  // The host sends a RunSnapshot; the webview holds the same task with a parsed
  // line buffer attached, so it is widened here at the boundary.
  const task: TaskSnapshot | null = message.task;
  if (task && state.run && state.run.id === task.id) task.lines = state.run.lines;
  state.task = task || null;
  state.nextStep = message.nextStep || null;
  // A task that is still running takes over the screen — this is what restores
  // the task view after the webview was hidden and rebuilt — but never over a
  // wizard step the user is in the middle of answering.
  if (
    state.task &&
    (state.task.status === 'running' || state.task.status === 'stopping') &&
    !state.run &&
    !state.prompt
  ) {
    state.run = snapshotToRun(state.task);
  } else if (
    !state.task &&
    state.run &&
    state.run.status !== 'running' &&
    state.run.status !== 'stopping'
  ) {
    state.run = null;
  }
  render();
}

/**
 * Applies one message from the extension host.
 *
 * Every `run*` message is matched against the id of the run on screen, so
 * output from a task the webview is no longer showing is discarded rather than
 * appended to the wrong buffer.
 */
function handleMessage(message: ExtensionMessage): void {
  switch (message.type) {
    case 'state':
      applyState(message);
      return;

    case 'showActionCatalog':
      goCatalog();
      return;

    case 'showTask':
      if (state.task) {
        state.run = snapshotToRun(state.task);
        state.prompt = null;
        render();
      }
      return;

    case 'feedback':
      state.feedback = {
        level: message.level,
        title: message.title,
        message: message.message,
        action: message.action,
      };
      render();
      return;

    case 'dismissPrompt':
      if (state.prompt) {
        state.prompt = null;
        render();
      }
      return;

    case 'prompt':
      state.prompt = toActivePrompt(message);
      state.run = null;
      state.feedback = null;
      render();
      return;

    case 'runStart': {
      // The card and the screen share one line buffer for the life of the run.
      const lines = [''];
      state.run = {
        id: message.id,
        title: message.title,
        status: 'running',
        lines: lines,
        pendingReset: false,
        startedAt: message.startedAt,
        recoveries: [],
        completion: null,
      };
      state.task = {
        id: message.id,
        title: message.title,
        status: 'running',
        lines: lines,
        startedAt: message.startedAt,
        recoveries: [],
        completion: null,
      };
      state.prompt = null;
      state.feedback = null;
      render();
      return;
    }

    case 'runOutput':
      // Output is appended and painted on the next frame; a full re-render here
      // would rebuild the whole screen for every chunk of a chatty build.
      if (state.run && state.run.id === message.id) {
        appendOutput(state.run, message.chunk);
        if (hasOutputElement()) scheduleOutputFlush();
      }
      return;

    case 'runStopping':
      if (state.run && state.run.id === message.id) {
        state.run.status = 'stopping';
        if (state.task && state.task.id === message.id) state.task.status = 'stopping';
        render();
      }
      return;

    case 'runEnd':
      if (state.run && state.run.id === message.id) {
        state.run.status = message.cancelled
          ? 'cancelled'
          : message.code === 0
            ? 'success'
            : 'error';
        state.run.code = message.code;
        if (state.task && state.task.id === message.id) {
          state.task.status = state.run.status;
          state.task.code = message.code;
          state.task.finishedAt = message.finishedAt;
          state.task.lines = state.run.lines;
        }
        render();
      }
      return;

    case 'runRecovery':
      if (state.run && state.run.id === message.id) state.run.recoveries = message.recoveries || [];
      if (state.task && state.task.id === message.id)
        state.task.recoveries = message.recoveries || [];
      render();
      return;

    case 'runCompletion':
      if (state.run && state.run.id === message.id) state.run.completion = message.completion;
      if (state.task && state.task.id === message.id) state.task.completion = message.completion;
      render();
      return;

    default:
      return;
  }
}

export function listenForExtensionMessages(): void {
  // The only sender is the extension host, but `message` events are not
  // origin-restricted, so the payload is narrowed from unknown rather than
  // asserted. Anything without a string `type` is dropped, and `handleMessage`
  // ignores any type it does not know.
  window.addEventListener('message', (event: MessageEvent<unknown>) => {
    const message = event.data;
    if (!message || typeof message !== 'object') return;
    if (typeof (message as { type?: unknown }).type !== 'string') return;
    handleMessage(message as ExtensionMessage);
  });
}
