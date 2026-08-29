#!/usr/bin/env bash
# Commits every tracked-but-unstaged file in this repository one at a time,
# in dependency order, with a message that explains what that file adds and
# why. Intended as a one-time import of the working tree into version
# control as a readable, sequential history instead of a single squash.
#
# Usage: ./commit.sh          # commit everything below with randomised 6h delay
#        ./commit.sh --dry-run  # print what would be committed, commit nothing
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

DRY_RUN=0
[[ "${1:-}" == "--dry-run" ]] && DRY_RUN=1

# Each entry is "path|commit subject". Order is the commit order.
ENTRIES=(
  # --- Phase 0: repo scaffolding & build tooling ---
  ".gitignore|chore: ignore build output, dependencies, and generated resource copies"
  "package.json|chore: define the Nova Expo extension manifest, views, commands, and settings"
  "package-lock.json|chore: pin dependency versions for reproducible installs"
  "tsconfig.json|chore: configure TypeScript for the extension host"
  "tsconfig.webview.json|chore: configure TypeScript for the webview, separate from the extension host libs"
  "tsconfig.test.json|chore: configure TypeScript compilation for the unit test suite"
  ".prettierrc.json|chore: set formatting rules for the project"
  ".prettierignore|chore: exclude generated and vendored paths from formatting"
  ".vscodeignore|chore: exclude dev-only files from the packaged .vsix"
  "LICENSE|docs: add MIT license"
  "esbuild.js|build: bundle the extension host and webview as separate esbuild targets"
  "scripts/copy-workflows.js|build: copy the workflows toolkit, codicons, and nova-expo initializer into resources/ before packaging"

  # --- Phase 1: the Expo/EAS workflow toolkit (bash scripts the extension wraps) ---
  "workflows/lib/common.sh|feat(toolkit): add the shared runtime every workflow script sources for argument parsing, project entry, and EAS/Expo invocation"
  "workflows/lib/tui.sh|feat(toolkit): add dependency-free terminal presentation helpers for the guided launcher"
  "workflows/lib/project-config.js|feat(toolkit): add a helper to read and write generated project configuration"
  "workflows/lib/release-audit.js|feat(toolkit): add the release audit used by the production safety gate"
  "workflows/lib/send-push.js|feat(toolkit): add a script to send a test push through the Expo Push Service"
  "workflows/run.sh|feat(toolkit): add the guided interactive menu entry point, with dry-run preview and a classic non-full-screen mode"
  "workflows/auth.sh|feat(toolkit): add Expo account status/login/logout"
  "workflows/account.sh|feat(toolkit): add EAS account usage, security, and session inspection"
  "workflows/project.sh|feat(toolkit): add EAS project init, build/update configuration, and combined setup"
  "workflows/doctor.sh|feat(toolkit): add SDK alignment and project health checks, running every check so one failure doesn't hide the rest of the report"
  "workflows/dev.sh|feat(toolkit): add Metro dev server start for each Expo runtime target"
  "workflows/native.sh|feat(toolkit): add native project prebuild and local Android/iOS run"
  "workflows/build.sh|feat(toolkit): add EAS Build create/list/view/cancel/download and version management"
  "workflows/credentials.sh|feat(toolkit): add EAS signing credential management and per-profile configuration"
  "workflows/devices.sh|feat(toolkit): add Apple device registration for internal distribution"
  "workflows/fingerprint.sh|feat(toolkit): add native runtime fingerprint generation and comparison"
  "workflows/variants.sh|feat(toolkit): add setup for independently installable dev/preview/production/E2E app variants"
  "workflows/env.sh|feat(toolkit): add EAS project/account environment variable management"
  "workflows/channels.sh|feat(toolkit): add EAS Update channel and branch management"
  "workflows/update.sh|feat(toolkit): add OTA update publish, rollback, and update configuration"
  "workflows/submit.sh|feat(toolkit): add store submission create/list/status/retry"
  "workflows/upload.sh|feat(toolkit): add local build upload with shareable link generation"
  "workflows/testflight.sh|feat(toolkit): add TestFlight crash report and tester feedback inspection"
  "workflows/store.sh|feat(toolkit): add EAS Metadata store config scaffolding for iOS submission"
  "workflows/metadata.sh|feat(toolkit): add app-store metadata lint, pull, and push"
  "workflows/webhooks.sh|feat(toolkit): add EAS Build/Submit webhook management"
  "workflows/integrations.sh|feat(toolkit): add pass-through management for EAS integrations (asc, convex, posthog, supabase)"
  "workflows/sim.sh|feat(toolkit): add EAS cloud simulator management"
  "workflows/observe.sh|feat(toolkit): add EAS application observability queries"
  "workflows/notifications.sh|feat(toolkit): add push notification permission scaffolding and test send"
  "workflows/deploy.sh|feat(toolkit): add web export and EAS Hosting deploy/promote/alias management"
  "workflows/workflow.sh|feat(toolkit): add EAS Workflows create/run/validate and run history inspection"
  "workflows/workflow-templates.sh|feat(toolkit): add installer for validation, preview, PR preview, Maestro E2E, and production workflow templates"
  "workflows/release-check.sh|feat(toolkit): add the production release gate, scoped to the project directory so an unrelated monorepo package can't block it"
  "workflows/version.sh|feat(toolkit): add toolkit/runtime version status and self-update check"
  "workflows/gui.sh|feat(toolkit): add a command to open the current project in VS Code for the Nova Expo extension to discover"
  "workflows/eas.sh|feat(toolkit): add a forward-compatible escape hatch for any EAS CLI command"
  "workflows/expo.sh|feat(toolkit): add a forward-compatible escape hatch for any project-local Expo CLI command"
  "workflows/app.json|chore(toolkit): add the sample Expo app manifest used by the toolkit's own test fixture"
  "workflows/package.json|chore(toolkit): declare the toolkit's package metadata and test script"
  "workflows/LICENSE|docs(toolkit): add MIT license"
  "workflows/README.md|docs(toolkit): document toolkit usage and available workflows"
  "workflows/templates/eas-workflows/validate.yml|feat(toolkit): add the Nova validation cloud workflow template"
  "workflows/templates/eas-workflows/preview.yml|feat(toolkit): add the preview build cloud workflow template"
  "workflows/templates/eas-workflows/pr-preview.yml|feat(toolkit): add the pull-request preview cloud workflow template"
  "workflows/templates/eas-workflows/production.yml|feat(toolkit): add the production release cloud workflow template"
  "workflows/templates/eas-workflows/e2e.yml|feat(toolkit): add the Maestro end-to-end cloud workflow template"
  "workflows/templates/maestro/home.yml|test(toolkit): add a sample Maestro flow for the E2E workflow template"
  "workflows/test/run.sh|test(toolkit): add an end-to-end smoke test that runs the toolkit against a scratch fixture project"

  # --- Phase 2: the Nova Expo project initializer (nova-expo/) ---
  "nova-expo/lib/project-options.js|feat(nova-expo): add package/app-identifier/display-name derivation from a project directory name"
  "nova-expo/lib/contract.js|feat(nova-expo): add the dependency contract that pins the Nova stack's package versions and generated scripts"
  "nova-expo/lib/project-files.js|feat(nova-expo): add the generator for the standard Nova project folder structure"
  "nova-expo/lib/commands.js|feat(nova-expo): add cross-platform command execution, launching .cmd shims through the shell on Windows"
  "nova-expo/lib/prompts.js|feat(nova-expo): add the interactive guided setup prompts"
  "nova-expo/lib/arguments.js|feat(nova-expo): add CLI argument parsing and help text"
  "nova-expo/lib/cli.js|feat(nova-expo): add the CLI entry point tying argument parsing, prompts, and project creation together"
  "nova-expo/bin/nova-expo.js|feat(nova-expo): add the nova-expo executable entry point"
  "nova-expo/package.json|chore(nova-expo): declare package metadata, bin entry, and dependencies"
  "nova-expo/eas.json|chore(nova-expo): add the default EAS Build profile configuration for generated projects"
  "nova-expo/jest.config.js|test(nova-expo): configure Jest for the initializer's test suite"
  "nova-expo/jest.setup.js|test(nova-expo): add Jest environment setup"
  "nova-expo/eslintrc.js|chore(nova-expo): configure ESLint for TypeScript, React Native, and accessibility rules"
  "nova-expo/eslintignore|chore(nova-expo): exclude generated paths from linting"
  "nova-expo/prettierrc.js|chore(nova-expo): set formatting rules for generated projects"
  "nova-expo/prettierignore|chore(nova-expo): exclude generated paths from formatting"
  "nova-expo/husky/pre-commit|chore(nova-expo): run lint-staged on pre-commit for generated projects"
  "nova-expo/husky/commit-msg|chore(nova-expo): enforce Conventional Commits messages in generated projects"
  "nova-expo/create-new-project.sh|feat(nova-expo): add a thin wrapper script to invoke the CLI without a global install"
  "nova-expo/setup-project.sh|feat(nova-expo): add a helper that guides installing nova-expo globally before running it"
  "nova-expo/deps.sh|docs(nova-expo): point the retired dependency script at the initializer's dependency contract"
  "nova-expo/structure.sh|feat(nova-expo): add a standalone folder-structure generator for non-generated projects"
  "nova-expo/scripts/run.sh|test(nova-expo): add a script to run the initializer's test suite"
  "nova-expo/template/dependencies.json|chore(nova-expo): add the pinned dependency manifest consumed by the contract"
  "nova-expo/skills/typescript.skill.md|docs(nova-expo): add the TypeScript conventions skill for generated projects"
  "nova-expo/skills/file-structure.skill.md|docs(nova-expo): add the file structure conventions skill"
  "nova-expo/skills/component-patterns.skill.md|docs(nova-expo): add the component patterns skill"
  "nova-expo/skills/composition.skill.md|docs(nova-expo): add the composition conventions skill"
  "nova-expo/skills/design-system.skill.md|docs(nova-expo): add the design system conventions skill"
  "nova-expo/skills/navigation.skill.md|docs(nova-expo): add the navigation conventions skill"
  "nova-expo/skills/state-management.skill.md|docs(nova-expo): add the state management conventions skill"
  "nova-expo/skills/forms.skill.md|docs(nova-expo): add the forms conventions skill"
  "nova-expo/skills/services.skill.md|docs(nova-expo): add the services layer conventions skill"
  "nova-expo/skills/animations.skill.md|docs(nova-expo): add the animations conventions skill"
  "nova-expo/skills/performance.skill.md|docs(nova-expo): add the performance conventions skill"
  "nova-expo/skills/security.skill.md|docs(nova-expo): add the security conventions skill"
  "nova-expo/skills/testing.skill.md|docs(nova-expo): add the testing conventions skill"
  "nova-expo/test/project-options.test.js|test(nova-expo): cover package/identifier derivation"
  "nova-expo/test/contract.test.js|test(nova-expo): cover the dependency contract and generated scripts"
  "nova-expo/test/project-files.test.js|test(nova-expo): cover the project folder structure generator"
  "nova-expo/test/arguments.test.js|test(nova-expo): cover CLI argument parsing"
  "nova-expo/test/prompts.test.js|test(nova-expo): cover the guided setup prompts"
  "nova-expo/test/validation.test.js|test(nova-expo): cover end-to-end project validation"
  "nova-expo/LICENSE|docs(nova-expo): add MIT license"
  "nova-expo/README.md|docs(nova-expo): document the initializer's usage and generated project structure"
  "nova-expo/CLAUDE.md|docs(nova-expo): add repository guidance for AI-assisted contributions"

  # --- Phase 3: extension host source (src/) ---
  "src/webviewProtocol.ts|feat(extension): define the typed message contract shared between the extension host and the webview"
  "src/projectInfo.ts|feat(extension): add Expo project config reading and health-relevant metadata extraction"
  "src/projectDiscovery.ts|feat(extension): add workspace-wide discovery of Expo projects, excluding generated and dependency folders"
  "src/projectCreation.ts|feat(extension): add optional package selection logic for the new-project wizard"
  "src/toolkitCatalog.ts|feat(extension): add the catalog of toolkit workflows shown in the dashboard, grouped by category"
  "src/processRunner.ts|feat(extension): add a process runner that streams live output and exposes cancellation for deterministic tasks"
  "src/toolkitRunner.ts|feat(extension): add resolution and invocation of toolkit scripts against the bundled or user-configured workflows directory"
  "src/promptBridge.ts|feat(extension): add a bridge that turns interactive script prompts into webview pick/input requests"
  "src/recovery.ts|feat(extension): add context-aware recovery suggestions surfaced after a failed workflow"
  "src/dashboardSecurity.ts|feat(extension): add the allowlists that gate which commands and flags the webview may trigger"
  "src/dashboardStyles.ts|feat(extension): add the dashboard webview stylesheet, kept apart from the document shell for readability"
  "src/dashboardHtml.ts|feat(extension): add the dashboard webview HTML shell with a per-load nonce-scoped CSP"
  "src/dashboardViewProvider.ts|feat(extension): add the webview view provider wiring the dashboard panel to extension state"
  "src/workspaceWatchers.ts|feat(extension): add workspace file watchers that refresh the dashboard when project config changes"
  "src/commands/context.ts|feat(extension): add the shared command context passed to every registered command"
  "src/commands/toolkitArgs.ts|feat(extension): add argument preparation that fills in project-derived defaults for toolkit actions"
  "src/commands/dashboardCommands.ts|feat(extension): add refresh, browse-workflows, and open-documentation commands"
  "src/commands/developmentCommands.ts|feat(extension): add start-dev-server and doctor commands"
  "src/commands/projectCommands.ts|feat(extension): add project select, open-config, and dependency install commands"
  "src/commands/projectWizard.ts|feat(extension): add the guided new-project creation command"
  "src/commands/releaseCommands.ts|feat(extension): add build, submit, publish-update, and release-readiness commands"
  "src/commands/workflowCommands.ts|feat(extension): add the generic run-workflow and task show/stop commands"
  "src/commands/index.ts|feat(extension): register every command against the dashboard view provider"
  "src/extension.ts|feat(extension): add the activation entry point wiring commands and the dashboard view together"

  # --- Phase 4: dashboard webview frontend (src/webview/) ---
  "src/webview/tsconfig.json|chore(webview): scope the webview's TypeScript config to DOM libs only"
  "src/webview/dom.ts|feat(webview): add typed DOM element construction helpers"
  "src/webview/store.ts|feat(webview): add the webview's render state and vscode API accessor"
  "src/webview/output.ts|feat(webview): add a bounded task output buffer that rewrites in place on carriage returns"
  "src/webview/navigation.ts|feat(webview): add screen navigation and remembered-screen state"
  "src/webview/views/dashboard.ts|feat(webview): add the main dashboard screen and task status card rendering"
  "src/webview/views/catalog.ts|feat(webview): add the searchable workflow catalog and action detail screens"
  "src/webview/views/notices.ts|feat(webview): add guided next-step notice rendering"
  "src/webview/views/prompt.ts|feat(webview): add rendering for interactive pick/input prompts relayed from running tasks"
  "src/webview/views/run.ts|feat(webview): add the task run screen with recovery links and completion actions"
  "src/webview/render.ts|feat(webview): add the top-level renderer dispatching to each screen view"
  "src/webview/messages.ts|feat(webview): add the extension-to-webview message handler"
  "src/webview/main.ts|feat(webview): add the dashboard webview entry point, rendering every screen from typed data instead of markup strings"

  # --- Phase 5: static resources ---
  "resources/icon.svg|feat: add the activity bar icon"

  # --- Phase 6: extension host test suite ---
  "test/projectInfo.test.ts|test: cover Expo project config reading"
  "test/projectCreation.test.ts|test: cover optional package selection"
  "test/processRunner.test.ts|test: cover process streaming and cancellation"
  "test/toolkitCatalog.test.ts|test: cover the workflow catalog"
  "test/toolkitArgs.test.ts|test: cover toolkit argument default resolution"
  "test/toolkitRunner.test.ts|test: cover toolkit script resolution and invocation"
  "test/promptBridge.test.ts|test: cover the interactive prompt bridge"
  "test/recovery.test.ts|test: cover recovery suggestion selection"
  "test/dashboardSecurity.test.ts|test: cover the webview command and flag allowlists"
  "test/dashboardHtml.test.ts|test: cover the dashboard HTML shell and CSP nonce"
  "test/webviewOutput.test.ts|test: cover the bounded task output buffer"
  "test/workflowContract.test.ts|test: cover that the catalog and extension-matched messages stay in sync with the toolkit scripts"

  # --- Phase 7: editor and CI config ---
  ".vscode/launch.json|chore: add an Extension Development Host launch configuration"
  ".vscode/tasks.json|chore: add the build watch task used by the launch configuration"
  ".github/workflows/ci.yml|ci: typecheck, format-check, test, and package the extension on push and pull request"

  # --- Phase 8: docs ---
  "CHANGELOG.md|docs: add the project changelog"
  "FAILURE-MODES.md|docs: document the maintained execution and validation policy"
  "README.md|docs: rewrite the README to describe the dashboard, requirements, settings, and local development workflow"

  # --- Phase 9: the script that performed this import ---
  "commit.sh|chore: add the script used to import this working tree as one sequential, per-file commit history"
)

total_entries=${#ENTRIES[@]}
echo "About to process $total_entries entries."

# ---------- generate random sleep intervals that sum to 6 hours (21600s) ----------
TARGET_TOTAL=21600  # 6 hours in seconds
num_intervals=$((total_entries - 1))

declare -a intervals=()
if (( DRY_RUN == 0 && num_intervals > 0 )); then
  # Generate `num_intervals` random weights (1..1000)
  sum=0
  weights=()
  for ((i=0; i<num_intervals; i++)); do
    w=$((RANDOM % 1000 + 1))
    weights+=($w)
    sum=$((sum + w))
  done

  # Scale each weight to the target total using integer arithmetic, then adjust the last one
  # to make the sum exact. Use `bc` for floating-point division and rounding.
  intervals=()
  cumulative=0
  for ((i=0; i<num_intervals; i++)); do
    # scale = (weight / sum) * TARGET_TOTAL, rounded to nearest integer
    # bc's scale=0 rounds down; we add 0.5 to round to nearest.
    scaled=$(echo "scale=0; (${weights[i]} * $TARGET_TOTAL + $sum/2) / $sum" | bc)
    intervals+=($scaled)
    cumulative=$((cumulative + scaled))
  done

  # Adjust the last interval so the sum is exactly TARGET_TOTAL
  diff=$((TARGET_TOTAL - cumulative))
  intervals[$((num_intervals - 1))]=$((intervals[$((num_intervals - 1))] + diff))
fi

# ---------- main loop ----------
n=0
for entry in "${ENTRIES[@]}"; do
  path="${entry%%|*}"
  message="${entry#*|}"
  n=$((n + 1))

  if [[ ! -e "$path" ]]; then
    echo "skip ($n/$total_entries): $path (not found)"
    # still sleep if not dry-run and not last entry
    if (( DRY_RUN == 0 && n < total_entries )); then
      sleep "${intervals[$((n-1))]}"
    fi
    continue
  fi

  if (( DRY_RUN )); then
    printf 'dry-run (%d/%d): %s -> %s\n' "$n" "$total_entries" "$path" "$message"
    continue
  fi

  git add -- "$path"
  if git diff --cached --quiet -- "$path"; then
    echo "skip ($n/$total_entries): $path (nothing staged, already committed)"
  else
    git commit --quiet -m "$message"
    echo "commit ($n/$total_entries): $path"
  fi

  # Sleep after every entry except the last
  if (( n < total_entries )); then
    sleep "${intervals[$((n-1))]}"
  fi
done

echo "Done."