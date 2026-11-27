---
name: sdd-init
version: 0.1.0
description: "Initialize or upgrade a repo with the Antigravity-first minimal SDD skeleton (AGENTS.md, docs/constitution.md, docs/pitfalls.md, docs/spec-template.md); detect prior installs and upgrade pristine managed files to the latest bundled templates."
disable-model-invocation: true
---

# Initialize / Upgrade Minimal SDD Repo (`sdd-init`)

Scaffold or upgrade the repository using the sibling `./templates/` files beside this `SKILL.md`. Never overwrite user customizations. This skill is also the intended handler when a user says “`/sdd init`” in a project folder.

## Managed files and version marker

Managed targets:

- `AGENTS.md` at repo root
- `docs/constitution.md`
- `docs/pitfalls.md`
- `docs/spec-template.md`

Every bundled template starts with one marker line:

`<!-- sdd-init-template-version:V sha256:<hash> -->`

`V` is a label, not a sortable version. `<hash>` is the SHA-256 of the body **after** the marker line. Current label is `0.1.0`; known historical labels are `0` and `1`. Labels are matched exactly: no semver comparison, no prefix matching, no leading-zero normalization. An unknown label is never downgraded or guessed.

This table is the single source of truth for legacy detection. The legacy hash column is the SHA-256 of the old whole file from before markers existed; for the current generation it equals the current body hash.

| Managed target | Legacy whole-file hash | Current body hash |
| --- | --- | --- |
| `AGENTS.md` | `aba4411cd4f1a30eefae044bf7fa0a068b81222aa784ab17977388046917077d` | `aba4411cd4f1a30eefae044bf7fa0a068b81222aa784ab17977388046917077d` |
| `docs/constitution.md` | `ecb8010a6b75afc0f548200f14c5202499cb564455971383f41e29741093fdad` | `ecb8010a6b75afc0f548200f14c5202499cb564455971383f41e29741093fdad` |
| `docs/pitfalls.md` | `b26526df99b0c238a911ef2bac49087f64acfb3ed7c7e01f294a56f13f5e3488` | `b26526df99b0c238a911ef2bac49087f64acfb3ed7c7e01f294a56f13f5e3488` |
| `docs/spec-template.md` | `9d0b9927f90d587f19afb7627e4e50da9363404c2bcfedd2534ab4e8a8782bf6` | `9d0b9927f90d587f19afb7627e4e50da9363404c2bcfedd2534ab4e8a8782bf6` |

## Steps

1. Inspect `AGENTS.md`, `GLOSSARY.md`, `docs/`, and `tsconfig.json`. For each managed target, count every `sdd-init-template-version` marker line anywhere in the file.

2. Determine the state of each managed target in this order:

   - **Missing** → create it from the sibling template; record as `新建`.
   - **Byte-identical to the bundled template (marker included)** → leave untouched; record as `已是最新`.
   - **Exactly one marker, label is `0.1.0`, `0`, or `1`, and the body hash equals the marker hash** → replace with the bundled template; record as `升级`.
   - **No marker and the whole-file hash equals the legacy hash in the table** → replace with the bundled template; record as `升级`.
   - **Anything else**: unknown label, more than one marker, body hash mismatch, no marker with no legacy match, or any user edit → leave untouched; record as `保留（需人工合并）` and list the path in the summary.

3. Apply the same rule to `AGENTS.md` and the three files under `docs/`. Only create or upgrade managed targets; never touch `docs/adr/` or other user files.

4. If `docs/agents/` is not configured yet, guide the user through `/setup-matt-pocock-skills`.

5. If `tsconfig.json` exists and `.dependency-cruiser.cjs` is absent, ask once whether to run `/setup-ts-deep-modules`.

6. End with a short audit summary containing three lists: `新建`, `升级`, `保留（需人工合并）`. State `已是最新` only when every managed target is `已是最新` and the `保留` list is empty; never state `已是最新` while any file is retained. Do not report a retained customized file as upgraded.

Records of user edits must survive: any file whose hash no longer matches is user-owned.
