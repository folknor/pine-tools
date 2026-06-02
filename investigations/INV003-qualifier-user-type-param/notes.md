# INV003 - `simple <UserType> <name>` parameters dropped during parse

**Status:** Fixed. `parseFunctionParams` now folds a user-defined
type-name (IDENTIFIER) into the type annotation after a qualifier.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV003-qualifier-user-type-param.pine`

## Summary

Method / function parameters declared with a *type qualifier*
(`simple`, `series`) followed by a *user-defined type name* - e.g.

```pine
export method to_string(simple Timezone timezone) =>
    ...
```

never parsed. The qualifier loop in `parseFunctionParams` stops as soon
as it sees a non-keyword (because `Timezone` is an IDENTIFIER, not a
type keyword), then the existing fall-through expects the next token
to be the parameter *name*, swallows `Timezone` as the name, and then
chokes on `timezone` with `Expected ")" after method parameters`. The
body of the method runs with no parameter symbols at all, so every
reference like `timezone == Timezone.Utc` reports
`Undefined variable 'timezone'`.

With the matching builtin-type case (`simple int x`) the second
token is a KEYWORD that the qualifier loop *does* recognise, so this
bug never surfaced for builtin types.

## Repro

Minimal:

```pine
//@version=6
library("t")

export enum Tz
    Utc = "UTC"

export method to_string(simple Tz timezone) =>
    switch timezone
        Tz.Utc => "UTC"
```

Before fix:

```
errors: 2
  7:35 Expected ")" after method parameters at line 7
  8:12 Undefined variable 'timezone'
```

`pine-lint --tv` on the same input: 0 errors, 0 warnings.

After fix: 0 errors.

The `export enum` half of this repro is INV002 - both fixes are needed
for the full library example to come clean.

## Root cause

`packages/core/src/parser/parser.ts`, `parseFunctionParams()`. The
qualifier loop walks tokens while `isTypeKeyword()` returns true.
`isTypeKeyword()` is built from `VAR_TYPE_KEYWORDS` (the eleven
builtin type names) plus `simple` and `series` - a fixed,
keyword-only set. User-defined types are IDENTIFIER tokens; they
never matched.

The downstream consequence is what makes this look like a scope bug.
Once `parseFunctionParams` returns without a `timezone` parameter,
the symbol-table population for the function body never registers the
name, and validation reports every body reference as undefined. Two
real fixture cascades grew out of this single parser hole - 
`fffe6a2f…pine` alone had 95 `Undefined variable 'Timezone'` cascade
hits driven by the same root cause as INV002.

## Fix

After the qualifier loop and after the generic-type (`<…>`) check, if
we still have qualifiers collected *and* the current token is an
IDENTIFIER followed by either another IDENTIFIER or a KEYWORD usable
as a parameter name, peek-then-consume the current IDENTIFIER as
part of the type. The path was previously empty:

```ts
if (
    typeKeywords.length > 0 &&
    this.check(TokenType.IDENTIFIER)
) {
    const next = this.peekNext();
    if (
        next?.type === TokenType.IDENTIFIER ||
        next?.type === TokenType.KEYWORD
    ) {
        typeKeywords.push(this.advance().value);  // user-defined type
    }
}
```

Why this is safe in the corners worth checking:

- `OrderBlock block` (no qualifier, user-type, name) - `typeKeywords`
  is empty, the new check skips, the existing fall-through still
  handles it.
- `simple int x` (qualifier + builtin + name) - the loop already
  consumed both keywords, current is the param-name IDENTIFIER,
  `peekNext()` is `,`/`)`/`=`; the new check does not fire.
- `simple array<Tz> arr` (qualifier + generic with user inner) - the
  generic-type block runs first and welds `<Tz>` onto `array`, leaving
  the current token as `arr` and `peekNext()` as `,`/`)`/`=`; the new
  check does not fire.
- `simple x` (qualifier alone, then param-name) - current is the name
  IDENTIFIER and `peekNext()` is `,`/`)`/`=`, not IDENTIFIER/KEYWORD;
  the new check does not fire.

Verified by minimal repros for each case.

Inline `// see INV003` reference in `parser.ts` points readers here.

## Verification

- Minimal repro above: 2 → 0 errors.
- Full library fixture `fffe6a2f…pine`: combined with INV002, total
  errors 175 → 45, all `Timezone`/`timezone` cascade hits eliminated.
- New regression fixture
  `packages/core/test/fixtures/regression/INV003-qualifier-user-type-param.pine`
  locks the parameter form in. 150/150 tests pass.
- Local-only regression-check showed a net −8 errors on
  `6874e636…pine` (improvement) but +5 newly-visible `Undefined
  variable 'block'` cascade hits - adjacent finding documented below.

## Adjacent findings (not fixed here)

- **`float[]` (and other `T[]`) syntax in method / function
  parameters does not parse.** Visible in `6874e63621f8…pine` from
  line 136 onwards, where the parameter list is
  `(OrderBlock block, float[] opens, float[] tops, …)`. The
  array-suffix syntax is recognised by `parseGenericTypeSuffix` for
  variable declarations but never extended to `parseFunctionParams`.
  Was hidden behind this bug - when the parser couldn't get past
  `simple Tz` it never tried to parse the rest of the list - so it
  only surfaces now that INV003 lets the earlier parameters land.
  Separate investigation.
- **Bool parameters are typed as `series<float>` for `and`/`or`
  inference.** Visible in `2387d4e1…pine:97` - 
  `getCond(bool var1, simple Operator op, bool var2)` now parses,
  and the body `Operator.all => var1 and var2` reports
  `Operator 'and' requires bool operands, but left operand is
  series<float>`. Falls under task #9 (type inference produces
  non-bool where TV produces bool). Not unique to INV003 - it just
  newly affects this fixture.

## Methodology notes captured

- "New error appearances" in the regression check after a parser fix
  are almost always *previously-masked* bugs whose visibility was
  gated on the fix. Count the net change before pattern-matching them
  as regressions.
- `find-real-failures.mjs` and the local baseline are a pair. If you
  re-run one (refreshing the TV reference), re-snap the other
  (`snapshot-local-lint.mjs`) before reading the regression report,
  or the `tvSilent` annotation will misclassify all disappearances.
