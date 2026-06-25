# INV086 - direct self-recursion is CE10271 (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (`currentFunctionName`
field + FunctionDeclaration body wrap + the `!signature` Identifier
CE10271 branch).
**Source:** `../freedom/FINDINGS.md` D-003 - differential testing of
`piners validate` surfaced this as a gap shared by piners AND our LSP
(only `--tv` flagged it). Adjudicated against our reference + TV.

## Symptom (false negative)

Pine v6 forbids recursion. A function that calls itself in its own body
was accepted by our checker:

```pine
//@version=6
indicator("s")
f(n) =>
    n <= 0 ? 0 : f(n - 1)
plot(f(5))
```

We were silent; both `pine-lint --tv` and the local LSP pine-lint flag
it. The self-call `f(n - 1)` reaches the `!signature` undefined-callable
branch, but `f` was already in `declaredFunctionNames` (added before its
own body is validated, see INV036), so the CE10271 check did not fire.

## TV's model (probe, `pine-lint --tv`, 2026-06-25)

Probe = the script above (`strategies/typecheck-gaps/disc_recursion.pine`).
TV output:

```json
{"success":true,"result":{"errors":[{"code":"CE10271",
"ctx":{"fullName":"f","kind":"function or function reference"},
"start":{"column":18,"line":8},"end":{"column":18,"line":8},
"message":"Could not find {kind} '{fullName}'"}], ... }}
```

TV reached (it disagreed with our pre-fix silence), so the FN is real. TV
anchors at the self-call (`f` at line 8, col 18). The error arises because
the function's name is not yet bound while its own body compiles - hence
the "could not find" wording rather than a dedicated recursion message.

Scope: this is DIRECT self-recursion. Mutual recursion (`f -> g -> f`) is
already caught by the source-order rule - when `f`'s body is validated,
`g` is not yet declared, so the call to `g` is the existing CE10271. The
gap was only the direct self-reference, where the name IS in
`declaredFunctionNames`.

## The overload trap (why a name-only match is wrong)

A first, name-only implementation (`callee === currentFunctionName`)
regressed the corpus: it raised 11 false positives, all in one published
color library
(`fixtures/0c0532...`, an overload-heavy TradingView lib). Every hit was
an OVERLOADED function whose 1-arg `(source)` overload dispatches to its
4-arg `(r,g,b,t)` sibling:

```pine
export getHexString(series float r, series float g, series float b, series float t = 0.0) => ...
export getHexString(series color source) =>
    [r, g, b, t] = getRGB(source)
    getHexString(r, g, b, t)   // sibling overload, NOT recursion
```

A self-named call from inside one overload dispatches to a SIBLING
overload by arity/type - it is not recursion, and TV accepts it. Probes
(`probes/`, `pine-lint --tv`, 2026-06-25):

| probe | script | TV |
|---|---|---|
| overload-sibling-dispatch.pine | two `toHex` overloads, the `color` one calls the 3-float one | **clean** (both overloads resolved; TV returned full fn info, so it reached them) |
| true-self-recursion.pine | single `f(n) => ... f(n-1)` | **CE10271** @ line 6 col 18 |

So the check must fire ONLY for names declared exactly once. A pre-pass
over `ast.body` tallies top-level `FunctionDeclaration` names and records
those declared 2+ times in `overloadedFunctionNames`; the self-call check
skips them. (Residual, left lenient: a genuinely recursive call inside an
OVERLOADED function is not flagged - acceptable, recursion in an
overload set is rare and the alternative is the realized FP wave.)

## Fix (checker)

A `currentFunctionName` field tracks the UDF/method whose body is being
validated (saved/restored around the body-validation loop in the
FunctionDeclaration case, so it is null at top level and nests safely).
The `!signature` Identifier branch now emits CE10271 when the callee
equals `currentFunctionName` AND the name is not overloaded (see the
overload trap above), in addition to the existing
not-in-`declaredFunctionNames` condition - same code, position, and
wording as TV. Member-expression self-calls (`obj.method()`) are out of
scope (they don't hit the Identifier branch); the corpus repros and TV's
common case are the bare-identifier form.

## Verification

- Probe: `strategies/typecheck-gaps/disc_recursion.pine` (in the freedom
  repo). Local pine-lint now emits CE10271 at line 8 col 18 - position +
  message EXACT vs TV.
- Regression fixture:
  `regression/self-recursion-ban.pine` - the recursive `f` is flagged,
  and a non-recursive control (`g`, `h` calling an earlier UDF) stays
  clean.
- `regression-check.mjs` over 1879 corpus fixtures: the name-only version
  added 11 FPs (all in the one overloaded library); the overload-aware
  version adds **0** net changes. Full suite: 349 pass.
