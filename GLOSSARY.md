# agent-skills 上下文

本仓库分发轻量 SDD 技能，并把仓库初始化为统一的指令文件与 docs 骨架。

## Language

**宿主**：
读指令文件、发出 slash 命令的客户端；决定技能刷新方式与链路提示方式，不决定根指令文件落点（一律 `AGENTS.md`）。
_Avoid_: agent、客户端

**引擎**：
实际执行推理的模型，不决定初始化落点。
_Avoid_: agent、模型

**技能链**：
一个技能完成后引导用户运行的下一个技能，如 `/sdd-init` → `/setup-matt-pocock-skills`。
_Avoid_: 命令链、workflow
