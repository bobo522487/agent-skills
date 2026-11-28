# bobo522487/agent-skills

> Antigravity 原生 SDD 工作流插件：极简人类界面（两类入口）+ 静态工程文档契约 + 零每步阻塞 Hooks + 物理只读双轴审查 + 12 个零分叉上游技能。`agy-fast` 仅作为**正交底层加速层**并列安装，不合并源码。

## 30 秒安装

前置：`node`、`npx`、`agy`（Antigravity CLI）。

```bash
curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash
# TypeScript 项目可附带深模块边界门禁技能：
# curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash -s -- --with-deep-modules
# 可选：并列安装正交加速层 agy-fast（独立仓库、独立升级；运行时自动探测，无需手动 marker）
# curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash -s -- --with-fast
```

安装器做四件事：装 12 个精选原版 `mattpocock/skills` 到 Antigravity 全局技能目录；只对安装副本删除 6 个日常技能的 `disable-model-invocation: true`；安装或升级原生插件 `sdd-forge`；可选并列安装 `agy-fast`。技能选择的唯一真源是 [install.sh](install.sh)。

## 每仓库一键落地

在 **Git 项目根目录**再次运行同一条命令，安装器仅补齐 3 份业务工程文档模板（存在即跳过，绝不覆盖，也不把插件自身的 `GLOSSARY.md`、`docs/adr/` 或 `rules/AGENTS.md` 污染进业务仓）：

```text
docs/constitution.md                 ← templates/constitution.md
docs/architecture.md                 ← templates/architecture.md
docs/coding-standards.md             ← templates/coding-standards.md
```

- 通用工作流规则由插件 `rules/AGENTS.md` 作为全局常驻单一真源加载，不再向业务仓库重复拷贝 `AGENTS.md`。
- 业务仓库的 `GLOSSARY.md` 与 `docs/adr/` 由 `/grill-with-docs` 在对齐需求时懒创建并维护。
- 装完在 T3 Code 点击 **Restart agent**（或重启 Antigravity）生效。

## 日常界面：只记两类动作

1. **极小微调**：恰好 1 文件、≤1 hunk、不改契约/行为、不碰高危路径（DB 迁移 / 鉴权 / API 契约 / 敏感文件 / CI）；直接对话改完跑局部快测，不敲斜杠命令。
2. **动脑需求**：唯一双入口 `/grill-with-docs` → `/implement`。
   - `/grill-with-docs` 隐式触发：先读 `docs/architecture.md` 与 `GLOSSARY.md`，只问业务边界与异常四态；技术事实自查，确认前不写码；结论沉淀到 `GLOSSARY.md` / `docs/adr/`。
   - 人工闸门只有一个：用户说「开工 / 可以」。之后才进入 `/implement`。
   - `/implement` 收到「开工」后执行内部四段决策树，不必显式敲 `to-spec`、`to-tickets`、`tdd`、`review-router`、`retro`。

**内部决策树（不必记）**

- **D1 规模 / 契约**：轻量改动走原地 TDD；`>3 文件 / 跨模块 / DB·API` 时按序 `to-spec` → `to-tickets` → 逐票 `implement`。
- **D2 审查路由**：保持原生只读双轴：`≤3` 单轴、`4–6` 双轴、`≥7` 或高危双轴 + 触发路径；主会话传入 `git diff`，由物理只读代理核对。
- **D3 异常 / UI 收尾**：返修满 2 轮 → `/rewind` 或人工拍板；前端 UI → 内置 `browser` 子代理实测，直接返回 `文件:行号 | 选择器 | 修复点` 纯文本表格（截图留在子代理上下文）；PASS 且有返工提示 → `/retro` 内部沉淀（机械规则进门禁，判断类进 `docs/coding-standards.md`）。

**写后验证（零每步阻塞）**

- 默认：仅在 `Stop` 钩子自动执行一次 `lint:boundaries`（如仓库已声明），失败返回 `decision=continue`；不注册每步阻塞的 `PostToolUse`。
- 自动探测到已安装 `agy-fast` 时：`Stop` 钩子自动放行，编辑验证走 `apply_edits(verify: "npm run lint:boundaries")` 同轮内联执行。
- `SessionStart` 以跨平台 fail-open Node 脚本扫描 4 份核心文档与 `.scratch/*/spec.md` / `.scratch/*/issues/*.md`。

日常模型建议选 Antigravity `Orchestrator`。

## 仓库结构

```text
.antigravity-plugin/plugin.json
hooks.json
rules/AGENTS.md
scripts/{session-start.mjs,stop-verify.mjs}
agents/{standards-reviewer,spec-reviewer}.md
skills/review-router/SKILL.md
templates/{constitution,architecture,coding-standards}.md
docs/plans/antigravity-native-sdd-v7.md
docs/adr/{0001-antigravity-native-plugin-sdd,0002-orthogonal-fast-layer,0003-minimal-human-interface}.md
GLOSSARY.md
README.md
install.sh
```
