# INV141 - CE10288 for `var` in a type declaration

**Date:** 2026-08-03
**Status:** fixed
**Code:** `packages/core/src/parser/parser.ts` (`scanTypeFieldAtCurrent`)

## Scope

TODO #63, the residual INV140 p02 left behind. `varip` is the ONLY legal
qualifier on a UDT field; `var` is TV's CE10288. Our scanner recognised only
`varip`, so a `var`-qualified field fell through the shape match and was
DROPPED - and a dropped field name reads as a typo at every usage.

So this was never a false positive (TV errors too), but both the message and
the position were wrong, and it rode the exact mechanism that made INV140's
`varip`/array-field bug a real FP. Keeping the field is the substance of the
fix; emitting CE10288 is what replaces the relocated complaint.

## Probes (`pine-lint --tv`, 2026-08-03)

Scripts are in `probes/`, run with `node scripts/lint-batch.mjs --diff
investigations/INV141-var-in-type-declaration/probes`.

| probe | shape | TV | pre-fix us |
|---|---|---|---|
| p01 | `var float b` in a type, field read | CE10288 at **5:5** | `Object has no field b` at **8:6** (wrong message, wrong position) |
| p02 | `varip float b`, field read (control) | clean | clean |
| p03 | `var float b` NEVER read, sibling read | CE10288 at **5:5** | **silent** (a genuine FN) |

TV's wording, verbatim:

```
The keywords "var" cannot be used in a type declaration. Use them when
declaring variables of that type.
```

p01 and p03 are the proof `--tv` reached TradingView rather than returning an
empty/fallback result: both DISAGREE with the local validator, and the p02
control is clean on both sides, so the run distinguishes the qualifier rather
than the surrounding scaffolding.

p03 is the sharper of the two. With no usage there is no dropped-field symptom
at all, so the old behavior was not merely mispositioned - it was fully silent.
That also settles where the check belongs: at the declaration, not at a usage
site, because there may be no usage.

## Fix

`scanTypeFieldAtCurrent` now scans `var` exactly as it scans `varip`, so the
field SURVIVES into `TypeDeclaration.fields`, and records the offending token.
The diagnostic is pushed only after the trailing field-name check has confirmed
the line really is a field declaration - the scanner runs on every body-indent
line and rejects non-fields by that check, so emitting at the point of
recognition would have flagged any body line merely starting with `var`.

## Verification

- 3 probes, all three now at 0 local-only / 0 tv-only.
- Regression fixture
  `packages/core/test/fixtures/regression/INV141-var-in-type-declaration.pine`,
  compared against TV: 1 error each side, same position (8:5), same message.
  It carries a `var` field, a `varip` field, and a plain field. The `var` and
  plain fields are read (pinning that the `var` field SURVIVES rather than
  resurfacing as a bogus "Object has no field"), and the `varip` field is left
  unread (pinning that the legal qualifier draws nothing either way).
- `regression-check.mjs`: 0 changed fixtures, 0 new error appearances.
- Full vitest: 439 passing.

## Residual

None. The other INV140 residual (transitive imports, p07) is TODO #64 and is
tracked separately.
