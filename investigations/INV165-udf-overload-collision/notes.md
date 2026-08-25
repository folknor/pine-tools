# INV165 - overloads with the same required parameters (CE10111)

Closes the first half of TODO #71 (the collision rule). The second half -
overload RESOLUTION feeding the return type - is untouched and stays open.

## The gap

From INV157 cluster B, via piners:

```pine
f(float x) => x + 1.0
f(float x, float scale = 1.0) => x * scale
```

TV rejects; we were clean. The optional parameter cannot disambiguate a call
that omits it, so the two overloads are indistinguishable for `f(1.0)`.

We already had a redefinition check (INV091, CE10110/CE10112/CE10113), and it
missed this by construction: it compares **arities and full parameter lists**,
and here the arities differ.

## Probes and TV results, 2026-08-25

All twelve in `probes/`, each run through `pine-lint --tv`. `f` is the
overloaded name throughout.

| probe | shape | TV |
|---|---|---|
| p1 | `f(x)` / `f(x, y = 1)` (untyped) | clean |
| p2 | `f(float x)` / `f(int x)` | clean |
| p3 | `f(float a)` / `f(float b)` | CE10110 at 7:2, "same **parameters**" |
| p4 | `f(float x)` / `f(float x, float y)` | clean |
| p5 | `f(x)` / `f(float y)` | clean |
| p6 | `f(float x)` / `f(int x)` / `f(float x, int scale = 2)` | CE10111 at 10:2 (third vs first) |
| p7 | `f(float x, int scale = 2)` / `f(float x)` - optional on the FIRST | CE10111 at 7:2 |
| p8 | `f(simple int x)` / `f(series int x)` | clean |
| p9 | `f(float x, int s = 1)` / `f(float x, float t = 2.0)` - SAME arity | CE10111 at 7:2 |
| p10 | `f(float x)` / `f(int x, int s = 1)` | clean |
| p11 | `f(x)` / `f(float y, float s = 2.0)` | clean |
| p12 | `f()` / `f(int s = 1)` | CE10111 at 7:2 |

Plus INV157's `probes/ov-optional-only.pine`, re-run the same day: CE10111,
start 11:2 / end 11:29 - so TV's span is the second declaration's whole
parameter list, anchored at the `(`.

Full message: `The "{functionName}" function has overloads with the same
required parameters. The type of required parameters must be different in
overloaded versions of functions.`

## The rule these pin

Two declarations collide iff their **required** parameter TYPE lists are
identical - `required` meaning "declared without a default". Four details that
none of this was obvious from the one starting probe:

1. **It is not an arity rule.** p9 collides at equal arity with differing full
   lists; ov-optional-only collides at differing arity. Only the required
   sublist matters, which is why this had to run BEFORE the existing
   arity comparison rather than beside it - the old check would have called p9
   a valid overload.
2. **An untyped required parameter collides with nothing** (p1, p5, p11 all
   clean). "Undetermined" is distinct from every concrete type and from
   itself, the same never-guess rule INV091's check already applied.
3. **The qualifier is part of the type** (p8: `simple int` and `series int` are
   distinct overloads).
4. **TV has two wordings and picks by optionals, not by typing.** With no
   optional parameter anywhere the required lists ARE the full lists, and TV
   says "same **parameters**" (CE10110, p3 - which we already emitted, at the
   same position and wording). Introduce an optional on either side and it
   becomes "same **required** parameters" (CE10111). Zero required parameters
   is not special-cased: p12 is CE10111 like the rest.

## What landed

`checkRequiredParamCollision` in `checker-declarations.ts`, run first inside
`checkFunctionRedefinition` and reporting at most one error per declaration.
It returns early when neither side declares an optional parameter, leaving
that case to the existing same-arity check rather than double-reporting.

## Verification

- `node scripts/lint-batch.mjs --diff probes/`: **12 files, 0 error
  disagreements** with TV - positions and wording included, silences included.
- `packages/core/test/fixtures/regression/INV165-overload-required-param-collision.pine`
  pins the three colliding shapes and the four legal ones.
  `compare-tv` on the fixture: local 3 / TV 3, zero local-only, zero tv-only.
- `node scripts/regression-check.mjs`: 0 changed fixtures, 0 new error
  appearances over 1879. A published script cannot carry this defect (it would
  not compile), so the corpus's role here is purely as a false-positive gate -
  and the new check fires nowhere in it.
- 472 tests passing.

## Still open (TODO #71's second half)

`probes/ov-na-decisive-rev.pine` from INV157: with `f(float x) => 1` and
`f(int x) => "int"`, `f(na)` selects the `float` overload, so
`string result = f(na)` is a type error we do not catch. That needs real
overload selection - including TV's rule for which overload an `na` argument
picks, which the probe pins in one direction only - before the return type is
knowable. Nothing here advances it.
