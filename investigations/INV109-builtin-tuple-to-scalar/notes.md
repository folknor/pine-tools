# INV109 - builtin tuple-returning call bound to a single variable (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (VariableDeclaration).
**Source:** `../freedom/FINDINGS.md` F-038 (builtin extension) / INV105 residual /
TODO #64.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
m = ta.macd(close, 12, 26, 9)   // returns [macdLine, signalLine, histLine]
plot(m)
```

A tuple-returning BUILTIN call bound to one name. INV105 fixed this for USER
functions but deliberately left builtins out: some builtins (`ta.vwap`) have BOTH
a scalar and a tuple overload, and the naive `tupleInitElementTypes` reported the
tuple shape even for the scalar call `ta.vwap(hlc3)` (5 corpus FPs).

## TV's verdict (probes, `pine-lint --tv`, 2026-06-25)

| probe | TV |
|---|---|
| `m = ta.macd(close, 12, 26, 9)` | CE10092 `Cannot assign a tuple to a variable "m"` at 3:1 (+ a downstream CE10123 on the use) |
| `a = ta.vwap(hlc3)` | `success`, no errors; `a : series float` (the SCALAR overload) |

So the always-tuple builtin must flag and the scalar overload of the mixed
builtin must not. (`success:true` both times; the macd run's non-empty error
list proves TV answered.)

## Fix

The arity-aware overload resolver INV105 said it needed already exists:
`builtinCallTupleness(name, positionalCount, namedArgs)` in `builtins.ts`, wired
through `tupleInitArity` (the same classifier the INV058 tuple-DESTRUCTURE path
uses). It resolves `ta.vwap`'s scalar-vs-tuple ambiguity by whether the call
supplies `stdev_mult` (the param that exists only in the tuple overload).

So the INV105 single-variable check was generalized: instead of consulting only
`udfTupleReturnTypes` for an Identifier callee, it now calls
`tupleInitArity(this, statement.init, version)` and emits CE10092 when
`kind === "tuple"`. This covers UDFs (unchanged), builtins (member-expression
callees like `ta.macd`/`ta.vwap`), `request.security`, and block expressions
returning tuples - all already handled by `tupleInitArity`. `ArrayExpression` is
excluded (a bare `a = [1, 2]` is the parser's CE10156).

## Verification

- Regression fixture `regression/INV109-builtin-tuple-to-scalar.pine`: `ta.macd`
  to a single var and `ta.vwap(..., stdev_mult)` to a single var both flagged;
  `ta.vwap(hlc3)` scalar control and the `[a, b, c] = ta.macd(...)` destructure
  control clean (exactly 2 errors).
- INV105's UDF fixture still green (the generalization preserves it).
- `regression-check.mjs`: 0 corpus changes (the arity resolver avoids the
  ta.vwap FPs INV105 saw). Full vitest suite green (372 tests with the new
  fixture).
