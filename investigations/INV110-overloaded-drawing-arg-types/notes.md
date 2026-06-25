# INV110 - drawing-object arg types on overloaded builtins (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker-calls.ts`
(`checkOverloadResolvedArgs`), `packages/core/src/analyzer/builtins.ts`
(`getOverloadSignatures`).
**Source:** `../freedom/FINDINGS.md` L-007 / TODO #61.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
if barstate.islast
    line.new("a", close, bar_index, open)   // x1 needs series int, got string
plot(close)
```

`line.new` (and `label.new`, `box.new`) has two overloads: a point-pair form
(`first_point`/`second_point` typed `chart.point`) and the legacy
`x1/y1/x2/y2` form. The MERGED signature types the legacy params `unknown`
(union across the two forms), so `hasOverloads` is true and the generic
positional arg check is bypassed entirely - the wrong-typed `"a"` slipped
through.

## TV's verdict (probes, `pine-lint --tv`, 2026-06-25)

| probe | TV CE10123 ctx |
|---|---|
| `line.new("a", close, bar_index, open)` | argDisplayName `x1`, `literal string`, `series int`, col 14 |
| `label.new("x", high, "hi")` | argDisplayName `x`, `literal string`, `series int`, col 15 |
| `box.new("b", high, bar_index, low)` | argDisplayName `left`, `literal string`, `series int`, col 13 |

(`success:true`; our output matches TV's argDisplayName / types / columns
byte-for-byte.)

## Fix

`getOverloadSignatures` rebuilds each `overloads[]` entry into a full
`FunctionSignature` (mapped `type` + `rawType` per param) - the per-overload
params ARE cleanly typed even though the merged view is not.

`checkOverloadResolvedArgs` then, for any overloaded function the generic loop
bypasses, **resolves which overload the call selects** and reports the first
type mismatch in it:

1. **Candidates**: overloads whose param set contains every provided named arg
   and whose arity is not overflowed by the positional args.
2. **Classify** each arg against each candidate param as match / mismatch /
   neutral. The merged-type collapse hides two signals, so classification reads
   `rawType`: a clearly-scalar arg vs a `chart.point` param is a mismatch (this
   is what distinguishes the point form from the legacy form), and a
   scalar-union rawType (`series int/float`) is checked against its members
   instead of reading as neutral.
3. **Resolve**: pick the overload with the fewest mismatches, tie-broken by the
   most matches. If the best overload has zero mismatches (valid call) or two
   overloads tie at the best score (ambiguous), stay silent.
4. **Report** the first mismatch in the resolved overload as CE10123 - but only
   for params the merged signature lost to `unknown` (clean merged params are
   already covered by the named-arg loop / INV107, so this never double-fires)
   and only scalar / scalar-union params (a meaningful CE10123 doc type).

This is general overload resolution, not a `line.new` special case: it covers
`label.new`/`box.new` legacy forms and any future mixed-form builtin, and a
valid call (whose true overload fits every arg) is silent by construction.

## Verification

- Regression fixture `regression/INV110-overloaded-drawing-arg-types.pine`:
  line/label/box legacy-form string-where-int flagged (3 errors); valid
  point-pair and legacy calls clean.
- `regression-check.mjs`: **0 corpus changes** across 1879 fixtures - the
  unique-best-fit + reliable-only + merged-lossy gating produces no FPs on
  published code. Full vitest suite green (372 tests).

## Residual

- Conservative by design: a mismatch is reported only when the arg type AND the
  param type are both cleanly known and the best-fit overload is unique. A
  series/UDT arg whose type our inference collapses to `unknown`, or a genuine
  tie between overloads, stays lenient. The named-arg legacy slot
  (`line.new(x1 = "a", ...)`) is covered by the same resolver's named pass.
