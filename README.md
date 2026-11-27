# bobo522487/agent-skills

> 零分叉、零 CLI、零守护进程：不复制上游 `mattpocock/skills` 源码，全机 Agent（DSH Web、T3 Code 调起的 Antigravity、Codex、可选 Claude Code 等宿主）统一收敛到唯一真源 `~/.agents/skills/`。全机 1 条命令安装，任意项目 `/sdd-init` 一键落地。

## 30 秒安装

首次全局安装（只跑一次）：

```bash
curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash
```

若想同时配好 TS 深模块门禁技能与 Claude Code 软链，加参数：

```bash
curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash -s -- --with-deep-modules --with-claude
```

装完按当前宿主刷新一次让技能生效：DSH Web 点一次 **Restart agent**（或刷新会话）；T3 Code 点一次 **Restart agent** 并新建 Thread；Antigravity / Claude Code / Codex 等重启对应客户端。刷新后即可看到全套技能。
日后升级全机技能：`npx skills@latest update -g`。

## 每仓库一键落地

在任意宿主中打开项目，直接发送：

```text
/sdd-init
```

Agent 会先只读探查仓库并按 `env → 父进程 → 目录 → 问一句` 识别当前宿主；根指令文件一律落地为 `AGENTS.md`（若有 `CLAUDE.md`，每次运行都会就「全文并入后删除」征求确认：git 已跟踪则直接删，未跟踪则先备份 `.bak`，拒绝则保留并提示两份共存），初始化 `docs/constitution.md` / `docs/pitfalls.md` / `docs/spec-template.md`（不覆盖已有文件），按宿主可用性衔接 `/setup-matt-pocock-skills`（不可用则给等价手工步骤），并在检测到 `tsconfig.json` 时询问是否接入 TS 深模块门禁；最后按宿主给出技能刷新方式。判定术语见 `GLOSSARY.md`。

## 日常工作流：一个 `/sdd`

任何规模的任务都在当前宿主里发：

```text
/sdd <需求>
```

Agent 内部按三档自行判定深度，用户不分级、不记命令链：

- **红线**：删除数据、覆盖重要文件、`git push --force`、改全局环境变量等不可逆操作 → 停下等你确认。
- **加深**：跨文件、新行为、数据结构/API 变更、权限、并发或状态机 → 先出最小 spec（`FR-001`…）→ 测试先行 → 实现 → 对照审查。
- **最小**：其余 → 查既有复用 → 最小改动 → 局部验证。

判定规则、执行步骤与完成标准见 `skills/sdd/SKILL.md`；工程红线见 `docs/constitution.md`。

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

