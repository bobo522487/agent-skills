# ADR-0004：发布真源与幂等更新机制

- **日期**：2026-11-28
- **状态**：Accepted

## 背景
Antigravity 第三方 GitHub 插件不像官方 Marketplace 插件那样支持自动更新，`agy plugin` 仅提供 `install / list / enable / disable / uninstall`。此外，若用户单独执行 `npx skills@latest update -g`，上游 `mattpocock/skills` 会重新覆写 6 个日常技能里的 `disable-model-invocation: true`，导致隐式调用静默退化。同时，业务仓库已经落地并手改过的 3 份工程文档模板绝不能在插件升级时被覆盖。

## 决策
1. **发布真源**：采用 SemVer Git Tag（`vX.Y.Z`）+ GitHub Release，并与 `.antigravity-plugin/plugin.json` 的 `version` 严格保持一致。`main` 分支用于日常开发，不直接推送给存量用户。
2. **非阻塞更新提示**：`SessionStart` 仅同步读取本地缓存 `~/.agents/sdd-forge-update-cache.json`（`<1 ms`）；当缓存超过 24 小时且未设 `SDD_FORGE_NO_UPDATE_CHECK=1` 时，分离异步拉起 `scripts/check-update.mjs` 刷新缓存。发现新版本时仅在新会话打印 1 行升级命令提示，绝不静默修改用户文件。
3. **唯一幂等升级入口**：安装与升级共用同一条 `install.sh` 命令（支持 `--version <tag>`，默认最新 Release，无 Release 时回退 `main`）：先更新 12 个精选原版 `mattpocock/skills` → 自动重打 6 个 `patch_behavior` 补丁 → 将新版暂存到临时目录并通过 `agy plugin validate --strict` 校验后再 `uninstall + install` 替换 `sdd-forge` 插件本体 → 清空更新提示缓存并提醒重启 Agent。
4. **业务文档永不覆写**：升级插件时绝不修改业务仓库已有的 `docs/{constitution,architecture,coding-standards}.md`；模板变动只在 GitHub Release Notes 中列出，由开发者按需对照合入。

## 权衡与后果
- **收益**：用户只记一条命令即可完成安装与全链路升级；`SessionStart` 零网络阻塞；暂存校验后替换杜绝断网导致的半残卸载；`patch_behavior` 永不因上游更新丢失。
- **代价**：维护者发版时需同步更新 `plugin.json` 版本号并打 Tag 发 Release；用户收到提示后需手动执行一次升级命令并重启 Agent。
