# INV050 - param optionality polarity (probe-backed required params)

## Origin

TODO #21's first step (the heuristic-vs-evidence diff,
`scripts/audit-param-optionality.mjs`) found a systemic defect on its
first run: of 1292 builtin function params, only **28** shipped
`required: true`. Root cause is scrape.ts's per-param classification:

```ts
const isOptional = isExplicitlyOptional || hasDefault || !isExplicitlyRequired;
```

The `!isExplicitlyRequired` term makes OPTIONAL the default verdict -
unless TV's prose literally says "required argument", the param ships
optional. 847/1292 params were optional with no positive evidence
(`ta.sma`'s `source`/`length` included), and `generate.ts`'s
`isParameterOptional` trusted the raw flag first, so its own prose
heuristics and the `commonOptionalParams` name-list barely ever ran.

Impact: the checker's missing-required-argument check (dormant at
checker.ts `Missing required parameter`, plus the unused
`_requiredCount`) effectively never fired - `ta.sma()` bare passed
silently (p-pre probe, 2026-06-08 local). A wide FN surface.

Prose cannot fix this: `plot`'s `title`/`color`/`style`/`format` carry
NO optional marker yet are optional (the reference under-documents
optionality - the G002 shape, both directions).

## The probe sweep

p01 (below) revealed that a ZERO-ARG call makes TV enumerate every
missing required param as **CE10165** (`No value assigned to the
"<name>" parameter in <fn>()`, one record per param, `ctx` carries the
param name, anchored at the callee). So one probe per function yields
its full ground-truth required set; a clean verdict = all optional.

`scripts/probe-required-params.mjs` swept all 475 catalog functions
(2026-06-08, concurrency 4, ~3 min) into
`pine-data/raw/v6/required-params-probe.json` - per function the exact
probe script, TV's raw errors, and the derived required set. Result:
**718 probed-required params** (vs 28 shipped), zero name mismatches
against the catalog.

Wrinkles found (all encoded in the probe tool):

- **TV crashes** (`TypeError: a.pinePos is not a function` inside a
  `success:true` envelope - the G002 trap shape) when a collection
  fn's `id` (or `max_bars_back`'s `var`) is missing: 30 functions, all
  array/matrix/map mutators. Retried with the first param supplied (a
  fresh typed collection / `close`) - TV then enumerates the rest. The
  first param is recorded as `requiredAssumed`: no direct CE10165
  verdict, but TV demonstrably never compiles the call without it.
  `map.put_all` crashes with EITHER map missing (manual probe in the
  JSON, both assumed).
- **Variadic** fns answer CE10118 `Wrong number of args` + a CE10165
  whose ctx.name is the group (`"arg0, arg1, ..."`): status
  `variadic`, excluded from requiredness - arity stays governed by the
  authoritative `variadic` minArgs map (TODO #21).
- Catalog **template names** (`array.new<type>`) must be called
  instantiated (`array.new<float>`); void fns reject the `x = fn()`
  wrapper (CE10098), the bare-statement variant follows.

## Probes (`probes/`, `pine-lint --tv`)

| probe | shape | TV verdict (2026-06-08; p01-p05 2026-06-07) |
|---|---|---|
| p01 | `plot(ta.sma())` | CE10165 x2: `source`, `length` |
| p02 | `plot(ta.sma(close))` | CE10165: `length` |
| p03 | `plot(ta.tr())` | CE10165: `handle_na` (dual name - the CALL still requires args) |
| p04 | `plot(hour())` | CE10165: `time` |
| p05 | `plot(ta.tr + hour)` | clean (bare dual-name VARIABLE forms) |
| p06 | `plot(ta.highest(20))` + lowest/highestbars/lowestbars | clean - hidden one-arg overloads (see below) |
| sweep | 475 zero-arg probes | `required-params-probe.json` (probedAt embedded) |

## Fix

- **Pipeline** (`generate.ts`): `isParamRequired` consults the probe
  file first (statuses `ok`/`id-supplied`; `variadic` excluded);
  `isParameterOptional` becomes the evidence-based FALLBACK for
  functions absent from the probe file - required unless positive
  prose/default evidence, the raw scrape flags deliberately ignored,
  the `commonOptionalParams` name-list retired. Applied to merged
  params, per-overload params, and the scraped-variadic minArgs count.
- **Checker** (`checker.ts`): the existing dormant missing-param check
  rewired to TV's exact CE10165 wording, anchored at the callee, now
  additionally gated v6-only (G004) and skipped when the function
  ships `overloads[]` (`hasOverloadSignatures` - the probe enumerates
  TV's preferred overload only, e.g. `label.new` -> `point`, while a
  call may satisfy another: x/y). The redundant `_requiredCount` dead
  code removed.
- **Hidden overloads** (`HIDDEN_OVERLOADS` in generate.ts):
  `ta.highest`/`ta.lowest`/`ta.highestbars`/`ta.lowestbars` document
  ONE signature but accept a one-arg form described only in Remarks
  prose ("One arg version: length..."). First corpus regression run
  flagged 109 such call sites; p06 probed all four TV-clean; the
  remarks-pattern scan (`/args? version/i`) found exactly these four.
  Synthesized into `overloads[]` so enforcement skips them and
  consumers see the real forms.

## Corpus effect (regression-check 2026-06-08)

Zero changes against the baseline after the HIDDEN_OVERLOADS fix: the
corpus (published, mostly-working scripts) contains no genuinely
missing required args - which is why the dead FN surface was never
noticed. The check fires correctly on synthetic probes (p01-p04 match
TV's output verbatim, wording and anchor).

## Fixture

`packages/core/test/fixtures/regression/INV050-required-params.pine`

## Refresh protocol

Re-run `node scripts/probe-required-params.mjs` (hits TV ~475 times)
only when the catalog gains functions or TV's behavior is suspected to
have changed; `--retry` re-probes only non-settled entries. The JSON
embeds `probedAt` and each entry carries its exact probe script, so
any single verdict is re-runnable in isolation.

## Residual

- Overloaded functions (overloads[] present) get NO missing-arg
  enforcement. Doing them right needs per-overload required sets and
  overload resolution in the checker - the probe data covers only TV's
  preferred overload.
- The 5 `variadic`-status functions rely on the hand-maintained
  `variadic` minArgs map (authoritative per #21).
- `na()` - probed `ok` with required `[x]` like any other function;
  no special-casing needed.
