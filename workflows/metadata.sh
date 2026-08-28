#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: metadata.sh [lint|pull|push] [common options] [-- EAS flags]
Validate, download, or upload app-store metadata. EAS_PROFILE is optional.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-lint}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_profile_args

case "$action" in
  lint) toolkit_eas metadata:lint "${PROFILE_ARGS[@]}" "$@" ;;
  pull|push) toolkit_eas "metadata:$action" "${PROFILE_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown metadata action: $action" ;;
esac
