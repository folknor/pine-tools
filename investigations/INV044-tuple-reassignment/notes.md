# INV044 - tuple := reassignment

**Date:** 2026-06-07
**Status:** RESOLVED
**Category:** tv-only FN `Syntax error at input ":="` (1 record:
`3df5e5f0…:200`, `[triggerLong, …] := triggerIndicator()` inside an
if-body) from the 2026-06-05 inventory.

## Claim

Tuples only DECLARE: `[a, b] = f()` is valid, `[a, b] := f()` is not -
there is no tuple reassignment in Pine. Our lexer emits both `=` and
`:=` as TokenType.ASSIGN, so `tupleDestructuring`'s
`consume(TokenType.ASSIGN)` silently accepted the `:=` form.

## Probes (`probes/`, `pine-lint --tv` 2026-06-07)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `[a, b] := f()` in an if-body | CE10156 `Syntax error at input ":="` at 8:12 (the `:=` token) |

## Implementation

`tupleDestructuring` in `parser.ts` keeps the consumed ASSIGN token and,
when its value is `:=`, records TV's CE10156 message at the token - 
AFTER the whole tuple statement parsed, so a backtracking caller that
discards the parse can't leave a spurious error behind. The statement
still yields a TupleDeclaration (recovery: the names stay declared, so
later uses don't cascade into undefined-variable FPs).

Corpus effect: +7 records in 1 file (the carrier; TV stops at the first,
the other six land past its stop). compare-tv on `3df5e5f0…` now
matches TV's 200:68 exactly (the raw `:=` column of that line's long
tuple names).

Fixture: `packages/core/test/fixtures/regression/INV044-tuple-reassignment.pine`
