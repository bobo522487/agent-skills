# Glossary

> 本文件只承载本插件仓库的术语定义。流程真源见 `rules/AGENTS.md` 与 `skills/review-router/SKILL.md`；技能清单真源见 `install.sh`。

## 静态工程文档契约（Static Engineering Doc Contract）
通用工作流规则由插件 `rules/AGENTS.md` 全局常驻加载；`install.sh`（或 `--init-only`）仅向目标 Git 工作区投射 3 份模板（`docs/constitution.md`、`docs/architecture.md`、`docs/coding-standards.md`，已存在不覆盖）；业务仓的 `GLOSSARY.md` 与 `docs/adr/` 由 `/grill-with-docs` 懒创建维护。

## 宿主原语（Host Primitive）
Antigravity 内置斜杠命令（`/swarm`、`/goal`、`/browser`、`/btw`、`/compact`、`/rewind`、`/fork`、`/boost`），负责调度、真机验证与上下文管理，不拥有仓库业务产物。

## 协议技能（Protocol Skill）
通过 `SKILL.md` 安装的方法论技能（精选原版 `mattpocock/skills` 与仓库内 `review-router`），负责产出与验收持久化工程资产；`disable-model-invocation` 的移除只作用于安装副本。

## 物理门禁（Physical Gate）
能触发编译或 CI 红灯的确定性约束（静态类型、Lint、`dependency-cruiser`、自动化测试），优先级严格高于自然语言提醒。

## 零每步阻塞钩子（Zero Per-Step Blocking Hooks）
插件不注册 `PostToolUse` 钩子；默认仅在 `Stop` 钩子（`scripts/stop-verify.mjs`）且工作区存在未提交源码改动时执行一次 `lint:boundaries`（同一代码指纹最多连续拦截 2 次防死循环）。运行时探测到已安装 `agy-fast` 时 `Stop` 自动放行，验证交给 `apply_edits(verify)` 同轮内联完成。

## 物理只读代理（Physically Read-Only Reviewer）
通过 `tools` 白名单省略文件编辑与 shell 工具、并设 `commandExecutionPolicy: off` 的自定义子代理；只读性由工具集保证，不靠提示词承诺，审查所需的 `git diff` 由主会话通过 `scripts/review-scope.mjs` 收集并传入。

## 行为补丁（Behavior Patch）
安装后对技能副本执行的 `sed` 变更（当前仅删除 `disable-model-invocation: true`）；上游源文件保持零分叉。

## 正交底层加速层（Orthogonal Fast Layer）
独立仓库、独立安装、独立升级的确定性执行加速组件（当前为 `INK-Q/agy-fast`）。它不拥有本项目的工程资产与流程决策，只提供批量搜索/切片/内联 verify 等 MCP 原语；本插件在 `Stop` 钩子运行时自动探测其 manifest，不合并源码、不固定版本、不维护手动 marker。

## 浏览器纯文本隔离（Browser Text-Only Isolation）
`/browser` 的截图与页面快照留在内置 `browser` 子代理的独立上下文；回到主编码会话的只能是 `文件:行号 | 选择器 | 修复点` 纯文本表格。上游数据称长会话加载图片「can trigger」缓存失效，属风险提示而非因果承诺。

## 极简人类界面（Minimal Human Interface）
用户只需掌握两类入口：极小微调，以及动脑需求的 `/grill-with-docs` → `/implement`。其余技能、子代理与宿主命令降为内部步骤或环境提供的逃生舱；人工确认只保留「开工」一个闸门。

## 双入口（Dual Entry）
动脑需求的唯一两个显式入口：`/grill-with-docs`（对齐业务边界与异常四态）与 `/implement`（收到「开工」后执行内部三段决策树）。二者之间只有「开工 / 可以」一个人工闸门，新业务边界或异常四态变化必须回到第一个入口。

## 自动决策树（Automatic Decision Tree）
`/implement` 内部按 D1 规模/契约、D2 审查路由、D3 异常/UI 收尾三段自动选择技能与代理；用户不必显式敲 `to-spec`、`to-tickets`、`tdd`、`review-router`、`retro`。平台不保证 skill-to-skill 自动调用，本规则以文本形式约束模型按序执行。

## 异常四态（Four Exceptional States）
拷问阶段唯一必须向用户确认的业务侧异常分支；具体枚举以 `docs/coding-standards.md` 的异常分类与前端 Loading / Empty / Error / Normal 四态为基础，由 `/grill-with-docs` 与用户确认后写入 `GLOSSARY.md` / `docs/adr/`，模型不得自行补默认值。

## 极小微调（Micro-Tweak）
恰好 1 文件、≤1 hunk、不改契约/行为、不碰高危路径（DB 迁移 / 鉴权 / API 契约 / 敏感文件 / CI）的改动；直接改完跑局部快测，不进入双入口流程。
