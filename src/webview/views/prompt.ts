import type { PromptValue } from '../../webviewProtocol';
import { el, icon } from '../dom';
import { type ActivePrompt, render, state, vscode } from '../store';

/**
 * Answers the extension host's pending question. The prompt is marked pending
 * rather than cleared: the host decides what comes next, and a wizard step that
 * resolves slowly should not flash the previous screen in the meantime.
 */
export function respondPrompt(id: string, value: PromptValue): void {
  vscode.postMessage({ type: 'promptResponse', id: id, value: value });
  if (state.prompt && state.prompt.id === id) {
    state.prompt = Object.assign({}, state.prompt, { pending: true });
    render();
  }
}

/** An undefined value is how the host is told the user backed out of a step. */
export function cancelPrompt(id: string): void {
  vscode.postMessage({ type: 'promptResponse', id: id, value: undefined });
  state.prompt = null;
  render();
}

/** A single-choice list. */
function renderPickPrompt(fragment: DocumentFragment, prompt: ActivePrompt): void {
  fragment.appendChild(
    el(
      'div',
      { class: 'prompt-list' },
      prompt.items.map((item) =>
        el(
          'button',
          { class: 'prompt-item', onclick: () => respondPrompt(prompt.id, item.value) },
          [
            el('div', { class: 'prompt-label' }, [item.label]),
            item.description
              ? el('div', { class: 'prompt-description' }, [item.description])
              : null,
            item.detail ? el('div', { class: 'prompt-detail' }, [item.detail]) : null,
          ],
        ),
      ),
    ),
  );
}

/**
 * A checkbox list with a live count. The selection lives in a Set owned by this
 * render rather than in `state`, so a re-render of the surrounding screen
 * cannot half-apply it; the checkboxes are re-synced from the Set on change.
 */
function renderMultiPickPrompt(fragment: DocumentFragment, prompt: ActivePrompt): void {
  const selected = new Set(prompt.items.filter((item) => item.picked).map((item) => item.value));
  const controls: { checkbox: HTMLInputElement; value: string }[] = [];
  const count = el('span', { class: 'multi-count', role: 'status', 'aria-live': 'polite' }, []);
  const updateSelection = () => {
    count.textContent =
      selected.size + (selected.size === 1 ? ' package selected' : ' packages selected');
    for (const control of controls) control.checkbox.checked = selected.has(control.value);
  };
  const checkboxes = prompt.items.map((item) => {
    const checkbox = el(
      'input',
      { type: 'checkbox', value: item.value, checked: item.picked, 'aria-label': item.label },
      [],
    ) as HTMLInputElement;
    // `picked` is optional in the protocol; the DOM property is not.
    checkbox.checked = Boolean(item.picked);
    controls.push({ checkbox: checkbox, value: item.value });
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(item.value);
      else selected.delete(item.value);
      updateSelection();
    });
    return el('label', { class: 'prompt-item multi-item' }, [
      checkbox,
      el('span', {}, [
        el('span', { class: 'prompt-label' }, [item.label]),
        item.description ? el('span', { class: 'prompt-description' }, [item.description]) : null,
        item.detail ? el('span', { class: 'prompt-detail' }, [item.detail]) : null,
      ]),
    ]);
  });
  fragment.appendChild(
    el('div', { class: 'multi-toolbar' }, [
      count,
      el(
        'button',
        {
          class: 'link-button',
          onclick: () => {
            for (const item of prompt.items) selected.add(item.value);
            updateSelection();
          },
        },
        ['Select all'],
      ),
      el(
        'button',
        {
          class: 'link-button',
          onclick: () => {
            selected.clear();
            updateSelection();
          },
        },
        ['Deselect all'],
      ),
    ]),
  );
  fragment.appendChild(el('div', { class: 'multi-list' }, checkboxes));
  fragment.appendChild(
    el('div', { class: 'prompt-actions' }, [
      el('button', { class: 'secondary-button', onclick: () => cancelPrompt(prompt.id) }, [
        'Cancel',
      ]),
      el(
        'button',
        { class: 'primary-button', onclick: () => respondPrompt(prompt.id, [...selected]) },
        ['Continue'],
      ),
    ]),
  );
  updateSelection();
}

/** The confirmation card, including the bullet list of what the action can change. */
function renderConfirmPrompt(fragment: DocumentFragment, prompt: ActivePrompt): void {
  fragment.appendChild(
    el('div', { class: 'confirm-card ' + (prompt.tone || 'default') }, [
      el('p', { class: 'detail-copy' }, [prompt.description]),
      prompt.details && prompt.details.length
        ? el(
            'ul',
            { class: 'detail-list' },
            prompt.details.map((detail) => el('li', {}, [detail])),
          )
        : null,
      el('div', { class: 'prompt-actions' }, [
        el('button', { class: 'secondary-button', onclick: () => cancelPrompt(prompt.id) }, [
          'Cancel',
        ]),
        el(
          'button',
          { class: 'primary-button', onclick: () => respondPrompt(prompt.id, 'confirm') },
          [prompt.confirmLabel],
        ),
      ]),
    ]),
  );
}

/** A free-text answer, with the host's validation message above it when the last try failed. */
function renderInputPrompt(fragment: DocumentFragment, prompt: ActivePrompt): void {
  if (prompt.validationMessage)
    fragment.appendChild(
      el('div', { class: 'validation-message', role: 'alert' }, [prompt.validationMessage]),
    );
  const input = el(
    'input',
    {
      class: 'text-input',
      type: prompt.password ? 'password' : 'text',
      placeholder: prompt.placeholder || '',
      'aria-label': prompt.title,
    },
    [],
  ) as HTMLInputElement;
  input.value = prompt.value || '';
  const submit = () => respondPrompt(prompt.id, input.value);
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') submit();
  });
  fragment.appendChild(
    el('div', { class: 'input-row' }, [
      input,
      el('button', { class: 'primary-button', onclick: submit }, ['Continue']),
    ]),
  );
  setTimeout(() => {
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, 0);
}

/**
 * One step of an extension-host wizard, rendered in the dashboard rather than
 * in a quick-pick so a multi-step flow keeps its context on screen.
 */
export function renderPrompt(prompt: ActivePrompt): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(
    el('div', { class: 'screen-header' }, [
      el(
        'button',
        {
          class: 'icon-button',
          title: 'Cancel',
          'aria-label': 'Cancel',
          onclick: () => cancelPrompt(prompt.id),
        },
        [icon('arrow-left')],
      ),
      el('div', { class: 'screen-title' }, [prompt.title]),
    ]),
  );
  if (prompt.pending) {
    fragment.appendChild(
      el('div', { class: 'pending', role: 'status' }, [
        icon('loading', true),
        'Preparing the next step…',
      ]),
    );
    return fragment;
  }
  if (prompt.description)
    fragment.appendChild(el('div', { class: 'prompt-intro' }, [prompt.description]));
  if (prompt.kind === 'pick') renderPickPrompt(fragment, prompt);
  else if (prompt.kind === 'multiPick') renderMultiPickPrompt(fragment, prompt);
  else if (prompt.kind === 'confirm') renderConfirmPrompt(fragment, prompt);
  else renderInputPrompt(fragment, prompt);
  return fragment;
}
