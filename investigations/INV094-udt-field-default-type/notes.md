# INV094 - UDT field default value type not checked (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/parser/ast.ts` (TypeField += `defaultValue`),
`packages/core/src/parser/parser.ts` (`scanTypeFieldAtCurrent` captures a
literal default), `packages/core/src/analyzer/checker.ts`
(`checkTypeFieldDefaults`, called from the TypeDeclaration case).
**Source:** `../freedom/FINDINGS.md` L-002 - local `pine-lint` LSP false
negative (piners + `--tv` both flag it; we were clean).

## Symptom (false negative)

```pine
//@version=6
indicator("s")
type T
    int x = 1.5   // TV: CE10170. We were silent.
t = T.new()
plot(t.x)
```

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

| probe | TV |
|---|---|
| `int x = 1.5` | CE10170 @ 4:5 - "Default value of type literal float can not be assigned to an argument of type series int" |
| `string b = 1` | CE10170 - "literal int ... series string" |
| `float a = 5` (int into float) | clean - widening |
| `int ok = 3`, `string oks = "hi"`, `bool okb = true` | clean - exact base |

ctx: `defValTypeExpression` = `literal <base>`, `explicitType` = `series <base>`.

## Why it passed

The parser parsed the field line `int x = 1.5` but DISCARDED the `= 1.5` -
`TypeField` had no `defaultValue`, so the default was invisible to the checker.

## Fix

- AST: `TypeField` gains `defaultValue?: Expression`.
- Parser: `scanTypeFieldAtCurrent` captures a LITERAL default (number/string/
  bool) as a `Literal` node. Non-literal defaults stay undefined (lenient). The
  token-walk is otherwise unchanged (additive read of the `= <lit>` tokens) - 0
  parse-failure delta over the corpus.
- Checker: `checkTypeFieldDefaults` (TypeDeclaration case, v6 only) checks each
  captured default against the field's base type with the INV087 element rule
  (exact base, or int->float widening; float->int and base mismatches rejected;
  na/unknown lenient). Field types other than int/float/bool/string are left
  lenient. Emits CE10170 with TV's template.

## Verification

- 2 error probes (messages exact vs TV) + 3 clean controls.
- Regression fixture `regression/udt-field-default-type.pine`.
- `regression-check.mjs` over 1879 corpus fixtures: **0** new appearances, **0**
  parse-failure delta. Full suite: 357 pass.

## Residual

- The error anchors at the field NAME (the only position the field carries),
  not TV's type-keyword column (a ~4-col difference); message + line are exact,
  and corpus occurrences are ~0 so the position-key is moot.
- Only LITERAL defaults are checked; a non-literal default (`int x = someConst`)
  is left lenient.
