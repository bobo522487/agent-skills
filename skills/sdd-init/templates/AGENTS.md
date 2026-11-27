<!-- sdd-init-template-version:1 sha256:aba4411cd4f1a30eefae044bf7fa0a068b81222aa784ab17977388046917077d -->
# Project Agent Operating Rules

## 1. 导航指针（先查再动手）
- 工程原则：`docs/constitution.md` | 业务术语：`GLOSSARY.md` | 架构决策：`docs/adr/`
- 高频错题本：`docs/pitfalls.md`（动手前必看；严控 <= 30 条，必带日期或 `@commit`）
- Spec 增强格式：`docs/spec-template.md`

## 2. 唯一主干工作流
- 极小微调（改文案/一行修补）直接修改并跑局部验证；凡是需要设计的需求走唯一主干：
  `/grill-with-docs` → `/to-spec` → `/to-tickets` → `/swarm`（或单票 `/goal`）+ `/tdd` → `/code-review` → 回写 `docs/pitfalls.md`
- 按需挂件：硬核 Bug 用 `/boost` + `/diagnosing-bugs`；UI 变更挂 `/browser` 实测；旁路问题用 `/btw`。

## 3. 六条硬纪律
1. **不问可查事实**：代码/文档可查清的事实与跑小实验可证伪的分叉自己消化，提问只留给业务规则与异常四态。
2. **需求可追踪**：`/to-spec` 每条功能需求必编唯一 ID（`FR-001`…）；`/code-review` Spec 轴收尾必输出矩阵：`需求 ID | 实现位置 | 测试用例 | 验收结果`。
3. **只读证据制审查**：Review 严禁边审边改；每条 Blocker/Major 必附 `文件:行号` 与触发路径，严查重复造轮子与「新旧两套写法并存」。
4. **两级有界验证**：单票实施只跑本领域局部快测（`<= 30s`）；收尾统一跑受影响范围的类型、边界检查与集成测试。
5. **2 轮熔断（Attack the Premise）**：同一问题返修满 2 轮未过，禁止第 3 轮盲修——必须先证伪前两轮共同依赖的底层假设或交人工拍板。
6. **记忆单一真源与错题晋升**：`/learn` 仅记跨项目个人偏好，项目踩坑一律进 `docs/pitfalls.md` 且标日期/`@commit`（过时标 `superseded`）；同类失误出现 >= 2 次必须固化为「唯一入口 > 静态类型 > `dependency-cruiser`/Lint > 测试」，固化后删文字。
