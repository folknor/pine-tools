# INV106 - function-body implicit-return if/switch branch types (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (FunctionDeclaration +
MethodDeclaration body tail).
**Source:** `../freedom/FINDINGS.md` F-024 residual - the direct
ternary/switch/if-EXPRESSION cases were already caught (INV070); the
function-BODY implicit return was the gap.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
f(c) =>
    if c
        42
    else
        "no"
x = f(true)
```

The function's implicit return is an if whose branches yield int vs string. We
were silent; TV rejects.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

```json
{"code":"CE10235","ctx":{"blocks":"literal int; literal string"},
 "start":{"column":5,"line":4}}
```

(`success:true`. Same CE10235 as the if/switch-expression branch check.)

## Root cause + fix

`checkIfSwitchBranchTypes` (INV070) already handles the IfStatement shape
(consequent/alternate), but it was only called from the if/switch-EXPRESSION
path. `if` in return position parses as an IfStatement, so it was never reached.
Fix: after validating a function/method body, if the trailing statement is an
IfStatement, run `checkIfSwitchBranchTypes` on it (the tail is the implicit
return value). A switch tail is a SwitchExpression and was already covered.
Branches that don't end in an expression (assignments, void calls) contribute
no type, so a side-effect trailing if stays clean.

## Verification

- Regression fixture `regression/INV106-function-body-if-return-types.pine`
  (incompatible-branch function flagged + a compatible-branch function control,
  exactly 1 error).
- `regression-check.mjs`: 0 new appearances. Full suite green.
