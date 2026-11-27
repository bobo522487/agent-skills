---
name: sdd-init
description: "Initialize a repository with the lightweight SDD docs skeleton (AGENTS.md, docs/constitution.md, docs/pitfalls.md, docs/spec-template.md) and chain into /setup-matt-pocock-skills. Run once per repo."
disable-model-invocation: true
---

# Initialize Lightweight SDD Repo (`sdd-init`)

Scaffold the lightweight SDD repository layout using the sibling `./templates/` files beside this `SKILL.md`, without overwriting existing user customizations.

## Steps

1. **Inspect existing files**:
   - Check for `CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, `docs/constitution.md`, `docs/pitfalls.md`, `docs/spec-template.md`, `docs/agents/`, and `tsconfig.json`.
2. **Merge or create the root instructions file**:
   - If `CLAUDE.md` exists, merge `./templates/AGENTS.md` into `CLAUDE.md` in-place (never create a second `AGENTS.md` alongside `CLAUDE.md`).
   - Otherwise, merge into or create `AGENTS.md` at repo root. Keep total length <= 80 lines.
3. **Create missing `docs/` templates only**:
   - Create `docs/constitution.md`, `docs/pitfalls.md`, and `docs/spec-template.md` from `./templates/` **only if they do not already exist**. Never overwrite existing files.
4. **Chain into upstream setup**:
   - If `docs/agents/` is not configured yet, instruct and guide the user through `/setup-matt-pocock-skills` (choosing GitHub/GitLab Issues or local `.scratch/`, plus `GLOSSARY.md` and `docs/adr/`).
5. **Optional TypeScript deep-module gate**:
   - If `tsconfig.json` exists and `.dependency-cruiser.cjs` is absent, ask one short question: whether they want to run `/setup-ts-deep-modules` to enforce deep-module boundaries in CI.
