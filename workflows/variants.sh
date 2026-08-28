#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: variants.sh setup [common options] [--app-id IDENTIFIER] [options]
Configure independently installable development, preview, production, and E2E
variants, matching EAS environments/channels, and fingerprint runtime versions.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-setup}"; (($#)) && shift
[[ "$action" == help || "$action" == -h || "$action" == --help ]] && { usage; exit 0; }
[[ "$action" == setup ]] || toolkit_die "unknown variants action: $action"
toolkit_enter_project
toolkit_run node "$SCRIPT_DIR/lib/project-config.js" variants --project "$PWD" "$@"
