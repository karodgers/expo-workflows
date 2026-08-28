#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: build.sh [create|dev|list|view|cancel|delete|download|inspect|resign|run|configure|version-get|version-set|version-sync]
                [common options] [-- EAS flags]

Create defaults to EAS CLI defaults. Set EXPO_PLATFORM and EAS_PROFILE to inject
--platform and --profile without hard-coding project-specific values.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-create}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_platform_args; toolkit_profile_args

case "$action" in
  create) toolkit_eas build "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  dev) toolkit_eas build:dev "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "$@" ;;
  list|cancel) toolkit_eas "build:$action" "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  run) toolkit_eas build:run "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "$@" ;;
  view|delete|download|inspect|resign) toolkit_eas "build:$action" "$@" ;;
  configure) toolkit_eas build:configure "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  version-get) toolkit_eas build:version:get "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  version-set) toolkit_eas build:version:set "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "$@" ;;
  version-sync) toolkit_eas build:version:sync "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown build action: $action" ;;
esac
