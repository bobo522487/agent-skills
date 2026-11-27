#!/usr/bin/env bash
set -euo pipefail

UPSTREAM_REPO="mattpocock/skills"
SELF_REPO="bobo522487/agent-skills"
COMMON_SKILLS_DIR="${HOME}/.agents/skills"
WITH_DEEP_MODULES=false
WITH_CLAUDE=false

for arg in "$@"; do
  case "$arg" in
    --with-deep-modules) WITH_DEEP_MODULES=true ;;
    --with-claude) WITH_CLAUDE=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

link_skills_dir() {
  local target="$1"
  local parent
  parent="$(dirname "$target")"
  mkdir -p "$COMMON_SKILLS_DIR" "$parent"

  # 若目标已是实体目录，先安全迁移既有技能，绝不静默丢失
  if [ -d "$target" ] && [ ! -L "$target" ]; then
    if [ -n "$(ls -A "$target" 2>/dev/null || true)" ]; then
      echo "→ 迁移现有技能: $target -> $COMMON_SKILLS_DIR"
      cp -rn "$target"/. "$COMMON_SKILLS_DIR"/
    fi
    rm -rf "$target"
  fi

  ln -sfn "$COMMON_SKILLS_DIR" "$target"
  echo "✓ 已链接: $target -> $COMMON_SKILLS_DIR"
}

echo "==> [1/4] 准备公共技能真源目录: $COMMON_SKILLS_DIR"
mkdir -p "$COMMON_SKILLS_DIR"

# 已验证 (verified 2026-11-27, skills CLI): `-a antigravity` 是合法 agent id，其全局落点即
# ~/.gemini/config/skills/；另有独立 agent id `antigravity-cli`（落点同 ~/.gemini/config/skills）。
# `-y --skill '*'` 为必需：非 TTY 时缺省会弹出技能选择框并直接取消安装。
# `</dev/null` 为必需：`curl ... | bash` 时脚本正文本身来自 stdin，npx 若不重定向会吞掉
# 尚未执行的后续行，导致脚本静默只跑完第 2 步却仍以 0 退出。
echo "==> [2/4] 安装原版 ${UPSTREAM_REPO} 到全局公共目录（Codex + Antigravity）"
npx -y skills@latest add "$UPSTREAM_REPO" -g -a codex -a antigravity -y --skill '*' </dev/null

if [ "$WITH_DEEP_MODULES" = true ]; then
  echo "==> [2.5/4] 安装实验区 TS 深模块门禁技能: setup-ts-deep-modules"
  npx -y skills@latest add "$UPSTREAM_REPO" --skill=setup-ts-deep-modules -g -a codex -a antigravity -y </dev/null
fi

# 本地仓库安装：支持从仓库目录直接跑（./install.sh）或经 GitHub 远端（$SELF_REPO）。
# 已验证 (verified 2026-11-27): `skills add <本地路径>` 可识别本仓库的 sdd-init 及其 templates/。
# 注意 `curl | bash` 时 BASH_SOURCE 为空，故一律用 `:-` 兜底，否则 set -u 会直接中断脚本。
echo "==> [3/4] 安装个人初始化技能 ${SELF_REPO}（sdd-init）"
SELF_SRC="${SELF_REPO}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-}")" 2>/dev/null && pwd || pwd)"
if [ -f "${SCRIPT_DIR}/skills/sdd-init/SKILL.md" ]; then
  SELF_SRC="${SCRIPT_DIR}"
  echo "    使用本地仓库路径: $SELF_SRC"
fi
# 远端取不到 sdd-init（仓库未发布 / fork / 网络故障）时降级为警告并继续，避免整机安装卡在第 3 步。
SELF_INSTALL_OK=true
if ! npx -y skills@latest add "$SELF_SRC" -g -a codex -a antigravity -y --skill '*' </dev/null; then
  SELF_INSTALL_OK=false
  echo "⚠️  sdd-init 安装失败（来源: $SELF_SRC）。" >&2
  echo "    若远端取不到 sdd-init，可进入仓库目录执行 ./install.sh（本地路径）；或检查网络/仓库地址后重试。" >&2
fi

echo "==> [4/4] 打通 T3 Code（Antigravity）与 Codex 全局共享软链"
link_skills_dir "${HOME}/.gemini/config/skills"
if [ "$WITH_CLAUDE" = true ]; then
  link_skills_dir "${HOME}/.claude/skills"
fi

if [ "$SELF_INSTALL_OK" = false ]; then
  cat <<'EOF'

⚠️  安装未完全完成：公共技能与全局软链已就绪，但 sdd-init 未装上。
    请进入本仓库目录执行 ./install.sh（本地路径），或检查网络/仓库地址后重跑一键命令。
EOF
  exit 1
fi

cat <<'EOF'

✅ 安装完成！全机共享单一真源：~/.agents/skills/

下一步：
1. 在 T3 Code 中点击 Restart agent（或重启 T3 Code），新开 Thread 即可在 Antigravity 和 Codex 中共享全套技能。
2. 打开任意项目，直接发送 /sdd-init 完成仓库级 SDD 骨架与 /setup-matt-pocock-skills 初始化。
3. 勿在同一引擎重复用 plugin 命令叠装 mattpocock/skills，以免技能重复出现；升级全机请运行：npx skills@latest update -g
EOF
