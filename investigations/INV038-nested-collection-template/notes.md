# INV038 - CE10025/CE10022: collection inside another collection's type template

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FN `Cannot use a collection in a type template of
another collection...` (2 records in 1 file - both on the same line,
TV's double emission) from the 2026-06-05 inventory. Task tracker #7.

## Claim

Pine forbids nesting collections in type templates
(`array.new<array<float>>()`); TV directs you to wrap the inner
collection in a UDT. We accepted all of it silently (and even infer
`array<array<float>>` as the type).

## Probes (pine-lint --tv, 2026-06-05; scripts in probes/)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `var nestedArr = array.new<array<float>>()` | CE10025 TWICE: anchor 3:17 (the call) and 3:1 (the statement start), same end column |
| p02 | `array<array<float>> a = na` (annotation form) | CE10022 `Arrays of type array are not supported.` (ctx.type = the inner base), anchor 3:6-3:19 (the template span) |
| p03 | `var m = map.new<string, array<float>>()` | CE10025 twice (3:9 call, 3:1 statement) - map values count too |

## Implementation

- `hasCollectionTemplateArg`: any `typeArguments` entry whose base is
  array/matrix/map. Emitted in validateCallExpression at the call
  anchor (v6-gated), plus a second emission at the statement start in
  the VariableDeclaration case when the call is the initializer -
  matching TV's double exactly.
- The annotation form gets CE10022's distinct wording in
  checkTypeAnnotationName, anchored at the `<` of the template.

Corpus outcome: exactly the 2 inventory records, both at TV's
positions. The carrier is our own `syntax/generics.pine` fixture, whose
"Nested generics" example was asserting the wrong thing - updated.

Fixture: `packages/core/test/fixtures/regression/INV038-nested-collection-template.pine`

## Residual

- ~~`matrix<array<float>>` / `map<...>` ANNOTATION forms unprobed~~ -
  probed and implemented, see the addendum below.
- UDF parameter annotations with nested collections unvalidated (same
  scope cut as INV033; the INV033 addendum validates param annotation
  NAMES, but the collection-nesting check still runs only on
  declaration annotations).

## Addendum 2026-06-05: matrix/map annotation forms

Probes (p04-p06 in `probes/`, `pine-lint --tv` 2026-06-05):

| probe | shape | TV verdict |
|---|---|---|
| p04 | `matrix<array<float>> m = na` | CE10023 `Matrix of type {type} are not supported.` (ctx.type = "array"), anchor 3:7-3:20 (the template span) |
| p05 | `map<string, array<float>> mp = na` | CE10025 - the CONSTRUCTOR-call wording ("Cannot use a collection in a type template...") - anchor 3:4-3:25 |
| p06 | `array<map<string, float>> x = na` | CE10022 `Arrays of type map are not supported.`, 3:6 - the {inner} slot generalizes over the nested base |

So annotations split three ways by the OUTER collection: array ->
CE10022 "Arrays of type {inner}", matrix -> CE10023 "Matrix of type
{inner}", map -> the generic CE10025 collection-in-template wording.
The `checkTypeAnnotationName` nesting branch now matches any outer
collection and any nested collection in its template (the value slot
of map included), picking the message by outer base.

Fixture: `packages/core/test/fixtures/regression/INV038-collection-annotation-forms.pine`
