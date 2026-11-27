#!/usr/bin/env bash
set -euo pipefail

PAYLOAD="$(cat 2>/dev/null || true)"

# 正交加速层已启用时本钩子空转：同轮内联 verify 已负责闭环。
if [ -n "${HOME:-}" ] && [ -e "${HOME}/.agents/sdd-forge-fast" ]; then
  printf '{"decision":"allow"}\n'
  exit 0
fi

command -v jq >/dev/null 2>&1 || { printf '{"decision":"allow"}\n'; exit 0; }

ARTIFACT="$(printf '%s' "$PAYLOAD" | jq -r '.artifactDirectoryPath // ""' 2>/dev/null || true)"
[ -n "$ARTIFACT" ] && [ -f "$ARTIFACT/sdd-forge-check.json" ] || { printf '{"decision":"allow"}\n'; exit 0; }

STATE="$ARTIFACT/sdd-forge-check.json"
CMD="$(jq -r '.command // "检查"' "$STATE" 2>/dev/null || true)"
EXCERPT="$(jq -r '.excerpt // ""' "$STATE" 2>/dev/null || true)"

if [ -n "$EXCERPT" ]; then
  REASON="[SDD Forge] ${CMD} 未通过，修复后重跑（前 30 行）：\n${EXCERPT}"
else
  REASON="[SDD Forge] ${CMD} 未通过，修复后重跑。"
fi

jq -cn --arg r "$REASON" '{decision:"continue",reason:$r}'
