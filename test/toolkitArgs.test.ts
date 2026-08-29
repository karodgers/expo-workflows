import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { prepareToolkitAction } from '../src/commands/toolkitArgs';
import type { CommandContext } from '../src/commands/context';
import type { ExpoProjectInfo } from '../src/projectInfo';
import { findToolkitAction } from '../src/toolkitCatalog';

/**
 * prepareToolkitAction collects the values a catalog workflow needs before it
 * runs, so the script never has to prompt on a TTY the dashboard does not
 * have. It touches no VS Code API of its own — everything arrives through the
 * command context — so the whole branch table is exercised with a scripted
 * stand-in that answers questions in order.
 */
interface Recorded {
  feedback: { level: string; title: string }[];
  asked: string[];
}

function createContext(answers: (string | string[] | undefined)[]) {
  const recorded: Recorded = { feedback: [], asked: [] };
  const queue = [...answers];
  const take = (label: string) => {
    recorded.asked.push(label);
    return queue.shift();
  };
  const context = {
    dashboard: {
      async pick(title: string) {
        return take(`pick:${title}`) as string | undefined;
      },
      async showFeedback(level: string, title: string) {
        recorded.feedback.push({ level, title });
      },
    },
    async askValidated(
      title: string,
      _value: string,
      _description: string,
      validate: (answer: string) => string | undefined,
    ) {
      // Mirrors the real helper: keep taking answers until one validates, and
      // give up when the user cancels.
      for (;;) {
        const answer = take(`input:${title}`);
        if (answer === undefined) return undefined;
        if (!validate(answer as string)) return answer as string;
      }
    },
    async pickPlatform(title: string) {
      return take(`platform:${title}`) as string | undefined;
    },
    async pickProfile(title: string) {
      return take(`profile:${title}`) as string | undefined;
    },
    async requireEasProject(project: ExpoProjectInfo | undefined) {
      if (project?.hasEasConfig) return true;
      recorded.feedback.push({ level: 'warning', title: 'EAS is not configured' });
      return false;
    },
    validateRequiredText: (message: string) => (value: string) =>
      value ? (value.startsWith('-') ? 'Values cannot start with a dash.' : undefined) : message,
  } as unknown as CommandContext;
  return { context, recorded, remaining: () => queue.length };
}

function project(overrides: Partial<ExpoProjectInfo> = {}): ExpoProjectInfo {
  return {
    root: '/w/app',
    relativePath: 'app',
    name: 'Demo App',
    slug: 'demo-app',
    configFile: 'app.json',
    androidPackage: 'com.demo.app',
    iosBundleIdentifier: 'com.demo.app',
    hasDependencies: true,
    hasEasConfig: true,
    hasStoreMetadata: false,
    hasUpdates: true,
    buildProfiles: [
      { name: 'preview', distribution: 'internal', channel: 'preview', environment: 'preview' },
      { name: 'production', channel: 'production', environment: 'production' },
    ],
    submitProfiles: ['production'],
    ...overrides,
  } as ExpoProjectInfo;
}

const action = (id: string) => {
  const found = findToolkitAction(id);
  assert.ok(found, `catalog is missing ${id}`);
  return found;
};

test('a cloud workflow is refused when the project has no EAS configuration', async () => {
  const { context, recorded } = createContext([]);
  const args = await prepareToolkitAction(
    context,
    action('builds.list'),
    project({ hasEasConfig: false }),
  );
  assert.equal(args, undefined);
  assert.deepEqual(recorded.feedback, [{ level: 'warning', title: 'EAS is not configured' }]);
});

test('a project-category workflow does not require EAS', async () => {
  const { context } = createContext([]);
  const args = await prepareToolkitAction(
    context,
    action('project.inspect'),
    project({ hasEasConfig: false }),
  );
  assert.deepEqual(args, ['inspect']);
});

test('collected values are appended to the catalog arguments, never replacing them', async () => {
  const { context } = createContext(['ios', 'production']);
  const entry = action('builds.versions');
  const args = await prepareToolkitAction(context, entry, project());
  assert.deepEqual(args, [...entry.args, '--platform', 'ios', '--profile', 'production']);
});

test('variants refuse to touch a dynamic Expo config rather than overwriting it', async () => {
  const { context, recorded } = createContext([]);
  const args = await prepareToolkitAction(
    context,
    action('development.variants'),
    project({ configFile: 'app.config.ts', hasGeneratedConfig: false }),
  );
  assert.equal(args, undefined);
  assert.deepEqual(recorded.feedback, [
    { level: 'error', title: 'Variants cannot rewrite this Expo config' },
  ]);
});

test('variants may regenerate a dynamic config Nova itself wrote', async () => {
  // Variant setup writes app.config.js next to app.json, so its own output is
  // the config it finds on a second run. Refusing that would make the workflow
  // a one-shot and leave no way to change an identifier afterwards.
  const { context } = createContext([]);
  assert.deepEqual(
    await prepareToolkitAction(
      context,
      action('development.variants'),
      project({ configFile: 'app.config.js', hasGeneratedConfig: true }),
    ),
    action('development.variants').args,
  );
});

test('variants ask for an application identifier only when the project has none', async () => {
  const withIds = createContext([]);
  assert.deepEqual(
    await prepareToolkitAction(withIds.context, action('development.variants'), project()),
    action('development.variants').args,
  );
  assert.deepEqual(withIds.recorded.asked, [], 'nothing is asked when identifiers exist');

  const without = createContext(['com.acme.app']);
  const args = await prepareToolkitAction(
    without.context,
    action('development.variants'),
    project({ androidPackage: undefined, iosBundleIdentifier: undefined }),
  );
  assert.deepEqual(args, [...action('development.variants').args, '--app-id', 'com.acme.app']);
});

test('a rejected identifier is re-asked until it validates', async () => {
  const { context, recorded } = createContext(['not a valid id', 'com.acme.app']);
  const args = await prepareToolkitAction(
    context,
    action('development.variants'),
    project({ androidPackage: undefined, iosBundleIdentifier: undefined }),
  );
  assert.deepEqual(args, [...action('development.variants').args, '--app-id', 'com.acme.app']);
  assert.equal(recorded.asked.length, 2, 'the invalid answer was rejected and re-asked');
});

test('templates derive the preview identifier from the project instead of asking', async () => {
  const { context, recorded } = createContext([]);
  const args = await prepareToolkitAction(context, action('project.templates'), project());
  assert.deepEqual(args, [...action('project.templates').args, '--app-id', 'com.demo.app.preview']);
  assert.deepEqual(recorded.asked, []);
});

test('update listing distinguishes a detected channel from a typed branch', async () => {
  const all = createContext(['__nova_all_update_branches__']);
  assert.deepEqual(await prepareToolkitAction(all.context, action('updates.list'), project()), [
    ...action('updates.list').args,
    '--all',
  ]);

  // A name detected from a build profile is a channel. Passing it as a branch
  // returned nothing whenever the channel pointed at a differently named one.
  const detected = createContext(['channel:production']);
  assert.deepEqual(
    await prepareToolkitAction(detected.context, action('updates.list'), project()),
    [...action('updates.list').args, '--channel', 'production'],
  );

  const custom = createContext(['__nova_custom_update_branch__', 'feature-x']);
  assert.deepEqual(await prepareToolkitAction(custom.context, action('updates.list'), project()), [
    ...action('updates.list').args,
    '--branch',
    'feature-x',
  ]);
});

test('a branch that would be read as an option is rejected before it reaches a script', async () => {
  const { context } = createContext(['__nova_custom_update_branch__', '--dry-run', 'feature-x']);
  const args = await prepareToolkitAction(context, action('updates.list'), project());
  assert.deepEqual(args, [...action('updates.list').args, '--branch', 'feature-x']);
  assert.ok(!args!.includes('--dry-run'));
});

test('version workflows stop early when the project declares no build profiles', async () => {
  for (const id of ['builds.versions', 'builds.sync-versions', 'updates.fingerprint']) {
    const { context, recorded } = createContext([]);
    const args = await prepareToolkitAction(context, action(id), project({ buildProfiles: [] }));
    assert.equal(args, undefined, `${id} must not run without a profile`);
    assert.deepEqual(recorded.feedback, [{ level: 'warning', title: 'No build profiles found' }]);
  }
});

test('store setup requires http(s) URLs for both required links', async () => {
  const { context, recorded } = createContext([
    'Demo App',
    'not-a-url',
    'javascript:alert(1)',
    'ftp://example.com/support',
    'https://example.com/support',
    'https://example.com/privacy',
  ]);
  const args = await prepareToolkitAction(context, action('release.store-setup'), project());
  assert.deepEqual(args, [
    ...action('release.store-setup').args,
    '--title',
    'Demo App',
    '--support-url',
    'https://example.com/support',
    '--privacy-url',
    'https://example.com/privacy',
  ]);
  assert.equal(recorded.asked.length, 6, 'each rejected URL was re-asked');
});

test('cancelling any question abandons the whole preparation', async () => {
  const cases: [string, (string | undefined)[]][] = [
    ['builds.versions', [undefined]],
    ['builds.versions', ['ios', undefined]],
    ['updates.list', [undefined]],
    ['updates.insights', [undefined]],
    ['submissions.status', ['ios', undefined]],
    ['release.store-setup', ['Demo App', 'https://example.com/s', undefined]],
    ['account.usage', [undefined]],
  ];
  for (const [id, answers] of cases) {
    const { context } = createContext(answers);
    assert.equal(
      await prepareToolkitAction(context, action(id), project()),
      undefined,
      `${id} must abandon on cancel`,
    );
  }
});

test('an interactive fingerprint comparison defers its questions to the terminal', async () => {
  const entry = action('updates.compare-fingerprint');
  const { context, recorded } = createContext([]);
  const args = await prepareToolkitAction(context, entry, project());
  if (entry.interactive) {
    assert.deepEqual(args, entry.args);
    assert.deepEqual(recorded.asked, [], 'an interactive workflow prompts in its own terminal');
  } else {
    assert.ok(args!.includes('--environment'));
  }
});

test('listing EAS variables collects the environment it cannot be prompted for', () => {
  // `eas env:list` takes the environment as a positional argument, and a
  // dashboard task runs under CI where it cannot ask. Left uncollected it
  // failed with no mapped recovery.
  return (async () => {
    const detected = createContext(['preview']);
    assert.deepEqual(await prepareToolkitAction(detected.context, action('cloud.env'), project()), [
      ...action('cloud.env').args,
      'preview',
    ]);

    const custom = createContext(['__nova_custom_environment__', 'staging']);
    assert.deepEqual(await prepareToolkitAction(custom.context, action('cloud.env'), project()), [
      ...action('cloud.env').args,
      'staging',
    ]);

    const cancelled = createContext([]);
    assert.equal(
      await prepareToolkitAction(cancelled.context, action('cloud.env'), project()),
      undefined,
    );
  })();
});
