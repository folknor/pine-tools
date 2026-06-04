# INV026 - hex-literal and guessed-param-type FPs (ternary cluster, #18)

**Status:** resolved 2026-06-04. Three distinct inference bugs, found by
working the 18-hit "Ternary branches must have compatible types" FP
cluster (the largest confirmable local-only category after the INV025
re-measurement). 15 of the 18 sites were genuine FPs across 7 published
files; the other 3 are our own synthetic fixture (`35a58bb9…`, the
corpus hash-copy of `validation/ternary-branch-types.pine`) whose
deliberate errors TV also flags, just anchored at the argument with
`Cannot call "operator ?:"` wording - cross-linked noise, not FPs.

This does NOT touch INV001's decision: the branch-compatibility check
itself stands, stricter than TV on purpose. What was wrong here is the
*types fed into it*, not the rule.

## Bug 1 - hex color literals inferred as 'string'

`#00ff41`-style literals reach the AST as bare unquoted strings (string
literals keep their surrounding quotes in `Literal.value`, so the `#`
prefix is unambiguous). `TypeChecker.inferLiteralType` typed any string
value as `'string'`, so `cond ? #00ff41 : color.gray` flagged
string-vs-color. 13 of the 15 FP sites. Fixed in
`packages/core/src/analyzer/types.ts`: a value matching the lexer's
color-token shape (`#` + exactly 6 or 8 hex digits) infers `color`.

## Bug 2 - inference-pass cache poisoning (untyped UDF params)

`inferFunctionReturnType` registers untyped params as `series<float>`
(deliberate guess, INV005) and runs before validation, but it shares
the per-AST-node `expressionTypes` cache with the validation pass -
which registers the same params as `unknown` and would skip the check.
So `cond ? "1440" : tf` (where `tf` is an untyped param, compared
`tf == "1D"` in the same expression) was cached string-vs-series<float>
and flagged. Fixed in `checker.ts`: the inference pass now swaps in a
throwaway cache and restores the real one on exit.

## Bug 3 - return-follows-param fallback frozen to overload #0

With bug 2 fixed, one new appearance surfaced: `ta.valuewhen(cond_,
v_, 0)` with `v_` an untyped param now resolved `source` as `unknown`,
so `getPolymorphicReturnType` returned null and the checker fell back
to valuewhen's static return - frozen to overload #0, which is
**color** - producing `cannot apply '-' to series<color> and
series<color>` on `(y2 - y1)`. The INV016 guard already prevented this
frozen-overload fallback for `flags.polymorphic` functions; extended it
to `flags.returnTypeParam` functions (new `hasReturnTypeParam` in
`builtins.ts`): undetermined means `unknown`, never the frozen static.

## Probes (`pine-lint --tv`, 2026-06-04, files in this directory)

All three accepted by TV with zero errors (`success:true`); each probe
disagrees with our pre-fix validator (which errored on all three),
confirming they reached TV:

- `probe-a-hex-ternary.pine` - both ternaries accepted; TV types `c`
  and `c2` as `series color` (raw: variables `c`/`c2` type
  `"series color"`, no errors array).
- `probe-b-untyped-param-ternary.pine` - accepted; TV types the
  untyped param `tf` as **"undetermined type"** and the function as
  `selectTimeframeFromInput(tf) → undetermined type` - exactly the
  `unknown` stance, not a series<float> guess.
- `probe-c-valuewhen-param.pine` - accepted; TV types `y1`/`y2` (from
  `ta.valuewhen(cond_, v_, n)`) as **"undetermined type"** - the
  polymorphic return follows the undetermined source, it does not
  freeze to an overload (raw: variables y1/y2 type
  "undetermined type", no errors).

## Verification

- Regression fixture:
  `packages/core/test/fixtures/regression/INV026-literal-color-and-param-guess.pine`
  (all three patterns, `@expects no-errors`).
- All 7 published files with ternary FPs lint clear at those positions;
  the synthetic `35a58bb9…` keeps its 3 deliberate errors.
- Corpus regression diff: 0 appearances, 3 message changes (hex
  literals now correctly read 'color' in other diagnostics), 585
  disappearances - all in the guessed-param / hex-literal categories,
  spot-checked: every sampled site was an FP built on a guessed type
  (e.g. `isLast(var1, var2) => ta.barssince(var1) < ...` flagged
  arg-1-not-bool off the series<float> guess). The 5 disappearances
  the checker labeled "TV-also-flagged" were verified: TV's single
  error in each file is elsewhere (a `for` statement, INV025's
  CE10017); the positions themselves are TV-silent all-color ternaries.
