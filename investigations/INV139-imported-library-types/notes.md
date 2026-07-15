# INV139 - imported-library exported TYPES were dropped from the export set

**Date:** 2026-07-15
**Status:** fixed
**Code:** `packages/core/src/parser/ast.ts` (`isExport` on TypeDeclaration /
EnumDeclaration), `packages/core/src/parser/parser.ts` (set it on the `export
type`/`export enum` path), `packages/pipeline/src/generate-libraries.ts`
(include exported types in the export set),
`packages/core/src/analyzer/checker-declarations.ts` (new
`importAliasTypeInvalid`), regenerated `pine-data/v6/libraries.{ts,json}`

## Scope

TODO #41's residual slice (a). Re-scoping that slice first (see TODO.md) found
three of its four claims stale - the parse-quarantined library, the local
`/// @source` wiring, and local UDT method calls are all done, two of them
already contradicted by #53 in the same file. What remained was NOT what the
slice named.

## The real gap

A library's public surface includes `export type` / `export enum`, and another
script imports them as `alias.T`. Our export sets held functions and methods
only, so:

- `generate-libraries.ts` filtered `ast.body` to `FunctionDeclaration` /
  `MethodDeclaration` with `isExport`, and
- the parser never set `isExport` on a `TypeDeclaration` at all - the field did
  not exist on the interface, and the `export` path routed straight into
  `typeOrEnumDeclaration()` and returned without marking it.

So fixing the generator alone would have found nothing. Both layers were needed.

This is corpus-backed, not hypothetical: `fixtures/cd1502b0…:39` is
`method processData(ffUtil.News[] N, ...)`, where `News` is an `export type` of
`toodegrees/forex_factory_utility/16`. 17 vendored libraries export types.

The consumer of the data was `invalidAnnotationBase`, which bailed on any dotted
base:

```ts
if (base.includes(".")) return null; // import-alias types - unvalidated
```

That comment was accurate about the cause: with functions-only export sets there
was nothing to validate a dotted type against.

## Probes (`pine-lint --tv`, 2026-07-15)

| probe | key line | TV verdict | pre-fix us |
|---|---|---|---|
| p01 | `f(ffUtil.News[] N)` - a real exported type | clean | clean |
| p02 | `f(ffUtil.Newz[] N)` - not exported | `"ffUtil.Newz" is not a valid type keyword.` | silent (FN) |

TV disagreed with our pre-fix silence on p02, which proves it reached TV's
checker and that p01's clean is a real acceptance. Post-fix, p02 matches TV
EXACTLY - same position (4:3) and same message, zero diff on either side.

Note TV reuses its local-type wording and quotes the FULL dotted name
(`"ffUtil.Newz"`), rather than the CE10271 "Could not find ..." form it uses for
unknown library FUNCTION members. Two different diagnostics for the same
"not in the export set" fact, split by syntactic position (type annotation vs
call callee).

## Fix

Three layers:

1. **Parser.** `isExport?: boolean` added to `TypeDeclaration` and
   `EnumDeclaration`; the `export type` / `export enum` path now sets it.
   Verified a non-exported `type Local` stays unmarked.
2. **Pipeline.** `generate-libraries.ts` includes exported types/enums in the
   export set. Purely additive: 76 insertions, 0 real removals (the 2 apparent
   ones are trailing-comma reflow). The history-dependence intersection is
   unaffected - it reads the analyzer's UDF-name sets, which type names never
   enter.
3. **Checker.** `importAliasTypeInvalid` validates `alias.Name` against the
   imported library's export set.

FP-safety is by lenience-where-unknown, the same shape as INV067/INV138: a root
that is not an imported namespace, an import whose export set we lack
(unvendored / license-excluded / parse-quarantined), or a path deeper than
`alias.Name` all return null. Only a library whose FULL surface we hold can
contradict a name. Builtin dotted types (`chart.point`) never reach the branch -
`TYPE_NAMES` catches them first.

Note the DATA half is FP-safe on its own but also nearly inert on its own:
adding names to an export set only makes the CE10271 call checks more lenient.
The value is in the checker half consuming it.

## Verification

- 2 probes, both matching TV post-fix.
- 2 regression fixtures: `INV139-imported-library-type` (the catch, plus the
  valid `ffUtil.News` sibling that must stay clean) and
  `INV139-unknown-library-type-lenient` (an unvendored library's dotted type
  stays accepted - the lenience gate).
- `regression-check.mjs`: **0 new error appearances** over 1879 fixtures, with
  88 libraries' export sets now gating real corpus type annotations.
- Full vitest: 433 passing.

## Residual

- **Imported UDT SURFACES.** We now know a library exports `News`, but not its
  fields or methods. So `n.bogusField` / `n.bogusMethod()` on an imported UDT
  instance stays lenient - INV103's "imported-library UDTs/methods stay lenient
  - we lack their surface" is still true, one level down. Closing it needs the
  export set to carry each exported type's field list (and the methods declared
  on it), not just its name.
- **Libraries we do not vendor** - a data gap, not a checker gap (#53(a)).
- `lib.Cell(...)` as a single-dot CALL is now suppressed by the call-site
  export check, since `Cell` is in the export set. Marginally over-lenient (a
  type is not callable that way), never a false positive.
