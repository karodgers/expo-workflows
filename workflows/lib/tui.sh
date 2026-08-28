#!/usr/bin/env bash

# Dependency-free terminal presentation helpers for the guided launcher.

TUI_MODE=0
TUI_WIDTH=80
TUI_PROJECT_NAME='Expo project'
TUI_PROJECT_SDK='unknown'
TUI_PROJECT_VARIANT="${APP_VARIANT:-production}"
TUI_PROJECT_LINKED='not linked'
TUI_TOOLKIT_VERSION=''

tui_initialize() {
  local project_dir="$1"
  local toolkit_dir="$2"
  local classic="${3:-0}"

  if [[ "$classic" != '1' && -t 0 && -t 1 && "${TERM:-dumb}" != 'dumb' ]]; then
    TUI_MODE=1
  fi

  if [[ -z "${NO_COLOR:-}" && -t 1 ]]; then
    TUI_BORDER=$'\033[38;5;63m'
    TUI_ACCENT=$'\033[38;5;45m'
    TUI_PINK=$'\033[38;5;213m'
    TUI_MUTED=$'\033[38;5;245m'
    TUI_SUCCESS=$'\033[38;5;84m'
    TUI_WARNING=$'\033[38;5;220m'
    TUI_DANGER=$'\033[38;5;203m'
    TUI_ACTIVE=$'\033[1;38;5;231;48;5;24m'
    TUI_BOLD=$'\033[1m'
    TUI_DIM=$'\033[2m'
    TUI_RESET=$'\033[0m'
  else
    TUI_BORDER=''; TUI_ACCENT=''; TUI_PINK=''; TUI_MUTED=''
    TUI_SUCCESS=''; TUI_WARNING=''; TUI_DANGER=''; TUI_ACTIVE=''
    TUI_BOLD=''; TUI_DIM=''; TUI_RESET=''
  fi

  if [[ -f "$toolkit_dir/package.json" ]]; then
    TUI_TOOLKIT_VERSION="$(node -p "require('$toolkit_dir/package.json').version" 2>/dev/null)"
  fi
  tui_refresh_context "$project_dir"
}

tui_refresh_context() {
  local project_dir="$1"
  local context=''
  [[ -d "$project_dir" && -f "$project_dir/package.json" ]] || return 0
  context="$(cd "$project_dir" && node -e '
    const p = require("./package.json");
    let app = {};
    try { const raw = require("./app.json"); app = raw.expo || raw; } catch {}
    const clean = value => String(value || "").replace(/[|\r\n]/g, " ");
    const expo = p.dependencies?.expo || p.devDependencies?.expo || "unknown";
    const sdk = String(expo).match(/\d+/)?.[0] || "unknown";
    const linked = app.extra?.eas?.projectId ? "EAS linked" : "EAS not linked";
    process.stdout.write([clean(app.name || p.name), sdk, linked].join("|"));
  ' 2>/dev/null)"
  if [[ -n "$context" ]]; then
    IFS='|' read -r TUI_PROJECT_NAME TUI_PROJECT_SDK TUI_PROJECT_LINKED <<< "$context"
  fi
  TUI_PROJECT_VARIANT="${APP_VARIANT:-production}"
}

tui_refresh_size() {
  local columns="${COLUMNS:-}"
  if [[ -z "$columns" ]] && command -v tput >/dev/null 2>&1; then
    columns="$(tput cols 2>/dev/null)"
  fi
  [[ "$columns" =~ ^[0-9]+$ ]] || columns=80
  ((columns > 100)) && columns=100
  ((columns < 38)) && columns=38
  TUI_WIDTH="$columns"
}

tui_repeat() {
  local character="$1"
  local count="$2"
  local spaces=''
  ((count < 1)) && { TUI_REPEATED=''; return; }
  printf -v spaces '%*s' "$count" ''
  TUI_REPEATED="${spaces// /$character}"
}

tui_trim() {
  local value="$1"
  local maximum="$2"
  if ((${#value} > maximum)); then
    TUI_TRIMMED="${value:0:$((maximum - 1))}…"
  else
    TUI_TRIMMED="$value"
  fi
}

tui_row() {
  local left="$1"
  local right="${2:-}"
  local inside=$((TUI_WIDTH - 4))
  local maximum_left=$((inside - ${#right} - 1))
  ((maximum_left < 8)) && maximum_left=8
  tui_trim "$left" "$maximum_left"
  left="$TUI_TRIMMED"
  local gap=$((inside - ${#left} - ${#right}))
  ((gap < 1)) && gap=1
  printf '%s│%s %s%*s%s %s│%s\n' "$TUI_BORDER" "$TUI_RESET" "$left" "$gap" '' "$right" "$TUI_BORDER" "$TUI_RESET"
}

tui_rule() {
  tui_repeat '─' "$((TUI_WIDTH - 2))"
  printf '%s├%s┤%s\n' "$TUI_BORDER" "$TUI_REPEATED" "$TUI_RESET"
}

tui_header() {
  local connection="$TUI_PROJECT_LINKED"
  [[ "${EXPO_TOOLKIT_DRY_RUN:-0}" == '1' ]] && connection="DRY RUN  ·  $connection"
  tui_refresh_size
  tui_repeat '─' "$((TUI_WIDTH - 2))"
  printf '%s╭%s╮%s\n' "$TUI_BORDER" "$TUI_REPEATED" "$TUI_RESET"
  tui_row "NOVA  / EXPO WORKFLOWS" "v${TUI_TOOLKIT_VERSION:-dev}"
  tui_rule
  tui_row "◆ ${TUI_PROJECT_NAME}" "SDK ${TUI_PROJECT_SDK}  ·  ${TUI_PROJECT_VARIANT}"
  tui_row "  ${PROJECT_DIR:-$PWD}" "$connection"
  tui_repeat '─' "$((TUI_WIDTH - 2))"
  printf '%s╰%s╯%s\n' "$TUI_BORDER" "$TUI_REPEATED" "$TUI_RESET"
}

tui_clear() {
  printf '\033[2J\033[H'
}

tui_restore() {
  ((TUI_MODE == 1)) && printf '\033[?25h%s' "$TUI_RESET"
}

tui_card_top() {
  local title="$1"
  local available=$((TUI_WIDTH - ${#title} - 6))
  ((available < 1)) && available=1
  tui_repeat '─' "$available"
  printf '\n%s╭─%s %s%s%s %s╮%s\n' "$TUI_BORDER" "$TUI_RESET" "$TUI_BOLD" "$title" "$TUI_RESET" "$TUI_REPEATED" "$TUI_RESET"
}

tui_card_bottom() {
  tui_repeat '─' "$((TUI_WIDTH - 2))"
  printf '%s╰%s╯%s\n' "$TUI_BORDER" "$TUI_REPEATED" "$TUI_RESET"
}

tui_menu() {
  local prompt="$1"
  shift
  local options=("$@")
  local count="${#options[@]}"
  local selected=1
  local key rest index option marker content padding inside escape_hint='q cancel'
  local last_option="${options[$((count - 1))]}"
  case "$last_option" in
    Back|'Go back'|Exit) escape_hint='q back' ;;
  esac

  while true; do
    tui_clear
    tui_header
    tui_card_top "$prompt"
    inside=$((TUI_WIDTH - 4))
    for ((index = 1; index <= count; index += 1)); do
      option="${options[$((index - 1))]}"
      if ((index == selected)); then
        marker='◆'
        content="  $marker  $option"
        tui_trim "$content" "$inside"
        content="$TUI_TRIMMED"
        padding=$((inside - ${#content}))
        printf '%s│%s%s%s%*s%s%s│%s\n' "$TUI_BORDER" "$TUI_RESET" "$TUI_ACTIVE" "$content" "$padding" '' "$TUI_RESET" "$TUI_BORDER" "$TUI_RESET"
      else
        content="     $option"
        tui_trim "$content" "$inside"
        content="$TUI_TRIMMED"
        padding=$((inside - ${#content}))
        printf '%s│%s%s%s%*s%s│%s\n' "$TUI_BORDER" "$TUI_RESET" "$TUI_MUTED" "$content" "$padding" '' "$TUI_BORDER" "$TUI_RESET"
      fi
    done
    tui_card_bottom
    printf '%s  ↑/↓ navigate   enter select   %s%s\n' "$TUI_MUTED" "$escape_hint" "$TUI_RESET"
    printf '\033[?25l'

    key=''
    IFS= read -rsn1 key || { tui_restore; return 130; }
    if [[ "$key" == $'\033' ]]; then
      rest=''
      IFS= read -rsn2 -t 0.1 rest 2>/dev/null || true
      key+="$rest"
    fi
    case "$key" in
      $'\033[A'|k|K) ((selected > 1)) && selected=$((selected - 1)) || selected="$count" ;;
      $'\033[B'|j|J) ((selected < count)) && selected=$((selected + 1)) || selected=1 ;;
      ''|$'\n'|$'\r') TUI_CHOICE="$selected"; tui_restore; return 0 ;;
      q|Q|$'\033'|$'\033[D')
        tui_restore
        case "$last_option" in
          Back|'Go back'|Exit) TUI_CHOICE="$count"; return 0 ;;
          *) return 130 ;;
        esac
        ;;
      [1-9]) if ((key <= count)); then TUI_CHOICE="$key"; tui_restore; return 0; fi ;;
    esac
  done
}

tui_prompt() {
  local prompt="$1"
  local default="${2:-}"
  local secret="${3:-0}"
  tui_clear
  tui_header
  tui_card_top 'Details needed'
  tui_row "$prompt"
  [[ -n "$default" ]] && tui_row "Default: $default"
  tui_card_bottom
  printf '%s›%s ' "$TUI_ACCENT" "$TUI_RESET"
  if [[ "$secret" == '1' ]]; then
    IFS= read -rs TUI_ANSWER || return 130
    printf '\n'
  else
    IFS= read -r TUI_ANSWER || return 130
  fi
  TUI_ANSWER="${TUI_ANSWER:-$default}"
}

tui_confirm() {
  local prompt="$1"
  local default="${2:-no}"
  local suffix='y/N'
  [[ "$default" == 'yes' ]] && suffix='Y/n'
  tui_clear
  tui_header
  tui_card_top 'Please confirm'
  tui_row "$prompt"
  tui_card_bottom
  printf '%s›%s %s: ' "$TUI_WARNING" "$TUI_RESET" "$suffix"
  IFS= read -r TUI_ANSWER || return 1
  TUI_ANSWER="${TUI_ANSWER:-$default}"
  [[ "$TUI_ANSWER" =~ ^[Yy]([Ee][Ss])?$ ]]
}

tui_task_start() {
  local label="$1"
  tui_clear
  tui_header
  tui_card_top 'Working'
  tui_row "◆ $label"
  tui_card_bottom
  printf '\n%sLive output%s\n\n' "$TUI_MUTED" "$TUI_RESET"
}

tui_task_result() {
  local status="$1"
  local message="$2"
  case "$status" in
    success) printf '\n%s  ✓  %s%s\n' "$TUI_SUCCESS" "$message" "$TUI_RESET" ;;
    warning) printf '\n%s  !  %s%s\n' "$TUI_WARNING" "$message" "$TUI_RESET" ;;
    error) printf '\n%s  ×  %s%s\n' "$TUI_DANGER" "$message" "$TUI_RESET" ;;
  esac
}

tui_pause() {
  printf '\n%s  Press enter to return%s' "$TUI_MUTED" "$TUI_RESET"
  IFS= read -r _ || true
}
