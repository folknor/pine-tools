# INV071 - for-in loop variable element-type inference (CE10123 FN class)

**Date:** 2026-06-19
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (ForStatement/ForInStatement
case - iterator typing)

## Symptom (false negative)

The for-in loop ELEMENT variable was typed `"unknown"`, so every type check on
it was suppressed - any misuse of a loop variable slipped through:

```pine
//@version=6
arr = array.from(1.0, 2.0)
for v in arr
    x = str.length(v)   // v is series float; TV: CE10123. We were silent.
```

Both the single form (`for v in`) and the value of the tuple form
(`for [i, v] in`) were affected.

## How it surfaced

The #52 fixture-coverage census flagged for-in (forInSingle 262 corpus / 3
tests; forInTuple 138 / 2) as heavily under-tested. Probing loop-variable
misuse for TV disagreement turned up the whole class.

## TV's behavior (probes, `pine-lint --tv`, 2026-06-19)

The loop variable has type `series <element>`:

| probe | loop | misuse | TV |
|---|---|---|---|
| p01 | `for v in array<float>` | `str.length(v)` | CE10123 (series float vs string) |
| p02 | `for [i,v] in array<float>` | `str.length(v)` | CE10123 |
| p03 | `for s in array<string>` | `n + s` (n float) | operator-+ type error |
| p04 | `for [i,v] in array<string>` | `i + v` | operator-+ type error at v |

## Fix

In the for-in case, derive the element type from the collection:
`inferExpressionType(collection)` -> strip qualifier -> match `array<E>` (or
`map<K,V>` value side) -> type the element variable `series<E>` (canonical
BRACKET form - `isNumericType` etc. only recognise `series<float>`, not the
space form `series float`; the space form caused 43 FPs in the first attempt,
`series float * series float` read as non-numeric). The tuple INDEX stays
`int` and the counted-loop iterator stays `int`. Non-derivable element types
(matrix, unknown element, non-collection) keep `"unknown"` - lenient as before,
so no new FP surface beyond genuine element-typed misuse.

## Verification

- 4 probes under `probes/`. We now CATCH all four; the str.* cases match TV's
  CE10123 position + message; the operator cases catch at our usual binary-op
  anchor/wording (a pre-existing difference from TV's "operator +" CE10123,
  not introduced here).
- 2 regression fixtures: `regression/INV071-forin-loop-var-element-type`
  (single + tuple value misuse flagged), `regression/INV071-forin-no-false-
  positive` (series-float in numeric ops, series-string in str.*/concat, tuple
  index as int - local == TV clean).
- `regression-check.mjs`: 0 changes over 1879 fixtures (after the bracket-form
  fix; the corpus's many correct for-in loops are unaffected). Full suite: 334
  pass.

## Residual

- Tuple INDEX / map KEY typing left as `int` (TV renders the array index as
  `series int` and a map key as its key type). Not upgraded - low value and
  the `series int` change risks `simple int`-context FPs; revisit if a real
  case appears.
- matrix element types not derived (for-in over matrix is rare) - lenient.
- Element types that infer to a union or `unknown` stay lenient.
