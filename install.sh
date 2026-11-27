#!/usr/bin/env bash
set -euo pipefail

UPSTREAM="mattpocock/skills"
SELF="bobo522487/agent-skills"
WITH_DEEP_MODULES=false

for arg in "$@"; do
  case "$arg" in
    --with-deep-modules) WITH_DEEP_MODULES=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

# 精选 11 个核心原版技能（刻意排除会与 Antigravity 原生冲突/重叠的 grill-me、implement-spec 等）
CORE_SKILLS=(
  setup-matt-pocock-skills
  grilling
  grill-with-docs
  to-spec
  to-tickets
  tdd
  diagnosing-bugs
  code-review
  domain-modeling
  codebase-design
  improve-codebase-architecture
)

SKILL_FLAGS=()
for s in "${CORE_SKILLS[@]}"; do
  SKILL_FLAGS+=(--skill="$s")
done
if [ "$WITH_DEEP_MODULES" = true ]; then
  SKILL_FLAGS+=(--skill=setup-ts-deep-modules)
fi

echo "==> [1/2] 安装精选原版 ${UPSTREAM} 到 Antigravity 全局技能目录"
npx -y skills@latest add "$UPSTREAM" "${SKILL_FLAGS[@]}" -g -a antigravity

echo "==> [2/2] 安装个人初始化技能 ${SELF}（sdd-init）"
npx -y skills@latest add "$SELF" --skill=sdd-init -g -a antigravity

cat <<'EOF'

✅ 安装完成！
1. 在 T3 Code 中点击 Restart agent（或重启 T3 Code）。
2. 进入任意项目运行 /sdd-init 初始化仓库骨架。
3. 日后升级全机技能：npx skills@latest update -g
EOF
