#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: gui.sh [common options]
Open the current Expo project in VS Code, where the Nova Expo extension can
discover it automatically.

Override NOVA_VSCODE_BIN to use a specific VS Code-compatible command.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
[[ "${1:-}" == help || "${1:-}" == -h || "${1:-}" == --help ]] && { usage; exit 0; }
(($# == 0)) || toolkit_die "unknown GUI option: $1"
toolkit_enter_project

vscode_bin="${NOVA_VSCODE_BIN:-code}"
if command -v "$vscode_bin" >/dev/null 2>&1; then
  "$vscode_bin" --reuse-window "$PWD" >/dev/null 2>&1 &
  toolkit_note "VS Code opened for $PWD"
  exit 0
fi

if [[ "$(uname -s)" == 'Darwin' ]] && [[ -d '/Applications/Visual Studio Code.app' ]]; then
  open -na 'Visual Studio Code' --args "$PWD"
  toolkit_note "VS Code opened for $PWD"
  exit 0
fi

toolkit_die "VS Code was not found; install its 'code' shell command or set NOVA_VSCODE_BIN"
