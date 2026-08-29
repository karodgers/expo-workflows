import type { ExpoProjectInfo } from '../projectInfo';
import type { ToolkitAction } from '../toolkitCatalog';
import type {
  CompletionAction,
  FeedbackAction,
  PickItem,
  RecoveryAction,
  RunSnapshot,
  RunStatus,
} from '../webviewProtocol';
import type { OutputBuffer } from './output';

interface VsCodeApi {
  postMessage(message: unknown): void;
  getState(): Record<string, unknown> | undefined;
  setState(state: Record<string, unknown>): void;
}

declare function acquireVsCodeApi(): VsCodeApi;

export type Screen = 'dashboard' | 'catalog' | 'action';

export interface Feedback {
  level: 'info' | 'warning' | 'error';
  title: string;
  message: string;
  action?: FeedbackAction;
}

/**
 * A task as the webview holds it.
 *
 * The host sends the retained output as one `output` string. The webview parses
 * it into `lines` once and writes that array back onto the snapshot, so the
 * task card and the task screen share a single buffer for the life of the run —
 * which is why `lines` is present here but not in the protocol's RunSnapshot.
 */
export interface TaskSnapshot extends Omit<RunSnapshot, 'output' | 'completion'> {
  output?: string;
  lines?: string[];
  completion?: CompletionAction | null;
}

/**
 * The run the task screen streams into. It carries the line buffer that
 * `appendOutput` writes to, and unlike a snapshot it always has the recovery
 * and completion fields resolved, so the render code never tests for them.
 */
export interface ActiveRun extends OutputBuffer {
  id: string;
  title: string;
  status: RunStatus;
  code?: number | null;
  startedAt?: number;
  recoveries: RecoveryAction[];
  completion: CompletionAction | null;
}

/**
 * The wizard step currently on screen: one `prompt` protocol message, plus the
 * `pending` flag the webview sets once an answer is on its way to the host.
 *
 * The four prompt kinds are flattened into one shape rather than kept as a
 * union. The render code dispatches on `kind` and then reads only that kind's
 * fields, and a flat shape keeps that dispatch free of casts.
 */
export interface ActivePrompt {
  id: string;
  kind: 'pick' | 'multiPick' | 'input' | 'confirm';
  title: string;
  description?: string;
  items: PickItem[];
  /** An answer has been sent and the host has not yet replaced this step. */
  pending: boolean;
  /** `input` only. */
  placeholder?: string;
  value?: string;
  validationMessage?: string;
  password?: boolean;
  /** `confirm` only. */
  details?: string[];
  confirmLabel?: string;
  tone?: 'default' | 'warning';
}

export interface DashboardState {
  project: ExpoProjectInfo | null;
  projects: ExpoProjectInfo[];
  loading: boolean;
  hasWorkspace: boolean;
  isTrusted: boolean;
  screen: Screen;
  catalogQuery: string;
  catalogCategory: string;
  selectedAction: ToolkitAction | null;
  feedback: Feedback | null;
  task: TaskSnapshot | null;
  nextStep: RecoveryAction | null;
  returnScreen: Screen;
  prompt: ActivePrompt | null;
  run: ActiveRun | null;
}

export const vscode = acquireVsCodeApi();

/**
 * Only `screen` and `returnScreen` are persisted, and both are narrowed on the
 * way in and out: webview state survives a reload, so it is treated as input.
 */
const saved = vscode.getState() || {};

export const state: DashboardState = {
  project: null,
  projects: [],
  loading: true,
  hasWorkspace: false,
  isTrusted: true,
  screen: saved.screen === 'catalog' ? 'catalog' : 'dashboard',
  catalogQuery: '',
  catalogCategory: 'all',
  selectedAction: null,
  feedback: null,
  task: null,
  nextStep: null,
  returnScreen: saved.returnScreen === 'catalog' ? 'catalog' : 'dashboard',
  prompt: null,
  run: null,
};

/**
 * The renderer is registered by render.ts at start-up rather than imported
 * here, so view modules can request a re-render without importing the module
 * that imports them.
 */
let renderer: () => void = () => {};

export function setRenderer(fn: () => void): void {
  renderer = fn;
}

export function render(): void {
  renderer();
}

export function runCommand(command: string, ...args: string[]): void {
  vscode.postMessage({ type: 'command', command: command, args: args });
}

export function rememberScreen(): void {
  vscode.setState({
    screen: state.screen === 'catalog' ? 'catalog' : 'dashboard',
    returnScreen: state.returnScreen === 'catalog' ? 'catalog' : 'dashboard',
  });
}
