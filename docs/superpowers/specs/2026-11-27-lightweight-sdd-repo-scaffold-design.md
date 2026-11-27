# 轻量 SDD 工作流仓库搭建 — 设计（短版）

日期：2026-11-27
状态：待批准
来源：用户提供的 `lightweight_sdd_workflow_design.md`（完整设计，含逐文件源码）
本轮范围：只搭仓库文件；不执行 `install.sh`，不改任何全局技能目录。

## 意图与 why

单一真源 `~/.agents/skills/`，零分叉上游 `mattpocock/skills`，一条命令全机安装 + 任意项目 `/sdd-init` 落地。用户要的是一个可分发的仓库骨架，不是本机安装。

## 目标 / 非目标 / 反目标

- **目标**：仓库内 7 个核心文件齐全，内容与附件一致或按其约定补全，可直接提交/发布。
- **非目标**：执行 `install.sh`；修改 `~/.agents`、`~/.gemini`、`~/.claude`；运行 `npx skills`；`git init` / commit / push（除非用户另行要求）。
- **反目标**：Fork 或改写 `mattpocock/skills` 正文；引入独立 `plan.md`、自定义 CLI 或守护进程；把 `data/roleplay_data/` 纳入本设计。

## 约束

- 当前目录 `/home/bobo/Projects/agent-skills` 不是 git 仓库，只有一份与本设计无关的 `data/roleplay_data/`，保留不动。
- 设计宣称「整个仓库只有 7 个核心文件」。本设计文档是 superpowers 流程产物，放 `docs/superpowers/specs/`，**不属于交付的 7 个文件**，发布前可删。
- `AGENTS.md` 模板 ≤ 80 行；`pitfalls.md` ≤ 30 条且必带日期或 `@commit`。

## 方案（唯一合理路径）

附件已给出逐文件源码，直接按源码落地，不改写。被否的替代：

- 从上游 clone 后改 → 违反零分叉。
- 先实现/验证 install 逻辑再写文件 → 超出本轮范围。
- 用并行 subagent 分头写 → 7 个文件小且模板间有引用一致性要求，串行写更稳。

## 已定的 how

- `README.md`：30 秒安装与日常速查卡。
- `install.sh`：按附件源码写入；含 `--with-deep-modules` / `--with-claude` 参数、`link_skills_dir` 的实体目录迁移逻辑、四步输出与完成提示。
- `skills/sdd-init/SKILL.md` + `skills/sdd-init/templates/`：按附件源码；`templates/` 随 `SKILL.md` 同级打包，供 `/sdd-init` 直接读取。
- 附件 §5.4 只给描述、未给源码的 3 份模板（`constitution.md` / `pitfalls.md` / `spec-template.md`）：按其约定补全为可用骨架，字段齐全。
- 不动 `data/roleplay_data/`。

## 留给 builder 的 / 未决

- `install.sh` 中的 `npx skills` 参数已按真实 CLI 核验（2026-11-27）：`-a antigravity` 合法，全局落点即 `~/.gemini/config/skills/`；`antigravity-cli` 为同落点的独立 id，其自身目录 `~/.gemini/antigravity-cli/skills/` 不参与。安装时实测发现并修复了 3 个真实缺陷（非 TTY 缺 `-y --skill '*'`、`curl | bash` 时 npx 吞 stdin、`set -u` 下 piped 时 `BASH_SOURCE[0]` 未绑定），详见 `install.sh` 行内注释与 README 验证状态段。
- `bobo522487/agent-skills` 仓库尚未发布：上面 README 的 `curl raw.githubusercontent.com/...` 一键命令当前返回 404，须推送后才可用；仓库未发布时从仓库目录 `./install.sh` 走本地路径安装，脚本对远端失败会给明确警告并以非零码退出。
- 是否 `git init` / commit / push：本轮不做，除非用户要求。
- 是否删除本设计文档以满足严格 7 文件：发布前由用户定。

## 验收

- 7 个核心文件存在，内容与附件一致或按 §5.4 约定补全。
- `install.sh` 具备可执行位、`bash -n` 通过。
- `AGENTS.md` 模板 ≤ 80 行。
- `docs/` 下三份模板存在且约定字段齐全。
