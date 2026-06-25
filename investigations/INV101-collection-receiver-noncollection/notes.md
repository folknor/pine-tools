# INV101 - collection-accessor receiver not type-checked (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker-calls.ts` (receiver-type check).
**Source:** `../freedom/FINDINGS.md` L-005 - piners + TV flag it; local
pine-lint was silent.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
float x = 1.5
y = array.get(x, 0)
plot(y)
```

`array.get`'s receiver ("id") is typed `any array type`. mapToPineType
collapses that to `unknown` and the function reads as "overloaded" (unknown
param), so the generic positional loop never checked the receiver - a scalar
`x` slipped through. Same gap on `map.get` / `matrix.get` / every `array.*` /
`map.*` / `matrix.*` accessor.

## TV's verdict (probes, `pine-lint --tv`, 2026-06-25)

| probe | TV ctx |
|---|---|
| `array.get(x, 0)`, `x:float` | CE10123 funId `array.get`, id "x" const float, `array<type>` |
| `map.get(x, "k")`, `x:float` | CE10123 funId `map.get`, id "x", `map<type, type>` |
| `matrix.get(x, 0, 0)`, `x:float` | CE10123 funId `matrix.get`, id "x", `matrix<type>` |

(`success:true`.)

## Fix

For a param whose rawType is `any (array|map|matrix) type`, if the provided
receiver's base is a scalar primitive, emit CE10123 with the kind's doc type
(`array<type>` / `map<type, type>` / `matrix<type>`). Only the five scalar
primitives are flagged; `na` / UDT / unknown receivers stay lenient.

## Verification

- Regression fixture `regression/INV101-collection-receiver-noncollection.pine`
  (scalar receiver flagged + a real-array control, exactly 1 error).
- `regression-check.mjs`: 0 new appearances. Full suite green.
