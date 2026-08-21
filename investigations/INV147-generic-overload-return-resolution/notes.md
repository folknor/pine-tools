# INV147 - overload return resolution ignored generic types

Reported externally: `matrix.mult` typed every call as `array<int>`, making
the function unusable - every call site a false error.

```pine
//@version=6
indicator("r")
matrix<float> a = matrix.new<float>(2, 2, 1.0)
matrix<float> b = matrix.new<float>(2, 2, 2.0)
matrix<float> c = na
c := matrix.mult(a, b)
plot(matrix.get(c, 0, 0))
```

Before: `Cannot assign a value of the "array<int>" type to the "c" variable.`
TV on the same source, probed 2026-08-21: **clean**.

## Root cause

`resolveCallReturnRaw` (`builtins.ts`) does resolve overloads - the reporter's
"primary signature is used verbatim" theory was right about the symptom but
the mechanism is one level down, in the *candidate filter*.

`baseOfRawType` only strips the qualifier, so `matrix<float>` stays
`matrix<float>`. `baseCompatible` then compared that whole string against the
param's `matrix<int>` / `matrix<int/float>`, splitting unions with a naive
`.split("/")` that also shreds `matrix<int/float>` into `matrix<int` and
`float>`. Nothing ever matched. With zero candidates the function falls back
to the full view list:

```ts
const pool = candidates.length > 0 ? candidates : views;
let best = pool[0].returns;   // overload #0
```

`matrix.mult`'s overload #0 returns `array<int>`, which is exactly what came
out - including for the matrix-x-array form, where the right answer is
`array<float>`. That the element type was wrong too (the reporter's case C) is
the tell that no resolution was happening at all, rather than the wrong
overload being chosen.

`matrix.pow` was masked, as the reporter guessed: same failure, but its
overload #0 returns `matrix<float>`, which happens to be the common answer.

## Fix, part 1: structural generic comparison

`splitUnionMembers` splits on `/` only at angle-bracket depth 0. Generic
arguments now match a generic param by container plus element type.

Elements must match **exactly** (modulo union membership) - no int/float
widening inside a generic. Pine collections are invariant, and widening would
also have broken the fix: `matrix<float>` would then satisfy overload 3's
`matrix<int>` as well as overload 4's `matrix<int/float>`, and pool order
would hand back `matrix<int>`.

## Fix, part 2: specificity tie-break

Surfaced by part 1, but pre-existing and independently wrong:

```pine
array<int> i = array.new<int>(3, 1)
array<int> ai = array.abs(i)   // was: error, array<float> vs array<int>
```

`array.abs` is `(array<int/float>) -> array<float>` and
`(array<int>) -> array<int>`. An `array<int>` argument satisfies both, the
returns tie on qualifier rank (neither is qualified), and the loop kept
`pool[0]`. TV accepts the script (probed 2026-08-21), so `array<int>` is
correct.

Selection now breaks a qualifier tie by choosing the **narrowest** overload -
`typeWidth` counts the concrete alternatives a type admits, recursing through
generics, so `array<int>` (1) beats `array<int/float>` (2). Qualifier rank
still dominates, leaving the `timestamp()` const/simple behaviour the function
was originally written for untouched.

Note this second bug produced the same wrong answer before the change (no
candidates -> `pool[0]` -> `array<float>`), so part 1 did not introduce it;
it would merely have left it standing.

## Scope of the latent cases

`audit-generic-overloads.mjs` in this directory enumerates the functions that
could resolve wrongly - generic param types in `overloads[]` plus more than
one distinct overload return:

**34 of 475 functions.** `matrix.diff` and `matrix.sum` share `matrix.mult`'s
exact shape (overload #0 returns `matrix<int>`), so they were unmasked
instances of the same bug; the rest were masked either by overload #0 already
being the common answer (`matrix.pow`, `matrix.inv`, `matrix.kron`) or by
int/float coercion swallowing the difference at the assignment
(`array.sum` and the other `series float`/`series int` pairs).

## Verification

- TV, 2026-08-21: the repro above is clean; and
  `matrix<int> c = matrix.mult(mf, mf)` is rejected by TV with
  `Cannot assign a value of the "matrix<float>" type to the "c" variable.` -
  character-identical to what we now emit, confirming both the acceptance and
  the resolved type. (TV disagreed with our local result before the fix,
  proving the call reached TV rather than returning an empty/fallback result.)
- Corpus regression-check: exactly **one** fixture changed, and the change is
  one disappeared error -
  `fixtures/a8322a8f7a...pine:84`, `coefficients := matrix.mult(b, response)`,
  the same OLS closed form the reporter hit. No new errors anywhere.
- Regression fixture `regression/INV147-generic-overload-return.pine` covers
  matrix-x-matrix, matrix-x-scalar, matrix-x-array, the int variants,
  `matrix.sum`, the `array.abs` specificity case, and the genuine mismatch
  that must still error.

## Files touched

- `packages/core/src/analyzer/builtins.ts` - `splitUnionMembers`,
  generic-aware `baseCompatible`, `typeWidth`/`paramWidth` specificity
  tie-break in `resolveCallReturnRaw`
- `packages/core/test/fixtures/regression/INV147-generic-overload-return.pine`
- `investigations/INV147-generic-overload-return-resolution/audit-generic-overloads.mjs`
