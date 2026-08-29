#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: upload.sh [common options] --build-path FILE [EAS flags]
Upload a local Android/iOS build and generate a shareable link.
EXPO_PLATFORM supplies an optional platform default.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
[[ "${1:-}" == "help" || "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project
toolkit_non_interactive_flag; toolkit_platform_args
toolkit_eas upload "${PLATFORM_ARGS[@]}" "${NON_INTERACTIVE_ARGS[@]}" "$@"
