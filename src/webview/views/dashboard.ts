import type { ExpoProjectInfo } from '../../projectInfo';
import { TOOLKIT_ACTIONS, type ToolkitAction } from '../../toolkitCatalog';
import { el, icon, sectionHeading } from '../dom';
import { goCatalog, openAction } from '../navigation';
import { render, runCommand, state } from '../store';
import { snapshotToRun } from './run';

interface PrimaryAction {
  command: string;
  icon: string;
  label: string;
  description: string;
}

/** The ship cycle, in the order a release actually moves through it. */
const PRIMARY_ACTIONS: PrimaryAction[] = [
  {
    command: 'novaExpo.dev.start',
    icon: 'play',
    label: 'Develop',
    description: 'Start Metro or open a target',
  },
  {
    command: 'novaExpo.build',
    icon: 'package',
    label: 'Build',
    description: 'Create an EAS build',
  },
  {
    command: 'novaExpo.update.publish',
    icon: 'rocket',
    label: 'Update',
    description: 'Publish an OTA update',
  },
  {
    command: 'novaExpo.submit',
    icon: 'cloud-upload',
    label: 'Submit',
    description: 'Send a build to a store',
  },
];

/** Read-only catalog actions surfaced on the dashboard without a catalog trip. */
const COMMON_ACTION_IDS = ['builds.list', 'updates.list', 'project.inspect', 'account.status'];

/**
 * One row per catalog action.
 *
 * Every action opens its review screen first. That screen is where the
 * explanation, the effects, and the documentation link live, and an action that
 * skipped it was one the user took without being told what it did — including
 * the local native builds, which the row could not distinguish from a read.
 */
export function renderActionRow(action: ToolkitAction): HTMLElement {
  return el('button', { class: 'action-row', onclick: () => openAction(action) }, [
    icon(action.icon),
    el('span', { class: 'row-copy' }, [
      el('span', { class: 'row-label' }, [action.label]),
      el('span', { class: 'row-description' }, [action.description]),
    ]),
    action.interactive ? icon('terminal') : icon('chevron-right'),
  ]);
}

/** The active or most recent task, as a card that opens the full task screen. */
export function renderTaskCard(): HTMLElement | null {
  if (!state.task) return null;
  const task = state.task;
  const taskIcon =
    task.status === 'running' || task.status === 'stopping'
      ? 'sync'
      : task.status === 'success'
        ? 'pass-filled'
        : task.status === 'cancelled'
          ? 'circle-slash'
          : 'error';
  const label =
    task.status === 'running'
      ? 'Running'
      : task.status === 'stopping'
        ? 'Stopping'
        : task.status === 'success'
          ? 'Completed'
          : task.status === 'cancelled'
            ? 'Stopped'
            : 'Failed';
  return el('section', { class: 'task-card ' + task.status }, [
    sectionHeading(
      task.status === 'running' || task.status === 'stopping' ? 'Active task' : 'Recent task',
    ),
    el(
      'button',
      {
        class: 'release-card',
        onclick: () => {
          state.run = snapshotToRun(task);
          render();
        },
      },
      [
        icon(taskIcon, task.status === 'running' || task.status === 'stopping'),
        el('span', { class: 'release-copy' }, [
          el('span', { class: 'release-title' }, [task.title]),
          el('span', { class: 'release-description' }, [label]),
        ]),
        icon('chevron-right'),
      ],
    ),
  ]);
}

/** Shown when the workspace holds no Expo project, or holds nothing at all. */
export function renderEmpty(): HTMLElement {
  const hasWorkspace = state.hasWorkspace;
  return el('div', { class: 'empty' }, [
    icon(hasWorkspace ? 'search-stop' : 'folder-opened'),
    el('div', { class: 'empty-title' }, [
      hasWorkspace ? 'No Expo project found' : 'Open an Expo workspace',
    ]),
    el('div', {}, [
      hasWorkspace
        ? 'Add a package that declares Expo, or open a different folder.'
        : 'Nova Expo finds apps at the workspace root or inside a monorepo.',
    ]),
    el('div', { class: 'prompt-actions' }, [
      el(
        'button',
        { class: 'primary-button', onclick: () => runCommand('novaExpo.project.create') },
        [icon('add'), 'Create New'],
      ),
      el(
        'button',
        {
          class: 'secondary-button open-folder-button',
          onclick: () => runCommand('novaExpo.openFolder'),
        },
        [icon('folder-opened'), 'Open Folder'],
      ),
    ]),
  ]);
}

/**
 * The single status line under the project header. A pending setup step
 * outranks a configuration warning, which outranks the all-clear, so the
 * dashboard never shows more than one thing to do next.
 */
function projectNotice(project: ExpoProjectInfo): HTMLElement {
  const dynamicConfig = project.configFile && project.configFile !== 'app.json';
  if (state.nextStep) {
    const nextStep = state.nextStep;
    const optional = nextStep.id === 'configure-eas-update';
    return el('div', { class: 'notice ' + (optional ? 'info' : 'warning') }, [
      icon(optional ? 'lightbulb' : 'debug-step-over'),
      el('div', { class: 'notice-copy' }, [
        (optional ? 'Optional next step: ' : 'Recommended next step: ') +
          nextStep.description +
          ' ',
        el(
          'button',
          {
            class: 'link-button',
            onclick: () => runCommand(nextStep.command, ...(nextStep.args || [])),
          },
          [nextStep.label],
        ),
      ]),
    ]);
  }
  if (!dynamicConfig && !project.androidPackage && !project.iosBundleIdentifier) {
    return el('div', { class: 'notice warning' }, [
      icon('warning'),
      el('div', { class: 'notice-copy' }, [
        'Store application identifiers are missing. Run readiness checks before release.',
      ]),
    ]);
  }
  return el('div', { class: 'notice success' }, [
    icon('pass-filled'),
    el('div', { class: 'notice-copy' }, [
      dynamicConfig
        ? 'Dynamic Expo config detected. Release checks resolve it before shipping.'
        : 'Core Expo and EAS configuration detected.',
    ]),
  ]);
}

export function renderDashboardScreen(project: ExpoProjectInfo): DocumentFragment {
  const fragment = document.createDocumentFragment();
  const heroButtons: HTMLElement[] = [];
  heroButtons.push(
    el(
      'button',
      {
        class: 'icon-button',
        title: 'Switch project',
        'aria-label': 'Switch project',
        onclick: () => runCommand('novaExpo.project.select'),
      },
      [icon('arrow-swap')],
    ),
  );
  heroButtons.push(
    el(
      'button',
      {
        class: 'icon-button',
        title: 'Open app configuration',
        'aria-label': 'Open app configuration',
        onclick: () => runCommand('novaExpo.project.openConfig'),
      },
      [icon('go-to-file')],
    ),
  );

  const pills: HTMLElement[] = [];
  if (project.sdkVersion)
    pills.push(
      el('span', { class: 'status-pill' }, [icon('symbol-number'), 'SDK ' + project.sdkVersion]),
    );
  pills.push(
    el('span', { class: 'status-pill' }, [
      icon('layers'),
      project.buildProfiles.length +
        (project.buildProfiles.length === 1 ? ' profile' : ' profiles'),
    ]),
  );
  if (project.packageManager)
    pills.push(el('span', { class: 'status-pill' }, [icon('package'), project.packageManager]));
  if (project.hasUpdates)
    pills.push(el('span', { class: 'status-pill' }, [icon('radio-tower'), 'Updates']));

  fragment.appendChild(
    el('div', { class: 'hero' }, [
      el('div', { class: 'hero-top' }, [
        el('div', { class: 'hero-copy' }, [
          el('div', { class: 'eyebrow' }, [
            state.projects.length > 1 ? 'Active project' : 'Expo project',
          ]),
          el('h1', { class: 'project-name' }, [project.name]),
          el('div', { class: 'project-path', title: project.relativePath }, [project.relativePath]),
        ]),
        ...heroButtons,
      ]),
      el('div', { class: 'status-row' }, pills),
    ]),
  );
  fragment.appendChild(projectNotice(project));

  fragment.appendChild(
    el('section', {}, [
      sectionHeading('Ship cycle'),
      el(
        'div',
        { class: 'action-grid' },
        PRIMARY_ACTIONS.map((action) =>
          el('button', { class: 'primary-action', onclick: () => runCommand(action.command) }, [
            icon(action.icon),
            el('span', { class: 'primary-label' }, [action.label]),
            el('span', { class: 'primary-description' }, [action.description]),
          ]),
        ),
      ),
    ]),
  );

  fragment.appendChild(
    el('section', {}, [
      el('button', { class: 'release-card', onclick: () => runCommand('novaExpo.releaseCheck') }, [
        icon('shield'),
        el('span', { class: 'release-copy' }, [
          el('span', { class: 'release-title' }, ['Production readiness']),
          el('span', { class: 'release-description' }, [
            'Validate configuration, dependencies, and release safety',
          ]),
        ]),
        icon('chevron-right'),
      ]),
    ]),
  );

  if (project.buildProfiles.length > 0) {
    fragment.appendChild(
      el('section', {}, [
        sectionHeading('Build profiles'),
        el(
          'div',
          { class: 'profile-list' },
          project.buildProfiles.map((profile) => {
            const metadata = [profile.distribution, profile.channel || profile.environment].filter(
              Boolean,
            );
            return el(
              'button',
              {
                class: 'profile-button',
                onclick: () => runCommand('novaExpo.build', profile.name),
              },
              [
                icon('layers'),
                el('span', { class: 'row-copy' }, [
                  el('span', { class: 'row-label' }, [profile.name]),
                ]),
                metadata.length
                  ? el(
                      'span',
                      { class: 'profile-meta' },
                      metadata.map((value) =>
                        el('span', { class: 'row-meta', title: value }, [value]),
                      ),
                    )
                  : icon('chevron-right'),
              ],
            );
          }),
        ),
      ]),
    );
  }

  const common = COMMON_ACTION_IDS.map((id) =>
    TOOLKIT_ACTIONS.find((action) => action.id === id),
  ).filter((action): action is ToolkitAction => Boolean(action));
  fragment.appendChild(
    el('section', {}, [
      sectionHeading('Inspect'),
      el(
        'div',
        { class: 'profile-list' },
        common.map((action) => renderActionRow(action)),
      ),
      el('button', { class: 'primary-button wide-button', onclick: goCatalog }, [
        icon('list-selection'),
        'Browse all workflows',
      ]),
    ]),
  );
  return fragment;
}
