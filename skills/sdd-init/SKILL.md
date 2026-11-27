---
name: sdd-init
description: "Initialize a repo with the Antigravity-first minimal SDD skeleton (AGENTS.md, docs/constitution.md, docs/pitfalls.md, docs/spec-template.md) and chain into /setup-matt-pocock-skills."
disable-model-invocation: true
---

# Initialize Minimal SDD Repo (`sdd-init`)

Scaffold the repository using the sibling `./templates/` files beside this `SKILL.md` without overwriting existing user customizations.

## Steps

1. Inspect `CLAUDE.md`, `AGENTS.md`, `GLOSSARY.md`, `docs/`, and `tsconfig.json`.
2. Merge `./templates/AGENTS.md` into `CLAUDE.md` if `CLAUDE.md` exists; otherwise create or merge `AGENTS.md` at repo root (keep total <= 65 lines).
3. Copy `constitution.md`, `pitfalls.md`, and `spec-template.md` from `./templates/` into `docs/` **only when missing**.
4. If `docs/agents/` is not configured yet, guide the user through `/setup-matt-pocock-skills`.
5. If `tsconfig.json` exists and `.dependency-cruiser.cjs` is absent, ask once whether to run `/setup-ts-deep-modules`.
