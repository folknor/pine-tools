# INV097 - duplicate UDT field not flagged (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker-udt.ts`
(`checkDuplicateUdtFields`), wired in `checker.ts` TypeDeclaration dispatch.
**Source:** `../freedom/FINDINGS.md` L-004 - local `pine-lint` LSP false
negative (piners + TV both flag it; the LSP was silent).

## Symptom (false negative)

```pine
//@version=6
type T
    int x = 1
    int x = 2
t = T.new()
plot(t.x)
```

Two fields named `x` in one `type` declaration. We were silent; TV rejects.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

Script: the snippet above. Raw TV output:

```json
{"code":"CE10186","ctx":{"fieldName":"x"},
 "end":{"column":13,"line":4},"start":{"column":5,"line":4},
 "message":"Duplicated field: '{fieldName}'."}
```

(`success:true`; TV also lists the type `T` with a single `x` field, confirming
it reached the type checker, not a parse fallback.)

## Fix

`checkDuplicateUdtFields` walks `statement.fields`, tracks seen names in a Set,
and emits CE10186 (`Duplicated field: '{fieldName}'.`) at the second
occurrence. v6 only (G004). The first field's type wins, matching TV.

## Verification

- Regression fixture `regression/INV097-duplicate-udt-field.pine` (dup `x` +
  a distinct `y` control, exactly 1 error).
- `regression-check.mjs` over 1879 corpus fixtures: 0 new appearances,
  0 disappearances. Full suite green.
