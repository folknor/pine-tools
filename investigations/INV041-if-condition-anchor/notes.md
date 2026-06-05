# INV041 - if-condition bool error: TV's anchor and wording

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FN `The condition of the "if" statement must
evaluate to a "bool" value.` (2 records in 1 file) from the 2026-06-05
inventory. Task tracker #10.

## Claim

`float pl2 = ta.pivotlow(...)` followed by `if pl2` in `8fcd16c1…` -
TV flags 317:4 and 328:4. Never a detection gap: our existing
"Condition must be boolean, got float" check fired at the same lines -
but anchored at the IF KEYWORD (317:1) with our own wording, so the
position-keyed diff double-counted the pair (one local-only + one
tv-only) instead of matching. The INV028 anchor-mismatch pattern.

No new probe needed: the corpus verdict on the carrier file IS the TV
measurement (TV reports these alongside its line-541 CE10149 in the
same response, so multiple independent errors are visible).

## Implementation

The IfStatement condition check now anchors at the CONDITION
expression and uses TV's exact wording. Corpus effect: 235 records
moved coordinates as same-line rename pairs (verified pairwise - zero
genuine appearances or losses; the bulk are legacy-truthiness records
on v4/v5 files, the deliberate INV028-era stance). compare-tv on
`8fcd16c1…` now matches TV at 317:4/328:4 exactly.

Fixture: `packages/core/test/fixtures/regression/INV041-if-condition-anchor.pine`

## Residual

- "Ternary condition must be bool, got *" (1 inventory record) keeps
  our wording/anchor - TV expresses ternary condition errors as
  operator-call CE10123s with branch-priority anchors (the undecoded
  rules noted in INV028's residual trio).
- TV's `{blockName}` template suggests while/for get the same wording;
  our while/for condition paths don't currently emit bool-condition
  errors at all - separate gap, no corpus evidence.
