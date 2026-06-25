# INV105 - tuple-returning call bound to a single variable (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (VariableDeclaration).
**Source:** `../freedom/FINDINGS.md` F-038 - TV flags it; piners + local
pine-lint were silent.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
f() => [1, 2]
a = f()
plot(close)
```

`f` returns a tuple; binding it to one name is illegal (tuples must be
destructured). We were silent; TV rejects at the assignment.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

```json
{"code":"CE10092","ctx":{"name":"a"},"start":{"column":1,"line":4},
 "message":"Invalid assignment. Cannot assign a tuple to a variable \"{name}\"."}
```

(`success:true`. With a downstream use TV adds a CE10123, but the CE10092 at the
assignment is the primary and fires on its own.)

## Fix

In VariableDeclaration, when the init is a CallExpression to a USER function
whose recorded tuple-return shape has >= 2 elements, emit CE10092 anchored at
the declaration.

Restricted to UDFs (`udfTupleReturnTypes`): a UDF has one body hence one tuple
shape, so every call returns the tuple. Builtins are NOT checked here - some
(`ta.vwap`) have BOTH a scalar and a tuple overload, and the generic
`tupleInitElementTypes` reports the tuple shape even for the scalar call
`ta.vwap(hlc3)` (5 corpus FPs caught this in testing). Builtin tuple-to-scalar
needs arity-aware overload resolution - left for a follow-up.

**UPDATE (INV109, 2026-06-25):** the builtin follow-up is done. The single-var
check now routes through `tupleInitArity` (the same args-aware classifier the
destructure path uses, backed by `builtinCallTupleness`), so builtins are
covered and the `ta.vwap` scalar overload is correctly left alone. See
[INV109](../INV109-builtin-tuple-to-scalar/notes.md).

## Verification

- Regression fixture `regression/INV105-tuple-call-to-scalar.pine` (single-var
  flagged + a `[p, q] = f()` destructure and a scalar `g()` control, exactly 1
  error).
- `regression-check.mjs`: 0 new appearances (after the UDF-only restriction
  removed the 5 ta.vwap FPs). Full suite green.
