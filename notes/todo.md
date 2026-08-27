# TODO

Discrepancies between our linter and TradingView's pine-lint over 748 v6
fixtures.

- **disagreements where we flag and TV doesn't** ("FP"-labelled) -
  some are genuine over-strictness in our linter, some are us
  correctly catching what TV missed (see INV001 for the canonical
  example).
- **disagreements where TV flags and we don't** ("FN"-labelled).

Current counts live in `lint-reports/failures-by-category.json` -
regenerate with `node scripts/find-real-failures.mjs` followed by
`node scripts/categorize-failures.mjs`. Past investigations are
indexed at [investigations/README.md](../investigations/README.md)
and are not duplicated here - this file is for *pending* work only.

(This file lived at `TODO.md` in the repository root until 2026-08-25, which
is the name older investigation notes cite it by.)

Measurement note, 2026-08-25 (current state; earlier per-INV notes live in git
history and in each investigation, per G001 - they were dated point-in-time
records, not standing facts).

**Full TV sweep, 2026-08-27** (`lint:failures`, 748 v6 fixtures, commit
`27a0538`): errors at **29 local-only / 0 tv-only / 1 same-position message
pair**. The error window is **byte-identical to the 2026-08-25, 2026-08-15 and
2026-06-28 sweeps**, now across INV133-INV171 - and the 29 are still the same
three categories: 20 probe-backed CE10156 wrap TPs in 2 files, 8 `bar index`
mangle sites in 1 file, and 1 mangled ternary-wrap residue.

This is the sweep that gates the three landings of 2026-08-27, and it is the
only gate that could have caught them: INV169 (positional after named) and
INV170 (a built-in const/variable called as a function) each ADD an error
class, and INV171 reworded 194 union diagnostics - yet local-only did not
move, tv-only stayed 0, and warning tv-only stayed 0. Note what that does and
does not establish: the corpus contains none of those three shapes, so this
confirms **no false positives were introduced**, not that the new rules fire
anywhere in it. The fixtures carry the positive evidence.

The 1 same-position pair is NOT a wording disagreement and must not be read as
one: TV answers `Cannot read properties of undefined (reading 'pinePos')` on
that line - a translator crash, the G002 trap shape - against our enum
field-type error. Pre-existing and unrelated to INV171's rewording.

This retires the staleness caveat this file carried since INV146. That caveat
predicted INV146's pre-v5 refusal and INV148's v6-only argument-name gate would
move the split by construction; both change what NON-v6 fixtures report, and
the split counts v6 fixtures only, so the window did not move.

**warning local-only is 12** (plus 47 past TV's stop), first measured
2026-08-25 after INV168 fixed the if-expression walk gap and **re-confirmed
unchanged by the 2026-08-27 sweep** (local warnings 431, TV warnings 376) -
the sweep that produced the 41 below ran before that fix. That sweep also re-confirmed the error
window above unchanged and warning tv-only still 0, so the 29 records the fix
removed cost no false positives. The 41 figure and its history are kept below
because the collapse it describes is still the reason this column is readable
at all. It was down from the 1292
comparable figure of the 2026-08-15 sweep. Most of that collapse is INV166
moving UNUSED_VARIABLE to the `lint` stage, which `find-real-failures.mjs`
drops before diffing - the `C_*` unused-var churn named below as the dominant
source of this column's instability is gone from it entirely. The column is
worth reading again, with the G001 caveat below still standing.

**warning tv-only is 0.** It read 1 mid-session - a CW10003 on a conditional
library-member call - and INV167 fixed it the same day; the figures above are
from the post-fix sweep, which also left warning local-only unchanged at 41.
It is still 0 in the post-INV168 sweep. See #80.

Two categories are now *expected* local-only and must not be read as
over-strictness when that sweep happens - both are TV holes we deliberately do
not match, each pinned by a fixture: G008 (collection `:=` skips the element
check - unsound, TV lets a float into an `array<int>` through the alias) and
G006's declaration extension (an untyped param makes TV discard an explicit
`bool` annotation).

Re-snapshotted 2026-08-27 after INV169: **1879 fixtures, 770 with errors, 7094
error records** (+1). The added record is the new positional-after-named error
on `13a7451...pine`, adjudicated a true positive against TV on a minimized
repro before the baseline moved - the file's own `--tv` call returns
`validation failed` rather than a verdict, so it settles nothing. The error
window against TV therefore reads one higher until the next `lint:failures`
sweep re-measures it; the record is ours-and-correct, not a new disagreement.
(The baseline file itself is gitignored, so a fresh checkout must re-run
`pnpm run lint:snapshot` to get these numbers.)

The previous baseline, for the history below: re-snapshotted 2026-08-25 at 1879
fixtures, **770 with errors, 7093 error records**, with
`node scripts/regression-check.mjs` reporting a clean **0 changed fixtures / 0
new error appearances**. (The 2026-08-21 snapshot read 774 / 7103; the
difference is INV163's two destructuring fixes, which collapse cascades.) The
jump from the 2026-08-15 figures (621 / 16056) is
INV146 plus INV148 and is fully accounted for: the pre-v5 refusal gives an
error to 643 previously-clean legacy fixtures (+files), while replacing each
file's v4 cascade with a single diagnostic (-records).

(An earlier note claimed a re-snapshot had happened on 2026-08-03; it had not -
the on-disk baseline was still the 2026-06-28 one, 622/16057, and every run
since carried the `2997d729…` v5 disappearance as a phantom changed fixture.
Corrected 2026-08-15.)

Full vitest: 473 passing.

The 2026-08-15 sweep's warning local-only read 1423 raw, of which **131 were
`lint`-stage records** (116 REPAINTING_SECURITY + 15 ACCUMULATOR_LIFETIME) that
TV can never emit by construction - so the comparable figure then was **1292**.
`find-real-failures.mjs` drops the `lint` stage before diffing (see INV144),
which is why that stored report still contained them: the filter landed after
it ran. The 2026-08-25 figure of 41 above is native.

The `lint`-stage half of that split moved on 2026-08-23: INV151 removed 10
REPAINTING_SECURITY false positives (offsets taken inside a helper) and INV152
then dropped the `lookahead_off` exemption, taking the corpus count to 193.
INV153 then split those 193 by `lookahead` - 23 `LOOKAHEAD_BIAS` (the calls that
really do read future data) and 170 reworded `REPAINTING_SECURITY` - without
changing the total. None of these figures enter the TV comparison - the stage is
dropped before diffing - but the 116 above is superseded as a description of the
rule.

Note on the checks added 2026-08-03 (INV141/INV142/INV143): all three are
classes the corpus CANNOT carry, so their 0-changed regression results are not
evidence of coverage on their own - each is pinned by probes and a fixture
instead. See each INV's Verification section for what negative evidence the
corpus does supply. The same caveat applies to INV144's semantic lints (a
channel TV has no counterpart for) and INV145's triple-delimited multiline
strings (an April 2026 language feature the corpus predates entirely).

**Reference data refreshed 2026-08-15.** The previous scrape was 2026-05-29, so
the catalog was missing TV's July and August 2026 additions. The refresh
(`crawl` -> `scrape` -> `reextract:dom` -> `reextract:sections` -> `generate`)
changed parameters ONLY - `sort_field` on `array.binary_search`/`_leftmost`/
`_rightmost`, and `calc_on_every_history_tick` on `strategy()`. The TOC
inventory is unchanged at 876 items, and `variables`/`constants`/`types`/
`operators`/`keywords` JSON came out byte-identical.

**Warning local-only was NOT a stable metric, and is now much closer to one.**
The instability is structural: `totalWarningLocalOnly` sums only the files TV
also parsed, so one file flipping in or out of TV's unparseable set moves it by
that file's WHOLE warning count (G001). It measured 1290 then 1310 on
byte-identical same-day reruns. The dominant churn source was the candlestick
`C_*` unused-var snippet spread across ~52 fixtures - and INV166 took
UNUSED_VARIABLE out of this column entirely, which is most of the drop to 41.
The mechanism still stands (a big-warning file flipping still moves the number),
so read movement carefully; the correctness-meaningful invariants remain the
error split and warning tv-only.

## Pending follow-ups

Open work items, each either deferred from an investigation or queued
as a discrete next step. Sequential numbering matches the task-tool
IDs so the two stay in sync.

- **#81 - positional-after-named. FIXED 2026-08-27
  ([INV169](../investigations/INV169-positional-after-named-argument/notes.md)),
  adopted from `../broadarrow/notes/todo.md`.** Raised in the parser rather than
  the builtin checker, since TV raises it for user functions too. The lesson to
  carry, not the case: INV016's union-argument check already recognised this
  shape and SUPPRESSED its type checks on it, citing "TV's own error" - an
  error nothing emitted. **A suppression that names a diagnostic is a claim that
  the diagnostic exists; grep for the emitter before trusting it.**

  **The sweep it asked for is DONE 2026-08-27
  ([INV170](../investigations/INV170-builtin-member-called-as-function/notes.md)).**
  One more instance across the checker and parser - a built-in constant or
  variable called as a function was TV's CE10271 and we were silent, on a
  stated reason (a murky const-vs-variable split) that was false. Everything
  else held up, so the anti-pattern is rare rather than systemic and this does
  not need to become a standing chore.

  Carry the gate lesson, which cost a near-miss: the first version of that fix
  passed the full suite AND a 0-changed `regression-check` over 1879 fixtures
  while manufacturing a false positive. **Neither shape exists in the corpus**,
  so a clean regression-check there was equally consistent with "no false
  positives" and "this rule is untested". Only a hand-written probe separated
  them. When a rule's shapes are absent from the corpus, the corpus gate is not
  evidence and the probe is the whole verification.

- **#83 - UDF parameter defaults. FIXED for FUNCTION and METHOD parameters
  2026-08-27 ([INV172](../investigations/INV172-udf-parameter-defaults/notes.md)).**
  All four codes land with TV's wording and anchors, verified cell-for-cell by
  a re-runnable 20-cell grid whose `--local` mode reproduces TV's column
  exactly. The mutation pool went 5,188/1-survivor to 5,189 killed.

  **Still open: UDT FIELD defaults**, which share the rule and are probed but
  not implemented - `int b = userVar` is CE10132 at the expression, but
  `float c = 1 + 2` anchors CE10134 at the FIELD declaration rather than at a
  parameter name, so it is a second implementation and not a shared call. Also
  open: the CE10165 cascade TV emits at every call site of a function whose
  default was rejected. Evidence for both is in the INV.

  How it was found, kept because it is the argument for #48's operators: the
  new `member-called-as-function` operator, on its first run, spliced
  `text.align_right(1)` into a corpus fixture's function signature - a
  parameter default rather than a call argument - and we accepted the whole
  file.

  Nothing walked parameter defaults at all, so neither the default
  expression's own validity (the CE10271 went unreported there while the
  identical call in argument position was caught) nor any of TradingView's
  rules about what a default may be were checked. The grid found FOUR codes,
  not the two the first pass guessed at. Probed 2026-08-27:

  The full 20-cell table, the four messages verbatim, and the two anchors live
  in INV172 and are NOT duplicated here - it is a settled measurement, and a
  stale copy in this file is something a later reader would act on. Re-run it
  with `node investigations/INV172-udf-parameter-defaults/probes/grid.mjs`
  (add `--local` for our side).

  The one thing worth repeating outside the INV, because it is what a
  reimplementation would get wrong: **read the codes off the expression's
  SHAPE, never off the messages.** CE10133 says "cannot be a function,
  variable or calculation" while TV accepts `close`; CE10132 says "a type's
  field" while firing on a plain function parameter.

- **#82 - the CE10271 method-form shadowing leniency. Anchor half FIXED,
  leniency half OPEN
  ([INV173](../investigations/INV173-namespace-shadow-method-calls/notes.md)).**

  **(b) the anchor is DONE.** TV anchors the method form at the DOT, measured
  across 17 cells; we anchored at the receiver. Fixed at both emission sites,
  and it exposed **four existing fixtures pinning the wrong column** - each
  re-probed against `--tv` on its own source before its assertion was touched,
  never fitted to the new code. Lesson recorded in the INV: a `column=`
  assertion is a claim about TradingView and needs its own probe.

  **(a) the leniency is still OPEN, and is deliberately not fixed.** We emit
  CE10271 where TV is silent - a false positive on the ERROR channel - when
  the receiver shadows one of `color`, `label`, `line`, `box`, `table`,
  `linefill` or `strategy`. Three hypotheses are dead (see the INV): it is not
  "shadows a namespace" (`math` does and errors), not "is a type name"
  (`string` is and errors), not the intersection (`polyline` is both and
  errors, `strategy` is neither-quite and is clean), and TV does not re-type
  the shadowed variable either. **The lenient set is not derivable from the
  catalog**, so the tempting hardcoded list is exactly the table of language
  facts the Data-vs-Syntax rule forbids. Two real options, both costed in the
  INV: suppress on any catalog-name shadow (derivable, trades FP for FN), or
  probe the name set and bake it into pine-data (the INV050/INV171 pattern,
  and the architecturally correct one).

  The original filing follows. Both halves are PRE-EXISTING (the
  `collectionReceiver` branch is INV138/INV065-b, untouched by INV170) **and
  neither is carried by the corpus**, which is why every sweep has been silent
  on them - warning tv-only and the error window both stayed clean.

  **(a) A receiver whose name is BOTH a type and a namespace is a false
  positive.** Probed 2026-08-27, all `//@version=6` with `indicator("t")`:

  | receiver decl | call | TV | us |
  |---|---|---|---|
  | `color = array.new<float>(3, 1.0)` | `color.pushx(2.0)` | **clean** | CE10271 |
  | `label = array.new<float>(3, 1.0)` | `label.pushx(2.0)` | **clean** | CE10271 |
  | `math = array.new<float>(3, 1.0)` | `math.pushx(2.0)` | CE10271 | CE10271 |
  | `arr = array.new<float>(3, 1.0)` | `arr.pushx(2.0)` | CE10271 | CE10271 |
  | `string = "abc"` | `string.foo()` | CE10271 | CE10271 |

  The discriminant is not "shadows a namespace" (`math` shadows one and still
  errors) and not "is a type name" (`string` is one and still errors) - it is
  the INTERSECTION: `color` and `label` are both, and those are exactly the
  lenient cells. `line`, `box` and `table` are the other names in that class
  and are unprobed. Do not fix on this table alone: five cells is enough to
  kill the two single-property hypotheses, not enough to pin the rule, and
  the mechanism (probably TV resolving the member against the TYPE's static
  surface and going undetermined) is a guess.

  **(b) The method form's ANCHOR may differ.** On the same probes TV anchors
  CE10271 at the DOT and we anchor at the receiver: `arr.pushx(2.0)` is TV
  `4:4` against our `4:1`, `math.pushx` TV `4:5` vs our `4:1`,
  `string.foo()` in `x = string.foo()` TV `4:11` vs our `4:5`. Note this is
  the METHOD form only - the FUNCTION form agrees (unshadowed
  `x = color.red(1)` is `3:5` on both, INV170). INV138 records probing p09/p10
  for this family, so check whether it measured positions before assuming a
  general mismatch; if it did and they agreed, something narrower is going on
  and that is itself the finding.

  Worth doing together, since (b) would otherwise be re-measured while fixing
  (a). Both want their own investigation with a proper probe grid, not a
  patch on this table.

- **#20 - refine INV012 with a context-aware synchronize.** Current
  `synchronize()` skips to the next column-1 statement after a parse
  error. Correct in aggregate (−1270 cascade FPs across the corpus)
  but occasionally skips legitimate declarations between the error
  and the next true top-level statement, accounting for some of the
  "Undefined variable …" appearances that surfaced after INV012.
  Sampling suggests *most* of those are real findings the cascade
  was hiding (e.g. comma-pair declarations our parser doesn't
  recognise), not sync over-skipping - so the upside here is smaller
  than it first looked. **Half-measure attempted** (looser sync that
  preferred next-NEWLINE over column-1 when followed by a plausible
  statement-start keyword) - produced 2244 *new* cascade FPs and was
  reverted. The real fix needs a parser-state stack tracking
  "currently inside function body / switch arm / if body / type
  body" and a sync that skips to the end of *that* context, not the
  next column-1. Bigger refactor; defer until someone has appetite
  for the stack-threading work.
- **#21 - verify and shore up the generate-time fact layer in
  `generate.ts`.** Not a refactor for its own sake: the hand-coded maps
  all sit *upstream* of the generated JSON, so the "self-contained
  `functions.json`" goal is already satisfied today. The item is about
  two risks in the inputs: (1) *unverified guessing* and (2) *silent
  drift* - facts stored as bare TS literals carry no re-verification
  recipe, which is exactly how G002's bad widenings survived. Risk (1)
  was real and large - the param-requiredness polarity bug, fixed via
  INV050's 475-function probe sweep
  (`pine-data/raw/v6/required-params-probe.json` - fact + probe +
  date, the override-data-file shape this entry asks for).
  **Remaining** for risk (2): move the other
  hand-coded facts to the same probe-backed data-file shape -
  `getFunctionFlags.topLevelOnly` (14 fns), the `polymorphic` category
  map (shrunk by INV032 - see #17), `variadic`/`minArgs` (authoritative
  where the scrape over/under-counts), `historyDependent` (probed
  2026-06-04, INV018), `RETURN_TYPE_PARAM_OVERRIDES` (`input` →
  `defval`, see #17), INV048's `UNDOCUMENTED_VARIABLES`, and INV050's
  `HIDDEN_OVERLOADS` (ta.highest et al one-arg forms). Done means:
  every retained fact is probe-verified with `pine-lint --tv` (dated)
  or derived from scraped data, each carries its probe so it can be
  re-checked when contradicted, and the values keep flowing into
  `functions.json` (`flags.*`, param `required`) as they already do.
  Whether the facts then live as a data file under `pine-data/` or stay
  as annotated TS maps is taste, not the payload.
- **#30 - consider rich (MarkupContent) diagnostic messages.** LSP 3.18
  (vscode-languageserver 10) widened `Diagnostic.message` to
  `string | MarkupContent`. Our language-service diagnostics are plain
  strings, and `convertLSPDiagnostic` in `packages/lsp/src/converters.ts`
  flattens any MarkupContent to its `.value`. We could instead emit
  markdown messages (code spans around symbols/types, links to TV
  reference pages, INV/G pointers) where the client advertises support.
  Requires widening the internal `Diagnostic.message` type or adding a
  parallel rich field, plus a capability check before sending markup.
- **#41 - MemberExpression callee validation. CLOSED 2026-07-15.** Every slice
  landed; the trail is INV036/053/064/065/066/067/103/138/139/140 in the
  [investigations index](../investigations/README.md), not repeated here. Two
  cautions worth carrying forward, both learned the expensive way: slice (d)
  sat "OPEN, blocked behind robust receiver resolution" for a month after
  `a35bac7` fixed it, and slice (a) listed three gaps that #53 already
  contradicted in this same file - so re-verify a claim here before planning
  around it. The transitive-import successor is now CLOSED too
  ([INV143](../investigations/INV143-transitive-library-imports/notes.md)). The one
  live successor is **#53(a)** (vendoring more libraries - a data gap, since the
  checker logic exists and simply has no export set to read; the 10
  license-excluded libs are deliberate policy). We emit CE10271 for an
  undefined receiver but not TV's second CE10272 record.
- **#53 - vendored-library export infrastructure (INV067).** The data
  layer powering #41's imported-library member validation. `vendor/
  <Author>/<Lib>/<Version>.pine` holds published library SOURCE (MPL-2.0
  only - see README Acknowledgements for the license policy); `pnpm run
  fetch:library -- User/Lib/Major` (or `--from <reflist>`) downloads more
  from TV's pine-facade (a node port of piners' `pine_facade.rs`; public
  `open_no_auth` libs only; CRLF->LF; round-trip-validated against the
  committed ta/12). `pnpm run generate:libraries` parses `vendor/` with
  the COMPILED core parser (needs a prior `build`) into
  `pine-data/v6/libraries.json` (Author/Lib/Version -> export names),
  SKIPPING any library it can't parse cleanly (incomplete export set ->
  FPs). The checker reads `LIBRARY_EXPORTS_BY_PATH`. **Build-order gotcha:**
  `install:cli` rebuilds the BUNDLE but not the tsc `dist/` modules;
  `generate:libraries` and node-required parser tests use the tsc dist, so
  run `pnpm run build:tsc` after a parser/source change before regenerating
  or the change won't take. `TFlab/FVGDetectorLibrary/1` is now covered in
  `pine-data/v6/libraries.json` after the #45 switch-arm parser fix.
  The CLI now also parses immediately preceding `/// @source <path>`
  directives and passes local-library export sets into the checker, so
  local-file libraries validate against their exported function/method names.
  **Pending:** (a) vendor more published libs for broader member coverage
  (each is one `fetch:library` + `generate:libraries` + regression-check;
  only MPL-2.0); (b) per-version export drift is a non-issue (published
  majors are immutable).
- **#54 (residual) - method/call chain return types (INV072).**
  UDT field inference and field-existence validation landed: the parser
  now records typed fields on `TypeDeclaration`, the checker indexes them,
  infers `T.new()` as `T`, resolves member chains such as `o.inner.x`,
  emits `Object has no field <name>` only when the receiver resolves to a
  known user type; derives element returns from collection receiver
  methods such as `arr.first()`, `array.get()`, `matrix.get()`, and
  `map.get()`; and preserves concrete collection type arguments through
  self-returning receiver methods such as `array.copy/slice/concat`,
  `map.copy`, and `matrix.copy/submatrix` plus `matrix.row/col` array
  returns. Pinned by
  `packages/core/test/fixtures/regression/INV072-udt-field-validation.pine`
  and
  `packages/core/test/fixtures/regression/INV072-collection-copy-chain-types.pine`,
  and clean against `regression-check.mjs` (0 corpus changes). Remaining
  INV072 follow-up, if needed: broaden method/call chain return typing
  beyond these data-backed collection receiver methods. Surfaced by the
  #52 census (deep chains under-tested: readChainDepth 3+ 1776 corpus / 4
  tests).
- **#48 - mutation-testing pass (negative corpus).** INV050 exposed a
  structural blind spot: every verification layer samples valid code.
  The corpus is published working scripts, so a false-negative class
  that only manifests on BROKEN code is invisible to
  `find-real-failures` no matter how often it runs. General principle:
  any check whose precondition comes from generated data can be
  silently disabled by a data bug, and the valid-code corpus will never
  tell us. The countermeasure is built and already paying (see the
  scripts table for the three pieces): the free check-site half,
  `audit-error-reachability.mjs`, whose first run yielded
  [INV059](../investigations/INV059-audit-reachability-round1/notes.md);
  and the mutation half, `mutate.mjs` + `mutation-run.mjs`, whose first
  real run (86 mutants) produced one survivor exposing a structural
  hole - see
  [INV062](../investigations/INV062-unresolved-call-args-unvalidated/notes.md).

  Method essentials (for future operator work): mutate at the text
  level at lexer-located sites, ONE mutation per mutant; start from
  BOTH-CLEAN fixtures (local AND TV 0 errors) so the mutation's effect
  is isolated; the only signal is `TV-rejects AND we-accept`; a mutant
  TV also accepts means the breakage was not invalid - discard. Design
  operators around TV's error taxonomy (CE codes), not our existing
  checks - that is how you find gaps we have NO check for. Built (all
  seven taxonomy rows): drop-required-arg (CE10165), typo-member
  (CE10271), wrong-type-literal (CE10123), typo-param-name (CE10120),
  delete-decl (CE10272), unbalance-bracket (CE10015, INV046),
  bad-qualifier-form (CE10147, INV024). Triage caveat from the second
  run: a `tv-accepts` verdict is not always "the breakage was not
  invalid" - TV skips all arg checks on calls with undetermined-typed
  arguments, so probe tv-accepts mutants minimally before discarding
  (see G006). The audit's follow-up lists are CLEARED as of 2026-06-11
  (0 DEAD / 0 probe-only / 0 corpus-but-never-in-tests - the last three
  sites became INV063). Run 3 (seeds 3-10) produced one survivor ->
  INV064 (deep-namespace member calls, a CE10271 FN), and exposed two
  silent under-testing bugs in `mutate.mjs` now fixed: `delete-decl`
  matched `:=` reassignments (both lex as ASSIGN; deleting one is
  harmless so TV accepted the bogus mutant), and offset reconstruction
  was `\n`-only while the lexer doubles `\r\r\n` line numbers (G005), so
  every `\r`-ending corpus fixture spliced at the wrong site and was
  silently skipped in seeds 1-2 (fixed by normalizing line endings in
  `makeCtx`). Run 4 (2026-06-19) switched method: ONE free full-pool
  `--dry-run` (`--fixtures 9999 --sites-per 6`, 18,978 mutants over all
  697 both-clean fixtures, local side only) instead of blind seed
  rotation - blind rotation wastes TV budget on seeds whose mutants we
  already kill (seeds 11-16 had 0 `local-accepts`). The dry-run left 38
  `local-accepts` (16 delete-decl, 22 typo-member); only those can be
  survivors, so only those need TV. Triaging the 22 typo-member yielded
  INV065 (scalar-shadow member calls, a CE10271 FN - 4 corpus carriers);
  the rest were #41 import-shadow residual - SINCE RESOLVED by INV067
  (vendoring the imported libraries' export sets so `lib.typo` is CE10271)
  plus INV068/INV069 (parser fixes that un-quarantined three more of the
  vendored libs). **The full-pool dry-run is
  now the preferred entry point** (free, deterministic, exhaustive; TV
  spend then scales with the `local-accepts` count, not the mutant
  count). Its 16 `delete-decl` survivors were all one class, the undefined
  method-call receiver, which `a35bac7` then FIXED on 2026-06-20 by gating on a
  clean parse (`parserClean`) - not on the "receiver resolution we don't have"
  those runs concluded was needed. See INV066's Resolution.
  **2026-07-15 rerun** (after INV138): the same full-pool dry-run (18,978
  mutants over all 697 both-clean fixtures) went to **1 `local-accepts`** from
  16, and that one TV-triaged to `tv-accepts` - so **0 survivors**. The 15 that
  disappeared are the INV066 delete-decl class `a35bac7` now kills.
  **2026-08-03: the last one is gone too and the pool is a clean 0
  `local-accepts` over all 18,978 mutants.** It was a `mutate.mjs` operator bug,
  not a finding: the mutant deleted `extend = false` in `2eeb43fa906f`, whose
  only use is `extend.none`, and since `extend` is also a builtin NAMESPACE the
  member access stays valid without the declaration. `delete-decl` now discounts
  a use that is a namespace-member access on a builtin namespace (the namespace
  set is derived from the dotted catalog names, not listed), so the site is
  generated only when some use actually DEPENDS on the declaration. TV-verified
  both directions - deleting the shadow-only declaration is clean, deleting it
  with a bare use present is a real CE10272 - by the re-runnable probes in
  `scripts/probes/mutate-delete-decl/`.
  **2026-08-27 re-run: still a clean 0 `local-accepts`** - 18,978 mutants over
  the same 697 both-clean fixtures, all `killed-local`, no TV spend. That
  covers INV133-INV171, today's two new error classes included.

  **Read it as a REGRESSION GATE, not a discovery run**, because the pool and
  the operator set are both unchanged: same 697 fixtures, same seven
  operators, therefore the identical 18,978 mutants as the 2026-08-03 run. It
  establishes that we still kill everything we used to kill. It cannot find a
  new gap, and re-running it unchanged never will.

  **Both operators BUILT 2026-08-27, and the first run produced a SURVIVOR** -
  the first since 2026-08-03, and it validates the whole "new taxonomy rows,
  not a re-run schedule" argument. `positional-after-named` (CE10157) and
  `member-called-as-function` (CE10271) generated 5,189 mutants over the same
  697 both-clean fixtures; 5,188 killed, 1 `local-accepts`, TV-adjudicated a
  real gap. See #83.

  Two implementation notes worth keeping, both of which silently cost sites
  until fixed:
  - The variadic guard on `positional-after-named` is load-bearing, not
    tidiness: TV refuses keyword arguments on a variadic function with
    CE10119, so a `math.max` mutant would be rejected for the WRONG reason and
    counted as killed while proving nothing (INV171 hit exactly this).
  - `member-called-as-function` must accept a KEYWORD as a chain start, not
    just an IDENTIFIER. The namespaces that are also TYPE names - `color`,
    `line`, `label`, `box`, `table` - lex as KEYWORD and hold most of the
    interesting constants, so requiring IDENTIFIER skipped every `color.*`
    site. It also excludes members that are ALSO functions (`ta.tr`), or the
    mutant would be a valid call.

  **Remaining, and it is still the operator set rather than the schedule.**
  Discovery needs a new taxonomy row, and #48's own method note says why:
  design operators around TV's error taxonomy, not around our existing checks,
  because that is how you find gaps we have NO check for. Two rows are
  conspicuously missing and both were added to the checker on 2026-08-27, so
  neither has ever been mutation-tested:

  - **positional-after-named** (INV169) - move a named argument earlier in an
    existing call so a later positional one follows it.
  - **member-called-as-function** (INV170) - append `(...)` to a built-in
    constant or variable reference.

  Those two matter more than the schedule because the corpus contains neither
  shape, so mutation is the ONLY layer that can exercise them - the same
  blind spot #81 and #74 both hit, where a 0-changed corpus gate meant
  nothing. Also still open: re-run when the corpus itself grows (the
  both-clean pool has sat at 697 across every run so far).
- **#52 - fixture-coverage build-out (the census target list).**
  `scripts/fixture-coverage.mjs` parses every corpus + test fixture and
  cross-references the JSON catalog to list entries referenced in zero
  fixtures and behavioral flags whose rule is never exercised. The
  hard-uncovered list is CLEARED (seven `coverage-*.pine` block
  fixtures, 0 catalog entries referenced in no fixture, all TV-diffed
  clean) - and building it alone caught INV054, INV055, two INV059
  inference bugs, INV060's v4/v5 numeric-bool class, INV070 (probing the
  census's under-tested if/switch-EXPRESSION shape found a whole missing
  CE10235 branch-type check), and INV071 (probing the under-tested for-in
  shape found the loop ELEMENT variable was typed "unknown", suppressing
  all misuse checks - a CE10123 FN class), which is the
  argument for continuing (the reachability audit's
  corpus-but-never-in-tests slice cleared the same way - its last three
  sites became INV063). **2026-06-11: the ~250 corpus-only functions
  are CLEARED** - six `coverage-*-round2.pine` block fixtures (array,
  drawing, table, matrix, ta, math/str/misc, strategy+inputs) take the
  uncovered-in-tests function list to zero, all TV-diffed with zero
  error disagreement. Authoring them re-confirmed two known display
  quirks (request.seed's `series <type>` placeholder in the variable
  list - an astExtractor display-path quirk; the checker correctly infers
  unknown) and one real catch by our own checker (timeframe.from_seconds
  returns a timeframe STRING - the draft summed it numerically and the
  checker rightly objected). **2026-06-20:** added
  `coverage-structural-shapes.pine` for the softer structural targets:
  valid for-in single and tuple loops, a chained collection receiver call,
  a deep UDT read chain, and nested if-expressions. TV accepted the fixture
  (`success:true`, 0 errors), targeted vitest passed, and
  `regression-check.mjs` stayed at 0 corpus changes. Remaining structural
  coverage work is opportunistic fixture-building as new census rows look
  under-tested, distinct from #48's mutation testing (you can't mutate a
  construct that appears in zero files).
- **#45 (residual) - leading-operator wraps at multiple-of-4 indent.**
  The probed INV042 residual is fixed for the covered parser paths:
  `float x = cond` / `    ? high` / `    : low` and `bool y = a` /
  `    and b` now emit CE10013-style `Mismatched input ... expecting
  "end of line without line continuation"` diagnostics at the leading
  operator while still joining for recovery. Pinned by
  `packages/core/test/fixtures/regression/INV074-leading-operator-multiple-of-4-indent.pine`.
  The opposite-direction switch-arm continuation case is also fixed and
  pinned by
  `packages/core/test/fixtures/regression/INV073-switch-arm-leading-operator-continuation.pine`,
  which un-quarantines `vendor/TFlab/FVGDetectorLibrary/1.pine` for #53.
  The postfix leading-wrap path is also covered: dot and callable-member
  paren continuations at multiple-of-4 indent now emit the same CE10013
  wording/anchor while non-multiple-of-4 postfix wraps still join. Pinned by
  `packages/core/test/fixtures/regression/INV075-postfix-leading-wrap-multiple-of-4.pine`.
  Remaining, if worth pursuing: continue auditing any future specialized
  leading-wrap joiners for the same CE10013 wording/anchor behavior; no
  inventory rows currently hit them.
- **Minor data residue (record-only, low value):** `ta.vwap.anchor`'s default
  and the "X by default" phrasing are deliberately unparsed (see
  `parse-default.ts`). Skip unless a consumer needs them.
- **#61 (residual) - CW10003/4 consistency-warning precision.** A round of
  precision work landed across [INV114](../investigations/INV114-consistency-warning-precision/notes.md)
  (series-contagion through call args; untyped-param "undetermined" gate),
  [INV115](../investigations/INV115-conditional-reassign-series-state/notes.md)
  (conditional const-reassign = series state),
  [INV116](../investigations/INV116-method-call-history-dependence/notes.md)
  (history-dependent METHOD calls by bare name + undetermined-gate exclusion),
  [INV117](../investigations/INV117-consistency-fn-tail-rootcauses/notes.md)
  (the FN-tail root-cause map + the `[..] = f()` UDF tuple-return series
  inference), and [INV118](../investigations/INV118-library-history-dependence/notes.md)
  (CW10003 across the import boundary - derived per-export history-dependence,
  library member/typed-local resolution, a live-fetch override for CC-BY-NC
  libs), and [INV129](../investigations/INV129-sibling-na-seed-consistency/notes.md)
  (the `47d21dbd` sibling `na(w[1])` seed false positive),
  [INV130](../investigations/INV130-undetermined-local-history/notes.md)
  (`f1b6bd45` `draw_lbl` undetermined local history), and
  [INV131](../investigations/INV131-undetermined-udf-gate/notes.md)
  (`25a4a7` `math.sum` under an undetermined UDF-result gate),
  [INV132](../investigations/INV132-bar-index-udf-history/notes.md)
  (`db76cf79` `FindST` via `bar_index[1]` UDF history), and
  [INV133](../investigations/INV133-udt-name-shadowing/notes.md)
  (UDT names in CW10013 shadowing and typed-declaration anchors). Net through
  INV133: warning tvOnly is 0, the `ta.sma`, `draw_lbl`, and `math.sum`
  local-only residuals are cleared, the `FindST` and CW10013 tv-only residuals
  are cleared, and the error-channel sweep remains 0 tv-only. The INV-docs hold
  the probes/measurements - do NOT re-inline them here.

  **Pending**:
  - One consistency-warning FP on a TV-clean file is DEFERRED as a documented
    residual, not fixable now: `61a3a7` (`ta.highest`/`lowest`). It is a genuine
    FP (`compare-tv`: TV 0 errors / 0 warnings, no error-stop; we warn), but TV's
    silence reproduces ONLY on the full carrier. Structural/whole-program
    hypotheses were probed (`pine-lint --tv`, 2026-06-26) and ALL still WARN, so
    no structural rule we can validate reproduces the silence - any fix would be
    guessing, and this area already cost two reverted over-firing attempts
    (INV120): outer `input.bool` guard over an inner series ternary (Q1:
    `b=input.bool(true)` / `c = b ? (close>open ? ta.highest(close,100) :
    ta.lowest(close,100)) : 0.0`) WARNS, same as the no-guard control; and the
    call nested as a `color.from_gradient` arg (P1B) WARNS. So an outer
    const/input guard does NOT silence an inner series call - the outer-guard
    hypothesis is refuted. Likely a TV behavior on large/complex files we cannot
    model. The earlier "these need per-call-site arg-qualifier propagation (#9)"
    framing is refuted - the arg-qualifier-adjacent hypotheses still warn.
    Backward-reference series tracking is a non-issue (none in corpus). The
    former second residual `6152b9` (`ta.crossunder`) is gone: it now reports
    clean locally (re-checked 2026-06-28: 0 warnings on the full carrier),
    matching TV, cleared by a later precision round.

  #61's consistency-FP side is largely closed: 5 resolved (`ta.atr`, `ta.sma`,
  `draw_lbl`, `math.sum`, `ta.crossunder`/`6152b9`), 1 unreproducible
  (`61a3a7`), the rest TV-error-stops / G005 phantoms.

- **#66 - a suppression mechanism for the semantic lints
  ([INV144](../investigations/INV144-semantic-lint-checks/notes.md)).** The
  `lint`-stage rules are advisory and, unlike everything else we emit, can be
  correct-but-unwanted: an author who knows their MTF dashboard repaints has no
  way to say so, and REPAINTING_SECURITY alone fires on 16.5% of the corpus's
  clean-parsing v6 files (often many times per file). Every other channel we
  have mirrors TV, where suppression would be wrong, so this is the first place
  the question arises. Needs a decision on the surface - a source directive
  (`// pine-lint-disable-next-line REPAINTING_SECURITY`), CLI flags, or editor
  settings - before any of them is built. The CLI half is DONE: `--no-lint`
  turns the whole stage off, and every `lint` diagnostic now carries its `rule`
  id in the JSON output (and in brackets in `-H` output), so filtering by rule
  is already possible from outside. What remains is PER-RULE, IN-SOURCE
  suppression - the author who knows this one `request.security` repaints and
  wants to say so at that line, which is the case neither a global flag nor an
  external filter covers.

  The stage now carries nine rules, not five: INV153 split LOOKAHEAD_BIAS out
  of REPAINTING_SECURITY, INV162 added ARGUMENT_OUT_OF_RANGE, INV164 added
  ARGUMENT_NA_AT_RUNTIME, and INV166 moved UNUSED_VARIABLE here - which
  strengthens the case, since UNUSED_VARIABLE is the rule authors most often
  want to silence at one line (a deliberately-unused binding).

- **#69 (residual) - RE-class runtime domains. Three cells LANDED 2026-08-25
  ([INV164](../investigations/INV164-runtime-argument-domains/notes.md)).**
  `ta.sma`'s `length > 0` and `not na`, and `ta.pivothigh`'s `leftbars >= 0`,
  now warn on the `lint` stage. The design this entry specified was built as
  specified: the facts are DATA
  (`pine-data/raw/v6/runtime-domains.json` -> `generate.ts` -> the parameter's
  `min`/`notNa` in `functions.json`, with a `rangeSource` field so the checker
  can word a runtime domain differently from a documented one), the checker
  carries no per-function table, and INV162's existing rule consumes them.
  Corpus gate: zero findings over 1879 fixtures. The banners remain the only
  oracle - see [G010](../gotchas/G010-re-class-errors-are-chart-only.md).

  Building it surfaced and fixed a latent defect in INV162's rule: it read
  arguments POSITIONALLY against the MERGED parameter list, which is overload
  #0's order. `ta.pivothigh(high, -1, 2)` uses the (source, leftbars,
  rightbars) form, so the bound landed on the wrong argument - a miss here and
  a false positive one signature away. See INV164.

  **Remaining, and each needs evidence we cannot generate from this repo:**
  - **Every other function's domain.** Coverage today is THREE facts. `length
    > 0` on `ta.ema`/`ta.rma`/..., and `leftbars >= 0` on `ta.pivotlow`,
    almost certainly hold - and "almost certainly" is what manufactured the
    retracted G002. Each row costs one chart capture, since neither pine-lint
    mode can see an RE-class error. The `_notAdded` block in
    `runtime-domains.json` records each omission with its reason.
  - **The RE10004 ceiling** (5000 historical candles). Still one banner from
    one script; whether the limit is per-call, global, or interacts with
    `max_bars_back` is unestablished. Deliberately not baked in - a `max: 5000`
    would flag every long-lookback call on an assumption. This entry's original
    open question, still open.
  - **`array.slice`'s inverted constant range (RE10044).** Banner captured, but
    it is a relation BETWEEN two arguments and the per-parameter `min`/`max`
    shape cannot express it. Needs a cross-parameter fact shape first - the
    `flags.argGroups` precedent (INV142) is the model.
  - **Out-of-bounds `array.slice`/`array.get` (RE10045)** stays out of scope:
    needs collection-size tracking we do not have.

- **#74 (residual) - `currentTypeDocStr` is fabricated on union parameters
  ([INV159](../investigations/INV159-polymorphic-return-from-rejected-arg/notes.md)).**
  The cascade half of this item is FIXED (a polymorphic return no longer
  follows an argument its parameter rejects, so `plot(ta.range("x", 3))` is
  one error rather than two, matching TV). What remains is the expected-type
  noun: we say `simple int`, TV says `series float`. Two corrections to the
  original framing of this entry, both established while fixing it: the string
  is NOT another parameter's type (`length` is `series int`), it is fabricated
  by the union-argument check's hardcoded `` `simple ${members[0]}` ``; and
  the merged `returns` being the first overload's is NOT what caused the
  cascade. **Do not guess at a fix.** Four probes with the same `int/float`
  union give three different answers - `ta.sma` -> `series float`, `math.max`
  -> `const int`, `nz` -> `simple int` - and the INV notes kill three
  candidate rules, each of which fixes one family and regresses another. The
  per-function table that would satisfy all of them is what the Data-vs-Syntax
  rule forbids. Reopen with a probe sweep wide enough to separate
  overload-ordering from widest-member, not with a fourth guess. Impact is
  bounded: verdict and argument NAME are both right, only the target type
  reads wrong.

  **Re-measured 2026-08-25 and the framing changed: there is no rule to
  derive.** A ten-function sweep (table in the INV) shows the value is a
  per-function, per-parameter CONSTANT - stable across identical re-runs, so
  not G001 flakiness, and independent of the argument type passed. The pair
  that kills every structural hypothesis is `math.abs` vs `math.max`:
  identical overload sets up to arity, both starting `const int`, and TV
  answers `simple int` and `const int` respectively. Nothing in our catalog
  distinguishes them. So it cannot be derived, and the reference does not
  state it, which leaves PROBING: one `--tv` call per union parameter, baked
  into the pipeline as INV050's `required-params-probe.json` did for
  requiredness. Sized at 185 functions / 251 parameters, ~25 batched calls.
  The cost is not the sweep but building 251 calls that each carry exactly one
  deliberately-wrong argument and valid values everywhere else; getting that
  wrong bakes a bad string into `functions.json` where nothing would catch it.
  Left unbuilt rather than half-built.

  **The sweep is BUILT and CAPTURED 2026-08-27
  ([INV171](../investigations/INV171-union-type-noun-probe/notes.md)).**
  `scripts/probe-union-type-nouns.mjs` ->
  `pine-data/raw/v6/union-type-nouns-probe.json`. It measured **201 of 202
  union parameters across 141 functions** - the real census, smaller than the
  185/251 estimated above - with only `footprint.get_row_by_price` out of
  reach (its leading argument needs a chart-context `request.footprint`).
  **194 disagree with our fabricated noun; the 7 that agree do so by
  coincidence and must not be special-cased.**

  The no-rule conclusion is now measured rather than inferred from ten
  functions: `series int/float` alone answers five different nouns, a `series`
  doc union answers three different qualifiers, `int/string` splits 6/6 on the
  member, and `math.*` gives six answers for one doc type. Two costs came in
  lower than this entry assumed: TV's first-error stop is PARSE-only, so type
  probes batch (201 probes, 141 calls), and the "251 hand-built calls" are
  generated from the catalog with fixtures for the collection/drawing-ID
  leading arguments.

  **CONSUMED the same day**, as its own commit: `generate.ts` merges the noun
  onto each parameter as `expectedTypeNoun` and `checkUnionArgs` reads it, so
  the checker carries no table. Only a `status: "ok"` probe contributes; every
  other status is an absence of evidence and keeps the fallback rather than
  inheriting a neighbour's answer. **#74 is closed** apart from the residual
  below.

  Residual, and it needs overload resolution rather than more probing:
  `math.max(true, 1)` draws `const int` at TV and nothing from us, because
  `checkUnionArgs` skips positional checking on overloaded functions (INV016's
  deliberate conservatism - positional-to-parameter indices are ambiguous
  across overloads). The noun for it is already measured and in the data.

  Note for whoever reads the gates: `regression-check` was 0 changed, and that
  is not evidence here. The corpus passes no wrong-base scalars to union
  parameters, so it exercises none of this - the same "corpus proves nothing"
  shape as #81 above. The fixture is the pin.
- **#71 - user-function overloads are unmodelled
  ([INV157](../investigations/INV157-blackbox-audit-adoption/notes.md), cluster
  B).** Pine lets a user function be declared more than once with different
  parameter types. We now model the legality of the DECLARATIONS but nothing
  about resolution:
  - **The collision rule. DONE 2026-08-25
    ([INV165](../investigations/INV165-udf-overload-collision/notes.md)).**
    Overloads with identical REQUIRED parameter lists are illegal however many
    optional parameters either side adds, and - not obvious from the starting
    probe - this also catches SAME-arity pairs whose full lists differ
    (`f(float x, int s = 1)` / `f(float x, float t = 2.0)`), so it had to run
    before INV091's existing arity comparison rather than beside it. An untyped
    required parameter is undetermined and collides with nothing. Twelve
    probes, zero disagreement with TV including positions and wording.
  - **Resolution feeding the return type.** With `f(float x) => 1` and
    `f(int x) => "int"`, `f(na)` selects the `float` overload, so
    `string result = f(na)` is a type error. This needs real overload
    selection - including TV's rule for which overload an `na` argument picks,
    which our probe pins in one direction only - before the return type is
    knowable. Do not start here.

  Worth reading first: piners implemented this on 2026-08-23 and their notes
  record the design (three-valued applicability, declaration-order tie-break, a
  never-guess rule for arguments they cannot type, and an oracle-pinned
  collision rule). Probes:
  `investigations/INV157-blackbox-audit-adoption/probes/ov-na-decisive-rev.pine`,
  and the twelve declaration-legality probes in
  `investigations/INV165-udf-overload-collision/probes/`.

- **#73 (residual) - UNUSED_VARIABLE moved to the `lint` stage 2026-08-25
  ([INV166](../investigations/INV166-unused-variable-stage/notes.md)).** The
  stage question is settled and the routing is structural rather than by rule
  name: an `analysis`-stage diagnostic with no CW code mirrors nothing, so the
  CLI routes by `code === undefined` and any future code-less warning lands on
  `lint` automatically. All three consequences are fixed - `--no-lint` silences
  it, it falls inside #66's suppression design, and it left the local-only
  warning column (which dropped from 1292 to 41 on the same-day sweep).

  **The built-in half is CLOSED 2026-08-25 - the claim was false**
  ([INV168](../investigations/INV168-unused-variable-builtins/notes.md)).
  Built-ins are defined with `used: true`, the SemanticAnalyzer's copy of the
  rule only ever sees user declarations, and the copy AGENTS.md named
  (`checker.ts`) is unreachable - both consumers keep only ERRORS from
  `validate()`. A 2257-file sweep found 15 warnings on built-in NAMES, all
  correct (user declarations shadowing the name, genuinely never read). The
  entry has been retracted in AGENTS.md rather than deleted. The `_` half was
  already CLOSED by INV158.

  Testing the claim found the real defect and fixed it: `IfExpression` was the
  one `Expression` variant `analyzeExpression` never walked, so an
  `x = if cond` subtree was invisible - **652 UNUSED_VARIABLE false positives**
  across 2257 files, plus 9 missing CW10003/CW10013/CW10018 warnings (the
  branches are a scope, and a series-gated one is conditional). All nine were
  probe-confirmed against TV at the same positions and wording before landing.

  **The `isCommonlyUsedVariable` whitelist is REMOVED 2026-08-27**, and the
  framing below (kept because the correction is the point) was wrong on the
  decisive question. It is not a recall-versus-noise trade-off: the list
  suppressed by NAME unconditionally, after usage tracking had already marked
  used variables as used, so every warning it removed was a TRUE positive.
  The "false positive is worse than a miss" contract never applied, and that
  mischaracterization is the only reason this sat open as a judgement call
  instead of being measured.

  Re-measured post-INV168 the cost is **+9 warnings over 1879 fixtures**, not
  +103 - that figure was taken on the pre-fix build where the walk gap
  inflated unused reporting generally. All nine hand-verified genuinely
  unused, including two that needed a closer look: one whose 27 other `sma`
  occurrences are all `ta.sma(...)` (a word-boundary search matches after the
  dot), and one whose only other mention is inside a string literal. Pinned by
  `INV168-no-name-whitelist-for-unused.pine`, mutation-verified red.

  **The superseded framing:**
  `checkUnusedVariables` silently drops the warning for 40 hardcoded names
  (`ma`, `bb`, `c`, `col`, `up`, `len`, `src`, `show`, `plot`, ...), matched
  case-insensitively. Its stated justification - that they "may appear unused
  but are actually used by plots or external references" - does not hold: a
  plotted variable's identifier appears in the plot call and is marked used,
  and Pine has no external-reference mechanism for a local binding. The noise
  it was papering over was the walk gap above, which is why `bb` was silent in
  INV168's repro while `aa` and `cc` warned - an inconsistency no author could
  predict. Removing it costs **+103 warnings over 2257 files** (33 new distinct
  names), measured on the pre-fix build so that is an upper bound. Left as a
  decision because it is a recall-versus-noise trade-off on the channel whose
  contract says a false positive is worse than a miss.

  **Both of the remaining INV168 leads are CLOSED 2026-08-27.**
  `collectDeclarationsInStatement` now descends into an `IfExpression` init -
  the collect-side twin of the analyze-side walk gap, since `childStatements`
  yields an `IfStatement`'s branches but an `IfExpression` sits in expression
  position. INV168 predicted this was a harmless miss; half of it was not. As
  well as making UNUSED_VARIABLE reachable inside such a branch, it restores
  series-conditional propagation, so a `:=` to an outer `var` under a
  series-gated if-expression marks that variable series - a **missing CW10003
  on the TV-mirroring channel**, probe-confirmed against TV at the same
  position and wording, with the unconditional-`:=` control clean on both
  sides. The dead second implementation (`checker.ts`'s
  `checkUnusedVariables`, `SymbolTable.getAllUnusedSymbols`,
  `Scope.getUnusedSymbols`) is deleted.

  Corpus carries neither, as INV168 found: `regression-check` 0 changed and
  the warning channel unchanged at 2073 records over 1879 fixtures. Pinned by
  `INV168-if-expression-init-declarations.pine`, mutation-verified red.

- **#80 - CW10003 tv-only warning. FIXED 2026-08-25, same day it appeared
  ([INV167](../investigations/INV167-library-export-series-tail/notes.md)).**
  A conditional `ND.sma(close, 200)` on a vendored library export. INV118 flags
  only history-dependent exports that RETURN a series, and the series test read
  the tail EXPRESSION against `seriesVars` - which holds nothing about the
  body's own locals at collect time, so an export returning its work through a
  variable read as non-series while the identical export returning the call
  directly read as series. Regenerating the library data added ~160
  history-dependent exports and removed none; the sweep after it went to
  **warning tv-only 0 with warning local-only unchanged at 41** - the FN gone
  and no false positives bought with it.

  Carry forward the class, not the case: the library gates are derived by
  running our own analyzer over vendored source, so any under-detection in the
  analyzer silently NARROWS a gate, and only a TV sweep can see it.

## Gotchas

See [gotchas/README.md](../gotchas/README.md) for the format and full
index.

- [G001](../gotchas/G001-tv-pine-lint-not-spec.md) - TV's pine-lint is an
  unreliable comparator, not a stable spec.
- [G002](../gotchas/G002-reference-underdocuments-accepted-types.md) -
  **RETRACTED 2026-06-02.** Claimed the linter accepts more than the
  reference documents (`nz`/`fixnan` bool/string, `int` bool, `plot.title`
  non-const); isolated `--tv` probes show TV flags all of them (CE10123).
  The `FUNCTION_PARAM_TYPE_OVERRIDES` it justified are invalid - see #28.
- [G005](../gotchas/G005-tv-diagnostic-position-conventions.md) - TV's
  diagnostic position conventions: lines split at `\r\n`|`\r`|`\n`
  (so `\r\r\n` files double their line numbers), wrapped statements
  reported at logical-line columns (comment-stripped single-space
  join). Both probed 2026-06-04.
- [G004](../gotchas/G004-version-detection-leniency.md) - version detection
  and declared-v4/v5 leniency (G003 intentionally unused).
- [G006](../gotchas/G006-undetermined-type-suppresses-arg-checks.md) - TV
  skips ALL argument checks on a call containing an "undetermined type"
  argument (untyped UDF results), sibling args included - so a
  mutation-run `tv-accepts` can be a TV FN, and our CE10123 there is an
  INV001-class true positive. Probed 2026-06-11. **Extended 2026-08-21:**
  it also discards an explicit DECLARATION annotation - `bool ph =
  ta.pivothigh(len, len)` with untyped `len` types `ph` as "undetermined
  type", not `bool` - and the suppression is per-EXPRESSION, not
  per-function.
- [G007](../gotchas/G007-tv-does-not-enforce-input-qualifier.md) - TV
  enforces the `simple` qualifier on arguments but NOT `input`. Do not add
  an input-qualifier check.
- [G008](../gotchas/G008-collection-reassignment-skips-element-check.md) - TV's
  collection element check is POSITION-DEPENDENT: invariant in a declaration
  with an initializer (rejects both directions), widening in a `:=` store
  (int -> float accepted, float -> int rejected), and absent entirely for a
  `map` in store position. The accepting cells are UNSOUND rather than a
  widening coercion - it aliases, so a float can be pushed through the alias
  into an array TV still types as `array<int>`. Keep our error. Probed
  2026-08-21; **headline corrected 2026-08-25 (INV157)** - the original claim
  that TV does not check `:=` at all was generalized from widening-only
  probes.
- [G010](../gotchas/G010-re-class-errors-are-chart-only.md) - RE-class RUNTIME
  errors reach neither pine-lint mode nor the editor, only the chart legend.
  A runtime error wipes the script's whole log, and an unused invalid
  construction never raises (dead-code elimination), so a probe must consume
  its result. Banners held in
  `scripts/probes/re-class-runtime-errors/tv-banners/`. Governs #69.
- [G009](../gotchas/G009-tv-endpoint-misses-editor-only-gates.md) - `--tv`
  (`translate_light`) is not the validator the Pine editor runs. It does not
  enforce the editor's contextual restrictions on `request.*()` arguments, so
  `strategy.*` inside a `request.security` expression passes `--tv` clean and
  is CE10059 in the editor. **`--tv` acceptance is not evidence of TV
  acceptance for that class** - the first caveat that cuts in the accepting
  direction, and the reason #67's check would be unverifiable by our own
  tooling. Probed 2026-08-25.

Authoritative per-occurrence list lives in
`lint-reports/failures-by-category.json`. For every category below the JSON
holds every `(fixture, line, column, exact message)` that contributed to the
count.

Every category table below comes from the 2026-08-15 sweep and carries the
same staleness caveat as the split above: INV146-INV149 landed after it and
none of it has been re-measured against TV.

## Scripts behind this report

**Where the corpus comes from.** `fixtures/` is gitignored and machine-local -
it is NOT in the repo, and there is no longer a script to rebuild it.
`scripts/collect-pine-fixtures.mjs` (removed 2026-07-15, recoverable from git
history) walked a source tree and copied `.pine` files by sha256. It was
removed as a footgun rather than a tool: its `SKIP_DIRS` covered
`node_modules`/`dist`/etc and it skipped its own `fixtures/` destination, but
NOT this repo, so re-running it would sweep every `investigations/**/probes/`
file, all 88 `vendor/` libraries, and every `packages/core/test/fixtures/`
regression fixture into the corpus - polluting the very baseline the regression
contract measures against. Anyone rebuilding a corpus should start from that
history version AND exclude the repo.

| script | purpose |
|---|---|
| `scripts/compare-tv.mjs` | One file at a time: runs local + `--tv` in parallel, prints the error diff (local-only / tv-only) for that file. Pass `--json` to emit machine-readable output. Repro tool. |
| `scripts/lint-batch.mjs` | Batch lint: files, directories, or quoted globs; one compact errors/warnings block per file. `--diff` runs the compare-tv position diff per file (TV-capped at concurrency 4), `--tv` shows TV verdicts, plus `--errors-only`/`--filter`/`--quiet`/`--json`. Replaces ad-hoc `for f in ...` shell loops - the probe-directory workhorse. |
| `scripts/find-real-failures.mjs` | Runs local + `--tv` on every v6 fixture, records per-file false positives (we flag, TV doesn't) and false negatives (TV flags, we don't). Writes `lint-reports/real-failures.json`. Hits TV ~750 times (~2 min at concurrency 4). |
| `scripts/categorize-failures.mjs` | Reads `real-failures.json`, normalizes error messages into templates (strips line numbers, variable names, etc.), groups every occurrence under one of 48 / 19 categories, writes `lint-reports/failures-by-category.json`. |
| `scripts/snapshot-local-lint.mjs` | Runs `pine-lint` (local) on every fixture and writes `lint-reports/local-baseline.json` - sorted per-file error lists. The regression contract. Re-run after every intentional change. |
| `scripts/regression-check.mjs` | Reruns local lint over the corpus and diffs against the baseline. **No network.** Annotates disappeared errors against `real-failures.json` to distinguish "fixed a known FP" from "stopped catching a real error". Exits non-zero on any new error appearance. |
| `scripts/summarize-regression.mjs` | Groups `regression-report.json`'s appeared/disappeared records into message templates so a 1000-record diff reads as a dozen categories; `--files <substring>` lists per-file counts for matching categories. Run right after `regression-check.mjs`. |
| `pnpm run debug:repro -- <file> --line <N>` | Preferred parser-recovery repro tool. Runs local validation, finds a target diagnostic, slices and minimizes a candidate while preserving that diagnostic class/source, and prints token context plus AST path. Use this before falling back to manual slicing. |
| `scripts/check-changed-files-broken-string.mjs` | INV047 safety check: verifies every regression-changed fixture carries a broken-string record (i.e. is a file TV rejects at the lexer stage), flagging any possibly-TV-clean file whose behavior changed. |
| `scripts/audit-fixtures.mjs` | Scans every `.pine` fixture under `packages/core/test/fixtures/` without running vitest. Flags fixtures with malformed `@expects` directives and fixtures whose only assertion is a total `errors: N` count (no per-error coverage), printing suggested `// @expects error: line=N, message="..."` directives ready to paste. Exits non-zero on malformed directives. Wrapper: `pnpm run audit:fixtures` (also rebuilds the compiled helpers it imports). |
| `scripts/fixture-coverage.mjs` | Coverage census behind #52. Parses every corpus + test fixture with our own parser and cross-references the JSON catalog to surface BLIND SPOTS: catalog entries referenced in zero fixtures, behavioral flags whose rule is never exercised (esp. `topLevelOnly` functions never called in a violating local scope - the INV054 class), and a structural-shape census (member-chain depth, switch/forIn/tuple/enum) per set. Deterministic, offline, ~2s. `--json` for machine output. It finds gaps, it does not judge correctness - the uncovered-function list is #52's fixture-building target list. |
| `scripts/mutate.mjs` | The (b) piece of #48. Generates single-site mutants from a clean `.pine`: text-level splices at lexer-located sites, one mutation per mutant, operators mapped to the TV error code they should provoke (drop-required-arg/CE10165, typo-member/CE10271, wrong-type-literal/CE10123, typo-param-name/CE10120, delete-decl/CE10272, unbalance-bracket/CE10015, bad-qualifier-form/CE10147). Module (for the orchestrator) + CLI (`--print <i> --out <path>` for inspection). Offline. |
| `scripts/mutation-run.mjs` | The (c) piece of #48. Picks BOTH-CLEAN fixtures (local AND TV 0 errors, from `real-failures.json`), generates mutants, judges each via `compare-tv.mjs --json`, classifies tv-accepts / killed / SURVIVOR (TV rejects, we accept - the FN signal), groups survivors by (operator, TV code). Bounded TV budget: fixtures x operators x sites-per calls, seed-rotated. `--dry-run` = local side only, zero TV calls. Quiet by default (the full-pool dry-run is ~19k mutants, whose per-mutant stream buries the summary); `--verbose` restores it, and survivors always print. There is NO `--help` - an unrecognised flag is ignored and the run starts spending TV immediately. Reports to `mutation-reports/` (gitignored). Run 1 (seed 1, 86 mutants): 1 survivor -> INV062. Run 2 (seed 2, 7 operators, 115 mutants): 0 survivors; the 2 tv-accepts were TV FNs -> G006. |
| `scripts/audit-error-reachability.mjs` | The check-site half of #48's free slice. Enumerates every `addError`/`addWarning`/`addTemplateError` call site in the compiled checker + SemanticAnalyzer, wraps them at runtime to capture call-site stack frames, and validates corpus + test fixtures + investigation probes in-process. Reports DEAD sites (never fire anywhere - the INV050 class), probe-only sites (nothing pins them), and corpus-but-never-in-tests sites (untested real-world behavior). Offline, ~30s. `--json` for machine output. First run yielded INV059 (4 findings); the INV061 addTemplateError widening yielded the str.tostring(map) catch. |

Repro for any fixture:

```bash
pnpm run debug:compare -- fixtures/<hash>.pine
```

---

## Regression check - the local-only loop (paramount before any parser/lexer/type work)

Before touching the parser, lexer, or type checker, snapshot the baseline:

```bash
pnpm run lint:snapshot    # ~12s, no network
```

After every change, run the check:

```bash
pnpm run lint:regression  # ~13s, no network
```

Interpreting the output:

- **new error appearances > 0** → pure regression. The script exits 1.
  Open `lint-reports/regression-report.json` → `filesChanged[*].appeared`
  for the exact `(file, line, col, message)` of every new error.
- **disappeared, known FP** → progress. These were on the false-positive
  list in `real-failures.json`; you fixed them.
- **disappeared, suspicious** → an error went away that was NOT a known
  false positive. Could be a legitimate cascade-collapse from a parser
  recovery fix, or could be a real positive we've stopped catching. The
  script prints the exact `compare-tv.mjs` commands needed to verify each
  file (typically a handful, not 750).

When the check is clean and the changes look right, re-snapshot to lock in
the new baseline:

```bash
pnpm run lint:snapshot    # overwrites lint-reports/local-baseline.json
```

### Periodic re-baseline against TradingView

The TV-touching pipeline only needs to run when you want to refresh the
canonical FP/FN inventory and the category breakdown (after a substantial
change, or before opening a new round of work):

```bash
pnpm run lint:failures -- --concurrency 4    # ~2 min, 750 TV calls
pnpm run lint:categorize                      # reads JSON, no network
```

This refreshes `lint-reports/real-failures.json` and
`lint-reports/failures-by-category.json`, which the local regression check
reads to annotate disappearances.

The reports live in `lint-reports/` which is **gitignored** - so this
section records the latest measurement (the JSONs also embed
`generatedAt` + `gitCommit` since #29):

**Measured 2026-06-11 (midday), after INV062 (#48 mutation harness
built + its first survivor fixed)**: **46 local-only / 3 tv-only / 32
same-pos-different-message**, plus 768 past TV's stop point (4
unparseable, transient). Corpus baseline 15841 (the INV062 fix added
+605 records: 0 on both-clean fixtures, 53 post-stop on mangled v6
files, 552 on legacy v4/v5 files - bare v4 builtins inside
`security()` args, existing policy). The 46/3/32 window has been
byte-identical since 2026-06-10 and is fully explained: the 46
local-only are 20 probe-backed CE10156 wrap TPs + the 8+8 `bar index`
mangle pairs + 10 small known residue (undefined-variable stragglers,
`Unexpected token: :`) + INV026's synthetic ternary trio; the 3
tv-only are that same INV026 fixture seen from TV's side (CE10123 at
the argument where we flag the ternary) - zero unexplained tv-only
remain.

A 2026-06-20 fresh sweep found **50 local-only / 3 tv-only / 32
same-pos-different-message**. The +4 local-only records were one parser
field-scan false positive: a UDT field named `type` lexed as a keyword, so
`string type` was not recorded and `IS.type` became `Object has no field
type`. Fixed the same day in `scanTypeFieldAtCurrent`; the carrier
`db76cf...` now compares 0 local / 0 TV errors. A follow-up sweep after
restricting if-expression condition parsing to the if header line found
**44 / 3 / 32**: the `if cond` / newline / negative-literal branch shape no
longer produces the two false `Mismatched input "-"` records in
`d40d7b...`. After rendering ternary branch mismatches with TV's CE10123
operator diagnostic, the refreshed window was **47 / 0 / 32**: the prior 3
TV-only records from `35a58bb9...` disappeared, and the deliberate ternary
fixture matched TV at the same positions/messages.

After the parser-recovery cleanup through INV082, the refreshed window
dropped the 8 duplicate `bar` undefined-variable rows from **37 / 0 / 32** to
**29 / 0 / 32**. INV083, INV084, and INV085 then aligned bool-context,
numeric-operator, and union-argument diagnostics with TV's CE10123 templates,
reducing same-position message disagreements to **29 / 0 / 16**. A later
message-alignment pass kept the same **29 / 0** error split and reduced
same-position message disagreements to **1** by matching TV's `na` comparison
quotes, CE10123 bool-context qualifiers / argument type displays, `ta.change`
return display, undefined-member / bare-identifier wording, and in-call
missing-argument syntax wording. The lone remaining message disagreement is
`a1177295...:17:5`: our enum field type diagnostic is the useful CE10125-style
message, while TV returns its internal `Cannot read properties of undefined
(reading 'pinePos')`; do not align to that crash payload. The removed
local-only rows were recovery noise: restricted condition leading-binary wraps
(INV079), residual license/source prose and malformed ternary tails (INV080),
`bar index` in-call wording alignment (INV081), and recovered argument semantic
suppression (INV082). The remaining local-only rows are still the
already-explained mangled-source residue or probe-backed stricter diagnostics;
zero tv-only remain.

Earlier measurements live in git history (this section, prior
revisions) - each is a dated point-in-time record per G001.

---

## Parser - error recovery cascades

One bad token causes downstream "Unexpected token" hits because recovery
synchronizes coarsely (see #20). Much compressed since the original
inventory (the table once started at 1086+1072+549; post-TV-stop
cascades are excluded since INV025 - no TV verdict there). Confirmable
counts:

| count | files | category |
|---|---|---|
| 20 | 2 | `Syntax error at input "end of line without line continuation"` *(probe-backed TPs - INV042's wrap rule, surfaced pre-stop in the two mangle carriers; INV081 re-probed colon-wrap accept/reject cases and kept this strict)* |
| 8 | 1 | `Syntax error at input "index"` *(TPs - `bar index` mangle sites, probed INV081; TV anchors one CE10156 at `index`; INV082 suppresses the duplicate recovered-prefix `bar` semantic noise)* |
| 3 | 3 | `Undefined variable '*'. Did you mean '*'?` |
| 3 | 3 | `Undefined variable '*'` |
| 2-1 | - | long tail: `:` `==` |

## Type checker - over-strict bool / arg / assign rules

Every once-large #9 class is cleared (qualifier coercion, INV049's
destructure-init types, INV059's unknown-typing of unclassifiable
elements, INV060's v4/v5 numeric-bool legacy gate, and the later
INV122-INV133 qualifier/consistency trail). The current report has no
live TV-only type-checker categories. The remaining local-only type row
is documented full-file mangle residue:

| count | files | category |
|---|---|---|
| 1 | 1 | `Cannot call "operator ?:" with argument ...` (`8439b236...` mangled ternary-wrap recovery residue; the clean synthetic INV026 trio now matches TV at the branch argument positions, and INV081 confirms the plot-style-condition shape is a real TV CE10123 in isolation) |

Do not relax bool checks to chase this row; there is no current #9
carrier that justifies the old per-call-site qualifier propagation plan.

## Type checker - false negatives

| count | files | category |
|---|---|---|
| 0 | 0 | No current TV-only error categories in the refreshed 2026-06-20 sweep. The old `35a58bb9...` ternary trio now uses TV's CE10123 operator diagnostic at the branch argument positions. |

Every other row this table once held is cleared (INV028, INV032-INV041).

---

## Symbols - undefined-variable clusters

The giant clusters are all resolved (INV025, INV030, INV031, INV047 -
see the investigations index and git history). 2026-06-20: INV076 removed
the 2 `at`/`https` malformed-license-header undefined-variable carriers by
emitting the TV-style syntax error before semantic validation. What remains
is residual noise on still-mangled lines.

Per-file root causes are almost always one of:

- library `import User/Lib/N as alias` not exposing members
- `var`/`varip`/type-annotated declarations not added to symbol table
- block scope leaking the wrong way
- recovery cascade swallowing the declaration so later references look unbound

Pick one file at a time, find where the name is "defined," fix one root
cause, watch many false positives evaporate.

The `Unexpected identifier '*' - did you mean '*'?` category (6 hits, 1
file) is the same shape applied to identifiers in syntactic positions.

---

## Checker - local-scope restrictions

`Function '*' cannot be called from a local scope` is down to 5 hits in 1
file (31 -> 15 -> 5 across INV008 and the #31/#33/#34 parser work), and
those 5 are TRUE positives - `plot()` inside `if showZones` in
`577f110…pine:824-828`. TV is silent there only because it stops at that
file's line-475 syntax error; probed directly, TV rejects plot-in-if
with CE10188 "Cannot use 'plot' in local scope" (pine-lint --tv,
2026-06-04, minimal probe `if close > open` / `    plot(close)`).
Nothing left to relax here. (The check was also extended the other
direction - two-level builtin names like `strategy.risk.*` once
bypassed it entirely - see INV054.)

---

## Open questions worth answering before tackling individual fixes

- Occasional `tvOk: false` results are transient empty responses from
  TV - retry before reading anything into it. (Root-caused 2026-06-04:
  our own CLI used to truncate >64KB responses, now fixed; what
  remains is genuinely TV-side and transient.)
- TV emits NO warnings for files with compile errors (stops at the
  first error - G001), so warning local-only counts are structurally
  inflated for error-bearing fixtures. The post-TV-stop bucketing
  (INV025) moves local-only warnings positioned AFTER TV's stop out of
  the count (205 records), but warnings BEFORE the stop on TV-erroring
  files still count as confirmable even though TV's warning pass may
  never have run there - a full fix would bucket ALL local-only
  warnings on TV-erroring files.
