# INV036 - CE10271: Could not find function or function reference

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FNs `Could not find function or function reference
'ma'` / `'nonExistentFunction'` (2 records in 2 files) from the
2026-06-05 inventory. Task tracker #5.

## Claim

TV errors on calls whose identifier callee resolves to nothing: `ma(...)`
in `0e07a77c…` (the file defines `ma_function` but calls `ma` - a real
authoring bug TV catches) and our own synthetic
`x = nonExistentFunction(close, 14)` fixture. Our
validateCallExpression bailed out silently for any name without a
builtin signature ("could be user-defined").

## Probes (pine-lint --tv, 2026-06-05; scripts in probes/)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `x = nonExistentFunction(close, 14)` | CE10271 `Could not find function or function reference 'nonExistentFunction'`, anchor = the callee identifier span (3:5-3:23) |
| p02 | `y = f(1)` BEFORE `f(x) =>` | CE10271 - declaration order matters, same as UDTs (INV033 p06) |
| p03 | `v = 1` / `w = v(2)` | CE10271 - a plain variable is not a callable |

## Implementation

In validateCallExpression's no-signature path (v6-gated, Identifier
callees only - MemberExpression callees like `lib.fn` / `Type.new` /
method-style calls stay unvalidated pending alias/UDT member
machinery): error unless the name is in `declaredFunctionNames`, a
checker-side set populated at FunctionDeclaration / MethodDeclaration
registration in source order.

The set exists because the symbol table CANNOT answer this question:
variables share the symbol namespace and hide functions. Three TV-legal
idioms broke under a lookup-based draft, all caught by the corpus
regression check:

- `loss = loss(isRespected, p)` - the declaration defines `loss` (as a
  variable) BEFORE its initializer validates, hiding the UDF;
- `[supertrend, direction] = supertrend(...)` / `[sto] = sto()` - same
  via tuple destructuring;
- `float ema2 = ema2(source, length)` inside a body - collectDeclarations
  pre-registers the body's later LOCAL `ema2` over the global UDF.

## Corpus outcome

15 new appearances: `ma` x8 in `0e07a77c…` (113:8 TV-confirmed, the
rest past TV's stop - same undefined callee), the synthetic fixture
(whose header said "once implemented, change expects" - done), and 6
`lineTpSl` records in the `13a745…` hard-wrap mangle file where the
function DEFINITION itself is shredded by wrap damage (parses as a call
+ orphan `=>`), so the name never registers - no TV verdict exists
there.

Fixture: `packages/core/test/fixtures/regression/INV036-undefined-function-reference.pine`

## Residual

- MemberExpression callees unvalidated: undefined `lib.fn` /
  `ns.fn` calls still pass silently (needs import-alias member data we
  do not have, and UDT method namespaces).
- Forward reference from inside an earlier UDF body to a later UDF
  (`f` calling `g` defined below `f` but before any call to `f`) is
  treated as undefined, consistent with the sequential model - unprobed
  whether TV agrees in that exact shape (probe before relaxing).
