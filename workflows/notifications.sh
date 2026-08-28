#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: notifications.sh [setup|credentials|test] [common options] [flags]
Scaffold notification permission/token handling, open FCM/APNs credentials, or
send a test through Expo Push Service.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-setup}"; (($#)) && shift
[[ "$action" == help || "$action" == -h || "$action" == --help ]] && { usage; exit 0; }
toolkit_enter_project

case "$action" in
  setup)
    toolkit_expo install expo-notifications expo-device expo-constants
    toolkit_run node "$SCRIPT_DIR/lib/project-config.js" notifications --project "$PWD" "$@"
    ;;
  credentials)
    toolkit_platform_args
    toolkit_eas credentials "${PLATFORM_ARGS[@]}" "$@"
    ;;
  test)
    toolkit_run node "$SCRIPT_DIR/lib/send-push.js" "$@"
    ;;
  *) toolkit_die "unknown notifications action: $action" ;;
esac
