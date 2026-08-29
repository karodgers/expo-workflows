import { ACTION_CATEGORIES, TOOLKIT_ACTIONS, type ToolkitAction } from '../../toolkitCatalog';
import { docsLink, el, icon } from '../dom';
import { goCatalog, goDashboard, runReviewedAction } from '../navigation';
import { render, state } from '../store';
import { renderActionRow } from './dashboard';

const CATEGORIES = ACTION_CATEGORIES;

/**
 * The review screen for an action that changes state or needs a terminal. It
 * spells out what the workflow can change before it runs, which is what lets
 * the extension host skip its own confirmation for a reviewed action.
 */
export function renderActionDetail(action: ToolkitAction): DocumentFragment {
  const category = CATEGORIES.find((item) => item.id === action.category);
  // `effects` is required on every action now, so the heading can state which
  // kind of list this is instead of the screen having to guess one.
  const changesState = Boolean(action.confirm);
  const effectsHeading = changesState ? 'What this can change' : 'What this does';
  const fragment = document.createDocumentFragment();
  fragment.appendChild(
    el('div', { class: 'screen-header' }, [
      el(
        'button',
        {
          class: 'icon-button',
          title: 'Back',
          'aria-label': 'Back to workflows',
          onclick: goCatalog,
        },
        [icon('arrow-left')],
      ),
      el('div', {}, [
        el('div', { class: 'screen-title' }, [action.label]),
        el('div', { class: 'screen-subtitle' }, [category ? category.label : 'Workflow']),
      ]),
    ]),
  );
  fragment.appendChild(
    el('div', { class: 'action-detail' }, [
      icon(action.icon),
      el('p', { class: 'detail-copy' }, [action.explanation]),
      el('div', { class: 'detail-badges' }, [
        action.interactive
          ? el('span', { class: 'status-pill' }, [icon('terminal'), 'Interactive terminal'])
          : el('span', { class: 'status-pill' }, [icon('output'), 'Dashboard output']),
        action.confirm
          ? el('span', { class: 'status-pill' }, [icon('warning'), 'Changes state'])
          : action.interactive
            ? el('span', { class: 'status-pill' }, [
                icon('question'),
                'CLI confirmation may follow',
              ])
            : el('span', { class: 'status-pill' }, [icon('eye'), 'Read only']),
      ]),
      el('div', {}, [
        el('div', { class: 'eyebrow' }, [effectsHeading]),
        el(
          'ul',
          { class: 'detail-list' },
          action.effects.map((effect) => el('li', {}, [effect])),
        ),
      ]),
      el('div', { class: 'detail-docs' }, [docsLink(action.docsUrl)]),
      el('div', { class: 'prompt-actions' }, [
        el('button', { class: 'secondary-button', onclick: goCatalog }, ['Cancel']),
        el('button', { class: 'primary-button', onclick: () => runReviewedAction(action) }, [
          icon(action.interactive ? 'terminal' : 'play'),
          action.confirmationLabel || (action.interactive ? 'Open Terminal' : 'Run Workflow'),
        ]),
      ]),
    ]),
  );
  return fragment;
}

/**
 * Builds the search box. The catalog re-renders on every keystroke, which
 * replaces the input node, so focus and caret position are restored on the
 * next frame.
 */
function buildSearchInput(): HTMLInputElement {
  const search = el(
    'input',
    {
      class: 'search-input',
      type: 'search',
      placeholder: 'Search workflows…',
      value: state.catalogQuery,
      'aria-label': 'Search workflows',
    },
    [],
  ) as HTMLInputElement;
  search.value = state.catalogQuery;
  search.addEventListener('input', () => {
    state.catalogQuery = search.value;
    render();
    setTimeout(() => {
      const next = document.querySelector<HTMLInputElement>('.search-input');
      if (next) {
        next.focus();
        next.setSelectionRange(state.catalogQuery.length, state.catalogQuery.length);
      }
    }, 0);
  });
  return search;
}

/** The full workflow catalog, grouped by category and filtered by chip and query. */
export function renderCatalog(): DocumentFragment {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(
    el('div', { class: 'screen-header' }, [
      el(
        'button',
        {
          class: 'icon-button',
          title: 'Back',
          'aria-label': 'Back to dashboard',
          onclick: goDashboard,
        },
        [icon('arrow-left')],
      ),
      el('div', {}, [
        el('div', { class: 'screen-title' }, ['All workflows']),
        el('div', { class: 'screen-subtitle' }, [TOOLKIT_ACTIONS.length + ' organized actions']),
      ]),
    ]),
  );

  fragment.appendChild(el('div', { class: 'search-wrap' }, [icon('search'), buildSearchInput()]));

  const chips = [{ id: 'all', label: 'All' }, ...CATEGORIES].map((category) =>
    el(
      'button',
      {
        class: 'category-chip' + (state.catalogCategory === category.id ? ' active' : ''),
        onclick: () => {
          state.catalogCategory = category.id;
          render();
        },
      },
      [category.label],
    ),
  );
  fragment.appendChild(
    el(
      'div',
      { class: 'category-chips', role: 'tablist', 'aria-label': 'Workflow categories' },
      chips,
    ),
  );

  const query = state.catalogQuery.trim().toLocaleLowerCase();
  let matchCount = 0;
  for (const category of CATEGORIES) {
    if (state.catalogCategory !== 'all' && state.catalogCategory !== category.id) continue;
    const actions = TOOLKIT_ACTIONS.filter((action) => {
      if (action.category !== category.id) return false;
      if (!query) return true;
      return (action.label + ' ' + action.description + ' ' + category.label)
        .toLocaleLowerCase()
        .includes(query);
    });
    if (actions.length === 0) continue;
    matchCount += actions.length;
    fragment.appendChild(
      el('div', { class: 'catalog-section' }, [
        el('h3', {}, [icon(category.icon), category.label]),
        el(
          'div',
          { class: 'profile-list' },
          actions.map((action) => renderActionRow(action)),
        ),
      ]),
    );
  }
  if (matchCount === 0)
    fragment.appendChild(
      el('div', { class: 'catalog-empty' }, ['No workflows match your search.']),
    );
  return fragment;
}
