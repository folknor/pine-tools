# INV002 - `export enum` and `export type` were never parsed

**Status:** Fixed. Parser now dispatches `export enum`/`export type` to
the same body-parser as their non-exported forms.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV002-export-enum-and-type.pine`

## Summary

A Pine v6 library declares its public surface with `export`. For
functions and methods that meant `export funcName(...) =>` and
`export method methodName(...) =>`. Types and enums use the same form:
`export enum Foo` and `export type Bar`. Our parser handled the first
two but never the second two - `exportDeclaration()` only checked for
`method`; everything else fell into the "function declaration" path
and tripped the `Expected function name after 'export'` consume.

Downstream effect was severe. Because the failed parse never produced
an `EnumDeclaration` / `TypeDeclaration` node, the symbol-collection
pass never registered the name. Every subsequent reference like
`Timezone.Utc` looked up `Timezone`, found nothing, and reported
`Undefined variable 'Timezone'`. A single library fixture in the
corpus (`fffe6a2f…pine`) accounted for 95 of these cascade hits all by
itself.

## Repro

Minimal:

```pine
//@version=6
library("test")

export enum Tz
    Utc = "UTC"
    Exchange = "Exchange"

x = Tz.Utc
```

Before fix:

```
errors: 2
  4:8 Expected function name after 'export' at line 4
  8:5 Undefined variable 'Tz'. Did you mean 'nz'?
```

`pine-lint --tv` on the same input:

```
errors: 0
warnings: 0
```

After fix:

```
errors: 0
```

## Root cause

`packages/core/src/parser/parser.ts`, `exportDeclaration()` only knew
about `export method …` and the implicit `export funcName(…) => …`
form. Tokens after `export` that weren't `method` or an identifier
landed on `consume(IDENTIFIER, "Expected function name after 'export'")`
and were reported as parse errors. The body of the enum/type was then
treated as ordinary statements (or silently swallowed) and the
declaration AST node was never produced.

## Fix

Extracted the `type`/`enum` body-parsing logic out of `statement()`
into a new `typeOrEnumDeclaration(kind)` method, and made
`exportDeclaration()` dispatch to it when the next token is `enum` or
`type`. `statement()` now also calls the helper, so the two entry
points share one implementation. The `// see INV002` comment in
`exportDeclaration()` names this investigation for future readers.

The AST node returned by the exported form is the same
`TypeDeclaration` / `EnumDeclaration` shape as the non-exported form.
There is no `isExport` flag on those node types today - the linter
doesn't need one yet, since the only consumer is the symbol-table
registration that fires for both cases identically. If a future check
needs to know "was this declaration exported?", add the flag then.

## Verification

- Minimal repro above: 2 errors → 0.
- Full library fixture (`fffe6a2f…pine`): 95 `Undefined variable
  'Timezone'` errors → 1, and total errors 175 → 49.
- The regression fixture asserts the minimal repro stays at 0 errors.

## Adjacent finding (not fixed here)

`fffe6a2f…pine:130` retains one error: `Undefined variable 'timezone'.
Did you mean 'Timezone'?`. The expression site is line 130 of the
method body:

```pine
export method to_string(simple Timezone timezone) =>
    switch timezone        // <- 'timezone' not in scope
        Timezone.Utc => "Etc/UTC"
```

The parameter `timezone` is declared with the type-qualifier syntax
`simple Timezone timezone` (`simple` qualifier, `Timezone` type,
`timezone` name). The parser appears not to be registering this
parameter in the method body's scope - likely because the
`simple <type> <name>` form isn't fully handled by
`parseFunctionParams`. That's a separate investigation.

## Methodology notes captured

- Reducing from the original 95-hit cascade to a 2-line repro took
  three attempts; each cut a layer. The lesson: when a cascade
  produces N hits in one file, almost always exactly one syntactic
  feature is the trigger and the rest is collateral. Cascade noise is
  evidence about parser fragility, not breadth of bug.
- When the parser emits "Expected X after Y" and downstream errors
  follow, treat the first parser error as the seed and don't assume
  the cascade represents independent bugs.
