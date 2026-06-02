# INV005 - UDF parameter type was hardcoded `series<float>` regardless of annotation

**Status:** Fixed. `inferFunctionReturnType` honours each parameter's
type annotation; only untyped UDF params still default to `series<float>`.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV005-bool-param-and-or.pine`

## Summary

A user-defined function or method with a declared `bool` parameter,
when used with `and` / `or` / `not` / ternary-condition in the body,
reported

```
Operator 'and' requires bool operands, but left operand is series<float>
```

Minimal:

```pine
//@version=6
indicator("t")
f(bool a, bool b) =>
    a and b
plot(close)
```

Before: `errors: 1` (the message above). `pine-lint --tv`: `errors: 0`.
After: `errors: 0`.

## Root cause

`packages/core/src/analyzer/checker.ts`,
`inferFunctionReturnType()`. The method enters a *temporary* scope,
registers every UDF parameter as `series<float>`, walks the body to
work out a return type, then exits the scope. Two problems with the
hardcoded type:

1. The annotation on the parameter is ignored. A declared `bool a`
   ends up in the temporary symbol table as `series<float>`.
2. The `inferExpressionType` call run inside the temporary scope
   *caches* its results on the Expression AST nodes themselves
   (`this.expressionTypes` is a per-validate-run cache). So even
   after the temporary scope exits, the wrong types stick to the
   nodes. When the main validation pass runs `validateBinaryExpression`
   on `a and b`, it calls `inferExpressionType(a)` again, hits the
   cache, and reads `series<float>` - emitting the
   `Operator 'and' requires bool operands` error against the original
   declared `bool`.

The hardcoded type was labelled "Default assumption for UDF params"
in the source - useful for untyped functions, harmful when the user
actually wrote a type.

## Fix

Use the declared type when present; keep `series<float>` as the
fallback for untyped params.

```ts
const paramType: PineType = param.typeAnnotation
    ? mapToPineType(param.typeAnnotation.name)
    : "series<float>";
this.symbolTable.define({ name: param.name, type: paramType, /* … */ });
```

Inline `// see INV005` reference at the change site.

## Verification

- Minimal repro: 1 → 0 errors.
- Local regression-check on the corpus: 26 TV-silent disappearances
  (genuine false-positive removals), 0 TV-also-flagged disappearances
  (we did not stop catching anything TV catches), 2 newly-visible FPs
  in the same file from an *unrelated* name-shadowing bug - see below.
- 152/152 tests pass.

## Adjacent finding (not fixed here)

The 2 newly-visible FPs in
`6f664bb287e33ab6c73bbe2b4c459e32678e3e4aad5c821c170671c85ad7a0d4.pine`
at lines 132 and 147:

```
Type mismatch: cannot apply '-' to bool and int
```

Both lines are `Dx_ = n - right` inside a method body. The file
declares:

```pine
int n = bar_index            // line 61, top-level variable
method n(float v) => not na(v)   // line 93, method named n
```

When `n` is looked up at line 132 it finds the method's symbol with
`type: "bool"` (the method's return type, stored as if it were the
variable's type) and the binary expression reports
`bool - int`.

Two things would help here, both out of scope for INV005:

1. Methods and variables shouldn't occupy the same symbol-table slot - 
   `method n(...)` and `int n` are different namespaces in Pine, but
   we conflate them.
2. Whatever we *do* store for a method should not be its return type.
   A method symbol's "type" is the method signature itself, not what
   it returns.

Both are gated by a small symbol-table refactor; tracking as a
follow-up.

## Methodology notes captured

- A type-inference fix in the *only* per-validate-run cache is a
  high-leverage change: a single wrong write to the cache propagates
  to every downstream type check. When debugging type FPs, check
  whether `inferExpressionType` was invoked for the same expression
  in an earlier traversal with different scope.
