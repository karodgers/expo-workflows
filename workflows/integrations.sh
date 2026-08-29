#!/usr/bin/env bash
set -Eeuo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

usage() {
  cat <<'EOF'
Usage: integrations.sh SERVICE ACTION [common options] [EAS flags]
Manage EAS integrations. Services currently include asc, convex, posthog, and
supabase. Actions pass through, including nested actions such as team:invite.
EOF
  toolkit_common_help
}

toolkit_parse_common "$@"; set -- "${TOOLKIT_ARGS[@]}"
[[ "${1:-}" == "help" || "${1:-}" == "-h" || "${1:-}" == "--help" ]] && { usage; exit 0; }
service="${1:-}"; [[ -n "$service" ]] || toolkit_die "integration service is required"; shift
action="${1:-}"; [[ -n "$action" ]] || toolkit_die "integration action is required"; shift
[[ "$service" =~ ^[a-z0-9-]+$ && "$action" =~ ^[a-z0-9:-]+$ ]] || toolkit_die "invalid integration service or action"
toolkit_enter_project
toolkit_eas "integrations:$service:$action" "$@"
