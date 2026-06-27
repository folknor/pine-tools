# INV126 - Item 5 consistency-FN criterion: user-global index + inconsistent call

Date: 2026-06-27

## Source

`reference/spec-loop-plan-followon.md` Item 5 (#61 consistency-warning FALSE
NEGATIVES: `getStandardTrueRange` x2, `getTrendLineScore`). This is the Step-0
`--tv` probe round the plan mandates (codex cannot run `--tv`), run by the
orchestrator to pin TV's exact criterion BEFORE any spec/code. Supersedes
INV119's refutation of the bare "user-global-index" rule (see Reconciliation).

## Carriers

- **getStandardTrueRange (x2)** -
  `fixtures/6293fd713714b37c8f108b12e64e92399f72036aac8ff8f9f2933ac09e042022.pine`.
  `trueRange()` indexes `sc[1]` where `[stOpen,stHigh,stLow,stClose] =
  getStandardOHLC()` (a tuple-returning UDF). Called CONDITIONALLY (inside
  `if`) and also unconditionally. NOT called in a loop.
- **getTrendLineScore (x1)** -
  `fixtures/71fb0ec4856187e025a1756352472c8af43c1f1833064a8fe2498d23cac8829e.pine`.
  body indexes user-globals `highSource/lowSource[...]` at a dynamic offset,
  loop bound `array.min(zigzag-array)`, called ITERATIVELY inside `updateTrendLine`'s
  `for` loops. `highSource/lowSource` are `= high/low`, conditionally reassigned
  to `ca.macandles/hacandles` library exports.

## Method

One probe per file (TV stops at the first error - G001). Each probe is
error-free and carries a LIVENESS CONTROL: an adjacent conditional `ta.sma`
known to warn CW10003. So `tv` warning count 2 = candidate WARNS (control +
candidate, candidate is `tv-only`); count 1 = candidate SILENT (control only).
The control's presence in TV's list proves TV's consistency checker ran (defeats
the empty-response trap). `pnpm run debug:compare`, 2026-06-27, all `success`.

CW10003 text: `The function "<name>" should be called on each calculation for
consistency.`

## Results

### Battery B - getTrendLineScore (the load-bearing carrier)

| probe | what it changes vs B-full | `score` verdict |
|---|---|---|
| **B-full** | faithful minimal (real `zg.czigzag` + `ca.macandles` + globals + dynamic bound + iterative call) | **WARNS** (tv-only) |
| **B-k1** | drop the library reassignment (`highSource/lowSource` stay `= high/low`) | **WARNS** -> library taint NOT necessary |
| **B-k2** | static loop bound (remove `array.min(zigzagArray)`) | **WARNS** -> dynamic zigzag bound NOT necessary |
| **B-k3** | index BUILTIN `high[..]/low[..]` instead of the user globals | **SILENT** -> user-global index NECESSARY |
| **B-k4** | call `score` ONCE unconditionally (remove the `for`-loop call) | **SILENT** -> inconsistent (in-loop) call NECESSARY |
| **B-min** | intersection: user-global index + in-loop call, NO library, NO zigzag | **WARNS** -> the two ingredients alone suffice |

### Battery A - getStandardTrueRange (conditional-call case)

The original A-full/A-k1/A-k2/A-k3 were MALFORMED: their `getStandardOHLC() =>
cond ? [..] : request.security(..)` is a ternary returning a tuple, which TV
rejects with a hard error (`Ternary operations cannot return tuples`) that
error-stops the warning pass. (Incidental lateral finding: OUR checker does NOT
emit that error - a separate CE FN, out of scope here, candidate for its own
item.) They are superseded by the two minimal probes below, which isolate the
same factor cleanly with a conditional (not loop) call:

| probe | UDF | call context | `tr` verdict |
|---|---|---|---|
| **A-min-userglobal** | `tr() => src[1]` (`src = close`, a user global) | conditional (`close>open ? tr() : 0.0`) | **WARNS** (tv-only) |
| **A-min-builtin** | `tr() => close[1]` (builtin index) | conditional | **SILENT** |

## The pinned criterion

TV emits CW10003 on a user-defined-function call when BOTH hold (conjunction;
neither sufficient alone):

1. **The UDF body indexes a USER-DECLARED GLOBAL series variable with `[n]`**
   (any offset - const `[1]` in A-min, dynamic `[bar_index-bar]` in B-min both
   warn). This is what makes the UDF history-dependent in TV's model. Indexing a
   BUILTIN series (`close[1]`, `high[..]`) does NOT count (A-min-builtin, B-k3
   both SILENT).
2. **The call is in an INCONSISTENT context** - conditional (inside `if`/ternary,
   A-min) OR inside a loop (B-min). A CONSISTENT (unconditional, once-per-bar)
   call does NOT warn (B-k4 SILENT).

Library taint (`ca.macandles`), the zigzag-derived array, and the dynamic
`array.min` loop bound are all IRRELEVANT (B-k1, B-k2, B-min). The plan's
"library data flow" framing for Item 5 is thus a red herring: the real criterion
is purely "user-global series index makes a UDF history-dependent; an
inconsistent call to it warns."

## Reconciliation with INV119 (which REFUTED the user-global-index rule)

INV119 (2026-06-26) probed user-global-index variants and found them all silent,
concluding the criterion was whole-file-emergent. This round shows why those
probes missed it: the trigger is the CONJUNCTION of (user-global index) AND
(inconsistent call). INV119's variants tested the factors in isolation or in the
wrong combination - builtin indexing (silent, B-k3), or consistent/unconditional
calls (silent, B-k4), or user-global index without the inconsistent-call context.
The bare "user-global-index" rule that part-1 tried over-fired +4 FPs precisely
because it lacked ingredient 2 (the inconsistent-call constraint). INV119's
"survives no reduction" conclusion is superseded: B-min reduces it to ~10 lines.

## Implication for Item 5 (LANDABLE, not blocked)

Implementable as a refinement of the existing CW10003 history-dependence model:
treat a UDF as history-dependent when its body indexes a user-declared global
series with `[n]`; the existing inconsistent-call-context detection
(conditional/loop) then fires for both carriers. FP boundary to honour in the
spec/impl: a builtin index must NOT count, and a consistent call must NOT warn -
and the implementation MUST verify ZERO new FPs against the corpus, naming and
re-checking the INV119 +4 over-fire cases and the INV120 reverted attempts
(this consistency area has a history of over-firing). Gate (per plan Item 5):
getStandardTrueRange x2 + getTrendLineScore warn; `compare-tv` clean on the
carriers; ZERO new FPs; suite + regression green.

## Implementation result

Date: 2026-06-27

Implemented in `packages/core/src/parser/semanticAnalyzer.ts` as a
non-transitive user-global-index UDF classification:

- direct program-body series declarations are collected into `globalSeriesVars`;
- top-level UDFs/methods whose body indexes one of those globals are collected
  into `globalIndexDependentUdfs`;
- `checkConditionalSeriesCall` treats that set as history-dependent only for
  emission at the call site;
- `globalIndexDependentUdfs` is intentionally not consulted by
  `isHistoryDependentFunction`, so callers do not inherit this classification.

Regression fixture:
`packages/core/test/fixtures/regression/userglobal-index-consistency.pine`.

Local verification, 2026-06-27:

- `node_modules/.bin/tsc -p .`: pass.
- `node_modules/.bin/tsc --noEmit`: pass.
- `node_modules/.bin/vitest run`: 13 files, 412 tests passed.
- `node scripts/regression-check.mjs`: 0 changed fixtures, 0 new error
  appearances, 0 disappeared appearances.
- `node dist/packages/cli/src/cli.js --human fixtures/6293fd713714b37c8f108b12e64e92399f72036aac8ff8f9f2933ac09e042022.pine`:
  emits `getStandardTrueRange` at lines 410 and 412, and the pre-existing
  `cust_series` x2 still warns.
- `node dist/packages/cli/src/cli.js --human fixtures/71fb0ec4856187e025a1756352472c8af43c1f1833064a8fe2498d23cac8829e.pine`:
  emits only the intended `getTrendLineScore` consistency warning at raw line
  257; no `updateTrendLine` or `scan` cascade appears.
- `node dist/packages/cli/src/cli.js --human fixtures/1477fbefe1fbce39427511d62db0c0a70367b3612f62b726135773dfdebd256a.pine`:
  still only the pre-existing `uptrend` LOCAL_HISTORY warning.
- `node dist/packages/cli/src/cli.js --human fixtures/47d21dbd3a079b6b88f11405dc9096d46aca8399bd1baf470c7134b0da334834.pine`:
  pre-existing warnings remain (`ta.barssince`, `ta.sma`, `ta.ema`,
  `slhalfe`), confirming the INV120 immediate-gate boundary did not move.

TV/corpus gate status in this sandbox, 2026-06-27:

- `pnpm run lint:snapshot`, `pnpm run lint:failures -- --concurrency 4`,
  `pnpm run lint:categorize`, and `pnpm run install:cli` all failed before the
  project scripts ran with pnpm `unable to open database file`, so the
  equivalent direct node/binary commands above were used.
- `node scripts/compare-tv.mjs` on both carriers failed with `tv side
  unavailable (exit 2)` / `Unexpected end of JSON input`.
- `node scripts/find-real-failures.mjs --concurrency 4` was run before and
  after implementation. Both runs completed local parsing, but all 748 TV
  responses were unparseable, so the refreshed 0-local-only / 0-tv-only category
  counts are not a meaningful remote parity measurement.
- `node scripts/snapshot-local-lint.mjs` after implementation wrote a stable
  local snapshot: 1879 fixtures, 622 fixtures with errors, 16057 total error
  records.

## Authoritative landing gate (orchestrator, 2026-06-27, working TV)

Re-run in the main environment (TV reachable), AFTER fixing a step-5 review
error that had set the new fixture's `// @expects warning` lines to the
full-file call-site lines (26/29) instead of the directive-stripped harness
lines (22/25); `parseTestFile` strips the four leading `// @expects` lines, so
fixture assertions are in stripped-code coordinates. With 22/25 restored:

- `pnpm run check`: clean. `pnpm test`: 13 files, 412 tests pass.
- `pnpm run install:cli` + `pnpm run lint:regression`: 1879 fixtures, 0 changed,
  0 new error appearances (Item 5 is warning-channel; error channel untouched).
- `pnpm run debug:compare` on both carriers (after one transient TV retry on
  carrier 1): BOTH carriers now `tv-only: 0` for warnings - i.e. we now MATCH TV:
  `getStandardTrueRange` x2 and `getTrendLineScore` are emitted (shared with TV),
  and `updateTrendLine`/`scan` stay silent (no cascade). The residual local-only
  warnings on both carriers are pre-existing unused-variable warnings, not
  consistency warnings.
- `pnpm run lint:failures -- --concurrency 4` (748 v6 fixtures, working TV) +
  the warning channel: **warning tvOnly 7 -> 4** (the 3 carrier FNs -
  getStandardTrueRange x2 + getTrendLineScore - now caught; the remaining 4 are
  documented residuals: 3 CW10013 "Shadowing variable" + 1 `FindST`). **warning
  localOnly 1311 - NOT increased** vs the pre-landing baseline (1311/1312), so
  ZERO new consistency-warning false positives corpus-wide. The error channel is
  unchanged (29 local-only, all pre-explained probe-backed TPs; 0 tv-only; 1
  same-pos enum residual). 4 TV responses transiently unparseable (retmax noise).

Net: both target FNs closed, zero new FPs, the non-transitive design held - the
INV119 +4 / INV120 +5/+11 over-fires did not recur. Item 5 lands clean.
