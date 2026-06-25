# INV093 - field access on a non-UDT (scalar) not caught (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` - `checkUdtFieldAccess`
extended with a scalar-receiver branch; shared `emitNoField` helper.
**Source:** `../freedom/FINDINGS.md` F-034 - local `pine-lint` LSP false
negative (piners + `--tv` both flag it; we were clean).

## Symptom (false negative)

```pine
//@version=6
indicator("s")
y = close.foo   // TV: CE10198 "Object has no field foo". We were silent.
plot(y)
```

## TV's model (probe, `pine-lint --tv`, 2026-06-25)

`close.foo` -> CE10198 @ 3:5 (`ctx.fieldName = "foo"`), "Object has no field
foo". A scalar (int/float/bool/string/color) has no fields, so any member read
is this error. Namespace members (`color.red`, `math.pi`) and UDT field reads
(`pt.x`) stay clean.

## Why it passed

`checkUdtFieldAccess` only fired when the receiver resolved to a UDT in
`udtFieldTypes`; for a scalar receiver `resolveUdtExpressionType` returns null
and it bailed. (The CE10198 message/code was already correct for the UDT case.)

## Fix (checker)

When the receiver is not a UDT, and the member object is a plain IDENTIFIER
whose inferred base type is a scalar (int/float/bool/string/color), emit
CE10198. Guards:
- Restricted to an Identifier receiver. Inferring a deep-namespace member
  object (`strategy.commission`) as a type has a SIDE EFFECT - inference itself
  emits that path's own "Undeclared identifier" - which raised 286 spurious
  corpus errors in the first cut. A scalar sub-expression receiver
  (`(a + b).foo`) is vanishingly rare, so Identifier-only is the safe scope.
- Skip namespace/type/enum identifier names (`color`, `int`, a UDT name, an
  enum name, an imported namespace) - those are not scalar VALUES.

## Verification

- Probe `close.foo` matches TV (3:5, message). Controls clean: `color.red`,
  `math.pi`, `ta.sma(...)`, UDT field `pt.x`.
- Regression fixture `regression/field-on-non-udt.pine`.
- `regression-check.mjs` over 1879 corpus fixtures: **0** new appearances after
  the Identifier-only restriction (the first cut's 286 deep-namespace
  "Undeclared identifier" side-effects are gone). Full suite: 356 pass.

## Residual

- Only Identifier scalar receivers; `arr.foo` (bare, non-call, on a collection)
  and scalar sub-expression receivers are left lenient.
