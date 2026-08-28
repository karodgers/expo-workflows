#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: project.sh ACTION [common options] [-- EAS/Expo flags]

Actions:
  inspect         Print the resolved public Expo config (default)
  info            Show linked EAS project information
  init            Create or link the EAS project
  build-config    Configure EAS Build
  update-config   Install expo-updates and configure EAS Update
  setup           Run init, build-config, and update-config
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-inspect}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag

case "$action" in
  inspect) toolkit_expo config --type public "$@" ;;
  info) toolkit_eas project:info "$@" ;;
  init) toolkit_eas project:init "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  build-config) toolkit_eas build:configure "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  update-config)
    toolkit_expo install expo-updates
    toolkit_eas update:configure "${NON_INTERACTIVE_ARGS[@]}" "$@"
    ;;
  setup)
    toolkit_eas project:init "${NON_INTERACTIVE_ARGS[@]}" "$@"
    toolkit_eas build:configure "${NON_INTERACTIVE_ARGS[@]}"
    toolkit_expo install expo-updates
    toolkit_eas update:configure "${NON_INTERACTIVE_ARGS[@]}"
    ;;
  *) toolkit_die "unknown project action: $action" ;;
esac
