#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: env.sh [list|get|set|pull|push|delete|exec] [common options] [ENVIRONMENT] [EAS flags]
Manage EAS project/account variables. If EAS_ENVIRONMENT is set, it is inserted
when no environment argument is provided.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-list}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag

environment=()
if [[ -n "${EAS_ENVIRONMENT:-}" && ( $# -eq 0 || "$1" == -* ) ]]; then
  environment=("$EAS_ENVIRONMENT")
fi

case "$action" in
  exec)
    # env:exec takes the command to run as its trailing argument, so nothing
    # may be appended after "$@" here.
    toolkit_eas env:exec "${environment[@]}" "$@"
    ;;
  list|get|set|pull|push|delete)
    # Without this, a run under CI reaches a prompt it cannot answer and hangs
    # or fails opaquely; the flag was computed above but never passed.
    toolkit_eas "env:$action" "${environment[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@"
    ;;
  *) toolkit_die "unknown environment action: $action" ;;
esac
