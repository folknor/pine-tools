# G010 - RE-class runtime errors are reachable only from a chart

TradingView has a whole error class our tooling cannot see. `CE`-class
compile errors reach us (the editor shows them, and `--tv` shows most of
them - see [G009](G009-tv-endpoint-misses-editor-only-gates.md) for the
exception). `RE`-class **runtime** errors do not reach us at all.

## What is true

Established from the 2026-08-25 chart session (BINANCE ETHUSDT.P 15m,
22,678 bars), whose banner screenshots are held in
`../scripts/probes/re-class-runtime-errors/tv-banners/`:

- **RE errors surface only on the chart legend overlay** - the
  exclamation icon beside the script title. They appear **never in the
  Pine editor**, which shows only CE-class compile errors, and never in
  either pine-lint mode.
- **A runtime error retroactively wipes the script's entire log output.**
  Even a `log.info` line already emitted on bar 0 vanishes when the
  script dies later. So for any one run, log capture and error capture
  are **mutually exclusive**: a fatal probe's only evidence is the
  banner.
- Therefore a probe script that may raise must isolate **one** case per
  run (the fieldwork fixture uses a `case` input for exactly this), and
  the run's output is either a full log or a single banner, never both.

## The trap that cost a wrong reading

An **unused** invalid construction does not raise. TradingView
eliminates dead code, so `array.slice(emptyArray, 0, 5)` whose handle is
never consumed runs clean - while the identical construction, with the
result used, raises RE10045 at the construction line.

That clean run is an **optimizer artifact, not deferred validation**. It
was briefly read as evidence that TV defers slice validation to first
use; the discriminating case (grow the parent, then use) disproves it -
the error still fires at the construction line, with the parent's
original size in the message. Banner:
`RE10045-slice-empty-grow-then-use.png`.

**Lesson for probe design:** an unused-value cell proves nothing about
TradingView's runtime behaviour. Every probe must consume its result.

## Why this matters to us

We are a static linter, so we never execute Pine and none of this is a
defect on our side. It bites in one specific place: **any check we write
about a runtime domain has no oracle we can re-run.** For every other
check in this repo the loop is "probe, `--tv`, record, re-check later
when contradicted." Here the loop terminates at a screenshot someone took
on a chart once.

Consequences:

- Domains for such rules must be quoted from a captured banner, and the
  capture kept (see the probe folder above). A domain nobody captured is
  a guess, and G002 is what guesses cost.
- A contradiction cannot be resolved by re-running `--tv`. It needs a new
  chart capture, which needs a person at a chart.
- Prefer domains TV states **in the error text itself** ("It must be
  > 0", "It must be >= 0", "It must not be na" - each naming its
  argument). Those are the platform's own words about its own rule, and
  they are the strongest evidence this class admits.

See TODO #69 for the rule this governs.
