#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: sim.sh [open|availability|list|start|stop|get|exec|events]
              [common options] [EAS flags]
Manage EAS cloud simulators. `open` starts the interactive simulator command.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-open}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_platform_args

case "$action" in
  open) toolkit_eas sim "${PLATFORM_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  availability|list|start|stop|get|exec|events) toolkit_eas "sim:$action" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown simulator action: $action" ;;
esac
