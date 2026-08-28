#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: update.sh ACTION [common options] [-- EAS flags]

Actions:
  publish (default)   Publish an OTA update
  configure           Install expo-updates and configure EAS Update
  list, view, delete, edit, republish, rollback, insights
  roll-back-to-embedded, revert-update-rollout

For publish, EXPO_PLATFORM, EAS_UPDATE_BRANCH, EAS_UPDATE_CHANNEL, and
EAS_UPDATE_MESSAGE provide optional defaults. Any extra EAS flags pass through.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-publish}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_platform_args; toolkit_environment_args

case "$action" in
  publish)
    destination=()
    if [[ -n "${EAS_UPDATE_BRANCH:-}" && -n "${EAS_UPDATE_CHANNEL:-}" ]]; then
      toolkit_die "set only one of EAS_UPDATE_BRANCH or EAS_UPDATE_CHANNEL"
    elif [[ -n "${EAS_UPDATE_BRANCH:-}" ]]; then
      destination=(--branch "$EAS_UPDATE_BRANCH")
    elif [[ -n "${EAS_UPDATE_CHANNEL:-}" ]]; then
      destination=(--channel "$EAS_UPDATE_CHANNEL")
      if ((${#ENVIRONMENT_ARGS[@]} == 0)) && [[ "$EAS_UPDATE_CHANNEL" =~ ^(development|preview|production)$ ]]; then
        ENVIRONMENT_ARGS=(--environment "$EAS_UPDATE_CHANNEL")
      fi
    fi
    message=()
    [[ -n "${EAS_UPDATE_MESSAGE:-}" ]] && message=(--message "$EAS_UPDATE_MESSAGE")
    toolkit_eas update "${destination[@]}" "${message[@]}" "${PLATFORM_ARGS[@]}" "${ENVIRONMENT_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@"
    ;;
  configure)
    toolkit_expo install expo-updates
    toolkit_eas update:configure "${PLATFORM_ARGS[@]}" "${ENVIRONMENT_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@"
    ;;
  list|view|delete|edit|republish|rollback|insights|roll-back-to-embedded|revert-update-rollout)
    toolkit_eas "update:$action" "$@"
    ;;
  *) toolkit_eas "update:$action" "$@" ;;
esac
