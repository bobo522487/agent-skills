# ADR-0001：只支持 Antigravity 单宿主，以宿主原语驱动精选 `mattpocock/skills`

- **日期**：2026-11-27
- **状态**：Accepted

## 背景
早期方案试图通过自定义桥接层兼容多个宿主，并引入四档任务分级（L0~L3）与跨目录软链。实际日常主力为 T3 Code 调用 Antigravity，维护多端抽象和复杂分级带来的心智负担远大于收益。

## 决策
1. **单宿主锁定 Antigravity**：放弃多端兼容与软链胶水，`install.sh` 直接通过 `npx skills ... -g -a antigravity` 安装。
2. **两层正交协同**：并发执行（`/swarm`）、单票闭环（`/goal`）、深度排错（`/boost`）与真机验收（`/browser`）全部交由 Antigravity 原生原语；领域建模、Spec、垂直切片、TDD 与双轴审查使用精选 11 个原版 `mattpocock/skills`。
3. **消除双轨与分级**：砍掉 L0~L3 分级；不安装 `grill-me` 与 `implement-spec`，统一使用 `/grill-with-docs` 与 `/swarm`；`/learn` 仅用于个人全局习惯，项目知识全部沉淀进仓库 `GLOSSARY.md`、`docs/adr/` 与 `docs/pitfalls.md`。

## 权衡与后果
- **收益**：仓库仅 9 个文件，零自建 CLI、零守护进程、零同名冲突，`/` 菜单极度干净。
- **代价**：若未来切换主力宿主，需重新补充对应宿主的并发执行入口与安装目标，但所有仓库产物（`GLOSSARY.md`、`ADR`、`FR-xxx` Spec、垂直切片、`pitfalls.md`）仍 100% 通用，无迁移锁死风险。
- **文档边界**：不新增 `architecture.md` 或索引层；架构显著决策继续记在本 ADR，分层术语见 `GLOSSARY.md`，拓扑与入口见 `README.md`，可执行清单见 `install.sh`。
