# INV010 - destructured UDF tuple elements defaulted to `series<float>`

**Status:** Fixed. The checker now captures the per-element types of
a UDF's tuple-return expression at validate time, and
`inferTupleElementTypes` consults that map for any UDF call.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV010-udf-tuple-destructure.pine`

## Summary

```pine
f() =>
    bool a = true
    int b = 5
    [a, b]

[x, y] = f()
z = x and y > 0     // ← "Operator 'and' requires bool operands,
                    //    but left operand is series<float>"
```

The function `f` returns a 2-tuple `[bool, int]`. Our linter typed
both destructured variables as `series<float>` because
`inferTupleElementTypes` only handled `request.security` calls - every
other tuple-returning call (including user-defined functions and
methods) fell through to `defineTupleVariables`, which defaults
unknown element types to `series<float>`.

The fallout was a class of false positives anywhere a script's UDF
returns a tuple and the caller used a destructured element in a
bool / int / color / string context:

- `x and y`, `cond ? x : y` - INV001 / bool-context FPs
- `x + something_int` when x is actually bool - `cannot apply '+'`
  FPs
- `array.push(arr, x)` when arr is `array<bool>` and x is the
  destructured-bool - assignment / argument FPs

## Root cause

`inferTupleElementTypes` short-circuits on every call except
`request.security`, then returns an empty `elementTypes` array.
`defineTupleVariables` consequently fills each declared name with the
fallback `series<float>` regardless of what the function actually
returns. The checker's `udfSymbol.type` stores only the scalar return
type (last expression's overall type), so by the time the destructure
is validated, we have no per-element data.

## Fix

In `validateStatement` for `FunctionDeclaration` and
`MethodDeclaration`, after computing the function's overall
`returnType`, also call a new
`inferUdfTupleReturnTypes(body, version, params)` that:

1. Looks at the body's last statement (`ExpressionStatement` or
   `ReturnStatement`).
2. If its expression is an `ArrayExpression` - i.e. the function
   returns a tuple literal - re-enters a temporary scope mirroring
   `inferFunctionReturnType`'s setup (params with declared types,
   plus `collectDeclarations` of the body) and infers each tuple
   element's type via `inferExpressionType`.
3. Returns the resulting `PineType[]` (or `undefined` for non-tuple
   bodies).

When the function returns a tuple, the per-element type list is
stored in a new per-validation-run `Map<string, PineType[]>` keyed
by the function name (`udfTupleReturnTypes`). The map is cleared at
the start of each `validate()` call alongside `expressionTypes`.

`inferTupleElementTypes` consults the new map when its call-site is
a UDF: if `elementTypes` is still empty after the
`request.security` branch, look up the function name in
`udfTupleReturnTypes` and copy its entries in.

`// see INV010` references at each change site.

## Verification

- Minimal repro (notes.md): 1 → 0 errors.
- Real fixture
  `fixtures/00a1c14fe60004ec4b43ef7416f6059de4d7ef55b7b3465ccc70f71271c96a62.pine`
  (the canonical example, `updatePOIsWithLTF` returning an 11-tuple):
  88 → 0 errors. All the cascading `series<float>` and-operand /
  ternary-condition / assignment FPs vanish.
- Corpus-wide local-only count: 5528 → 5269 (−259 FPs, no TV-only
  changes).
- Regression check: 0 TV-also-flagged disappearances (we did not
  stop catching anything TV catches). 16 new appearances are
  previously-masked findings now reachable because the destructured
  types are correct.
- 156/156 tests pass. New regression fixture
  `packages/core/test/fixtures/regression/INV010-udf-tuple-destructure.pine`
  asserts a basic bool/int destructure and a method-returning tuple.

## Adjacent findings (not fixed here)

Some of the 16 new appearances are real over-strict-checker
findings now visible (e.g. `cannot apply '<=' to color and int` - 
real bugs in user code that TV is silent on, methodology says we're
more-correct-than-TV). Others are FPs from over-strict color
arithmetic that need their own investigation - out of scope for
INV010.

## Methodology notes captured

- A "tuple destructure default" is a high-leverage type-inference
  bug - one function returning a 10-element tuple silently mistypes
  10 variables, and any downstream use compounds. Look for
  `defineTuple…` or any code that fills unknown types in bulk when
  hunting `series<float>`-as-bool FPs.
- Storing per-validation-run inferred data in a side map keyed by
  symbol name is a lightweight alternative to extending the `Symbol`
  shape - clears cleanly with the existing `expressionTypes` map.
