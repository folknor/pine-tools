# INV087 - collection mutator element type not checked (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (module helpers
`collectionElementTarget` / `elementArgAssignable`, plus the dedicated
element-type pass in `validateCallExpression`, before the generic arg loop).
**Source:** `../freedom/FINDINGS.md` D-001 - differential testing of
`piners validate`. piners AND our LSP were both silent; only `--tv` flagged
it. A gap shared by the LSP and piners.

## Symptom (false negative)

A value whose type does not match a collection's element type was accepted
by the mutator:

```pine
//@version=6
indicator("s")
a = array.new<int>()
array.push(a, 1.5)        // we were silent; TV: CE10123
m = map.new<string, int>()
map.put(m, "a", 1.5)      // we were silent; TV: CE10123
```

## Why it passed

`array.push`/`map.put` type the value/key param as
`"series <type of the array's elements>"` /
`"...map's elements>"` (the reference's element-type placeholder). That
string is not a concrete PineType, so `mapToPineType` collapses it to
`"unknown"`. Two consequences:
- `hasOverloads(array.push)` is true (it has `unknown`-typed params), so the
  generic positional loop bypasses positional checking entirely.
- even reached, `isAssignable(_, "unknown")` short-circuits to true.

So the value/key arg was never checked against the receiver's element type.

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

| probe | call | TV |
|---|---|---|
| coll_array_push_float.pine | `array.push(array.new<int>(), 1.5)` | CE10123 @ 7:15 - "value"="1.5", literal float used but series int expected |
| coll_map_put_float.pine | `map.put(map.new<string,int>(), "a", 1.5)` | CE10123 @ 7:17 - same |
| (doc example) | `map.put(map.new<string,float>(), "first", 10)` | clean - int -> float is a widening |

The directionality is the key fact: float -> int is a NARROWING TV rejects,
but int -> float is a widening it accepts (the reference's own `map.put`
example puts the int literal `10` into a `map<string,float>`). Our
`isAssignable` treats int<->float as bidirectionally coercible, so it is too
lenient to use here directly.

## Fix (checker)

A dedicated pass in `validateCallExpression` (v6 only), run before the
generic loop:
- For each param whose `rawType` matches
  `/type of the (array|map)'s elements/`, resolve the receiver (the `id`
  arg) type and extract the target element type -
  `collectionElementTarget`: `array<E>` -> `E`; `map<K,V>` -> `K` for the
  `key` param, `V` otherwise (map keys are primitives, so the first comma is
  always the K/V split).
- `elementArgAssignable` is stricter than `isAssignable` on numerics: exact
  base match OK, widening `int -> float` OK, narrowing `float -> int`
  REJECTED; `na` and `unknown` args stay lenient.
- When the element type is unresolved (`unknown`/`type`), skip - same
  leniency the existing `array<unknown>` rule uses, to avoid FPs.
- On mismatch, emit CE10123 with `currentTypeDocStr = "series <E>"` -
  position + wording EXACT vs TV.

Covers every mutator carrying the placeholder param: `array.push`,
`array.set`, `array.insert`, `array.unshift`, `array.fill`,
`array.indexof`/`lastindexof`, `map.put`, `map.contains`, etc.

Residual (left lenient): method-call form (`a.push(1.5)`) does not route the
receiver through the positional `id` slot, so it is not yet checked; and a
receiver whose element type we cannot infer stays unchecked.

## Verification

- 2 probe files under `probes/` (the two FINDINGS repros).
- Regression fixture `regression/collection-element-type.pine`: the two
  narrowing pushes flagged; widening (`int->float`) and exact matches clean.
- `regression-check.mjs` over 1879 corpus fixtures: **0** new collection-
  mutator appearances (no corpus FPs; receivers either match or resolve to
  `array<unknown>` -> lenient). Full suite: 350 pass.
