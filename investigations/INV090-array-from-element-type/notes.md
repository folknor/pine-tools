# INV090 - array.from element-type consistency not checked (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` - `CE10122_TEMPLATE`, module
helpers `arrayFromExpectedType` / `arrayFromArgMatches`, and the array.from
pass inside the variadic branch of `validateCallExpression`.
**Source:** `../freedom/FINDINGS.md` D-005 - differential testing of
`piners validate`. piners AND our LSP were both silent; only `--tv` flagged it.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
a = array.from(1, "two", 3.0)   // TV: CE10122. We (and piners) were silent.
```

## Why it passed

`array.from` is variadic; the variadic branch of `validateCallExpression`
checks only the minimum arg count and then returns, so the element args were
never type-checked.

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

`array.from` is the variadic same-element constructor (12 overloads, one per
element type - `po lookup array.from`). arg0 fixes the element type; every later
arg must match it, and numerics unify (int + float -> array<float>). TV reports
the FIRST incompatible arg as **CE10122** (note: not CE10123) with
`argDisplayName = "arg_<i>"` (0-based) and `expectedType` derived from arg0:

| probe | TV |
|---|---|
| `array.from(1, "two", 3.0)` | CE10122 @ 3:19 - arg_1="two", literal string, expected `series int/float` |
| `array.from("a", "b", 1)` | CE10122 @ 3:26 - arg_2=1, literal int, expected `series string` (skips compatible "b") |
| `array.from(true, 1)` | CE10122 @ 3:22 - arg_1=1, literal int, expected `series bool` |
| `array.from(1, 2.0)` | clean - numerics unify, result `array<float>` |

The CE10122 template differs from CE10123: `... but one from "{expectedType}"
is expected` (note "one from", and no trailing period).

## Fix (checker)

In the variadic branch (v6 only, G004), for `array.from`: derive the element
type from arg0's base (`arrayFromExpectedType` - numerics -> `series int/float`,
else `series <base>`; UDT/enum/na/unknown -> lenient). Walk the remaining args;
the first that fails `arrayFromArgMatches` (numeric slot accepts int/float; else
exact base match; na/unknown lenient) emits CE10122 at that arg, then stop -
matching TV's first-error reporting. Position + message EXACT vs TV.

## Verification

- 3 error probes (positions + messages exact vs TV) + 3 clean controls
  (numeric mix, all-string, series-float).
- Regression fixture `regression/array-from-element-type.pine`.
- `regression-check.mjs` over 1879 corpus fixtures: **0** new appearances, **0**
  disappearances (real array.from uses are element-consistent). Full suite:
  353 pass.

## Residual

- Only `array.from` is handled (the language's one variadic same-element
  constructor). Other variadic functions (math.max/min, str.format, ...) are
  not same-element and need no such check.
- arg0 itself is assumed to define the type (never the error), matching TV.
- A non-derivable arg0 (UDT, enum, na, unknown) leaves the whole call lenient.
