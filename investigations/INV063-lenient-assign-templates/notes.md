# INV063 - lenient assign paths and unknown-property reads adopt TV's templates

**Date:** 2026-06-11. **Found under:** the #48 reachability audit's
corpus-but-never-in-tests list (3 sites post-INV061) - building fixtures
for them per #52's method surfaced that all three used homegrown wording
where TV has probed templates. **Fixed at:** checker
(`packages/core/src/analyzer/checker.ts`, three sites), renderer
(`packages/core/src/analyzer/types.ts`, `renderAssignDiagnosticType`).
**Regression fixture:**
`packages/core/test/fixtures/regression/INV063-lenient-assign-templates.pine`.

## The three sites

1. **Lenient declaration assign** (everything INV032's strict CE10173
   rule skips: collections, UDTs, drawing types, legacy versions) -
   emitted `Cannot assign array<string> to array<float>` anchored at the
   variable NAME. TV: the same CE10173 template as the strict path,
   anchored at the statement start.
2. **Lenient reassignment assign** (`:=`, same coverage) - same internal
   wording. TV: same CE10173 template. Member/index targets keep the
   internal wording (the template needs a variable name; unprobed shape).
3. **Unknown property read on a known builtin namespace**
   (`x = syminfo.bogus`) - emitted
   `Unknown property 'bogus' on namespace 'syminfo'`. TV: reuses CE10272
   `Undeclared identifier "syminfo.bogus"` with the full dotted name,
   same as INV048's type-as-value case. Anchor already matched.

## Probes (`pine-lint --tv`, 2026-06-11, probes/)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `array<float> a = array.new<string>()` | CE10173, 3:1-3:36, assignedValueType `array<string>`, ownValueType `array<float>`, variableName `a` |
| p02 | `var a = array.new<float>()` / `a := array.new<string>()` | CE10173, 4:1-4:24, same ctx values (own from the inferred var type) |
| p03 | `x = syminfo.bogus` | CE10272 `Undeclared identifier "syminfo.bogus"`, 3:5-3:17 |
| p04 | `float x = array.new<float>()` | CE10173, assigned `array<float>`, own `const float` |
| p05 | `line l = 5` | CE10173, assigned `const int`, own `series line` |
| p06 | `type Point` / `Point p = 5` | CE10173, assigned `const int`, own `Point` (UDT bare) |

Rendering rules derived (in `renderAssignDiagnosticType`): collections
bare (`array<string>`), UDTs bare (`Point`), drawing types
series-qualified (`series line`), scalars follow INV032's
renderQualifiedType rules (`const int`, `series float`), na is
`simple na`.

## Outcome (corpus, 2026-06-11)

- 17 records moved as verified same-line anchor+wording pairs (the
  declaration site's name-column -> statement-start move), 26 reworded
  in place. Zero appearances or disappearances beyond the swaps;
  baseline 15841 -> 15841 (count unchanged, wording/anchors only).
- Local output is byte-identical to TV on probes p01-p04 and p06's
  template (verified via test:snippet).

## Residuals

- **`line l = 5` FN (p05) - CLOSED.** The original attempt typed the
  drawing-type symbols (mapToPineType entries for line/label/box/table)
  while the inference under them still guessed `series<float>` for any
  UDF with untyped params, so a line-returning UDF (`new_level` tail
  `line_`) was typed `series<float>` and every `lineN := new_level(...)`
  reassignment mis-flagged - 58 corpus FPs in 2 files (50 + 4 binary-op
  from the same mis-inference). That attempt was reverted at the time.
  TODO #9's Loop 2 (grounded, call-site-sensitive UDF inference, commit
  `2e34e94`) deleted the `series<float>` guess, so a line-returning UDF
  now infers its real base or `unknown`, never a scalar, and the FP class
  is structurally gone. All seven drawing handles
  (line/label/box/table/linefill/polyline/chart.point) were then `--tv`-
  probed and typed; see [INV125](../INV125-drawing-handle-tv-probes/notes.md)
  for the dated probe verdicts and the landing commit in git log. The
  permanent FP canary lives in
  `packages/core/test/fixtures/regression/INV063-line-udf-reassignment-canary.pine`
  and the FN coverage in `INV063-drawing-handle-annotations.pine`.
- **UDT declarations (`Point p = 5`, p06) - CLOSED (independently).** No
  longer silent: `annotationToSymbolType` resolves a UDT name via
  `declaredTypeNames` and `renderAssignDiagnosticType` renders it bare, so
  the correct CE10173 fires. This was already restored before the
  drawing-handle typing landed; INV125 records the confirmation.
- **`linefill`/`polyline`/`chart.point` annotations - CLOSED.** Now members
  of the `PineType` union and typed in `mapToPineType` (same INV125 landing).
  `chart.point` renders bare; the other two render `series <handle>`.
- Member/index `:=` targets keep the internal wording (unprobed) - still
  open, a separate item if ever pursued.
