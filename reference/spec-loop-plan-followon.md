# Spec-loop follow-on plan: the #61 + #9-residual tail after the UDF-inference foundation

(Filename `spec-loop-plan-followon.md`. Renamed from `spec-loop-plan-9.md` to
stop colliding with `spec-9-udf-inference-foundation.md` - both keyed on TODO #9.
The foundation owns #9's inference core; this plan is the orchestration umbrella
for the rest: #60/#61 record, plus the post-foundation Items 4-5.)

The stepped plan the spec-loop (`reference/orchestrate.md`) runs against to drive
the goal **completion of TODO #60 + #61 + #9** to landed commits. Each numbered
item below is one loop run: the loop's step 1 authors that item's full technical
implementation specification (per `reference/technical-implementation-spec.md`)
from the item reference here, and the orchestrator lands one commit per item.

**This plan runs AFTER `reference/spec-9-udf-inference-foundation.md`.** #9's
actual remaining core - robust, call-site-sensitive UDF-return inference - is
specified there as THREE serial spec loops (Piece 1 qualifier-provenance ->
Loop 1; Piece 2 fixpoint + Piece 3 tuple unification -> Loop 2; drop the
INV014/INV016 gates -> Loop 3). Those three loops ARE this plan's old Item 3,
expanded and corrected; they are a **precondition** of the live items here. The
foundation must land green (its Loop 1-3 gates met) before Item 4 starts -
Item 4 depends on Loop 2's grounded inference, and the foundation explicitly
scopes Item 4 and Item 5 OUT of itself (its Section 9) as the work that follows.

Sequencing in one line:

```
Item 1 (LANDED) -> Item 2 (DEFERRED) -> [foundation Loop 1 -> Loop 2 -> Loop 3] -> Item 4 -> Item 5
                                         \____ = old Item 3, done FIRST ____/      \__ this plan's tail __/
```

This document is an orchestration artifact: deleted when the goal is met, its
outcomes folded into git history / `investigations/` / `gotchas/` / `TODO.md`.

## Standing references every per-item spec must cite and READ

- `reference/technical-implementation-spec.md` - the spec contract.
- `reference/spec-9-udf-inference-foundation.md` - the #9 substrate that lands
  before Item 4; its Piece 2 (grounded inference) is the thing Item 4 builds on,
  and its Section 9 names Item 4 / Item 5 as the deferred follow-on. Read it to
  know what the inference now guarantees (UDFs infer their real base or
  `unknown`, never the old `series<float>` guess).
- The originating TODO source for the item (named per item below).
- `CLAUDE.md` + `AGENTS.md`, the **Methodology** (MORE correct than TV; TV
  silence is evidence not authority; Data-vs-Syntax) - the obligations the work
  is judged against.
- The measurement ledger: `pnpm run lint:snapshot` before; refresh the FP/FN
  counts (`pnpm run lint:failures -- --concurrency 4` then `lint:categorize`)
  around any corpus-affecting change.

## Survey of the ground (current truth)

- **#60 - DONE.** Const-composite arg const-ness (INV112); the `plotshape(style=)`
  residual is a proven non-issue (G007). Nothing to build.
- **#9 original non-bool cluster - DONE.** TODO's "over-strict bool" table is
  one `8439b236` mangled-ternary recovery residue (not a real FP).
- **#9 UDF-return inference core - SPECIFIED in the foundation, runs first.** The
  refuted call-site typed-param propagation framing is dead; the live #9 work is
  the foundation's three loops (call-site-sensitive grounded inference + the
  INV014/INV016 gate drop). This plan picks up where they leave off: Item 4
  (INV063 annotation typing, unblocked by Loop 2) and the #61 work below.
- **#61 consistency warnings - the live work outside #9.** A 2026-06-26 triage
  (agent a21df338) of every consistency localOnly-on-TV-clean entry REFUTED the
  prior framing. Item 1 landed the one cleanly fixable FP; Item 2 deferred the
  unreproducible residuals; Item 5 (LANDED) cleared the FN side - INV126 pinned
  it as a user-global series index plus an inconsistent call, not the "library
  data flow" the framing first assumed.

## The items (ordered by dependency; one commit each)

### Item 1 - the IMMEDIATE-gate rule for consistency-warning emission

**STATUS: LANDED (d74060c).** Kept as the record; no further work.

Source: TODO #61; `investigations/INV114`, `INV116`, `INV120`; the a21df338
triage and the a6fffa89 FN-criterion diagnosis. **READ INV120's "The real
criterion" section first - it has the probe-validated rule and the two reverted
attempts.**

**MECHANISM (THIRD attempt - the first two were reverted, read INV120).** Both
prior attempts suppressed CW10002/3/4 based on an ANCESTOR undetermined gate and
over-fired (+5, then +11 tvOnly FNs). The probe-validated rule (P1/P3a/P3b,
2026-06-26) is: suppress a history-dependent call's consistency warning iff its
**IMMEDIATE (innermost) governing condition** is undetermined - references an
untyped param and is not series after masking those param names out of
`seriesVars`. **Judge ONLY the innermost governing condition; do NOT propagate to
descendants.** P1 proves an outer undetermined gate must NOT silence a call whose
immediate gate is series.

This SILENCES `1477fbef`'s `ta.atr` (immediate gate `if not na(src)`,
undetermined - FP cleared) while KEEPING the McGinley `ta.ema`, `_inRange`, and
`ta.crossover`/`ta.crossunder` warnings (their immediate gates are series), so
NONE of the +11 FNs recur.

**SCOPE: this item cleared `1477fbef` `ta.atr` ONLY.** `47d21dbd`'s `ta.sma` is
NOT fixed here - its immediate gate is the series ternary `na(w[1])`, and its TV
silence is a baroque combination (outer undetermined gate AND a distinct-sibling
na-seed; P2b proves the sibling idiom alone still warns). That combination is
exactly the ancestor-aware logic that over-fired, so `ta.sma` is left a
**documented residual FP** (INV120). `71fb0ec4`'s `updateTrendLine` is already
clean on HEAD; its `getTrendLineScore` FN is Item 5.

### Item 2 - DEFERRED: the three consistency-FP carriers have UNREPRODUCIBLE criteria

**STATUS (2026-06-26): all three deferred as documented residuals - like FindST.**
`61a3a7` (`ta.highest`/`lowest`), `6152b9` (`ta.crossunder`), `f1b6bd45`
(`draw_lbl`) are genuine FPs (`compare-tv`: TV 0 errors / 0 warnings, no
error-stop; we warn), but TV's silence reproduces ONLY on the full carrier - SIX
structural/whole-program hypotheses were probed (`--tv`, 2026-06-26) and ALL
warn:
- 61a3a7: outer input.bool guard (Q1); call nested as `color.from_gradient` arg
  (P1B). Both WARN.
- 6152b9: else-if condition position (C1); an identical `ta.crossunder` ALSO
  evaluated unconditionally via plotshape (P2B). Both WARN.
- f1b6bd45: opaque-handle index for side-effect delete (D1, void-tail too);
  const-bounded `for`-loop / loop-counter immediate gate (P3B). Both WARN.

No structural rule we can validate reproduces the silence, so any fix is
guessing (and the consistency area already cost two reverted over-firing attempts
on Item 1). These are unreproducible-criterion residuals, not fixable now -
likely a TV behavior on large/complex files we cannot model. The ONE cleanly
fixable consistency FP was Item 1's `ta.atr` (immediate undetermined gate),
LANDED (d74060c). The triage's "~11 FPs" thus resolves to: 1 fixed, ~3
unreproducible (here), 1 baroque residual (`ta.sma`), the rest TV-error-stops /
G005 phantoms (not real). #61's consistency-FP side is effectively closed.

The original sub-fix hypotheses (now refuted) are kept below for the record.

Source: the a21df338 triage; TODO #61. Original (refuted) sub-fix hypotheses:

1. **Outermost-guard for nested conditionals** (`61a3a7`): a `trend_shadow ?
   (difff>0 ? ...ta.highest... : ...) : na` - the OUTER guard is `input.bool`
   (const, TV silent); we descend into the inner series ternary and warn. Use
   the outermost governing guard's qualifier.
   **CRITICAL - reconcile with the just-landed immediate-gate rule (INV120, see
   git d74060c / `checkConditionalSeriesCall`'s `conditionalGateUndetermined`).**
   Item 1 landed "judge the INNERMOST gate" for the UNDETERMINED case (an outer
   undetermined gate does NOT silence an inner series call - probe P1). This
   sub-fix is the apparent OPPOSITE for the CONST/INPUT case (an outer const/input
   guard DOES silence an inner series call). Both can be true - they are different
   outer-qualifier cases - but the spec MUST build a coherent governing-qualifier
   model that covers: outer-undetermined+inner-series -> WARN (landed); outer-
   const/input+inner-series -> SILENT (this); outer-series anything -> WARN. It
   MUST first PROBE these via `pine-lint --tv` (propose the minimal scripts; the
   orchestrator runs them) BEFORE any code, because two prior Item-1 attempts that
   guessed the scope (ancestor vs immediate) BOTH over-fired (+5, +11 FNs) - the
   const/input case is unprobed and high FN-risk. Confirm whether TV's rule is
   really "innermost non-series ancestor wins" or something else.
   **REFUTED (probed `--tv` 2026-06-26):** Q1 (`b=input.bool(true)` /
   `c = b ? (close>open ? ta.highest(close,100):ta.lowest(close,100)) : 0.0`)
   WARNS (ta.highest+ta.lowest), same as the Q2 control (no outer guard) and Q6
   (if-block form). So an outer const/input guard does NOT silence an inner
   series call - the outer-guard hypothesis is wrong, and sub-fix 1 must NOT
   land. `61a3a7`'s real silence cause is unknown (likely a TV-error-stop or
   G005 mis-attribution like `13a745`/`577f11`, or a `color.from_gradient`
   wrapping effect) - DEFERRED as a documented residual pending re-diagnosis of
   the actual carrier. This is the SAME triage-hypothesis-refuted-by-probe
   pattern as Item 1's two reverted attempts.
2. **Condition-position exclusion** (`6152b9`): `else if ta.crossunder(h1,h2)` -
   a history-dependent builtin in if/else-if CONDITION position is not a guarded
   call; TV does not flag it, we do.
3. **UDF history-dep refinement** (`f1b6bd45` `draw_lbl`): a `var`-declared
   opaque (label/line) indexed purely for a side-effect `delete` (`label.delete(
   lbl[1])`) should not make the UDF history-dependent; TV is silent.

Out of this item (measurement / probe, not code): the 14 TV-error-stopped
occurrences (`13a745`, `577f11`) are excluded from the FP tally (no change);
`math.sum` (`25a4a7`) gets a `--tv` probe first - the triage suspects we may be
MORE correct there, so it is investigated, not "fixed", and only acted on if the
probe shows a real FP.

### Item 3 - #9 robust UDF-return inference - SUPERSEDED by the foundation (the 3 loops, done first)

**This item is now `reference/spec-9-udf-inference-foundation.md`.** What was a
single bullet here ("make UDF-return inference robust enough to drop the INV014 /
INV016 gates") was too coarse - it hid the call-site-insensitivity root bug
(checker.ts:1865's `series<float>` guess), the dual param-binding path, and the
const-preservation rule the earlier framing had BACKWARDS. The foundation
decomposes it into three serial loops, each closing a specific prior-revert
cause:

- **Loop 1 - Piece 1 (qualifier-provenance).** Make qualifiers (`series > simple
  > input > const`) first-class/inspectable so the const-arg gate drop is even
  expressible. FP-neutral; zero corpus change expected.
- **Loop 2 - Piece 2 (call-graph fixpoint) + Piece 3 (tuple unification).** The
  inference rewrite: bind untyped params to the join of actual call-site args,
  ground unresolved leaves to `unknown` (never a wrong scalar), union ALL return
  points, key profiles by declaration identity. This is what makes inference
  RELIABLE and is the load-bearing unblock for Item 4 (the INV063 line-UDFs now
  infer their real base / `unknown`, not `series<float>`).
- **Loop 3 - drop the INV014 (`describeNonConstArg`) and INV016
  (`isReliablyTyped`) gates.** The payoff: the through-variable CE10123s get
  caught, every new appearance a named TV-confirmed true positive, zero TV-silent
  new appearances.

**Precondition for Item 4:** all three loops landed green (the foundation's
Loop 1-3 gates), with the warning-channel tvOnly baseline (7) unperturbed and the
INV063 carriers comparing clean under `debug:compare`. Item 4 does not start
until then.

### Item 4 - INV063 drawing-type / UDT annotation typing

**STATUS: LANDED.** All seven drawing-handle annotations
(`line`/`label`/`box`/`table`/`linefill`/`polyline`/`chart.point`) are typed in
`mapToPineType`; the int-into-handle assignment now fires CE10173, matching TV
(probed per-handle in `investigations/INV125`, 2026-06-27). The 58 prior FPs did
not recur (regression 0 changed). The `Point p = 5` UDT case was already correct
on HEAD; `chart.point` renders bare (not `series chart.point`); a UDT-name
collision FP (a UDT named `Box`/`Line`/... colliding with the lowercased keyword)
was caught by the corpus gate and fixed via case-sensitive matching. See git log
+ INV063/INV125. Record kept below.

Source: `investigations/INV063`; TODO #9 residual. **Depends on the foundation's
Loop 2** (grounded, call-site-sensitive inference) - NOT startable before it.

`line l = 5` / `Point p = 5`: annotations are left untyped in `mapToPineType`
because typing them previously surfaced line-returning UDFs mis-inferred as
`series<float>` (58 corpus FPs in the reverted attempt - the INV063 canary). The
foundation's Piece 2 is exactly the unblock: with the `series<float>` guess gone,
those UDFs now infer `unknown` or their real base, so the line-UDF reassignments
(`lineN := new_level(...)`) no longer mis-type. Type the annotations; verify the
58 prior FPs stay clean (name them in the spec from the INV063 record), since
Loop 2's gate already proved the carriers compare clean.

Gate: INV063 FNs caught (probe-backed); the 58 prior FPs do NOT reappear; suite +
regression green.

### Item 5 - #61 consistency FNs: user-global series index + inconsistent call

**STATUS: LANDED.** `getStandardTrueRange` x2 and `getTrendLineScore` now warn
CW10003. The Step-0 `--tv` probe round (`investigations/INV126`) pinned the real
criterion as a CONJUNCTION: a UDF body that indexes a USER-DECLARED GLOBAL series
var with `[n]` AND an inconsistent (conditional / in-loop) call to it. The
"library data flow" framing was a RED HERRING (INV126 B-k1/B-k2: library taint,
zigzag-derived arrays, and dynamic `array.min` bounds are all irrelevant); the
classification is implemented NON-TRANSITIVELY in `semanticAnalyzer.ts`, so
callers (`updateTrendLine`, `scan`) stay silent, matching TV. This SUPERSEDES
INV119's refutation of the bare user-global-index rule (INV119 tested the two
factors apart, never together). See git log + INV126; record kept below.

Source: TODO #61 (getStandardTrueRange/getTrendLineScore); `investigations/
INV117`, `INV118`, `INV119`, `INV126`. Independent of the #9 foundation (the
foundation's Section 9 names this OUT of scope). NOTE: `71fb0ec4` carries BOTH an
`updateTrendLine` FP (Item 1) and a `getTrendLineScore` FN (here) - distinct
functions, opposite directions.

Gate (met): getStandardTrueRange (x2) + getTrendLineScore warn; the carriers
compare clean (callers silent); ZERO new FPs; suite + regression green.

## Out of scope / blocked (the stopping rule)

- **`FindST` (`db76cf79`)** - TV warns it, criterion unreproducible by probe even
  with the source local (INV117 Family 2). PERMANENTLY BLOCKED, not deferred;
  does not gate goal completion.
- **`math.sum` (`25a4a7`)** - probe-gated inside Item 2; acted on only if the
  `--tv` probe confirms a real FP.
- **G005 line-doubling** on several carriers (the triage's lateral finding:
  emitted lines are ~2x the true source line on stray-CR/CRLF files, a
  phantom-FP risk) is a SEPARATE bug, noted for its own future item, not folded
  into the items above.
- The goal is met when the foundation's three loops AND Items 4-5 land green
  (FindST + the documented probes excepted) and the warning sweep shows the #61
  FP/FN classes cleared or reduced to FindST + documented blockers, with #60 and
  the #9 non-bool cluster already done. No adjacent work is started uninvited; a
  defect found mid-item becomes a new ordered item, not in-item scope creep.
