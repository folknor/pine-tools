# INV037 - if-branch scoping: branch locals are not visible outside (v6)

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FNs `Undeclared identifier "stopLoss"` /
`"takeProfit"` (2 records in 1 file) from the 2026-06-05 inventory.
Task tracker #6.

## Claim

In `e6bc2e7c…` a UDF declares `stopLoss`/`takeProfit` inside BOTH
branches of an if/else, then returns `[stopLoss, takeProfit]` from the
enclosing function scope. TV rejects the references (CE "Undeclared
identifier", anchors 67:6 and 67:16 - this verdict comes from the
corpus run itself, the file's only TV errors). Our checker deliberately
treated if-bodies as non-scopes ("if statements do NOT create new
scopes"), so the branch declarations leaked out and resolved the
references.

TV's branch scoping was already independently established by INV035
(p03: same-branch redeclaration errors with `scopeId #1`) and by the
CW10018 conditional-local-history warning machinery (INV021).

## Implementation

The IfStatement case now wraps each branch in a real symbol-table
scope, with declarations collected INTO the branch scope -
**v6-gated**. The gate is the heart of the finding: an ungated draft
produced 238 corpus appearances, 230 of them on v4/v5/no-version files
that are published, working scripts (TV compiled them), proving the
leak was legal pre-v6. Legacy keeps the flat model per G004.

The two TV-confirmed records appear at TV's exact positions (wording
differs - ours "Undefined variable 'X'" vs TV's "Undeclared identifier
\"X\"" - so the pair lands in the same-position wording channel). The
only other v6 appearances are 6 honest records in the `8439b236…`
hard-wrap mangle file (no TV verdict; `length` is declared only inside
a wrap-damaged earlier region).

Fixture: `packages/core/test/fixtures/regression/INV037-if-branch-scope.pine`

## Residual

- Our wording ("Undefined variable") differs from TV's ("Undeclared
  identifier") at these sites - cosmetic, same position.
- While/for bodies already scope; switch-statement arms route through
  SwitchExpression handling which also scopes. The flat legacy model
  remains for v4/v5 by design.
