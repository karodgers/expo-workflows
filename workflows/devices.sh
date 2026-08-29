#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: devices.sh [list|view|create|delete|rename] [common options] [-- EAS flags]
Manage Apple devices registered for internal distribution.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-list}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag
case "$action" in
  view) toolkit_eas device:view "$@" ;;
  list|create|delete|rename) toolkit_eas "device:$action" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown device action: $action" ;;
esac
