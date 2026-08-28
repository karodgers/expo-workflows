#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: observe.sh [versions|events|metrics|metrics-summary|routes|session]
                  [common options] [EAS flags]
Query EAS application observability data. Defaults to versions.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-versions}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
case "$action" in
  versions|events|metrics|metrics-summary|routes|session) ;;
  *) toolkit_die "unknown observe action: $action" ;;
esac
toolkit_enter_project
toolkit_non_interactive_flag
toolkit_eas "observe:$action" "${NON_INTERACTIVE_ARGS[@]}" "$@"
