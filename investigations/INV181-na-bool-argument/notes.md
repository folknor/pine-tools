# INV181 - `na()` accepted a bool argument

Source: finding 11 of `../strategies/PINE-LINT-BUGS.md`. Direction: local misses
an error TradingView raises.

## Repro

`repro.pine`:

```pine
//@version=6
indicator("t")
bool gt = close > open
plot(na(gt) ? 1 : 2)
```

| Validator | Verdict (2026-09-09) |
|---|---|
| `pine-lint -H` | clean |
| `pine-lint -H --tv` | `4:9: error: Cannot call "na" with argument "x"="gt". An argument of "series bool" type was used but a "simple float"  is expected.` |

(The doubled space before `is expected` is TV's own rendering, reproduced by our
CE10123 template.)

## Cause

The catalog is correct and always was - neither overload of `na` accepts a bool:

```
1. (x: simple int/float) -> simple bool
2. (x: series int/float/color/string/label/line/box/table/linefill/polyline/array<>/matrix<>/map<>) -> series bool
```

Two layers each declined to act on that, for different reasons:

1. `checkUnionArgs` (INV016) skips positional args on overloaded functions, and
   `na`'s MERGED parameter is typed `unknown` - which is precisely what
   `hasOverloads` keys on. So there was no merged union to read.
2. `checkOverloadResolvedArgs` (INV110), which exists to cover exactly that
   case, scored overload 2 as **neutral**. Its `classify` treated a scalar
   union (`int/float`) as decidable but a MIXED union - scalars alongside
   containers and drawing IDs - as "cannot tell". Overload 2 therefore came
   back with zero mismatches, was selected as the best fit, and a best fit with
   no mismatches means the call is clean.

So the check that was supposed to be the safety net for unknown-typed merged
params had a hole shaped exactly like `na`.

## Fix

Three changes, all inside `checkOverloadResolvedArgs`:

- **A mixed union is decidable for a scalar argument.** A `series bool` cannot
  be a label or an array, so only the union's SCALAR members can accept it. If
  none does, that is a mismatch, not a shrug. A NON-scalar argument stays
  neutral - the container members are the ones we still cannot reason about.
- **A tie in which every candidate mismatches now reports.** The tie rule
  exists so we never name a parameter from an overload the call did not mean.
  That concern does not apply when the call is wrong under all of them: the
  only open question is wording, and TV words it after the first overload.
  Both `na` overloads reject a bool, so this is the case that unlocks it.
- **A union parameter quotes its probe-measured noun.** TV says
  `simple float`, which is neither `na`'s doc type nor the union's first
  member (`simple int`). That noun is INV171 data and had to be measured.

An earlier attempt put the check in `checkUnionArgs` instead, deriving a
cross-overload union there. It was reverted: without overload context it named
the parameter `"1"` instead of `"x1"` on `line.new`, and it double-fired
against INV110 on every case INV110 already covered. The resolver is the right
home.

### The noun had to be measured, and the probe had to be widened to see it

`scripts/probe-param-type-nouns.mjs` selected its targets by asking
`scalarUnionMembers(p.type)` of the MERGED parameter - so a parameter typed
`unknown`, which is every overloaded function's, was invisible to it. The
census now also derives members from the OVERLOADS, mirroring what the checker
does. That took the census from 201 union parameters to 381, and the `--retry`
sweep measured 353 of them: 56 agreed with the old `simple <first member>`
fabrication, 297 did not.

`na`'s `x` came back `simple float`, and our message is now byte-identical to
TV's.

## Verification

- `pnpm test`: 488 pass.
- `node scripts/regression-check.mjs`: 0 changed fixtures over 1879, including
  the 297 changed nouns.
- Regression fixture:
  `packages/core/test/fixtures/regression/INV181-na-bool-argument.pine`, with
  `na(close[1])` as the control that must stay clean.
