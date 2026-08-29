import { el, icon } from '../dom';
import { render, runCommand, state } from '../store';

/**
 * An untrusted workspace is a read-only dashboard, so the reason is stated
 * where the user is about to find buttons that will not run anything.
 */
export function renderTrustNotice(): HTMLElement | null {
  if (state.isTrusted || !state.hasWorkspace) return null;
  return el('div', { class: 'notice warning', role: 'status' }, [
    icon('shield'),
    el('div', { class: 'notice-copy' }, [
      el('div', { class: 'feedback-title' }, ['Workspace is not trusted']),
      el('div', {}, [
        'Nova Expo is reading this project configuration only. Running any Expo, EAS, or package-manager command needs a trusted workspace, because those commands execute code from the project. ',
      ]),
      el(
        'button',
        {
          class: 'link-button feedback-action',
          onclick: () => runCommand('novaExpo.workspace.trust'),
        },
        ['Manage workspace trust'],
      ),
    ]),
  ]);
}

/** The dismissible banner the extension host posts results and refusals into. */
export function renderFeedback(): HTMLElement | null {
  if (!state.feedback) return null;
  const feedback = state.feedback;
  const feedbackAction = feedback.action;
  const feedbackIcon =
    feedback.level === 'error' ? 'error' : feedback.level === 'warning' ? 'warning' : 'info';
  return el(
    'div',
    { class: 'notice ' + feedback.level, role: feedback.level === 'error' ? 'alert' : 'status' },
    [
      icon(feedbackIcon),
      el('div', { class: 'notice-copy' }, [
        el('div', { class: 'feedback-title' }, [feedback.title]),
        el('div', {}, [feedback.message]),
        feedbackAction
          ? el(
              'button',
              {
                class: 'link-button feedback-action',
                onclick: () => runCommand(feedbackAction.command, ...(feedbackAction.args || [])),
              },
              [feedbackAction.label],
            )
          : null,
      ]),
      el(
        'button',
        {
          class: 'icon-button',
          title: 'Dismiss',
          'aria-label': 'Dismiss message',
          onclick: () => {
            state.feedback = null;
            render();
          },
        },
        [icon('close')],
      ),
    ],
  );
}
