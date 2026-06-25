# INV098 - `for...in` over a non-iterable scalar not flagged (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (ForInStatement element-type
derivation).
**Source:** `../freedom/FINDINGS.md` F-047 - piners + local pine-lint both
miss it; TV flags it.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
s = 0.0
for x in close
    s := s + x
plot(s)
```

`close` is a `series float`, not iterable. We were silent; TV rejects.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

Script: the snippet above. Raw TV output:

```json
{"code":"CE10123","ctx":{"argDisplayName":"id",
 "argUserFriendlyRepresentation":"close","argumentType":"series float",
 "currentTypeDocStr":"array<type>","funId":"foreach","typePostfix":""},
 "start":{"column":10,"line":4},"end":{"column":14,"line":4},
 "message":"Cannot call \"{funId}\" with argument ..."}
```

TV models `for...in` as a `foreach` pseudo-function whose collection ("id") arg
must be `array<type>`. (`success:true`.)

## Fix

In the ForInStatement element-type derivation, when the collection is NOT an
array/map (the existing `elem` paths) and its base type is one of the five
scalar primitives, emit CE10123 with `funId="foreach"`, `argDisplayName="id"`,
`currentTypeDocStr="array<type>"`.

Gated to avoid FPs:
- Only the five scalar primitives. `matrix`/`array`/`map` are iterable;
  unknown / UDT collections stay lenient.
- Only a plain `Identifier`/`MemberExpression` collection. The history-reference
  `[]` operator (`arr[histId]`) PRESERVES the array type, but our element-type
  inference collapses `arr[n]` to the element scalar - so an IndexExpression
  collection would false-positive (caught on corpus fixture
  `6293fd71...`, `for [i, p] in longTakeProfitPrices[histId]`).

## Verification

- Regression fixture `regression/INV098-forin-non-iterable.pine` (scalar
  collection flagged + a real-array control, exactly 1 error).
- `regression-check.mjs`: 0 new appearances after the IndexExpression guard
  (the guard removed the 2 corpus FPs on `6293fd71...`). Full suite green.
