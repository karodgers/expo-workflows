#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'USAGE'
Usage: doctor.sh [check|fix|validate] [common options]
Check SDK package alignment and Expo project health. `fix` aligns packages first.
`validate` additionally runs the package.json validate script when present.
USAGE
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-check}"; (($#)) && shift
[[ "$action" == "help" || "$action" == "-h" || "$action" == "--help" ]] && { usage; exit 0; }
toolkit_enter_project

case "$action" in
  check) ;;
  fix) toolkit_expo install --fix "$@" ;;
  validate) ;;
  *) toolkit_die "unknown doctor action: $action" ;;
esac

# A health report is only useful whole. `expo install --check` exits non-zero on
# any misalignment, so running these under `set -e` would stop at the first
# finding and never reach Expo Doctor — the user asked for the report, not for
# the first thing wrong with it. Each step's status is collected and the worst
# one becomes the exit code, so the failure is still visible to the dashboard.
status=0
toolkit_expo install --check || status=$?
toolkit_expo_doctor || status=$?

if [[ "$action" == "validate" ]] && node -e "const p=require('./package.json'); process.exit(p.scripts?.validate ? 0 : 1)"; then
  toolkit_run npm run validate || status=$?
fi

if ((status != 0)); then
  toolkit_note "project health checks reported problems; review the findings above"
  exit "$status"
fi

toolkit_note "project health checks passed"
