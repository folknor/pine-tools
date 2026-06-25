# INV118 - history-dependence of imported-library calls (CW10003 across the import boundary)

**Date:** 2026-06-25
**Status:** fixed - `cust_series` (x2) and `scan` now warn; 3 of the INV117 FN
tail closed.
**Code:** `packages/pipeline/src/generate-libraries.ts` (derive per-export
history-dependence), `packages/core/src/parser/semanticAnalyzer.ts` (alias /
library-typed-local resolution; transitive bare-method; detection-vs-display
name), `pine-data/v6/libraries.ts` + `library-history-dependent.json` (data),
`pine-data/raw/v6/library-history-overrides.json` (license-excluded facts).
**Source:** INV117 Family 2 (library-body history-dependence).

TV warns CW10003 when a conditionally-called function is history-dependent -
INCLUDING when that function lives in an imported library. We only had each
library's export NAME set (INV067), not whether an export is history-dependent,
so `col.cust_series(...)` and a method chain bottoming out in
`zigzag.calculate()` were false negatives.

## Deriving the fact (not redistributing the source)

`generate-libraries.ts` now runs the SemanticAnalyzer on each vendored library
body and records which EXPORTS are history-dependent, intersected with a
SERIES-RETURN gate: an export warns only if it both is history-dependent AND
returns a series. This exempts side-effect builders - `StatsData.update` calls
ta-ish helpers internally but returns `this` (mutates a table), and TV is silent
on it (it would have been a corpus FP without the gate). Emitted as
`LIBRARY_HISTORY_DEPENDENT_BY_PATH`.

For libraries whose SOURCE cannot be vendored (CC-BY-NC Trendoscope, etc.), the
fact is recorded in `pine-data/raw/v6/library-history-overrides.json` - derived
ONCE by live-fetching via `fetch:library`, running the same scan, and discarding
the source (`Trendoscope/ZigzagLite/3 -> ["calculate"]`). generate-libraries
merges the override. This keeps the linter correct without redistributing the
copyrighted source: only the API fact (which exports build a per-bar series) is
committed.

## Resolving the call site

`isHistoryDependentFunction` resolves a member call `recv.member` to a library:
- `recv` is an import alias (`col` -> jason5480/series_collection/4), or
- `recv` is a LIBRARY-TYPED local (`var zg.Zigzag zigzag` -> alias `zg`),
  collected by `collectLibraryTypedVars` from `<alias>.<Type>` annotations,
then checks the library's history-dependent set. The scan's transitive
bare-method lookup (`scanExpressionForHistoryDependence`) lets a UDF that CALLS a
history-dependent method become history-dependent itself, so the `scan ->
this.getZigzagAndPattern() -> zigzag.calculate()` chain propagates.

## Detection vs display name

TV's CW10003 names a library/method call by its BARE member (`cust_series`, not
`col.cust_series`). The check had re-run `isHistoryDependentFunction(displayName)`
to gate the warning - which fails once the name is bared (the receiver context
is gone), silently dropping the warning. Fixed by carrying a `histDep` boolean
separate from the display `functionName`.

## Verification

- `cust_series` (`6293fd71`) and `scan` (`b369d637`) `compare-tv` clean
  (consistency tv-only 0); warning sweep tvOnly 12 -> 7 (with INV117), 0 new
  local-only / FP (consistency-on-clean stayed 11), 0 error-channel change, 380
  tests. Pinned by `library-history-dependence.pine`.
- The override-backed `scan` fix was confirmed with the ZigzagLite SOURCE DELETED
  (the committed fact alone drives it).

## Residual (INV117 tail still open)

`getStandardTrueRange` (#9 tuple + user-global index), `getTrendLineScore`
(user-global index cascading into `array.size(untypedParam)` #9), and `FindST`
(criterion still unreproducible by probe) remain - see INV117.
