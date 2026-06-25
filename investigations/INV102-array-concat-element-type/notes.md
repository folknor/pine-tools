# INV102 - array.concat element-type mismatch not checked (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker-calls.ts` (concat element check).
**Source:** `../freedom/FINDINGS.md` F-042 - piners + local pine-lint both
miss it; TV flags it.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
a = array.new<int>()
b = array.new<string>()
c = array.concat(a, b)
plot(close)
```

`array.concat`'s two args (`id1`, `id2`, both `any array type`) must share an
element type. We were silent; TV rejects.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

Script: the snippet above. Raw TV ctx:

```json
{"code":"CE10123","ctx":{"argDisplayName":"id2","argUserFriendlyRepresentation":"b",
 "argumentType":"series string","currentTypeDocStr":"series int",
 "funId":"array.concat"},"start":{"column":21,"line":5}}
```

Reported at the ELEMENT level - "series string" used, "series int" expected.
(`success:true`.)

## Fix

For `array.concat` / `matrix.concat`, resolve both args' element types
(`collectionElementTarget`). When both resolve and id2's element is not
assignable to id1's (mutator rule: int->float widening OK, narrowing/base
mismatch rejected), emit CE10123 (`id2`, `series <id2-elem>` / `series
<id1-elem>`). Unresolved element types stay lenient. (matrix element extraction
isn't supported by `collectionElementTarget` yet, so matrix.concat is currently
inert - harmless.)

## Verification

- Regression fixture `regression/INV102-array-concat-element-type.pine`
  (int+string flagged + an int+int control, exactly 1 error).
- `regression-check.mjs`: 0 new appearances. Full suite green.
