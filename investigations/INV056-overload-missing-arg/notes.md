# INV056 - missing required arg skipped for ALL overloaded functions (CE10165)

**Date:** 2026-06-10
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (validateFunctionArguments),
`packages/core/src/analyzer/builtins.ts` (`getMinimalRequiredParams`)

## How it was found

Started as TODO #50 - a single FN lead from INV055's matrix coverage probe:
`matrix.sum(m)` is missing its required `id2` and we were silent. The
"confirm whether it generalizes" step showed it is NOT a one-off:
**112 of 122 overloaded functions** have an argument required in every
overload that we never enforced.

## Symptom (false negative)

```pine
//@version=6
indicator("t")
m = matrix.new<float>(2, 2, 1.0)
s  = matrix.sum(m)          // TV: missing "id2"   - we were silent
c  = str.contains("ab")     // TV: missing "str"   - we were silent
rgb = color.rgb(1, 2)       // TV: missing "blue"  - we were silent
```

All three are CE10165 "No value assigned to the \"X\" parameter" on TV
(probed 2026-06-10), local silent.

## Root cause - INV050's conservative overload skip

The missing-required-arg check was gated by
`!functionHasOverloads && !hasOverloadSignatures(functionName)`, i.e. it
skipped every overloaded function. That gate exists for a real reason
(INV050): the requiredness probe enumerates TV's *preferred* overload only,
and a call may legitimately satisfy a *different* overload - e.g.
`label.new`'s `x` is required in the x/y overload but absent from the point
overload, so enforcing it positionally would be a false positive.

But the skip was too broad. The sound rule is the **arity floor**: a call
providing fewer args than the *minimal-arity* overload's required-param
count can satisfy NO overload, so it is a guaranteed CE10165.

## Fix

`getMinimalRequiredParams(fn)` returns the required-param NAME list of the
overload with the fewest required params. The checker, for overloaded
functions, emits CE10165 for each name at index >= positionalArgs.length not
also passed by name. Measuring against the minimal overload's OWN param
order (not the merged order) is the crux:

- `ta.highest(10)` - overloads need [1, 2] args; floor is the 1-arg
  `ta.highest(length)` form, so 10 reads as `length` and it is CLEAN. The
  earlier merged-order attempt wrongly mapped 10 -> `source` and flagged a
  bogus missing `length` (caught in dev, fixed before commit).
- `matrix.sum(m)` - both overloads need id1+id2; floor is 2, one arg given,
  so `id2` is flagged.
- `label.new(x, y, ...)` - point overload needs only `point`; floor is 1, so
  the x/y form is never under-supplied. No FP.

## TV probes (`pine-lint --tv`, 2026-06-10)

```pine
//@version=6
indicator("t")
sc = str.contains("ab")     // 3:6 missing "str"
cr = color.rgb(1, 2)        // 4:6 missing "blue"
hh = ta.highest(10)         // SILENT - 1-arg overload is valid
plot(close)
```

Local matches TV exactly on all three (two flagged, ta.highest clean).
`--tv`-reached-TV sanity: TV disagrees with our pre-fix silence on
str.contains / color.rgb, proving the calls reached TV.

## Verification

- Regression fixture `regression/INV056-overload-missing-required-arg`
  (`errors: 3` count guards the ta.highest / matrix.sum(m,m) FP cases from
  regressing).
- Regression check: **0 changes** across 1879 corpus files - the 112-function
  broadening introduced no false positives (published scripts don't
  under-supply required args; the check earns its keep on invalid/edited
  code).
- Full suite: 297 pass.

## Note

This did not touch the non-overloaded path (still INV050's probe-driven
requiredness) nor variadic min-args (separate `flags.minArgs` check). Only
the overloaded-function gate changed.
