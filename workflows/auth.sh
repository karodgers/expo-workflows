#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: auth.sh [status|login|logout] [common options] [-- EAS flags]
Manage the Expo account used by EAS. Defaults to status.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-status}"; (($#)) && shift
case "$action" in
  status) toolkit_eas whoami "$@" ;;
  login|logout) toolkit_eas "$action" "$@" ;;
  -h|--help|help) usage ;;
  *) toolkit_die "unknown auth action: $action" ;;
esac
