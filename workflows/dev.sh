#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: dev.sh [start|go|client|android|ios|web] [common options] [-- Expo flags]
Start Metro for the desired Expo runtime. Defaults to start.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-start}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project

case "$action" in
  start) toolkit_expo start "$@" ;;
  go) toolkit_expo start --go "$@" ;;
  client) toolkit_expo start --dev-client "$@" ;;
  android|ios|web) toolkit_expo start "--$action" "$@" ;;
  *) toolkit_die "unknown dev action: $action" ;;
esac
