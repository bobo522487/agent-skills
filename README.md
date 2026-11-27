# bobo522487/agent-skills

> Antigravity 原生 SDD 工作流插件：极简人类界面（两类入口）+ 静态 6 件套文档契约 + 确定性 Hooks + 物理只读双轴审查 + 14 个零分叉上游技能。单宿主、无跨模型、无动态记忆服务；`agy-fast` 仅作为**正交底层加速层**并列安装，不合并源码。

## 30 秒安装

前置：`node`、`npx`、`agy`（Antigravity CLI）。

```bash
curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash
# TypeScript 项目可附带深模块边界门禁技能：
# curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash -s -- --with-deep-modules
# 可选：并列安装正交加速层 agy-fast（独立仓库、独立升级；默认不装）
# curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash -s -- --with-fast
# 只关闭本插件的加速层空转标记（不卸载 agy-fast）：
# curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash -s -- --without-fast
```

安装器做四件事：装 14 个精选原版 `mattpocock/skills` 到 Antigravity 全局技能目录；只对安装副本删除 6 个日常技能的 `disable-model-invocation: true`；安装并启用原生插件 `sdd-forge`；可选处理加速层 marker。技能选择的唯一真源是 [install.sh](install.sh)；README 只描述用途。

`--with-fast` 内部执行 `npx -y agy-fast install`，失败即打印 `npx -y agy-fast doctor` 并中止，不静默降级；成功后写 `~/.agents/sdd-forge-fast`，让本插件的 PostToolUse/Stop 钩子空转。`--without-fast` 只删该 marker，不碰 agy-fast 本体。两者互斥，均不固定 agy-fast 版本。

## 每仓库一键落地

在 **Git 项目根目录**再次运行同一条命令，安装器会把静态 6 件套样板写入当前工作区（存在即跳过，绝不覆盖）：

```text
AGENTS.md                            ← rules/AGENTS.md
docs/constitution.md                 ← templates/constitution.md
docs/architecture.md                 ← templates/architecture.md
docs/coding-standards.md             ← templates/coding-standards.md
GLOSSARY.md
docs/adr/0001-antigravity-native-plugin-sdd.md
docs/adr/0002-orthogonal-fast-layer.md
```

从非 Git 目录运行时只做全机安装，不写文档。装完在 T3 Code 点击 **Restart agent**（或重启 Antigravity），新开会话即可看到插件的 hooks、规则与技能。

## 日常界面：只记两类动作

1. **极小微调**：恰好 1 文件、≤1 hunk、不改契约/行为、不碰高危路径（DB 迁移 / 鉴权 / API 契约 / 敏感文件 / CI）；直接对话改完跑局部快测，不敲斜杠命令。
2. **动脑需求**：唯一双入口 `/grill-with-docs` → `/implement`。
   - `/grill-with-docs` 隐式触发：先读 `docs/architecture.md` 与 `GLOSSARY.md`，只问业务边界与异常四态；技术事实自查，确认前不写码；结论沉淀到 `GLOSSARY.md` / `docs/adr/`。
   - 人工闸门只有一个：用户说「开工 / 可以」。之后才进入 `/implement`。
   - `/implement` 收到「开工」后执行内部四段决策树，不必显式敲 `to-spec`、`to-tickets`、`tdd`、`review-router`、`retro`。

**内部决策树（不必记）**

- **D1 规模 / 契约**：轻量改动走原地 TDD；`>3 文件 / 跨模块 / DB·API` 时按序 `to-spec` → `to-tickets` → 逐票 `implement`。「跨模块」只是启发式，不改 `review-router` 评分信号。
- **D2 审查路由**：保持原生只读双轴：`≤3` 单轴、`4–6` 双轴、`≥7` 或高危双轴 + 触发路径；无跨模型回退。
- **D3 异常 / UI 收尾**：返修满 2 轮 → `/rewind` 或人工拍板；前端 UI → 内置 `browser` 子代理实测，只回 `文件:行号 | 选择器 | 修复点` 纯文本清单；PASS 且有返工提示 → `/retro` 内部沉淀（机械规则进门禁，判断类进 `docs/coding-standards.md`）。

新业务边界或异常四态变化必须回到 `/grill-with-docs`，不在 `/implement` 内自行假设。

**写后验证有两种模式**：

- 默认：PostToolUse 静默跑 `lint:boundaries`，失败只写状态文件；Stop 读到未闭环状态就返回 `decision=continue` 让模型继续修。
- `--with-fast`：PostToolUse/Stop 空转，编辑验证走 `apply_edits(verify: "npm run lint:boundaries")` 同轮内联；无 marker 时手动跑局部单测。SessionStart 仍保留（Node 版 fail-open）。

SessionStart 以尽快注入文档索引与待办 Ticket 为目标（非延迟承诺）。

**环境提供的逃生舱（非用户入口）**：`/rewind`、`/boost`、`/retro`、`/browser`、`/btw`、`/compact`、`/fork` 为 Antigravity 内置或环境命令；硬核 Bug 搭配 `/diagnosing-bugs`，UI 实测搭配内置 `browser`，截图不进主会话。常态抗熵增：每 3~5 天跑一次 `/improve-codebase-architecture`（内部维护动作）。

日常模型建议选 Antigravity `Orchestrator`。

## 仓库结构

```text
.antigravity-plugin/plugin.json
hooks.json
rules/AGENTS.md
scripts/{session-start.mjs,post-edit-check.sh,stop-verify.sh}
agents/{standards-reviewer,spec-reviewer,browser-reviewer}.md
skills/review-router/SKILL.md
templates/{constitution,architecture,coding-standards}.md + permissions.json
docs/plans/antigravity-native-sdd-v7.md
docs/adr/{0001-antigravity-native-plugin-sdd,0002-orthogonal-fast-layer,0003-minimal-human-interface}.md
GLOSSARY.md
README.md
install.sh
```

## 明确砍掉的复杂度

1. 只服务 Antigravity 原生插件；不维护 Codex / 多宿主兼容分支，不写 `agents/openai.yaml` 补丁。
2. 删除 `sdd-init` 技能与 `docs/pitfalls.md` 脚手架；初始化由 `install.sh` + 模板完成，不覆盖用户改过的文件。
3. 删除跨模型回退链与 `claude-mem` 动态记忆层；审查只读性由工具白名单保证。
4. 不新增根 `AGENTS.md` / 根 `plugin.json` / `package.json`，避免 `agy plugin validate --strict` 的无谓 warning。
5. 上游技能源码零分叉；行为差异只通过安装副本的 `sed` 补丁实现。
6. `agy-fast` 只并列安装：不合并源码、不做兼容层、不固定版本；不把上游实测数字写成自家承诺。
7. 交互层只保留两类入口；`to-spec` / `to-tickets` / `tdd` / `review-router` / `retro` 与宿主逃生舱全部降为内部步骤，不新增用户可见动作。

## 决策依据

- 评审后修订方案：[v7 方案](docs/plans/antigravity-native-sdd-v7.md)
- 插件内核：[ADR-0001](docs/adr/0001-antigravity-native-plugin-sdd.md)（钩子由 ADR-0002 细化，交互层由 ADR-0003 细化）
- 正交加速层：[ADR-0002](docs/adr/0002-orthogonal-fast-layer.md)
- 极简人类界面：[ADR-0003](docs/adr/0003-minimal-human-interface.md)
