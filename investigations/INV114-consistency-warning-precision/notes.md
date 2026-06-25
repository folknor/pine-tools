# INV114 - CW10003/4 consistency-warning precision: series-arg propagation + untyped-param undetermined

**Date:** 2026-06-25
**Status:** fixed (two independent precision fixes; residual tail listed below)
**Code:** `packages/core/src/parser/semanticAnalyzer.ts`
(`isSeriesishExpression` CallExpression branch; `withSeriesParams`)
**Source:** the periodic TV warning sweep - `totalWarningTvOnly` held 26 FNs and
the consistency warning was also over-emitting ~249 FPs on TV-clean files.

The "should be called on each calculation for consistency" warning (TV CW10003
block / CW10004 ternary) fires when a HISTORY-DEPENDENT function (`ta.*`, or a
UDF that transitively calls one) is invoked inside a per-bar-varying conditional
scope. We gate it on `isSeriesishExpression(condition/discriminant)` - only a
SERIES governing condition selects a different branch each bar. Two gaps:

## Fix 1 - series is contagious through call arguments (5 FN fixes)

`na(x) -> simple bool` in pine-data (the minimal documented overload), but TV
widens the result qualifier to the max of the argument qualifiers, so
`na(mg[1])` is `series bool`. `isSeriesishExpression` only inspected a call's
declared return / historyDependent flag, never its arguments, so the McGinley
idiom looked input-conditioned and we skipped the warning:

```pine
//@version=6
indicator("s")
length = input.int(14, minval=1)
source = close
mg = 0.0
mg := na(mg[1]) ? ta.ema(source, length) : mg[1] + (source - mg[1]) / (length * math.pow(source/mg[1], 4))
plot(mg)
```

TV (`pine-lint --tv`, 2026-06-25): 0 errors, **1 warning** - `ta.ema` at 6:19
"should be called on each calculation ... extract the call from the ternary
operator". We were silent. Fix: a call is series-ish if ANY argument is. A
const/input/simple arg stays non-series, so the input-selector idiom is
untouched. Result: `compare-tv` on the carrier now `warnings local 1 / tv 1,
tv-only 0`. Corpus sweep: warning tvOnly 26 -> 21.

## Fix 2 - an untyped UDF param is "undetermined", not series (~238 FP fixes)

`withSeriesParams` marked an unqualified param series via
`!/\b(simple|const|input)\b/.test(t)`, which is `true` for an UNTYPED param
(`t === ""`). So inside `ma(source, length, MAtype) => switch MAtype => ta.sma
/ema/...` (the dominant MA-selector idiom) the discriminant looked series and we
emitted 6 FP warnings per such function - ~249 across the corpus on TV-clean
files. INV018 had probed a TYPED param (`int direction`) and correctly found it
series; the untyped case is different.

Probes (`pine-lint --tv`, 2026-06-25):

| probe script (switch over the param, ta.* in arms) | TV |
|---|---|
| `f(x) => switch x` ... called `f(bar_index)` (SERIES arg) | 0 errors, **0 warnings** - `x` typed `undetermined type` |
| `f(x) => switch x` ... called `f(input.int(1))` | 0 errors, **0 warnings** |
| `f(int x) => switch x` ... called `f(1)` | 0 errors, **2 warnings** (CW10004 on both arms) |

So TV treats a bare UNTYPED param as `undetermined type` and is silent on
conditionals gated by it even when the call site passes a series argument
(call-site insensitive for the undetermined case); a TYPED unqualified param
(`int x` -> `series int`) does warn. Fix: only mark a param series when it
carries a type annotation (`t !== ""`) lacking simple/const/input. This drops no
real catches (TV never warns on the untyped form). Result: the MA-selector
carrier `0067d92d` goes `warnings local 6 / tv 0` -> `local 0 / tv 0`;
consistency FPs on TV-clean files 249 -> 11; total warning localOnly 1627 ->
1361.

## Verification

- Error channel: `regression-check.mjs` 0 new / 0 disappeared / 0 parse-delta
  (both fixes are warning-only). Full suite 376 pass.
- Regression fixture `regression/consistency-warning-param-and-arg.pine` pins:
  the McGinley `na(series) ? ta.*` warns; the untyped-param `switch` is silent;
  a typed `int` param still warns.
- Warning sweep: tvOnly 26 -> 24, localOnly 1627 -> 1361. The apparent +3 tvOnly
  vs the fix-1-only run is G005 line-doubling noise on `6874e636` (file is 1905
  lines; TV reports the warning at line 3075 = 2x via `\r\r\n`), not a real FN -
  we emit the same warning at the un-doubled line.

## Residual (pre-existing, NOT introduced here - all were FPs we already had)

11 consistency warnings remain local-only on TV-clean files, assorted causes:
- TYPED-param UDFs called only with non-series args (`f1b6bd45` `draw_lbl`,
  `47d21dbd` line 93) - genuine call-site sensitivity TV resolves by
  monomorphizing; our analysis is call-site insensitive. Matching needs
  arg-qualifier propagation into params, same blocker as TODO #9.
- `25a4a7fad123` `math.sum`, `1477fbefe1fb` `ta.atr`, `61a3a7b65bba`
  `ta.highest/lowest`, the `find_recent_value()` CW10002 cases - to be triaged.

The two block-scope state-variable FNs (`5881e014` `ta.crossunder/crossover`
inside `else if tradeState == 1`) are a separate untouched FN class: the `:=`-
reassigned int state var is not tracked as series. Left for a follow-up.
