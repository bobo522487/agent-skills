# ADR-0001：采用 Antigravity 原生插件作为 SDD 确定性内核

- **日期**：2026-11-27
- **状态**：Superseded by ADR-0002；交互层由 ADR-0003 细化（非 superseded，决策主体仍有效）
- **取代**：`0001-antigravity-only-minimal-sdd.md`（已删除）
- **细化**：`0002-orthogonal-fast-layer.md`（可选加速层；默认模式不变）；`0003-minimal-human-interface.md`（用户交互层；插件内核与双轴审查决策不变）

## 背景

早期仓库以「9 文件终态 + 宿主原语驱动精选技能」为目标，明确不新增 `architecture.md`、不建插件骨架。随后评审一份混合方案，发现三处关键错配：把 `enable_write_tools: false` 当成子代理只读字段（实际不是 frontmatter 字段）、把 `PostToolUse` 当成可注入报错的钩子（实际输出契约只有 `{}`）、依赖本机不存在的 `codex` 做跨模型审查。继续沿用旧 ADR 会让「静态 6 件套 + 确定性 Hooks + 物理只读审查」无处落地。

## 决策

1. **Antigravity-only 插件内核**：以 `.antigravity-plugin/plugin.json` 为唯一 manifest，配合 `hooks.json`、`rules/AGENTS.md`、`scripts/`、`agents/`、`skills/review-router/`。不兼容 Codex / 其它宿主，不写 `agents/openai.yaml` 补丁。
2. **静态 6 件套契约**：目标项目固定为 `AGENTS.md` + `constitution.md` + `architecture.md` + `coding-standards.md` + `GLOSSARY.md` + `docs/adr/`。删除 `sdd-init` 技能，改由 `install.sh` 在 Git 工作区投射模板，已存在文件不覆盖。
3. **状态文件中继**：`PostToolUse` 静默运行 `lint:boundaries`，失败只写会话 artifact 目录状态文件；`Stop` 读状态并返回 `decision=continue` + `reason` 完成闭环。`SessionStart` 只注入文档索引，不塞全文。此条描述**默认模式**；启用 `--with-fast` 后 PostToolUse/Stop 空转，见 ADR-0002。
4. **物理只读双轴审查**：`@standards-reviewer` 与 `@spec-reviewer` 用 `tools` 白名单省略编辑/shell 工具，并设 `commandExecutionPolicy: off`。`/review-router` 按复杂度 ≤3 单轴、≥4 双轴路由；删除跨模型分支与回退链。
5. **零分叉行为补丁**：上游 `mattpocock/skills` 源文件不改；仅删除安装副本中 6 个日常技能的 `disable-model-invocation: true`。核心技能补 `writing-for-agents`（`retro` 硬依赖），共 14 个。
6. **不引入动态记忆**：删除 `claude-mem` 与 `--with-memory`；跨会话知识只进仓库静态文档。

## 权衡与后果

- **收益**：把「靠模型记住」变成内核确定性拦截；审查只读性由工具集保证；文档按加载时机分层，实施阶段不被审校规范撑爆上下文。
- **代价**：仓库从 9 文件增长到 13 类文件；新增 3 个 shell 脚本与 2 个代理定义；`--strict` 校验成为必需门禁；失去跨模型交叉审与自动情景记忆的冗余。
- **迁移**：旧 ADR-0001 的「9 文件 / 不新增 architecture.md」立场被本 ADR 取代；`sdd-init` 与其 `docs/pitfalls.md` 脚手架一并删除。仓库产物（`GLOSSARY.md`、`docs/adr/`、`FR-xxx` Spec、垂直切片）仍与宿主无关。
- **验证**：`agy plugin validate --strict .`、`bash -n` 脚本检查、`jq -e` JSON 检查全部通过后，改动留在工作区不提交。
