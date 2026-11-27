# Agent Operating Rules

## 1. 固化文档导航（按需读取，勿全量塞入上下文）
- 长期工程原则：`docs/constitution.md`
- 整体架构、技术栈与模块职责：`docs/architecture.md`（规划与设计前必读）
- 目录、编码、异常与测试规范：`docs/coding-standards.md`（实施不常驻，Review 必读）
- 业务术语：`GLOSSARY.md` | 架构决策：`docs/adr/`（ADR-0002 细化加速层） | 路由规则：`/review-router`

## 2. 隐式触发与人工确认闸门
- 极小微调：直接改并跑局部快测，不启动流程技能。
- 新需求 / 重构：自动进入 `grill-with-docs`（先读 `docs/architecture.md` 与 `GLOSSARY.md`，只提问不写码）。
- 得到明确确认（「可以/开工」）后再动手：轻量改走 `implement`（`tdd` + Standards 单轴）；完整双轴或跨会话走 `to-spec` → `to-tickets` → 逐票 `implement`。
- 疑难 Bug 走 `diagnosing-bugs`（可加 `/boost`）；踩坑返工后提醒 `/retro`（机械进门禁，判断进 `docs/coding-standards.md`）。

## 3. 核心铁律
1. **手术刀式变更**：动手前暴露关键假设；只写最小解法；严禁顺手改无关文件或过度抽象。
2. **不问可查事实**：代码、文档与小实验可证伪的分叉自己消化，提问只留给业务规则与异常四态。
3. **需求可追踪**：`to-spec` 每条需求编 `FR-001`…；收尾输出 `需求 ID | 实现位置 | 测试用例 | 验收结果`。
4. **物理只读证据制**：`/review-router` 调用的物理只读代理不改码；每条 Blocker/Major 必附 `文件:行号` 与触发路径。
5. **走歪即回退**：同一问题返修满 2 轮未过，停止第 3 轮盲修——建议 `/rewind` 或人工拍板。
6. **高密度输出**：直接给结论、文件路径与验证结果，去除客套废话。
7. **浏览器纯文本隔离**：UI 实测走内置 `browser` 子代理（`/browser`）；截图/快照留在其独立上下文，主编码会话只接收 `文件:行号 | 选择器 | 修复点` 纯文本清单（由 `browser-reviewer` 整理），禁止把图片贴回主会话。上游「can trigger 缓存失效」仅为风险提示，非因果承诺。

## 4. 可选加速层（正交，不拥有本仓库资产）
- 默认：PostToolUse 静默跑 `lint:boundaries` + Stop 读状态文件中继；SessionStart 用 `node ./scripts/session-start.mjs` fail-open 注入文档索引。
- `install.sh --with-fast` 后：写入 `~/.agents/sdd-forge-fast`，PostToolUse/Stop 空转；验证走 `apply_edits(verify: "npm run lint:boundaries")` 同轮内联。`--without-fast` 只删 marker，不卸载 agy-fast。
