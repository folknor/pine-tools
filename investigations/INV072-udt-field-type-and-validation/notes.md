# INV072 - UDT field type inference + field validation (FN classes)

**Date:** 2026-06-19
**Status:** OPEN (findings confirmed + TV-probed; fix is a sizable feature,
deferred)
**Area:** `packages/core/src/analyzer/checker.ts` (member-expression type
inference; a new UDT field registry)

## Symptom (three related false-negative classes)

We do not infer the type of a USER-TYPE field access, nor validate that a field
exists. So all misuse of UDT fields - and method/call chain results - slips
through. Probed `pine-lint --tv` 2026-06-19:

| probe | code | TV | us |
|---|---|---|---|
| p01 `o.x` (x: float) in `str.length(o.x)` | shallow field TYPE | CE10123 (series float vs string) | silent |
| p01 `o.nope` | undefined field | "Object has no field nope" | silent |
| p02 `o.inner.x` in `str.length(...)` | DEEP field type | CE10123 | silent |
| p03 `o.inner.nonexist` | deep undefined field | "Object has no field nonexist" | silent |
| p04 `arr.first()` in `str.length(...)` | method/call CHAIN return type | CE10123 | silent |

So even SHALLOW field access (`o.x`) is untyped - the gap is not about depth.

## Why deferred

The fix needs infrastructure we don't have:
1. A **UDT field registry**: each user `type` -> { fieldName -> declared type }.
   The parser already produces TypeDeclaration with typed fields; the checker
   tracks `declaredTypeNames` but not the field sets/types.
2. **Member-chain type inference** through fields: `o.inner.x` resolves
   left-to-right (o: Outer -> .inner: Inner -> .x: float), each step consulting
   the registry. Feeds the existing arg/operator checks (which then fire for
   free, as in INV070/INV071).
3. **Field-existence validation**: `o.field` where field is not in the type's
   registry -> a new "Object has no field <name>" error (a CE class we don't
   emit yet).
4. **Method/call chain return types**: `arr.first()` -> element type (needs the
   array element type, like INV071) and method-return resolution generally.

(1)+(2)+(3) are one coherent UDT-field feature; (4) is the method-return
slice (overlaps with #41 member-call work and INV071's element typing). Each is
bigger than a single INV - hence deferred rather than rushed.

## To resume

Build the UDT field registry first (parser already has the data), then wire
member-chain inference into `inferExpressionType`'s MemberExpression case so
field types flow into the existing checks (the INV070/INV071 pattern: once the
type is known, the catches come for free), and add the field-existence check.
FP-safety: only type/validate when the receiver resolves to a known user type;
unknown receivers stay lenient. Probes p01-p04 are the starting evidence.

## How it surfaced

The #52 fixture-coverage census flagged deep member/call chains (readChainDepth
3+ 1776 corpus / 4 tests; callChainDepth 3+ 4614 / 49) as under-tested. Probing
them for TV disagreement turned up this whole area - the same census pivot that
yielded INV070 and INV071.
