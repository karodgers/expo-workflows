#!/usr/bin/env bash

# Friendly interactive entry point for the Expo Workflow Toolkit.
set -uo pipefail

TOOLKIT_SOURCE="${BASH_SOURCE[0]}"
while [[ -L "$TOOLKIT_SOURCE" ]]; do
  TOOLKIT_LINK_DIR="$(cd -P "$(dirname "$TOOLKIT_SOURCE")" && pwd)"
  TOOLKIT_SOURCE="$(readlink "$TOOLKIT_SOURCE")"
  [[ "$TOOLKIT_SOURCE" == /* ]] || TOOLKIT_SOURCE="$TOOLKIT_LINK_DIR/$TOOLKIT_SOURCE"
done
TOOLKIT_DIR="$(cd -P "$(dirname "$TOOLKIT_SOURCE")" && pwd)"
source "$TOOLKIT_DIR/lib/tui.sh"
PROJECT_DIR="${EXPO_PROJECT_DIR:-$PWD}"
CLASSIC_MODE="${EXPO_TOOLKIT_CLASSIC:-0}"
USE_COLOR=0
[[ -t 1 && -z "${NO_COLOR:-}" ]] && USE_COLOR=1

if ((USE_COLOR)); then
  BLUE=$'\033[0;34m'; GREEN=$'\033[0;32m'; YELLOW=$'\033[1;33m'; RED=$'\033[0;31m'; BOLD=$'\033[1m'; RESET=$'\033[0m'
else
  BLUE=''; GREEN=''; YELLOW=''; RED=''; BOLD=''; RESET=''
fi

usage() {
  cat <<'EOF'
Usage: run.sh [--project DIR] [--dry-run] [--classic]
       run.sh gui [--project DIR]

Open the guided Expo workflow menu. The project defaults to the current folder.
Use --dry-run to preview every underlying command without executing it.
Use --classic for the numbered, non-full-screen menu.
Use gui to open the current project in VS Code for the Nova Expo extension.
EOF
}

if [[ "${1:-}" == '--version' ]]; then
  node -p "require('$TOOLKIT_DIR/package.json').version"
  exit 0
fi
if [[ "${1:-}" == 'version' ]]; then
  shift
  exec "$TOOLKIT_DIR/version.sh" status --project "$PROJECT_DIR" "$@"
fi
if [[ "${1:-}" == 'update' ]]; then
  shift
  exec "$TOOLKIT_DIR/version.sh" update "$@"
fi
if [[ "${1:-}" == 'gui' ]]; then
  shift
  exec "$TOOLKIT_DIR/gui.sh" "$@"
fi

while (($#)); do
  case "$1" in
    --project) (($# >= 2)) || { printf 'error: --project needs a directory\n' >&2; exit 2; }; PROJECT_DIR="$2"; shift 2 ;;
    --project=*) PROJECT_DIR="${1#*=}"; shift ;;
    --dry-run) export EXPO_TOOLKIT_DRY_RUN=1; shift ;;
    --classic) CLASSIC_MODE=1; shift ;;
    -h|--help|help) usage; exit 0 ;;
    *) printf 'error: unknown option: %s\n' "$1" >&2; usage; exit 2 ;;
  esac
done

PROJECT_DIR="$(cd "$PROJECT_DIR" 2>/dev/null && pwd || printf '%s' "$PROJECT_DIR")"
tui_initialize "$PROJECT_DIR" "$TOOLKIT_DIR" "$CLASSIC_MODE"

heading() {
  if ((TUI_MODE == 1)); then tui_task_start "$1"; else printf '\n%s%s%s\n' "$BOLD" "$1" "$RESET"; fi
}
info() { printf '%s%s%s\n' "$BLUE" "$1" "$RESET"; }
success() {
  if ((TUI_MODE == 1)); then tui_task_result success "$1"; else printf '%s✓ %s%s\n' "$GREEN" "$1" "$RESET"; fi
}
warn() {
  if ((TUI_MODE == 1)); then tui_task_result warning "$1" >&2; else printf '%s! %s%s\n' "$YELLOW" "$1" "$RESET" >&2; fi
}
error() {
  if ((TUI_MODE == 1)); then tui_task_result error "$1" >&2; else printf '%s✗ %s%s\n' "$RED" "$1" "$RESET" >&2; fi
}

choose() {
  local prompt="$1"
  local answer
  shift
  if ((TUI_MODE == 1)); then
    tui_menu "$prompt" "$@" || return $?
    CHOICE="$TUI_CHOICE"
    return 0
  fi
  while true; do
    printf '\n%s\n' "$prompt"
    local index=1
    local option
    for option in "$@"; do
      printf '  %d) %s\n' "$index" "$option"
      index=$((index + 1))
    done
    printf '> '
    IFS= read -r answer || return 130
    if [[ "$answer" =~ ^[0-9]+$ ]] && ((answer >= 1 && answer <= $#)); then
      CHOICE="$answer"
      return 0
    fi
    warn "Choose a number from 1 to $#."
  done
}

ask() {
  local prompt="$1"
  local default="${2:-}"
  local answer
  if ((TUI_MODE == 1)); then
    tui_prompt "$prompt" "$default" || return $?
    ANSWER="$TUI_ANSWER"
    return 0
  fi
  if [[ -n "$default" ]]; then
    printf '%s [%s]: ' "$prompt" "$default"
  else
    printf '%s: ' "$prompt"
  fi
  IFS= read -r answer || return 130
  ANSWER="${answer:-$default}"
}

ask_required() {
  local prompt="$1"
  local default="${2:-}"
  while true; do
    ask "$prompt" "$default" || return $?
    [[ -n "$ANSWER" ]] && return 0
    warn "This value is required."
  done
}

ask_secret() {
  local prompt="$1"
  if ((TUI_MODE == 1)); then
    tui_prompt "$prompt" '' 1 || return $?
    ANSWER="$TUI_ANSWER"
    [[ -n "$ANSWER" ]] || { warn "This value is required."; ask_secret "$prompt"; }
    return
  fi
  printf '%s: ' "$prompt"
  if [[ -t 0 ]]; then
    IFS= read -rs ANSWER || return 130
    printf '\n'
  else
    IFS= read -r ANSWER || return 130
  fi
  [[ -n "$ANSWER" ]] || { warn "This value is required."; ask_secret "$prompt"; }
}

confirm() {
  local prompt="$1"
  local default="${2:-no}"
  if ((TUI_MODE == 1)); then
    tui_confirm "$prompt" "$default"
    return $?
  fi
  local suffix='y/N'
  [[ "$default" == 'yes' ]] && suffix='Y/n'
  local answer
  printf '%s [%s]: ' "$prompt" "$suffix"
  IFS= read -r answer || return 1
  answer="${answer:-$default}"
  [[ "$answer" =~ ^[Yy]([Ee][Ss])?$ ]]
}

pause_menu() {
  [[ "${EXPO_TOOLKIT_NO_PAUSE:-0}" == '1' ]] && return 0
  if ((TUI_MODE == 1)); then tui_pause; return; fi
  printf '\nPress Enter to return to the menu...'
  IFS= read -r _ || true
}

validate_project() {
  while true; do
    if [[ -d "$PROJECT_DIR" && -f "$PROJECT_DIR/package.json" ]] && (
      cd "$PROJECT_DIR" && node -e "const p=require('./package.json'); process.exit(p.dependencies?.expo || p.devDependencies?.expo ? 0 : 1)" 2>/dev/null
    ); then
      PROJECT_DIR="$(cd "$PROJECT_DIR" && pwd)"
      tui_refresh_context "$PROJECT_DIR"
      return 0
    fi
    error "This does not look like an Expo project: $PROJECT_DIR"
    ask "Expo project folder" "$PWD" || return 1
    PROJECT_DIR="$ANSWER"
  done
}

run_task() {
  local label="$1"
  local script="$2"
  shift 2
  heading "$label"
  "$TOOLKIT_DIR/$script" "$@" --project "$PROJECT_DIR"
  local status=$?
  if ((status == 0)); then
    success "$label completed."
  elif ((status == 130)); then
    warn "$label was cancelled. Nothing else was started."
  else
    error "$label did not complete (exit $status)."
    printf 'Review the message above, then retry. For command details run: %s/%s --help\n' "$TOOLKIT_DIR" "$script"
  fi
  return "$status"
}

CLOUD_READY=0
ensure_cloud_login() {
  ((CLOUD_READY == 1)) && return 0
  heading "Checking your Expo account"
  "$TOOLKIT_DIR/auth.sh" status
  if (($? == 0)); then
    CLOUD_READY=1
    return 0
  fi
  warn "Expo cloud services need an Expo account."
  choose "What would you like to do?" "Sign in now" "Go back" || return 1
  ((CHOICE == 1)) || return 1
  "$TOOLKIT_DIR/auth.sh" login
  if (($? != 0)); then
    error "Sign-in failed. Check your connection and credentials, then try again."
    return 1
  fi
  CLOUD_READY=1
}

load_profiles() {
  local section="$1"
  PROFILES=()
  if [[ -f "$PROJECT_DIR/eas.json" ]]; then
    while IFS= read -r profile; do
      [[ -n "$profile" ]] && PROFILES+=("$profile")
    done < <(cd "$PROJECT_DIR" && node -e "try { const e=require('./eas.json'); console.log(Object.keys(e[process.argv[1]] || {}).join('\\n')) } catch {}" "$section")
  fi
  if ((${#PROFILES[@]} == 0)); then
    if [[ "$section" == 'build' ]]; then PROFILES=(development preview production); else PROFILES=(production); fi
  fi
}

profile_label() {
  case "$1" in
    development) printf 'Development — install on your own device' ;;
    preview) printf 'Preview — share with testers' ;;
    production) printf 'Production — app stores' ;;
    *) printf '%s — custom project preset' "$1" ;;
  esac
}

choose_profile() {
  local section="$1"
  load_profiles "$section"
  local labels=()
  local profile
  for profile in "${PROFILES[@]}"; do labels+=("$(profile_label "$profile")"); done
  choose "Which setup should be used?" "${labels[@]}" || return 1
  SELECTED_PROFILE="${PROFILES[$((CHOICE - 1))]}"
}

choose_platform() {
  local allow_both="${1:-no}"
  if [[ "$allow_both" == 'yes' ]]; then
    choose "Which devices?" "Android" "iPhone / iPad" "Both" || return 1
    case "$CHOICE" in 1) SELECTED_PLATFORM=android ;; 2) SELECTED_PLATFORM=ios ;; 3) SELECTED_PLATFORM=all ;; esac
  else
    choose "Which devices?" "Android" "iPhone / iPad" || return 1
    [[ "$CHOICE" == 1 ]] && SELECTED_PLATFORM=android || SELECTED_PLATFORM=ios
  fi
}

ensure_eas_file() {
  [[ -f "$PROJECT_DIR/eas.json" ]] && return 0
  warn "Cloud builds are not configured yet."
  choose "Configure them now?" "Yes, configure cloud builds" "Go back" || return 1
  ((CHOICE == 1)) || return 1
  run_task "Configure cloud builds" project.sh build-config
}

setup_variants() {
  local app_id
  app_id="$(cd "$PROJECT_DIR" && node -e "const a=require('./app.json').expo||require('./app.json'); process.stdout.write(a.android?.package || a.ios?.bundleIdentifier || '')" 2>/dev/null)"
  if [[ -z "$app_id" ]]; then
    ask_required "Production application ID (for example com.acme.myapp)" || return
    app_id="$ANSWER"
  fi
  run_task "Configure app environments" variants.sh setup --app-id "$app_id"
}

menu_notifications() {
  choose "Push notifications" "Prepare notification code" "Configure Apple/Google credentials" "Send a test notification" "Go back" || return
  case "$CHOICE" in
    1) run_task "Prepare notification code" notifications.sh setup ;;
    2) choose_platform no && run_task "Configure notification credentials" notifications.sh credentials --platform "$SELECTED_PLATFORM" ;;
    3)
      ask_required "Expo push token from the running app" || return
      local token="$ANSWER"
      ask "Notification title" "Nova test" || return
      local title="$ANSWER"
      ask "Notification message" "Push notifications are working." || return
      run_task "Send test notification" notifications.sh test --token "$token" --title "$title" --body "$ANSWER"
      ;;
    4) return ;;
  esac
}

setup_store_information() {
  local title
  title="$(cd "$PROJECT_DIR" && node -e "const a=require('./app.json').expo||require('./app.json'); process.stdout.write(a.name || require('./package.json').name)")"
  ask_required "App-store title" "$title" || return
  title="$ANSWER"
  ask_required "Support website URL" || return
  local support_url="$ANSWER"
  ask_required "Privacy policy URL" || return
  local privacy_url="$ANSWER"
  ask "Short app description" "$title mobile application." || return
  local description="$ANSWER"
  ask "Search keywords, separated by commas" "mobile" || return
  run_task "Create app-store information" store.sh setup \
    --title "$title" \
    --support-url "$support_url" \
    --privacy-url "$privacy_url" \
    --description "$description" \
    --keywords "$ANSWER"
}

menu_check() {
  choose "How thoroughly should the project be checked?" \
    "Quick health check" \
    "Fix Expo package versions, then check" \
    "Run every Nova validation" \
    "Go back" || return
  case "$CHOICE" in
    1) run_task "Project health check" doctor.sh check ;;
    2) run_task "Repair and check project" doctor.sh fix ;;
    3) run_task "Full Nova validation" doctor.sh validate ;;
    4) return ;;
  esac
  pause_menu
}

menu_start() {
  choose "Where do you want to open the app?" \
    "Choose from the Expo developer screen" \
    "Android" \
    "iPhone / iPad" \
    "Web browser" \
    "A custom development build" \
    "Go back" || return
  case "$CHOICE" in
    1) run_task "Start Expo" dev.sh start ;;
    2) run_task "Start on Android" dev.sh android ;;
    3) run_task "Start on iPhone / iPad" dev.sh ios ;;
    4) run_task "Start in the browser" dev.sh web ;;
    5) run_task "Start development build" dev.sh client ;;
    6) return ;;
  esac
  pause_menu
}

menu_setup() {
  ensure_cloud_login || return
  choose "What needs to be set up?" \
    "Everything recommended" \
    "Connect this app to Expo" \
    "Development, preview, and production environments" \
    "Cloud builds" \
    "Small over-the-air updates" \
    "Team automation recipes" \
    "Push notifications" \
    "Go back" || return
  case "$CHOICE" in
    1)
      run_task "Connect app to Expo" project.sh init || { pause_menu; return; }
      run_task "Configure cloud builds" project.sh build-config || { pause_menu; return; }
      setup_variants || { pause_menu; return; }
      run_task "Enable over-the-air updates" project.sh update-config || { pause_menu; return; }
      run_task "Install and validate team automation recipes" workflow-templates.sh install --validate
      ;;
    2) run_task "Connect app to Expo" project.sh init ;;
    3) setup_variants ;;
    4) run_task "Configure cloud builds" project.sh build-config ;;
    5)
      info "A new native build is required after enabling over-the-air updates."
      run_task "Enable over-the-air updates" project.sh update-config
      ;;
    6) run_task "Install and validate team automation recipes" workflow-templates.sh install --validate ;;
    7) menu_notifications ;;
    8) return ;;
  esac
  pause_menu
}

menu_build() {
  ensure_cloud_login || return
  choose "What do you need?" \
    "Create a new installable app build" \
    "Install the latest development build" \
    "See recent builds" \
    "Go back" || return
  case "$CHOICE" in
    1)
      ensure_eas_file || return
      choose_platform yes || return
      choose_profile build || return
      if [[ "$SELECTED_PROFILE" == 'production' ]]; then
        run_task "Production safety check" release-check.sh build --profile "$SELECTED_PROFILE" --platform "$SELECTED_PLATFORM" || { pause_menu; return; }
      fi
      run_task "Create $SELECTED_PROFILE build" build.sh create --platform "$SELECTED_PLATFORM" --profile "$SELECTED_PROFILE"
      ;;
    2)
      choose_platform no || return
      choose_profile build || return
      run_task "Install latest development build" build.sh run --platform "$SELECTED_PLATFORM" --profile "$SELECTED_PROFILE" --latest
      ;;
    3) run_task "Recent builds" build.sh list ;;
    4) return ;;
  esac
  pause_menu
}

updates_enabled() {
  (cd "$PROJECT_DIR" && node -e "const p=require('./package.json'); process.exit(p.dependencies?.['expo-updates'] || p.devDependencies?.['expo-updates'] ? 0 : 1)" 2>/dev/null)
}

load_channels() {
  CHANNELS=()
  if [[ -f "$PROJECT_DIR/eas.json" ]]; then
    while IFS= read -r channel; do
      [[ -n "$channel" ]] && CHANNELS+=("$channel")
    done < <(cd "$PROJECT_DIR" && node -e "try { const e=require('./eas.json'); console.log([...new Set(Object.values(e.build||{}).map(x=>x.channel).filter(Boolean))].join('\\n')) } catch {}")
  fi
  ((${#CHANNELS[@]})) || CHANNELS=(development preview production)
}

release_update() {
  if ! updates_enabled; then
    warn "Small updates are not enabled for this app."
    choose "What would you like to do?" "Enable them now" "Go back" || return
    ((CHOICE == 1)) || return
    run_task "Enable over-the-air updates" project.sh update-config || return
    info "Create a new native build before publishing the first update."
  fi
  load_channels
  choose "Who should receive the update?" "${CHANNELS[@]}" || return
  local channel="${CHANNELS[$((CHOICE - 1))]}"
  choose "Which saved environment values should be used?" "Development" "Preview" "Production" || return
  local environment
  case "$CHOICE" in 1) environment=development ;; 2) environment=preview ;; 3) environment=production ;; esac
  local default_message='App update'
  default_message="$(cd "$PROJECT_DIR" && git log -1 --pretty=%s 2>/dev/null)" || default_message='App update'
  [[ -n "$default_message" ]] || default_message='App update'
  ask_required "Short description of this update" "$default_message" || return
  local message="$ANSWER"
  local rollout_args=()
  if [[ "$channel" == 'production' ]]; then
    run_task "Production update safety check" release-check.sh update --profile production --platform all || return
    choose "How many users should receive it first?" "10% (safest)" "25%" "Everyone" "Go back" || return
    case "$CHOICE" in
      1) rollout_args=(--rollout-percentage 10) ;;
      2) rollout_args=(--rollout-percentage 25) ;;
      3) rollout_args=() ;;
      4) return ;;
    esac
  fi
  run_task "Publish small update" update.sh publish --channel "$channel" --environment "$environment" --message "$message" "${rollout_args[@]}"
}

release_submit() {
  ensure_eas_file || return
  choose_platform no || return
  choose_profile submit || return
  if [[ "$SELECTED_PROFILE" == 'production' ]]; then
    run_task "App-store safety check" release-check.sh submit --profile "$SELECTED_PROFILE" --platform "$SELECTED_PLATFORM" || return
  fi
  choose "Which build should be sent?" "Latest completed build" "A file on this computer" "A build ID" "Go back" || return
  local source_args=()
  case "$CHOICE" in
    1) source_args=(--latest) ;;
    2) ask_required "Path to the .aab, .apk, or .ipa file" || return; source_args=(--path "$ANSWER") ;;
    3) ask_required "EAS build ID" || return; source_args=(--id "$ANSWER") ;;
    4) return ;;
  esac
  run_task "Send build to the app store" submit.sh create --platform "$SELECTED_PLATFORM" --profile "$SELECTED_PROFILE" "${source_args[@]}"
}

menu_release() {
  ensure_cloud_login || return
  choose "What do you want to release?" \
    "A small JavaScript/design update" \
    "An app build to Google Play or App Store" \
    "The web app" \
    "Check production readiness" \
    "Roll back a bad small update" \
    "Go back" || return
  case "$CHOICE" in
    1) release_update ;;
    2) release_submit ;;
    3)
      choose "Where should the website go?" "Preview link" "Production website" "Go back" || return
      case "$CHOICE" in
        1) run_task "Deploy website preview" deploy.sh preview ;;
        2) run_task "Deploy production website" deploy.sh production ;;
        3) return ;;
      esac
      ;;
    4)
      choose "What are you preparing?" "A production build" "App-store submission" "Small production update" || return
      case "$CHOICE" in
        1) run_task "Full production build check" release-check.sh build --full ;;
        2) run_task "Full app-store check" release-check.sh submit --full ;;
        3) run_task "Full production update check" release-check.sh update --full ;;
      esac
      ;;
    5)
      confirm "Start the guided EAS rollback?" || return
      run_task "Roll back update" update.sh rollback
      ;;
    6) return ;;
  esac
  pause_menu
}

choose_environment() {
  choose "Which environment?" "Development" "Preview" "Production" || return 1
  case "$CHOICE" in 1) SELECTED_ENVIRONMENT=development ;; 2) SELECTED_ENVIRONMENT=preview ;; 3) SELECTED_ENVIRONMENT=production ;; esac
}

menu_environment() {
  ensure_cloud_login || return
  choose "What do you want to do with saved values and secrets?" \
    "See variable names" \
    "Add or change a value" \
    "Download values into a local .env file" \
    "Upload a local .env file" \
    "Delete a value" \
    "Go back" || return
  local action="$CHOICE"
  ((action == 6)) && return
  choose_environment || return
  case "$action" in
    1) run_task "Environment values" env.sh list "$SELECTED_ENVIRONMENT" ;;
    2)
      ask_required "Variable name (for example EXPO_PUBLIC_API_URL)" || return
      local name="$ANSWER"
      [[ "$name" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || { error "Use letters, numbers, and underscores; the first character cannot be a number."; return; }
      choose "Who may see the value?" "Plain text (safe public configuration)" "Sensitive (hidden in most views)" "Secret (never displayed again)" || return
      local visibility
      case "$CHOICE" in 1) visibility=plaintext ;; 2) visibility=sensitive ;; 3) visibility=secret ;; esac
      ask_secret "Value" || return
      local value="$ANSWER"
      run_task "Save $name" env.sh set "$SELECTED_ENVIRONMENT" --name "$name" --value "$value" --visibility "$visibility" --type string --non-interactive
      ;;
    3)
      ask "Local file" ".env.local" || return
      if [[ -e "$PROJECT_DIR/$ANSWER" ]] && ! confirm "$ANSWER already exists. Replace it?"; then return; fi
      run_task "Download environment values" env.sh pull "$SELECTED_ENVIRONMENT" --path "$ANSWER" --non-interactive
      ;;
    4)
      ask "Local file" ".env.local" || return
      [[ -f "$PROJECT_DIR/$ANSWER" ]] || { error "File not found: $ANSWER"; return; }
      confirm "Upload values from $ANSWER? Existing matching values may change." || return
      run_task "Upload environment values" env.sh push "$SELECTED_ENVIRONMENT" --path "$ANSWER" --force
      ;;
    5)
      ask_required "Variable name to delete" || return
      local name="$ANSWER"
      confirm "Delete $name from $SELECTED_ENVIRONMENT?" || return
      run_task "Delete $name" env.sh delete "$SELECTED_ENVIRONMENT" --variable-name "$name" --non-interactive
      ;;
  esac
  pause_menu
}

load_workflows() {
  WORKFLOW_FILES=()
  local file
  for file in "$PROJECT_DIR"/.eas/workflows/*.yml "$PROJECT_DIR"/.eas/workflows/*.yaml; do
    [[ -f "$file" ]] && WORKFLOW_FILES+=("${file##*/}")
  done
}

menu_workflow() {
  ensure_cloud_login || return
  choose "What should cloud automation do?" \
    "Run an existing workflow" \
    "Create a workflow" \
    "See recent workflow runs" \
    "Go back" || return
  case "$CHOICE" in
    1)
      load_workflows
      if ((${#WORKFLOW_FILES[@]} == 0)); then
        warn "No workflow files were found in .eas/workflows/."
        return
      fi
      choose "Which workflow?" "${WORKFLOW_FILES[@]}" || return
      run_task "Run ${WORKFLOW_FILES[$((CHOICE - 1))]}" workflow.sh run "${WORKFLOW_FILES[$((CHOICE - 1))]}" --wait
      ;;
    2)
      choose "What should the new workflow do?" "Build apps" "Publish small updates" "Release to production" "Start empty" || return
      local template
      case "$CHOICE" in 1) template=build ;; 2) template=update ;; 3) template=deploy ;; 4) template=custom ;; esac
      run_task "Create $template workflow" workflow.sh create --template "$template"
      ;;
    3) run_task "Recent workflow runs" workflow.sh runs ;;
    4) return ;;
  esac
  pause_menu
}

menu_more() {
  choose "More Expo tools" \
    "Signing certificates and keys" \
    "App-store information" \
    "Update channels" \
    "Registered Apple devices" \
    "App health and usage data" \
    "Remote test device" \
    "Toolkit version and updates" \
    "Back" || return
  case "$CHOICE" in
    1) ensure_cloud_login && choose_platform no && run_task "Signing credentials" credentials.sh manage --platform "$SELECTED_PLATFORM" ;;
    2)
      if [[ -f "$PROJECT_DIR/store.config.json" ]]; then
        run_task "Check app-store information" metadata.sh lint
      else
        setup_store_information
      fi
      ;;
    3) ensure_cloud_login && run_task "Update channels" channels.sh channel list ;;
    4) ensure_cloud_login && run_task "Registered Apple devices" devices.sh list ;;
    5) ensure_cloud_login && run_task "App versions" observe.sh versions ;;
    6) ensure_cloud_login && choose_platform no && run_task "Start remote test device" sim.sh open --platform "$SELECTED_PLATFORM" ;;
    7)
      run_task "Toolkit versions" version.sh status
      choose "Toolkit maintenance" "Check for an update" "Install the latest version" "Back" || return
      case "$CHOICE" in
        1) run_task "Check toolkit version" version.sh check ;;
        2) confirm "Update the globally installed toolkit?" && run_task "Update toolkit" version.sh update ;;
      esac
      ;;
    8) return ;;
  esac
  pause_menu
}

main() {
  validate_project || exit 1
  if ((TUI_MODE == 0)); then
    printf '\n%sExpo Workflow Assistant%s\n' "$BOLD" "$RESET"
    printf 'Project: %s\n' "$PROJECT_DIR"
    [[ "${EXPO_TOOLKIT_DRY_RUN:-0}" == '1' ]] && warn "Dry run is on; commands will only be shown."
  fi

  while true; do
    choose "What would you like to do?" \
      "Check or repair the project" \
      "Start the app" \
      "Set up Expo cloud services" \
      "Build or install the app" \
      "Release or publish the app" \
      "Manage saved values and secrets" \
      "Run cloud automation" \
      "More Expo tools" \
      "Exit" || { printf '\n'; break; }
    case "$CHOICE" in
      1) menu_check ;;
      2) menu_start ;;
      3) menu_setup ;;
      4) menu_build ;;
      5) menu_release ;;
      6) menu_environment ;;
      7) menu_workflow ;;
      8) menu_more ;;
      9) break ;;
    esac
  done
  if ((TUI_MODE == 1)); then
    tui_clear
    tui_header
    printf '\n%s  ✓  See you next time.%s\n\n' "$TUI_SUCCESS" "$TUI_RESET"
  else
    printf '\nGoodbye.\n'
  fi
}

trap 'tui_restore' EXIT
trap 'tui_restore; warn "Cancelled. Returning to the menu when possible."' INT
main
