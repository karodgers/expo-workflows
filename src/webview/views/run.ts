import type { CompletionAction, RecoveryAction } from '../../webviewProtocol';
import { docsLink, el, icon } from '../dom';
import { goRunBack } from '../navigation';
import { type ActiveRun, render, runCommand, state, type TaskSnapshot, vscode } from '../store';
import { appendOutput, createOutputBuffer } from '../output';

/** The <pre> of the task screen currently on screen, or null when no task is shown. */
let runOutputEl: HTMLElement | null = null;
let outputFlushHandle: number | null = null;

/**
 * Turns a task snapshot from the extension host into the mutable run the task
 * screen streams into. The snapshot and the run deliberately share one line
 * buffer, so streaming output never has to be re-serialized to keep the task
 * card and the task screen in sync.
 */
export function snapshotToRun(snapshot: TaskSnapshot): ActiveRun {
  const run: ActiveRun = {
    ...createOutputBuffer(),
    id: snapshot.id,
    title: snapshot.title,
    status: snapshot.status,
    lines: snapshot.lines || [''],
    code: snapshot.code,
    recoveries: snapshot.recoveries || [],
    completion: snapshot.completion || null,
  };
  if (!snapshot.lines && snapshot.output) appendOutput(run, snapshot.output);
  snapshot.lines = run.lines;
  return run;
}

export function scrollOutputToEnd(): void {
  if (!runOutputEl) return;
  runOutputEl.scrollTop = runOutputEl.scrollHeight;
}

function flushOutput(): void {
  outputFlushHandle = null;
  if (!runOutputEl || !state.run) return;
  runOutputEl.textContent = state.run.lines.join('\n');
  scrollOutputToEnd();
}

/**
 * A chatty build can emit output far faster than the display needs to change,
 * so writes are coalesced into one paint per frame.
 */
export function scheduleOutputFlush(): void {
  if (outputFlushHandle === null) outputFlushHandle = requestAnimationFrame(flushOutput);
}

/** Called by the renderer before it clears the root, so a queued flush cannot touch a detached node. */
export function resetOutputElement(): void {
  if (outputFlushHandle !== null) {
    cancelAnimationFrame(outputFlushHandle);
    outputFlushHandle = null;
  }
  runOutputEl = null;
}

export function hasOutputElement(): boolean {
  return runOutputEl !== null;
}

export function cancelRun(id: string): void {
  vscode.postMessage({ type: 'runCancel', id: id });
  if (state.run && state.run.id === id) {
    state.run.status = 'stopping';
    render();
  }
}

/** The header's leading control doubles as stop, spinner, and back, by status. */
function renderRunLeadingControl(run: ActiveRun): HTMLElement {
  if (run.status === 'running') {
    return el(
      'button',
      {
        class: 'icon-button',
        title: 'Stop task',
        'aria-label': 'Stop task',
        onclick: () => cancelRun(run.id),
      },
      [icon('debug-stop')],
    );
  }
  if (run.status === 'stopping') {
    return el('span', { class: 'icon-button', title: 'Stopping task' }, [icon('loading', true)]);
  }
  const backLabel = state.returnScreen === 'catalog' ? 'Back to workflows' : 'Back to dashboard';
  return el(
    'button',
    { class: 'icon-button', title: backLabel, 'aria-label': backLabel, onclick: goRunBack },
    [icon('arrow-left')],
  );
}

function renderRunSummary(run: ActiveRun): HTMLElement | null {
  if (run.status === 'error') {
    return el('div', { class: 'run-summary error', role: 'alert' }, [
      'The task failed',
      run.code == null
        ? ' before it could start. Review the output above for the cause, then pick a next step below.'
        : ' with exit code ' +
          run.code +
          '. The cause is usually in the last few output lines; the next steps below address the most likely ones.',
    ]);
  }
  if (run.status === 'cancelled')
    return el('div', { class: 'run-summary' }, [
      'The process and its child processes were stopped.',
    ]);
  if (run.status === 'success')
    return el('div', { class: 'run-summary' }, ['The task completed successfully.']);
  return null;
}

/** The corrections recovery.ts derived from the failure output. */
function renderRecoveries(run: ActiveRun): HTMLElement | null {
  if (run.status !== 'error' || !run.recoveries || !run.recoveries.length) return null;
  return el('div', { class: 'recovery-panel' }, [
    el('div', { class: 'recovery-heading' }, [icon('lightbulb'), 'Suggested next steps']),
    el(
      'div',
      { class: 'recovery-list' },
      run.recoveries.map((recovery: RecoveryAction) =>
        el(
          'button',
          {
            class: 'recovery-action',
            onclick: () => runCommand(recovery.command, ...(recovery.args || [])),
          },
          [
            icon('wrench'),
            el('span', {}, [
              el('span', { class: 'row-label' }, [recovery.label]),
              el('span', { class: 'recovery-description' }, [recovery.description]),
            ]),
          ],
        ),
      ),
    ),
    // The correction says what to do; the link says why it is the right one.
    el(
      'div',
      { class: 'recovery-docs' },
      run.recoveries
        .map((recovery: RecoveryAction) => docsLink(recovery.docsUrl, `Docs: ${recovery.label}`))
        .filter((link): link is HTMLElement => link !== null),
    ),
  ]);
}

/** The follow-up a succeeding task attached, such as opening a project it just created. */
function renderCompletion(run: ActiveRun): HTMLElement | null {
  // Captured before the click handler closes over it: `run.completion` is a
  // mutable field, and the handler runs long after this narrowing.
  const completion: CompletionAction | null = run.completion;
  if (run.status !== 'success' || !completion) return null;
  return el('div', { class: 'recovery-panel' }, [
    el('div', { class: 'recovery-heading' }, [icon('pass-filled'), 'Ready for the next step']),
    el('span', { class: 'recovery-description' }, [completion.description]),
    el(
      'button',
      {
        class: 'primary-button wide-button',
        onclick: () => runCommand(completion.command, ...(completion.args || [])),
      },
      [icon('arrow-right'), completion.label],
    ),
    docsLink(completion.docsUrl),
  ]);
}

/** The full-screen view of one managed task and its streaming output. */
export function renderRun(run: ActiveRun): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const statusIcon =
    run.status === 'running' || run.status === 'stopping'
      ? 'sync'
      : run.status === 'success'
        ? 'pass-filled'
        : run.status === 'cancelled'
          ? 'circle-slash'
          : 'error';
  const statusLabel =
    run.status === 'running'
      ? 'Running'
      : run.status === 'stopping'
        ? 'Stopping'
        : run.status === 'success'
          ? 'Completed'
          : run.status === 'cancelled'
            ? 'Stopped'
            : 'Failed';
  fragment.appendChild(
    el('div', { class: 'screen-header' }, [
      renderRunLeadingControl(run),
      el('div', { class: 'screen-title' }, [run.title]),
      el('span', { class: 'run-status ' + run.status, role: 'status' }, [
        icon(statusIcon, run.status === 'running' || run.status === 'stopping'),
        statusLabel,
      ]),
    ]),
  );

  const output = el('pre', { class: 'run-output', tabindex: '0', 'aria-label': 'Task output' }, []);
  output.textContent = run.lines.join('\n') || 'Starting…';
  runOutputEl = output;
  fragment.appendChild(output);

  const summary = renderRunSummary(run);
  if (summary) fragment.appendChild(summary);
  const recoveries = renderRecoveries(run);
  if (recoveries) fragment.appendChild(recoveries);
  const completion = renderCompletion(run);
  if (completion) fragment.appendChild(completion);

  if (run.status !== 'running' && run.status !== 'stopping') {
    fragment.appendChild(
      el('div', { class: 'prompt-actions' }, [
        el('button', { class: 'secondary-button', onclick: goRunBack }, [
          icon(state.returnScreen === 'catalog' ? 'list-selection' : 'home'),
          state.returnScreen === 'catalog' ? 'Workflows' : 'Dashboard',
        ]),
        el(
          'button',
          { class: 'secondary-button', onclick: () => runCommand('novaExpo.task.clear') },
          [icon('trash'), 'Clear'],
        ),
      ]),
    );
  }
  return fragment;
}
