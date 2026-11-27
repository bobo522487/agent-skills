# Agent Operating Rules

## 1. 固化文档导航（按需读取，勿全量塞入上下文）
- 长期工程原则：`docs/constitution.md`
- 整体架构、技术栈与模块职责：`docs/architecture.md`（规划与设计前必读）
- 目录、编码、异常与测试规范：`docs/coding-standards.md`（实施不常驻，Review 必读）
- 业务术语：`GLOSSARY.md` | 架构决策：`docs/adr/`（ADR-0002 细化加速层，ADR-0003 细化交互层） | 路由规则：`/review-router`（内部步骤）

## 2. 极简人类界面：只记两类入口
- **极小微调**：恰好 1 文件、≤1 hunk、不改契约/行为、不碰高危路径（DB 迁移 / 鉴权 / API 契约 / 敏感文件 / CI）；直接改完跑局部快测，不启动流程技能。
- **动脑需求**：唯一双入口 `/grill-with-docs` → `/implement`。
  - `/grill-with-docs` 隐式触发：先读 `docs/architecture.md` 与 `GLOSSARY.md`；只问业务边界与异常四态，技术事实自己查；确认前不写码；结论沉淀到 `GLOSSARY.md` / `docs/adr/`。
  - 人工闸门只有一个：用户明确说「开工 / 可以」。之后才进入 `/implement`。
  - 新业务边界或异常四态发生变化，必须回到 `/grill-with-docs`，不在 `/implement` 内自行假设。
- 其余技能（`to-spec`、`to-tickets`、`tdd`、`review-router`、`browser-reviewer`、`retro`）以及 `/rewind`、`/boost`、`/retro`、`/browser`、`/btw`、`/compact`、`/fork` 都是内部步骤或环境提供的逃生舱，不进入用户可见地图。

## 3. `/implement` 内部四段决策树（不必记，规则自动执行）
1. **D0 入口**：收到「开工」后接管；不再重复确认已由 `/grill-with-docs` 对齐的业务边界与异常四态。
2. **D1 规模 / 契约**：轻量改动走原地 TDD；`>3 文件 / 跨模块 / DB·API` 时按序使用 `to-spec` → `to-tickets` → 逐票 `implement`（隐式或手动触发，平台不保证 skill-to-skill 自动调用）。「跨模块」只是用户启发式，不改动 `review-router` 评分信号。
3. **D2 审查路由**：保持 `review-router` 原生只读双轴：`≤3` 单轴、`4–6` 双轴、`≥7` 或高危双轴 + 触发路径；无跨模型、无回退层。
4. **D3 异常 / UI 收尾**：返修满 2 轮仍 FAIL → `/rewind` 或人工拍板；前端 UI → 内置 `browser` 子代理实测，只回 `文件:行号 | 选择器 | 修复点` 纯文本清单；PASS 且有返工提示 → `/retro` 内部沉淀（机械规则进门禁，判断类进 `docs/coding-standards.md`）。

## 4. 写后验证（条件化）
- 默认：PostToolUse 静默跑 `lint:boundaries`，失败只写状态文件；Stop 未闭环时 `decision=continue` + `reason`。
- 加速层 marker 存在：用 `apply_edits(verify: "npm run lint:boundaries")` 同轮内联验证；否则手动跑局部单测。不引用上游 `npm run typecheck` 示例。
- SessionStart 以尽快注入文档索引为目标（非延迟承诺）；Node 版 fail-open，异常输出 `{}`。

## 5. 核心铁律
1. **手术刀式变更**：动手前暴露关键假设；只写最小解法；严禁顺手改无关文件或过度抽象。
2. **不问可查事实**：代码、文档与小实验可证伪的分叉自己消化，提问只留给业务规则与异常四态。
3. **需求可追踪**：`to-spec` 每条需求编 `FR-001`…；收尾输出 `需求 ID | 实现位置 | 测试用例 | 验收结果`。
4. **物理只读证据制**：`/review-router` 调用的物理只读代理不改码；每条 Blocker/Major 必附 `文件:行号` 与触发路径。
5. **走歪即回退**：同一问题返修满 2 轮未过，停止第 3 轮盲修——建议 `/rewind` 或人工拍板。
6. **高密度输出**：直接给结论、文件路径与验证结果，去除客套废话。
7. **浏览器纯文本隔离**：UI 实测走内置 `browser` 子代理（`/browser`）；截图/快照留在其独立上下文，主编码会话只接收纯文本清单（由 `browser-reviewer` 整理），禁止把图片贴回主会话。上游「can trigger 缓存失效」仅为风险提示，非因果承诺。

## 6. 可选加速层（正交，不拥有本仓库资产）
- 默认：PostToolUse 静默跑 `lint:boundaries` + Stop 读状态文件中继；SessionStart 用 `node ./scripts/session-start.mjs` fail-open 注入文档索引。
- `install.sh --with-fast` 后：写入 `~/.agents/sdd-forge-fast`，PostToolUse/Stop 空转；`--without-fast` 只删 marker，不卸载 agy-fast。
