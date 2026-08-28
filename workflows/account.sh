#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: account.sh [status|view|usage|audit|login|logout] [common options] [EAS flags]
Inspect account usage/security or manage the current EAS login.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-status}"; (($#)) && shift
case "$action" in
  status) toolkit_eas whoami "$@" ;;
  view|usage|audit|login|logout) toolkit_eas "account:$action" "$@" ;;
  -h|--help|help) usage ;;
  *) toolkit_die "unknown account action: $action" ;;
esac
