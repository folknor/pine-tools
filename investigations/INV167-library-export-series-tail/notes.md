# INV167 - a library export returning through a local read as non-series

Closes TODO #80, which existed for about an hour: the 2026-08-25 TV sweep read
**warning tv-only 1** where the 2026-08-15 sweep read 0.

## The finding

TV warns, we did not:

```
6874e636…pine:1538:11  The function "sma" should be called on each calculation
for consistency. It is recommended to extract the call from this scope
```

Confirmed by re-measurement (`scripts/compare-tv.mjs`, same day, two runs) - so
not a G001 flake. The site is a conditional call to an imported library member:

```pine
import robbatt/lib_no_delay/18 as ND
...
if na(volume)
    sma = ND.sma(close, 200)
```

`robbatt/lib_no_delay/18` is vendored, its export set is in `libraries.json`,
and INV118's machinery for CW10003-across-the-import-boundary was in place.
The export is plainly history-dependent - it calls `ta.sma`, carries a `var`,
and reads `bar_index`:

```pine
export sma(float source, simple int length) =>
	sma = ta.sma(source, length)
	var sum = source
	if bar_index+1 < length
		sum += source
		sma := sum / (bar_index+2)
	sma
```

## Root cause

INV118 flags only history-dependent exports that RETURN A SERIES - the gate
that exempts side-effect builders (`StatsData.update` returns `this` and draws
a table). Running the analyzer over the library showed `sma` as
`hist true / series FALSE`.

`tailIsSeries` reads the tail expression against `seriesVars`, which at collect
time holds nothing about the body's own locals. So the question it answered was
"is this tail EXPRESSION series", and a tail that is a local identifier is not.
Minimized:

| body tail | hist | series |
|---|---|---|
| `out = ta.sma(src, len)` then `out` | true | **false** |
| `ta.sma(src, len)` | true | true |

Two functions with identical behaviour, one of which returns its work through a
variable, classified differently. Nothing to do with the name collision in the
real carrier (`sma`'s local is also called `sma`) - a distinct name behaves the
same.

## Fix

`tailIsSeriesThroughLocals` walks the body collecting locals assigned a
series-ish expression, then evaluates the tail against that set. Both the walk
(`recordDerivedUntypedEffects`) and the predicate
(`isSeriesishExpressionWithLocalSeries`) already existed for
`tailDependsOnDerivedUntyped`; only the question asked at the tail differs.

`udfReturnsSeries` is consumed solely through its getter, by
`generate-libraries`, so the blast radius is exactly the derived
history-dependence sets - which is why the gate below is a warning-channel
sweep rather than the error baseline.

## Verification

`pnpm run generate:libraries` after the fix: **~160 exports added** to
`libraries-history-dependent.json` across the vendored set, and **none
removed** (the apparent removals in the diff are trailing-comma reflow).
`robbatt/lib_no_delay/18` goes from 5 history-dependent exports to 22.

Full TV sweep (`lint:failures`, 748 v6 fixtures, 2026-08-25, immediately after):

| | before | after |
|---|---|---|
| warning tv-only | 1 | **0** |
| warning local-only | 41 | **41** |
| errors local-only / tv-only | 29 / 0 | 29 / 0 |

The FN is gone and the widening produced **zero** new local-only warnings -
which is the result that matters, since widening what counts as
history-dependent is exactly how this area produces false positives (the
INV120 reverts). 472 tests passing; `regression-check.mjs` 0 changed fixtures.

## What this says about the class

Worth remembering rather than re-deriving: the library-export gates are
derived by running our own analyzer over vendored source, so **any
under-detection in the analyzer silently narrows a gate**, and the corpus will
not tell you - it shows up only as a tv-only warning on a script that both
imports the library and calls the export conditionally. This one needed a
vendored library, a conditional call site, and a TV sweep to surface at all.
