# INV162 - a literal outside the range its own parameter documents

Landed 2026-08-25. A `lint`-stage rule, `ARGUMENT_OUT_OF_RANGE`.

## What it catches

```pine
c = color.rgb(300, 0, 0)          // docs say 0-255
t = color.new(color.red, 150)     // docs say 0-100
```

TradingView compiles both (probed 2026-08-25, `--tv` clean on each), so
this is the `lint` stage's own charter - code that compiles and is still
wrong - and never an error.

**The message deliberately does not claim a runtime consequence.**
Whether TV clamps 300 to 255 or raises at runtime is unknown, and finding
out needs a chart capture of the kind
[G010](../../gotchas/G010-re-class-errors-are-chart-only.md) describes.
The finding stands without it: the author wrote a value their own
reference excludes, which is a mistake regardless of what the platform
then does with it.

## Where the domain comes from, and why that matters

`min`/`max` on each parameter in `functions.json`, parsed at
generate-time by `parseNumericRange` from the parameter's own prose. The
checker holds no table of language facts, per the Data-vs-Syntax rule -
which also means the rule's reach is exactly whatever the reference
happens to document, and no more.

Today that is **11 parameters across 6 functions**: `color.new.transp`,
the four `color.rgb` channels, `strategy.max_lines_count` /
`max_labels_count` / `max_boxes_count` / `max_polylines_count`, and
`strategy.risk.max_drawdown.value` / `max_intraday_loss.value`.

That narrowness is the point of the design rather than a limitation of
it: adding a domain is a pipeline change backed by evidence, not a line
in the checker. TODO #69 is the natural extension - the TA length domains
(`length` must be `> 0`, `leftbars` `>= 0`) are captured in the RE-class
banners but are NOT in the reference prose, so they need a probe-backed
`generate.ts` fact layer to reach `functions.json`. Once they do, this
rule picks them up with no code change.

## False positives: zero by construction, and zero measured

Two properties, both load-bearing given INV144's standing rule that an FP
in this channel is worse than a miss:

- **Only literals are decided.** A negated literal counts (`-1`);
  anything else - an identifier, an `input.int(999, ...)`, an expression -
  is left alone, because a runtime value cannot be shown to violate
  anything. The fixture pins the `input` case.
- **Boundaries are legal.** `0`, `255` and `100` are all in range and
  stay silent. Pinned.

**Corpus: ZERO findings** across the 723-file sweep
(`investigations/INV144-semantic-lint-checks/count-lints.mjs`), against a
freshly built `dist` - the sweep loads the tsc build, not the CLI bundle,
so an `install:cli` alone would have measured stale code and reported the
same zero for the wrong reason.

Read that zero honestly: it means no false positives on real published
scripts, and it also means **no demonstrated catch there**. The rule's
value is prospective and is evidenced only by synthetic probes. That is
the same standing as INV141/142/143, which landed on classes the corpus
cannot carry; the difference here is that this corpus COULD carry the
class and simply does not - published scripts do not pass 300 to a 0-255
channel.

Pinned by
`packages/core/test/fixtures/regression/INV162-argument-out-of-documented-range.pine`,
which carries the three findings, both boundaries, and the non-literal
case.
