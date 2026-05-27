# INV004 — `T[]` array-suffix never parsed in function / method parameters

**Status:** Fixed. `parseFunctionParams` recognises the `T[]` form, and
`mapToPineType` normalises it to `array<T>`.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV004-array-suffix-in-params.pine`

## Summary

Pine accepts two equivalent ways to declare an array parameter:

```pine
f(array<float> xs) =>   ...   // generic form (worked)
f(float[] xs) =>        ...   // suffix form (broken until INV004)
```

The suffix form never parsed. The qualifier loop in
`parseFunctionParams` only continued past a type-keyword when the next
token was IDENTIFIER, KEYWORD, or `<`. `LBRACKET` wasn't on the list,
so when the parser saw `float[]`, the loop broke without consuming
`float`, the fall-through then took `float` as the parameter *name*,
and `[` tripped `Unexpected token: ]` followed by
`Expected ")" after method parameters`. The body then ran with no
parameter symbols, so every reference like `array.size(xs)` read as
`Undefined variable 'xs'`.

`parseGenericTypeSuffix` already understood `T[]` for variable
declarations — the suffix form was just never wired into the
parameter parser.

## Repro

```pine
//@version=6
indicator("t")

f(float[] xs) =>
    array.size(xs)
```

Before fix:

```
errors: 2
  4:9 Unexpected token: ]
  5:16 Undefined variable 'xs'. Did you mean 'ask'?
```

`pine-lint --tv` on the same input: 0 errors.

After fix: 0 errors.

## Root cause

`packages/core/src/parser/parser.ts`, `parseFunctionParams()` —
specifically the continuation condition of the type-keyword loop.

## Fix

Two small changes:

1. Extended the qualifier-loop continuation to also accept LBRACKET as
   a follow-up token, so `float` (or any type keyword) gets consumed
   when followed by `[`.
2. Added an `if check(LBRACKET) → consume []` block after the
   generic-type and INV003 user-type checks. The `[]` is appended to
   the last collected type keyword.
3. In `packages/core/src/analyzer/builtins.ts:mapToPineType`, added a
   regex for `T[]` → `array<T>`, mirroring the existing `array<T>`
   case. Without this the type checker would see `float[]` and report
   `unknown`.

Inline `// see INV004` references at all three sites.

## Verification

- Minimal repro above: 2 → 0 errors.
- Full library fixture `6874e636…pine` (the canonical victim with 8
  `float[]` parameters in one method signature): total errors
  955 → 930. The cascade `Undefined variable 'block'` / `'blocks'` hits
  that surfaced after INV003 are now resolved.
- Combined INV002+INV003+INV004 on `fffe6a2f…pine` (the library that
  motivated this whole chain): 175 → 45 errors total, all cascade hits
  from the original three parser bugs eliminated.
- New regression fixture
  `packages/core/test/fixtures/regression/INV004-array-suffix-in-params.pine`
  asserts both `float[]` and `int[]` parameter forms across function
  and method declarations.
- 151/151 tests pass.

## Adjacent findings (not fixed here)

Once the parser stops bailing mid-signature, the bodies of these
methods finally run through validation. That surfaced 39 new
appearances in the regression check, broken down by template:

```
 10  Undefined variable 'X'. Did you mean 'Y'?
  8  Ternary branches must have compatible types. Got 'A' and 'B'
  6  Undefined variable 'X'
  5  Type mismatch: cannot apply '+'/'-' to float and type
  3  Type mismatch: cannot apply '==' to string and series<float>
  2  Unexpected token: ,
  2  Cannot assign array<series<float>> to array<bool>
  1  Operator 'and' requires bool operands, but right operand is float
  1  Cannot assign array<simple<string>> to array<string>
  1  Cannot assign array<int> to array<float>
```

None are caused by INV004 — every one of these is a downstream check
that previously couldn't run because the parser gave up early. They
are existing issues now visible:

- The `simple<string>` / `series<float>` / qualifier-stripping
  mismatches in `Cannot assign` are normalisation bugs in
  `isAssignable` for qualified collection element types.
- The `to float and type` patterns look like a separate inference bug
  where the `type` keyword leaks into type strings — worth a focused
  look.
- The bool-context issues (`Ternary branches`, `'and' requires bool`)
  fall under INV001 / task #9 (type-inference root causes).

No new TODO task was created for the umbrella here — each downstream
category has its own existing task; specific fixtures can be linked
from the task descriptions as they're worked.

## Methodology notes captured

- A parser fix in a high-traffic spot will *always* surface
  previously-masked downstream issues. Don't pattern-match them as
  regressions — read the messages and confirm they're not in the same
  category as the fix itself before counting them as new bugs.
- The "two equivalent forms" pattern (`T[]` vs `array<T>`,
  `simple T` vs `simple<T>`, etc.) is a Pine theme — every parser
  path that handles one is a candidate for missing the other.
