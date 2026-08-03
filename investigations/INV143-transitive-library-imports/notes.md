# INV143 - transitive library imports

**Date:** 2026-08-03
**Status:** fixed
**Code:** `packages/pipeline/src/generate-libraries.ts`
(`LIBRARY_FOREIGN_TYPE_REFS`), `packages/core/src/analyzer/checker-udt.ts`
(`checkTransitiveLibraryImports`), `packages/core/src/analyzer/checker-calls.ts`,
`packages/core/src/analyzer/checker.ts` (`declarationStatementPos`), regenerated
`pine-data/v6/libraries.{ts,json}`

## Scope

TODO #64, the live residual of the now-closed #41 and of
[INV140](../INV140-imported-udt-surfaces/notes.md) p07. TV requires a library to
be imported EXPLICITLY when a UDT you use has fields referencing ITS types:
using `PF.Profile` after importing only `robbatt/lib_profile/44` draws four
errors, one per referencing field type. We were silent.

## Probes (`pine-lint --tv`, 2026-08-03)

Scripts are in `probes/`, plus INV140's `p07`. Run with
`node scripts/lint-batch.mjs --diff investigations/INV143-transitive-library-imports/probes`.

| probe | shape | TV |
|---|---|---|
| p07 | param typed `PF.Profile` + `p.hide()` | 4 errors at the call (5:5) |
| q01 | `PF.Profile p = na`, no member access | **clean** |
| q02 | two separate UDFs, each param + method call | **4** errors at the FIRST call (5:5), not 8 |
| q03 | lib_plot_objects ALSO imported explicitly | **clean** |
| q04 | `PF.Bucket` + field access | 1 error ("Line") at 2:1 |
| q05 | param typed `PF.Profile`, never used | **clean** |
| q06 | top-level `PF.Profile p = na` then `p.hide()` | 4 errors at the call (5:1) |
| q07 | param + FIELD access `p.poc` | 4 errors at **2:1** |
| q08 | library imported, its UDTs never used | **clean** |
| q09 | q07 with `indicator()` moved to line 4 | 4 errors at **4:1** |

TV's wording, verbatim:

```
The type "Line" is declared in the "robbatt/lib_plot_objects/56" library, but
the library is not explicitly imported. To use the type, import that library
```

## What the probes settled

**The trigger is a MEMBER ACCESS, not the declaration.** q01, q05 and q08 are
all clean: declaring a variable or parameter of the type, or importing the
library and never using its types, draws nothing. Only touching a member does.

**Reported once per distinct type per SCRIPT.** q02 uses `PF.Profile` in two
separate UDFs and still gets exactly 4 errors, all at the first site - not 8. So
the dedup key is (type, library), script-wide.

**The anchor has two forms, and q09 is what made the second one derivable.** A
METHOD CALL anchors at the call. A FIELD access anchors somewhere else, which
looked at first like a degenerate fallback: it landed on `2:1` in both q04 and
q07, the `indicator()` line, which has nothing to do with the offending code. I
was about to record it as an unmodelable TV artifact and deliberately diverge.
q09 tests that assumption by moving the `indicator()` call from line 2 to line 4
- and the anchor moved with it, to `4:1`. So it is the SCRIPT DECLARATION
statement, exactly derivable, and both forms are now matched rather than one
being approximated. Worth remembering as a method: before writing off a position
as a TV artifact, move the thing you suspect it is pointing at.

## The data gap, and why LIBRARY_TYPE_FIELDS alone could not close it

INV140 already recorded each exported type's fields, but stores the annotation
VERBATIM - `Profile.plot_poc` is `"D.Line"`. `D` is an alias private to
lib_profile's own source; a consumer of the library never sees it, and nothing
in the data said which library `D` was. So the field type was an opaque string.

The generator now reads each library's OWN `ImportStatement`s into an alias map
and resolves field annotations through it, emitting `LIBRARY_FOREIGN_TYPE_REFS`:
path -> exported type -> the distinct foreign types its fields reference, each
with its declaring library, in field-declaration order. A collection suffix is
stripped first (`D.Line[]` is Line's provenance). A dotted annotation whose
prefix is NOT one of that library's aliases is skipped rather than guessed at -
that is where the FP risk would be.

Only two vendored libraries have any: `robbatt/lib_profile/44` (Profile -> Line,
Label, LineFill, Box; Bucket -> Line; ProfileConfig -> LineArgs, LabelArgs,
BoxArgs) and `reees/Obj_XABCD_Harmonic/10` (xabcd_harmonic -> point, from
`reees/Pattern/1`). Profile's four match TV's four exactly, in order, and
Bucket's single "Line" matches q04.

## FP-safety

Silence is the default at every layer: a library we do not vendor has no entry,
a quarantined library has no entry, and a field type whose alias did not resolve
was never recorded. The check also requires a resolvable receiver type and (for
the method-call path) a clean parse.

## Verification

- 10 probes at **0 local-only / 0 tv-only**, including all three anchor forms
  (5:5, 5:1, 2:1, 4:1) and all four clean cases.
- `regression-check.mjs`: **0 changed fixtures, 0 new error appearances** over
  1879 fixtures. That is not vacuous: the corpus contains **two** carriers -
  `2cb42cb9…` (imports `reees/Obj_XABCD_Harmonic/10` AND `reees/Pattern/1`) and
  `6874e636…` (imports `robbatt/lib_profile/44` AND
  `robbatt/lib_plot_objects/56`). Both are the q03 control shape occurring in
  real published code: the referenced library IS explicitly imported, so the
  check runs on them and correctly stays silent. Published working scripts
  necessarily satisfy the rule, which is why the positive direction has no
  corpus carrier and needs probes.
- Regression fixture
  `packages/core/test/fixtures/regression/INV143-transitive-library-imports.pine`.
- Full vitest: 441 passing.

## Tooling note - compare-tv over-reports at a shared position

`compare-tv.mjs` / `lint-batch --diff` report "same-position different-message"
by pairing records at the same line:col. When one position carries SEVERAL
records - as this rule does, four at once - it pairs them cross-product and
reports the mismatched pairings even though the record SETS are identical. p07
shows 0 local-only / 0 tv-only alongside "same-position different-message (12)".
`local-only` / `tv-only` are the authoritative signals here; the same-position
count is inflated by construction for any multi-record position. Not fixed, only
recorded - it affects reading a sweep, not the check.

## Dependency worth noting

This needed the `pine-data/v6/index.ts` barrel fix from
[INV142](../INV142-strategy-exit-arg-groups/notes.md): `generate` used to drop
`export * from "./libraries"` on every run, so `LIBRARY_FOREIGN_TYPE_REFS` would
not have been importable from the barrel at all.
