# INV171 - probing TV's expected-type noun for union parameters

Built 2026-08-27 for TODO #74, which INV159 left with the right conclusion
and no data behind it: the expected-type noun TV quotes for a union-typed
parameter cannot be derived from the catalog, so it has to be probed. INV159
measured ten functions by hand and stopped, recording the sweep as "left
unbuilt rather than half-built". This is the sweep.

## What is wrong today

Our CE10123 on a union parameter fabricates the expected type as
`` `simple ${members[0]}` `` - the first member of the scraped union with the
qualifier hardcoded (`checker-calls.ts`, the `checkUnionArgs` emission). The
verdict and the argument NAME are both right; only the noun reads wrong.

## The probe

`scripts/probe-union-type-nouns.mjs`, modelled on INV050's
`probe-required-params.mjs`. One call per union parameter carrying exactly one
deliberately wrong argument - a scalar base outside the union - with valid
values everywhere else; TV answers CE10123 whose `ctx.currentTypeDocStr` is
the noun.

Output: `pine-data/raw/v6/union-type-nouns-probe.json`.

Modes: `--census` (offline, no TV), `--dry <fn>` (print one generated script),
`--limit N` (pilot), `--retry` (unsettled only).

### Batching, and why it is safe here

The piners fieldwork rule - one potentially-fatal probe per run, because the
first failure erases the rest of the evidence - does NOT bind on this oracle,
and that was measured before the design was fixed rather than assumed:

```
a = nz("x")
b = math.max("y", 1)
-> TV reports BOTH CE10123s
```

TradingView's first-error stop is a PARSE-channel behaviour; it reports every
type error in a script. So probes batch one script per function, one line per
union parameter, attributed back by line number. That turns 201 probes into
141 TV calls. A parse error would still poison a whole script, so a script
whose verdict contains an uncoded error is re-run one line at a time.

### The control that makes the capture trustworthy

**The CE10123 on a probe line is not necessarily about the parameter that
probe targeted**, and the pilot caught it on its first run:

```
probe_4 = array.binary_search(fx_af, 1.0, sort_field = true)
```

answers CE10123 for **`id`** (`user_type`), not for `sort_field` - the wrong
argument provoked a different parameter's error, because `sort_field` only
applies to an array of user types. Taking the first CE10123 on the line would
have recorded `user_type` as `sort_field`'s expected noun, and nothing
downstream could have caught it - precisely the failure TODO #74 warned about
("getting that wrong bakes a bad string into `functions.json` where nothing
would catch it").

So every result is attributed by `ctx.argDisplayName` and a line whose
CE10123s are all about other parameters is recorded `mismatched-arg`, never as
a noun. With the guard in place the same probe reports `const int` for
`sort_field`, from the second CE10123 on the same line.

### Wrinkles found while piloting

- **Trailing required parameters must be supplied**, or TV answers CE10165 and
  may never reach the type check. They are passed NAMED, which is legal after
  the named target - only a POSITIONAL argument may not follow a named one
  (INV169, found earlier the same day).
- **Variadic functions refuse keyword arguments outright** (CE10119,
  "Functions that accept a variable number of arguments cannot accept keyword
  arguments") - `math.max`, `math.min`, `math.avg`. They are retried
  positionally, and their attribution compares names loosely because TV spells
  the parameters `number_0` where the catalog says `number0`.
- **A third of the union parameters sit behind a collection or drawing ID**
  (`line.set_y1`, `table.cell`, `array.binary_search`, `box.new`), which no
  literal can express. Fixture declarations are emitted at the top of each
  script; without them 32 of 202 parameters would have been silently skipped.

## Coverage

**201 of 202 union parameters measured, across 141 functions.** The census is
offline and reproducible with `--census`.

The one gap is `footprint.get_row_by_price(price)`, whose leading argument is
a `footprint` obtained from `request.footprint()` - a chart-context call, not
something a translate_light probe can construct. Recorded `unbuildable-lead`
rather than guessed.

Self-check, run by hand after the sweep and matching the capture exactly:

```
math.abs(number = "probe")            -> simple int
math.pow(base = "probe", ...)         -> const float
ta.sma(source = "probe", length = 1)  -> series float
```

## Result: there is no rule, and now it is measured rather than inferred

**194 of the 201 disagree with our fabricated noun. Seven agree, by
coincidence.**

The doc type does not determine the answer. `series int/float` alone produces
five different nouns:

| doc type | TV noun | n |
|---|---|--:|
| series int/float | series float | 114 |
| series int/float | simple float | 16 |
| series int/float | const float | 8 |
| series int/float | simple int | 5 |
| series int/float | const int | 4 |
| series int/float | series int | 4 |

Neither half of the noun has a rule of its own either:

- **Qualifier.** A `series` doc union answers `series` 132 times, `simple` 23
  times and `const` 13 times.
- **Member.** `int/float` answers `float` 165 times and `int` 13 times;
  `int/string` splits **6 / 6** between `int` and `string`, with no majority
  to fall back on.

The `math.*` namespace makes it plainest - one doc type, six answers, all in
one namespace:

- `simple int` - abs, ceil, floor, round
- `simple float` - acos, asin, atan, avg, cos, exp, log, log10,
  round_to_mintick, sign, sin, sqrt, tan
- `const int` - max, min
- `const float` - pow
- `series float` - random, sum, todegrees, toradians

This corroborates INV159's `math.abs` vs `math.max` pair at scale: nothing in
our catalog distinguishes `abs` from `ceil` from `max`, and TV answers
differently for each. **So the value is a per-function, per-parameter constant
and the probe file is the only possible source**, exactly as requiredness was
in INV050.

## Not done here, deliberately

Consuming it. The data is captured and self-describing, but nothing reads it
yet: wiring means `generate.ts` merging the noun into each parameter in
`functions.json` (the Data-vs-Syntax rule - the checker must not carry its own
table), then `checkUnionArgs` reading it instead of fabricating. That changes
the wording of 194 diagnostics, so it wants its own regression baseline move
and a fixture, and it is a separate landing from the measurement.

The seven that already agree must not be special-cased on the way in - they
agree by coincidence, not by rule.
