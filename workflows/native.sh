#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: native.sh [prebuild|android|ios] [common options] [-- Expo flags]
Generate native projects or compile and run one locally. Defaults to prebuild.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-prebuild}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project

case "$action" in
  prebuild) toolkit_expo prebuild "$@" ;;
  android) toolkit_expo run:android "$@" ;;
  ios) toolkit_expo run:ios "$@" ;;
  *) toolkit_die "unknown native action: $action" ;;
esac
