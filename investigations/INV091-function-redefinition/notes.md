# INV091 - function redefinition not caught (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` - `functionDeclSignatures`
field + `checkFunctionRedefinition`, called from the FunctionDeclaration case.
**Source:** `../freedom/FINDINGS.md` L-003 - local `pine-lint` LSP false
negative (piners + `--tv` both flag it; we were clean).

## Symptom (false negative)

```pine
//@version=6
indicator("s")
f() =>
    1
f() =>
    2
plot(f())
```

Two declarations of `f` with the same signature: TV errors, we were silent.

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

Same-arity declarations are illegal UNLESS distinguishable by explicit param
type. THREE codes, all anchored at the `(` of the second declaration (col 2):

| probe | TV |
|---|---|
| `f()` / `f()` (arity 0) | CE10112 @ 5:2 - "Either the type or the number of required parameters ... must be different." |
| `f(x)` / `f(x)` (same arity, untyped) | CE10113 @ 5:2 - "... overloads using the same number of required parameters without them having distinct types ..." |
| `f(int x)` / `f(int y)` (same explicit type) | CE10110 @ 5:2 - "... overloads with the same parameters. The type of parameters must be different ..." |
| `f(int x)` / `f(string x)` (different types) | clean - legal overload |
| `f(int x)` / `f(x)` (one typed, one untyped) | clean - an untyped param is `undetermined`, distinct from any concrete type |
| `f(x)` / `f(x, y)` (different arity) | clean |

## Fix (checker)

`checkFunctionRedefinition` keeps a per-name list of declared param signatures.
For each prior same-arity declaration, the new one is a valid overload iff some
position is "distinct": both typed with different type names, OR exactly one
typed. If NO position is distinct it is a redefinition; the code is chosen by
typing - arity 0 -> CE10112, all params typed -> CE10110, else -> CE10113.
v6 only (G004). Methods need no special-casing: a method's typed receiver makes
same-named methods on different types distinct at position 0.

## Verification

- 3 error probes (positions + messages exact vs TV) + 3 clean controls.
- Regression fixture `regression/function-redefinition.pine`.
- `regression-check.mjs` over 1879 corpus fixtures: **0** new appearances (real
  overloaded corpus functions are type-distinct). Full suite: 354 pass.

## Residual

- Type-distinctness compares param type-annotation NAMES (`int` vs `string`,
  `Foo` vs `Bar`); a qualifier-only difference (`simple int` vs `series int`)
  is treated as the same type - matches the common case, unprobed at the edge.
- Only direct FunctionDeclaration redefinition; a function vs same-named
  builtin shadow is a separate check (CE10190/INV023).
