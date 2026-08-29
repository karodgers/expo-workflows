import { ExpoProjectInfo } from './projectInfo';

export interface PickItem {
  label: string;
  description?: string;
  detail?: string;
  value: string;
  picked?: boolean;
}

export type PromptValue = string | string[] | undefined;

export type RunStatus = 'running' | 'stopping' | 'success' | 'error' | 'cancelled';

export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  command: string;
  args?: string[];
  /** Expo documentation for the concept behind this correction. */
  docsUrl?: string;
}

export interface CompletionAction {
  label: string;
  description: string;
  command: string;
  args?: string[];
  /** Expo documentation for whatever comes next. */
  docsUrl?: string;
}

export interface RunSnapshot {
  id: string;
  title: string;
  status: RunStatus;
  output: string;
  code?: number | null;
  startedAt: number;
  finishedAt?: number;
  recoveries?: RecoveryAction[];
  completion?: CompletionAction;
}

export interface FeedbackAction {
  label: string;
  command: string;
  args?: string[];
}

export type ExtensionMessage =
  | {
      type: 'state';
      project: ExpoProjectInfo | null;
      projects: ExpoProjectInfo[];
      loading: boolean;
      hasWorkspace: boolean;
      isTrusted: boolean;
      task: RunSnapshot | null;
      nextStep: RecoveryAction | null;
    }
  | { type: 'showActionCatalog' }
  | { type: 'dismissPrompt' }
  | {
      type: 'feedback';
      level: 'info' | 'warning' | 'error';
      title: string;
      message: string;
      action?: FeedbackAction;
    }
  | { type: 'prompt'; id: string; kind: 'pick'; title: string; items: PickItem[] }
  | {
      type: 'prompt';
      id: string;
      kind: 'multiPick';
      title: string;
      description?: string;
      items: PickItem[];
    }
  | {
      type: 'prompt';
      id: string;
      kind: 'input';
      title: string;
      description?: string;
      placeholder?: string;
      value?: string;
      validationMessage?: string;
      password?: boolean;
    }
  | {
      type: 'prompt';
      id: string;
      kind: 'confirm';
      title: string;
      description: string;
      details?: string[];
      confirmLabel: string;
      tone?: 'default' | 'warning';
    }
  | { type: 'runStart'; id: string; title: string; startedAt: number }
  | { type: 'runOutput'; id: string; chunk: string }
  | { type: 'runStopping'; id: string }
  | { type: 'runEnd'; id: string; code: number | null; cancelled: boolean; finishedAt: number }
  | { type: 'runRecovery'; id: string; recoveries: RecoveryAction[] }
  | { type: 'runCompletion'; id: string; completion: CompletionAction }
  | { type: 'showTask' };

export type WebviewMessage =
  | { type: 'command'; command: string; args?: unknown[] }
  | { type: 'promptResponse'; id: string; value: PromptValue }
  | { type: 'runCancel'; id: string }
  /** Sent once after the webview script has installed its message listener. */
  | { type: 'ready' };

export function isWebviewMessage(value: unknown): value is WebviewMessage {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  if (typeof message.type !== 'string') return false;
  switch (message.type) {
    case 'command':
      return (
        typeof message.command === 'string' &&
        (message.args === undefined ||
          (Array.isArray(message.args) && message.args.every((arg) => typeof arg === 'string')))
      );
    case 'promptResponse':
      return (
        typeof message.id === 'string' &&
        (message.value === undefined ||
          typeof message.value === 'string' ||
          (Array.isArray(message.value) && message.value.every((item) => typeof item === 'string')))
      );
    case 'runCancel':
      return typeof message.id === 'string';
    case 'ready':
      return true;
    default:
      return false;
  }
}
