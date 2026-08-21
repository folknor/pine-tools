# G008 - TV element-type-checks a collection DECLARATION but not a `:=` reassignment

**Date:** 2026-08-21. **Found by:** the second external corpus audit
(INV148 finding (b)), which reported our `Cannot assign array<int> to
array<float>` on `cvd-profiles.pine:202` as a false positive because TV
accepts the file.

## Symptom

The same element-type mismatch is rejected in one syntactic position and
accepted in the other:

```pine
//@version=6
indicator("t")
array<float> floats = array.from(0, 0, 0)
plot(array.get(floats, 0))
```

TV: `3:1: error: Cannot assign a value of the "array<int>" type to the
"floats" variable. The variable is declared with the "array<float>" type.`

```pine
//@version=6
indicator("t")
array<int> ints = array.from(0, 0, 0)
array<float> floats = na
floats := ints
plot(array.get(floats, 0))
```

TV: **clean**.

## This is unsound, not a deliberate coercion

If it were a widening coercion, the result would be a distinct
`array<float>`. It is not - it aliases the same object, and TV keeps
typing the original as `array<int>` while permitting float writes through
the alias:

```pine
//@version=6
indicator("t")
array<int> ints = array.from(1, 2, 3)
array<float> floats = na
floats := ints
array.push(floats, 1.5)
plot(array.get(ints, 3))
```

TV: **clean** (probed 2026-08-21). So `1.5` is pushed into an array TV
itself types as `array<int>`, and read back out through an
`array.get(ints, ...)` that TV types as returning `int`. Pine collections
are invariant; nothing here makes that assignment safe.

## Lesson

- **Keep our error.** It is a true positive of the INV001 / G001 class -
  we catch what TV misses. Do not relax the check to match the `:=`
  acceptance; the declaration form proves TV agrees the types are
  incompatible, and the alias probe proves the acceptance is a hole
  rather than a rule.
- A corpus file can therefore be "TV-clean" and still carry this error
  legitimately. Expect it in the local-only column of any TV diff, and do
  not count it as a false positive.
- Pinned by
  `packages/core/test/fixtures/regression/G008-collection-reassign-element-check.pine`.
