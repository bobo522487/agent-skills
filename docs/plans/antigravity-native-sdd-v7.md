# Antigravity 原生 SDD 工作流 v7 修订方案

> 状态：Accepted（2026-11-27）。本文是对只读附件 `lightweight_sdd_workflow_design_4.md`（v4）的评审后修订稿；附件不改动。本文取代旧 ADR-0001（`0001-antigravity-only-minimal-sdd.md`，已删除），新决策落在 `docs/adr/0001-antigravity-native-plugin-sdd.md`；正交加速层决策落在 `docs/adr/0002-orthogonal-fast-layer.md`；极简人类界面决策落在 `docs/adr/0003-minimal-human-interface.md`（细化 ADR-0001 的交互层，非取代）。

## 0. 评审结论：v4 主张 → 核查事实 → v7 修订

| v4 主张 / 疑点 | 核查事实 | v7 处理 |
|---|---|---|
| 子代理用 `enable_write_tools: false` 实现物理只读 | 该字段只是 `define_subagent` 运行时参数，不是自定义子代理 frontmatter 字段；官方字段为 `name/description/tools/mainAgent/subagent/model/commandExecutionPolicy/mcpServers/skills` 等 | 用 `tools` 白名单省略文件编辑与 shell 工具，并设 `commandExecutionPolicy: off`；`mainAgent: false`、`subagent: true` |
| `PostToolUse` 失败时用 `injectSteps` 注入报错 | 官方 `PostToolUse` 输出契约只有 `{}`，`injectSteps` 仅允许于 SessionStart / PreInvocation / PostInvocation | `post-edit-check.sh` 静默跑检查，失败只把状态写到会话 artifact 目录；`Stop` 读该状态并返回 `{"decision":"continue","reason":"..."}` 注入系统消息，成功时清除状态 |
| `agents/openai.yaml` 的 `allow_implicit_invocation` 补丁 | 这是 Codex 专用字段，Antigravity 只识别 SKILL.md 的 `disable-model-invocation` | 删除该补丁；只删除安装副本中的 `disable-model-invocation: true`（6 个日常技能），上游源码零分叉 |
| 跨模型审查 + 自动回退 | 本机未安装跨模型 CLI；Q7 决定删除跨模型分支 | review-router 收敛为「复杂度 ≤3 单轴 / ≥4 双轴」的原生路由，两个审查代理均物理只读 |
| 可选 `claude-mem` 动态记忆层 | Q8 决定删除 | 无 `--with-memory`、无外部记忆依赖；跨会话知识只用仓库静态 6 件套 |
| 「6 文件静态契约」与 §4 只列 3 个模板矛盾 | 契约应为 6 项：`AGENTS.md` + `constitution.md` + `architecture.md` + `coding-standards.md` + `GLOSSARY.md` + `docs/adr/` | 明确 6 项；仓库用 `rules/AGENTS.md` 与 `templates/*.md` 承载，安装时投射为目标项目文件 |
| 保留 `sdd-init` 技能 | Q6 决定删除 | 删除 `skills/sdd-init/`；初始化由 `install.sh` 末尾 curl 模板到当前 Git 工作区（不覆盖已有文件）+ `rules/AGENTS.md` 承担 |
| 13 个核心技能 | `retro` 第一步硬依赖 `writing-for-agents`，本机缺失 | 补入 `writing-for-agents`，核心技能共 14 个；`--skill=<name>` 精确匹配仓库技能名 |
| 旧 `docs/adr/0001-antigravity-only-minimal-sdd.md` | 与 v7 方向相反（不新增 architecture.md、9 文件终态） | 删除旧 ADR，新建 `0001-antigravity-native-plugin-sdd.md` |
| 根 `plugin.json` / 根 `AGENTS.md` | 多工具仓库下根 `plugin.json` 被 `.antigravity-plugin/plugin.json` 遮蔽，根 `AGENTS.md` 被忽略；均产生 warning，`--strict` 会失败 | 只使用 `.antigravity-plugin/plugin.json` 与 `rules/AGENTS.md`，不留根目录同名文件 |
| `plugin.json` 完整性 | `additionalProperties: false`、仅 `name` 必填；缺 `version` 或非法 `logo` 是 warning，`suggestedPrompts` 最多 3 条 | 写 `version: 7.0.0`，不写 `logo`，`suggestedPrompts` 3 条，无 `$schema`（避免无谓校验风险） |
| Hook 命令路径 | Hook 命令以 plugin root 为 cwd | 统一用相对路径 `./scripts/xxx.sh` 或 `node ./scripts/session-start.mjs`，命令 exit 0 且输出 JSON |

来源：https://antigravity.google/docs/build-plugins.md 、https://antigravity.google/docs/hooks.md 、https://antigravity.google/docs/subagents.md 、https://antigravity.google/docs/permissions.md 、https://antigravity.google/docs/browser.md

## 1. 决策记录（Q1–Q13，已采纳）

- Q1：先出修订方案，再重构仓库（本文件即修订方案）。
- Q2：仅 Antigravity 原生运行时；不兼容 Codex / 其它宿主。
- Q3：「零分叉」= 上游 `mattpocock/skills` 源文件不改；行为差异只通过安装后对副本做 sed 实现。
- Q4：静态契约 6 件套 = `AGENTS.md` + `constitution.md` + `architecture.md` + `coding-standards.md` + `GLOSSARY.md` + `docs/adr/`。
- Q5：修订稿写 `docs/plans/antigravity-native-sdd-v7.md`，附件不动。
- Q6：删除 `skills/sdd-init/`；初始化改由 `install.sh` + curl 模板 + `rules/AGENTS.md` 承担。
- Q7：删除 codex 跨模型分支；review-router 收敛为复杂度 ≤3 单轴 / ≥4 双轴的原生路由。
- Q8：删除 claude-mem 层与 `--with-memory`。
- Q9：删除旧 ADR-0001，新建 `docs/adr/0001-antigravity-native-plugin-sdd.md`。
- Q10：PostToolUse 静默检查、失败只写状态文件；Stop 读文件未闭环时 `decision=continue` + `reason`；SessionStart 保留文档索引注入。
- Q11：`install.sh` 末尾 curl 拉取 `rules/AGENTS.md` + `templates/{constitution,architecture,coding-standards}.md` + `GLOSSARY.md` + `docs/adr/` 样板到当前 Git 工作区，不覆盖已有文件。
- Q12：核心技能补 `writing-for-agents`，共 14 个。
- Q13：跑 `agy plugin validate --strict` 与静态检查；改动留工作区，不 commit。

## 1b. 正交加速层决策（A1–A15，已采纳）

- A1：`agy-fast` 严格独立并列安装；`install.sh --with-fast` 调 `npx -y agy-fast install`，默认不装、不合并源码、不做兼容层。
- A2：只更新本方案 + README/GLOSSARY/rules/ADR；只读附件不动。
- A3：`--with-fast` 时 PostToolUse/Stop 空转；验证交给 `apply_edits(verify: "npm run lint:boundaries")` 同轮内联；SessionStart 保留。
- A4：`/browser` 截图隔离写入 `rules/AGENTS.md` + README；浏览器子代理只回 `文件:行号/选择器/修复点` 纯文本，不改码、不进主会话。
- A5：SessionStart 改 Node 版 fail-open（不依赖 jq，异常输出 `{}` + exit 0）。
- A6：GLOSSARY 新增「正交底层加速层」，新建 `docs/adr/0002-orthogonal-fast-layer.md`。
- A7：版本称谓统一 v7（仓库 `plugin.json` 为 `7.0.0`，方案文件 `antigravity-native-sdd-v7.md`）。
- A8：ADR-0001 状态改为 `Superseded by ADR-0002`；新 ADR 记录「默认双钩子 / --with-fast 零阻塞钩子」条件化双模式。
- A9：钩子关闭机制为全局 marker `~/.agents/sdd-forge-fast`；两脚本启动检测 marker 即空转；`hooks.json` 保持单一真源，不改写已安装插件的 hooks.json。
- A10：新增 `agents/browser-reviewer.md`，只读工具白名单，正文强制只回纯文本；浏览器工具名按官方文档核实，不编造未映射工具名。
- A11：新增 `scripts/session-start.mjs`，`hooks.json` 命令改 `node ./scripts/session-start.mjs`，删除 `scripts/session-start.sh`；输入输出语义不变。
- A12：事实纠偏入文档：verify 是本项目自定义 `npm run lint:boundaries`（上游只示例 `npm run typecheck`）；截图用 `can trigger` 而非必然因果；引用数字须带来源并标注「上游实测，非本项目承诺」。
- A13：不固定 agy-fast 版本，保持独立升级零耦合。
- A14：同时提供 `--without-fast`：只删 marker，不碰 agy-fast 本体，README 说明，避免隐形状态。
- A15：`--with-fast` 安装失败即中止并打印 doctor 输出，不静默降级。

## 1c. 极简人类界面决策（A16–A22，已采纳）

- A16：只做交互层增量；不动 manifest / hooks / 脚本 / 代理 / skill 源码 / `install.sh` / ADR-0002。
- A17：用户可见地图只有极小微调与动脑需求双入口（`/grill-with-docs` → `/implement`）；其余技能、子代理与宿主逃生舱降为内部步骤。
- A18：极小微调 = 恰好 1 文件、≤1 hunk、不改契约/行为、不碰高危路径，改完跑局部快测；越界即进入双入口。
- A19：人工闸门唯一，只有「开工 / 可以」；新业务边界或异常四态变化必须回到 `/grill-with-docs`。
- A20：`/grill-with-docs` 只读 `docs/architecture.md` + `GLOSSARY.md`，只问业务边界与异常四态，技术事实自查；SessionStart 注入只写「尽快」目标，不写精确延迟承诺。
- A21：`/implement` 内部四段决策树——D1 仅启发式（不改 `review-router` 评分），D2 保持原生只读双轴且无跨模型回退，D3 把 `/rewind`、`/boost`、`/browser`、`/retro` 保留为内部/环境能力；`/retro` 仅内部沉淀。
- A22：载体为 `rules/AGENTS.md`、README、`GLOSSARY.md`、本方案与新建 `docs/adr/0003-minimal-human-interface.md`；ADR-0001 标为交互层由 ADR-0003 细化（非 superseded）。验收仅 `agy plugin validate --strict .` + grep 无活跃跨模型分支（`review-router` 的否定式守卫保留）/ 无精确延迟承诺 / 用户可见路径只剩两类入口；不新增脚本冒烟。

## 2. 目标仓库结构

```text
bobo522487/agent-skills/
├── .antigravity-plugin/plugin.json       # 唯一 manifest，strict 校验入口
├── hooks.json                            # SessionStart(Node) + PostToolUse + Stop（marker 空转）
├── rules/AGENTS.md                       # always-on 总规则（含加速层与极简交互层）
├── scripts/
│   ├── session-start.mjs                 # 探测 6 件套并注入索引（Node fail-open）
│   ├── post-edit-check.sh                # 静默跑 lint:boundaries，失败写状态文件；marker 时空转
│   └── stop-verify.sh                    # 读状态文件，未闭环要求 continue；marker 时空转
├── agents/
│   ├── standards-reviewer.md             # 物理只读：无编辑/shell 工具
│   ├── spec-reviewer.md                  # 物理只读：输出 FR 追踪矩阵
│   └── browser-reviewer.md               # 只整理纯文本浏览器问题清单，不回传截图
├── skills/review-router/SKILL.md         # 复杂度决策树路由
├── templates/
│   ├── constitution.md
│   ├── architecture.md
│   ├── coding-standards.md
│   └── permissions.json                  # CLI settings.json 片段模板
├── docs/
│   ├── plans/antigravity-native-sdd-v7.md
│   └── adr/
│       ├── 0001-antigravity-native-plugin-sdd.md
│       ├── 0002-orthogonal-fast-layer.md
│       └── 0003-minimal-human-interface.md
├── GLOSSARY.md
├── README.md
└── install.sh
```

删除：`skills/sdd-init/`（整目录）、`docs/adr/0001-antigravity-only-minimal-sdd.md`、`scripts/session-start.sh`。不新增 `package.json`、不新增根 `AGENTS.md` / 根 `plugin.json`。

## 3. 逐文件规格

### 3.1 `.antigravity-plugin/plugin.json`

- `name: "sdd-forge"`（符合 `^[a-z0-9]+(-[a-z0-9]+)*$`），`version: "7.0.0"`。
- 允许键内写 `displayName/description/author/homepage/repository/keywords/suggestedPrompts`；`suggestedPrompts` 最多 3 条；不写 `logo`、不写 `$schema`。
- 组件由 plugin root 自动发现：`skills/`、`agents/`、`rules/`、`scripts/`、`hooks.json`。

### 3.2 `hooks.json`

三个 hook 定义，命令均以 plugin root 为 cwd：

- `sdd-session-index` → `SessionStart` → `node ./scripts/session-start.mjs`（timeout 5）：输出 `injectSteps.systemMessage`，提示已探测到的文档与规划/收尾入口；异常/无命中 `{}`。
- `sdd-post-edit-gate` → `PostToolUse`，matcher `write_to_file|replace_file_content|multi_replace_file_content` → `./scripts/post-edit-check.sh`（timeout 30）：输出恒为 `{}`；失败写 `$artifactDirectoryPath/sdd-forge-check.json`，成功删除该文件。marker 存在时直接输出 `{}`。
- `sdd-stop-gate` → `Stop` → `./scripts/stop-verify.sh`（timeout 5）：若状态文件仍在，输出 `{"decision":"continue","reason":"..."}`，否则 `{"decision":"allow"}`。marker 存在时直接输出 allow。

### 3.3 `scripts/`

- `session-start.mjs`：无第三方依赖、跨平台；从 stdin JSON 取 `workspacePaths[0] // cwd`；探测 `docs/constitution.md`、`docs/architecture.md`、`docs/coding-standards.md`、`GLOSSARY.md`、`.scratch/issues/*.md`；无命中或任何异常输出 `{}`，自然 exit 0。
- `post-edit-check.sh`：先查 `~/.agents/sdd-forge-fast`，命中即输出 `{}`；无 `package.json` 或无 `scripts["lint:boundaries"]` 时清除状态并输出 `{}`；有时 `npm run -s lint:boundaries 2>&1 | head -n 30`，失败写状态 `{"failedAt":"...","command":"lint:boundaries","excerpt":"..."}`，成功清状态；缺 jq 时 fail open。
- `stop-verify.sh`：marker 命中直接输出 `{"decision":"allow"}`；状态文件存在则读 `excerpt`（最多 30 行）拼入 reason；否则输出 allow。绝不修改工作区文件。

### 3.4 `agents/*.md`

- `standards-reviewer.md` / `spec-reviewer.md` frontmatter：

```yaml
---
name: standards-reviewer
description: 物理只读的规范审查代理；按证据制检查已提交与未提交 diff。
mainAgent: false
subagent: true
model: inherit
tools: [view_file, list_dir, find_by_name, grep_search, send_message]
commandExecutionPolicy: off
---
```

正文要求：读 6 件套；按 `文件:行号` + 触发路径给 Blocker/Major；`spec-reviewer` 输出 `需求 ID | 实现位置 | 测试用例 | 验收结果`，无 Spec 时显式 `Spec 轴跳过`；两代理均 <400 词且不改码。

- `browser-reviewer.md`：同样物理只读白名单；不声明未映射的浏览器工具名；浏览器查看由内置 `browser` 子代理完成，本代理只把纯文本发现整理成 `文件:行号 | 选择器 | 修复点` 表格，禁止回传截图/快照。

### 3.5 `skills/review-router/SKILL.md`

- frontmatter：`name: review-router`、`description: ...`、`disable-model-invocation` 省略（允许隐式调用）。
- 复杂度评分：+1/每超出 1 个文件、+1/每 100 变更行、+3/每个高危命中（DB 迁移 / 鉴权 / API 契约 / 敏感文件 / CI），上限 10。
- ≤3：仅 `@standards-reviewer` 单轴；4–6：并行双轴；≥7 或任一高危命中：双轴 + 明确列出高危触发路径（无跨模型分支）。
- 收尾：合并 findings 表（`文件:行号 | 触发路径 | 严重度 | 修复建议`）+ Spec 矩阵 + PASS/FAIL；返修满 2 轮仍 FAIL 则建议 `/rewind` 或人工拍板。

### 3.6 `templates/`

- `constitution.md`：深模块优先、先减后加零双轨、门禁优先于文档、测试测行为、最小依赖与可逆决策。
- `architecture.md`：技术栈与运行环境、总体分层与单向依赖、核心模块职责表；代码事实标注更新日期/commit。
- `coding-standards.md`：目录规范、边界一次性校验、判别联合、零并发瀑布、异常分类、外部调用超时、前端四态、TDD 红绿、两级有界验证、只测公开契约。
- `permissions.json`：`{"permissions":{"allow":[...],"deny":[...],"ask":[...]}}`，元素为 `action(target)` 字符串；deny 优先于 ask 优先于 allow，避免 `command(*)` 进 ask 抵消 allow。

### 3.7 `rules/AGENTS.md`

分六节：固化文档导航、极简人类界面（两类入口 + 唯一「开工」闸门）、`/implement` 内部四段决策树（D1 规模/契约启发式不改评分、D2 原生双轴、D3 异常/UI 收尾）、写后验证条件化、7 条铁律、可选加速层双模式。

### 3.8 其它文件

- `GLOSSARY.md`：只定义术语；新增「正交底层加速层 / 零阻塞钩子模式 / 浏览器纯文本隔离 / 极简人类界面 / 双入口 / 自动决策树 / 异常四态 / 极小微调」；真源指向 `install.sh` 与 `rules/AGENTS.md`。
- `README.md`：30 秒安装（含 `--with-fast` / `--without-fast` 示例）、两类入口与内部决策树、双模式写后门禁、浏览器隔离、仓库结构、明确砍掉的复杂度、指向三个 ADR。
- `install.sh`：接受 `--with-deep-modules` / `--with-fast` / `--without-fast`（后两者互斥）；要求 `node`/`npx`/`agy`；安装 14 核心技能 → 删除 6 个安装副本中的 `disable-model-invocation: true` → `agy plugin install https://github.com/bobo522487/agent-skills` → 可选安装 agy-fast（失败打印 doctor 并中止）或删 marker → 校验技能清单 → 若当前目录是 Git 工作区则 curl 6 件套 + ADR-0002 样板（存在即跳过）。
- `docs/adr/0001-antigravity-native-plugin-sdd.md`：状态改为 `Superseded by ADR-0002`；决策主体保留，钩子条目标注默认模式。
- `docs/adr/0002-orthogonal-fast-layer.md`：记录独立并列安装、条件化双模式、浏览器隔离、事实纠偏与「上游实测非本项目承诺」。

## 4. 端到端工作流

1. **SessionStart**：Node 脚本 fail-open 注入已探测到的 6 件套索引与待办 Ticket 数量，以尽快注入为目标（非延迟承诺）。
2. **极小微调**：1 文件 / ≤1 hunk / 不改契约行为 / 不碰高危路径，直接改完跑局部快测，不进入流程。
3. **拷问对齐**：动脑需求隐式进入 `/grill-with-docs`（读 architecture + GLOSSARY；只问业务边界与异常四态；确认前不写码）。
4. **唯一闸门**：用户说「开工 / 可以」后进入 `/implement`。
5. **内部决策树**：D1 按 `>3 文件 / 跨模块 / DB·API` 选轻量原地 TDD 或 `to-spec` → `to-tickets` → 逐票 `implement`；D2 走 `review-router` 原生只读双轴；D3 处理返修 2 轮、UI 纯文本隔离与 `/retro` 内部沉淀。
6. **写后门禁**：默认 PostToolUse 静默跑 `lint:boundaries`，失败写状态文件，Stop 强制模型继续处理；`--with-fast` 下两钩子空转，改用 `apply_edits(verify: "npm run lint:boundaries")` 同轮内联，无 marker 时手动局部单测。

用户可见地图只有极小微调 + 两个入口；`/rewind`、`/boost`、`/retro`、`/browser`、`/btw`、`/compact`、`/fork` 为环境提供的逃生舱，`/diagnosing-bugs`、`/improve-codebase-architecture` 为内部维护动作。日常模型建议 Antigravity `Orchestrator`。

## 5. 验证与验收

- `agy plugin validate --strict .` 必须 0 error / 0 warning。
- `bash -n install.sh scripts/*.sh`、`node --check scripts/session-start.mjs` 全通过。
- `jq -e . .antigravity-plugin/plugin.json hooks.json templates/permissions.json` 全通过。
- `node -e` 校验 `suggestedPrompts.length <= 3`、`name` 匹配命名约束。
- 冒烟：Node SessionStart 在有/无文档工作区分别输出注入 JSON / `{}`；非法 stdin 输出 `{}`；marker 不存在时 post-edit/stop 走原逻辑；marker 存在时分别输出 `{}` / `{"decision":"allow"}`；`--without-fast` 只删 marker。
- `git status --short` 显示改动均在工作区；不执行 `git commit`。
- 本轮交互层增量验收只做：`agy plugin validate --strict .` 仍通过；全文 grep 无活跃跨模型分支（仅 `review-router` 保留否定式守卫）、无精确延迟承诺；用户可见路径只剩极小微调 + 两个入口。物理层未改，不新增脚本冒烟。

## 6. 明确不采用

- 不兼容 Codex / 多宿主、不装 `agents/openai.yaml` 补丁。
- 不引入 `claude-mem` / `--with-memory` / 任何跨会话动态记忆服务。
- 不恢复 `sdd-init`、不保留 `docs/pitfalls.md` 脚手架、不维护旧 ADR-0001。
- 不新增根 `AGENTS.md` / 根 `plugin.json` / `package.json`，避免 strict warning。
- 不做跨模型回退链；审查只读性由工具白名单保证，不靠提示词承诺。
- 不把 `agy-fast` 源码合并进本仓库、不做兼容层、不固定版本；不把上游实测数字写成自家承诺；不编造未映射的浏览器工具名。
