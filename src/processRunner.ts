import { ChildProcess, spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { StringDecoder } from 'node:string_decoder';
import {
  CompletionAction,
  ExtensionMessage,
  RecoveryAction,
  RunSnapshot,
  WebviewMessage,
} from './webviewProtocol';

const ANSI_PATTERN = /\x1b\[[0-9;?]*[a-zA-Z]|\x1b\].*?(?:\x07|\x1b\\)/g;
/** A trailing escape sequence that a chunk boundary may have cut in half. */
const PARTIAL_ANSI_PATTERN = /\x1b(?:\[[0-9;?]*|\][^\x07\x1b]*)?$/;
const MAX_OUTPUT_CHARACTERS = 300_000;
const TRUNCATION_SLACK = 50_000;
const MAX_PENDING_CHARACTERS = 256;
const TRUNCATION_NOTICE = '[Earlier output was truncated]\n';

function stripAnsi(text: string): string {
  return text.replace(ANSI_PATTERN, '');
}

/**
 * Decodes one stream into text that is safe to strip and forward: multi-byte
 * characters and escape sequences split across chunk boundaries are held back
 * until the rest of the sequence arrives instead of leaking control codes into
 * the dashboard.
 */
class OutputDecoder {
  private readonly decoder = new StringDecoder('utf8');
  private pending = '';

  push(data: Buffer): string {
    const text = this.pending + this.decoder.write(data);
    const partial = PARTIAL_ANSI_PATTERN.exec(text);
    // An operating-system-command sequence that never sends its terminator must
    // not hold the rest of the log back, so an over-long remainder is released.
    const boundary =
      partial && text.length - partial.index <= MAX_PENDING_CHARACTERS
        ? partial.index
        : text.length;
    this.pending = text.slice(boundary);
    return stripAnsi(text.slice(0, boundary));
  }

  flush(): string {
    const text = this.pending + this.decoder.end();
    this.pending = '';
    return stripAnsi(text);
  }
}

interface ActiveRun {
  child: ChildProcess;
  snapshot: RunSnapshot;
  cancelled: boolean;
  forceTimer?: NodeJS.Timeout;
}

export interface RunOptions {
  cwd: string;
  title: string;
  environment?: NodeJS.ProcessEnv;
  /**
   * Runs the command through the platform shell. Required on Windows for
   * package managers, which ship as `.cmd` shims that Node refuses to spawn
   * directly. Only ever set for a fixed command with fixed arguments.
   */
  shell?: boolean;
}

/** Runs one dashboard task at a time and retains enough state to restore its UI. */
export class ProcessRunner {
  private readonly active = new Map<string, ActiveRun>();
  private latest: RunSnapshot | undefined;

  constructor(
    private readonly post: (message: ExtensionMessage) => void,
    private readonly onStateChange: (snapshot: RunSnapshot | undefined) => void = () => {},
  ) {}

  get isBusy(): boolean {
    return this.active.size > 0;
  }

  get snapshot(): RunSnapshot | undefined {
    return this.latest
      ? {
          ...this.latest,
          recoveries: this.latest.recoveries?.map((recovery) => ({
            ...recovery,
            args: recovery.args ? [...recovery.args] : undefined,
          })),
          completion: this.latest.completion
            ? {
                ...this.latest.completion,
                args: this.latest.completion.args ? [...this.latest.completion.args] : undefined,
              }
            : undefined,
        }
      : undefined;
  }

  attachCompletion(completion: CompletionAction): void {
    if (!this.latest || this.latest.status !== 'success') return;
    this.latest.completion = {
      ...completion,
      args: completion.args ? [...completion.args] : undefined,
    };
    this.post({ type: 'runCompletion', id: this.latest.id, completion: this.latest.completion });
    this.onStateChange(this.snapshot);
  }

  attachRecoveries(recoveries: RecoveryAction[]): void {
    if (!this.latest || this.latest.status !== 'error') return;
    this.latest.recoveries = recoveries.map((recovery) => ({
      ...recovery,
      args: recovery.args ? [...recovery.args] : undefined,
    }));
    this.post({ type: 'runRecovery', id: this.latest.id, recoveries: this.latest.recoveries });
    this.onStateChange(this.snapshot);
  }

  recordExternalFailure(title: string, output: string, code: number | null): void {
    if (this.isBusy) return;
    const id = randomUUID();
    const startedAt = Date.now();
    const snapshot: RunSnapshot = {
      id,
      title,
      status: 'error',
      output,
      code,
      startedAt,
      finishedAt: startedAt,
    };
    this.latest = snapshot;
    this.post({ type: 'runStart', id, title, startedAt });
    if (output) this.post({ type: 'runOutput', id, chunk: output });
    this.post({ type: 'runEnd', id, code, cancelled: false, finishedAt: startedAt });
    this.onStateChange(this.snapshot);
  }

  handleMessage(message: WebviewMessage): boolean {
    if (message.type === 'runCancel') {
      this.cancel(message.id);
      return true;
    }
    return false;
  }

  cancelActive(): boolean {
    const id = this.active.keys().next().value as string | undefined;
    if (!id) return false;
    this.cancel(id);
    return true;
  }

  clearLatest(): void {
    if (this.isBusy) return;
    this.latest = undefined;
    this.onStateChange(undefined);
  }

  run(command: string, args: string[], options: RunOptions): Promise<number | null> {
    // One managed task at a time, stated where it is relied on rather than only
    // where it is checked. `cancelActive` stops the first entry and `snapshot`
    // reports the latest, so a second concurrent run would leave a process the
    // user can neither see nor stop. Callers check `isBusy` first — soundly,
    // since nothing awaits between their check and the spawn below — and this
    // keeps that true for a caller that forgets.
    if (this.isBusy) return Promise.resolve(null);
    const id = randomUUID();
    const startedAt = Date.now();
    const snapshot: RunSnapshot = {
      id,
      title: options.title,
      status: 'running',
      output: '',
      startedAt,
    };
    this.latest = snapshot;
    this.post({
      type: 'runStart',
      id,
      title: options.title,
      startedAt,
    });
    this.onStateChange(this.snapshot);

    return new Promise((resolve) => {
      const environment: NodeJS.ProcessEnv = {
        ...process.env,
        CI: '1',
        EXPO_TOOLKIT_NON_INTERACTIVE: '1',
        NO_COLOR: '1',
        FORCE_COLOR: '0',
        ...options.environment,
      };
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: environment,
        detached: process.platform !== 'win32',
        shell: Boolean(options.shell),
        windowsHide: true,
      });
      const run: ActiveRun = { child, snapshot, cancelled: false };
      this.active.set(id, run);
      child.stdin?.end();

      const emit = (chunk: string) => {
        if (!chunk) return;
        snapshot.output += chunk;
        if (snapshot.output.length > MAX_OUTPUT_CHARACTERS + TRUNCATION_SLACK) {
          snapshot.output =
            TRUNCATION_NOTICE +
            snapshot.output.slice(-(MAX_OUTPUT_CHARACTERS - TRUNCATION_NOTICE.length));
        }
        this.post({ type: 'runOutput', id, chunk });
      };
      const stdoutDecoder = new OutputDecoder();
      const stderrDecoder = new OutputDecoder();
      child.stdout?.on('data', (data: Buffer) => emit(stdoutDecoder.push(data)));
      child.stderr?.on('data', (data: Buffer) => emit(stderrDecoder.push(data)));

      let settled = false;
      const finish = (code: number | null) => {
        if (settled) return;
        settled = true;
        emit(stdoutDecoder.flush());
        emit(stderrDecoder.flush());
        if (run.forceTimer) clearTimeout(run.forceTimer);
        this.active.delete(id);
        snapshot.code = code;
        snapshot.finishedAt = Date.now();
        snapshot.status = run.cancelled ? 'cancelled' : code === 0 ? 'success' : 'error';
        this.post({
          type: 'runEnd',
          id,
          code,
          cancelled: run.cancelled,
          finishedAt: snapshot.finishedAt,
        });
        this.onStateChange(this.snapshot);
        resolve(code);
      };

      child.on('error', (error) => {
        emit(`\nerror: ${error.message}\n`);
        finish(null);
      });
      child.on('close', finish);
    });
  }

  dispose(): void {
    for (const id of [...this.active.keys()]) this.cancel(id, true);
  }

  private cancel(id: string, immediate = false): void {
    const run = this.active.get(id);
    if (!run || run.cancelled) return;
    run.cancelled = true;
    run.snapshot.status = 'stopping';
    this.post({ type: 'runStopping', id });
    this.onStateChange(this.snapshot);
    this.kill(run.child, immediate ? 'SIGKILL' : 'SIGTERM');
    if (!immediate) run.forceTimer = setTimeout(() => this.kill(run.child, 'SIGKILL'), 3_000);
  }

  private kill(child: ChildProcess, signal: NodeJS.Signals): void {
    if (!child.pid) return;
    // Windows has no process groups and no signals: a bare kill() leaves the
    // Metro or EAS descendants of the shell running, so the tree is terminated
    // through taskkill instead. It is always forceful, which collapses the
    // graceful-then-forced escalation used on Unix.
    if (process.platform === 'win32') {
      try {
        spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true }).on(
          'error',
          () => {
            try {
              child.kill();
            } catch {
              // The child is already gone.
            }
          },
        );
        return;
      } catch {
        // taskkill could not be launched; fall through to the direct kill.
      }
    } else {
      try {
        process.kill(-child.pid, signal);
        return;
      } catch {
        // The process may have exited between the state check and the signal.
      }
    }
    try {
      child.kill(signal);
    } catch {
      // The child is already gone.
    }
  }
}
