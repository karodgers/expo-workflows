# Changelog

## 0.3.6

Security

- `novaExpo.toolkitPath` chooses which scripts the extension executes, and was
  declared `machine-overridable` — the one scope a workspace _can_ override —
  while its own description and the failure-mode review both claimed a workspace
  could not set it. A repository shipping `.vscode/settings.json` could point it
  at scripts it controlled, and relative paths were resolved against the
  workspace folder, which made that the natural way to write one. The setting is
  now `machine`-scoped, is read through `inspect` so only a global or remote
  value is honoured, and must be absolute.
- Added `--allow-dirty` and `--full` to the reserved options a collected value
  may never become. The release gate adds them itself, after asking, through a
  separate channel applied after that check.
- The project initializer no longer fetches `expo-doctor@latest` during
  validation; the range is pinned in `nova.pinned` and overridable through
  `EXPO_DOCTOR_VERSION`, matching the workflow runtime.

Fixed

- Creating a project could not work on Windows: the initializer spawned `npm`
  and `npx` directly, and Node has refused to spawn a `.cmd` shim since 18.20.
  Those launches now go through the platform shell with every argument asserted
  to be a bare token and quoted, so a caret version range survives `cmd.exe`.
- `doctor.sh check` stopped at the first misaligned package and never reached
  Expo Doctor, so the health report the user asked for was never printed. Every
  check now runs and the worst status becomes the exit code. The release gate
  reports both checks the same way before giving a verdict.
- "Run Android locally", "Run iOS locally", and "Generate native projects" ran
  on a single click and were labelled "Read only", despite running a full native
  build, writing `android/` or `ios/`, and prompting for a device. They now open
  a terminal, require confirmation, and state what they change.
- The dev server opens in a terminal instead of a managed task. Metro is driven
  by keystrokes and prints a QR code, neither of which survives a task with
  closed stdin and stripped ANSI. It also no longer occupies the single task
  slot, so a build can run alongside it.
- Update listing passed a channel name as `--branch`, which returned nothing
  whenever a channel pointed at a differently named branch. Channels and
  branches are now distinguished.
- The Expo config precedence was inverted: `app.json` was preferred over a
  dynamic `app.config.*`, so a project that had run variant setup reported the
  file that no longer decided its identifiers.
- The release gate scoped its uncommitted-changes check to the whole repository,
  blocking a monorepo release because an unrelated package had edits. It is now
  scoped to the project, and a project outside git is warned rather than
  silently passed.
- `env.sh` computed a non-interactive flag it never passed, and listing EAS
  variables supplied no environment, so it met a prompt it could not answer.

Changed

- Every workflow now carries an explanation, a list of what it touches, and a
  link to the Expo documentation, all required by the type and asserted by
  tests. Every action opens its review screen before it runs.
- A successful task offers a next step: a named follow-up where one exists,
  otherwise the action's documentation. The release path chains build to
  submission, submission to store status, and an update to its adoption metrics.
- A failure that matches no known cause now offers a health check and the
  documentation for the operation attempted, instead of a bare exit code.
- Error notifications promote one correction rather than three, which VS Code
  was collapsing into an overflow menu.
- The repository ships from `expo-workflows/` alone. `install.sh` was building
  and installing a stale duplicate of the extension.

## 0.3.5

- Fixed a wizard left unanswered being resurrected later: starting a second
  workflow while the first was still waiting orphaned the first, and restoring
  the sidebar re-posted its forgotten question, which could be answered to
  resume a release the user had walked away from. One question is now
  outstanding at a time, and starting another cancels the one it replaces.
- Moved keyboard focus to the heading of a screen the user navigates to, so the
  new screen is announced instead of focus falling back to the document. Focus
  is left alone when the dashboard repaints on its own or does not already hold
  it.
- Reorganized the extension source into per-screen and per-command modules with
  no change in behavior, and split the dashboard stylesheet out of the document
  shell.
- Named the working-tree wording shared by the release gate and the recovery
  suggestions, and added contract tests that read the bundled workflow scripts
  so a reworded message or a catalog entry naming a subcommand no script handles
  fails the build instead of failing a user.
- Typechecked the webview without `noImplicitAny` suppression and against the
  oldest VS Code API the extension supports.

## 0.3.4

- Passed the build profile, platform, update channel, release notes, and update
  environment through the workflow environment contract instead of appending
  them to the command line, so a value can no longer be read as an option.
- Rejected prompt values that start with a dash and refused any prepared
  workflow argument that would be consumed as `--project`, `--dry-run`,
  `--non-interactive`, or `--interactive`.
- Fixed dependency installation on Windows, where package managers ship as
  `.cmd` shims that Node refuses to spawn directly.
- Reassembled escape sequences and multi-byte characters that a pipe splits
  across chunk boundaries instead of writing control codes and replacement
  characters into task output.
- Mapped a release gate that stops on an uncommitted working tree to a Review
  Source Control next step.
- Fixed the build action silently doing nothing when an EAS profile that is not
  in `eas.json` is entered by hand.
- Streamed task output through one shared line buffer flushed on an animation
  frame, and stopped rescanning the workspace while a task is running.
- Generated the webview nonce from a cryptographic random source.
- Offered an explicitly confirmed opt-in when the readiness gate stops on an
  uncommitted working tree, instead of leaving the release with no way forward.
- Pinned the EAS CLI and Expo Doctor versions that the workflows install on
  demand, so an unattended run cannot pull a newly published major.
- Terminated the whole process tree on Windows through `taskkill`, so stopping a
  task no longer leaves Metro or EAS descendants running.
- Ran with limited support in untrusted workspaces: the dashboard reads the
  project configuration and explains what trust unlocks, while every command
  stays blocked.
- Restricted `novaExpo.toolkitPath` to machine scope so a workspace cannot
  redirect which scripts the extension executes.
- Kept an open wizard alive across a webview reload and stopped retaining the
  hidden webview, with the view now restoring itself through a ready handshake.
- Moved the dashboard webview out of an inline string into a bundled,
  type-checked module with its own tests.

## 0.3.3

- Added prompts for update history branches, update insights group IDs, and
  account usage/audit account names before running non-interactive EAS commands.
- Routed fingerprint comparison through the interactive terminal flow.
- Added a store metadata next-step action when submission readiness succeeds but
  store.config.json has not been generated yet.
- Preserved Browse All Workflows as the back destination for workflow task
  output.

## 0.3.2

- Fixed new-project tests when optional Vector Icons, Reanimated, Worklets,
  Secure Store, or MMKV packages are deselected.
- Added a minimal-project regression covering an entirely deselected optional
  package set.
- Distinguished a completed project with a failed final quality check from a
  project whose setup actually stopped early.
- Added an Open Project recovery link when generated files are complete but a
  final validation check needs attention.

## 0.3.1

- Added an always-available project switcher with workspace-app, folder-browse,
  and new-project options.
- Improved dashboard button hierarchy and profile-tag contrast across VS Code
  themes.
- Shortened the empty-state project action to Create New and added a dotted Open
  Folder treatment.
- Removed strict lint from the initializer's automatic success gate while
  keeping lint available through the generated project's development scripts.
- Added a retained Open Project button after successful project creation.

## 0.3.0

- Added context-aware recovery suggestions for managed workflow failures.
- Added one-click corrective actions to VS Code error notifications and retained
  task output.
- Added first-step guidance for dependencies, EAS setup, project linking, and
  Updates.
- Added direct dependency installation and Expo dependency-fix commands.
- Added guided store metadata setup as a searchable workflow and recovery
  action.
- Added failure tracking and recovery suggestions for interactive terminal
  workflows.

## 0.2.1

- Made optional packages deselected by default with Select all and Deselect all
  controls.
- Increased the package picker height and simplified its footer actions.
- Fixed generated dynamic Expo configuration to extend the normalized static
  config.
- Added regression coverage for empty optional selections and Expo config
  inheritance.

## 0.2.0

- Added a validated new-project wizard with optional and custom package choices.
- Bundled the Nova Expo initializer into the extension.
- Added action review screens and detailed mutation/cost confirmations.
- Added production gates before builds, submissions, and production updates.
- Added retained output and reliable stop controls for persistent processes.
- Added inline feedback, input-validation errors, and task failure summaries.
- Added a documented failure-mode and user-validation policy.
- Replaced the Activity Bar icon with a theme-aware Nova mark.

## 0.1.0

- Added monorepo and multi-root Expo project discovery.
- Reorganized the dashboard around development, builds, updates, submissions,
  and production readiness.
- Added a searchable, categorized workflow catalog.
- Routed TTY-dependent EAS operations to the integrated terminal.
- Added safe cancellation, concurrency protection, mutation confirmations, and
  strict webview command validation.
- Added extension trust declarations, production metadata, and automated tests.
