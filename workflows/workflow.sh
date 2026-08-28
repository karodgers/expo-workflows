#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: workflow.sh ACTION [common options] [FILE|ID] [EAS flags]

Actions:
  create           Create a workflow (supports --template build|update|deploy|custom)
  run              Run a workflow file
  validate         Validate a workflow file
  runs, logs, view, status, cancel

Bare filenames for run/validate resolve under .eas/workflows/.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-runs}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag

case "$action" in
  create) toolkit_eas workflow:create "$@" ;;
  run|validate)
    (($#)) || toolkit_die "$action requires a workflow filename"
    file="$(toolkit_resolve_workflow_file "$1")"; shift
    toolkit_eas "workflow:$action" "$file" "${NON_INTERACTIVE_ARGS[@]}" "$@"
    ;;
  list) toolkit_eas workflow:runs "$@" ;;
  runs|logs|view|status|cancel) toolkit_eas "workflow:$action" "$@" ;;
  *) toolkit_die "unknown workflow action: $action" ;;
esac
