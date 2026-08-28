#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: deploy.sh [preview|production|promote|alias|alias-delete|browse|delete]
                 [common options] [-- EAS flags]

Preview and production export web before deploying to EAS Hosting. Set
EXPO_TOOLKIT_SKIP_EXPORT=1 to deploy an existing dist directory.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-preview}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_environment_args

export_web() {
  [[ "${EXPO_TOOLKIT_SKIP_EXPORT:-0}" == "1" ]] || toolkit_expo export --platform web
}

case "$action" in
  preview)
    export_web
    if ((${#ENVIRONMENT_ARGS[@]} == 0)); then ENVIRONMENT_ARGS=(--environment preview); fi
    toolkit_eas deploy "${ENVIRONMENT_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@"
    ;;
  production|prod)
    export_web
    if ((${#ENVIRONMENT_ARGS[@]} == 0)); then ENVIRONMENT_ARGS=(--environment production); fi
    toolkit_eas deploy --prod "${ENVIRONMENT_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@"
    ;;
  promote|alias) toolkit_eas deploy:alias "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  alias-delete) toolkit_eas deploy:alias:delete "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  browse) toolkit_eas browse deployments --no-browser "$@" ;;
  delete) toolkit_eas deploy:delete "${NON_INTERACTIVE_ARGS[@]}" "$@" ;;
  *) toolkit_die "unknown deploy action: $action" ;;
esac
