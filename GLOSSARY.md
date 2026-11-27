# Glossary

## 宿主原语（Host Primitives）
Antigravity 内置的引擎级斜杠命令（如 `/swarm`、`/goal`、`/boost`、`/browser`、`/btw`、`/compact`），负责并发调度、深度推理、浏览器验证与上下文管理，不拥有仓库业务产物。

## 协议技能（Protocol Skills）
通过 `SKILL.md` 安装的工程方法论技能（精选原版 `mattpocock/skills` 与 `sdd-init`），负责产出与验收仓库内的持久化工程资产（`GLOSSARY.md`、`ADR`、`FR-xxx` Spec、垂直切片与需求追踪矩阵）。

## 物理门禁（Physical Gate）
能触发编译或 CI 红灯的确定性静态/自动化约束（如 `dependency-cruiser` 深模块边界检查、静态类型、Lint、自动化测试），优先级严格高于自然语言 Prompt 提醒。

## 错题晋升阶梯（Pitfall Promotion Ladder）
当同类失误在 `docs/pitfalls.md` 中命中 >= 2 次时触发的升级路径：架构收拢唯一入口 > 静态类型锁死 > Lint/边界物理门禁 > 行为测试；固化完成后删除对应文字条目。
