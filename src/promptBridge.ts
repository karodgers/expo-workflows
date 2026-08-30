import { randomUUID } from 'node:crypto';
import { ExtensionMessage, PickItem, PromptValue, WebviewMessage } from './webviewProtocol';

export interface InputOptions {
  description?: string;
  placeholder?: string;
  value?: string;
  validationMessage?: string;
  password?: boolean;
}

export interface ConfirmOptions {
  description: string;
  details?: string[];
  confirmLabel: string;
  tone?: 'default' | 'warning';
}

interface PendingPrompt {
  id: string;
  message: ExtensionMessage;
  resolve: (value: PromptValue) => void;
}

/**
 * Renders pick/input prompts as screens inside the webview instead of native
 * QuickPick/InputBox overlays, so a wizard (e.g. choose profile, then
 * platform) never leaves the sidebar. Each call posts a prompt message and
 * waits for the matching promptResponse.
 *
 * The bridge outlives any single webview: a view that is disposed while a
 * wizard is open (the sidebar is collapsed, or the view is moved) keeps its
 * pending question, and `replay` re-posts it to the next view instead of
 * silently cancelling the operation the user started.
 *
 * At most one question is outstanding, mirroring the webview, which only ever
 * shows one. A second flow started before the first is answered supersedes it
 * rather than queueing behind it — see `ask`.
 */
export class PromptBridge {
  private pending: PendingPrompt | undefined;

  get hasPendingPrompt(): boolean {
    return this.pending !== undefined;
  }

  constructor(private readonly post: (message: ExtensionMessage) => void) {}

  handleMessage(message: WebviewMessage): boolean {
    if (message.type !== 'promptResponse') return false;
    const prompt = this.pending;
    // An answer whose id does not match is a reply to a superseded question,
    // and is dropped rather than applied to the one now on screen.
    if (prompt && prompt.id === message.id) {
      this.pending = undefined;
      prompt.resolve(message.value);
    }
    return true;
  }

  replay(): void {
    if (this.pending) this.post(this.pending.message);
  }

  /**
   * Posts a question and waits for its answer.
   *
   * Any question still outstanding is cancelled first. Steps within one wizard
   * are sequential, so this only ever fires when a second flow is started
   * before the first was answered — a user who opens Build, ignores it, and
   * runs Doctor instead. Resolving the abandoned question as cancelled unwinds
   * that flow the same way pressing Escape would, which matters twice over:
   * the suspended command would otherwise never complete, and `replay` would
   * later push its forgotten question at the user, who could answer it and
   * unknowingly start the release they had walked away from.
   */
  private ask(message: ExtensionMessage & { id: string }): Promise<PromptValue> {
    this.cancelPending();
    this.post(message);
    return new Promise((resolve) => {
      this.pending = { id: message.id, message, resolve };
    });
  }

  async pick(title: string, items: PickItem[]): Promise<string | undefined> {
    const value = await this.ask({ type: 'prompt', id: randomUUID(), kind: 'pick', title, items });
    return typeof value === 'string' ? value : undefined;
  }

  async multiPick(
    title: string,
    items: PickItem[],
    description?: string,
  ): Promise<string[] | undefined> {
    const value = await this.ask({
      type: 'prompt',
      id: randomUUID(),
      kind: 'multiPick',
      title,
      description,
      items,
    });
    return Array.isArray(value) ? value : undefined;
  }

  async input(title: string, options: InputOptions = {}): Promise<string | undefined> {
    const value = await this.ask({
      type: 'prompt',
      id: randomUUID(),
      kind: 'input',
      title,
      ...options,
    });
    return typeof value === 'string' ? value : undefined;
  }

  async confirm(title: string, options: ConfirmOptions): Promise<boolean> {
    const value = await this.ask({
      type: 'prompt',
      id: randomUUID(),
      kind: 'confirm',
      title,
      ...options,
    });
    return value === 'confirm';
  }

  dispose(): void {
    this.cancelPending();
  }

  /** Resolves the outstanding question as cancelled. Safe to call when idle. */
  private cancelPending(): void {
    const prompt = this.pending;
    if (!prompt) return;
    this.pending = undefined;
    prompt.resolve(undefined);
  }
}
