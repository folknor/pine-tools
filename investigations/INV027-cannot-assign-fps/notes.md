# INV027 - "Cannot assign * to *" FP cluster

**Status:** resolved 2026-06-04. Four distinct bugs behind the 13-hit
"Cannot assign * to *" confirmable FP category (6 files). All six files
lint clear at those positions now; TV probes for every pattern recorded
below.

## Bug 1 - generic placeholder returns leak into checks

`matrix.transpose` has no flags; its static return is the raw
placeholder `matrix<type>`, which flowed into `mT := matrix.transpose(m)`
as "Cannot assign matrix<type> to matrix<bool>" (6 hits, 3 files - all
`matrix.new<bool>` probe scripts). Fixed in `checker.ts`: a static
return of `type` / containing `<type>` resolves the placeholder from
the first concretely-typed `array<T>`/`matrix<T>` argument
(`matrix.transpose(matrix<bool>) -> matrix<bool>`); with no resolvable
collection arg it yields `unknown` - the placeholder never reaches
compatibility checks. The polymorphic 'element' extraction path got the
same hygiene (extracting `type` out of `array<type>` previously
returned the bare placeholder).

## Bug 2 - request.security_lower_tf's array<type>

`request.security_lower_tf` returns static `array<type>`; the element
type follows the `expression` argument (same idea as the existing
`request.security` special case, plus the array wrapper). Unresolved,
`sub = request.security_lower_tf(..., close)` made `array.max(sub)`
infer the bare placeholder: "Cannot assign type to float" (2 hits,
1 file). Added the special case next to request.security's.

## Bug 3 - comma-declaration annotation leak

`bool show_div = input.bool(...), div_len = input.int(10, ...)`: the
parser's comma-sequence loop passed the previous unit's type annotation
to annotation-less units ("inherits last type"), so `div_len` became
bool -> "Cannot assign int to bool" at the declarator plus knock-on
errors at every use (4 hits, 1 file). TV binds an annotation only to
the unit it directly precedes (probes a/b below). The untyped branch
now passes no annotation; the unit types from its initializer.

## Bug 4 - blank lines inside a wrapped ternary

```pine
color finalMaColor =

     aboveBoth

         ? color.new(overMaColor, 0)

     : ...
```

The `?`-at-line-start continuation looked exactly one token past the
NEWLINE, so a blank line (two consecutive NEWLINE tokens) ended the
expression: the declaration captured just `aboveBoth` ("Cannot assign
bool to color", 1 hit) and the `? ...` / `: ...` lines became
"Unexpected token" parse errors. TV joins the whole wrap (probe c).
The ternary lookahead now scans past consecutive NEWLINEs.

## Probes (`pine-lint --tv`, 2026-06-04, files in this directory)

All accepted by TV (`success:true`, no errors); each disagrees with our
pre-fix validator, confirming they reached TV:

- `probe-a-comma-annotation.pine` - the published pattern. TV:
  `show_div` **input bool**, `div_len` **input int**, `lookback`
  input int.
- `probe-b-comma-annotation-each.pine` - `bool a = true, b = 1`. TV:
  `a` **const bool**, `b` **const int** - annotation does not span
  units.
- `probe-c-blank-line-wrap.pine` - blank lines between every wrapped
  ternary line. TV: joins the wrap, `finalMaColor` **series color**
  (definition end column 87 on line 3 = the joined logical line, G005).
- `probe-d-matrix-transpose.pine` - TV: `m` and `mT` both
  **matrix<bool>**, the transpose assignment is fine.
- `probe-e-lower-tf-array-max.pine` - TV: `sub` **array<float>**
  (element follows the expression arg), `subHi` series float.

## Verification

- Regression fixture:
  `packages/core/test/fixtures/regression/INV027-cannot-assign-fps.pine`
  (all four patterns, `@expects no-errors`).
- All 6 cluster files clear; 254/254 tests.
- Corpus diff: 46 appearances, all undefined-variable shifts in 2
  files explained by the now-TV-correct blank-line wrap joining:
  `1f9c3031…` (versionless legacy script - the joined ternary exposes
  bare `green`/`red`, the documented legacy-color limitation) and
  `6874e636…` (hard-truncated at ~100 cols - its `bull_ob` declaration
  is cut mid-call; this is the file TV never returns a verdict for).
  56 "TV-also-flagged" disappearances: 55 in `6874e636…` (no TV verdict
  exists), 1 in `13a74513…` at 394:9 - past TV's stop point (its only
  error is INV025's CE10017 at 372:1), and it was the type-placeholder
  FP this INV fixes.

## Side observation

`6874e636…`'s tvUnparseable status may not be a transient (TODO's open
question says "a retry succeeds"): the file is hard-truncated mid-token
all over, so TV plausibly chokes on it deterministically. Worth a
manual `--tv` retry next time the inventory runs.
