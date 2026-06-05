# INV039 - CE10125: enum field values must be string literals

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FN `Incorrect field type "LINEAR" of enum "Scale"...`
(1 record) from the 2026-06-05 inventory. Also explains the
`Cannot read properties of undefined (reading 'pinePos')` record (1) -
see below. Task tracker #8.

## Claim

`enum Scale` with `LINEAR = 0` is illegal: enum field values must be
STRING literals (they are display titles). The corpus carrier is our
own `syntax/enums.pine` fixture's "Enum with explicit values" example,
which asserted the wrong thing.

## Probes (pine-lint --tv, 2026-06-05; scripts in probes/)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `enum Scale` / `LINEAR = 0` / `LOG = 1` | CE10125 `Incorrect field type "LINEAR" of enum "Scale". Unexpected type: "literal int". Expected type: "literal string"` at 4:5-4:14 (field name through value) - first bad field only (TV stops at the first error). PLUS a CE10294 at the same span: `Cannot read properties of undefined (reading 'pinePos')` - a TV-SIDE CRASH STRING accompanying the enum error, not a real diagnostic. This is the inventory's mysterious 'pinePos' record. |
| p02 | string values (`LINEAR = "Linear"`) | clean; fields carry `title` |
| p03 | bare fields | clean |

## Implementation

The parser's type/enum body skip loop (typeOrEnumDeclaration) now
inspects enum field lines: `IDENT = <NUMBER|BOOL>` pushes the CE10125
message anchored at the field name, with the literal class rendered
TV-style ("literal int" / "literal float" via the raw lexeme's
[.eE] - the INV032 rule - / "literal bool"). One error PER bad field
(TV only shows the first because it stops; ours past the first are the
usual more-correct stance). String values and bare fields untouched.

Corpus outcome: 3 appearances in the carrier (17:5 TV-confirmed,
18/19 past TV's stop, same shape). `syntax/enums.pine` switched to
legal string values; the rule is locked by the regression fixture.

Fixture: `packages/core/test/fixtures/regression/INV039-enum-field-type.pine`

## The pinePos record

TV's CE10294 `{message}` = "Cannot read properties of undefined
(reading 'pinePos')" is a crash echo TV emits alongside CE10125 at the
same span - reproduced deterministically by p01. It is TV-side noise,
not a diagnostic to implement; with CE10125 matched at that position,
the pair lands in the same-position channel instead of tv-only.

## Residual

- Enum fields are still not in the AST (the body remains a skip);
  field VALUES with non-literal expressions (`A = close`) are
  unvalidated - probe before extending.
