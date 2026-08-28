#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: store.sh setup [common options] --title NAME --support-url URL --privacy-url URL [options]
Create EAS Metadata store.config.json and connect it to the production iOS
submission profile. EAS Metadata currently manages Apple metadata.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-setup}"; (($#)) && shift
[[ "$action" == help || "$action" == -h || "$action" == --help ]] && { usage; exit 0; }
[[ "$action" == setup ]] || toolkit_die "unknown store action: $action"
toolkit_enter_project
toolkit_run node "$SCRIPT_DIR/lib/project-config.js" metadata --project "$PWD" "$@"
