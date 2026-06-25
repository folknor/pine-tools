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

## Residual

- **`plotshape(style = st)` where `st` is a series variable** (F-041's 4th
  sub-case) is NOT flagged. Two blockers, both separate from the const-composite
  core: (a) `style` is INPUT-required (`input string`), not const - it needs an
  input-qualifier check analogous to INV088's simple-qualifier one, and
  `checkConstArgs` only handles const-required params; (b) a ternary of `shape.*`
  members infers base `series float` (our ternary base-inference doesn't resolve
  member-constant string types - `shape.triangleup` is catalog-typed `string`
  but the branch inference defaults to float), so even with an input check the
  rendered argumentType would read `series float` not TV's `series string`. Left
  as a follow-up; the const-composite headline of #60 is delivered.
- Wrong-namespace member args and other composite shapes (if/switch expressions
  as args) follow the same `exprQualifier` machinery if a real case appears.
