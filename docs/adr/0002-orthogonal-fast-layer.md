# ADR-0002：把 agy-fast 作为正交底层加速层并列安装

- **日期**：2026-11-27
- **状态**：Accepted
- **取代**：ADR-0001 的「唯一钩子模式」表述（ADR-0001 的插件内核、6 件套、零分叉与双轴审查决策继续有效）

## 背景

用户提出：`INK-Q/agy-fast` 与本项目「强烈推荐配合使用，但属于完全正交的底层加速层」，按 Linus 原则应独立并列安装，绝不合并进 `bobo522487/agent-skills`。需要同时吸收三处上游性能坑：①每步阻塞钩子可能打断 Prompt Cache；②长会话里的截图可能带来 TTFT 抬升；③SessionStart 必须 fail-open 且跨平台。

事实核查（上游源码与报告，非本项目实测承诺）：

- `agy-fast` 的 `hooks.json` 只注册 SessionStart；`README.zh-CN.md:316` 明确「零每步阻塞钩子：不注册 PreToolUse、PostToolUse、PreInvocation、PostInvocation 或 Stop 钩子。」（`ANALYSIS_REPORT.zh-CN.md:160` 同述）。
- 上游报告 `ANALYSIS_REPORT.zh-CN.md:129-137` 的分桶：`<60秒 62/4468=1.4%`、`60-180秒 60/377=15.9%`、`180-300秒 15/43=34.9%`、`300-600秒 24/39=61.5%`、`>=600秒 91/97=93.8%`。这些是**上游实测**，非本项目 SLA。
- 内联 verify 真实：`README.zh-CN.md:229`、`rules/AGENTS.md:10/27` 给出 `verify?: string, verifyTimeoutSec?`；但上游只示例 `npm run typecheck`（`README.zh-CN.md:263`），本项目使用自定义 `npm run lint:boundaries`。
- 截图表述必须软化：`rules/AGENTS.md:17` 原文为 `.png/.jpg/.webp` 图片进入 >150k-token 编码会话「can trigger」缓存失效与 3–7x TTFT 抬升（40–97s/轮）；上游分析报告无该测量，故只作为 Hygiene 风险提示。
- `package.json:16-18` 的 bin 为 `agy-fast -> ./scripts/install.mjs`、`agy-fast-mcp -> ./dist/mcp-server.mjs`；latest `0.3.2`。`install.mjs` 的 `doctor` 是 `status` 别名，安装末尾跑健康门禁，失败即非零退出。

来源：https://github.com/INK-Q/agy-fast 、https://registry.npmjs.org/agy-fast/latest 、https://raw.githubusercontent.com/INK-Q/agy-fast/main/scripts/install.mjs

## 决策

1. **严格独立并列安装**：`install.sh` 增加可选 `--with-fast`，内部调用 `npx -y agy-fast install`。默认不安装；不合并源码、不建兼容层、不固定 agy-fast 版本，保持其独立升级通道。
2. **条件化双模式**：默认继续 ADR-0001 的双钩子（PostToolUse 静默检查 + Stop 状态中继）；`--with-fast` 成功后写全局 marker `~/.agents/sdd-forge-fast`，两个脚本启动即空转（分别输出 `{}` / `{"decision":"allow"}`）。`hooks.json` 保持单一真源，远端的已安装插件不靠改写 hooks.json 切换。
3. **同轮内联验证**：加速层模式下编辑验证交给 `apply_edits(verify: "npm run lint:boundaries")`；SessionStart 保留，但改为无依赖 Node 脚本 `scripts/session-start.mjs`，异常/无命中输出 `{}` 且 exit 0，跨平台不依赖 jq。
4. **浏览器纯文本隔离**：UI 实测由 Antigravity 内置 `browser` 子代理承担（其上下文独立，截图不进主会话）；新增 `agents/browser-reviewer.md` 只整理 `文件:行号 | 选择器 | 修复点` 纯文本，不改码、不回传图片。自定义代理不声明未经映射的浏览器工具名，避免 tool-validation 挂起。
5. **显式退出与失败中止**：`--without-fast` 只删 marker，不碰 agy-fast 本体；`--with-fast` 安装失败即打印原输出与 `npx -y agy-fast doctor` 输出并中止，不静默降级。

## 权衡与后果

- **收益**：默认模式保持零依赖、确定性门禁；加速层模式消除每步阻塞钩子，把验证压进同轮；浏览器截图风险被隔离在子代理；两套组件可各自升级。
- **代价**：多了一个全局 marker 这一隐形状态（用 `--without-fast` 与 README/ADR 显式化）；用户需自行理解 agy-fast 的 MCP 工具路由；引用上游数字时必须持续标注「上游实测，非本项目承诺」。
- **迁移**：ADR-0001 状态改为 `Superseded by ADR-0002`；其决策主体不废弃。`scripts/session-start.sh` 被 `scripts/session-start.mjs` 取代；`hooks.json` 的 SessionStart 命令改为 `node ./scripts/session-start.mjs`。
- **验证**：`bash -n install.sh scripts/*.sh`、`node --check scripts/session-start.mjs`、`jq -e` JSON 检查、`agy plugin validate --strict .` 必须通过；冒烟覆盖 marker 存在/不存在两条路径与 Node SessionStart 的 fail-open。

## 后续修订（2026-11-28）

进一步收敛复杂度，取消手动 marker 与每步阻塞钩子：

1. **删除 `PostToolUse`、状态文件中继与 `~/.agents/sdd-forge-fast` marker**：不再注册 `PostToolUse`，删除 `scripts/post-edit-check.sh`、`scripts/stop-verify.sh` 与 `--without-fast` 选项。
2. **统一为无依赖 Node `Stop` 钩子 + 运行时探测**：`scripts/stop-verify.mjs` 在运行时自动探测 `agy-fast` 的插件 manifest；仅在未装 `agy-fast` 且工作区存在未提交源码改动时运行一次 `lint:boundaries`，并设最多 2 次连续拦截上限防止死循环。
3. **删除 `agents/browser-reviewer.md`**：纯文本表格约束直接交由 `rules/AGENTS.md` 与内置 `browser` 子代理承担，消除多余透传代理。
