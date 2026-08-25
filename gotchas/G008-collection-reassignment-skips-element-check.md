# G008 - TV's collection element check is position-dependent

**Date:** 2026-08-21. **Found by:** the second external corpus audit
(INV148 finding (b)), which reported our `Cannot assign array<int> to
array<float>` on `cvd-profiles.pine:202` as a false positive because TV
accepts the file.

**Title and headline CORRECTED 2026-08-25 (INV157).** This gotcha was
called "TV element-type-checks a collection DECLARATION but not a `:=`
reassignment". That is too broad, and the original probes did not test
the cell that disproves it. TV **does** element-check a `:=`
reassignment - it just WIDENS there. The corrected rule is the table
below; everything else in this file, including the unsoundness finding
and the "keep our error" lesson, stands unchanged and is now better
founded.

## The rule, as measured

| position | behaviour |
|---|---|
| declaration with an initializer (`array<float> b = a`) | **invariant** - rejects BOTH directions, CE10173 |
| `:=` store, int -> float (`array<float> := array<int>`) | **accepted** - and unsound, see below |
| `:=` store, float -> int (`array<int> := array<float>`) | **rejected**, CE10173 |
| `:=` store on a `map` | **not element-checked at all** |

Probes for the two cells the original write-up missed, both
`pine-lint --tv`, 2026-08-25:

```pine
//@version=6
indicator("array narrowing via :=")
a = array.new<float>(1, 1.0)
array<int> b = array.new<int>(1, 1)
b := a
plot(array.size(b))
```

TV: `CE10173 Cannot assign a value of the "array<float>" type to the "b"
variable. The variable is declared with the "array<int>" type.` So the
`:=` position IS checked - the original probe simply happened to be a
widening, which is the direction that passes.

```pine
//@version=6
indicator("map store hole")
m = map.new<string, string>()
map<string, int> n = map.new<string, int>()
n := m
plot(map.size(n))
```

TV: **clean.** Not a widening in any sense - `string` values into a map
TV types `map<string, int>`. The `map` store position is not element-
checked at all, while the identical array and matrix shapes reject. We
emit `Cannot assign a value of the "map<string, string>" type to the "n"
variable`, and per the lesson below that error stays.

Cross-checked against the piners project's own thirty-cell variance
table (`notes/blackbox-audit-2026-08-24.md` cause 5), which reached the
same conclusion after re-probing twice - their first pass recorded the
map cell as REJECT by analogy with array and matrix, without testing it.
Two independent write-ups have now got this wrong by generalizing from
the tested cells, which is the argument for the table above being
explicit about which cells were actually run.

## Symptom (the original 2026-08-21 finding)

The same element-type mismatch is rejected in one syntactic position and
accepted in the other. Note both probes below are the WIDENING direction;
that is what the corrected table above adds:

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
  rather than a rule. The corrected table strengthens this: TV rejects
  the same `:=` in the narrowing direction, so the accepting cells are
  an asymmetry in TV's own checker, not a coherent variance rule we
  should mirror.
- **Do not generalize from the cells you ran.** Both this file's first
  version and piners' first table stated a rule that the untested cells
  contradict. If a claim here covers a position or a direction, the probe
  for that exact cell belongs in the file.
- A corpus file can therefore be "TV-clean" and still carry this error
  legitimately. Expect it in the local-only column of any TV diff, and do
  not count it as a false positive.
- Pinned by
  `packages/core/test/fixtures/regression/G008-collection-reassign-element-check.pine`.
