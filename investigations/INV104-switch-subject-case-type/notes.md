# INV104 - switch subject vs case type not checked (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (SwitchExpression handling).
**Source:** `../freedom/FINDINGS.md` F-040 (residual) - the switch-subject
case; piners + TV flag it, local pine-lint missed it (the other F-040 operand
gaps - `not`, unary `-`, `==` - were already covered).

## Symptom (false negative)

```pine
//@version=6
indicator("s")
x = switch close
    "a" => 1
    => 2
plot(x)
```

A switch WITH a subject desugars each case to `subject == case`. `close`
(series float) compared with the case `"a"` (string) is incomparable. We were
silent; TV rejects.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

Script: the snippet above. Raw TV ctx:

```json
{"code":"CE10123","ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":"a",
 "argumentType":"literal string","currentTypeDocStr":"series float",
 "funId":"operator =="},"start":{"column":5,"line":4}}
```

TV reports it as the `operator ==` CE10123, expr1 = the case value, expected =
the subject type. (`success:true`.)

## Fix

In the SwitchExpression handler, when there is a discriminant, each case
condition is checked against it with the SAME `TypeChecker.areTypesCompatible`
predicate the real `==` operator uses; an incompatible pair emits the CE10123
`operator ==` template via `addOperatorTypeError` (expr1, expected = the
subject's rendered type). Both sides must be concretely typed (unknown stays
lenient). v6 only (G004).

## Verification

- Regression fixture `regression/INV104-switch-subject-case-type.pine`
  (string case under a float subject flagged + an int subject/int cases control
  + a default arm, exactly 1 error).
- `regression-check.mjs`: 0 new appearances. Full suite green.
