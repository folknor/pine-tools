# G004 - version detection drives leniency; a missing directive defaults to v6

**Status:** active
**Discovered:** 2026-05-29
**Affects:** lexer version detection, the language-service pattern warnings,
namespace-property type inference, and the deprecated-constant check

## Symptom

Two related problems:

1. Scripts that deliberately declare an older language version
   (`//@version=5`, `//@version=4`) were getting scolded with v6-only
   nudges and errors that don't apply to the version they target.
2. A version directive written with whitespace - `// @version=5`,
   `//@version = 5` - was not recognised at all. The lexer only matched
   the gremlin-free `//@version=X`, so a spaced directive fell through to
   the "no directive" path, which defaults to `"6"`, and the script was
   then linted as v6.

On top of that, `NAMESPACE_PROPERTIES` carried hand-coded v4/v5 entries
(`input.source`, `input.bool`, ..., `color.grey`, `color.transparent`)
that were injected for *all* versions. In v6 the `input.*` names are
functions (they live in `functions.json`) and TV rejects the rest as
undeclared identifiers, so every one of those entries silently
suppressed a real v6 error for everyone.

## Cause

Version leniency was being faked by masking v6 facts globally instead of
keying behaviour to the detected version. Meanwhile detection itself was
brittle: a single regex (`/\/\/@version=(\d+)/`) with no tolerance for
whitespace, feeding a `getDetectedVersion() || "6"` fallback. A
mis-detected directive is invisible - it just quietly becomes v6.

## Lesson

- **Detect the version robustly, then let the version gate the checks.**
  Leniency for declared v4/v5 should come from `detectedVersion`, not from
  poisoning the v6 data tables. Masking facts for all versions trades a
  pre-v6 false positive for a v6 false negative.
- **A missing or unparseable directive defaults to `"6"`** (see
  `getDetectedVersion() || "6"` in `documents/ParsedDocument.ts` and
  `cli.ts`).
  That is deliberate: no-directive scripts still get the full v6
  treatment, including the "recommend //@version=6" nudge. Only a script
  that *explicitly* declares an older version is treated leniently.
- The lexer now tolerates whitespace around the directive
  (`/\/\/\s*@version\s*=\s*(\d+)/`), so `// @version = 5` is detected as
  v5 instead of silently defaulting to v6.
- **Detect the version from the comment; do NOT reclassify the token.**
  The first cut skipped leading whitespace in `scanComment` *before* the
  `peek() === "@"` annotation test. That detected spaced directives - but
  it also turned every `// @function` / `// @param` / `// @returns` doc
  comment into an `ANNOTATION` token, which the parser doesn't expect
  mid-body, cascading 200+ phantom "Unexpected token" / "Expected )"
  errors on doc-heavy library scripts. The fix keeps spaced directives as
  ordinary `COMMENT` tokens and runs the version regex on the comment's
  text, so detection is whitespace-tolerant without disturbing
  tokenization. Lesson: a directive scan should change *detection*, not
  *token classification*.

## Lesson applied / where this lives in code

see G004 in:

- `parser/lexer.ts` - `extractVersionFromAnnotation` runs on regular
  COMMENT tokens too (not just `//@`-prefixed ANNOTATION tokens), with a
  whitespace-tolerant `/\/\/\s*@version\s*=\s*(\d+)/` match. Spaced
  directives stay COMMENT tokens; only detection changes.
- `analyzer/builtins.ts` - `NAMESPACE_PROPERTIES` is now built purely from
  scraped pine-data; the hand-coded v4/v5 / alias entries were removed.
- `language-service/.../diagnostics.ts` - v6-only pattern nudges
  (`//@version=6` header, `input.timeframe`, `math.clamp`) gated behind
  `isV6 = detectedVersion === "6"`.
- `analyzer/checker.ts` - the `DEPRECATED_V5_CONSTANTS` warning path was
  removed along with the table (it was the last consumer).
