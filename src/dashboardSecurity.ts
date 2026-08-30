/**
 * The two allowlists that sit between the webview and command execution.
 *
 * The dashboard webview is trusted to render, not to decide what runs: a
 * message arriving from it names a command and carries values a user typed, and
 * both are checked here before anything is spawned.
 */

const RESERVED_TOOLKIT_FLAGS = [
  '--project',
  '--dry-run',
  '--non-interactive',
  '--interactive',
  '--allow-dirty',
  '--full',
];

/** Returns the offending argument, or undefined when the list is safe to run. */
export function findReservedFlag(args: string[]): string | undefined {
  return args.find(
    (arg) =>
      RESERVED_TOOLKIT_FLAGS.includes(arg) ||
      RESERVED_TOOLKIT_FLAGS.some((flag) => arg.startsWith(`${flag}=`)),
  );
}

/**
 * Hosts whose documentation the dashboard may open in an external browser.
 *
 * Opening a URL is the one webview-reachable action that leaves the editor, so
 * the destination is checked here rather than trusted from the message. Only
 * Expo's own documentation is reachable, and only over https.
 */
const DOCUMENTATION_HOSTS = new Set(['docs.expo.dev', 'expo.dev']);

export function isDocumentationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && DOCUMENTATION_HOSTS.has(url.hostname);
  } catch {
    return false;
  }
}

/**
 * Commands the dashboard webview may ask the extension host to run. Every entry
 * is a Nova command that prompts for its own values; nothing here forwards a
 * webview-supplied argument to a shell.
 */
const WEBVIEW_COMMANDS = new Set([
  'novaExpo.build',
  'novaExpo.dev.start',
  'novaExpo.dependencies.install',
  'novaExpo.doctor',
  'novaExpo.doctor.fix',
  'novaExpo.docs.open',
  'novaExpo.moreActions',
  'novaExpo.openFolder',
  'novaExpo.project.create',
  'novaExpo.project.openCreated',
  'novaExpo.project.openConfig',
  'novaExpo.project.select',
  'novaExpo.releaseCheck',
  'novaExpo.scm.open',
  'novaExpo.settings.open',
  'novaExpo.submit',
  'novaExpo.task.clear',
  'novaExpo.task.show',
  'novaExpo.task.stop',
  'novaExpo.toolkitAction',
  'novaExpo.update.publish',
  'novaExpo.workspace.trust',
]);

export function isWebviewCommand(command: string): boolean {
  return WEBVIEW_COMMANDS.has(command);
}
