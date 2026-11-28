---
name: review-router
description: 按复杂度与风险分派物理只读双轴审查；小改只走 Standards 单轴，复杂与高危改动并行双轴并要求唯一安全事实证明。
---

# Review Router

把当前改动路由到 `@standards-reviewer` 与 `@spec-reviewer`。两个代理都是物理只读的：不要要求它们改文件，不要让它们运行写操作或 shell。本技能自身也不改码。

## 1. 确定性范围与复杂度计算（优先用脚本，不靠心算）

主会话先运行插件自带的确定性脚本收集变更范围、复杂度分数、高危路径与按文件配额截断的 diff（已自动排除锁文件、兼容无初始提交的空仓与未跟踪新建文件）。若 `SessionStart` 已注入脚本绝对路径则直接使用，否则按以下顺序定位并执行：

```bash
for s in \
  "${PLUGIN_ROOT:+${PLUGIN_ROOT}/scripts/review-scope.mjs}" \
  "${GEMINI_HOME:+${GEMINI_HOME}/config/plugins/sdd-forge/scripts/review-scope.mjs}" \
  "${HOME}/.gemini/config/plugins/sdd-forge/scripts/review-scope.mjs" \
  "${HOME}/.agents/plugins/sdd-forge/scripts/review-scope.mjs" \
  "./scripts/review-scope.mjs"; do
  [ -n "$s" ] && [ -f "$s" ] && { node "$s" --with-diff; break; }
done
```

脚本按以下规则计算复杂度（0–10，上限 10）：

| 信号 | 计分 |
|---|---|
| 每超出 1 个改动文件（不含锁文件；重命名计 1） | +1 |
| 每 100 行变更（含未跟踪文本新文件，不含锁文件，向上取整） | +1 |
| 每个高危命中：DB 迁移 / 鉴权 / API 契约 / 密钥与 `.git` / CI 配置 | +3 |

高危命中即使总分低也单独记录触发路径。仅当脚本不可用时，再手工回退到 `git status --short` + `git diff HEAD`。

## 2. 路由决策

- **`single-axis`（≤3 且无高危命中）**：只调用 `@standards-reviewer` 单轴快审；输出 `Spec 轴跳过：小改快审`。
- **`dual-axis`（4–6 且无高危命中）**：并行调用 `@standards-reviewer` + `@spec-reviewer`。
- **`dual-axis-high-risk`（≥7 或任一高危命中）**：并行双轴，并追加 **高危爆炸半径核验（Blast Radius）**：
  1. 找出 **「本次改动之所以安全的唯一核心事实（The One Safety Fact）」**，重点排查 grep 找不到的破坏（API JSON 形态、DB 列兼容、生命周期/异步时序、跨模块三跳下游）；
  2. 标明该事实达到的 **5 级证据阶梯**：`L1 口头断言` → `L2 文件:行号` → `L3 推演不可达` → `L4 实跑脚本/单测验证` → `L5 真实应用复现`。高危项若停留在 `≤ L2`，必须显式标为 `未证明（Unproven）` 并由主会话补跑 `L4` 验证。

不跨模型、不调用 `codex exec`、不设置回退分支；只读性来自代理的 `tools` 白名单。

## 3. 调用前准备

1. 直接使用 `review-scope.mjs --with-diff` 返回的 `changedFiles`、`untrackedFiles` 与 `diff` 文本（只读子代理无 shell 工具，必须由主会话直接传入，不要替代理先下结论；若 `diffTruncated: true`，提示代理用 `view_file` 补看关键文件）。
2. 查找持久化 Spec（`.scratch/<feature>/spec.md`、`.scratch/<feature>/issues/`、`docs/specs/`、`docs/tickets/` 或用户指定路径）；没有就按用户明示需求核对。
3. 把 diff 文本与 Spec 路径一起交给代理；提醒代理读取 `docs/constitution.md`、`docs/architecture.md`、`docs/coding-standards.md`、`GLOSSARY.md`。

## 4. 输出契约

合并两位代理的结果，按此顺序输出：

1. **路由**：`复杂度=N | 高危=... | 路由=单轴/双轴`
2. **唯一安全事实（高危必填）**：`安全事实 | 证据等级(L1–L5) | 证明指针或 Unproven`
3. **Findings 表**：`文件:行号 | 触发路径 | 严重度 | 修复建议`
4. **Spec 矩阵**：`需求 ID | 实现位置 | 测试用例 | 验收结果`（或 `Spec 轴跳过`）
5. **结论**：`PASS` 或 `FAIL`，附 Blocker/Major 计数与未闭环需求 ID。

返修满 2 轮仍 FAIL：停止第 3 轮盲修，建议 `/rewind` 回退干净检查点或由人工拍板。
