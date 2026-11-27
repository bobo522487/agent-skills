# Project Agent Operating Rules

## 1. 先查索引，再动手（导航指针）
- 工程原则与红线：`docs/constitution.md`
- 总体架构与模块职责：`docs/architecture.md`（如已建立）
- 编码与测试规范：`docs/coding-standards.md`（如已建立）
- 业务统一术语：`GLOSSARY.md`（代码命名与沟通严格对齐）
- 架构决策记录：`docs/adr/`
- 高频错题本：`docs/pitfalls.md`（动手前必看；严控 <= 30 条，必带日期或 `@commit`）
- Spec 增强格式：`docs/spec-template.md`

## 2. 任务分级路由
- **L0 微调（5 分钟单文件）**：查既有复用 → 直接改 → 跑局部类型/单测。
- **L1 轻量功能**：`/grill-me`（1 轮对齐）→ `/tdd` 实现 → `/code-review`。
- **L2 跨文件新功能**：`/grill-with-docs` → `/to-spec` → `/to-tickets` → `/implement`（或 `/implement-spec`）→ `/code-review`。
- **L3 核心架构/大改造**：先用 `/wayfinder` 拆决策地图，再按 L2 推进并沉淀 `docs/adr/`。

## 3. 铁律补充（叠加于 mattpocock/skills）
1. **不问可查事实**：代码/文档能查清的事实与跑小实验能证伪的分叉自己消化，提问只留给业务规则、边界四态与产品取舍。
2. **需求可追踪**：`/to-spec` 中每条功能需求必须编唯一 ID（`FR-001`…）；`/code-review` 的 Spec 轴收尾必须输出追踪矩阵：`需求 ID | 实现位置 | 测试用例 | 验收结果`。
3. **只读证据制审查**：Review 阶段严禁边审边改；每条 Blocker/Major 必附 `文件:行号` 与触发路径，严查重复造轮子与「新旧两套写法并存」。
4. **两级有界验证**：单 Ticket 实施时仅跑本领域局部快测（`<= 30s`）；集成验收时统一跑受影响范围的类型、边界检查与测试。
5. **2 轮熔断（Attack the Premise）**：同一问题返修满 2 轮未过，禁止第 3 轮盲修——必须先列出前两轮共同依赖的底层假设并证伪，或交由人工拍板。
6. **历史锚定与错题晋升**：涉及代码事实的记录必带日期或 `@commit`，过时标 `superseded`；同类失误在 `docs/pitfalls.md` 出现 >= 2 次必须固化为「唯一入口 > 类型锁死 > Lint/边界门禁 > 测试」，固化后删掉文字。

## Agent skills

### Issue tracker

- GitHub Issues (`bobo522487/agent-skills`)，所有 issue 操作走 `gh` CLI。
- 约定：sub-issues 用 `--parent` / `--add-sub-issue`；阻塞依赖用 GitHub 原生 issue dependencies（`--blocked-by`，旧版走 `gh api .../dependencies/blocked_by`）；未启用时用正文 `Part of #<parent>` / `Blocked by: #<n>` 兜底。
- PR 不作为请求面（`PRs as a request surface: no`）。
- 详见 `docs/agents/issue-tracker.md`。

### Triage labels

- 保留默认五个标签：`needs-triage`、`needs-info`、`ready-for-agent`、`ready-for-human`、`wontfix`。
- 详见 `docs/agents/triage-labels.md`。

### Domain docs

- 单上下文仓库（无 `GLOSSARY-MAP.md`）：根 `GLOSSARY.md` + `docs/adr/`；不存在时静默跳过，不主动建议创建。
- 探索和产出中统一使用 `GLOSSARY.md` 术语；若与既有 ADR 冲突必须显式指出。
- 详见 `docs/agents/domain.md`。
