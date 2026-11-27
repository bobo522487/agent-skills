#!/usr/bin/env bash
set -euo pipefail

PAYLOAD="$(cat 2>/dev/null || true)"

# 正交加速层已启用时本钩子空转：验证交给 apply_edits(verify: "npm run lint:boundaries")。
if [ -n "${HOME:-}" ] && [ -e "${HOME}/.agents/sdd-forge-fast" ]; then
  printf '{}\n'
  exit 0
fi

command -v jq >/dev/null 2>&1 || { printf '{}\n'; exit 0; }

WS="$(printf '%s' "$PAYLOAD" | jq -r '(.workspacePaths[0] // .cwd // "")' 2>/dev/null || true)"
ARTIFACT="$(printf '%s' "$PAYLOAD" | jq -r '.artifactDirectoryPath // ""' 2>/dev/null || true)"
[ -n "$WS" ] && [ -d "$WS" ] || { printf '{}\n'; exit 0; }

if [ -n "$ARTIFACT" ] && [ -d "$ARTIFACT" ]; then
  STATE="$ARTIFACT/sdd-forge-check.json"
else
  STATE=""
fi

clear_state() {
  [ -n "$STATE" ] && rm -f "$STATE" || true
}

if [ ! -f "$WS/package.json" ]; then
  clear_state
  printf '{}\n'
  exit 0
fi

if ! jq -e '.scripts["lint:boundaries"]' "$WS/package.json" >/dev/null 2>&1; then
  clear_state
  printf '{}\n'
  exit 0
fi

set +e
RAW="$(cd "$WS" && npm run -s lint:boundaries 2>&1)"
STATUS=$?
set -e
OUT="$(printf '%s' "$RAW" | head -n 30)"

if [ "$STATUS" -ne 0 ]; then
  if [ -n "$STATE" ]; then
    jq -cn --arg t "$(date -u +%FT%TZ)" --arg o "$OUT" \
      '{failedAt:$t,command:"lint:boundaries",excerpt:$o}' >"$STATE" 2>/dev/null || true
  fi
else
  clear_state
fi

printf '{}\n'
