# INV120 - undetermined qualifier gate for consistency warnings

**Date:** 2026-06-26
**Status:** third fix landed: the immediate-gate rule. The first two mechanisms
were reverted after net-negative corpus warning sweeps. They both cleared the 2
target FPs (warning localOnly 1312 -> ~1309) but introduced MORE tvOnly FNs than
the FPs they fixed:
- Attempt 1 (derived-local: mark a local `undetermined` because derived from
  undetermined args): tvOnly 7 -> 12 (+5 `ta.ema` ternary FNs).
- Attempt 2 (outer-branch `underUndetermined` CONTEXT gating CW10002/3/4 emission,
  with untyped-param masking of `seriesVars`): tvOnly 7 -> **18** (+11: 5
  `ta.ema`, 2 `ta.crossover`, 2 `ta.crossunder`, 2 `_inRange`, ...). WORSE.
Both were reverted (gate: net FNs > FPs fixed). TV probes (below) are all
`success:true` and correct; the mechanisms are the problem, not the probes.
**RESOLVED (third diagnosis, probe-validated):** the criterion is the IMMEDIATE
(not ancestor) governing gate - see "The real criterion" section below. The third
fix lands the immediate-gate rule (clears `ta.atr`; `ta.sma` deferred as a
documented residual). P1 proves the reverted ancestor/context criterion was too
broad: an outer undetermined gate does not silence a call whose immediate gate is
series.
**Code:** `packages/core/src/parser/semanticAnalyzer.ts`.
**Source:** TODO #61 residual, INV114 residual, INV116 residual.

## Finding

TV treats an untyped UDF parameter as `undetermined type`. A branch governed by
one is not a per-bar-varying gate for CW10002/3/4 unless the condition is series
for another reason. Our emission pass only knew whether the active branch was in
conditional scope, so two undetermined outer-gate cases over-warned:

- a UDF param shadowed a same-named series global, so `if not na(src)` entered
  conditional scope and warned on `ta.atr`.
- a genuinely series local `w`, inside `if type == "SMMA"` where `type` is an
  untyped param, entered ternary conditional scope and warned on `ta.sma`.

The load-bearing correction from probes B/C/D is that TV still types `w` as
`series float`. The silence comes from the enclosing undetermined gate, not from
propagating undetermined status into locals.

## Change

The analyzer now records the current function's untyped params during the
emission pass and stores one `conditionalGateUndetermined` boolean per
conditional frame, in lockstep with `conditionalScopeKinds`. The verdict is
computed only for the immediate `if` condition, ternary condition, and switch
discriminant gates. `isUndeterminedGate` first checks whether the condition
references an untyped param, then temporarily masks those names out of
`seriesVars` before asking `isSeriesishExpression`.

That localized masking handles the shadowed-user-global carrier (`src`) without
changing the permanent series view of params or locals. `checkConditionalSeriesCall`
now suppresses CW10002/3/4 only when the innermost active frame is undetermined.
Ancestor undetermined gates do not propagate to descendants. The scan pass,
LOCAL_HISTORY, shadowing, `withSeriesParams`, and `isSeriesishExpression` remain
otherwise unchanged.

## The real criterion (third diagnosis - probe-validated 2026-06-26)

Both reverted attempts keyed on the WRONG SCOPE: they suppressed CW10002/3/4 when
ANY ANCESTOR gate referenced an undetermined param. TV judges by the **IMMEDIATE**
governing construct only. Decisive in-corpus control: `47d21dbd`'s `ma(type,...)`
has the silent SMMA `ta.sma` AND the warned McGinley `ta.ema` under the SAME outer
`if type` undetermined gate - so the outer gate is not the cause.

Probes (`pine-lint --tv`, 2026-06-26, main session):

| probe | shape | TV |
|---|---|---|
| P3a | unconditional `ta.sma` inside `if flag` (flag = untyped param) | **silent** |
| P3b | same under `if cond` (cond = `close > open`, series) | warns |
| P1 | outer `if flag` (undet) + immediate `close>open ? ta.sma : na` | **warns** (ancestor does NOT silence) |
| P2a | `r := na(r[1]) ? ta.sma : expr(r[1])` self-ref, no outer gate | warns |
| P2b | `w=ta.wma; r := na(w[1]) ? ta.sma : expr(w[1])` sibling, no outer gate | warns |

**Validated rule (the IMMEDIATE-gate rule):** suppress a history-dependent call's
consistency warning iff its IMMEDIATE (innermost) governing condition is
undetermined (references an untyped param, not series after masking). Do NOT
propagate to descendants. This:
- SILENCES `ta.atr` (`1477fbef`: immediate gate `if not na(src)`, undetermined) - FP cleared.
- KEEPS the +11 would-be FNs (McGinley/`_inRange`/crossover all have a SERIES
  immediate gate) warning - no FN. P1 is the proof.

**The `ta.sma` carrier (`47d21dbd`) is NOT fixed by the immediate-gate rule** (its
immediate gate is the series ternary `na(w[1])`). Its silence is a baroque
COMBINATION: outer undetermined gate AND a distinct-sibling na-seed (`w != target`)
- P2b proves the sibling idiom alone (no outer gate) still warns, and McGinley
proves self-ref under the gate still warns. Reproducing that combination is exactly
the ancestor-aware logic that over-fired. **Deferred as a documented residual FP**;
the third fix lands only the immediate-gate rule (clears `ta.atr`, leaves `ta.sma`).

## Corrected mechanism (landed third attempt)

The fix is to attach the undetermined verdict to the conditional frame that was
entered by the immediate governing condition, not to mark derived locals
undetermined and not to carry an ancestor `underUndetermined` context. INV116's
own-scope history scan keeps its separate `underUndetermined` logic; emission
uses the top `conditionalGateUndetermined` frame only.

Why this is right and the reverted mechanisms were wrong:
- `1477fbef` sits under an immediate undetermined gate (`if not na(src)`, `src`
  an untyped param shadowing a series global). The top frame is undetermined, so
  `ta.atr` is suppressed.
- The P1 guard has an outer undetermined gate over an inner series ternary gate.
  The top frame is the ternary, so `ta.atr` still warns.
- `47d21dbd`'s `ta.sma` remains a documented residual FP because its immediate
  gate is the series ternary `na(w[1])`. Its TV silence depends on the more
  complex outer-undetermined plus distinct-sibling-na-seed shape that the
  reverted ancestor rule over-suppressed.

So: do not touch `isSeriesishExpression`'s view of a local's series-ness; do not
propagate undetermined context to descendants. The emission predicate masks
untyped params before the series check, so it intentionally differs from the
own-scope history scan on the shadowed-global case.

## Probe replay

The codex implement run is network-sandboxed and could not reach `--tv`; the four
probes were replayed in the main session (`pine-lint --tv`, 2026-06-26), all
`success:true`. The scripts and the ACTUAL verdicts are below.

### PREMISE CORRECTION (probes B/C/D) - load-bearing

The spec premised that TV reports the derived local `w = ta.wma(<undetermined
args>)` as `undetermined type`. **That is wrong.** TV types `w` as **`series
float`** in all of B/C/D, and types the function return `series float`/`simple
float` accordingly - TV does NOT propagate undetermined-ness from undetermined
arguments into a local. TV is nonetheless SILENT on the carrier because the
ENCLOSING branch is undetermined-gated (`if type == "SMMA"`, `type` an
undetermined param) - the same INV116 outer-gate mechanism - NOT because `w` is
undetermined.

Consequence: the implementation must not mark `w` or any other derived local
undetermined. The landed mechanism keeps `w` series and suppresses only because
the active branch is under an undetermined outer gate. A series local derived
from untyped params still warns when it governs a conditional outside such a
gate, preserving the McGinley `ta.ema` positives.

The scripts and per-probe verdicts:

### Probe A

```pine
//@version=6
indicator("t")
src = input.source(close)
volStop(src, atrlen, atrfactor) =>
    if not na(src)
        a = ta.atr(atrlen)
        a
plot(volStop(src, 14, 2))
```

Actual TV result (`--tv`, 2026-06-26): `success:true`, 0 errors, no consistency
warning on `ta.atr`. The param `src` is `undetermined type` (scope #2), distinct
from the global `src` = `input float` (scope #1); `atrlen`/`atrfactor` also
`undetermined type`; `volStop` returns `undetermined type`. (The only warning is
an incidental `atrfactor` declared-but-never-used, from the minimal probe.) This
matches the spec's expectation and confirms the param-undetermined half.

### Probe B

```pine
//@version=6
indicator("t")
ma(type, src, len) =>
    float result = 0
    if type == "SMMA"
        w = ta.wma(src, len)
        result := na(w[1]) ? ta.sma(src, len) : (w[1] * (len - 1) + src) / len
    result
plot(ma("SMMA", close, 14))
```

Actual TV result (`--tv`, 2026-06-26): `success:true`, 0 errors, **0 warnings**.
`type`/`src`/`len` are `undetermined type`; `result` is `simple float`; **`w` is
`series float`, NOT `undetermined type`**. TV is silent despite `w` being series
because the enclosing `if type == "SMMA"` is undetermined-gated (see the premise
correction above).

### Probe C

```pine
//@version=6
indicator("t")
ma(type, src, len) =>
    w = ta.wma(src, len)
    w
plot(ma("SMMA", close, 14))
```

Actual TV result (`--tv`, 2026-06-26): `success:true`, 0 errors (only an
incidental `type` unused-var warning). `type`/`src`/`len` are `undetermined
type`; **`w` is `series float`** and `ma` returns `series float`. Refutes the
"derived local is undetermined" premise: undetermined args do NOT taint `w`.

### Probe D

```pine
//@version=6
indicator("t")
ma(type, len) =>
    w = ta.wma(close, len)
    w
plot(ma("SMMA", 14))
```

Actual TV result (`--tv`, 2026-06-26): `success:true`, 0 errors (only an
incidental `type` unused-var warning). `type`/`len` are `undetermined type`;
**`w` is `series float`** (here `ta.wma(close, len)` mixes a series `close` with
an undetermined `len`); `ma` returns `series float`. Same refutation as B/C.

## Verification

- `pnpm run lint:snapshot` before implementation: blocked by pnpm itself with
  `[ERROR] unable to open database file`. Direct script execution was used for
  local measurement where possible.
- `node scripts/snapshot-local-lint.mjs`: baseline written for 1879 fixtures;
  622 fixtures with errors; 16063 total error records.
- `node scripts/find-real-failures.mjs --concurrency 4`: blocked as a TV parity
  gate in this sandbox. Local responses parsed, but all 748 TV responses were
  unparseable, so localOnly/tvOnly warning counts could not be trusted.
- `node scripts/build-extension.js`: pass.
- `node_modules/.bin/tsc --noEmit`: pass.
- `node_modules/.bin/tsc -p .`: pass.
- `node_modules/.bin/vitest run`: 11 files, 383 tests passed.
- `node scripts/regression-check.mjs`: 0 fixture changes, 0 new error
  appearances, 0 disappeared errors.
- `node dist/packages/cli/src/cli.js --human packages/core/test/fixtures/regression/consistency-warning-immediate-gate.pine`:
  exactly two `ta.atr` consistency warnings, at lines 21 and 29. The line 13
  immediate-undetermined gate is silent.
- `node dist/packages/cli/src/cli.js --human fixtures/1477fbefe1fbce39427511d62db0c0a70367b3612f62b726135773dfdebd256a.pine`:
  only the pre-existing `uptrend` LOCAL_HISTORY warning remains; zero `should be
  called` warnings.
- `node dist/packages/cli/src/cli.js --human fixtures/47d21dbd3a079b6b88f11405dc9096d46aca8399bd1baf470c7134b0da334834.pine`:
  the pre-existing `ta.barssince()` CW10002 warning, `ta.sma`, `ta.ema`, and
  `slhalfe` unused-variable warnings remain. This confirms the deferred
  residual was not accidentally cleared.
- `node scripts/compare-tv.mjs fixtures/1477fbefe1fbce39427511d62db0c0a70367b3612f62b726135773dfdebd256a.pine`:
  blocked with `tv side unavailable (exit 2)` / `Unexpected end of JSON input`.
- `node scripts/find-real-failures.mjs --concurrency 4` in the codex sandbox:
  invalid as a TV parity gate; all 748 TV responses were unparseable.
- A later network-capable sweep (`pnpm run lint:failures -- --concurrency 4`
  then `pnpm run lint:categorize`, 2026-06-26) DID land valid `success:true`
  TV responses and is the parity measurement of record: **warning consistency
  localOnly 1312 -> 1311** (the `1477fbef` `ta.atr` carrier cleared, zero new
  localOnly entries) and **warning tvOnly HELD at 7** - the decisive FN gate,
  unchanged, so neither reverted attempt's +5 / +11 FN regression recurred.
  This is the keep verdict for the immediate-gate rule.

The regression fixture
`packages/core/test/fixtures/regression/consistency-warning-immediate-gate.pine`
pins the `ta.atr` suppression plus the genuine-series and nested immediate-gate
controls. `47d21dbd` `ta.sma` remains a documented residual FP.
