const { spawnSync } = require('node:child_process');

/**
 * Executables that ship as `.cmd` shims on Windows. Node refuses to spawn one
 * directly — it has thrown EINVAL for `.cmd` and `.bat` since the shell-
 * injection fix in Node 18.20 and 20.12 — so on Windows these are launched
 * through the platform shell instead.
 */
const WINDOWS_SHELL_COMMANDS = new Set(['npm', 'npx', 'pnpm', 'yarn', 'bun']);

/**
 * Node does not quote arguments when `shell` is set: it joins them with spaces
 * and hands the line to `cmd.exe`. Every argument this initializer builds is a
 * bare token by construction, so the safe set is asserted rather than escaped —
 * a value that ever stops being one is a bug to fix at its source, not
 * something to smuggle past a shell. Nothing here may contain a quote, a
 * space, or a percent sign, which is what makes the quoting below total.
 */
const SHELL_SAFE_ARGUMENT = /^[A-Za-z0-9_.:@^=~+/\\-]+$/;

function assertShellSafe(command, argumentsList) {
  for (const argument of [command, ...argumentsList]) {
    if (!SHELL_SAFE_ARGUMENT.test(argument)) {
      throw new Error(
        `Refusing to run ${command} through the Windows shell: ${JSON.stringify(argument)} is not a bare argument.`,
      );
    }
  }
}

/**
 * Quotes an asserted-safe token for `cmd.exe`.
 *
 * Node passes the joined line as `cmd /d /s /c "<line>"` verbatim, and `/s`
 * makes cmd strip only the outermost pair — so inner quotes reach the program
 * intact. They are needed because `^` is cmd's escape character outside quotes:
 * an unquoted `expo-doctor@^1.20.3` would silently arrive as an exact version
 * rather than a caret range.
 */
function quoteForWindowsShell(value) {
  return `"${value}"`;
}

function commandDisplay(command, argumentsList) {
  return [command, ...argumentsList]
    .map((part) => (/^[a-zA-Z0-9_./@:=~-]+$/.test(part) ? part : JSON.stringify(part)))
    .join(' ');
}

function runCommand(command, argumentsList, options = {}) {
  const shell = process.platform === 'win32' && WINDOWS_SHELL_COMMANDS.has(command);
  if (shell) assertShellSafe(command, argumentsList);
  const spawnArguments = shell ? argumentsList.map(quoteForWindowsShell) : argumentsList;
  const result = spawnSync(command, spawnArguments, {
    cwd: options.cwd,
    encoding: options.capture ? 'utf8' : undefined,
    env: process.env,
    shell,
    stdio: options.capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
  });

  if (result.error) {
    throw new Error(`Could not run ${command}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    const details = options.capture ? (result.stderr || result.stdout || '').trim() : '';
    const suffix = details ? `\n${details}` : '';
    throw new Error(`Command failed: ${commandDisplay(command, argumentsList)}${suffix}`);
  }

  return options.capture ? result.stdout.trim() : '';
}

module.exports = { assertShellSafe, commandDisplay, quoteForWindowsShell, runCommand };
