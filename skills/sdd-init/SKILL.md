---
name: sdd-init
description: "在一个仓库里落地轻量 SDD 骨架：探测当前宿主、统一生成 AGENTS.md 与 docs 三模板、接续后续技能。每个仓库只跑一次。"
disable-model-invocation: true
---

# 初始化轻量 SDD 仓库（sdd-init）

用同级 `./templates/` 下的文件搭建仓库骨架，不覆盖用户已有内容。根指令文件一律用 `AGENTS.md`；宿主只影响提示方式，不改变落点。术语见仓库根 `GLOSSARY.md`。

## 步骤

1. **只读探查**
   - 文件：`CLAUDE.md`、`AGENTS.md`、`GLOSSARY.md`、`docs/constitution.md`、`docs/pitfalls.md`、`docs/spec-template.md`、`docs/agents/`、`tsconfig.json`。
   - 宿主（读指令文件、发 slash 命令的客户端，不是引擎）：按 `env → 父进程 → 目录 → 问一句` 顺序判定。env 看 `DSH_PROFILE` / `DSH_WEB_URL`（DSH）、`ANTIGRAVITY_*`（Antigravity）、`CLAUDE_*`（Claude Code）、`CODEX_*`（Codex）；父进程看是否为 `dsh web` 等宿主进程；目录看 `~/.dsh`、`~/.gemini`、`~/.claude`、`~/.codex`。三者都无结论时只问一句，默认按「未知宿主」处理，落点仍是 `AGENTS.md`。不得因同机装有某宿主进程就断定当前宿主。

2. **统一落点 `AGENTS.md`（迁移属红线，每次运行都要确认）**
   - 一律用 `AGENTS.md` 作根指令文件，不因宿主改用 `CLAUDE.md` 等别的名字。
   - 若 `CLAUDE.md` 存在：先明确告知将迁移并删除它，并逐次运行都征得用户确认。确认后把 `CLAUDE.md` 全文追加进 `AGENTS.md`（不删减任何内容），再删除 `CLAUDE.md`：git 已跟踪则直接删，未跟踪则先备份为 `CLAUDE.md.bak` 再删。用户拒绝则保留 `CLAUDE.md`、仅按模板合并 `AGENTS.md`，并明确提示两份指令文件共存、需用户自行取舍。
   - 合并 `./templates/AGENTS.md` 到 `AGENTS.md`，总行数 ≤ 80。

3. **只补缺失的 docs 模板**
   - `docs/constitution.md`、`docs/pitfalls.md`、`docs/spec-template.md` 从 `./templates/` 创建，仅当对应文件不存在；绝不覆盖已有文件。模板正文保持通用，不写宿主相关内容。

4. **接续技能链（按宿主可用性）**
   - 检查 `docs/agents/` 是否已配置。未配置时先判断 `/setup-matt-pocock-skills` 在当前宿主是否可用：可用则引导用户运行；不可用则给出等价手工步骤（GitHub Issues / GitLab Issues / 本地 `.scratch/`，以及 `GLOSSARY.md`、`docs/adr/`）。不静默跳过。

5. **可选 TypeScript 深模块门禁**
   - `tsconfig.json` 存在且 `.dependency-cruiser.cjs` 不存在时，问一句是否运行 `/setup-ts-deep-modules`。

6. **汇报与宿主刷新提示**
   - 按宿主给出技能刷新方式：DSH Web 点一次 Restart agent（或刷新会话）；Antigravity、Claude Code、Codex 等重启对应客户端；未知宿主说明需重启当前所用客户端。
   - 汇报改动文件与验证结果，严格区分「已实测通过」和「未验证」。

## 完成标准

- 仓库根有且仅有一份 `AGENTS.md`（含模板骨架，≤ 80 行），除非用户在红线确认时明确拒绝迁移 `CLAUDE.md`。
- `docs/constitution.md`、`docs/pitfalls.md`、`docs/spec-template.md` 存在或保持原样，未被覆盖。
- 用户拿到一条可立即执行的下一步（技能命令或等价手工步骤），以及针对当前宿主的刷新方式。
