# ADR-0003：采用极简人类界面，只保留两类入口

- **日期**：2026-11-27
- **状态**：Accepted
- **细化**：ADR-0001 的「用户交互层」；ADR-0001 与 ADR-0002 的决策主体继续有效，本 ADR 不取代二者

## 背景

当前工作流要求用户显式记住 `/grill-with-docs`、`/to-spec`、`/to-tickets`、`/implement`、`/tdd`、`/review-router`、`/retro` 以及多个宿主逃生舱。技能数量多、触发方式隐式与手动混杂，认知成本高；而 Antigravity 没有平台级 skill-to-skill 自动调用保证，用户若漏敲一个入口，决策链就断开。

提案要求「只记 2 个动作，其余全交给决策树」：极小微调直接对话完成；动脑需求唯一双入口 `/grill-with-docs` 与 `/implement`，中间只有一个「开工」人工闸门。原提案中的跨模型分支经用户确认是笔误，不纳入本决策；`>=7 / 高危` 仍走原生只读双轴。

## 决策

1. **用户可见地图只有两类入口**：极小微调与动脑需求双入口。其余技能（含 `to-spec`、`to-tickets`、`tdd`、`review-router`、`retro`）及 `/rewind`、`/boost`、`/browser`、`/btw`、`/compact`、`/fork` 降为内部步骤或环境提供的逃生舱。
2. **极小微调严格受限**：恰好 1 文件、≤1 hunk、不改契约/行为、不碰高危路径（DB 迁移 / 鉴权 / API 契约 / 敏感文件 / CI）；改完跑局部快测。越界即进入双入口。
3. **人工闸门唯一**：`/grill-with-docs` 先读 `docs/architecture.md` 与 `GLOSSARY.md`，只问业务边界与异常四态，技术事实自查；用户明确说「开工 / 可以」后才进入 `/implement`。新业务边界或异常四态变化必须回到 `/grill-with-docs`。
4. **`/implement` 内部三段决策树**：收到「开工」后自动执行——D1 按 `>3 文件 / 跨模块 / DB·API` 在轻量原地 TDD 与 `to-spec` → `to-tickets` → 逐票 `implement` 之间选择；D2 保持 `review-router` 原生只读双轴（`≤3` 单轴、`4–6` 双轴、`≥7`/高危双轴 + 触发路径，无跨模型回退）；D3 处理返修满 2 轮、UI 纯文本隔离与 `/retro` 内部沉淀。
5. **载体只在交互层**：决策树写入 `rules/AGENTS.md` 与文档（README、GLOSSARY、本 ADR）；不改变双轴只读原则。D1 的「跨模块」只是用户启发式，不改变 `review-router` 评分信号。
6. **验证条件化**：运行时探测到 `agy-fast` 时用 `apply_edits(verify: "npm run lint:boundaries")` 同轮内联；否则由 `Stop` 钩子自动执行一次 `lint:boundaries`（或手动局部单测）。不引用上游 `npm run typecheck` 示例；SessionStart 注入只写为目标，不写精确延迟承诺。

## 权衡与后果

- **收益**：用户记忆负担从多条命令降为两类入口；「开工」成为唯一人工确认点；技术事实与业务边界的提问边界被显式化。
- **代价**：流程透明度下降——用户看不到中间技能链，需信任 `rules/AGENTS.md` 的自动执行；平台不保证 skill-to-skill 自动调用，决策树是文本约束而非机制保证；若新业务边界未在拷问阶段暴露，`/implement` 必须回退到 `/grill-with-docs`，会多一轮交互。
- **可逆性**：只改文档与规则文本，回滚成本低；但用户习惯形成后，重新显式化命令链需要同步更新 README、GLOSSARY 与本 ADR。
- **验收**：`agy plugin validate --strict .` 仍通过；全文无活跃跨模型分支（`review-router` 的否定式守卫保留）、无精确延迟承诺；用户可见路径只剩极小微调 + 两个入口，其余均为内部步骤。
