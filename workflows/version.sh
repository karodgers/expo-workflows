#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

PACKAGE_NAME="${NOVA_WORKFLOWS_PACKAGE:-nova-expo-workflows}"
CURRENT_VERSION="$(node -p "require('$SCRIPT_DIR/package.json').version")"

usage() {
  cat <<'EOF'
Usage: version.sh [status|check|update] [common options]
Show toolkit/runtime versions, check npm for a newer toolkit, or update the
global installation. NOVA_WORKFLOWS_PACKAGE can override the npm package name.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-status}"; (($#)) && shift

case "$action" in
  status)
    minimum_expo="$(node -p "require('$SCRIPT_DIR/package.json').nova.minimumExpoSdk")"
    minimum_eas="$(node -p "require('$SCRIPT_DIR/package.json').nova.minimumEasCli")"
    printf 'Nova workflows: %s\n' "$CURRENT_VERSION"
    printf 'Node: %s\n' "$(node --version)"
    node -e "const [a,b]=process.versions.node.split('.').map(Number); process.exit(a>22 || (a===22 && b>=13) ? 0 : 1)" || toolkit_die "Node 22.13 or newer is required"
    if [[ -f "$TOOLKIT_PROJECT_DIR/package.json" ]]; then
      expo_version="$(cd "$TOOLKIT_PROJECT_DIR" && node -p "require('./package.json').dependencies?.expo || require('./package.json').devDependencies?.expo || 'not declared'")"
      printf 'Expo: %s\n' "$expo_version"
      if [[ "$expo_version" != 'not declared' ]]; then
        expo_major="$(printf '%s' "$expo_version" | sed -E 's/^[^0-9]*([0-9]+).*/\1/')"
        [[ "$expo_major" =~ ^[0-9]+$ && "$expo_major" -ge "$minimum_expo" ]] || toolkit_die "Expo SDK $minimum_expo or newer is required"
      else
        toolkit_note "Expo compatibility was skipped because this is not an Expo project"
      fi
    else
      printf 'Expo: no project detected\n'
    fi
    eas_available=1
    if [[ -n "${EXPO_TOOLKIT_EAS_BIN:-}" ]]; then
      EAS_CMD=("$EXPO_TOOLKIT_EAS_BIN")
    elif [[ -x "$TOOLKIT_PROJECT_DIR/node_modules/.bin/eas" ]]; then
      EAS_CMD=("$TOOLKIT_PROJECT_DIR/node_modules/.bin/eas")
    elif command -v eas >/dev/null 2>&1; then
      EAS_CMD=(eas)
    else
      eas_available=0
      printf 'EAS CLI: not installed (cloud commands can install it when needed)\n'
    fi
    if [[ "$eas_available" == '1' && "$TOOLKIT_DRY_RUN" == '1' ]]; then
      toolkit_quote_command "${EAS_CMD[@]}" --version
    elif [[ "$eas_available" == '1' ]]; then
      eas_output="$("${EAS_CMD[@]}" --version)"
      printf 'EAS CLI: %s\n' "$eas_output"
      eas_version="$(printf '%s' "$eas_output" | sed -E 's/[^0-9]*([0-9]+\.[0-9]+\.[0-9]+).*/\1/')"
      [[ "$eas_version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || toolkit_die "could not read the installed EAS CLI version"
      node -e "const a=process.argv[1].split('.').map(Number); const b=process.argv[2].split('.').map(Number); process.exit(a[0]>b[0] || (a[0]===b[0] && (a[1]>b[1] || (a[1]===b[1] && a[2]>=b[2]))) ? 0 : 1)" "$eas_version" "$minimum_eas" || toolkit_die "EAS CLI $minimum_eas or newer is required"
    fi
    printf 'Compatibility checks passed.\n'
    ;;
  check)
    toolkit_note "Checking npm for $PACKAGE_NAME"
    latest="$(npm view "$PACKAGE_NAME" dist-tags.latest --json 2>/dev/null)" || toolkit_die "could not check npm; verify the package is published and the network is available"
    latest="${latest//\"/}"
    printf 'Installed: %s\nLatest:    %s\n' "$CURRENT_VERSION" "$latest"
    [[ "$latest" == "$CURRENT_VERSION" ]] && printf 'The toolkit is current.\n' || printf 'An update is available. Run: nova-workflows update\n'
    ;;
  update)
    update_source="${NOVA_WORKFLOWS_UPDATE_SOURCE:-$PACKAGE_NAME@latest}"
    toolkit_run npm install --global "$update_source"
    ;;
  -h|--help|help) usage ;;
  *) toolkit_die "unknown version action: $action" ;;
esac
