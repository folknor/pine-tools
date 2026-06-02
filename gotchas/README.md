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

**`--tv` validation is mandatory to record.** Any gotcha documenting
TradingView behavior must carry, in the file:

1. the exact `.pine` script(s) sent to `pine-lint --tv` — the
   reproducible probe, not a paraphrase, and
2. TV's results for them (verdict / raw output), dated.

A `--tv` verdict is a point-in-time measurement, not a permanent fact
(TV's linter changes — see [G001](G001-tv-pine-lint-not-spec.md)). G002
is the cautionary case: a `--tv`-verified widening that silently expired
when TV's behavior diverged, with no stored probe to re-check it.

## How to use this folder

- Add an entry to the **Index** below: link + a few keywords.
- Reference gotchas from code via `// see G###`. Don't repeat the
  reasoning at the call site.
- See [CLAUDE.md](../CLAUDE.md) for the project methodology that
  drives this folder.

## Index

- [G001](G001-tv-pine-lint-not-spec.md) — pine-lint, --tv, TradingView,
  reference-not-spec, non-determinism, error-recovery, warning-vs-error
- [G002](G002-reference-underdocuments-accepted-types.md) — **RETRACTED
  2026-06-02**: claimed the reference under-documents accepted types
  (nz/fixnan/na/int/plot); isolated --tv probes disprove every case. The
  FUNCTION_PARAM_TYPE_OVERRIDES it justified are invalid. See INV014.
- [G004](G004-version-detection-leniency.md) — version detection,
  //@version directive, whitespace tolerance, default-to-v6, declared
  v4/v5 leniency, NAMESPACE_PROPERTIES, DEPRECATED_V5_CONSTANTS
  (G003 intentionally unused)
