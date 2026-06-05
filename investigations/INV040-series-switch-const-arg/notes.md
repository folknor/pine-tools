# INV040 - series switch results vs const-required params (plot title)

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FN `Cannot call "plot" with argument
"title"="trend". An argument of "series string" type was used but a
"const string" is expected.` (1 record) from the 2026-06-05 inventory.
Task tracker #9.

## Claim

`trend = switch / close > open => "Up" / ... / => "Flat"` followed by
`plot(close, title=trend)` is TV's CE10123 at 29:19 - the
condition-based switch over series comparisons yields a SERIES string,
and `title` requires const. This is the corpus verdict itself (file
`5291ac42…`, our own `syntax/switch.pine` fixture's copy); no extra
probe needed - the implemented check reproduces TV's message
byte-for-byte and compare-tv now diffs the file at zero.

Two gaps stacked here:

1. **Inference**: our SwitchExpression typing took the first arm's
   result type verbatim ("string" for a literal), ignoring that a
   series discriminant or series case conditions make the whole value
   series. `isSeriesDriven` now wraps primitive results in `series<>`
   when the discriminant or any case condition infers
   series-qualified. (Comparisons only infer `series<bool>` when an
   operand is series-prefixed, so input-driven switches stay
   unqualified - the negative case in the fixture.)
2. **The INV014 reliability gate**: `describeNonConstArg` returned
   null for ALL user variables. It now flags a user variable whose
   inferred type is series-QUALIFIED (`series<...>`), which is
   provably non-const; unqualified inferences stay on the conservative
   null path, so the gate's original FP protection (mis-guessed
   user-variable types) remains for everything we cannot prove.

Corpus outcome: exactly the 1 inventory record, message and anchor
identical to TV; zero other corpus movement (the qualifier wrap
touched nothing else - the strict INV032 checks compare base types
only).

Fixture: `packages/core/test/fixtures/regression/INV040-series-switch-const-arg.pine`
(plus `syntax/switch.pine`, the carrier, now asserting the error).

## Residual

- Ternary and if-expression results are NOT yet series-wrapped by
  condition (same rule presumably applies; no corpus evidence - probe
  before extending, the ternary inference path has more consumers).
- The broader #9 umbrella (UDF-return inference unlocking the
  INV014/INV016 gates) still stands; this closes only the
  series-switch slice.
