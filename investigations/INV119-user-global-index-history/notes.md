# INV119 - indexing a user-defined global series var as history-dependence (attempt, reverted net-negative)

**Date:** 2026-06-25
**Status:** ATTEMPTED, REVERTED. The criterion is correct and probe-backed; the
implementation fixes 3 FNs but the rule is too broad and adds ~4 corpus FPs even
with the cascade gate. Records the exact tradeoff so a future, narrower attempt
does not re-derive it. Builds on the INV117 Family-3 finding.
**SUPERSEDED by INV126 (2026-06-27, the landed fix).** This note's 2026-06-26
re-measurement concluded the user-global-index criterion was REFUTED and
whole-file-emergent. INV126 showed why those probes missed it: the trigger is
the CONJUNCTION of (user-global index) AND (inconsistent call context), which
this note's variants never tested together (they varied one factor at a time).
The dated probe records below are kept verbatim as a point-in-time measurement
(G001); only this forward-pointer is added. The landed rule is a NON-TRANSITIVE
user-global-index classification - see INV126 and git log.
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

## 2026-06-26 re-measurement - the criterion is REFUTED (per G001, re-measure on contradiction)

The Family-3 criterion above rests on one probe row ("`g = close + 1` /
`f() => g[1]` (USER global series var) -> warns"). A careful multi-variant
re-probe (`pine-lint --tv`, 2026-06-26) could NOT reproduce that warning. Every
minimal user-global-index shape is **silent** (each `success:true`, endpoint
confirmed live by an adjacent conditional `ta.sma` call that DOES warn):

| probe (user global `g = close + 1`, called conditionally / iteratively) | TV |
|---|---|
| `f() => g[1]` (const offset), `if`-conditional call | silent |
| `f() => g[bar_index - 1]` (dynamic offset) | silent |
| `floop(n) => for bar=0 to n: ... g[bar_index-bar]`, conditional call | silent |
| same, iterative (`for i = 0 to 2: s := f()`) | silent |
| global conditionally reassigned (`if src=="ma": highSource := hl2`) then indexed | silent |
| nested UDF (outer calls inner-that-indexes-g, inner called in a loop) | silent |
| series-array arg so the UDF result is series, not const | silent (UDF still types `const float`) |

A near-faithful replica of `getTrendLineScore` itself (its `for bar = minBar to
bar_index` loop, `line.get_price`, the `highSource[bar_index-bar]` /
`lowSource[...]` / `openSource[...]` indexing, the nested-if `score` accumulator,
plus the full `updateTrendLine` wrapper with `var line trendLine = na` and the
nested-loop iterative call) is also **silent**. So the structural feature "a UDF
indexes a user-global series var" is NOT what TV keys on - which is exactly why
part-1 over-fired +4 FPs: the rule flags the wrong thing.

### What IS still true - and the position is NOT garbage (G005)

The real `71fb0ec4` file DOES warn (stable across reruns):
`tv-only 257:25 The function "getTrendLineScore" should be called on each
calculation for consistency`. Initially this looked like a garbage position
(line 257 in an editor reads as an unrelated `array.indexof`), but it is **G005
`\r\r\n` line-doubling**: the file has CR-doubled endings, so the raw line number
TV (and our own linter) sees is `2N-1` of the de-CR'd editor line. Cross-check:
our own unused-var warnings land at raw line 441 for the tuple declared at
editor line 221 (`2*221-1 = 441`); and `2*129-1 = 257` is exactly the
`score = getTrendLineScore(tl, pivotBarArray, highLow)` call (editor line 129,
col 25 = the `getTrendLineScore` token). So the warning is **real and correctly
attributed** to the iterative `getTrendLineScore` call inside `updateTrendLine`'s
`for i`/`for j` nest. (Correcting the first draft of this section, which wrongly
called the position drift "unrelated code".)

### Why it is unisolable - the imported libraries ARE the data flow

`highSource`/`lowSource` are `= high`/`low` but conditionally reassigned (under
the `ohlcSource` INPUT gate) to `ca.macandles(...)` / `ca.hacandles()` results -
`HeWhoMustNotBeNamed/customcandles/2`, which IS vendored. `hacandles()` indexes
`open[1]`/`close[1]` and `macandles` calls `eta.ma` (ta.*), so both exports are
history-dependent, and the pivot arrays come from `zg.czigzag`
(`HeWhoMustNotBeNamed/zigzag/5`, also vendored). Reproductions tried (all
`pine-lint --tv`, 2026-06-26, all **silent**):

- a global reassigned to `ta.sma(close,5)` under an input gate, then indexed;
- the SAME with the REAL `import ca` + `highSource := ca.macandles(...)[1]`
  reassignment and an iterative `getTrendLineScore` call;
- `line.get_price(ln, bar)` accumulated in a loop, called iteratively.

None warn. So getTrendLineScore's history-dependence in the real file is not the
global-index, not the library reassignment in isolation, and not `line.get_price`
- it emerges only from the full data flow (most plausibly the zigzag-derived
`barArray` carrying history into `minBar = array.min(barArray)` and thus the loop
that indexes the series globals). It does not survive into any reduction smaller
than the whole file.

### Consequence for the 3 targets / TODO #61

Do NOT implement the user-global-index rule (neither broad nor "narrower
predicate"): it is not TV's criterion, so any predicate built on it is guessing
and over-fires (+4 FPs). `getTrendLineScore` is a genuine library-data-flow FN of
the same class as INV117 Family 2 (history flowing through imported-library
results), only one level more indirect - it flows through a library-tainted
global that is then indexed, rather than a direct conditional library call. The
earlier "warns" probe for the bare `g = close+1; f()=>g[1]` shape was most likely
the empty-response trap (CLAUDE.md: an empty warning list is not proof; record
raw output); the genuine warning is the library-data-flow one, which needs whole-
program qualifier/history propagation (the #9 umbrella), not a structural rule.

## Status of the 3 targets

~~Fixable in principle (the rule warns them correctly); blocked on a narrower
user-global predicate that does not over-fire.~~ ~~**Superseded by the 2026-06-26
re-measurement above: the criterion is refuted, the rule is not TV-backed, real
trigger unisolated.**~~ **RESOLVED by INV126 (2026-06-27):** the trigger is the
CONJUNCTION of user-global index AND inconsistent call; `getStandardTrueRange`
x2 and `getTrendLineScore` now warn via the landed non-transitive rule. The
"trigger unisolated / refuted" conclusion above was itself an artifact of
probing the two factors apart. `FindST` is separate and still unreproducible
(see INV117/INV118).
