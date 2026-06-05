# INV035 - CE10095: "X" is already defined (same-scope redeclaration)

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FNs `"sslDown" is already defined` /
`"x" is already defined` (2 records in 2 files) from the 2026-06-05
inventory. Task tracker #3.

## Claim

TV errors on re-declaring a name with `=` in the same scope (Pine `=`
declares; reassignment needs `:=`). Our symbol table silently
overwrites. Distinct from INV020's CW10011/CW10013 - those are
parent-scope shadowing WARNINGS; this is the same-scope ERROR.

## Probes (pine-lint --tv, 2026-06-05; scripts in probes/)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `x = 10` / `x = 20` | CE10095 `"x" is already defined`, anchor 4:1 (statement start) |
| p02 | `float y = 1.0` / `bool y = false` | CE10095, 4:1 |
| p03 | if-body `a = 1` / `a = 2` | CE10095 at 5:5 - LOCAL scopes count (TV scopes if-bodies; the body's other error CE10188 plot-in-local also returned, both anchors matching ours) |
| p04 | `var x = 1` / `x = 2` | CE10095 - a plain `=` after a var declaration is a redeclaration, not a reassignment |
| p05 | `f(x) =>` / body `x = 1` | CE10095 - params count as declared by the function scope |
| p06 | `_ = '--- A ---'` / `_ = '--- B ---'` | CLEAN - `_` is a discard placeholder TV allows re-declaring freely (the section-separator idiom). Sanity: this probe disagrees with our (pre-exemption) local verdict, proving it reached TV |

## Implementation

A lexical `declScopes` stack in the checker, separate from the symbol
table because (a) builtins live in the symbol table's global scope and
must not collide, (b) collectDeclarations pre-registers names so the
table can't distinguish "earlier statement" from "this statement", and
(c) our symbol table deliberately does NOT scope if-bodies while TV's
redeclaration rule does. Frames pushed at: global, function/method
bodies (seeded with param names), for/for-in bodies (seeded with
iterators), while bodies, each if branch, switch-expression arms, and
if-expression branches. `checkRedeclaration` fires in the
VariableDeclaration case, v6-gated (legacy used `=` for reassignment),
anchored at the statement start, with `_` exempt.

## False positives found and fixed en route

1. **`name := expr` comma units parsed as declarations**: the untyped
   comma-declaration loop called variableDeclaration for every
   `IDENT <assign>` unit, so `u11 = 0.0, u11 := nz(u11[1])` (an
   idiomatic declare-then-seed pair) made the `:=` unit a second
   declaration. The loop now emits AssignmentStatement for `:=` and
   compound operators. Bonus: this collapsed a 14-record
   "Unexpected token" cascade in `dd8f47ce…` where an `+=` comma unit
   used to shred the arrow functions below it.
2. **`_` placeholder** (p06): exempted.

## Corpus outcome

19 new appearances: the 2 TV-confirmed inventory records (exact
positions), 2 typed redeclarations past TV's stop in `fd31e4fc…`
(`color rsi1SDColor = ...` at lines 122 and 616 - p02's shape), and 15
records in the `13a745…` hard-wrap mangle file where call-argument
fragments (`textcolor=..., style=..., size...`) spill to top level as
comma declarations repeatedly - no TV verdict exists there (consistent
with the honest-cascade precedent from INV025). 6 same-position wording
changes in `f8165e4e…` are the INV032 strict path now rendering
existing catches.

Fixture: `packages/core/test/fixtures/regression/INV035-already-defined.pine`
(also updated `validation/redeclaration.pine`, whose header literally
said "Once stricter checking is implemented, change expects").

## Residual

- TupleDeclaration names are not entered into the frames (re-declaring
  a tuple-destructured name later is unprobed - probe before adding).
- Inline switch-arm / single-line function body declarations flow
  through parseInlineStatementUnit paths that do not push frames; no
  corpus evidence of collisions there.
