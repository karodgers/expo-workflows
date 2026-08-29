import type { ToolkitAction } from '../toolkitCatalog';
import { rememberScreen, render, runCommand, state } from './store';

/** A running task owns the screen: navigating away would orphan its output. */
function isTaskOnScreen(): boolean {
  const run = state.run;
  return run !== null && (run.status === 'running' || run.status === 'stopping');
}

export function goDashboard(): void {
  state.prompt = null;
  state.run = null;
  state.screen = 'dashboard';
  state.returnScreen = 'dashboard';
  state.selectedAction = null;
  rememberScreen();
  render();
}

export function goCatalog(): void {
  if (isTaskOnScreen()) return;
  state.prompt = null;
  state.run = null;
  state.screen = 'catalog';
  state.returnScreen = 'catalog';
  state.selectedAction = null;
  rememberScreen();
  render();
}

/** Returns from a finished task to whichever screen launched it. */
export function goRunBack(): void {
  if (state.returnScreen === 'catalog' && state.project) goCatalog();
  else goDashboard();
}

/**
 * Shows the review screen: what the action does, what it touches, and the Expo
 * documentation behind it. Every catalog action goes through here.
 */
export function openAction(action: ToolkitAction): void {
  state.returnScreen = state.screen === 'catalog' ? 'catalog' : 'dashboard';
  state.selectedAction = action;
  state.screen = 'action';
  rememberScreen();
  render();
}

/**
 * Runs an action the user has just reviewed on the action screen. The
 * `reviewed` marker tells the extension host not to ask for the same
 * confirmation a second time.
 */
export function runReviewedAction(action: ToolkitAction): void {
  // Return to wherever the action was opened from, which `openAction` recorded.
  // Hard-coding the catalog here used to be harmless because the dashboard's
  // own rows ran without a review screen; now that every action has one, it
  // would strand a user who started from the dashboard in the catalog.
  const origin = state.returnScreen === 'catalog' ? 'catalog' : 'dashboard';
  state.selectedAction = null;
  state.screen = origin;
  rememberScreen();
  render();
  runCommand('novaExpo.toolkitAction', action.id, 'reviewed');
}
