#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: webhooks.sh [list|create|view|update|delete] [common options] [-- EAS flags]
Manage EAS Build and Submit webhooks.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-list}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag
case "$action" in
  list|view) toolkit_eas "webhook:$action" "$@" ;;
  create|update|delete) toolkit_eas "webhook:$action" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown webhook action: $action" ;;
esac
