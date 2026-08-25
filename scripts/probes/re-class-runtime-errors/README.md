# Probe - RE-class runtime errors neither validator flags

Backs TODO #69. Every call in `probe.pine` is a script that COMPILES and
then dies on bar 0 with a TradingView runtime error. Both validators call
the file clean, which is the gap #69 proposes to close on the `lint`
stage.

Re-run:

```bash
pine-lint -H scripts/probes/re-class-runtime-errors/probe.pine
pine-lint --tv scripts/probes/re-class-runtime-errors/probe.pine
```

## Verdicts, 2026-08-25

| tool | verdict |
|---|---|
| `pine-lint -H` (local) | `clean` |
| `pine-lint --tv` | `{"success":true,"result":{"functions":[],"types":[],"enums":[]}}` - zero errors |

## The runtime behaviour each line provokes

Captured against a live TradingView chart (BINANCE ETHUSDT.P 15m,
22,678 bars) on 2026-08-25, from the piners project's `fatal-cases.pine`
fixture - which isolates one potentially-fatal probe per run behind a
`case` input, because a runtime error halts the whole script.

**The banner screenshots are held in `tv-banners/`** - primary source,
not a transcription. We cannot reproduce them ourselves at any time:
RE-class errors surface ONLY on the chart legend overlay (the
exclamation icon by the script title), never in the Pine editor, and
never through either pine-lint mode. These images are the only oracle
this rule will ever have, which is why they live in the repo rather than
being cited across it.

| line | error | banner |
|---|---|---|
| `ta.sma(close, 0)` | RE10001, bar 0 - "Invalid value of the 'length' argument (0) in the \"sma\" function. It must be > 0." | `tv-banners/RE10001-sma-length-zero.png` |
| `ta.sma(close, na)` | RE10003, bar 0 - "Invalid value of the 'length' argument in the \"sma\" function. It must not be na" | `tv-banners/RE10003-sma-length-na.png` |
| `ta.sma(close, 2000000)` | RE10004, bar 0 - "The 'sma' function references too many historical candles (2000000), the limit is 5000." | `tv-banners/RE10004-sma-length-2000000.png` |
| `ta.pivothigh(high, -1, 2)` | RE10001, bar 0 - "Invalid value of the 'leftbars' argument (-1) in the 'pivothigh' function. It must be >= 0." | `tv-banners/RE10001-pivothigh-leftbars-negative.png` |

Four further banners cover the `array.slice` family, which
`probe.pine` does not exercise (see "Adjacent cells" below):
`RE10045-slice-empty-immediate-use.png` (index 0 out of bounds, size 0),
`RE10045-slice-empty-grow-then-use.png` (the same error at the same
CONSTRUCTION line even though the parent is grown before use - which is
what proves construction-raise rather than deferred validation),
`RE10044-slice-inverted-range.png`, and
`RE10045-slice-over-long.png` (index 5 out of bounds, size 3 - the
non-inclusive `index_to` is itself the checked index, and there is no
clamp).

Three details in the banners that matter to the rule design:

- The `> 0`, `not na` and `>= 0` domains are stated by TV **in the error
  text itself**, naming the argument - so the domain facts #69 needs in
  `functions.json` are quoted from the platform, not inferred by us.
- The four length/strength errors all fire **on bar 0**. These scripts
  never produce a single value.
- The RE10004 ceiling is still ONE data point from ONE script. The
  banner confirms the wording precisely; it does not establish whether
  5000 is per-call, global, or interacts with `max_bars_back`. See the
  open question in TODO #69.

## Adjacent cells checked the same day

- `ta.sma(close, 2.5)` is ALREADY caught, by the type layer rather than
  any runtime rule: `literal float` into a `series int` slot. Pine types
  the parameter `series int`, so a fractional length never needs a domain
  check. Do not add one.
- `array.slice(array.new<float>(0), 3, 1)` is clean locally. TV raises
  RE10044 ("Index 'from' should be less than index 'to'") at the
  CONSTRUCTION line - a distinct error class from the RE10045
  out-of-range family. The inverted-constant-range cell is in scope for
  #69; the out-of-bounds family is not, since it needs collection-size
  tracking.
