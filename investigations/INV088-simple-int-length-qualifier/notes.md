# INV088 - series value into a `simple int` param not rejected (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` - module helpers
`isSimpleQualifiedParam` / `isSeriesQualified`, the dedicated simple-qualifier
pass in `validateCallExpression`, and the counted-`for` iterator now typed
`series<int>` (ForStatement case).
**Source:** `../freedom/FINDINGS.md` D-002 - differential testing of
`piners validate`. piners AND our LSP were both silent (warning only); only
`--tv` flagged it.

## Symptom (false negative)

A series value passed where a `simple int` is required was accepted:

```pine
//@version=6
indicator("s")
s = 0.0
for i = 1 to 5
    s += ta.ema(close, i)        // i is series int; TV: CE10123. We warned only.
l = ta.barssince(close > open)
e = ta.ema(close, l)             // l is series int; TV: CE10123. We were silent.
```

## Why it passed (two independent gaps)

1. **Qualifier erased.** `ta.ema`'s `length` is `simple int` in the reference,
   but `mapToPineType` collapses `"simple int"` -> bare `"int"`, and
   `isAssignable(series<int>, int)` returns true ("series values in simple
   contexts"). So even when reached, the series arg was accepted.
2. **Generic loop bypassed.** `ta.ema`'s `source` is `series int/float` (a
   union) -> `"unknown"`, so `hasOverloads(ta.ema)` is true and the positional
   loop skips ta.ema entirely. (Same structural bypass as INV087.)
3. **Counter under-typed.** Our counted-`for` iterator was typed `"int"`
   (INV071 deliberately left it so), not `series<int>`, so even a qualifier
   check would not have seen `i` as series. INV071's residual explicitly
   flagged this ("the `series int` change risks `simple int`-context FPs;
   revisit if a real case appears") - D-002 is that case.

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

`length` is documented `simple int`; TV types both a counted-`for` counter and
a `ta.barssince` result as `series int` and rejects them as the length:

| probe | call | TV |
|---|---|---|
| qual_loopvar_length.pine | `for i = 1 to 5` ... `ta.ema(close, i)` | CE10123 @ 9:24 - "length"="i", series int used but simple int expected |
| qual_barssince_length_CONTROL.pine | `l = ta.barssince(...)`; `ta.ema(close, l)` | CE10123 @ 7:20 - same, "l" |
| (control) | `ta.ema(close, 14)`, `ta.ema(close, input.int(20))` | clean - const/input are not series |

## Fix (checker)

- **Qualifier pass:** for each param whose `rawType` is a pure
  `simple <primitive>` (`isSimpleQualifiedParam`), if the arg is series-
  qualified (`isSeriesQualified`) and otherwise assignable to the param's base
  (gate on `isAssignable`, so a base-incompatible arg is not double-reported),
  emit CE10123 with `argumentType` = the arg's rendered type and
  `currentTypeDocStr` = the `simple int` rawType. Runs regardless of
  `hasOverloads` (like INV087's element pass), so it catches ta.ema.
- **Counter typing:** the counted-`for` iterator is now `series<int>` (the
  for-in tuple INDEX stays `int` - INV071 residual, unchanged).

## Verification

- Probes: the two FINDINGS repros, positions EXACT vs TV (loop-counter 9:24,
  barssince 7:20). Const-literal and `input.int` lengths stay clean.
- Regression fixture `regression/simple-int-length-qualifier.pine`.
- `regression-check.mjs` over 1879 corpus fixtures: **0** new errors, **0**
  FPs. The counter-as-series change relabeled 3 pre-existing "Cannot assign"
  diagnostics in one file (`a56ca7c4...`, a `bool`-declared var assigned an
  int ternary off a loop counter) from `const int` -> `series int` - MORE
  TV-accurate, not a regression. No disappearances. Full suite: 351 pass.

## Residual

- For-in tuple INDEX / map KEY still typed `int` (TV: series int / key type) -
  INV071 residual, low value, unchanged here.
- The qualifier pass keys off positional index for unnamed args; a function
  whose overloads place a simple param at different positions could in
  principle mis-align (none observed in the corpus).
