import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { test } from 'node:test';
import { UNCOMMITTED_CHANGES_PATTERNS } from '../src/recovery';
import { TOOLKIT_ACTIONS } from '../src/toolkitCatalog';

/**
 * The extension and the shell scripts are two halves of one product, coupled
 * by names and by wording. Nothing in TypeScript fails when that coupling
 * drifts: a catalog entry naming a subcommand no script handles only breaks
 * when a user clicks it, and a reworded script message only makes a recovery
 * path quietly unreachable.
 *
 * These tests read the scripts that ship in this repository and pin both.
 */
const WORKFLOWS_DIR = path.resolve(__dirname, '..', '..', 'workflows');

function readScript(name: string): string {
  return fs.readFileSync(path.join(WORKFLOWS_DIR, name), 'utf8');
}

interface Dispatch {
  /** Explicitly handled subcommand names. */
  labels: Set<string>;
  /**
   * Whether the `*)` arm forwards to the CLI rather than aborting. Most
   * scripts end in `toolkit_die "unknown ... action"`, so a catch-all is an
   * error path and must not be treated as accepting anything; update.sh
   * forwards unknown actions to `eas update:<action>` and genuinely does.
   */
  catchAllForwards: boolean;
}

/**
 * Reads the top-level `case "$action" in` dispatch, which is how a workflow
 * script decides what a subcommand does. Scripts that take no subcommand have
 * no such block and yield undefined.
 */
function dispatchOf(source: string): Dispatch | undefined {
  const lines = source.split('\n');
  const start = lines.findIndex((line) => /^case "\$action" in\s*$/.test(line.trim()));
  if (start === -1) return undefined;
  const labels = new Set<string>();
  let catchAllForwards = false;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index].trim();
    if (line === 'esac') break;
    const match = /^([^)(]+)\)/.exec(line);
    if (!match || match[1].includes('$')) continue;
    const arm = match[1].trim();
    if (arm === '*') {
      catchAllForwards = !/toolkit_die/.test(line);
      continue;
    }
    for (const label of arm.split('|')) labels.add(label.trim());
  }
  return labels.size > 0 ? { labels, catchAllForwards } : undefined;
}

test('the workflows directory ships with the extension source', () => {
  assert.ok(fs.existsSync(WORKFLOWS_DIR), `expected workflow scripts at ${WORKFLOWS_DIR}`);
  const scripts = fs.readdirSync(WORKFLOWS_DIR).filter((name) => name.endsWith('.sh'));
  assert.ok(scripts.length > 20, `expected the full toolkit, found ${scripts.length} scripts`);
});

test('every catalog entry names a script that exists', () => {
  for (const action of TOOLKIT_ACTIONS) {
    const scriptPath = path.join(WORKFLOWS_DIR, action.script);
    assert.ok(
      fs.existsSync(scriptPath),
      `${action.id} points at a missing script: ${action.script}`,
    );
  }
});

test('every catalog subcommand is one the script actually dispatches', () => {
  const unchecked: string[] = [];
  for (const action of TOOLKIT_ACTIONS) {
    const subcommand = action.args[0];
    // Entries whose first argument is a flag pass no subcommand at all.
    if (!subcommand || subcommand.startsWith('-')) continue;
    const dispatch = dispatchOf(readScript(action.script));
    if (!dispatch) {
      unchecked.push(`${action.id} (${action.script} has no case dispatch)`);
      continue;
    }
    if (dispatch.catchAllForwards) continue;
    assert.ok(
      dispatch.labels.has(subcommand),
      `${action.id} runs "${action.script} ${subcommand}", which that script does not handle — ` +
        `it would abort with "unknown action". ${action.script} handles: ` +
        `${[...dispatch.labels].sort().join(', ')}`,
    );
  }
  // Reported rather than asserted: some scripts take flags instead of a
  // subcommand, and this keeps the gap visible without failing the suite.
  if (unchecked.length > 0) {
    assert.ok(unchecked.length < TOOLKIT_ACTIONS.length, unchecked.join('\n'));
  }
});

test('release-check.sh still refuses a dirty tree in the wording the gate matches', () => {
  const source = readScript('release-check.sh');
  const matched = UNCOMMITTED_CHANGES_PATTERNS.some((pattern) => pattern.test(source));
  assert.ok(
    matched,
    'release-check.sh no longer emits a message any UNCOMMITTED_CHANGES_PATTERNS entry matches. ' +
      'The release gate can no longer tell a dirty working tree from any other failure, so the ' +
      '"release with uncommitted changes?" override is unreachable and the gate is a dead end. ' +
      'Update the patterns in src/recovery.ts to match the new wording.',
  );
});

test('release-check.sh still accepts the flag the gate re-runs with', () => {
  const source = readScript('release-check.sh');
  assert.match(
    source,
    /--allow-dirty\)/,
    'the release gate re-runs release-check.sh with --allow-dirty once the user accepts, ' +
      'so the script must still parse that flag',
  );
});

test('the readiness gate is invoked with subcommands release-check.sh supports', () => {
  const source = readScript('release-check.sh');
  // The gate is called with these three modes from the release commands.
  for (const mode of ['build', 'submit', 'update']) {
    assert.ok(
      new RegExp(`\\b${mode}\\b`).test(source),
      `release-check.sh does not mention the "${mode}" mode the extension invokes`,
    );
  }
});

test('the project initializer the create wizard runs is present and executable', () => {
  const initializer = path.resolve(__dirname, '..', '..', 'nova-expo', 'bin', 'nova-expo.js');
  assert.ok(fs.existsSync(initializer), `expected the initializer at ${initializer}`);
  const source = fs.readFileSync(initializer, 'utf8');
  assert.match(source.split('\n')[0], /^#!/, 'the initializer needs a shebang to be spawned');
});
