# bobo522487/agent-skills

> Antigravity 原生 SDD 工作流插件：静态 6 件套文档契约 + 确定性 Hooks + 物理只读双轴审查 + 14 个零分叉上游技能。单宿主、无跨模型、无动态记忆服务；`agy-fast` 仅作为**正交底层加速层**并列安装，不合并源码。

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

## 日常主干

极小微调（改文案/一行修补）直接对话改完跑局部快测，不敲斜杠命令；凡是要动脑的改动走同一条主干：

```text
1. /grill-with-docs   拷问对齐（先读 architecture + GLOSSARY；确认前不写码）
2. /to-spec           锁定契约（FR-xxx + Seams）
3. /to-tickets        垂直切片（DAG 阻塞边）
4. /implement + /tdd  逐票实施
5. /review-router     按复杂度分派物理只读单轴/双轴审查
```

**写后门禁有两种模式**：

- 默认：PostToolUse 静默跑 `lint:boundaries`，失败只写状态文件；Stop 读到未闭环状态就返回 `decision=continue` 让模型继续修。
- `--with-fast`：PostToolUse/Stop 空转，编辑验证走 `apply_edits(verify: "npm run lint:boundaries")` 同轮内联；SessionStart 仍保留（Node 版 fail-open）。

验收未过最多返修 2 轮，满 2 轮触发 `/rewind` 或人工拍板。PASS 后用 `/retro` 沉淀：机械规则进 Lint/类型/CI，判断类进 `docs/coding-standards.md`。

按需挂件：硬核 Bug / 竞态 / 性能回退 → `/boost` + `/diagnosing-bugs`；前端页面 → `/browser` 由内置 `browser` 子代理实测，截图留在其独立上下文，只回 `文件:行号 | 选择器 | 修复点` 纯文本清单（`@browser-reviewer` 整理），**不要把图片贴回主编码会话**；旁路提问 → `/btw`；阶段切换清上下文 → `/compact`；走歪回退 → `/rewind`；试方案 → `/fork`。常态抗熵增：每 3~5 天跑一次 `/improve-codebase-architecture`。

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
docs/adr/{0001-antigravity-native-plugin-sdd,0002-orthogonal-fast-layer}.md
GLOSSARY.md
README.md
install.sh
```

## 明确砍掉的复杂度

1. 只服务 Antigravity 原生插件；不维护 Codex / 多宿主兼容分支，不写 `agents/openai.yaml` 补丁。
2. 删除 `sdd-init` 技能与 `docs/pitfalls.md` 脚手架；初始化由 `install.sh` + 模板完成，不覆盖用户改过的文件。
3. 删除 `codex exec` 跨模型回退链与 `claude-mem` 动态记忆层；审查只读性由工具白名单保证。
4. 不新增根 `AGENTS.md` / 根 `plugin.json` / `package.json`，避免 `agy plugin validate --strict` 的无谓 warning。
5. 上游技能源码零分叉；行为差异只通过安装副本的 `sed` 补丁实现。
6. `agy-fast` 只并列安装：不合并源码、不做兼容层、不固定版本；不把上游实测数字写成自家承诺。

## 决策依据

- 评审后修订方案：[v7 方案](docs/plans/antigravity-native-sdd-v7.md)
- 插件内核：[ADR-0001](docs/adr/0001-antigravity-native-plugin-sdd.md)（已被 ADR-0002 细化钩子模式）
- 正交加速层：[ADR-0002](docs/adr/0002-orthogonal-fast-layer.md)
