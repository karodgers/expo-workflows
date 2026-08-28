#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: submit.sh [create|list|view|status|cancel|retry] [common options] [-- EAS flags]
Submit a build or manage submissions. Set EXPO_PLATFORM and EAS_PROFILE for defaults.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-create}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_platform_args; toolkit_profile_args

case "$action" in
  create) toolkit_eas submit "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  list|cancel|retry) toolkit_eas "submit:$action" "${PLATFORM_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  status) toolkit_eas submit:status "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  view) toolkit_eas submit:view "${PLATFORM_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown submit action: $action" ;;
esac
