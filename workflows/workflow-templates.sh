#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: workflow-templates.sh install [common options] [--app-id ID] [--force] [--validate]
Install Nova validation, preview, PR preview, Maestro E2E, and smart production
workflow templates into .eas/workflows without replacing existing files.

  --validate  Ask EAS to validate every installed cloud workflow.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
action="${1:-install}"; (($#)) && shift
[[ "$action" == help || "$action" == -h || "$action" == --help ]] && { usage; exit 0; }
[[ "$action" == install ]] || toolkit_die "unknown workflow-template action: $action"
toolkit_enter_project

force=0
validate=0
app_id="${NOVA_E2E_APP_ID:-}"
while (($#)); do
  case "$1" in
    --force) force=1; shift ;;
    --validate) validate=1; shift ;;
    --app-id) (($# >= 2)) || toolkit_die "--app-id needs a value"; app_id="$2"; shift 2 ;;
    --app-id=*) app_id="${1#*=}"; shift ;;
    *) toolkit_die "unknown option: $1" ;;
  esac
done

if [[ -z "$app_id" ]]; then
  app_id="$(node -e "const a=require('./app.json').expo||require('./app.json'); process.stdout.write(a.android?.package ? a.android.package + '.preview' : '')")"
fi
[[ "$app_id" =~ ^[a-zA-Z][a-zA-Z0-9]*(\.[a-zA-Z][a-zA-Z0-9_-]*)+$ ]] || toolkit_die "provide the preview application ID with --app-id"

copy_template() {
  local source="$1"
  local destination="$2"
  if [[ -e "$destination" && "$force" != '1' ]]; then
    toolkit_note "keeping existing ${destination#"$PWD"/}"
    return 0
  fi
  if [[ "$TOOLKIT_DRY_RUN" == '1' ]]; then
    toolkit_quote_command cp "$source" "$destination"
    return 0
  fi
  mkdir -p "$(dirname "$destination")"
  cp "$source" "$destination"
  toolkit_note "installed ${destination#"$PWD"/}"
}

for template in "$SCRIPT_DIR"/templates/eas-workflows/*.yml; do
  copy_template "$template" "$PWD/.eas/workflows/${template##*/}"
done
copy_template "$SCRIPT_DIR/templates/maestro/home.yml" "$PWD/.maestro/home.yml"

if [[ "$TOOLKIT_DRY_RUN" != '1' ]] && [[ -f .maestro/home.yml ]] && grep -q '__APP_ID__' .maestro/home.yml; then
  node -e "const fs=require('node:fs'); const p='.maestro/home.yml'; fs.writeFileSync(p, fs.readFileSync(p, 'utf8').replaceAll('__APP_ID__', process.argv[1]));" "$app_id"
fi

if [[ "$validate" == '1' ]]; then
  for template in "$SCRIPT_DIR"/templates/eas-workflows/*.yml; do
    toolkit_eas workflow:validate "$PWD/.eas/workflows/${template##*/}"
  done
  toolkit_note "workflow recipes are installed and valid"
else
  toolkit_note "workflow recipes are ready; validate them with workflow.sh validate"
fi
