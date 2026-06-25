# INV116 - CW10003/4 for history-dependent METHOD calls + the undetermined-gate exclusion

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/parser/semanticAnalyzer.ts`
(`checkConditionalSeriesCall` bare-method-name fallback;
`scanStatementsForHistoryDependence` undetermined-gate local blocking)
**Source:** the INV114/INV115 warning-sweep residual - method-call consistency
FNs (`db76cf79` FindImbalance, `c581b8e4` draw_trendLine).

Two coupled changes. The first surfaces a class of true positives; the second
keeps that class from over-firing.

## Fix 1 - method calls register under the BARE method name (5 FN fixes)

`checkConditionalSeriesCall` built a call's name as `obj.prop` and looked it up
in the history-dependent set. That is right for namespaced builtins (`ta.sma`),
but a user METHOD call `PH.draw_trendLine()` registers under the bare name
`draw_trendLine` (the receiver is just the object), so the lookup missed and a
conditionally-called history-dependent method never warned.

```pine
//@version=6
indicator("s")
type T
    float v
method hist(T this, float x) =>
    var float s = 0
    s := x
    s[1]
t = T.new(0)
if close > open
    t.hist(close)        // TV: CW10003 "hist". We were silent.
```

TV (`pine-lint --tv`, 2026-06-25): 0 errors, 1 warning "hist" at the call. Fix:
when `obj.prop` is not history-dependent, fall back to the bare property name
against `historyDependentUdfs`. TV's message uses the bare name. This alone took
the corpus warning tvOnly 17 -> 12 (draw_trendLine x2, FindImbalance x3).

## Fix 2 - a local assigned under an UNDETERMINED gate is not own-scope history

Fix 1 exposed a false positive on `draw_ob` (`c581b8e4`): TV is SILENT on it but
we warned. Both `draw_ob` and `draw_trendLine` are methods indexing locals under
`if <series> and allow` (`allow = last_bar_index - bar_index < 400` is series),
so the call-site conditionality is identical. The difference is INSIDE the
method, probed step by step (`pine-lint --tv`, 2026-06-25):

| probe | TV |
|---|---|
| `g = close > open` (computed) then `g[1]` feeds return | warns |
| `g = close > open` then `g[1]` feeds only a side-effect (label) | warns |
| `s = close` (alias) then `s[1]` | warns |
| `c := close<open` reassigned under `if candle_type`, candle_type **typed** bool, then `c[1]` | warns |
| `c := close<open` reassigned under `if candle_type`, candle_type **UNTYPED**, then `c[1]` | **silent** |

So the lone differentiator is the gate qualifier: `draw_ob` reassigns its indexed
locals (`candle_`, `src_l`) inside `if candle_type` where `candle_type` is an
UNTYPED param. An untyped param is "undetermined" (INV114), so the value
SELECTED is undetermined, and TV does not treat indexing it as per-call history.
`draw_trendLine` reassigns `src := pivot` from a TYPED param -> series -> warns.

Fix: `scanStatementsForHistoryDependence` now threads the function's untyped
params and an `underUndetermined` flag. Descending into an `if`/`while` whose
condition references an untyped param and is not otherwise series
(`isSeriesishExpression`) sets the flag; a local declared or reassigned under it
is REMOVED from the qualifying set, so its `[]` no longer counts. A PARAM indexed
DIRECTLY is unaffected, so `prevVal(src) => src[1]` (untyped param, indexed
directly) still warns - the intentional manual-based UDF behavior (INV018 p5)
is preserved.

## Verification

- Probes above reproduced locally; the new fixture
  `regression/method-call-history-dependence.pine` (method warns; undetermined-
  gated method silent) matches TV exactly (1 warning).
- `draw_ob` (`c581b8e4`) now silent, `draw_trendLine` warns - `compare-tv` 0
  consistency tv-only / 0 consistency local-only on that file.
- Existing `conditional-series-history-dependence.pine` still passes (prevVal,
  the direct-param-index case, still warns).
- Error channel: `regression-check.mjs` 0 new / 0 disappeared (one crash caught
  and fixed mid-development - a second `scanStatementsForHistoryDependence`
  caller in the switch-arm path needed the new arg; it now passes an empty
  untyped-param set). Full suite 379.
- Warning sweep: tvOnly 17 -> 12, localOnly unchanged 1312, consistency FPs on
  TV-clean files UNCHANGED at 11 (same files) - zero new false positives.

## Residual

9 consistency warnings remain tv-only (`6293fd71` getStandardTrueRange/
cust_series/ta.stdev, `71fb0ec4` getTrendLineScore, `b369d637` scan, `db76cf79`
FindST). Different cause from the method-name gap (these survived it); to be
triaged separately. The 11 TV-clean consistency FPs are the INV114 residual
(typed-param call-site sensitivity), untouched here.
