# Gotchas

Side-knowledge about things *we can't fix* - Pine language quirks,
TradingView linter behaviors, scraping anomalies in upstream docs.
Long-form `.md` files with as much context as we can muster, so future-
us (or a future Claude) doesn't relearn the same lesson.

A gotcha is **not** a known bug in our own code. Bugs we can fix go in
[`../notes/todo.md`](../notes/todo.md) as work items. If you reach for a gotcha to
describe something we control, ask: "could I fix this if I wanted to?"
If yes, it's a TODO entry.

## Format

`G###-short-name.md` - sequential numbering, never reused. If a gotcha
turns out wrong, mark it superseded inside the file; don't renumber.
The body should include: the symptom we hit, the cause we eventually
found, and the lesson worth remembering.

**`--tv` validation is mandatory to record.** Any gotcha documenting
TradingView behavior must carry, in the file:

1. the exact `.pine` script(s) sent to `pine-lint --tv` - the
   reproducible probe, not a paraphrase, and
2. TV's results for them (verdict / raw output), dated.

A `--tv` verdict is a point-in-time measurement, not a permanent fact
(TV's linter changes - see [G001](G001-tv-pine-lint-not-spec.md)). G002
is the cautionary case: a `--tv`-verified widening that silently expired
when TV's behavior diverged, with no stored probe to re-check it.

## How to use this folder

- Add an entry to the **Index** below: link + a few keywords.
- Reference gotchas from code via `// see G###`. Don't repeat the
  reasoning at the call site.
- See [CLAUDE.md](../CLAUDE.md) for the project methodology that
  drives this folder.

## Index

- [G001](G001-tv-pine-lint-not-spec.md) - pine-lint, --tv, TradingView,
  reference-not-spec, non-determinism, error-recovery, warning-vs-error
- [G002](G002-reference-underdocuments-accepted-types.md) - **RETRACTED
  2026-06-02**: claimed the reference under-documents accepted types
  (nz/fixnan/na/int/plot); isolated --tv probes disprove every case. The
  FUNCTION_PARAM_TYPE_OVERRIDES it justified are invalid. See INV014.
- [G004](G004-version-detection-leniency.md) - version detection,
  //@version directive, whitespace tolerance, default-to-v6, declared
  v4/v5 leniency, NAMESPACE_PROPERTIES, DEPRECATED_V5_CONSTANTS
  (G003 intentionally unused)
- [G005](G005-tv-diagnostic-position-conventions.md) - TV positions,
  line terminators (\r\r\n doubling, CR-only), wrapped statements,
  logical-line columns, join rule, diff artifacts, TODO #38
- [G006](G006-undetermined-type-suppresses-arg-checks.md) - TV skips
  ALL argument checks on a call containing an "undetermined type"
  argument (untyped UDF results), sibling args included; tv-accepts
  mutation verdicts can be TV FNs; INV001-class true positives, never
  relax to match. Extended 2026-08-21: it also discards an explicit
  DECLARATION annotation (`bool ph = ta.pivothigh(len, len)` with untyped
  `len` types ph as "undetermined type", not bool), and the suppression is
  per-EXPRESSION, not per-function
- [G007](G007-tv-does-not-enforce-input-qualifier.md) - TV enforces the
  `simple` qualifier on args (INV088) but NOT the `input` qualifier:
  series flows into `input`-typed params (plotshape style/show_last) with
  no error. Do not add an input-qualifier check - closes TODO #60 residual
- [G008](G008-collection-reassignment-skips-element-check.md) - TV's
  collection element check is POSITION-DEPENDENT: invariant in a declaration
  with an initializer, widening in a `:=` store (int -> float accepted,
  float -> int rejected), and absent entirely for a `map` in store position.
  The accepting cells are UNSOUND rather than a widening coercion: it aliases,
  so a float can be pushed through the alias into an array TV still types as
  `array<int>`. Keep our error; a TV-clean corpus file may legitimately carry
  it. Headline corrected 2026-08-25 (INV157) - the original "TV does not check
  `:=`" was generalized from widening-only probes
- [G009](G009-tv-endpoint-misses-editor-only-gates.md) - `--tv`
  (`translate_light`) is NOT the validator the Pine editor runs: it does not
  enforce the editor's contextual restrictions on `request.*()` arguments, so
  the whole `strategy.*` surface passes `--tv` clean while the editor rejects
  it with CE10059. `--tv` ACCEPTANCE is not evidence of TV acceptance for that
  class; only an editor capture adjudicates. Third caveat on the oracle after
  G001/G002, and the first that cuts in the accepting direction
- [G010](G010-re-class-errors-are-chart-only.md) - RE-class RUNTIME errors
  (invalid TA length, negative pivot strength, out-of-range `array.slice`)
  reach neither pine-lint mode nor the Pine editor - only the chart legend
  overlay. A runtime error also WIPES the script's whole log output, so log
  capture and error capture are mutually exclusive per run, and an UNUSED
  invalid construction never raises at all because TV eliminates dead code (a
  probe must consume its result or it proves nothing). Banner screenshots held
  in `scripts/probes/re-class-runtime-errors/tv-banners/`; governs TODO #69
