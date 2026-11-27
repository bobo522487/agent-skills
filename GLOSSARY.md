# Glossary

> 本文件只承载术语定义。流程真源见 `rules/AGENTS.md` 与 `skills/review-router/SKILL.md`；技能清单真源见 `install.sh`。

## 固化文档契约（Static Six-File Contract）
`AGENTS.md` + `constitution.md` + `architecture.md` + `coding-standards.md` + `GLOSSARY.md` + `docs/adr/`。由 `install.sh` 投射到目标 Git 工作区，已存在文件不覆盖。

## 宿主原语（Host Primitive）
Antigravity 内置斜杠命令（`/swarm`、`/goal`、`/browser`、`/btw`、`/compact`、`/rewind`、`/fork`、`/boost`），负责调度、真机验证与上下文管理，不拥有仓库业务产物。

## 协议技能（Protocol Skill）
通过 `SKILL.md` 安装的方法论技能（精选原版 `mattpocock/skills` 与仓库内 `review-router`），负责产出与验收持久化工程资产；`disable-model-invocation` 的移除只作用于安装副本。

## 物理门禁（Physical Gate）
能触发编译或 CI 红灯的确定性约束（静态类型、Lint、`dependency-cruiser`、自动化测试），优先级严格高于自然语言提醒。

## 状态文件中继（State-File Relay）
默认模式下，`PostToolUse` 的输出契约只有 `{}`，无法直接注入报错；因此把检查结果写入会话 artifact 目录的状态文件，由 `Stop` 读取并以 `decision=continue` + `reason` 完成闭环。启用加速层后该中继空转。

## 物理只读代理（Physically Read-Only Reviewer）
通过 `tools` 白名单省略文件编辑与 shell 工具、并设 `commandExecutionPolicy: off` 的自定义子代理；只读性由工具集保证，不靠提示词承诺。

## 行为补丁（Behavior Patch）
安装后对技能副本执行的 `sed` 变更（当前仅删除 `disable-model-invocation: true`）；上游源文件保持零分叉。

## 正交底层加速层（Orthogonal Fast Layer）
独立仓库、独立安装、独立升级的确定性执行加速组件（当前为 `INK-Q/agy-fast`）。它不拥有本项目的工程资产与流程决策，只提供批量搜索/切片/内联 verify 等 MCP 原语；本插件只通过全局 marker 切换自身钩子的空转与否，不合并其源码、不固定其版本、不做兼容层。

## 零阻塞钩子模式（Zero-Blocking-Hook Mode）
`install.sh --with-fast` 写入 `~/.agents/sdd-forge-fast` 后的状态：`PostToolUse` 与 `Stop` 立即返回 `{}` / `{"decision":"allow"}`，`SessionStart` 仍保留；编辑后验证改由 `apply_edits(verify: "npm run lint:boundaries")` 在同轮内联完成。`--without-fast` 只删 marker，不卸载 agy-fast。

## 浏览器纯文本隔离（Browser Text-Only Isolation）
`/browser` 的截图与页面快照留在内置 `browser` 子代理的独立上下文；回到主编码会话的只能是 `文件:行号 | 选择器 | 修复点` 纯文本清单，由 `browser-reviewer` 整理。上游数据称长会话加载图片「can trigger」缓存失效，属风险提示而非因果承诺。
