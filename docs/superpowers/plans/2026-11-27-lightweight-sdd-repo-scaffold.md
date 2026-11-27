# Lightweight SDD Repo Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Scaffold `bobo522487/agent-skills` in `/home/bobo/Projects/agent-skills` as 7 files (installer + one init skill + 4 templates + README), with no global install and no git operations.

**Architecture:** Pure file scaffold. The installer pulls upstream skills at runtime and symlinks Antigravity's global skills dir to the single source of truth `~/.agents/skills/`; the `sdd-init` skill ships its own templates side-by-side so agents can copy them offline. No code, no build step, no dependencies.

**Tech Stack:** Bash, Markdown.

**Spec:**
- `docs/superpowers/specs/2026-11-27-lightweight-sdd-repo-scaffold-design.md` (approved scope/design)
- Verbatim source document: `/home/bobo/.dsh/attachments/v1/files/2d/2df07ac898c51b236cba1215b42055e34911ee4e1ee2311675670b975aaae13e/lightweight_sdd_workflow_design.md` — §5.1–§5.3 give exact file bodies; §5.4 gives the required fields for the 3 remaining templates; §4 and §6 give the workflow table and pitfalls to mirror in README.

## Global Constraints

- Deliver exactly 7 core files: `README.md`, `install.sh`, `skills/sdd-init/SKILL.md`, and 4 files under `skills/sdd-init/templates/` (`AGENTS.md`, `constitution.md`, `pitfalls.md`, `spec-template.md`).
- `AGENTS.md` template ≤ 80 lines.
- `pitfalls.md` ≤ 30 rows; every row carries a date or `@commit`.
- Single source of truth is plural `~/.agents/skills/` — never singular `.agent/`.
- No fork or modification of `mattpocock/skills`; no standalone `plan.md`, custom CLI, or daemon.
- `FR-xxx` IDs and the traceability matrix `需求 ID | 实现位置 | 测试用例 | 验收结果` appear in the spec template and are referenced from `AGENTS.md`.
- Do NOT touch `data/roleplay_data/`.
- Do NOT run `git init`, `git add`, `git commit`, `install.sh`, or `npx skills` — this round only writes files.
- `install.sh` must be executable and pass `bash -n`.

## Review Focus

- `npx skills ... -a antigravity` may not be a valid agent target and global install may land in a path Antigravity does not read (Antigravity CLI reads `~/.gemini/antigravity-cli/skills`). Expected behavior: script is written as specified but the uncertainty is recorded, not silently asserted as working → Task 1 step pins a comment plus the design doc's deferred item.
- `link_skills_dir` given an existing non-empty real directory: expected behavior is migration with `cp -rn` before `rm -rf`, never silent loss → Task 1 static check.
- Unknown CLI argument: expected behavior is exit 1 with `Unknown option: <arg>` → Task 1 static check.
- `sdd-init` run in a repo that already has `CLAUDE.md`: expected behavior is merge into it and never create a second root instruction file → Task 3 static check.
- `sdd-init` run where target `docs/` files already exist: expected behavior is skip, never overwrite → Task 3 static check.

---

### Task 1: `install.sh`

**Files:**
- Create: `install.sh`

**Interfaces:**
- Consumes: nothing (standalone).
- Produces: executable installer invoked by README's one-line command; supports `--with-deep-modules` and `--with-claude`.

- [ ] **Step 1: Write the failing check**

```bash
test -x install.sh && bash -n install.sh
```

- [ ] **Step 2: Run it to verify it fails**

Run: `test -x install.sh && bash -n install.sh`
Expected: FAIL — `install.sh` does not exist.

- [ ] **Step 3: Create `install.sh` from §5.1 of the source document**

Copy the §5.1 code block verbatim: `set -euo pipefail`, `UPSTREAM_REPO="mattpocock/skills"`, `SELF_REPO="bobo522487/agent-skills"`, `COMMON_SKILLS_DIR="${HOME}/.agents/skills"`, the arg parser, `link_skills_dir()` with the `cp -rn` migration path, the four numbered steps, and the heredoc completion message. Add two comments near the `npx skills` lines noting that `-a antigravity` and the global install path are **unverified against the real CLI** and are a deferred verification item from the design doc; do not change the commands themselves.

- [ ] **Step 4: Make it executable and verify syntax**

Run: `chmod +x install.sh && test -x install.sh && bash -n install.sh`
Expected: PASS with no output.

- [ ] **Step 5: Static-check the Review Focus behaviors**

Run:

```bash
grep -q 'cp -rn' install.sh && grep -q 'Unknown option' install.sh && grep -q '未验证\|unverified' install.sh
```

Expected: PASS — migration, unknown-arg rejection, and the unverified-CLI note are all present.

- [ ] **Step 6: No commit** — this repo is not under git.

---

### Task 2: `skills/sdd-init/SKILL.md`

**Files:**
- Create: `skills/sdd-init/SKILL.md`

**Interfaces:**
- Consumes: the 4 template files from Tasks 3–5 (read from sibling `./templates/` at runtime).
- Produces: `/sdd-init` slash command.

- [ ] **Step 1: Write the failing check**

```bash
test -f skills/sdd-init/SKILL.md
```

- [ ] **Step 2: Run it to verify it fails**

Run: `test -f skills/sdd-init/SKILL.md`
Expected: FAIL.

- [ ] **Step 3: Create `SKILL.md` from §5.2 verbatim**

Keep the exact frontmatter: `name: sdd-init`, the `description` string, `disable-model-invocation: true`. Keep all 5 numbered steps, including "merge into `CLAUDE.md` in-place (never create a second `AGENTS.md` alongside `CLAUDE.md`)", "only if they do not already exist. Never overwrite existing files", the `/setup-matt-pocock-skills` chain, and the optional `/setup-ts-deep-modules` question.

- [ ] **Step 4: Verify the overwrite/merge guards statically**

Run:

```bash
grep -q 'never create a second' skills/sdd-init/SKILL.md && grep -q 'Never overwrite existing files' skills/sdd-init/SKILL.md
```

Expected: PASS.

- [ ] **Step 5: No commit.**

---

### Task 3: `skills/sdd-init/templates/AGENTS.md`

**Files:**
- Create: `skills/sdd-init/templates/AGENTS.md`

**Interfaces:**
- Consumes: nothing.
- Produces: the root instruction template merged by `/sdd-init`; references the 4 docs and the 6 disciplines.

- [ ] **Step 1: Write the failing check**

```bash
test -f skills/sdd-init/templates/AGENTS.md
```

- [ ] **Step 2: Run it to verify it fails**

Run: `test -f skills/sdd-init/templates/AGENTS.md`
Expected: FAIL.

- [ ] **Step 3: Create `AGENTS.md` from §5.3 verbatim**

Reproduce the 3 sections and 6 numbered rules exactly, including the `FR-001` requirement, the traceability matrix header `需求 ID | 实现位置 | 测试用例 | 验收结果`, the `<= 30` pitfalls cap, and the 2-round circuit breaker.

- [ ] **Step 4: Verify the 80-line cap**

Run: `[ "$(wc -l < skills/sdd-init/templates/AGENTS.md)" -le 80 ] && echo OK`
Expected: `OK`.

- [ ] **Step 5: No commit.**

---

### Task 4: The 3 `docs/` template skeletons

**Files:**
- Create: `skills/sdd-init/templates/constitution.md`, `skills/sdd-init/templates/pitfalls.md`, `skills/sdd-init/templates/spec-template.md`

**Interfaces:**
- Consumes: §5.4 of the source document.
- Produces: templates copied by `/sdd-init` step 3 into `docs/`.

- [ ] **Step 1: Write the failing check**

```bash
for f in constitution.md pitfalls.md spec-template.md; do test -f "skills/sdd-init/templates/$f" || exit 1; done
```

- [ ] **Step 2: Run it to verify it fails**

Run the Step 1 command.
Expected: FAIL.

- [ ] **Step 3: Create `constitution.md` with the 5 core rules from §5.4**

Deep modules first; subtract before adding / zero dual-track; test behavior not implementation detail; single-schema boundary validation; no dependencies without justification. Each rule as a short section with a one-line rationale.

- [ ] **Step 4: Create `pitfalls.md` with the exact table header from §5.4**

`锚点（日期 / Commit） | 命中次数 | 反模式（禁止 X） | 正确做法（必须 Y） | 晋升状态`, plus a note that the table is capped at 30 rows, updated in place, and that ≥2 hits must be promoted to `唯一入口 > 静态类型 > dependency-cruiser/Lint 门禁 > 测试` with the text then deleted.

- [ ] **Step 5: Create `spec-template.md` with the sections from §5.4**

Problem & Solution; Functional Requirements with `FR-001`… including normal/exception states and acceptance criteria; Implementation Decisions & Testing Seams; Out of Scope; Verification Matrix with header `需求 ID | 实现位置 | 测试用例 | 验收结果`.

- [ ] **Step 6: Verify all three exist and the matrix header appears**

Run:

```bash
for f in constitution.md pitfalls.md spec-template.md; do test -f "skills/sdd-init/templates/$f" || exit 1; done
grep -q '需求 ID' skills/sdd-init/templates/spec-template.md
```

Expected: PASS.

- [ ] **Step 7: No commit.**

---

### Task 5: `README.md`

**Files:**
- Create: `README.md`

**Interfaces:**
- Consumes: Task 1's install command and flags, Task 2's `/sdd-init`, §4's L0–L3 table and §6's 3 pitfalls.
- Produces: the 30-second install card and daily quick reference.

- [ ] **Step 1: Write the failing check**

```bash
test -f README.md
```

- [ ] **Step 2: Run it to verify it fails**

Run: `test -f README.md`
Expected: FAIL.

- [ ] **Step 3: Create `README.md` with these pinned sections**

- One-line positioning: zero fork / zero CLI / zero daemon, single source `~/.agents/skills/`.
- First install: `curl -fsSL https://raw.githubusercontent.com/bobo522487/agent-skills/main/install.sh | bash`, with the optional `| bash -s -- --with-deep-modules --with-claude` variant and the "Restart agent" note.
- Per-repo: open project in T3 Code, send `/sdd-init`.
- L0–L3 table copied from §4 (scenario, chain, output).
- The 3 pitfalls from §6 (no singular `.agent/`, no whole-repo copy into `~/.agents/skills/`, no duplicate plugin installs).
- Upgrade: `npx skills@latest update -g`.
- A short note that install.sh's Antigravity CLI flags are pending verification, pointing at the design doc.

- [ ] **Step 4: Verify key strings**

Run:

```bash
grep -q 'curl -fsSL' README.md && grep -q '/sdd-init' README.md && grep -q 'L3' README.md && grep -q 'update -g' README.md
```

Expected: PASS.

- [ ] **Step 5: No commit.**

---

### Task 6: Final verification

**Files:** none (read-only checks).

- [ ] **Step 1: Verify all 7 deliverable files exist and the installer is sound**

Run:

```bash
for f in README.md install.sh skills/sdd-init/SKILL.md skills/sdd-init/templates/AGENTS.md skills/sdd-init/templates/constitution.md skills/sdd-init/templates/pitfalls.md skills/sdd-init/templates/spec-template.md; do test -f "$f" || exit 1; done
test -x install.sh && bash -n install.sh
```

Expected: PASS.

- [ ] **Step 2: Verify the unrelated data tree is untouched**

Run: `test -d data/roleplay_data && echo OK`
Expected: `OK`.

- [ ] **Step 3: Report completion with the file list; do not commit.**
