# INV096 - enum member values untyped, so enum misuse not caught (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/parser/ast.ts` (EnumDeclaration += `members`),
`packages/core/src/parser/parser.ts` (capture enum member names),
`packages/core/src/analyzer/checker.ts` (`enumMemberNames` map +
`recordEnumMembers`; type `E.member` in `inferExpressionType`).
**Source:** `../freedom/FINDINGS.md` F-036 - local `pine-lint` LSP false
negative (the `==` operand-type gap; TV flags it, we were silent/warned).

## Symptom (false negative)

```pine
//@version=6
indicator("s")
enum E
    a
    b
x = E.a == 1   // TV: CE10123. We were silent.
```

`E.a` (and any variable assigned it) typed as `unknown`, so EVERY operator
check short-circuited - `E.a == 1`, `E.a + 1`, and the variable form all passed.
The parser did not even capture enum member names (`EnumDeclaration.fields` was
undefined).

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

TV types an enum value as `const E`:

| probe | TV |
|---|---|
| `E.a == 1` | CE10123 @ expr1 - "literal int" used but "const enum" expected |
| `E.a + 1` | CE10123 @ expr0 - "const E" used but "const int" expected (arithmetic on an enum is rejected) |
| `v = E.a` then `v == 1` | CE10123 - the variable carries `const E` too |
| `E.a == E.b` | clean (`const bool`) |

## Fix

- Parser/AST: `EnumDeclaration` gains `members: string[]`; the type/enum body
  scanner collects member names.
- Checker: `enumMemberNames` (enum name -> member set), populated when an enum
  is registered. `inferExpressionType` types `E.member` (member must be real)
  as the enum NAME, e.g. `"E"` - the same convention UDT instances use.

Once typed, the EXISTING operator machinery does the rest: `areTypesCompatible`
treats `E` as a distinct non-numeric type, so `E.a + 1` is rejected through the
arithmetic path (matching TV's CE10123 "const E" exactly) and `E.a == 1` /
`v == 1` through the `==` incompatibility path. `E.a == E.b` (same type) and a
`switch` over an enum stay clean.

## Verification

- Probes match: `E.a + 1` is EXACT vs TV (CE10123, "const E", expr0); the `==`
  cases are caught (see residual on wording).
- Regression fixture `regression/enum-operand-type.pine` (3 errors + valid
  comparisons + a switch-over-enum control, all clean).
- `regression-check.mjs` over 1879 corpus fixtures: **0** new appearances, **0**
  disappearances, **0** parse-delta - typing enum values broke nothing and the
  corpus has no enum misuse. Full suite: 359 pass.

## Residual

- The `==`/`!=` enum mismatch is reported with our own "Type mismatch: cannot
  apply '==' to E and int" wording, not TV's CE10123 "const enum" template
  (the `==`/`!=` operator path was never aligned to CE10123, unlike the
  arithmetic/bool paths - INV083/INV084). Aligning `==`/`!=` generally is a
  separate, broader change (it touches every `==` type error, e.g. the already
  -caught `close == "x"`); tracked as the F-036 wording follow-up.
- An invalid enum member (`E.notReal`) is not typed as the enum (left as-is) -
  member-existence validation is out of scope here.
