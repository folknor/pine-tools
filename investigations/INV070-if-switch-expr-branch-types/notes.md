# INV070 - if/switch EXPRESSION branch-type compatibility (CE10235 FN)

**Date:** 2026-06-19
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (`collectBranchResultTypes`
+ `checkIfSwitchBranchTypes`, called from the IfExpression / SwitchExpression
cases of validateExpression)

## Symptom (false negative)

An `if`/`switch` used as a VALUE whose branches return incompatible types was
accepted silently:

```pine
//@version=6
x = if close > open
    "a"
else
    1
```

TV: `3:5 CE10235 Return type of one of the "if" or "switch" blocks is not
compatible with return type of other block(s) (literal string; literal int)`,
anchored at the `if` keyword. We had the analogous check for TERNARY
(INV001/INV026) but never applied it to if/switch expressions.

## How it surfaced

The #52 fixture-coverage census flagged if-expressions (478 in corpus, 6 in
tests) and switch-expressions as heavily under-tested. Probing edge cases of
that shape for TV disagreement turned up this whole missing class.

## TV's rule (probes, `pine-lint --tv`, 2026-06-19)

Branch types must share a category - IDENTICAL to the ternary branch rule
(`areTernaryBranchTypesCompatible`):

| probe | branches | TV |
|---|---|---|
| p01 if | string / int | CE10235 |
| p02 if | int / float | clean (numeric coercion) |
| p03 switch | string / int | CE10235 |
| p04 if | float / na | clean (na compatible) |
| p05 if/else-if | float / string / float | CE10235 (lists all branch types) |
| p06 if | color / int | CE10235 |
| p07 if | bool / int | CE10235 |
| p08 if | series float / simple float | clean (same base) |

p02/p06/p07/p08 confirm the boundary matches our ternary categories exactly
(numeric/bool/string/color, modulo series/simple). NOTE the asymmetry with
ternary: TV is LENIENT on ternary cross-type mixes and we are deliberately
STRICTER there (INV001); for if/switch TV itself flags, so this is a plain
FN fix, not an over-strict choice.

## Fix

`collectBranchResultTypes` walks each branch's tail expression (recursing into
the `else if` chain, which lowers to a nested IfStatement in the alternate;
handling both switch `result` and statement-bodied arms; skipping non-
expression tails). `checkIfSwitchBranchTypes` filters `unknown`/`na`, then
flags via `areTernaryBranchTypesCompatible` if any concrete branch type
differs in category from the first, anchored at the if/switch keyword. v6-only
(legacy lenient, G004). Reuses the ternary compatibility helper verbatim.

## Verification

- Position + code match TV (3:5, CE10235). Message text matches except the
  parenthetical type list: we render `(string; int)`, TV renders
  `(literal string; literal int)` - TV tags literal/const/series qualifiers
  we don't carry on inferred branch types. Acceptable wording diff (these are
  catches on broken code, never in the valid corpus, so invisible to the
  find-real-failures diff).
- 8 probe files; 2 regression fixtures
  (`regression/INV070-if-switch-expr-branch-mismatch` - if string/int +
  switch color/int flagged; `regression/INV070-if-switch-expr-no-false-
  positive` - int/float, na, series/simple, all local == TV clean).
- `regression-check.mjs`: 0 changes over 1879 fixtures (no valid if/switch
  expression in the corpus - 478 if-exprs - trips it). Full suite: 332 pass.

## Residual

- Ternary stays at its own INV001 over-strict behavior (separate, intentional).
- Non-expression branch tails (a branch ending in an assignment/void call) are
  skipped, so a mismatch carried only through such a tail is not caught (FN-
  safe, rare).
- v5/v4 if/switch expressions are lenient (not probed; gate can be lifted if a
  v5 case is found and wanted).
