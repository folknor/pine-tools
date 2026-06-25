# INV115 - a `:=` reassignment under a series-gated branch makes its target series (CW10003 FN)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/parser/semanticAnalyzer.ts`
(`collectDeclarationsInStatement` - series-conditional context threaded through
the declaration-collection recursion; `AssignmentStatement` marks its target
series when assigned under a series-gated scope)
**Source:** the INV114 warning sweep residual - block-scope state-variable
CW10003 false negatives (`5881e014`, `b3a052e4`).

## Symptom (false negative)

```pine
//@version=6
indicator("s")
var int tradeState = 0
// ... longBreakout = ta.crossover(...) and ...   (series bool)
if tradeState == 0
    if longBreakout
        tradeState := 1            // const 1, but assigned under a SERIES if
else if tradeState == 1            // <- now a series condition
    longTrail := ...
    if ta.crossunder(close, longTrail)   // TV: CW10003. We were silent.
        tradeState := 0
```

`tradeState` is reassigned to const literals (0/1/-1) inside series-gated
branches, so its VALUE is per-bar-dependent -> series. The later `else if
tradeState == 1` is therefore a series condition, and the `ta.crossunder` call
inside executes conditionally. TV warns; we did not, because our seriesVars
collector only marked a `:=` target series when the assigned VALUE was itself
series (`isSeriesishExpression(value)`) - a const value never qualified.

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

| probe | TV |
|---|---|
| A: `var int state = 0` then UNCONDITIONAL `state := 1`, then `state == 1 ? ta.sma(...)` | 0 warnings - state stays const |
| B: `state = 0` then `if close > open` / `    state := 1`, then `state == 1 ? ta.sma(...)` | **1 warning** CW10004 on ta.sma |

So the gate is the **conditional scope**, not the `var` keyword and not the
const value: a reassignment performed under a series-gated branch makes the
target series; the same reassignment performed unconditionally does not.

## Fix

`collectDeclarationsInStatement` now carries an `inSeriesConditional` flag. The
shared child recursion sets it when descending into an `IfStatement` (consequent
AND alternate - so lowered `else if` chains inherit it) or `WhileStatement` with
a series condition; once set it stays set for nested scopes. An
`AssignmentStatement` to an Identifier marks its target series when the value is
series OR the flag is set. A `for`/`for-in` body is deterministic per bar, so it
does NOT induce series on a const reassignment (only a series value does).

The collection is a complete forward pre-pass, so by the time the analyze pass
evaluates `else if tradeState == 1`, `tradeState` is already in seriesVars
(forward references resolve; backward ones - rare - would need iteration).

## Verification

- Probes A/B reproduced locally: A silent, B warns at the ta.sma line - matches
  TV exactly.
- Carriers `5881e014` and `b3a052e4` now `compare-tv` with 0 consistency
  tv-only (the ta.crossunder/crossover warnings emit; the only local-only left
  on b3a052e4 is pre-existing "declared but never used" noise).
- Regression fixture `regression/conditional-reassign-series-state.pine`
  (series-gated reassign warns; unconditional const reassign control silent).
- Error channel: `regression-check.mjs` 0 new / 0 disappeared. Full suite 378.
- Warning sweep: tvOnly 24 -> 17 (7 FN fixes), localOnly 1361 -> 1312.
  Consistency FPs on TV-clean files UNCHANGED at 11 (same files/lines) - the fix
  adds series-marking only where TV's probe confirms it, so it introduced zero
  new false positives.

## Residual

The 11 consistency FPs on TV-clean files are untouched (different cause - typed-
param call-site sensitivity, etc.; see INV114 / TODO #61). Backward references
(a var used as a condition before its series-gated reassignment appears in source
order) are not handled - none in the corpus.
