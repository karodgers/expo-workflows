#!/usr/bin/env bash

# Shared runtime for every Expo Toolkit workflow.
# shellcheck shell=bash

set -Eeuo pipefail

TOOLKIT_LIB_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TOOLKIT_DIR="$(cd "$TOOLKIT_LIB_DIR/.." && pwd)"
TOOLKIT_PROJECT_DIR="${EXPO_PROJECT_DIR:-$PWD}"
TOOLKIT_DRY_RUN="${EXPO_TOOLKIT_DRY_RUN:-0}"
TOOLKIT_NON_INTERACTIVE="${EXPO_TOOLKIT_NON_INTERACTIVE:-${CI:-0}}"
TOOLKIT_ARGS=()

toolkit_die() {
  printf 'error: %s\n' "$*" >&2
  exit 1
}

toolkit_note() {
  printf '==> %s\n' "$*"
}

toolkit_parse_common() {
  TOOLKIT_ARGS=()
  while (($#)); do
    case "$1" in
      --project)
        (($# >= 2)) || toolkit_die "--project requires a directory"
        TOOLKIT_PROJECT_DIR="$2"
        shift 2
        ;;
      --project=*)
        TOOLKIT_PROJECT_DIR="${1#*=}"
        shift
        ;;
      --dry-run)
        TOOLKIT_DRY_RUN=1
        shift
        ;;
      --non-interactive)
        TOOLKIT_NON_INTERACTIVE=1
        shift
        ;;
      --interactive)
        TOOLKIT_NON_INTERACTIVE=0
        shift
        ;;
      --)
        shift
        while (($#)); do
          TOOLKIT_ARGS+=("$1")
          shift
        done
        ;;
      *)
        TOOLKIT_ARGS+=("$1")
        shift
        ;;
    esac
  done
}

toolkit_enter_project() {
  [[ -d "$TOOLKIT_PROJECT_DIR" ]] || toolkit_die "project directory not found: $TOOLKIT_PROJECT_DIR"
  cd "$TOOLKIT_PROJECT_DIR"
  [[ -f package.json ]] || toolkit_die "package.json not found in $TOOLKIT_PROJECT_DIR"

  if ! node -e "const p=require('./package.json'); process.exit(p.dependencies?.expo || p.devDependencies?.expo ? 0 : 1)"; then
    toolkit_die "package.json does not declare Expo"
  fi
}

toolkit_quote_command() {
  local redact_next=0
  local arg
  printf '+'
  for arg in "$@"; do
    if ((redact_next)); then
      printf ' %q' '***'
      redact_next=0
      continue
    fi
    case "$arg" in
      --value|--secret|--token|--password)
        printf ' %q' "$arg"
        redact_next=1
        ;;
      --value=*|--secret=*|--token=*|--password=*)
        printf ' %q' "${arg%%=*}=***"
        ;;
      *) printf ' %q' "$arg" ;;
    esac
  done
  printf '\n'
}

toolkit_run() {
  toolkit_quote_command "$@"
  if [[ "$TOOLKIT_DRY_RUN" == "1" ]]; then
    return 0
  fi
  "$@"
}

# Version range a bundled tool is installed at when it is not already present in
# the project. Pinning keeps an unattended `npx --yes` from fetching a newly
# published major; both lookups stay overridable through the environment.
toolkit_pinned_version() {
  node -p "require('$TOOLKIT_DIR/package.json').nova?.pinned?.['$1'] ?? 'latest'"
}

toolkit_resolve_expo() {
  if [[ -n "${EXPO_TOOLKIT_EXPO_BIN:-}" ]]; then
    EXPO_CMD=("$EXPO_TOOLKIT_EXPO_BIN")
  elif [[ -x node_modules/.bin/expo ]]; then
    EXPO_CMD=("$PWD/node_modules/.bin/expo")
  else
    EXPO_CMD=(npx --no-install expo)
  fi
}

toolkit_resolve_eas() {
  if [[ -n "${EXPO_TOOLKIT_EAS_BIN:-}" ]]; then
    EAS_CMD=("$EXPO_TOOLKIT_EAS_BIN")
  elif [[ -x node_modules/.bin/eas ]]; then
    EAS_CMD=("$PWD/node_modules/.bin/eas")
  elif command -v eas >/dev/null 2>&1; then
    EAS_CMD=(eas)
  else
    EAS_CMD=(npx --yes "eas-cli@${EAS_CLI_VERSION:-$(toolkit_pinned_version easCli)}")
  fi
}

toolkit_expo() {
  toolkit_resolve_expo
  toolkit_run "${EXPO_CMD[@]}" "$@"
}

toolkit_eas() {
  toolkit_resolve_eas
  toolkit_run "${EAS_CMD[@]}" "$@"
}

toolkit_npx() {
  toolkit_run npx --yes "$@"
}

toolkit_expo_doctor() {
  toolkit_npx "expo-doctor@${EXPO_DOCTOR_VERSION:-$(toolkit_pinned_version expoDoctor)}" "$@"
}

toolkit_non_interactive_flag() {
  NON_INTERACTIVE_ARGS=()
  if [[ "$TOOLKIT_NON_INTERACTIVE" == "1" || "$TOOLKIT_NON_INTERACTIVE" == "true" ]]; then
    NON_INTERACTIVE_ARGS=(--non-interactive)
  fi
}

toolkit_platform_args() {
  PLATFORM_ARGS=()
  if [[ -n "${EXPO_PLATFORM:-}" ]]; then
    PLATFORM_ARGS=(--platform "$EXPO_PLATFORM")
  fi
}

toolkit_profile_args() {
  PROFILE_ARGS=()
  if [[ -n "${EAS_PROFILE:-}" ]]; then
    PROFILE_ARGS=(--profile "$EAS_PROFILE")
  fi
}

toolkit_environment_args() {
  ENVIRONMENT_ARGS=()
  if [[ -n "${EAS_ENVIRONMENT:-}" ]]; then
    ENVIRONMENT_ARGS=(--environment "$EAS_ENVIRONMENT")
  fi
}

toolkit_resolve_workflow_file() {
  local file="$1"
  if [[ "$file" != */* ]]; then
    file=".eas/workflows/$file"
  fi
  printf '%s\n' "$file"
}

toolkit_common_help() {
  cat <<'EOF'
Common options (accepted by every script):
  --project DIR          Expo project directory (default: current directory)
  --dry-run              Print commands without executing them
  --non-interactive      Add EAS non-interactive mode where supported
  --interactive          Disable CI-derived non-interactive mode

Shared environment:
  EXPO_PROJECT_DIR, EXPO_PLATFORM, EAS_PROFILE, EAS_ENVIRONMENT
  EXPO_TOOLKIT_DRY_RUN, EXPO_TOOLKIT_NON_INTERACTIVE
  EAS_CLI_VERSION, EXPO_DOCTOR_VERSION (default to the pinned toolkit ranges)
  EXPO_TOOLKIT_EXPO_BIN, EXPO_TOOLKIT_EAS_BIN
EOF
}
