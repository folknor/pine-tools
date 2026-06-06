# INV045 - "Script doesn't contain any statements"

**Date:** 2026-06-07
**Status:** RESOLVED
**Category:** tv-only FN `Script doesn't contain any statements`
(1 record: `644405d3…`, a fixture holding only `//@version=6` and a
"download the script and paste it here" comment) from the 2026-06-05
inventory.

## Claim

A source with no statements at all - empty, or comments/annotations
only - is TV's CE10250. We reported nothing.

## Probes (`probes/`, `pine-lint --tv` 2026-06-07)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `//@version=6` + one comment line | CE10250 `Script doesn't contain any statements` - sent WITHOUT any position (no `start`/`end` in the response) |

## Implementation

`Parser.parse()` records the error at 1:1 when the parsed body is empty
AND no other lexer/parser errors exist (a file whose only statement
failed to parse is broken, not empty - TV reports the syntax error
there, not CE10250).

Because TV sends CE10250 with no span, the three diff scripts
(`compare-tv.mjs`, `find-real-failures.mjs`, `lint-batch.mjs`)
normalize position-less TV diagnostics to 1:1 so the pair matches
instead of double-counting (previously `undefined:undefined` / `0:0`).

Corpus effect: +2 records in 2 files - the carrier fixture and
`e3b0c442…` (the sha256-of-empty-string fixture, a genuinely empty
file; TV refuses empty sources with the version-refusal, so it has no
verdict, but the error is self-evidently correct).

Fixture: `packages/core/test/fixtures/regression/INV045-empty-script.pine`
