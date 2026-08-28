#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: testflight.sh [crashes|feedback] [common options] [BUILD_ID] [EAS flags]
Inspect TestFlight crash reports or tester feedback.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-crashes}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
[[ "$action" == "crashes" || "$action" == "feedback" ]] || toolkit_die "unknown TestFlight action: $action"
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_profile_args
toolkit_eas "testflight:$action" "${PROFILE_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@"
