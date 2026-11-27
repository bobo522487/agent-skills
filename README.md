# bobo522487/agent-skills

> Antigravity 专属极简 SDD 工作流分发仓：遵循 Linus 极简哲学（消除特殊情况、单一真源、零重复造轮子），用 Antigravity 原生原语（`/swarm`、`/goal`、`/boost`、`/browser`）驱动 11 个精选原版 `mattpocock/skills` 与 1 个仓库初始化技能 `sdd-init`。不兼容多端、不做四档分级、不 Fork 上游、不写自建 CLI；`install.sh` 仅接受可选 `--with-deep-modules`。

## 30 秒安装

全机一次性安装（T3 Code + Antigravity 立即可用）：

```bash
curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash
# TypeScript 项目可附带深模块物理门禁技能：
# curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash -s -- --with-deep-modules
```

装完在 **T3 Code** 里点击 **Restart agent**（或重启 T3 Code），新开 Thread 即可在 `/` 菜单看到干净的 12 个技能。日后升级：`npx skills@latest update -g`。

技能选择的唯一真源是 `install.sh` 的 `CORE_SKILLS`；README 只描述用途，不再复制清单。

## 每仓库一键落地

打开任意仓库直接发：

```text
/sdd-init
```

> 用户口中的 “`/sdd init`” 对应此技能；仓库不注册 `/sdd` 命令，以保持 9 文件终态。

Agent 自动初始化 `AGENTS.md`、创建 `docs/` 三模板、衔接 `/setup-matt-pocock-skills`；TS 项目会询问是否接入 `dependency-cruiser` 深模块边界检查。重复运行会识别两种旧版：带旧版标记的原样文件，以及标记出现前安装的原样文件；两者均自动升级到当前模板。用户改过的文件一律保留并列出，绝不覆盖。

## 日常主干：1 条主干 + 2 个按需挂件

凡是需要动脑的需求走唯一主干；极小微调（改文案/一行修补）直接对话改完跑局部单测，不敲任何斜杠命令。

```text
1. /grill-with-docs   拷问对齐
2. /to-spec           锁定契约（FR-xxx + Seams）
3. /to-tickets        垂直切片（DAG 阻塞边）
4. /swarm 或 /goal + /tdd   内核驱动实施
5. /code-review       双轴证据验收 + 需求追踪矩阵
```

验收未过最多返修 2 轮；满 2 轮触发 **Attack the Premise**（质疑前提 / 人工拍板）。PASS 后回写 `GLOSSARY.md` / `docs/adr/` / `docs/pitfalls.md` 完成复利沉淀。

按需挂件：硬核 Bug / 竞态 / 性能回退 → `/boost` + `/diagnosing-bugs`；含前端页面与交互 → `/browser` 截图实测；旁路提问 → `/btw`；阶段切换清上下文 → `/compact`。常态抗熵增：每 3~5 天跑一次 `/improve-codebase-architecture`，挑 1 个浅模块做深。

## 仓库结构（仅 9 个文件）

```text
README.md
GLOSSARY.md
docs/adr/0001-antigravity-only-minimal-sdd.md
install.sh
skills/sdd-init/{SKILL.md,templates/AGENTS.md,templates/constitution.md,templates/pitfalls.md,templates/spec-template.md}
```

## 明确砍掉的复杂度

1. 只服务 Antigravity（含 T3 Code 调起的 Antigravity），不维护其它宿主兼容分支与跨目录软链。
2. 砍掉 L0~L3 分级，极小微调直接对话，其余走唯一 5 步主干。
3. 精选安装、物理消灭同名碰撞：不装 `grill-me`、`implement-spec`、`triage` 等冗余项；日常对齐统一用 `/grill-with-docs`。
4. 记忆单一真源：`/learn` 只记个人跨项目习惯；项目级术语、决策与踩坑只进仓库 `GLOSSARY.md`、`docs/adr/`、`docs/pitfalls.md`。

## 决策依据

见 [ADR-0001](docs/adr/0001-antigravity-only-minimal-sdd.md)。
