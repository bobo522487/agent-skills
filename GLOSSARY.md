# Glossary

> 本文件只承载术语定义；流程真源见 `sdd-init` 技能，技能清单真源见 `install.sh`。

## 宿主原语（Host Primitives）
Antigravity 内置的引擎级斜杠命令（如 `/swarm`、`/goal`、`/boost`、`/browser`、`/btw`、`/compact`），负责并发调度、深度推理、浏览器验证与上下文管理，不拥有仓库业务产物。

## 协议技能（Protocol Skills）
通过 `SKILL.md` 安装的工程方法论技能（精选原版 `mattpocock/skills` 与 `sdd-init`），负责产出与验收仓库内的持久化工程资产（`GLOSSARY.md`、`ADR`、`FR-xxx` Spec、垂直切片与需求追踪矩阵）。

## 物理门禁（Physical Gate）
能触发编译或 CI 红灯的确定性静态/自动化约束（如 `dependency-cruiser` 深模块边界检查、静态类型、Lint、自动化测试），优先级严格高于自然语言 Prompt 提醒。

## 错题晋升阶梯（Pitfall Promotion Ladder）
同类失误在 `docs/pitfalls.md` 中命中 >= 2 次时触发的升级路径；执行细则与晋升状态以 `docs/pitfalls.md` 的「晋升阶梯」为准。
