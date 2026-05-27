# Investigations

Each investigation captures the full story behind a specific
disagreement between our linter and `pine-lint`: how we narrowed it
down, what we tested, what we decided, and why. The matching
regression fixture lives in
`packages/core/test/fixtures/regression/` so the discovery test runner
locks the decision in.

## Format

`INV###-short-name/` — sequential numbering, never reused. Each
directory contains at minimum `notes.md` (the timeline + reasoning) and
should link to the regression fixture that exercises the decision. If
an investigation is later overturned, mark it superseded inside the
file rather than renumbering.

## How to use this folder

- Add an entry to the **Index** below: link + a few keywords.
- Reference investigations from code via `// see INV###`. Long
  reasoning belongs in `notes.md`, not at the call site.
- See [CLAUDE.md](../CLAUDE.md) for the project methodology that
  drives this folder.

## Index

- [INV001](INV001-ternary-branch-compat/notes.md) — ternary branches,
  cross-type, TV-silent-on-nonsense, type-compatibility
