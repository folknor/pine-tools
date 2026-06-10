# INV060 - v4/v5 numeric values in bool contexts are TV warnings, not errors

**Status: fixed 2026-06-10.** Surfaced twice the same day: INV057's
lateral finding (`c79500d4…`, a v5 fixture where TV warned at exactly the
six positions we errored) and again when INV059's inference fixes
resolved previously-unknown types on three more v5 fixtures, adding 4
fresh members to the same FP class.

## The disagreement

Our bool-context checks (if/while condition, ternary condition, `and`/
`or`/`not` operands) errored on numeric operands regardless of version.
Pine v4/v5 auto-coerce numbers in bool contexts (0/na -> false); v6
removed the coercion. TV compiles v5 scripts with float/int bool-context
operands and emits WARNINGS.

## Probe (`pine-lint --tv`, 2026-06-10)

`p01-v5-numeric-bool.pine` (this dir) exercises all five contexts on
`//@version=5`:

```pine
//@version=5
indicator("INV060 p01")
flt = close - open
x = flt ? 1 : 2
if flt
    x := 3
y = flt and close > open ? 1 : 0
z = not flt ? 1 : 0
i = 5
while i
    i := i - 1
plot(x + y + z + i)
```

TV verdict: **0 errors, 5 warnings**, one per context, each naming the
coerced parameter:

- `4:5  The 'expr0' parameter of the 'operator ?:' function accepts a 'bool' argument…`
- `5:4  The 'condition' parameter of the 'if' accepts a 'bool' argument…`
- `7:5  The 'expr0' parameter of the 'operator and' function accepts a 'bool' argument…`
- `8:9  The 'expr0' parameter of the 'operator not' function accepts a 'bool' argument…`
- `10:7 The 'condition' parameter of the 'while' accepts a 'bool' argument…`

(The same probe shapes on v6 are ERRORS - probed throughout INV041 and
the type-checker work; the v6 checks are correct and unchanged.)

## The fix

`boolContextOk(type, version)` in `checker.ts`: a value passes a bool
context when it is bool, unknown, or - on non-v6 sources only - numeric.
Applied at all six check sites (if, while, ternary condition, and/or
operands, not operand). String/color operands stay flagged on every
version (v5 does NOT coerce those). The `and`/`or` branch now returns
unconditionally - the per-operand check is complete for logical
operators, and falling through let the mixed-type compatibility fallback
flag v5's legal `bool and int` mix (373 would-be appearances caught by
the regression check before shipping).

## Result

**-1605 corpus error records across 226 files** (16845 -> 15240
baseline), all on v4/v5 fixtures - this was the single largest FP class
in the corpus, present since the bool checks were written. Canonical
verification: `c79500d4…` now lints 0 / TV 0 (TV's six coercion warnings
remain tv-only - the advisory channel we don't implement). Zero v6
behavior change (all INV041/bool regression fixtures pass unchanged).

## Residual

- TV's v5 coercion WARNINGS (the `accepts a 'bool' argument` advisories)
  are not implemented - they would be new warning-channel work, and
  warning parity is not currently a goal (TV emits no warnings at all on
  error-bearing files - G001).
