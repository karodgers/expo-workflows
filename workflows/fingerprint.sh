#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: fingerprint.sh [generate|compare] [common options] [-- EAS flags]
Generate or compare native runtime fingerprints.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-generate}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_platform_args; toolkit_environment_args

case "$action" in
  generate)
    fingerprint_source=("${ENVIRONMENT_ARGS[@]}")
    if [[ -n "${EAS_PROFILE:-}" ]]; then
      ((${#ENVIRONMENT_ARGS[@]} == 0)) || toolkit_die "fingerprint accepts EAS_PROFILE or EAS_ENVIRONMENT, not both"
      fingerprint_source=(--build-profile "$EAS_PROFILE")
    fi
    toolkit_eas fingerprint:generate "${PLATFORM_ARGS[@]}" "${fingerprint_source[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@"
    ;;
  compare) toolkit_eas fingerprint:compare "${ENVIRONMENT_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown fingerprint action: $action" ;;
esac
