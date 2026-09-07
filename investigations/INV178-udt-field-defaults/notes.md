# INV178 - UDT field defaults were never validated (the INV172 residual)

**Date:** 2026-09-07
**Status:** fixed (TODO #83's open half)
**Code:** `packages/core/src/parser/parser.ts` (`scanTypeFieldAtCurrent` +
the type-body loop now parse every field default as an expression, not only
bare literals), `packages/core/src/analyzer/checker-udt.ts`
(`checkTypeFieldDefaults` applies the shared `defaultValueViolation` rule from
`checker-declarations.ts` before the CE10170 literal type check).
**Fixture:** `packages/core/test/fixtures/regression/INV178-udt-field-defaults.pine`

## Symptom

INV172 gave user-function and method PARAMETER defaults TV's four codes and
scoped UDT FIELD defaults out with three cells of evidence. Fields carried
none of it: the parser captured only a bare NUMBER / STRING / BOOL default
(for INV094's CE10170 type check) and dropped every other default on the
floor, so `int b = userVar`, `float c = 1 + 2` and - the shape real code
reaches for - `array<int> xs = array.new<int>()` in a `type` body were all
silently accepted while TV rejects each one.

## The rule, measured

`probes/grid.mjs` - 23 cells, one script each, the field being the SECOND
field of a two-field type so a field-level anchor is distinguishable from the
type line. `--local` runs the same grid against our validator. Probed
2026-09-07; preamble `//@version=6`, `indicator("INV178")`, `userVar = 42`,
`userFn(int a) => a + 1`; each cell is `type T` / `    int a = 1` /
`    <ftype> b = <cell>`.

| default | TV |
|---|---|
| `5`, `5.5`, `-5`, `"a"`, `true`, `#FF0000`, typed `na` | clean |
| `close`, `color.red`, `text.align_right`, `timenow` | clean |
| `(5)`, `-(1)`, `-userVar` | clean (the INV172 unary hole, reproduced) |
| `userVar` | **CE10132** at 7:13, the EXPRESSION |
| `math.max(1, 2)`, `userFn(1)`, `int(na)` | **CE10133** at 7:5, the field's start |
| `1 + 2`, `true ? 1 : 2`, `1 > 2`, `close + 1`, `"a" + "b"` | **CE10134** at 7:5, the field's start |

Messages are INV172's verbatim (CE10132's `type's field` wording is finally
literal here). Four more probe files, `pine-lint --tv` via
`scripts/lint-batch.mjs --diff`:

| probe | shape | TV |
|---|---|---|
| p01 | `varip float b = math.max(1, 2)` | CE10133 at 5:5 - the `varip` token, so the anchor is the field line's FIRST token |
| p02 | `array<int> b = array.new<int>()` | CE10133 at 5:5 - a collection constructor is a call like any other |
| p03 | `P b = P.new()` (a UDT-typed field) | CE10133 at 7:5 |
| p04 | `int b = userVar` and `float c = 1 + 2` in one type, plus `T.new()` and `T.new(1, 2, 3.0)` call sites | CE10132 at 6:13 and CE10134 at 7:5 - both reported, and NO call-site cascade |

So the parameter rule transfers whole, with two field-specific facts: the
anchor for CE10133/CE10134 is the field line's first token, and there is no
CE10165 cascade at constructor call sites (INV172's residual for parameters
does not apply to fields).

Every erroring cell and probe was local-clean before the fix, so the calls
reached TV.

## Fix

- Parser: `scanTypeFieldAtCurrent` still captures a bare literal directly;
  any other `= <expr>` hands back the expression's token index and the type
  body loop parses it with `parseSingleLineExpression`, resuming after it.
  The field also records `startColumn` (its first token: `varip` or the
  type).
- Checker: `checkTypeFieldDefaults` runs `defaultValueViolation` (now
  exported from `checker-declarations.ts`, so the rule lives in one place)
  with `typed = true`, anchoring CE10132 at the expression and the other two
  at `startColumn`; a violating default skips the CE10170 type check so a
  field draws one error.

## Verification

- `grid.mjs --local`: all 23 cells match TV - same verdict, code, anchor.
- The four probe files: no disagreement (p04 has one local `UNUSED_VARIABLE`,
  lint stage).
- Regression fixture: 4 errors on a 12-field type with every clean shape
  beside them.
- `regression-check.mjs` over 1879 fixtures: **0 changed**. The corpus carries
  no non-literal field default (a grep over every `type` body found only
  literals), so this is the usual "no false positives, no coverage"
  reading; the general expression parse of field defaults also disturbed
  nothing.
- Full suite green (484 before the fixture).

## Residual

- The unprobed default shapes INV172 lists (array literal, index, if- and
  switch-expressions) are accepted on fields for the same reason: a miss on
  an unmeasured shape beats an invented code.
