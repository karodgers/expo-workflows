#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: channels.sh [channel|branch] ACTION [common options] [-- EAS flags]
Manage EAS Update channels or branches. Example: channels.sh channel list --json
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
kind="${1:-channel}"; (($#)) && shift
action="${1:-list}"; (($#)) && shift
[[ "$kind" == "help" || "$kind" == "-h" || "$kind" == "--help" ]] && { usage; exit 0; }
[[ "$kind" == "channel" || "$kind" == "branch" ]] || toolkit_die "kind must be channel or branch"
toolkit_enter_project
toolkit_non_interactive_flag
toolkit_eas "$kind:$action" "${NON_INTERACTIVE_ARGS[@]}" "$@"
