# Engineering Constitution

These five core rules are the project's engineering red lines. They compose with, and do not replace, the upstream `mattpocock/skills`.

## 1. Deep modules first
Prefer modules that hide complexity behind a small interface over shallow modules whose interface is nearly as complex as their implementation. Rationale: leverage comes from interface compression, not from more files.

## 2. Subtract before adding; zero dual-track
Before adding a new path, remove the old one. Never leave a new and an old way of doing the same thing coexisting. Rationale: dual tracks are the main source of drift and review noise.

## 3. Test behavior, not implementation detail
Assert on observable outcomes and edge states, not on internal calls or private structure. Rationale: tests on internals break on refactors that do not change behavior.

## 4. Single-schema boundary validation
Validate external input once, at the boundary, against one schema; trust the validated shape inside. Rationale: scattered, repeated validation drifts and hides where invariants are enforced.

## 5. No dependency without justification
Every new dependency must state the concrete problem it solves and why the existing stack cannot cover it. Rationale: dependencies are long-term liabilities; the bar for adding one is high.
