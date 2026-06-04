# INV022 - and/or right operands are ALWAYS conditional (TODO #39)

**Status:** resolved 2026-06-04. The INV018 series-condition gate was
removed from and/or right operands (it stays on if/ternary/switch).
~57 tv-only CW10002 records in the 2026-06-04 inventory traced here;
the two heaviest fixtures now diff zero tv-only on warnings.

## Finding

INV018 probed the series-condition gate for `if` (probe 6) and
`switch` (probe 7) and extrapolated it to and/or right operands. The
corpus said otherwise: TV warns CW10002 on
`useSignalsBShort and ta.crossunder(...)` (`076a1244…pine` line 322)
where `useSignalsBShort` is a plain `input.bool(...)`, and on
`(not is_sess1) and ta.crossover(...)` (`93badd17…pine` TV line 1921)
where our gate could not prove the left operand series (tuple-declared
from a UDF call) - but the qualifier turned out to be irrelevant.

## Probes (`pine-lint --tv`, 2026-06-04)

```pine
//@version=6
indicator("x")
useA = input.bool(true)
x = useA and ta.crossover(close, open)
y = useA ? ta.rsi(close, 14) : 0.0
plot((x ? 1 : 0) + y)
```

- CW10002 on `ta.crossover` at 4:14-38 - the AND right operand warns
  under an INPUT left operand.
- `useA ? ta.rsi(...) : 0.0`: SILENT - the ternary gate stands.

```pine
//@version=6
indicator("x")
useA = input.bool(true)
x = useA or ta.crossover(close, open)
plot(x ? 1 : 0)
```

- CW10002 on `ta.crossover` at 4:13-37 - `or` behaves the same.

So TV models and/or lazy evaluation as conditional execution
unconditionally, while if/ternary/switch branches only count when the
governing condition is series-qualified (re-confirmed by the ternary
line above and INV018 probes 6-9).

## Changes

- `semanticAnalyzer.ts` `analyzeBinaryExpression`: and/or right
  operands now always enter conditional scope ("andor" kind); the
  `isSeriesishExpression(expr.left)` gate is gone.
- The INV018 regression fixture's `ok2 = useSmooth and
  ta.crossover(...)` line flipped from a pinned negative to a pinned
  positive (it was an extrapolation, never probed).
- The original #39 hypothesis ("the and/or scan doesn't descend into
  call arguments") was wrong - the walk always descended fine; the
  gate was the miss.
