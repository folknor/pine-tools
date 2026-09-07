# INV175 - float VARIABLE / expression in an int param slot (false negative)

**Date:** 2026-09-07
**Status:** fixed (the INV107 residual)
**Code:** `packages/core/src/analyzer/checker-calls.ts` - the INV107 float-in-int-slot
check, widened from literals to any float-typed argument.
**Source:** `../strategies/VALIDATOR-FINDINGS.md` LNT-11 - "a `series float` passed
as a `length` is accepted almost everywhere". Found the same way as INV174:
piners refused a probe that linted clean here, and TV agreed with piners.
**Fixture:** `packages/core/test/fixtures/regression/INV175-float-variable-int-param.pine`

## Symptom (false negative)

```pine
//@version=6
indicator("t")
float a = ta.highest(high, close)   // TV: "series float" used, "simple int" expected
float c = ta.sma(close, close)      // TV: "series float" used, "series int" expected
```

We were clean. The finding lists 17 `ta.*` functions where a float `length`
slipped through and 4 (`ta.ema`, `ta.rsi`, `ta.atr`, `ta.rma`) where it was
caught - and the 4 were caught by ACCIDENT: their `length` is `simple int`, so
INV088's qualifier pass rejected the SERIES-ness of `close`, not its
float-ness. A `float lenF = 14.0` into `ta.ema` would have passed.

## Root cause

`isAssignable` treats int and float as interchangeable in both directions,
so the main argument loop accepts a float in an int slot. INV107 added a
dedicated CE10123 for that but scoped it to a float LITERAL, leaving "a float
VARIABLE (not literal) in an int slot is not flagged ... widening the check is
a follow-up" as its residual. This is that follow-up, and a real authoring
mistake rather than a contrived one: a length derived from an ATR multiple, a
ratio, or a swept float input, minus the `int()` cast.

## TV probes (`probes/`, `pine-lint --tv` via `scripts/lint-batch.mjs --diff`, 2026-09-07)

| probe | call | TV |
|---|---|---|
| p01 | `ta.sma(close, close)` | 3:25 `Cannot call "ta.sma" with argument "length"="close". An argument of "series float" type was used but a "series int"  is expected.` |
| p02 | `ta.highest(high, close)` | 3:28 same shape, `"simple int"  is expected` |
| p03 | `float lenF = 14.0` / `ta.sma(close, lenF)` | 5:19 `An argument of "const float" type was used but a "series int"  is expected.` |
| p03 | `simple float lenS = input.float(10.0) * 2` / `ta.sma(close, lenS)` | 6:19 `"simple float"` used |
| p03 | `ta.sma(close, close * 2)` | 7:19 `"length"="call "operator *" (series float)"`, `"series float"` used |
| p04 (control) | `int lenI = 14` / `l = ta.barssince(...)` / `ta.sma(close, lenI)`, `ta.sma(close, l)`, `ta.sma(close, int(close))`, `ta.sma(close, math.round(close))`, `ta.highest(high, 5)` | clean |

So TV rejects a float under EVERY qualifier - const, simple and series alike -
and the message names the argument's real qualifier. All erroring probes were
local-clean before the fix (tv-only), so the calls reached TV.

## Fix

The INV107 check now fires on any argument whose inferred base is float, not
only a Literal node. Two guards keep it to one report and no FPs:

- **Positional slots on real-overload functions** are checked only when EVERY
  overload that has that slot types it int. `ta.highest` is `(length)` and
  `(source, length)`: slot 1 is int in both, so `ta.highest(high, close)` is
  caught; slot 0 is source-or-length and stays skipped. Named arguments are
  always checked.
- **A series argument into a `const` / `simple` / `input` slot is left to the
  qualifier passes** - INV088 for `simple`, INV014's `checkConstArgs` for
  `const`/`input` - which already emit the identical CE10123 wording. Without
  this, the INV124 probe-C fixture (`input.int(defval = f())`, `f` returning
  series float) reported twice.

## Verification

- Probes after the fix: p01 and p04 no disagreement; p02 and p03 same
  position, same wording apart from the qualifier nouns below.
- Regression fixture: 3 errors (`lenF`, `close`, and the overloaded
  `ta.highest` positional), 3 int controls clean.
- `regression-check.mjs` over 1879 fixtures: zero appearances from this
  change. The corpus carries no float-into-int-slot misuse, which is also why
  LNT-11 could not have come out of a corpus differential.
- Full suite green (482).

## Residual

- **The argument's qualifier noun for a bare user variable.** TV renders
  `const float` for `float lenF = 14.0` and `simple float` for an input
  product; we render `series float` for both. Symbol types are stored
  unqualified and the provenance channel returns nothing for a bare scalar
  user variable, so the initializer's qualifier is not recoverable at the
  call site. The error, position and the rest of the wording match.
- **`ta.highest`'s expected-type noun.** TV says `simple int` is expected for
  its `length`; our data says `series int` in both overloads, so we quote
  that. The reference page is what the scrape reads and it disagrees with the
  compiler here - the G002 shape. A future noun probe like INV171's (which
  covers only union parameters) would settle it per function; do not patch the
  data by hand.
