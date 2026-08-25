# INV158 - UNUSED_VARIABLE fires on `_`, and sits on the wrong stage

Adopted 2026-08-25 from two black-box findings files kept by a consumer
of our CLI in `../strategies/`. Finding 7 of the first was the only open
pine-lint item across both, and verifying it turned up a second, larger
problem underneath it.

**The two documents overlap and are not cleanly split.**
`PINE-LINT-BUGS.md` is pine-lint-only, written from working in that repo;
`VALIDATOR-FINDINGS.md` is a two-tool differential (piners and us) over
285 files with TradingView as tiebreaker. Where they cover the same
defect they agree - `PINE-LINT-BUGS` findings 2 and 4 are `LNT-01` and
`LNT-02` - so a reader should treat `VALIDATOR-FINDINGS.md` as the
superset for our purposes and `PINE-LINT-BUGS.md` as the deeper writeup
of the repainting family. Only the union is recorded below.

## Status sweep, 2026-08-25 - everything except finding 7 is closed

`PINE-LINT-BUGS.md` findings 1-6, which that file already marks fixed and
which are re-verified here: global mutation in a function (INV150),
`REPAINTING_SECURITY` suppressed by writing the default explicitly
(INV152), an offset taken inside a helper (INV151), the `lookahead` split
into `LOOKAHEAD_BIAS` (INV153), comma-separated declaration lists
(INV154), and `array.from` int literals widening into `array<float>`
(INV155).

`VALIDATOR-FINDINGS.md` adds four more pine-lint items and three shared
ones. **Both items it lists as OPEN are in fact fixed**, by work that
landed after its 2026-08-21 measurement:

- **LNT-06** ("`analysis`-stage warnings carry no code or rule id") -
  fixed by INV148. Their own repro now returns
  `keys: ['code', 'end', 'message', 'rule', 'stage', 'start']`. See the
  stage section below, though: running it produced the key evidence for
  the second finding.
- **LNT-07** ("version gate inconsistent with the parser") - fixed by
  INV146/INV148. All three of their v4 carriers
  (`grimmha/HAbacktest.pine`, `grimmha/hatest.pine`,
  `iwbdt/indicator.pine`) now return
  `1:1: Pine Script v4 is not supported. Supported versions are >= 5.`
  instead of a lexer error.

The shared "both tools reject, TV accepts" set is also closed on our
side, though not always because we fixed something:

- **SHR-01** (`plot(..., transp = ...)` in v5) - we do not reject it.
  INV148's v6-only argument-name gate means argument names are never
  checked on a v5 file. See INV157 for the residual (TV emits a
  deprecation warning we do not mirror).
- **SHR-02** (field assignment on a `for...in` loop variable) and
  **SHR-03** (method-call chains in tuple position) - both carriers,
  `elliott-wave-detector-pro.pine` and `cvd-profiles.pine`, are clean
  through our checker today.
- **SHR-04** - the `cvd-profiles` and `volume-supply-demand` halves are
  covered above and by INV155. Note piners has since adjudicated SHR-03
  as NOT a defect in either tool: `[a, b] := [...]` is rejected by
  TradingView too, so our `Unexpected token: :=` was right all along.

So the whole inherited backlog reduces to finding 7.

## Finding 7, confirmed: `_` is the discard identifier, not a bad name

```pine
//@version=6
indicator("t")
[_, _, macdHist] = ta.macd(close, 12, 26, 9)
plot(macdHist)
```

- **Us, 2026-08-25:** `3:1: warning: [UNUSED_VARIABLE] Variable '_' is
  declared but never used`
- **`pine-lint --tv`:** clean

Pine reserves `_` for marking a binding unused - `po search "Using an
underscore as an identifier"` is explicit, and the manual's own example
is `[_, visibleHigh, visibleLow, _, _] = visChart.ohlcv()`. Warning on it
is warning at the identifier for doing its job.

There is no workaround, which is what makes it worth fixing rather than
tolerating. Naming the unwanted legs instead moves the warning onto those
names and produces *more* of them: `[_m, _sg, _h] = ta.macd(...)` gives
two warnings where the correct Pine gives one. So a clean file is
unwritable, and their repo treats warnings as failures.

The exemption must cover `for` headers too - the same manual section
documents `for _ = 1 to 20`. Measured here: that form is already clean
for us (`probes/for-underscore.pine`), so the fix is scoped to tuple
destructuring, but it should be written so the `for` case cannot
regress.

Their three carrier files: `indicators/composite/risk-ratio-valuation.pine`,
`indicators/volatility/consolidation-range.pine`, and
`library/libs/regression-toolkit.pine`. Tracked as TODO #72.

## The larger finding: UNUSED_VARIABLE is on the `analysis` stage, and TV has no such rule

Our diagnostic carries `"stage": "analysis"`. Per the stage contract in
AGENTS.md and INV144, `analysis` is the SemanticAnalyzer's TV-mirroring
CW100xx channel: the first three stages mirror TradingView, and `lint` is
the one channel that does not.

TradingView emits nothing comparable. Measured 2026-08-25:

```pine
//@version=6
indicator("t")
f(x) =>
    unusedLocal = x * 2
    x + 1
var int neverRead = 0
plot(f(close))
```

- **Us:** two `UNUSED_VARIABLE` warnings (4:5 and 6:9)
- **`pine-lint --tv`:** clean

A plain top-level `unusedVar = close * 2` is likewise clean at TV. So
this is not a `_` special case - **TradingView has no unused-variable
warning at all**, and an entire rule of our own invention is sitting in
the channel reserved for mirroring it.

Caveat, and it is the G009 caveat: `--tv` reaches `translate_light`, not
the editor, so strictly this establishes that the endpoint emits no such
warning. Warnings do come through that endpoint in general - it returns
TV's `transp` deprecation warning, for one - so the negative result is
meaningful, but the editor has not been checked.

### The rule's own output proves it, without needing TV at all

Running `VALIDATOR-FINDINGS.md`'s LNT-06 repro produced the decisive
evidence. Pairing each `analysis`-stage warning with its code on
`library/libs/regression-toolkit.pine`:

```
Counter({('CONDITIONAL_SERIES', 'CW10003'): 28, ('UNUSED_VARIABLE', None): 2})
```

Every other rule on that stage carries a real TradingView CW code.
UNUSED_VARIABLE carries `None`, because there is no CW code for it to
carry. The stage is defined by mirroring TV's CW warnings, and this rule
is the one member that cannot name the thing it mirrors.

That also gives a mechanical test for the whole class, which is worth
keeping whatever is decided about this rule: **an `analysis`-stage
diagnostic with no CW code is by definition not a mirror.** If any other
rule ever answers `None` there, it is in the wrong channel too.

### Why the stage matters

Three concrete consequences, none of them cosmetic:

- **`--no-lint` does not silence it.** That flag drops the `lint` stage.
  A consumer who wants only TV-mirroring diagnostics still gets this one,
  which is precisely what `--no-lint` exists to prevent.
- **It is outside TODO #66's suppression design.** That item is scoped to
  "the five `lint`-stage rules" as the first place where a
  correct-but-unwanted diagnostic arises. UNUSED_VARIABLE is exactly that
  kind of diagnostic and is not in scope, so any suppression mechanism
  built to #66's spec would not cover the rule generating this complaint.
- **It inflates the local-only warning column.** TODO.md already records
  that metric as unstable and names its dominant contributor: "the
  candlestick `C_*` unused-var snippet, spread across ~52 fixtures,
  dominates the churn". That is this rule. A rule TV cannot emit should
  be dropped before the diff, the way `find-real-failures.mjs` already
  drops the `lint` stage (INV144).

The apparent fix is to move it to `lint`, where it would keep its
existing `rule` id, become `--no-lint`-suppressible, join #66's
suppression surface, and leave the TV comparison automatically. That is
not free and should be weighed, not assumed:

- `lint`-stage rules are advisory by contract, and this one is arguably
  more load-bearing than that - an unused variable is often a real typo.
- The corpus impact is large enough to move the reported figures, so it
  needs a `lint:failures` re-run and a TODO.md figures update in the same
  landing, not a quiet reclassification.
- AGENTS.md records a known limitation on this same rule (it reports
  built-ins as unused). Whatever stage it ends on, that bug is separate
  and still open.

Tracked as TODO #73.

## Their "Not confirmed" item, left as a lead

Their file parks a claim that a `bgcolor` continuation line indented at a
multiple of four is accepted locally and rejected by TV. They disproved
the general form themselves - a minimal eight-space `bgcolor` wrap is
clean on both - but recorded that it DOES reproduce at file scope in
`setups/scdtm/pinescript/strategy.pine` and `indicator.pine`, where
reverting to eight spaces makes `--tv` fail with `Syntax error at input
'end of line without line continuation'` and nine spaces is clean again.

Not adopted as a finding, because they are right that TV is the one
rejecting the code, so it is not a local-validator gap. Recorded here
only because the adjacency is worth knowing if someone works that area:
this is the same diagnostic family as
[INV042](../INV042-continuation-indent/notes.md) /
[INV074](../INV074-leading-operator-multiple-of-4-indent/notes.md) and
the logical-line column conventions in
[G005](../../gotchas/G005-tv-diagnostic-position-conventions.md). Their
explicit instruction stands: do not act on the "multiple of four"
version of the claim, which is disproved. If anyone isolates the real
trigger it becomes a gotcha, not a work item.
