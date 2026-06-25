# INV107 - float literal in an int param slot (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker-calls.ts` (narrowing check +
generic-constructor signature resolution).
**Source:** `../freedom/FINDINGS.md` F-054 - flagged as "probable shared gap,
part of the general isAssignable float->int narrowing leniency". Confirmed: it
is general, not array.new-specific.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
plot(ta.sma(close, 14.5))   // length is series int
a = array.new<int>(2.5, 0)  // size is series int
```

A float literal in a `series int` / `simple int` slot. We were silent; TV
rejects.

## TV's verdict (probes, `pine-lint --tv`, 2026-06-25)

| probe | TV ctx |
|---|---|
| `ta.sma(close, 14.5)` | CE10123 length, `literal float` / `series int` |
| `array.new<int>(2.5, 0)` | CE10123 size, `literal float` / `series int` |

(`success:true`.)

## Root cause + fix

Two issues, both fixed:

1. **Bidirectional narrowing.** `isAssignable` treats int<->float as
   interchangeable, so the main arg loop accepted a float in an int slot. Added
   a dedicated check: a float LITERAL in a cleanly int-typed param
   (`baseTypeName(param.type) === "int"`) is CE10123. Scoped to a LITERAL
   (never series, so no overlap with the INV088 simple-qualifier check; a float
   VARIABLE stays lenient as our inference there is shakier). Runs regardless of
   the overload/generic positional bypass; positional args skipped on real
   overloads (ambiguous slots).
2. **Generic constructors never validated.** `array.new<int>` etc. are keyed in
   the catalog WITH a template suffix (`array.new<type>`), but the call's callee
   is the bare `array.new`, so `functionSignatures.get(functionName)` missed and
   `validateFunctionArguments` never ran for them. Added a generic-base fallback
   (resolve the `functionName<...>` signature). All generic-constructor params
   are optional, so no spurious CE10165.

## Verification

- Regression fixture `regression/INV107-float-literal-int-param.pine` (ta.sma +
  array.new flagged + int-arg and int->float-widening controls, exactly 2
  errors).
- `regression-check.mjs`: 0 new appearances for BOTH the narrowing check and the
  generic-resolution change (the corpus has no float-literal-in-int-slot
  misuse, and generic-constructor calls all validate clean). Full suite green.

## Residual

- A float VARIABLE (not literal) in an int slot is not flagged - the literal
  scope is deliberate to avoid FPs from shaky variable type inference. TV
  rejects those too; widening the check is a follow-up.
