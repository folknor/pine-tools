# INV140 - imported UDT field/method surfaces (and the dropped-field parser bug)

**Date:** 2026-07-15
**Status:** fixed
**Code:** `packages/core/src/parser/parser.ts` (`scanTypeFieldAtCurrent`),
`packages/pipeline/src/generate-libraries.ts` (`LIBRARY_TYPE_FIELDS`),
`packages/core/src/analyzer/checker.ts` (`registerImportedLibraryTypes`, param
typing), `packages/core/src/analyzer/checker-udf-grounding.ts` (param typing),
`packages/core/src/analyzer/checker-calls.ts` (INV103 gate), regenerated
`pine-data/v6/libraries*.{ts,json}`

## Scope

The residual INV139 named: we knew a library exported `News`, but nothing about
its insides, so every `n.field` / `n.method()` on an imported UDT instance
stayed lenient. That is INV103's "imported-library UDTs/methods stay lenient -
we lack their surface". This closes it, and is the last slice of TODO #41.

## What it took

Four layers, three of which were latent bugs rather than missing features:

1. **Data** - `generate-libraries.ts` now emits `LIBRARY_TYPE_FIELDS`
   (path -> type -> field -> type), a separate additive map mirroring
   `LIBRARY_HISTORY_DEPENDENT`. 16 libraries carry exported types.
2. **Registration** - `registerImportedLibraryTypes` puts each into
   `declaredTypeNames` + `udtFieldTypes` as `alias.TypeName`, reusing the
   existing local-UDT machinery (`annotationToSymbolType`,
   `checkUdtFieldAccess`, INV103's method check) rather than adding a parallel
   imported path. A field naming another exported type of the SAME library is
   qualified (`Candle.args` -> `alias.LabelArgs`).
3. **Param typing (a pre-existing FN, local UDTs too).** All three param-binding
   sites used `mapToPineType`, which maps only BUILTIN types and returns
   "unknown" for any UDT name - so `f(pt p) => p.bogusField` was silent even for
   a LOCAL type (p03; TV flags it). The sibling helper `annotationToSymbolType`
   already fell back to `declaredTypeNames`; the sites now use it. Without this
   the imported surface only worked for variable declarations, and the corpus
   uses params (`method processData(ffUtil.News[] N, ...)`).
4. **The INV103 gate.** Registering imported UDTs widens that method check to
   them, which forces a new exclusion: a library's exported METHODS extend its
   own types and are not in `declaredFunctionNames` (local only), so without
   `importedMethodMayExist` every `p.hide()` became a false positive (p06).

## The parser bug this surfaced

The first corpus run after (2) and (3) produced **29 new errors** in 3 fixtures,
all `Object has no field` on names that are plainly real (`vah`, `val`, `poc`,
`left_top`, `bg_color`). Root cause is neither the new data nor the new typing:

`scanTypeFieldAtCurrent` **dropped any field it could not shape-match**, and a
dropped field name reads as a typo. It missed:

- **`varip`-qualified fields** (`varip float poc`) - `varip` is a KEYWORD but not
  a type token, so `isTypeTokenAt` failed and the whole field returned null.
- **UDT-typed array fields** (`Bucket[] buckets`, `D.Line[] plots`) - only the
  keyword branch called `scanGenericTypeSuffixAt`, so `float[] c` survived while
  `t[] d` did not.

Isolated against the parser directly: of `int a` / `varip float b` / `float[] c`
/ `t[] d` / `varip float[] e`, only `a` and `c` were captured. That cost
`robbatt/lib_profile/44`'s `Profile` **17 of its 30 fields**, including the
`poc`/`vah`/`val` the carrier reads.

**This was a live pre-existing FALSE POSITIVE, not something the new work
caused** (p01): a purely local `type t` with a `varip float b` and a `bucket[] c`
made us emit two bogus "Object has no field" errors on TV-clean code. The new
typing merely made a latent bug reachable through more paths - the same shape as
INV138's `array<T>[n]` discovery. Fixing the scanner took the 29 back to 0.

## Probes (`pine-lint --tv`, 2026-07-15)

| probe | shape | TV | pre-fix us |
|---|---|---|---|
| p01 | local `varip float b` + `bucket[] c`, read | clean | **2 bogus "Object has no field"** (FP) |
| p02 | `varip float a` vs `var float b` in a type | `var` is CE10288, `varip` clean | see residual |
| p03 | `f(pt p) => p.bogusField` (LOCAL UDT param) | `Object has no field bogusField` 6:5 | silent (FN) |
| p04 | `f(ffUtil.News n) => n.bogusField` (imported) | `Object has no field bogusField` 8:16 | silent (FN) |
| p05 | `p.bogusMethod()` on `PF.Profile` | CE10271 method ref | silent (FN) |
| p06 | `p.hide()` / `p.delete()` - real exported methods | clean | clean (the gate must keep it so) |
| p07 | `PF.Profile` used without importing lib_plot_objects | 4x "The type X is declared in ... but the library is not explicitly imported" | silent (FN - residual) |

p03 is the one that shows the param gap was never about imported types: TV flags
a LOCAL UDT param's bogus field and we were silent.

## Verification

- 7 probes; p01/p03/p04/p05 all reproduce, p06 stays clean (the gate holds).
- 4 regression fixtures: `INV140-varip-and-array-udt-fields` (the FP, now
  clean), `INV140-udt-param-field`, `INV140-imported-udt-field`,
  `INV140-imported-udt-method` (bogus flagged AND real library methods clean).
- `regression-check.mjs`: 29 new appearances -> **0** after the scanner fix. The
  only changed fixture remains INV138's `2997d729…` v5 disappearance.
- Full vitest: 438 passing.

## Residuals

- **Transitive imports (new FN, p07).** TV requires a library to be imported
  explicitly when a UDT you use has fields referencing ITS types: using
  `PF.Profile` without `import robbatt/lib_plot_objects/56` draws four "The type
  "Line" is declared in the ... library, but the library is not explicitly
  imported" errors. We are silent. The data to implement it now exists
  (`LIBRARY_TYPE_FIELDS` records the referencing field types), so this is
  tractable - it needs the field's declaring-library provenance, which the
  current `alias.Base` qualification does not record.
- **`var` in a type declaration (wrong message, p02).** TV emits CE10288 "The
  keywords "var" cannot be used in a type declaration" at the DECLARATION;
  because we drop the field, we instead emit "Object has no field b" at the
  USAGE. Both error, so it is not an FP, but the message and position are wrong.
  Emitting CE10288 in the scanner would fix it.
- **Methods are name-only.** `importedMethodMayExist` does not know WHICH type an
  exported method extends, so `profileObj.update()` is accepted on the strength
  of `Bucket.update` existing. Over-lenient, never an FP.
- Libraries we do not vendor have no type surface and stay fully lenient
  (#53(a)).
