# INV117 - the remaining 9 CW10003/4 consistency FNs: root-cause map (3 families, all blocked)

**Date:** 2026-06-25
**Status:** Family 1's `ta.stdev` pair FIXED (UDF tuple-return series inference
shipped); the other 7 remain blocked on #9-class inference / library-body
analysis. Two further attempts (transitive method bare-name; user-global index)
were net-zero/negative and reverted - the criterion findings below are durable.
**Source:** the INV116 warning sweep left 9 consistency tv-only FNs. The user
asked whether they share a root cause - they do NOT.

After INV114-INV116 the easy method-call FNs are harvested. Each of the
remaining 9 was traced to its definition + call site. They split into three
families, none a quick win.

## The 9 (warning tv-only after INV116)

| file | fn | family |
|---|---|---|
| 6293fd71 | ta.stdev x2 | 1 (UDF tuple-return series) |
| 6293fd71 | getStandardTrueRange x2 | 1 + 3 |
| 6293fd71 | cust_series x2 | 2 (library) |
| b369d637 | scan | 2 (library) |
| db76cf79 | FindST | 2 (library) |
| 71fb0ec4 | getTrendLineScore | 3 (user-global index) |

## Family 1 - UDF tuple-return series inference (#9 blocker)

`6293fd71`: `ta.stdev` is called inside `if stClose > stOpen`, but we do not see
that condition as series because

```pine
getStandardOHLC() =>
    chart.is_standard ? [open, high, low, close] : request.security(..., [open, high, low, close])
[stOpen, stHigh, stLow, stClose] = getStandardOHLC()   // we leave these untyped
```

`getStandardOHLC` returns a 4-tuple of SERIES, but our `TupleDeclaration`
collection did not infer element types from a UDF return, so `stClose`/`stOpen`
never entered `seriesVars`. `ta.stdev` IS a builtin we already flag as
history-dependent - only the unrecognized series condition blocked it.

**FIXED** (a bounded slice of #9): the collect pass now records each UDF's
returned-tuple element series-ness (`tailTupleSeries` reads the body tail -
expression/return/expression-`if` - for a `[a, b, ...]` ArrayExpression and maps
each element through `isSeriesishExpression`), and a `[..] = f()` destructure
series-types its members from it. So `if stClose > stOpen` is now series and the
two `ta.stdev` calls warn. Pinned by `tuple-return-series-condition.pine`;
corpus: warning tvOnly 12 -> 10, **0** new local-only / FP, **0** error-channel
change. The same-file `getStandardTrueRange` is NOT fixed by this - it ALSO needs
Family 3 (its `stClose[1]` index must count), so it stays doubly-blocked.

## Family 2 - library-body history-dependence (no body available)

These are history-dependent via a call whose body we cannot analyze:
- `6293fd71` `cust_series` = `col.cust_series(...)`, library
  `jason5480/series_collection/4` - which IS vendored. So this one is attackable
  by a library-body history pass; and since INV117 Family 1 already makes its
  gate (`if stClose > stOpen`) series, the body-history pass is the ONLY
  remaining blocker. A real sub-project (extend `generate:libraries` to record a
  per-export history-dependence flag + checker import resolution).
- `b369d637` `scan` is history-dependent via `zigzag.calculate()`, `zigzag` a
  `zg.Zigzag` from `Trendoscope/ZigzagLite/3`. **PERMANENTLY BLOCKED**:
  Trendoscope libs are CC-BY-NC, on the deliberate license-exclusion list (TODO
  #41/#53, 7 CC-BY-NC Trendoscope libs), so the source cannot be vendored. No
  engineering resolves a missing-source-by-license constraint - this single FN
  makes "fix ALL 9" impossible.
- `db76cf79` `FindST` is fully LOCAL (no imports; `helper` is a local `Helper`
  UDT, `MS` a local `MarketStructure`). But its leaves do not trip our criterion
  OR the probes: `SkipEQHigh` only indexes the BUILTIN `high[i]` (silent per
  probe), `MS.Add` only mutates arrays (`MS.ST.unshift`, silent per probe). TV
  warns `FindST` for a reason neither our model nor isolated probes reproduce -
  criterion still unknown.

## Family 3 - indexing a USER-defined global series var (criterion correction)

NEW probed criterion (`pine-lint --tv`, 2026-06-25), correcting INV018 p4:

| probe | TV |
|---|---|
| `f() => close[1]` (BUILTIN global), called conditionally | silent |
| `f() => close[someVar]` (builtin, dynamic offset) | silent |
| `g = close + 1` / `f() => g[1]` (USER global series var) | **warns** |

So INV018's "indexing a global does not count" is too broad: indexing a BUILTIN
global is consistent (silent), but indexing a USER-defined global SERIES var
DOES count. `getTrendLineScore` indexes `highSource` (`= high`, a user global)
and `getStandardTrueRange` indexes `stClose` (user global) - both warn for this
reason.

### Why the fix is blocked anyway

The one-line fix (count `[]` on `seriesVars` members, which excludes builtins -
they are never added to `seriesVars`) DOES fix `getTrendLineScore` (probe-exact),
but the corpus measured **-1 FN / +4 FP**: it makes `updateTrendLine`
history-dependent (it calls `getTrendLineScore`), and `updateTrendLine` is called
under `if d != lastD and array.size(zigzagpivots) >= 6`, which we wrongly treat
as series. `zigzagpivots` is an UNTYPED param (undetermined, INV114), so
`array.size(zigzagpivots)` should be undetermined, not series - but
`array.size(realArray)` IS series-conditional (probed: TV warns), so we cannot
just drop `array.size`. Correctly distinguishing them is untyped-param qualifier
propagation through builtins = the same #9 / INV114-deep work. Reverted.

`getStandardTrueRange` needs BOTH Family-1 (so `stClose > stOpen` is series) AND
Family-3 (so `stClose[1]` counts) - doubly blocked.

## Conclusion

Not one root cause - three, each blocked: #9 UDF/qualifier inference (Family 1,
the Family-3 cascade, the doubly-blocked getStandardTrueRange), and library-body
analysis (Family 2). The durable output of this investigation is the Family-3
criterion correction (record it before reusing INV018 p4) and this map, so the
next attempt starts from "which inference unblocks which FN" rather than
re-probing. No code shipped - both attempts (transitive method bare-name; the
user-global index rule) were net-zero or net-negative and reverted.
