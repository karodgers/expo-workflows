#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: expo.sh [common options] -- EXPO_COMMAND [flags]
Forward-compatible escape hatch for any project-local Expo CLI command.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
[[ "${1:-}" == "help" || "${1:-}" == "-h" || "${1:-}" == "--help" || $# -eq 0 ]] && { usage; exit 0; }
toolkit_enter_project
[[ "${1:-}" == "--" ]] && shift
toolkit_expo "$@"
