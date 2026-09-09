# INV183 - the expected-type noun for PLAIN (non-union) parameters

**Date:** 2026-09-09
**Status:** fixed
**Source:** `notes/todo.md` #84, second bullet - filed as a single-function
oddity (`ta.highest`'s `length`) and found to be general.
**Fixture:** `packages/core/test/fixtures/regression/INV183-plain-param-expected-noun.pine`

## What the bullet said, and what it actually was

#84 recorded that `ta.highest`'s `length` is `series int` in both scraped
overloads while TV quotes `simple int`, called it "a G002-shape data
disagreement", and noted that INV171's noun probe covers union parameters only.

That was right about the shape and wrong about the size. The trigger for
re-opening it was incidental: INV182's fixture passed nine arguments through
`str.length`, and TV quoted `const string` as the expected type where our data
says `series string`. Two functions with the same disagreement is not a quirk,
so the population was measured rather than guessed at.

**Of 637 plain scalar parameters measured, 93 (15%) disagree with their
documented type.** By shape:

| doc type | TV says | n |
|---|---|--:|
| `series string` | `simple string` | 42 |
| `series string` | `const string` | 19 |
| `series int` | `simple int` | 12 |
| `unknown` | `simple int` | 6 |
| `series int` | `const int` | 4 |
| `series color` | `const color` | 2 |
| other | | 8 |

So it is concentrated, not scattered: the `str.*` family is documented `series
string` throughout and TV answers `simple` or `const` per function, with no way
to tell which from the catalog. That is exactly the union case's problem one
level down.

## The load-bearing check: is the noun a constant?

A noun that varied with the ARGUMENT could not be baked into pine-data at all.
INV171 established the noun is a per-function/per-parameter constant for union
parameters; that does not automatically transfer, so it was re-checked here.

```pine
//@version=6
indicator("t")
float c = 1.0
float s = close
plot(str.length(str.match(c, "a")) + str.length(str.match(s, "a")))
```

TV (2026-09-09) answers `simple string` for BOTH - once against a `const float`
argument and once against a `series float` one. The nine arguments of differing
qualifier in INV182's fixture give the same result on `str.length`: `const
string` every time. The noun is a property of the parameter, so it is bakeable.

## Fix

The INV171 probe already had the right machinery; it just could not see these
parameters, because its census asked `scalarUnionMembers(p.type)` and a plain
type has no `/`. The census now also accepts a plain scalar as a one-member
list, which took it from 381 parameters to 946 (859 probeable, 839 measured).

`generate.ts` needed no change - `probedParamNoun` was always keyed by
`fn.param` and merges into the same `expectedTypeNoun` field.

In the checker, the four sites that quoted `param.rawType ?? String(param.type)`
as the expected noun now go through `expectedNounFor(fn, param, docType)`, which
prefers the measured noun and falls back to the doc type. The overload
resolver's non-union branch does the same.

### Renamed, because "union" stopped being true

`scripts/probe-union-type-nouns.mjs` -> `scripts/probe-param-type-nouns.mjs`
and `pine-data/raw/v6/union-type-nouns-probe.json` ->
`param-type-nouns-probe.json`, with `unionParamExpectedNoun` ->
`paramExpectedNoun`. AGENTS.md documents this file in the standard refresh
sequence and describes what it holds, so leaving the old name would have made a
must-be-true document false. The pointers in INV171 and INV181 were updated so
they resolve, and INV171 records the rename.

## Verification

- Sweep: 839 parameters measured (202 union, 637 plain), controls clean.
- `ta.highest.length` -> `simple int`, the case #84 named.
- Fixture: four functions, four different measured nouns, all matching
  `pine-lint --tv` byte for byte.
- `pnpm test`: 491 pass.
- `regression-check` over 1879 fixtures: **unchanged** - still exactly the 20
  INV182 message rewordings, and every one of those changed only the ARGUMENT
  half. So this fix touched no corpus file.

**That last point is worth stating rather than glossing.** The corpus cannot
verify this change: it contains no type error on any of the 93 affected
parameters. The evidence is the probe sweep and the fixture, not the corpus -
the same lesson INV175 recorded when LNT-11 "could not have come out of a
corpus differential". A green corpus here means "no regression", not
"confirmed".

## Fixtures corrected

`regression/INV013-polymorphic-arg-typecheck` asserted `series int` for
`math.round`'s `precision`, quoting the documented type. TV says `simple int`,
probed directly. The fixture had been right only because we quoted the same
doc type it did.

## Noted, not fixed

TV renders a float literal argument as `1` where we render `1.0`
(`argUserFriendlyRepresentation`, seen on `str.length(1.0)`). Unrelated to the
noun and left alone - filed in todo #84.
