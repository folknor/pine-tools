# INV089 - arithmetic/comparison on plot/hline handles not rejected (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/types.ts` (`plot`/`hline` added to the
PineType union), `packages/core/src/analyzer/builtins.ts` (`mapToPineType`
maps them), `packages/core/src/analyzer/checker.ts` (`renderTvType` renders
opaque handles bare; `validateBinaryExpression` legacy gate via
`isOpaqueHandleType`).
**Source:** `../freedom/FINDINGS.md` D-004 - differential testing of
`piners validate`. piners AND our LSP were both silent; only `--tv` flagged it.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
x = plot(close)
y = x + 1            // TV: CE10123 operator "+" plot vs const int. We were silent.
```

## Why it passed

`plot()` returns `"plot"` (`hline()` -> `"hline"`), but neither was in the
PineType union, so `mapToPineType` returned `"unknown"`, and
`areTypesCompatible` short-circuits to true whenever an operand is `unknown`.

## The INV063 question (why this is safe to type, unlike line/label/box/table)

`mapToPineType` deliberately does NOT type the drawing handles
(line/label/box/table): an untyped UDF whose body ends in `line.new(...)` is
mis-inferred as `series<float>`, and typing `line` turned that into ~50 corpus
FPs (INV063). That cannot happen for plot/hline: Pine bars `plot()`/`hline()`
from function bodies, so no UDF returns them - they are only ever the direct
return of the builtin. So typing them is safe.

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

| probe | expr | TV |
|---|---|---|
| disc_plot_arith.pine | `x = plot(close)`; `x + 1` | CE10123 @ 7:5 - expr0="x", "plot" used but "const int" expected, funId "operator +" |
| (hline) | `h = hline(0)`; `h * 2` | CE10123 @ 4:5 - expr0="h", "hline" used but "const int" expected, funId "operator *" |
| (fill control) | `fill(plot1, plot2, color=...)` | clean - the proper use of a plot handle |
| (v4 lenient) | `//@version=4` `u = plot(...)`; `u[1] > u[2]` (corpus `e0b3c80a`) | clean - TV v4 accepts plot-handle comparison |

The last row is why the rejection is **v6-only**: the v4 corpus file
`e0b3c80a` compares plot handles and TV accepts it, so flagging it would be a
false positive (and it was, in the first cut, before the legacy gate).

## Fix (checker)

1. Add `plot`/`hline` to the `PineType` union and map them in `mapToPineType`
   (with an inline note on why they differ from the INV063 drawing handles).
2. `renderTvType` renders opaque handles WITHOUT a qualifier (`plot`, not
   `series plot`) - matching TV's `argumentType`.
3. `validateBinaryExpression`: when `version !== "6"` and either operand is an
   opaque handle (`isOpaqueHandleType`, which also covers line/label/box/table
   defensively), skip the operator check - legacy leniency per G004.

With plot/hline typed, the existing arithmetic/comparison check (operands must
be numeric) rejects them on v6 automatically; no new operator logic was needed.

## Verification

- Probes match TV EXACTLY (position + full message): plot `+` @ 7:5, hline `*`
  @ 4:5; fill control clean.
- Regression fixture `regression/plot-hline-arithmetic.pine` (both errors +
  fill control clean).
- `regression-check.mjs` over 1879 corpus fixtures: the first cut (no legacy
  gate) raised 4 FPs on the v4 file `e0b3c80a` (`u[1] > u[2]` plot
  comparisons); after the v6 gate, **0** new appearances, **0**
  disappearances. Full suite: 352 pass.

## Residual

- Only arithmetic/comparison operators are covered (that is what TV rejects).
- line/label/box/table remain untyped (`unknown`) per INV063, so arithmetic on
  THOSE handles is still an FN - unblocked only when robust UDF-return
  inference (#9) lands. `isOpaqueHandleType` already lists them so the legacy
  gate is correct if/when they are typed.
