#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: credentials.sh [manage|configure] [common options] [-- EAS flags]
Manage signing credentials, or configure credentials for a build profile.
Set EXPO_PLATFORM and EAS_PROFILE for optional defaults.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-manage}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_platform_args; toolkit_profile_args

case "$action" in
  manage) toolkit_eas credentials "${PLATFORM_ARGS[@]}" "$@" ;;
  configure) toolkit_eas credentials:configure-build "${PLATFORM_ARGS[@]}" "${PROFILE_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown credentials action: $action" ;;
esac
