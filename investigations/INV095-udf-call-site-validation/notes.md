# INV095 - user-function call sites not validated (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` - `validateUserFunctionCall`
(called from the `!signature` Identifier branch), `methodDeclaredNames` set
(populated in the pre-pass).
**Source:** `../freedom/FINDINGS.md` L-001 (and F-031's arg variant) - local
`pine-lint` LSP false negative (piners + `--tv` both flag it; we were clean).

## Symptom (false negative)

The checker validated builtin calls but did NO validation on user-function
calls - arg count, arg type, or otherwise:

```pine
//@version=6
indicator("s")
f(int x) =>
    x + 1
y = f("hello")   // TV: CE10123. We were silent.
plot(y)
```

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

UDF call errors reuse the SAME codes/templates as builtins, with the UDF name
as `funId`:

| probe | TV |
|---|---|
| `f(int x)` called `f("hello")` | CE10123 @ 5:7 - arg "x"="hello", literal string used but "series int" expected |
| `f(int x)` called `f(1, 2)` | CE10115 @ 5:8 - too many args, passed 2 expected 1 |
| `g(a, b)` called `g(1)` | CE10165 @ 5:6 - No value assigned to the "b" parameter in g() |
| `f(5)`, `g(1,2)`, `f(x=7)`, `f()` (default) | clean |

A UDF param `int x` is rendered "series int" (UDF params default to the series
qualifier).

## Fix (checker)

`validateUserFunctionCall` uses the param signatures already captured for the
redefinition check (INV091's `functionDeclSignatures`). Deliberately
conservative, to avoid FPs on a surface that is everywhere:
- Only NON-overloaded UDFs (exactly one captured signature).
- Skip names also declared as a METHOD (see the trap below).
- Count checks (CE10115 too-many, CE10165 missing-required) gated on
  `parserClean`, so a recovery-truncated call cannot misfire. Required = params
  without a default; provided = positional index in range OR a matching named
  arg.
- Arg-type checks (CE10123) only on TYPED PRIMITIVE params
  (int/float/bool/string/color) via `isAssignable`; untyped, UDT, and
  collection params are left lenient. Positional args only.

## The method-overload trap (corpus FP, fixed)

First cut raised 3 FPs in one published library (`c3dd71...`): `valueAtTime`
is declared BOTH as a `method` (line 166) and a plain `function` (line 191) - a
legal TV overload. Methods parse as a SEPARATE node (`MethodDeclaration`), so
`functionDeclSignatures` held only the function overload, making the name look
non-overloaded; a method call written with an explicit receiver
(`valueAtTime(data, ...)`, a valid form) was then checked against the wrong
(function) overload and flagged. Fix: collect `MethodDeclaration` names in the
pre-pass and skip UDF validation for any name that is also a method.

## Verification

- 3 error probes (positions + messages exact vs TV) + clean controls (exact
  call, named args, default param).
- Regression fixture `regression/udf-call-validation.pine`.
- `regression-check.mjs` over 1879 corpus fixtures: the first cut raised 3 FPs
  (the method-overload case); after the method-name guard, **0** new
  appearances. Full suite: 358 pass.

## Residual

- Overloaded UDFs and function/method-shared names are left unchecked (lenient).
- Named-arg TYPES are not checked (only positional); the simple/series
  qualifier on a UDF param is not enforced (isAssignable is lenient
  series->simple, as elsewhere - cf. INV088); float->int narrowing into a UDF
  int param is also lenient (the general isAssignable leniency).
