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

EXPECTED_SKILLS=("${CORE_SKILLS[@]}" sdd-init)

SKILL_FLAGS=()
for s in "${CORE_SKILLS[@]}"; do
  SKILL_FLAGS+=(--skill="$s")
done
if [ "$WITH_DEEP_MODULES" = true ]; then
  SKILL_FLAGS+=(--skill=setup-ts-deep-modules)
  EXPECTED_SKILLS+=(setup-ts-deep-modules)
fi

verify_installed_skills() {
  if ! command -v node >/dev/null 2>&1; then
    echo "✗ 安装后核对失败：缺少 node，无法解析技能清单" >&2
    return 1
  fi

  local listing
  if ! listing="$(npx -y skills@latest ls -g -a antigravity --json </dev/null)"; then
    echo "✗ 安装后核对失败：无法读取 Antigravity 全局技能清单" >&2
    return 1
  fi

  local missing check_status
  set +e
  missing="$(node -e '
const fs = require("fs");
const expected = process.argv.slice(1);
let data;
try {
  data = JSON.parse(fs.readFileSync(0, "utf8"));
} catch (error) {
  console.error("invalid JSON");
  process.exit(2);
}
const tracked = new Set(
  (Array.isArray(data) ? data : [])
    .filter((skill) => skill && skill.status === "tracked" && typeof skill.name === "string")
    .map((skill) => skill.name)
);
const missing = expected.filter((name) => !tracked.has(name));
if (missing.length > 0) {
  console.log(missing.join("\n"));
  process.exit(1);
}
' "${EXPECTED_SKILLS[@]}" <<<"$listing")"
  check_status=$?
  set -e

  if [ "$check_status" -eq 2 ]; then
    echo "✗ 安装后核对失败：技能清单不是合法 JSON" >&2
    return 1
  fi
  if [ "$check_status" -ne 0 ]; then
    echo "✗ 安装后核对失败：Antigravity 全局技能清单缺少期望技能" >&2
    while IFS= read -r name; do
      [ -n "$name" ] && echo "  - $name" >&2
    done <<<"$missing"
    return 1
  fi
}

# 历史实测（2026-11-27）：非 TTY 下 skills CLI 曾弹出确认框；缺 `-y` 时出现过“静默不安装却仍以 0 退出”。
# skills CLI 1.9.1 源码显示当前拒装多为 exit 1，因此这里保留 `-y` 与 `</dev/null` 作为防御性 invariant：
# 既不弹窗，也不让 `curl ... | bash` 的脚本正文被 npx 吞掉。
echo "==> [1/2] 安装精选原版 ${UPSTREAM} 到 Antigravity 全局技能目录"
npx -y skills@latest add "$UPSTREAM" "${SKILL_FLAGS[@]}" -g -a antigravity -y </dev/null

echo "==> [2/2] 安装个人初始化技能 ${SELF}（sdd-init）"
npx -y skills@latest add "$SELF" --skill=sdd-init -g -a antigravity -y </dev/null

verify_installed_skills

cat <<'EOF'

✅ 安装完成！
1. 在 T3 Code 中点击 Restart agent（或重启 T3 Code）。
2. 进入任意项目运行 /sdd-init 初始化仓库骨架。
3. 日后升级全机技能：npx skills@latest update -g
EOF
