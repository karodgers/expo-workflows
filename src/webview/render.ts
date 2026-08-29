import { setRenderer, state } from './store';
import { renderCatalog, renderActionDetail } from './views/catalog';
import { renderDashboardScreen, renderEmpty, renderTaskCard } from './views/dashboard';
import { renderFeedback, renderTrustNotice } from './views/notices';
import { renderPrompt } from './views/prompt';
import { renderRun, resetOutputElement, scrollOutputToEnd } from './views/run';

const root = document.getElementById('root') as HTMLElement;
const loading = document.getElementById('loading') as HTMLElement;

/** Heading of the screen being shown, in the order the screens define one. */
const SCREEN_HEADING = '.screen-title, .project-name, .empty-title';

/**
 * Identity of the screen currently painted, so focus moves when the user
 * arrives somewhere new and not merely when the same screen repaints.
 *
 * This distinction is the whole point: the catalog repaints on every keystroke
 * of its search box and restores focus there itself, and a streaming task
 * repaints as recovery actions arrive. Moving focus on those would take it off
 * whatever the user is using. `null` means nothing has been painted yet.
 */
let paintedScreen: string | null = null;

function screenKey(): string {
  if (state.run) return `run:${state.run.id}`;
  if (state.prompt) return `prompt:${state.prompt.id}`;
  if (state.screen === 'action' && state.selectedAction) return `action:${state.selectedAction.id}`;
  if (state.screen === 'catalog' && state.project) return 'catalog';
  return state.project ? 'dashboard' : 'empty';
}

/**
 * Moves focus to the new screen's heading.
 *
 * The dashboard replaces its whole contents on navigation, which leaves focus
 * on a button that no longer exists — a sighted user sees the new screen, but
 * focus falls back to the document and a screen reader announces nothing. This
 * is the standard single-page remedy: make the heading programmatically
 * focusable and focus it, so the new screen is announced and the next Tab
 * starts from the top of it.
 *
 * `tabindex="-1"` keeps the heading out of the tab order, and the stylesheet
 * only draws a focus ring on buttons and inputs, so nothing appears to change
 * for a user navigating with a mouse.
 */
function focusScreen(): void {
  // Only ever move focus that already lives here. The dashboard also repaints
  // in response to the workspace — a project appearing, trust being granted, a
  // task started from the command palette — and taking focus then would pull
  // the caret out of the editor the user is typing in.
  if (!document.hasFocus()) return;
  const heading = root.querySelector<HTMLElement>(SCREEN_HEADING);
  if (!heading) return;
  heading.setAttribute('tabindex', '-1');
  // A prompt that focuses its own text input does so on the next tick and
  // therefore wins, which is what should happen: the answer field is a better
  // landing place than the question.
  heading.focus({ preventScroll: true });
}

/**
 * Renders the whole dashboard from `state`.
 *
 * There is exactly one screen at a time and it is chosen in priority order: a
 * task in progress outranks a wizard step, which outranks whichever screen the
 * user last navigated to. The trust and feedback notices sit above all of them.
 *
 * The root is rebuilt on every call rather than diffed. The tree is small, and
 * the one thing that updates often — streaming task output — is written
 * straight to its node by the run view instead of going through here.
 */
function render(): void {
  const arriving = screenKey();
  // A first paint is not an arrival: focus belongs wherever the editor put it.
  const changedScreen = paintedScreen !== null && arriving !== paintedScreen;
  paintedScreen = arriving;

  resetOutputElement();
  root.innerHTML = '';
  loading.hidden = !state.loading;
  loading.className = state.loading ? 'loading-bar' : '';

  const trustNotice = renderTrustNotice();
  if (trustNotice) root.appendChild(trustNotice);
  const feedback = renderFeedback();
  if (feedback) root.appendChild(feedback);

  if (state.run) root.appendChild(renderRun(state.run));
  else if (state.prompt) root.appendChild(renderPrompt(state.prompt));
  else if (state.screen === 'action' && state.selectedAction)
    root.appendChild(renderActionDetail(state.selectedAction));
  else if (state.screen === 'catalog' && state.project) root.appendChild(renderCatalog());
  else {
    const taskCard = renderTaskCard();
    if (taskCard) root.appendChild(taskCard);
    root.appendChild(state.project ? renderDashboardScreen(state.project) : renderEmpty());
  }
  scrollOutputToEnd();
  if (changedScreen) focusScreen();
}

/** Registers `render` as the store's renderer so view modules can request a repaint. */
export function installRenderer(): void {
  setRenderer(render);
}

export { render };
