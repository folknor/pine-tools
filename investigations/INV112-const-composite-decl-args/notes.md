# INV112 - const-ness on composite declaration args (false negative)

**Date:** 2026-06-25
**Status:** fixed (core composite cases); one sub-case deferred (see Residual)
**Code:** `packages/core/src/analyzer/checker-calls.ts` (`exprQualifier` +
`describeNonConstArg` ternary/binary cases).
**Source:** `../freedom/FINDINGS.md` F-041 / TODO #60.

## Symptom (false negative)

```pine
//@version=6
indicator(close > 0 ? "a" : "b", overlay = close > 0)
alertcondition(close > open, "t", "Zone: " + str.tostring(close))
```

A const-required decl arg (`title`/`overlay`/`message`) fed a COMPOSITE
expression that is non-const because a series operand promotes it. INV014
caught only leaf builtin vars/calls; ternaries, comparisons, and string
concatenations fell through `describeNonConstArg`'s `default: null`.

## TV's verdict (probes, `pine-lint --tv`, 2026-06-25)

| probe | CE10123 ctx (argDisplayName / repr / argType / expected) |
|---|---|
| `indicator(close>0 ? "a":"b")` | title / `call "operator ?:" (series string)` / series string / const string |
| `indicator("s", overlay=close>0)` | overlay / `call "operator >" (series bool)` / series bool / const bool |
| `alertcondition(c,"t","Zone: "+str.tostring(close))` | message / `call "operator +" (series string)` / series string / const string |
| `indicator(true ? "a":"b")` (control) | accepted (const ternary) |

(`success:true`; our output matches argDisplayName / repr / types / columns
byte-for-byte.)

## Fix

`exprQualifier(v, expr, version)` infers an expression's qualifier on the
lattice `const < input < simple < series`, promoting composites to their
strongest operand: a ternary or binary over a series operand is series; an
all-const composite (`true ? "a" : "b"`) is const. It returns null for any leaf
it can't resolve, so the caller stays conservative.

`describeNonConstArg` gained TernaryExpression / BinaryExpression cases: when
`exprQualifier` is non-const, report the arg with the base type from
`inferExpressionType` and TV's `call "operator <op>" (<qual> <base>)` repr
(`?:` for the ternary). The const check (`checkConstArgs`) only calls
`describeNonConstArg` on args already resolved to a const-required param, so the
new cases never touch non-const params. The `message=str.tostring(...)` and the
`+`-concat forms ride the pre-existing CallExpression / new BinaryExpression
paths respectively.

## Verification

- Regression fixture `regression/INV112-const-composite-decl-args.pine`: ternary
  title, comparison overlay, concat message flagged; const-ternary plot title
  control clean (3 errors).
- `regression-check.mjs`: 3 new appearances, all in `577f1104...` - alertcondition
  message string-concats (`"..." + str.tostring(...)`). All TV-confirmed true
  positives (the minimal `+`-concat probe above); the file escapes TV only via an
  earlier line-475 stop. Baseline re-snapshotted (16060 -> 16063). Full vitest
  suite green (373 tests).

## Residual - RESOLVED as a non-issue (2026-06-26, see G007)

- **`plotshape(style = st)` where `st` is a series variable** (F-041's 4th
  sub-case) is correctly NOT flagged. The two blockers this note originally
  listed both evaporated under direct probing:
  - (b) is already gone: `st = close > 0 ? shape.triangleup : shape.triangledown`
    infers `series string` today (member constants resolve through
    NAMESPACE_PROPERTIES -> `string`, then the series condition wraps it). The
    "infers series float" claim was an untested assumption.
  - (a) is moot: **TV does not enforce the input qualifier at all.** Probed
    2026-06-26 (`pine-lint --tv`), one script, same `bar_index` (series int):
    `offset = bar_index` (simple int) -> CE10123; `show_last = bar_index`
    (input int) -> ACCEPTED. And `style = sstr` (series string) is accepted
    while the identical `sstr` into `text` (const string) is CE10123. So adding
    an INV088-style input-qualifier check would be a pure false-positive
    generator. Full probes + the simple-vs-input asymmetry live in
    [../../gotchas/G007-tv-does-not-enforce-input-qualifier.md](../../gotchas/G007-tv-does-not-enforce-input-qualifier.md).

  Our checker already matches TV byte-for-byte on the combined call (rejects
  `offset`, accepts `show_last`/`style`). The const-composite headline of #60
  was delivered above; this residual is closed, not deferred.
- Wrong-namespace member args and other composite shapes (if/switch expressions
  as args) follow the same `exprQualifier` machinery if a real case appears.
