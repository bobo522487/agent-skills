#!/usr/bin/env bash
set -euo pipefail

UPSTREAM="mattpocock/skills"
SELF_SLUG="bobo522487/agent-skills"
SELF_REPO="https://github.com/${SELF_SLUG}"
PLUGIN_NAME="sdd-forge"
WITH_DEEP_MODULES=false
WITH_FAST=false
INIT_ONLY=false
TARGET_REF=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --with-deep-modules) WITH_DEEP_MODULES=true ;;
    --with-fast) WITH_FAST=true ;;
    --init-only) INIT_ONLY=true ;;
    --version)
      shift
      [ "$#" -gt 0 ] || { echo "✗ --version 缺少版本号（例如 v7.1.0）" >&2; exit 1; }
      TARGET_REF="$1"
      ;;
    --version=*)
      TARGET_REF="${1#--version=}"
      ;;
    *) echo "Unknown option: $1" >&2; exit 1 ;;
  esac
  shift
done

resolve_target_ref() {
  if [ -n "$TARGET_REF" ]; then
    printf '%s\n' "$TARGET_REF"
    return 0
  fi
  if command -v curl >/dev/null 2>&1; then
    local latest=""
    latest="$(curl -fsSL --max-time 5 -H "Accept: application/vnd.github+json" \
      "https://api.github.com/repos/${SELF_SLUG}/releases/latest" 2>/dev/null \
      | node -e 'try{const d=JSON.parse(require("fs").readFileSync(0,"utf8"));if(typeof d.tag_name==="string")process.stdout.write(d.tag_name);}catch{}' || true)"
    if [ -n "$latest" ]; then
      printf '%s\n' "$latest"
      return 0
    fi
  fi
  printf 'main\n'
}

RESOLVED_REF="$(resolve_target_ref)"
RAW_BASE="https://raw.githubusercontent.com/${SELF_SLUG}/${RESOLVED_REF}"

# 12 个核心技能：唯一真源；已剔除与自建流程重叠的 grilling 与 code-review。
CORE_SKILLS=(
  setup-matt-pocock-skills
  grill-with-docs
  to-spec
  to-tickets
  implement
  tdd
  diagnosing-bugs
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

find_local_templates_dir() {
  local script_dir=""
  if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
    script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  fi
  local candidates=(
    "${script_dir:+${script_dir}/templates}"
    "${GEMINI_HOME:+${GEMINI_HOME}/config/plugins/${PLUGIN_NAME}/templates}"
    "${HOME}/.gemini/config/plugins/${PLUGIN_NAME}/templates"
    "${HOME}/.agents/plugins/${PLUGIN_NAME}/templates"
  )
  for dir in "${candidates[@]}"; do
    if [ -n "$dir" ] && [ -d "$dir" ] && [ -f "${dir}/constitution.md" ]; then
      printf '%s\n' "$dir"
      return 0
    fi
  done
  return 1
}

scaffold_workspace() {
  local repo_root=""
  repo_root="$(git rev-parse --show-toplevel 2>/dev/null || true)"
  if [ -z "$repo_root" ]; then
    if [ "$INIT_ONLY" = true ]; then
      echo "✗ --init-only 需要在 Git 仓库内运行" >&2
      return 1
    fi
    echo "  (当前目录不是 Git 工作区，跳过文档脚手架)"
    return 0
  fi

  local local_tpl_dir=""
  local_tpl_dir="$(find_local_templates_dir || true)"
  if [ -n "$local_tpl_dir" ]; then
    echo "==> 补齐 3 份工程文档模板（目标：${repo_root}/docs；本地源：${local_tpl_dir}；存在即跳过）"
  else
    command -v curl >/dev/null 2>&1 || { echo "✗ 未找到本地插件模板且缺少 curl，无法初始化文档" >&2; return 1; }
    echo "==> 补齐 3 份工程文档模板（目标：${repo_root}/docs；远程源：${RAW_BASE}/templates；存在即跳过）"
  fi

  local failed=0
  install_template() {
    local name="$1" dest="$2"
    mkdir -p "$(dirname "$dest")"
    if [ -e "$dest" ]; then
      echo "  skip $dest"
      return 0
    fi
    if [ -n "$local_tpl_dir" ] && [ -f "${local_tpl_dir}/${name}" ]; then
      if cp "${local_tpl_dir}/${name}" "$dest"; then
        echo "  add  $dest (local)"
        return 0
      fi
    fi
    if command -v curl >/dev/null 2>&1 && curl -fsSL "${RAW_BASE}/templates/${name}" -o "$dest"; then
      echo "  add  $dest (remote)"
    else
      echo "  ✗ 获取模板失败：${dest}" >&2
      rm -f "$dest"
      failed=$((failed + 1))
    fi
  }

  install_template "constitution.md" "${repo_root}/docs/constitution.md"
  install_template "architecture.md" "${repo_root}/docs/architecture.md"
  install_template "coding-standards.md" "${repo_root}/docs/coding-standards.md"

  if [ "$failed" -gt 0 ]; then
    echo "✗ 文档脚手架有 ${failed} 份模板获取失败，请检查网络或本地插件安装状态" >&2
    return 1
  fi
}

if [ "$INIT_ONLY" = true ]; then
  scaffold_workspace
  echo "✅ 项目文档模板初始化完成（GLOSSARY.md 与 docs/adr/ 由 /grill-with-docs 懒创建）。"
  exit 0
fi

for bin in node npx agy git; do
  command -v "$bin" >/dev/null 2>&1 || { echo "✗ 缺少 $bin，请先安装" >&2; exit 1; }
done

patch_behavior() {
  local skill="$1"
  local candidates=(
    "${GEMINI_HOME:+${GEMINI_HOME}/config/skills/${skill}/SKILL.md}"
    "${HOME}/.agents/skills/${skill}/SKILL.md"
    "${HOME}/.gemini/config/skills/${skill}/SKILL.md"
  )
  local patched=0
  for file in "${candidates[@]}"; do
    [ -n "$file" ] && [ -f "$file" ] || continue
    if grep -q '^disable-model-invocation:[[:space:]]*true[[:space:]]*$' "$file"; then
      sed -i.bak '/^disable-model-invocation:[[:space:]]*true[[:space:]]*$/d' "$file"
      rm -f "${file}.bak"
      patched=1
    fi
  done
  [ "$patched" -eq 1 ] || echo "  - ${skill}: 无需补丁或文件不存在"
}

install_or_upgrade_plugin() {
  local tmp_dir=""
  tmp_dir="$(mktemp -d)"
  trap 'rm -rf "$tmp_dir"' RETURN

  echo "  暂存目标版本 (${RESOLVED_REF}) 并执行严格校验..."
  git clone --depth 1 --branch "$RESOLVED_REF" "${SELF_REPO}.git" "$tmp_dir/sdd-forge" >/dev/null 2>&1 || {
    echo "✗ 无法拉取 ${SELF_REPO} 的分支或标签：${RESOLVED_REF}" >&2
    return 1
  }

  if ! agy plugin validate --strict "$tmp_dir/sdd-forge" >/dev/null 2>&1; then
    echo "✗ 新版插件校验未通过，已保留原有安装不变" >&2
    agy plugin validate --strict "$tmp_dir/sdd-forge" >&2 || true
    return 1
  fi

  if agy plugin list 2>/dev/null | grep -Eq "(^|[[:space:]])${PLUGIN_NAME}([[:space:]]|$)"; then
    echo "  卸载旧版 ${PLUGIN_NAME} 并安装已校验的新版 (${RESOLVED_REF})..."
    agy plugin uninstall "$PLUGIN_NAME" >/dev/null 2>&1 || true
  fi
  agy plugin install "$tmp_dir/sdd-forge"
  agy plugin enable "$PLUGIN_NAME" >/dev/null 2>&1 || true
}

install_fast() {
  echo "==> [4/5] 可选：并列安装正交加速层 agy-fast（不合并源码、不固定版本）"
  local out=""
  if ! out="$(npx -y agy-fast install 2>&1)"; then
    printf '%s\n' "$out" >&2
    echo "✗ agy-fast 安装失败；doctor 输出如下：" >&2
    npx -y agy-fast doctor >&2 || true
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

echo "==> [1/5] 安装/更新 12 个精选原版 ${UPSTREAM} 技能"
npx -y skills@latest add "$UPSTREAM" "${SKILL_FLAGS[@]}" -g -a antigravity -y </dev/null

echo "==> [2/5] 行为补丁：重新解锁 6 个日常技能的隐式调用（防上游更新覆写）"
for s in "${AUTO_INVOKE_SKILLS[@]}"; do
  patch_behavior "$s"
done

echo "==> [3/5] 原子校验并安装/升级 Antigravity 原生插件 ${PLUGIN_NAME} (${RESOLVED_REF})"
install_or_upgrade_plugin

if [ "$WITH_FAST" = true ]; then
  install_fast
else
  echo "==> [4/5] 未指定 --with-fast（钩子运行时会自动探测 agy-fast 是否已安装）"
fi

verify_installed_skills

# 升级成功后刷新本地更新缓存，避免下一次会话误报旧版本
rm -f "${HOME}/.agents/sdd-forge-update-cache.json" 2>/dev/null || true

echo "==> [5/5] 当前工作区文档脚手架检查（已存在文件永不覆盖）"
scaffold_workspace

cat <<EOF

✅ 安装/升级完成（版本：${RESOLVED_REF}）！
1. 在 T3 Code 点击 Restart agent（或重启 Antigravity）使新版 hooks / rules / agents 生效。
2. 日后升级全机（含插件本体、上游技能与隐式调用补丁）只需重跑同一条命令；支持 --version vX.Y.Z 锁定或回滚版本。
3. 业务仓库已有的 docs/{constitution,architecture,coding-standards}.md 不会被覆盖，模板变更请对照 GitHub Release Notes 按需合入。
EOF
