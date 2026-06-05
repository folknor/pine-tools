# INV033 - CE10149: "X" is not a valid type keyword

**Date:** 2026-06-05
**Status:** RESOLVED - annotation-name validation implemented
**Category:** tv-only FNs `"source" is not a valid type keyword.` (2 in 2
files) + `"plot" is not a valid type keyword.` (1 in 1 file) from the
2026-06-05 inventory. Task tracker #1.

## Claim

TV rejects declarations whose type annotation is not a known type:
`source src = input.source(...)`, `plot emaPlot1 = plot(...)` (users
writing pseudo-type keywords). Our parser accepts any `IDENT IDENT =`
shape as a user-type declaration (tryUserTypeAnnotation) and never
validates the name.

## Probes (pine-lint --tv, 2026-06-05; scripts in probes/)

| probe | script (line 3+) | TV verdict |
|---|---|---|
| p01 | `source src = input.source(close, "Source")` | CE10149 `"source" is not a valid type keyword.`, anchor 3:1-3:6 |
| p02 | `plot myPlot = plot(close)` | CE10149 `"plot"`, 3:1-3:4 |
| p03 | `type Foo` / `int a = 0` / `Foo f = Foo.new()` | clean; f typed Foo |
| p04 | `Bar b = 1` (no such type anywhere) | CE10149 `"Bar"` - SAME code/message as the pseudo-keyword case |
| p05 | `enum Dir` ... `Dir d = Dir.up` | clean; d typed const Dir |
| p06 | `Foo f = Foo.new()` BEFORE `type Foo` | CE10149 `"Foo"` - use-before-declaration is the same error; declaration order matters |

So the rule is single and simple: at the point of a declaration, the
annotation must name a built-in type or a UDT/enum declared earlier in
source. There is no separate "unknown type" wording.

## Implementation

`checkTypeAnnotationName` in checker.ts (v6-gated): strips qualifier
prefix / generic suffix / `[]`, then accepts
- parser TYPE_KEYWORDS (int, float, ..., array/matrix/map, series/simple),
- the pine-data types catalog `TYPE_NAMES` (covers linefill, polyline,
  chart.point, footprint, volume_row - object types the parser's keyword
  list does not special-case),
- dotted names (import-alias types `lib.Type` - member sets unknown,
  accepted unvalidated),
- UDT/enum names declared earlier (`declaredTypeNames`, populated in
  source order by both TypeDeclaration/EnumDeclaration registration
  sites, which also gives the p06 use-before-declaration behavior for
  free).

Anchored at the statement start; the tryUserTypeAnnotation parser paths
now thread the start token (same startLine/startColumn mechanism as
INV032).

**Same-physical-line gate:** the hard-wrapped mangled corpus files glue
prose fragments and split identifiers into `IDENT IDENT =` shapes ACROSS
lines (`...strategy entry` + next line `position = ...` parses as a
declaration with type "entry"). A real annotation and its variable name
share a physical line, so the check skips when `startLine != line`. This
cut the new-appearance set from 28 to exactly the 5 genuine catches
(3 TV-confirmed inventory records + 2 identical shapes past TV's stop
point in the same files).

Fixture: `packages/core/test/fixtures/regression/INV033-invalid-type-keyword.pine`

## Residual

- UDF/method parameter type annotations are not validated (different
  context; no corpus evidence of TV's behavior there - probe before
  extending).
- Wrapped declarations (`MyType` on one line, name on the next) are
  skipped by the same-line gate; whether TV accepts that wrap shape for
  declarations is unprobed.
