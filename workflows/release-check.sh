#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: release-check.sh [build|submit|update] [common options]
                        [--profile NAME] [--platform PLATFORM] [--environment NAME]
                        [--full] [--allow-dirty]
Run the production safety gate. Full mode also runs the Nova validation suite
and exports a production bundle locally.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
kind="${1:-build}"; (($#)) && shift
[[ "$kind" == help || "$kind" == -h || "$kind" == --help ]] && { usage; exit 0; }
[[ "$kind" == build || "$kind" == submit || "$kind" == update ]] || toolkit_die "check kind must be build, submit, or update"
toolkit_enter_project

profile="${EAS_PROFILE:-production}"
platform="${EXPO_PLATFORM:-all}"
environment="${EAS_ENVIRONMENT:-production}"
full=0
allow_dirty=0
audit_args=()
while (($#)); do
  case "$1" in
    --profile) (($# >= 2)) || toolkit_die "--profile needs a value"; profile="$2"; shift 2 ;;
    --profile=*) profile="${1#*=}"; shift ;;
    --platform) (($# >= 2)) || toolkit_die "--platform needs a value"; platform="$2"; shift 2 ;;
    --platform=*) platform="${1#*=}"; shift ;;
    --environment) (($# >= 2)) || toolkit_die "--environment needs a value"; environment="$2"; shift 2 ;;
    --environment=*) environment="${1#*=}"; shift ;;
    --full) full=1; shift ;;
    --allow-dirty) allow_dirty=1; shift ;;
    *) audit_args+=("$1"); shift ;;
  esac
done

# Traceability: a release should be reproducible from a commit.
#
# The status is scoped to the project directory. In a monorepo the repository
# root sits above it, so an unscoped check blocked a release because an
# unrelated package had edits — a dead end with nothing the user could fix in
# the app they were releasing.
if [[ "$allow_dirty" != '1' ]]; then
  if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    if [[ -n "$(git status --porcelain -- .)" ]]; then
      toolkit_die "the git working tree has uncommitted changes; commit them or explicitly use --allow-dirty"
    fi
  else
    # Not a failure: plenty of projects are released without git. But silence
    # here would imply the gate had verified something it cannot verify.
    toolkit_note "warning: this project is not in a git repository, so Nova cannot tie the release to a commit"
  fi
fi

toolkit_run node "$SCRIPT_DIR/lib/release-audit.js" --project "$PWD" --kind "$kind" --profile "$profile" "${audit_args[@]}"

# Both checks report, so both run before the gate gives a verdict: stopping at
# the first misaligned package would hide the doctor findings and turn one
# release attempt into several. The later stages are skipped when either fails,
# because a fingerprint or a production export of a broken project is noise.
checks=0
toolkit_expo install --check || checks=$?
toolkit_expo_doctor || checks=$?
if ((checks != 0)); then
  toolkit_die "project health checks failed; resolve the findings above before releasing"
fi

if [[ "$kind" == 'update' ]]; then
  if [[ "$platform" == 'all' ]]; then
    toolkit_eas fingerprint:generate --platform android --environment "$environment" --non-interactive
    toolkit_eas fingerprint:generate --platform ios --environment "$environment" --non-interactive
  else
    toolkit_eas fingerprint:generate --platform "$platform" --environment "$environment" --non-interactive
  fi
fi

if [[ "$full" == '1' ]]; then
  if node -e "const p=require('./package.json'); process.exit(p.scripts?.validate ? 0 : 1)"; then
    toolkit_run npm run validate
  fi
  bundle_dir="$(mktemp -d "${TMPDIR:-/tmp}/nova-release-export.XXXXXX")"
  cleanup_bundle() { rm -rf "$bundle_dir"; }
  trap cleanup_bundle EXIT
  toolkit_expo export --platform all --output-dir "$bundle_dir"
fi

toolkit_note "release safety checks passed"
