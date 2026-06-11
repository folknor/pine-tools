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

- **`line l = 5` is an FN (p05).** Typing drawing-type symbols
  (mapToPineType entries for line/label/box/table) makes the check fire
  TV-identically on the minimal probe, but surfaced 58 corpus FPs in 2
  files: a line-returning UDF (`new_level` tail `line_`) has its return
  guessed `series<float>` from untyped params, so every
  `lineN := new_level(...)` reassignment mis-flagged, plus 4 binary-op
  FPs from the same mis-inference. Reverted; the FN waits on #9's
  robust UDF-return inference. The attempt is preserved in this note;
  the mapToPineType comment points here.
- UDT declarations (`Point p = 5`, p06) are silent for the same reason
  (UDT annotations map to unknown) - same blocker.
- Member/index `:=` targets keep the internal wording (unprobed).
- `linefill`/`polyline`/`chart.point` annotations also map to unknown
  (not in the PineType union) - same class as the drawing-type residual.
