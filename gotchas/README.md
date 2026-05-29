# Gotchas

Side-knowledge about things *we can't fix* — Pine language quirks,
TradingView linter behaviors, scraping anomalies in upstream docs.
Long-form `.md` files with as much context as we can muster, so future-
us (or a future Claude) doesn't relearn the same lesson.

A gotcha is **not** a known bug in our own code. Bugs we can fix go in
[`../TODO.md`](../TODO.md) as work items. If you reach for a gotcha to
describe something we control, ask: "could I fix this if I wanted to?"
If yes, it's a TODO entry.

## Format

`G###-short-name.md` — sequential numbering, never reused. If a gotcha
turns out wrong, mark it superseded inside the file; don't renumber.
The body should include: the symptom we hit, the cause we eventually
found, and the lesson worth remembering.

## How to use this folder

- Add an entry to the **Index** below: link + a few keywords.
- Reference gotchas from code via `// see G###`. Don't repeat the
  reasoning at the call site.
- See [CLAUDE.md](../CLAUDE.md) for the project methodology that
  drives this folder.

## Index

- [G001](G001-tv-pine-lint-not-spec.md) — pine-lint, --tv, TradingView,
  reference-not-spec, non-determinism, error-recovery, warning-vs-error
- [G002](G002-reference-underdocuments-accepted-types.md) — reference vs
  linter, overloads, accepted-types, nz/fixnan/na/int/plot,
  under-documentation, FUNCTION_PARAM_TYPE_OVERRIDES
- [G004](G004-version-detection-leniency.md) — version detection,
  //@version directive, whitespace tolerance, default-to-v6, declared
  v4/v5 leniency, NAMESPACE_PROPERTIES, DEPRECATED_V5_CONSTANTS
  (G003 intentionally unused)
