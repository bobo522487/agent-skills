# bobo522487/agent-skills

> 零分叉、零 CLI、零守护进程：不复制上游 `mattpocock/skills` 源码，全机 Agent（T3 Code 调起的 Antigravity、Codex、可选 Claude Code）统一收敛到唯一真源 `~/.agents/skills/`。全机 1 条命令安装，任意项目 `/sdd-init` 一键落地。

## 30 秒安装

首次全局安装（只跑一次）：

```bash
curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash
```

若想同时配好 TS 深模块门禁技能与 Claude Code 软链，加参数：

```bash
curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash -s -- --with-deep-modules --with-claude
```

装完在 **T3 Code** 里点一次 **Restart agent**（或重启 T3 Code），新建 Thread 即可在 Antigravity 与 Codex 中同时看到全套技能。
日后升级全机技能：`npx skills@latest update -g`。

## 每仓库一键落地

在 T3 Code 中打开项目，直接发送：

```text
/sdd-init
```

Agent 会写入或原位合并 `AGENTS.md`（已有 `CLAUDE.md` 则合并进它，绝不同时建两份）、初始化 `docs/constitution.md` / `docs/pitfalls.md` / `docs/spec-template.md`（不覆盖已有文件）、衔接 `/setup-matt-pocock-skills`，并在检测到 `tsconfig.json` 时询问是否接入 TS 深模块门禁。

## 日常工作流：四档分级

| 档位 | 适用场景 | 执行链路 | 产出物 |
|---|---|---|---|
| **L0 极速微调** | 5 分钟内单文件改文案、调样式、修明确小 Bug | 查既有复用 → 直接改 → 跑局部类型/单测 | 无 |
| **L1 轻量功能** | 单模块、1~3 文件、边界较清晰的小需求 | `/grill-me`（1 轮对齐）→ `/tdd` → `/code-review` | 仅代码与测试 |
| **L2 标准功能（完整 SDD）** | 跨文件新功能、API/数据结构变更、需并发或多人协作 | `/grill-with-docs` → `/to-spec`（带 `FR-xxx`）→ `/to-tickets`（垂直切片 DAG）→ `/implement` / `/implement-spec`（`+ /tdd`）→ `/code-review`（双轴证据制 + 需求追踪矩阵）→ 回写 `GLOSSARY` / `ADR` / `pitfalls.md` | `spec` + 垂直切片 `tickets` + 需求追踪矩阵 |
| **L3 核心架构 / 大改造** | 跨多会话大需求、核心底座重构、数据迁移或高危权限 | 前置 `/wayfinder` 建决策地图 → 按 L2 分批推进 → 人工审 ADR 与迁移脚本 | 以上全部 + `docs/adr/` + 人工签字 |

## 必避的 3 个坑

1. **不要用单数 `.agent/`**：统一使用复数 `~/.agents/skills/` 作为全机唯一真源。
2. **不要把 `mattpocock/skills` 整仓直接塞进 `~/.agents/skills/`**：Antigravity 全局只扫单层 `<skill>/SKILL.md`，嵌套目录会被静默跳过；务必由 `install.sh` 调用 `npx skills ... -g` 自动平铺。
3. **不要同时叠加引擎插件安装**：已用 `install.sh` 装进 `~/.agents/skills/` 后，勿再跑 `codex plugin add mattpocock-skills` 或 `claude plugin install mattpocock-skills`，否则技能会重复出现。

## 安装验证状态（2026-11-27 实测）

已用 `npx skills@latest` 真实核验：

- `-a antigravity` 是合法 agent，全局落点即 `~/.gemini/config/skills/`；`install.sh` 会把它软链到唯一真源 `~/.agents/skills/`。Antigravity CLI 另有独立 id `antigravity-cli`，落点同样是 `~/.gemini/config/skills/`（其自身目录 `~/.gemini/antigravity-cli/skills/` 不参与）。
- 非 TTY（`curl | bash`）必须带 `-y --skill '*'`，且每条 `npx` 命令都要 `</dev/null`，否则会吞掉脚本剩余 stdin 导致静默半装 —— 这两点已修入 `install.sh`。
- 实测：`bash ./install.sh` 可干净安装 39 个上游技能 + `sdd-init`，保留既有技能，重跑幂等；`--with-deep-modules --with-claude` 参数按预期工作。
- 上面的 `curl ... raw.githubusercontent.com/bobo522487/agent-skills ...` 一键命令已随仓库发布实测通过（在全新 HOME、非仓库 cwd 下管道执行，4 步全跑完，退出 0）。也可 clone/进入本仓库目录直接 `./install.sh` 走本地路径；脚本在远端取不到 `sdd-init` 时会明确警告并以非零码退出，不会假装成功。

