#!/usr/bin/env bash
set -euo pipefail

UPSTREAM="mattpocock/skills"
SELF_REPO="https://github.com/bobo522487/agent-skills"
RAW_BASE="https://raw.githubusercontent.com/bobo522487/agent-skills/main"
PLUGIN_NAME="sdd-forge"
WITH_DEEP_MODULES=false
WITH_FAST=false

for arg in "$@"; do
  case "$arg" in
    --with-deep-modules) WITH_DEEP_MODULES=true ;;
    --with-fast) WITH_FAST=true ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

for bin in node npx agy; do
  command -v "$bin" >/dev/null 2>&1 || { echo "✗ 缺少 $bin，请先安装" >&2; exit 1; }
done

# 14 个核心技能：唯一真源；`retro` 的硬依赖 writing-for-agents 已包含。
CORE_SKILLS=(
  setup-matt-pocock-skills
  grilling
  grill-with-docs
  to-spec
  to-tickets
  implement
  tdd
  diagnosing-bugs
  code-review
  retro
  domain-modeling
  codebase-design
  improve-codebase-architecture
  writing-for-agents
)

# 6 个日常流程技能：只删安装副本里的 disable-model-invocation，源码零分叉。
AUTO_INVOKE_SKILLS=(
  grill-with-docs
  to-spec
  to-tickets
  implement
  retro
  improve-codebase-architecture
)

EXPECTED_SKILLS=("${CORE_SKILLS[@]}")
SKILL_FLAGS=()
for s in "${CORE_SKILLS[@]}"; do
  SKILL_FLAGS+=(--skill="$s")
done

if [ "$WITH_DEEP_MODULES" = true ]; then
  SKILL_FLAGS+=(--skill=setup-ts-deep-modules)
  EXPECTED_SKILLS+=(setup-ts-deep-modules)
fi

patch_behavior() {
  local skill="$1"
  local candidates=(
    "${HOME}/.agents/skills/${skill}/SKILL.md"
    "${HOME}/.gemini/config/skills/${skill}/SKILL.md"
  )
  local patched=0
  for file in "${candidates[@]}"; do
    [ -f "$file" ] || continue
    if grep -q '^disable-model-invocation:[[:space:]]*true[[:space:]]*$' "$file"; then
      sed -i.bak '/^disable-model-invocation:[[:space:]]*true[[:space:]]*$/d' "$file"
      rm -f "${file}.bak"
      patched=1
    fi
  done
  [ "$patched" -eq 1 ] || echo "  - ${skill}: 无需补丁或文件不存在"
}

install_fast() {
  echo "==> [4/5] 可选：并列安装正交加速层 agy-fast（不合并源码、不固定版本）"
  local out=""
  if ! out="$(npx -y agy-fast install 2>&1)"; then
    printf '%s\n' "$out" >&2
    echo "✗ agy-fast 安装失败；doctor 输出如下：" >&2
    npx -y agy-fast doctor 2>&1 >&2 || true
    exit 1
  fi
  printf '%s\n' "$out"
}

verify_installed_skills() {
  local listing
  if ! listing="$(npx -y skills@latest ls -g -a antigravity --json </dev/null)"; then
    echo "✗ 安装后核对失败：无法读取 Antigravity 全局技能清单" >&2
    return 1
  fi
  node -e '
const data = JSON.parse(require("fs").readFileSync(0, "utf8"));
const expected = process.argv.slice(1);
const tracked = new Set((Array.isArray(data) ? data : [])
  .filter((s) => s && s.status === "tracked" && typeof s.name === "string")
  .map((s) => s.name));
const missing = expected.filter((name) => !tracked.has(name));
if (missing.length) {
  console.error("✗ 缺少技能：" + missing.join(", "));
  process.exit(1);
}
' "${EXPECTED_SKILLS[@]}" <<<"$listing"
}

scaffold_workspace() {
  command -v curl >/dev/null 2>&1 || { echo "  ! 缺少 curl，跳过文档脚手架" >&2; return 0; }
  if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    echo "  (当前目录不是 Git 工作区，跳过文档脚手架)"
    return 0
  fi

  echo "==> [5/5] 当前工作区补齐 3 份工程文档模板（存在即跳过；不污染 GLOSSARY/ADR/AGENTS）"
  fetch_if_absent() {
    local url="$1" dest="$2"
    mkdir -p "$(dirname "$dest")"
    if [ -e "$dest" ]; then
      echo "  skip $dest"
      return 0
    fi
    if curl -fsSL "$url" -o "$dest"; then
      echo "  add  $dest"
    else
      echo "  warn 拉取失败：$dest" >&2
      rm -f "$dest"
    fi
  }

  fetch_if_absent "$RAW_BASE/templates/constitution.md" "./docs/constitution.md"
  fetch_if_absent "$RAW_BASE/templates/architecture.md" "./docs/architecture.md"
  fetch_if_absent "$RAW_BASE/templates/coding-standards.md" "./docs/coding-standards.md"
}

echo "==> [1/5] 安装 14 个精选原版 ${UPSTREAM} 技能"
npx -y skills@latest add "$UPSTREAM" "${SKILL_FLAGS[@]}" -g -a antigravity -y </dev/null

echo "==> [2/5] 行为补丁：解锁 6 个日常技能的隐式调用（源码零分叉）"
for s in "${AUTO_INVOKE_SKILLS[@]}"; do
  patch_behavior "$s"
done

echo "==> [3/5] 安装或升级 Antigravity 原生插件 ${PLUGIN_NAME}"
if agy plugin list 2>/dev/null | grep -q "$PLUGIN_NAME"; then
  echo "  插件 ${PLUGIN_NAME} 已存在，尝试升级..."
  agy plugin update "$PLUGIN_NAME" 2>/dev/null || agy plugin install "$SELF_REPO"
else
  agy plugin install "$SELF_REPO"
fi

if [ "$WITH_FAST" = true ]; then
  install_fast
else
  echo "==> [4/5] 未指定 --with-fast（钩子运行时会自动探测 agy-fast 是否已安装）"
fi

verify_installed_skills
scaffold_workspace

cat <<'EOF'

✅ 安装完成！
1. 在 T3 Code 点击 Restart agent（或重启 Antigravity）加载插件 hooks / rules / agents。
2. 新项目在 Git 根目录重跑本命令即可补齐 docs/{constitution,architecture,coding-standards}.md（已有文件不覆盖）；GLOSSARY.md 与 docs/adr/ 由 /grill-with-docs 懒创建。
3. 插件 rules/AGENTS.md 已作为全局常驻单一真源加载，不再向业务仓库重复拷贝 AGENTS.md。
4. 日后升级全机技能：npx skills@latest update -g；重跑本脚本即可同步升级 sdd-forge 插件本体。
EOF
