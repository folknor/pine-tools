# INV014 - const-argument enforcement (CE10123)

**Status:** Fixed (const-arg enforcement landed). Spawned a follow-up: the
`FUNCTION_PARAM_TYPE_OVERRIDES` retraction (see "Adjacent finding" below and
`gotchas/G002`, now corrected).

**Regression fixtures:**
- `packages/core/test/fixtures/regression/INV014-const-arg-enforcement.pine`
  (the reported bug - must flag)
- `packages/core/test/fixtures/regression/INV014-const-arg-valid.pine`
  (valid const forms - must stay clean)

## The report

A user's strategy was rejected by TradingView but passed our linter:

```pine
int testStart = input.time(timestamp("UTC", 2026, 2, 1, 0, 0), "Test start")
```

TV (verified, isolated `--tv` probe 2026-06-02):

```
Cannot call "input.time" with argument "defval"="call "timestamp" (simple int)".
An argument of "simple int" type was used but a "const int" is expected. (CE10123)
```

`input.time`'s `defval` requires `const int`. The 7-arg
`timestamp(timezone, year, month, day, hour, minute, second)` overload returns
`simple int` (only the single `timestamp(constString)` form is `const int` - TV's
own doc note: *"only if it uses a date argument in const string format"*). So the
call is genuinely invalid; TV is right and we were silently wrong.

## Why we missed it (two compounding root causes)

1. **We never resolved overloads for return types.** `inferExpressionType`'s
   CallExpression branch used the *merged* top-level `timestamp.returns`
   (`const int`, frozen to overload #0) for every call - so `timestamp("UTC", …)`
   was treated as `const int` instead of the timezone overload's `simple int`.
   (`checker.ts`.)
2. **We strip the qualifier entirely.** `mapToPineType` collapses `const int`,
   `simple int`, `input int`, and bare `int` all to `"int"` (only `series`
   survives). So even with correct overload resolution, `simple int → const int`
   maps to `int → int` and passes. We don't track const-ness at all. (`builtins.ts`.)

## The trap (gotcha G002) - and that it no longer holds

The obvious fix ("enforce every param the reference types `const`") looked unsafe
because `gotchas/G002` recorded that TV *under-documents* - specifically that
`plot(title=…)` accepts a non-const `series string` (verified with `--tv` on
2026-05-28). If still true, blanket enforcement would false-positive.

So we **probed TV directly** (`scripts/probe-const-enforcement.mjs`, 2026-06-02)
instead of trusting the note. As of 2026-06-02, isolated `--tv` probes flag
*every* one of G002's "TV accepts" cases with CE10123:

**Probes and results (isolated `--tv`, 2026-06-02):**

```pine
//@version=6
indicator("x")
plot(close, title = syminfo.tickerid)    // CE10123 - simple string, const string expected
plot(close, title = str.tostring(close)) // CE10123 - series string, const string expected
plot(close, title = "ok")                // clean (control)
plot(nz(close > open))                    // CE10123 - series bool, simple int expected
plot(nz(syminfo.tickerid) == "" ? 1 : 0) // CE10123 - simple string, simple int expected
y = int(true)                             // CE10123 - literal bool, simple int expected
plot(na(close > open) ? 1 : 0)            // CE10123 - series bool, simple float expected
```

This contradicts G002's 2026-05-28 record. The cause is a **`--tv` measurement
error then, not a TV change**: `--tv` flags `nz(close > open)` where our local
validator does not, and accepts the valid `nz(close)`, so the 2026-06-02
result is genuinely TV (not a local echo) - and a failed `--tv` probe used to
print `{success:false, errors:[]}`, which the diff tooling reads as "TV
accepts" (now fixed: failed probes emit no stdout + exit non-zero). Earlier
drafts of these notes guessed "position-keying" then "TV changed"; both were
unsupported and are removed - see `gotchas/G002` for the full account. The
const-arg check here rests on the 2026-06-02 measurement plus the reference
(and the user's report that TV rejected their script). See the adjacent finding
below.

## The exhaustive audit

`scripts/audit-const-params.mjs` enumerates every reference param typed `const`:
**181 params across 38 functions**. `scripts/probe-const-enforcement.mjs` then
sends a minimal valid call passing a *simple* (least-dynamic non-const) value of
the right base type through `pine-lint --tv` and classifies by TV's structured
error (`ctx.argDisplayName` + `ctx.currentTypeDocStr`). Output:
`audit.json` (probed 2026-06-02).

Result: **161 ENFORCED, 3 LENIENT, 17 AMBIGUOUS** - and a clean structural rule
that matches TV on all 181:

- **ENFORCED** ⇔ the param is `const <scalar>` (int/float/bool/string/color or a
  union of those) in *every* overload that contains it.
- **LENIENT** (correctly not flagged): `timestamp.dateString` (a series-string
  overload exists), `input.defval` (its type blob is *"const … or source-type
  built-ins"* - accepts `close` etc.), `input.enum.defval` (non-scalar base).
- **AMBIGUOUS** = 16 enumerated `display`/`scale_type` params (CE10068 *value*
  errors - governed by `allowedValues`, not const-ness; excluded as non-scalar)
  + 1 scaffold artifact (`max_bars_back.num`, CE10013 from a bad auto-scaffold;
  **manually re-probed → ENFORCED**, `const int`; harness scaffold since fixed).

No data exceptions or schema change were needed - the existing per-overload types
already encode everything.

## The fix (checker + builtins, all data-driven)

`builtins.ts` (reads raw qualifiers/overloads straight from pine-data):
- `typeRequiresConst(rawType)` - structural predicate (const + scalar base, no
  `or`/source blobs, excludes enumerated bases).
- `paramRequiresConst(fn, name)` / `positionalConstParam(fn, index, count)` - a
  param requires const iff every overload that contains it (named) / every
  arity-matching overload at that index (positional) agrees it's const-required.
  Positional matching is **arity-aware** because overloads reshuffle positions.
- `resolveCallReturnRaw(fn, argTypes)` - overload-aware raw return *with*
  qualifier (the merged `returns` loses it). Picks the lowest-qualifier matching
  overload (so const-folding like `color.new(const,const)→const color` is
  respected) and floors at series if any arg is series.
- `getBuiltinVarInfo` / `isBuiltinConstant` - qualifier of a built-in var; const
  constants.

`checker.ts`:
- `checkConstArgs` - for each provided arg targeting a const-required param,
  flags a provably-non-const argument with CE10123 (template + ctx + code,
  byte-identical to TV).
- `describeNonConstArg` - conservative: only positively non-const cases (a
  built-in call whose resolved overload returns simple/series/input, or a
  non-const built-in var/member). Literals, user vars, composite expressions, and
  user functions return null, so we never flag something TV accepts (the cost is
  a few missed FNs, e.g. ternary defvals - acceptable, conservative direction).

## Verification

- The reported case now emits CE10123 byte-identical to TV (same `ctx`).
- Controls stay clean: `timestamp("20 Jul 2021 …")` (const overload),
  `color.new(color.red, 50)` (const-folded), `input.int(60*60)` (const arith).
- `pnpm test`: 207 pass (was 205; +2 INV014 fixtures).
- Regression vs corpus (1879 fixtures): first pass surfaced **14** new
  appearances; **13 were false positives from unsound positional→param mapping on
  overloaded functions** (e.g. `fill(rsiLine, p50, 70, 30, divBearColor, na)`).
  Fixed by the arity-aware `positionalConstParam`. Final pass: **1** new
  appearance - `input.float(defval = math.max(1, math.min(10, close)))` - a
  **confirmed true positive** (TV flags it identically in isolation; in-file TV
  only missed it because it stops at the first error, G001). Zero false positives.
  Baseline re-snapshotted.

## Adjacent finding (NOT fixed here - follow-up)

`FUNCTION_PARAM_TYPE_OVERRIDES` in `packages/pipeline/src/generate.ts` (5 entries:
`nz.source`, `nz.replacement`, `fixnan.source`, `int.x`, `plot.title`) was added
solely on G002's authority and **no longer holds as of 2026-06-02** - TV now flags
all of them. The widenings cause real false negatives we still have:
`plot(title=<non-const>)`, `nz(<bool>/<string>)`, `int(true)` all pass our linter
but are CE10123 in TV. Notably `plot.title` is *masked* by its override (typed
`series string` in pine-data), so INV014's machinery would catch it the moment the
override is removed. The `nz`/`fixnan`/`int` cases are a **base-type** axis (not
const), with broader corpus impact, so removing the overrides + regenerating
pine-data + a corpus regression pass is its own work item. Tracked in `TODO.md`.
See `gotchas/G002` (corrected).
