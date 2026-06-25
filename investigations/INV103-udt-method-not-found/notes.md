# INV103 - method-not-found on a UDT instance not flagged (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker-calls.ts` (UDT method-call branch
of the member-call CE10271 area).
**Source:** `../freedom/FINDINGS.md` F-045 - piners + TV flag it; local
pine-lint was silent (FINDINGS noted "warns", but the current binary is clean).
Complements [INV093] (field-not-found, the member-READ surface).

## Symptom (false negative)

```pine
//@version=6
indicator("s")
type A
    float v = 0.0
a = A.new(1.0)
a.foo()
plot(close)
```

`a : A`, and `A` has no field or method `foo`. We were silent; TV rejects.

## TV's verdict (probes, `pine-lint --tv`, 2026-06-25)

| probe | TV |
|---|---|
| `a.foo()` (no such member) | CE10271 `Could not find method or method reference 'a.foo'` |
| `a.dbl()` with `method dbl` declared AFTER | CE10271 - forward method refs are errors (so source-order is correct) |
| `a.copy()` (no user method) | CLEAN - every UDT instance has a built-in `.copy()` |

(`success:true`.)

## Fix

A new branch in the member-call CE10271 logic: when the callee is a single-dot
`a.foo`, `a` is a user var whose base type is a LOCAL UDT (`udtFieldTypes`),
`foo` is not a field of that UDT, not a declared user method/func
(`declaredFunctionNames`, source-ordered so forward refs are flagged - matching
TV), and not the built-in `copy`, emit CE10271. Gated on `parserClean` and
non-imported receiver; imported-library UDTs/methods stay lenient (we lack
their member surface).

## Verification

- Regression fixture `regression/INV103-udt-method-not-found.pine` (missing
  method flagged + a real user method, a field read, and `.copy()` all clean,
  exactly 1 error).
- `regression-check.mjs`: 0 new appearances after the `copy` exclusion (it
  removed the 2 corpus FPs on `bull_ob.copy()` / `bear_ob.copy()`, which use the
  built-in UDT copy). Full suite green.

## Residual

- Only LOCAL UDTs are checked. A two-level receiver (`a.field.foo()`) and
  imported-library UDT methods are left lenient.
