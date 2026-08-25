# INV166 - UNUSED_VARIABLE moves to the `lint` stage

Closes TODO #73.

## The premise (established, not re-derived)

INV148 established on 2026-08-21 that UNUSED_VARIABLE mirrors nothing - TV
emits no diagnostic at all for an unused variable - and deliberately gave it no
CW code rather than inventing an identifier consumers could not reconcile with
TV. INV158 then asked the STAGE question that INV148 did not: the rule sat on
`analysis`, the stage whose contract is "TradingView says this too".

## The test applied

The investigation's own general test decides it, and it is the reason this
landed as a structural rule rather than a name check:

> An `analysis`-stage diagnostic with no CW code is by definition not a mirror.

So the CLI routes by `code === undefined`, not by `rule === "UNUSED_VARIABLE"`.
Verified that the two are equivalent today - of the six `addWarning` sites in
`semanticAnalyzer.ts`, five pass a CW code (CW10011, CW10013, CW10018,
CW10001, and CONDITIONAL_SERIES's CW10002/3/4) and UNUSED_VARIABLE is the only
one that does not. Any future code-less warning lands on `lint` automatically,
which is the correct default: it cannot have been a mirror.

## What it fixes, all three at once

1. `--no-lint` now silences it. The flag means "TradingView's verdict and
   nothing else", and a diagnostic TV never emits belongs on that side of the
   switch wherever it was computed. The lint-stage list is now fed from two
   places for exactly this reason.
2. It falls inside #66's suppression design, which is scoped to the `lint`
   stage rather than to a list of five rule names.
3. It leaves the local-only warning column, which `find-real-failures.mjs`
   drops the `lint` stage from before diffing.

## Measured effect (full TV sweep, 2026-08-25, 748 v6 fixtures)

**warning local-only: 41**, down from the 1292 comparable figure of the
2026-08-15 sweep. The `C_*` unused-variable churn that TODO.md named as the
dominant source of that column's instability is gone from it entirely - which
was the point, since the column is a correctness signal only if movement in it
means something.

Two other results from the same sweep, neither caused by this change:

- **Error split unchanged at 29 local-only / 0 tv-only / 1 same-position
  message pair**, in the same three known categories. This retires the
  staleness caveat TODO.md carried since INV146: the window is byte-identical
  across INV146-INV165, thirteen investigations later.
- **warning tv-only: 1**, up from 0. A CW10003 on `sma` at
  `6874e636…pine:1538:11`, inside `detect_pivot`. It cannot be an effect of
  this change (nothing here can suppress a warning we compute) and per G001 one
  measurement is not a fact, but it is a real FN candidate and is recorded as
  a pending item rather than absorbed silently.

## Note on the counter-argument

TODO #73 asked for this to be weighed, not assumed - `lint` rules are advisory
by contract and an unused variable is often a real typo. The severity does not
change (both stages carry warnings only), the default output does not change
(the finding still appears, with the same message and position), and the rule
keeps its `rule` id. What changes is which switch turns it off and which column
counts it. The advisory-ness objection would bite if `lint` meant "less
important"; it means "not TradingView", which is precisely what this rule is.

## Verification

- 472 tests passing (the fixture harness merges both warning channels, so
  fixtures asserting unused-variable warnings are unaffected by the stage
  split).
- `pine-lint -c` on an unused local: `stage: "lint"`, `rule:
  "UNUSED_VARIABLE"`, no `code`. With `--no-lint`: silent.
- `node scripts/regression-check.mjs`: unchanged (the baseline is errors-only).
