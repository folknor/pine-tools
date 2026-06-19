# INV068 - qualifier + identifier-type + `[]` param mis-parsed (false parse error)

**Date:** 2026-06-19
**Status:** fixed
**Code:** `packages/core/src/analyzer/../parser/parser.ts` (parseFunctionParams,
the INV003 qualifier+identifier-type branch)

## Symptom (false positive - parse error TV doesn't emit)

A function/method parameter written as `<qualifier> <identifier-type>[] <name>`
failed to parse:

```pine
//@version=6
f(simple linefill[] arr) => array.size(arr)   // we: Expected ")" after
                                              //     function parameters
                                              // TV: clean (probed 2026-06-19)
```

`line[]`, `label[]`, `box[]`, `table[]` always worked; `linefill[]`,
`polyline[]`, and user/import types (`Pt[]`, `lib.T[]`) did not. The split is
purely lexical: `line/label/box/table` are hardcoded type-KEYWORDS
(`constants/keywords.ts`), so the qualifier loop in parseFunctionParams consumes
them and the existing `[]` glue (INV004) fires. `linefill`/`polyline` (newer
built-in object types) and all user types lex as IDENTIFIER, so the qualifier
loop stops at them and the INV003 "qualifier + identifier-type + name" branch
takes over - but that branch only continued when the token after the type was
`.`, IDENTIFIER, or KEYWORD. With `[` next, it left the type identifier to be
mistaken for the param name, and `[` then broke the param list.

## How it surfaced

The #48/library-vendoring work (INV067): `generate-libraries.ts` quarantined 5
of the vendored MPL-2.0 libraries because our parser couldn't parse them. Three
were this exact bug - `HeWhoMustNotBeNamed/arrays/1`, `arrayutils/10`,
`arrayutils/21` - all with `export delete(simple linefill[] arr, int index)`
style overloads.

## Fix

One condition: add `next?.type === TokenType.LBRACKET` to the INV003 branch so a
qualifier-led identifier type with an array suffix is collected as the type
(the `[]` is then appended by the existing INV004 glue just below). Structural,
version-agnostic, no type table needed - it mirrors how `simple Tz timezone`
(INV003) and `float[] xs` (INV004) are already handled.

## Verification

- TV (`pine-lint --tv`, 2026-06-19): `f(simple linefill[] arr)` clean - so the
  pre-fix parse error was a false positive (INV001-class over-strictness).
- 1 regression fixture (`regression/INV068-qualified-identifier-array-param`):
  `simple linefill[]` (built-in object type) + `series Pt[]` (user type), local
  == TV clean.
- The 3 quarantined libraries now parse with 0 errors and contribute their
  export sets (libraries.json 84 -> 87).
- `regression-check.mjs`: 0 changes over 1879 fixtures (the LBRACKET branch
  doesn't disturb any existing parse). Full suite passes.

## Sibling quarantine residue (separate bugs, still quarantined)

The library-export quarantine had 5 entries; this fixed 3. The other 2 are
distinct parser gaps:
- `RicardoSantos/FunctionZigZagMultipleMethods/1`: uses `method` as a regular
  function NAME (`export method(int idx) =>`). TV accepts a function named
  `method` (probed - p02); our parser always treats `method` as the
  method-declaration keyword. -> INV069.
- `TFlab/FVGDetectorLibrary/1`: a `switch` arm whose body expression WRAPS to
  the next line (`'Defensive' => (...)` / `  and (...)`) - the free-form
  continuation / statement-bodied switch-arm class (piners documents the same;
  ties to INV066). Not yet addressed.
