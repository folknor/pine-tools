# Spec-loop plan: complete #60 + #61 + #9

The stepped plan the spec-loop (`reference/orchestrate.md`) runs against to drive
the goal **completion of TODO #60 + #61 + #9** to landed commits. Each numbered
item below is one loop run: the loop's step 1 authors that item's full technical
implementation specification (per `reference/technical-implementation-spec.md`)
from the item reference here, and the orchestrator lands one commit per item.

This document is an orchestration artifact: deleted when the goal is met, its
outcomes folded into git history / `investigations/` / `gotchas/` / `TODO.md`.

## Standing references every per-item spec must cite and READ

- `reference/technical-implementation-spec.md` - the spec contract.
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
  one `8439b236` mangled-ternary recovery residue (not a real FP). #9's only
  remaining lever is robust UDF-return inference and its downstream (Items 3-4).
- **#61 consistency warnings - the live work.** A 2026-06-26 triage (agent
  a21df338) of every consistency localOnly-on-TV-clean entry REFUTED the prior
  framing. Findings that drive the items below:
  - **The typed-param premise is dead.** ZERO of the ~11 FPs are typed-param
    monomorphization. INV114/INV116 residual notes mislabel them - every carrier
    has UNTYPED params. So per-call-site typed-param qualifier propagation (the
    framing I originally gave #9 Phase 1) fixes NONE of #61's FPs. That spec
    (`spec-item-1-arg-qualifier-propagation.md`) is deleted as refuted.
  - **14 of 27 occurrences are not FPs at all** (`13a745`, `577f11`): TV stopped
    at a compile error and never ran its warning pass. Drop from the tally; no
    code change.
  - **The 7 genuine TV-clean carriers** need four distinct, tractable, NON-#9
    fixes - Items 1 and 2 below.

## The items (ordered by dependency; one commit each)

### Item 1 - the IMMEDIATE-gate rule for consistency-warning emission

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

**SCOPE: this item clears `1477fbef` `ta.atr` ONLY.** `47d21dbd`'s `ta.sma` is
NOT fixed here - its immediate gate is the series ternary `na(w[1])`, and its TV
silence is a baroque combination (outer undetermined gate AND a distinct-sibling
na-seed; P2b proves the sibling idiom alone still warns). That combination is
exactly the ancestor-aware logic that over-fired, so `ta.sma` is left a
**documented residual FP** (INV120). `71fb0ec4`'s `updateTrendLine` is already
clean on HEAD; its `getTrendLineScore` FN is Item 5.

Gate: `1477fbef` `ta.atr` goes to zero `should be called` warnings
(`compare-tv`); the warning sweep shows **tvOnly UNCHANGED at 7** (the decisive
FN check - both prior attempts FAILED here at 12 and 18) AND localOnly down (the
`ta.atr` carrier, and any other immediate-undetermined-gate FPs that clear
clean); `pnpm test` + `pnpm run install:cli` + `pnpm run lint:regression` green
(error channel 29/0/1). Pin with a regression fixture using P3a (silenced) +
P3b/P1 (still warn) controls. Step 6 must CORRECT the INV114/INV116 residual
notes and TODO #61's stale typed-param framing, and record `ta.sma` as the
deferred residual.

### Item 2 - the remaining three consistency-FP root causes

Source: the a21df338 triage; TODO #61. The other 4 genuine carriers; may split
into separate commits if a spec finds them unorderable together.

1. **Outermost-guard for nested conditionals** (`61a3a7`): a `trend_shadow ?
   (difff>0 ? ...ta.highest... : ...) : na` - the OUTER guard is `input.bool`
   (const, TV silent); we descend into the inner series ternary and warn. Use
   the outermost governing guard's qualifier.
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

Gate: each carrier's consistency-localOnly goes 0, ZERO new FPs, suite +
regression green, per-carrier regression fixtures.

### Item 3 - #9 robust UDF-return inference + drop INV014 / INV016 gates

Source: TODO #9 (the INV014 const-arg / INV016 union-arg gate note);
`investigations/INV014`, `INV016`. This is #9's actual remaining lever (not the
refuted call-site propagation).

INV014/INV016 currently SKIP args typed via UDF returns / user vars to avoid FPs,
missing real violations flowing through a variable. Make UDF-return inference
robust enough to drop those gates.

Gate: new true positives caught are each `--tv`-probe-backed (recorded in the
INV); ZERO new FPs in the sweep; suite + regression green.

### Item 4 - INV063 drawing-type / UDT annotation typing

Source: `investigations/INV063`; TODO #9 residual. Depends on Item 3.

`line l = 5` / `Point p = 5`: annotations left untyped in `mapToPineType` because
typing them surfaced line-returning UDFs mis-inferred as `series<float>` (58
corpus FPs in the reverted attempt). Item 3's robust UDF-return inference is the
unblock. Type the annotations; verify the 58 prior FPs stay clean (name them in
the spec from the INV063 record).

Gate: INV063 FNs caught (probe-backed); the 58 prior FPs do NOT reappear; suite +
regression green.

### Item 5 - #61 consistency FNs: library data flow (Phase 2)

Source: TODO #61 (getStandardTrueRange/getTrendLineScore); `investigations/
INV117`, `INV118`, `INV119`.

`highSource` reassigned from history-dependent `ca.macandles`/`hacandles`
exports, zigzag-derived arrays into `array.min` into the loop bound. INV119
refuted the naive user-global-index rule; the cause is library data flow. Step 0
of this item's spec is a Claude side-step `--tv` probe round (codex cannot run
`--tv`) to pin TV's exact criterion, recorded as a new INV BEFORE any change.
NOTE: `71fb0ec4` carries BOTH an `updateTrendLine` FP (Item 1) and a
`getTrendLineScore` FN (here) - distinct functions, opposite directions.

Gate: getStandardTrueRange (x2) + getTrendLineScore warn; `compare-tv` clean on
the carriers; ZERO new FPs; suite + regression green.

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
- The goal is met when Items 1-5 land green (FindST + the documented probes
  excepted) and the warning sweep shows the #61 FP/FN classes cleared or reduced
  to FindST + documented blockers, with #60 and the #9 non-bool cluster already
  done. No adjacent work is started uninvited; a defect found mid-item becomes a
  new ordered item, not in-item scope creep.
