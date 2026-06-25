# INV108 - nested function/method definition (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/parser/parser.ts` (`localScopeDepth` counter +
the `statement()` arrow-detection guard).
**Source:** `../freedom/FINDINGS.md` L-006 - "local pine-lint does not reject a
nested function definition". piners errors; `--tv` errors. We accepted it.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
f() =>
    g() =>
        1
    g()
plot(f())
```

A function definition (`g() => ...`) nested inside another function body. Pine
permits function and method DECLARATIONS only at module scope. We parsed the
nested `g() =>` as a normal FunctionDeclaration and reported no error.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

Probe = the script above (`pine-lint --tv -c '...'`):

```json
{"success":true,"result":{"errors":[{"code":"CE10156",
"ctx":{"value":"\"=>\""},"end":{"column":9,"line":4},
"message":"Syntax error at input {value}","start":{"column":9,"line":4}}],
...}}
```

So TV rejects with **CE10156 `Syntax error at input "=>"` at line 4, column 9**
(anchored at the nested arrow). `success:true` and the errors list is non-empty,
so TV genuinely answered.

## Root cause + fix

The function-definition detector in `statement()` (`name(params) =>`) fired the
same at module scope and inside a body, because function/method/if/for/while
bodies all parse their statements by recursing into `statement()`. There was no
notion of "current scope depth".

Fix: a `private localScopeDepth` counter, incremented (try/finally) around every
local-body statement loop - `functionDeclaration`, `methodDeclaration`, and
`parseIndentedBlock` (if/else/for/while). In `statement()`, once a `=>` is
confirmed after `name(params)` and `localScopeDepth > 0`, throw the CE10156
wording anchored at the arrow (we `check` the arrow instead of consuming it, so
`peek()` is the arrow and the recorded position is the arrow's line:col).

The throw sits inside the param-parse `try` whose `catch` normally backtracks a
mis-detected call. A backtrack there would re-parse the line as a call and the
arrow would surface as the vaguer "Unexpected token: =>". So the catch
re-throws our sentinel message (`NESTED_FUNC_DEF_ERROR`) instead of swallowing
it - a confirmed `params + ) + =>` match is a real definition, not a call.

The inline single-line body (`f() => a, b`) parses via `expression()`, which
never detects a `name(params) =>` definition, so no guard is needed there.

## Verification

- Regression fixture `regression/INV108-nested-function-definition.pine` pins
  CE10156 at line 4, column 9 (`parse: fail`). Output matches TV's position and
  wording byte-for-byte.
- `regression-check.mjs`: **0 corpus changes** - no published script nests a
  function definition (they are invalid Pine), so there is no FP risk.
- Full vitest suite green (371 tests).

## Residual

- Recovery after the rejected definition advances to the next NEWLINE only, so
  the rejected definition's body lines parse at the outer scope and can produce
  downstream cascade diagnostics (`Could not find function 'g'` at the later
  `g()` call; an `Undefined variable` for a body that referenced the now-absent
  params). TV stops at the first error so it never emits these; they are
  recovery artifacts, not wrong (the name truly is undefined once its
  declaration is rejected). Tightening recovery to skip the whole rejected body
  is a future nicety, not a correctness gap.
