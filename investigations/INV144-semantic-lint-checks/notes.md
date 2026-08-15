# INV144 - Semantic lints: defects that compile and are still wrong

Status: implemented (`packages/core/src/analyzer/lint-semantic.ts`).
Date: 2026-08-15.

## Origin

The upstream this repo forked from (`jpantsjoha/pinescript-vscode-extension`)
shipped a `packages/validator/src/semanticChecks.ts` in its v0.6.0 release
(2026-08-07) with seven line/regex-based checks, S1-S9. Their ADR-0002 says
the AST path crashes on valid input, so every check is done by indent-walking
and paren-counting on blanked source text.

The rule IDEAS are good and we had none of them. The implementations are not
portable: we have a real parser, and several of their checks are wrong in ways
their own comments admit (S1 silently skipped every wrapped
`request.security`; S2 flagged every UDF body; S9 counted `strategy.cancel`
as an exit).

Triage of the seven:

| Upstream | Disposition |
|---|---|
| S1 repainting `request.security` | implemented as `REPAINTING_SECURITY` |
| S2 `ta.*` inside a conditional | DROPPED - we already emit TV's own CW10003/CW10004 for exactly this, from the SemanticAnalyzer, with TV's wording and a far better conditionality model (see INV018) |
| S3 accumulator lifetime | implemented as `ACCUMULATOR_LIFETIME` |
| S5 plot limit | implemented as `PLOT_BUDGET` |
| S6 request limit | implemented as `REQUEST_BUDGET` |
| S7 plot at global scope only | already ours - `isTopLevelOnly` in `analyzer/builtins.ts`, an ERROR in `checker-calls.ts` |
| S8 nested function definitions | already ours - the parser rejects it, see INV108 |
| S9 entry with no exit | implemented as `ENTRY_WITHOUT_EXIT` |

S2's redundancy is worth stating plainly, since it is the check upstream spent
the most comment prose on. Probe:

```pine
//@version=6
indicator("x")
v = 0.0
if close > open
    v := ta.sma(close, 14)
plot(v)
```

Local (2026-08-15): `[5:10] The function 'ta.sma' should be called on each
calculation for consistency. It is recommended to extract the call from this
scope` - TV's CW10003 wording. Nothing to add.

## Why these are a separate channel

Every other diagnostic in this repo mirrors TradingView. These do not: TV's
`translate_light` endpoint accepts all of them. They therefore:

- are always warnings, never errors,
- carry a `rule` id, not a TV `CW` code,
- land on a new `lint` stage in the CLI's `result.warnings`, so anything
  diffing us against TV can drop the stage wholesale.

## TV probes

All run 2026-08-15 with `pine-lint --tv`. Reachability was confirmed the same
day with a deliberately-invalid control (G001 / the AGENTS.md rule about
mistaking a crashed `--tv` call for silence):

```pine
//@version=6
indicator("sanity")
plot(nosuchvar)
```

-> `{"success":true,"result":{"errors":[{"code":"CE10272","ctx":{"identifier":"nosuchvar"},"end":{"column":14,"line":3},"message":"Undeclared identifier \"{identifier}\"","start":{"column":6,"line":3}},...]}}`

TV answers, and disagrees with nothing local here, so an empty error list below
is real silence and not a fallback.

### 1. Plot budget - `probe-plot-limit.pine` (65 `plot()` calls)

`pine-lint --tv probe-plot-limit.pine` ->

```json
{"success":true,"result":{"functions":[],"types":[],"enums":[]}}
```

**TV accepts 65 plots.** The 64-plot cap (Manual
`visuals/plots#plot-count-limit`) is enforced at chart load, not at compile.
So `PLOT_BUDGET` must be a warning, never an error.

### 2. Request budget - `probe-request-limit.pine` (41 unique `request.security` calls)

`pine-lint --tv probe-request-limit.pine` -> `success:true`, a full
`variables` list for `a01`..`a41`, and **no errors**.

**TV accepts 41 unique requests.** Same conclusion: the 40-call cap (Manual
`writing/limitations#number-of-calls`) is a runtime limit. Warning, not error.

### 3. Repaint / accumulator / entry-without-exit - `probe-semantic-silence.pine`

```pine
//@version=6
strategy("semantic silence probe")

// S1: current, still-forming HTF bar, no explicit lookahead
htf = request.security(syminfo.tickerid, "D", close)

// S3: var accumulator re-accumulated by a loop on every bar, never reset
var float sum = 0.0
for i = 0 to 9
    sum := sum + close[i]

// S9: entry with no exit anywhere in the script
if htf > sum
    strategy.entry("long", strategy.long)

plot(sum)
```

`pine-lint --tv` ->

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":52,"line":5},"start":{"column":1,"line":5}},"name":"htf","type":"series float"},{"definition":{"end":{"column":19,"line":8},"start":{"column":1,"line":8}},"name":"sum","type":"series float"},{"definition":{"end":{"column":9,"line":9},"start":{"column":5,"line":9}},"name":"i","scopeId":"#1","type":"series int"}],"functions":[],"types":[],"enums":[]}}
```

**TV is silent on all three.** Our CLI reports all three as warnings.

## Where we are deliberately more correct than upstream

**Plot budget counts `plot*()` + `alertcondition()`, not `hline`.** The Manual
is explicit: "All `plot*()` calls and alertcondition() calls count towards the
plot count." Upstream counts `hline` (which does not count) and misses
`alertcondition` (which does).

We also count every call as ONE even though a call with a non-const `color`
argument counts as two. That makes the total a lower bound: a script we flag is
over budget under any weighting, while one we stay silent on may still be over.
Undercounting is the only side that cannot produce a false positive, and the
qualifier of a `color` argument is not something this module should guess at.

**Request budget counts UNIQUE calls.** The Manual's own example loops
`request.security()` 50 times with identical arguments and does NOT hit the
limit, because repeated identical calls reuse the first request's data. A
line-based counter flags that script; counting over serialized call text does
not. Locked by `regression/lint-request-budget-unique.pine`. We also carry the
`request.footprint()` cap of one unique call, which upstream does not have.

**Repaint stays silent on same-timeframe requests.** `request.security(sym,
timeframe.period, close)` and the `""` form request the chart's own timeframe -
there is no unfinished higher-timeframe bar to read. Upstream flags both. We
also accept a history offset ANYWHERE in the expression subtree (upstream's
regex only saw literal `[N]`) and on the call itself
(`request.security(...)[1]`), which is half of the Manual's own documented
non-repainting idiom.

We restrict the rule to `request.security`. `request.security_lower_tf` returns
intrabar collections whose repaint story is different enough that the same
structural test would be guesswork; upstream lumps them together.

## Corpus sweep - the false-positive gate

`investigations/INV144-semantic-lint-checks/count-lints.mjs` runs the rules
over the whole local fixture corpus (1879 files, 723 of which parse clean as
v6). Two rules were tightened because of what it found; neither number below is
a threshold, they are the measurement that motivated the fix.

| Rule | first cut | after tightening |
|---|---|---|
| REPAINTING_SECURITY | 119 | 119 |
| ENTRY_WITHOUT_EXIT | 75 | 0 |
| ACCUMULATOR_LIFETIME | 19 | 15 |
| PLOT_BUDGET | 0 | 0 |
| REQUEST_BUDGET | 0 | 0 |

### ENTRY_WITHOUT_EXIT: reversal strategies

`fixtures/006ef212...pine` is one of TradingView's own stock strategies:

```pine
//@version=6
strategy("Price Channel Strategy", overlay=true)
length = input(20)
hh = ta.highest(high, length)
ll = ta.lowest(low, length)
if (not na(close[length]))
	strategy.entry("PChLE", strategy.long, comment="PChLE", stop=hh)
	strategy.entry("PChSE", strategy.short, comment="PChSE", stop=ll)
```

There is no exit function, and the exposure is nonetheless bounded:
`strategy.entry` closes an opposing position before opening its own. Entries in
BOTH directions are therefore an exit mechanism. The rule now stays silent on
those, and on any `strategy.entry` whose `direction` argument it cannot read
statically - unknown means we cannot SHOW the exposure is unbounded, and this
rule reports only what it can show.

That takes the corpus to zero hits while the deliberate single-direction case
(`regression/lint-entry-without-exit.pine`) still fires. The rule is now narrow
by construction; that is the intended trade.

### ACCUMULATOR_LIFETIME: conditional increments are counters, not bugs

`fixtures/49890aa3...pine`:

```pine
if close < get_fvg.get_y1()
    bull_bfvg_mt.remove(i)
    bull_bfvg_la.remove(i).delete()
    bull_mit_count += 1
```

`bull_mit_count` is a `var` with no reset, incremented inside a loop - and it
is correct. The increment is behind an `if`, so it is EVENT-driven: a running
total of mitigated FVGs over the life of the chart, feeding a dashboard.

The discriminator is conditionality within the loop body, not the loop itself.
An unconditional self-assignment re-adds the whole loop range every bar (the
defect); one behind an `if` counts occurrences (the idiom). The search now
descends into nested loops - still unconditional, more iterations, same problem
- but stops at `if`/`switch` bodies.

Remaining 15 hits were spot-checked and are true positives, e.g.
`fixtures/3a68c1af...pine`:

```pine
var i = 0
var sum = 0
while i < 20
    i := i + 1
    ...
```

`i` survives the bar, so on bar 2 the `while` condition is already false and
the loop never runs again.

### REPAINTING_SECURITY: 16.5% is the finding, not the bug

Spot-checked several. `fixtures/34efacc1...pine` is a global-M2-liquidity
indicator making ~34 daily `request.security()` calls with no offset and no
lookahead; `fixtures/10ef9ec8...pine` is an 8-timeframe screener. Both repaint
intraday, which is exactly what the rule exists to say. The rate is high
because this is the most common defect in published Pine, not because the rule
is loose.

## Files

- `probe-plot-limit.pine`, `probe-request-limit.pine`,
  `probe-semantic-silence.pine` - the `--tv` probes above.
- `count-lints.mjs` - the corpus sweep. Needs a prior `pnpm run build`.
  `node investigations/INV144-semantic-lint-checks/count-lints.mjs [limit] [show]`
- Regression fixtures: `packages/core/test/fixtures/regression/lint-*.pine`.
