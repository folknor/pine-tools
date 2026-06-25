# INV119 - indexing a user-defined global series var as history-dependence (attempt, reverted net-negative)

**Date:** 2026-06-25
**Status:** ATTEMPTED, REVERTED. The criterion is correct and probe-backed; the
implementation fixes 3 FNs but the rule is too broad and adds ~4 corpus FPs even
with the cascade gate. Records the exact tradeoff so a future, narrower attempt
does not re-derive it. Builds on the INV117 Family-3 finding.
**Target FNs:** `getStandardTrueRange` x2 (`6293fd71`), `getTrendLineScore`
(`71fb0ec4`) - the INV117 tail that is NOT library-body (INV118) and NOT
unreproducible (`FindST`).

## The criterion (correct - corrects INV018 p4)

INV018 p4 said "indexing a GLOBAL does not count" (a global's history is
committed every bar). That is too broad. Probed (`pine-lint --tv`, 2026-06-25):

| probe | TV |
|---|---|
| `f() => close[1]` (BUILTIN global), called conditionally | silent |
| `f() => close[someVar]` (builtin, dynamic offset) | silent |
| `g = close + 1` / `f() => g[1]` (USER global series var) | **warns** |

So: indexing a BUILTIN global is consistent (silent), but indexing a USER-defined
global SERIES var DOES count. `getTrendLineScore` indexes `highSource` (`= high`)
and `getStandardTrueRange` indexes `stClose` (from the INV117 tuple destructure) -
both user globals - so both are history-dependent and, called in a series
context, should warn.

## Implementation (3 parts, all reverted)

1. `scanExpressionForHistoryDependence` IndexExpression: also count `name[...]`
   when `name` is in `seriesVars` (which holds ONLY user vars - builtins are
   never added, so they stay exempt).
2. The cascade gate: making `getTrendLineScore` history-dependent makes
   `updateTrendLine` (which calls it) history-dependent too, and its caller
   `scan` gates on `if ... and array.size(zigzagpivots) >= 6` where
   `zigzagpivots` is an UNTYPED param. We treated `array.size(...)` as series
   (its return type), so the gate read series and we warned `updateTrendLine`
   where TV is silent. Fix: track the current function's untyped params
   (`undeterminedParams`, set in `withSeriesParams`) and make a series-RETURNING
   builtin called on ONLY undetermined args non-series (`isUndeterminedRooted`):
   `array.size(untypedParam)` is undetermined, `array.size(varArray)` stays
   series (probed: `if array.size(realArray) > 5` DOES warn).

## Why reverted - measured net-negative

With both parts, `getStandardTrueRange` x2 and `getTrendLineScore`
`compare-tv` clean (consistency tv-only 0 on both files; the `updateTrendLine`
cascade in `71fb0ec4` is fully gated - local-only 0 there). BUT the full sweep
showed consistency FPs on TV-clean files **11 -> 15 (+4)** plus one new tv-only
(`6874e636` `sma`): the user-global-index rule ALSO makes other UDFs that index
a user global history-dependent, and TV is silent on several of their
conditional calls. So +3 intended FN fixes, ~+4 unintended FPs - net-negative,
reverted (consistent with this session's no-FP-regression discipline).

The +4 FP files were not individually enumerated before the revert; a future
attempt should re-apply, list them, and probe each to find what distinguishes
the user globals TV warns on (e.g. the global computed from a series vs aliasing
one builtin, or the call site's qualifier) - i.e. the narrower predicate that
keeps `getStandardTrueRange`/`getTrendLineScore` while dropping the FPs. That is
the same call-site / qualifier inference the #9 umbrella tracks.

## Status of the 3 targets

Fixable in principle (the rule warns them correctly); blocked on a narrower
user-global predicate that does not over-fire. `FindST` is separate and still
unreproducible (see INV117/INV118).
