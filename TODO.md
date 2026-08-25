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
indexed at [investigations/README.md](investigations/README.md)
and are not duplicated here - TODO.md is for *pending* work only.

Measurement note, 2026-08-15 (current state; earlier per-INV notes live in git
history and in each investigation, per G001 - they were dated point-in-time
records, not standing facts).

**Full TV sweep, 2026-08-15** (`lint:failures`, 748 v6 fixtures, commit
`12c817a`): errors at **29 local-only / 0 tv-only / 1 same-position message
pair**, and **warning tv-only 0**. That error window is byte-identical to the
2026-06-28 sweep, across INV133-INV145 - thirteen investigations including five
new error-emitting checks (INV139/140/141/142/143). The 29 are the three
already-explained categories: 20 probe-backed CE10156 wrap TPs in 2 files, 8
`bar index` mangle sites in 1 file, and 1 mangled ternary-wrap residue.

**Superseded for the error window by INV146-INV149 (2026-08-21).** The TV
sweep above has NOT been re-run since; treat its 29/0/1 split as predating
those four investigations. Two of them move it by construction: INV146's
pre-v5 refusal and INV148's v6-only argument-name gate both change what a
non-v6 fixture reports, and INV148 alone removed 445 error records across 79
fixtures. Re-run `lint:failures` before quoting the split again.

Two categories are now *expected* local-only and must not be read as
over-strictness when that sweep happens - both are TV holes we deliberately do
not match, each pinned by a fixture: G008 (collection `:=` skips the element
check - unsound, TV lets a float into an `array<int>` through the alias) and
G006's declaration extension (an untyped param makes TV discard an explicit
`bool` annotation).

The local baseline was re-snapshotted 2026-08-21 and now stands at 1879
fixtures, **774 with errors, 7103 error records**, with
`node scripts/regression-check.mjs` reporting a clean **0 changed fixtures / 0
new error appearances**. The jump from the 2026-08-15 figures (621 / 16056) is
INV146 plus INV148 and is fully accounted for: the pre-v5 refusal gives an
error to 643 previously-clean legacy fixtures (+files), while replacing each
file's v4 cascade with a single diagnostic (-records).

(An earlier note claimed a re-snapshot had happened on 2026-08-03; it had not -
the on-disk baseline was still the 2026-06-28 one, 622/16057, and every run
since carried the `2997d729…` v5 disappearance as a phantom changed fixture.
Corrected 2026-08-15.)

Full vitest: 458 passing.

Warning local-only read 1423 raw on this sweep, of which **131 are `lint`-stage
records** (116 REPAINTING_SECURITY + 15 ACCUMULATOR_LIFETIME) that TV can never
emit by construction - so the comparable figure is **1292**.
`find-real-failures.mjs` now drops the `lint` stage before diffing (see
INV144), which is why the stored report for this particular sweep still
contains them: the filter landed after it ran. The next sweep produces 1292
natively.

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

**Warning local-only is NOT a stable metric** - do not read movement in it as
signal (this is on top of the `lint`-stage adjustment above, which is a fixed
offset rather than churn). It measured 1290 then 1310 on byte-identical
same-day reruns, because
`totalWarningLocalOnly` sums only the files TV also parsed, so one file
flipping in or out of TV's unparseable set moves it by that file's whole
warning count (G001; the candlestick `C_*` unused-var snippet, spread across
~52 fixtures, dominates the churn). The correctness-meaningful invariants are
the error split and warning tv-only.

## Pending follow-ups

Open work items, each either deferred from an investigation or queued
as a discrete next step. Sequential numbering matches the task-tool
IDs so the two stay in sync.

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
  [investigations index](investigations/README.md), not repeated here. Two
  cautions worth carrying forward, both learned the expensive way: slice (d)
  sat "OPEN, blocked behind robust receiver resolution" for a month after
  `a35bac7` fixed it, and slice (a) listed three gaps that #53 already
  contradicted in this same file - so re-verify a claim here before planning
  around it. The transitive-import successor is now CLOSED too
  ([INV143](investigations/INV143-transitive-library-imports/notes.md)). The one
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
  [INV059](investigations/INV059-audit-reachability-round1/notes.md);
  and the mutation half, `mutate.mjs` + `mutation-run.mjs`, whose first
  real run (86 mutants) produced one survivor exposing a structural
  hole - see
  [INV062](investigations/INV062-unresolved-call-args-unvalidated/notes.md).

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
  **Remaining:** periodically
  re-run the dry-run as the corpus/operators grow and TV-verify any new
  `local-accepts`.
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
  precision work landed across [INV114](investigations/INV114-consistency-warning-precision/notes.md)
  (series-contagion through call args; untyped-param "undetermined" gate),
  [INV115](investigations/INV115-conditional-reassign-series-state/notes.md)
  (conditional const-reassign = series state),
  [INV116](investigations/INV116-method-call-history-dependence/notes.md)
  (history-dependent METHOD calls by bare name + undetermined-gate exclusion),
  [INV117](investigations/INV117-consistency-fn-tail-rootcauses/notes.md)
  (the FN-tail root-cause map + the `[..] = f()` UDF tuple-return series
  inference), and [INV118](investigations/INV118-library-history-dependence/notes.md)
  (CW10003 across the import boundary - derived per-export history-dependence,
  library member/typed-local resolution, a live-fetch override for CC-BY-NC
  libs), and [INV129](investigations/INV129-sibling-na-seed-consistency/notes.md)
  (the `47d21dbd` sibling `na(w[1])` seed false positive),
  [INV130](investigations/INV130-undetermined-local-history/notes.md)
  (`f1b6bd45` `draw_lbl` undetermined local history), and
  [INV131](investigations/INV131-undetermined-udf-gate/notes.md)
  (`25a4a7` `math.sum` under an undetermined UDF-result gate),
  [INV132](investigations/INV132-bar-index-udf-history/notes.md)
  (`db76cf79` `FindST` via `bar_index[1]` UDF history), and
  [INV133](investigations/INV133-udt-name-shadowing/notes.md)
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
  ([INV144](investigations/INV144-semantic-lint-checks/notes.md)).** The five
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

- **#67 - CE10059: `strategy.*` inside a `request.*()` argument
  ([G009](gotchas/G009-tv-endpoint-misses-editor-only-gates.md)).** The Pine
  editor rejects the entire `strategy.*` surface - mutating commands AND plain
  variable reads - anywhere in a `request.*()` argument, with
  `"strategy.X" cannot be used with any parameter of the "request.*()"
  functions.` We are silent, and so is `--tv`. Adding the check is
  straightforward (it is a namespace test on the argument subtree of any
  `request.*` call, not a type rule), but it comes with an evidentiary problem
  worth deciding BEFORE writing it: **neither pine-lint mode can verify it**,
  so the check cannot be regression-tested against TV the way every other
  check in this repo is. Its only oracle is piners' hand-captured editor
  screenshots (`../piners/reference/fieldwork/runtime-oracles/README.md`,
  2026-08-25, three probe variants). Decide whether we accept a check whose
  authority is a third party's screenshot; if yes, it is small and high-value
  (the corpus almost certainly carries carriers, since `--tv` never flagged
  them). Probe kept at
  `investigations/INV156-tail-qualifier-fold-through-returns/probes/ce10059-request-strategy.pine`.
- **#69 - surface guaranteed RE-class runtime errors as `lint`-stage findings.**
  TradingView's runtime-error banners for a set of argument domains its
  *linter* says nothing about are captured as screenshots in
  `scripts/probes/re-class-runtime-errors/tv-banners/` - **primary source held
  in-repo**, eight banners from the 2026-08-25 chart session (the piners
  fieldwork run; narrative at
  `../piners/reference/fieldwork/runtime-oracles/README.md`). This is the only
  oracle the rule can ever have: RE-class errors surface only on the chart
  legend overlay, never in the editor and never through either pine-lint mode.
  These scripts compile and then die on bar 0. Measured 2026-08-25, both
  `pine-lint` local and `--tv` return **clean** on all four of:

  ```pine
  plot(ta.sma(close, 0))            // RE10001 "must be > 0"
  plot(ta.sma(close, na))           // RE10003 "must not be na"
  plot(ta.sma(close, 2000000))      // RE10004 "references too many historical
                                    //          candles (2000000), the limit is 5000"
  plot(ta.pivothigh(high, -1, 2))   // RE10001 "'leftbars' ... must be >= 0"
  ```

  A script that cannot survive its first bar, and neither validator says a
  word. That is the INV001 case in its purest form, and it is exactly what the
  `lint` stage exists for: code that COMPILES and is still wrong.

  **Stage: `lint`, warning severity, one `rule` id.** Not the error channel -
  TV compiles these, so an error would break the "errors mirror TV" invariant
  and every finding would show up in `lint:failures` as a fake local-only false
  positive. `find-real-failures.mjs` already drops the `lint` stage before
  diffing (INV144), so this lands without touching the TV comparison at all.

  **Decidability boundary - this is the whole design.** Flag only what is
  statically known; never guess at a `series int`:
  - IN: literal and const-folded arguments (`0`, `na`, `2000000`, `-1`,
    `20 - 20`). Also `array.slice(a, 3, 1)` - an inverted constant range,
    RE10044, currently clean locally.
  - OUT: anything runtime-valued. `ta.sma(close, len)` where `len` is an
    input or a series is undecidable and must stay silent - `input.int(14,
    minval = 1)` is the overwhelmingly common corpus shape and a false
    positive there would be the worst kind (see INV144's standing rule: an FP
    in this channel is worse than a miss, because it teaches readers to ignore
    the stage).
  - OUT for now: out-of-bounds `array.slice`/`array.get` on a collection whose
    size comes from flow (RE10045). Needs size tracking we do not have. The
    empty-literal case (`array.new<float>(0)` then a non-empty slice) may be
    worth a narrow cell later.
  - Already covered elsewhere, do not duplicate: a FRACTIONAL length is caught
    by the type layer today (`ta.sma(close, 2.5)` -> `literal float` into
    `series int`), because Pine types the slot `series int`. No runtime rule
    needed.

  **The domain facts belong in pine-data, not the checker.** Per the
  Data-vs-Syntax rule in AGENTS.md, "length must be > 0" and "leftbars must be
  >= 0" are language facts and must land in `functions.json` (the param `min` /
  `max` fields, which already exist - 32 occurrences today - and which nothing
  in the checker currently reads). `ta.sma`'s `length` has no `min` today.
  Note the banners state each domain outright and name the argument
  ("Invalid value of the 'leftbars' argument (-1) ... It must be >= 0"), so
  these facts are quoted from the platform rather than inferred - the strongest
  form the #21 fact layer can take. So
  the work is two-layered: a probe-backed `generate.ts` fact layer supplying
  the domains (the #21 shape: fact + probe + date), then one checker rule that
  reads them. Do not hardcode a table of per-function domains in the checker.

  **Open question before building, worth settling first:** the RE10004 ceiling.
  TV said "the limit is 5000" for `ta.sma`, but whether 5000 is per-call,
  global, or interacts with `max_bars_back` is unestablished, and the banner
  came from one capture on one script. The `> 0` / `>= 0` / `na` cells are
  unambiguous and can land without it; the ceiling cell should not land on a
  single data point.

  **Gate:** per the `lint`-stage rules, sweep the corpus before landing -
  `node investigations/INV144-semantic-lint-checks/count-lints.mjs`. A rule
  that fires on real published scripts in the const-decidable cells is either a
  genuine find (those scripts are broken) or a decidability bug; both need
  looking at before it ships.

- **#74 - `ta.range` (and the source-polymorphic `ta.*` family) reports the
  wrong parameter's type, then cascades.** Reported from the strategies repo,
  reproduced 2026-08-25 on `plot(ta.range("x", 3))`:

  | | verdict |
  |---|---|
  | us | `source`: `"literal string"` used but **`"simple int"`** expected, PLUS a second error on the enclosing `plot` |
  | `--tv` | `source`: `"literal string"` used but **`"series float"`** expected - one error |

  Two defects, and the accept/reject verdict is right in both tools, so this
  is message accuracy rather than a missed error. (1) The expected type we
  name for `source` is `simple int`, which matches NEITHER overload - the
  catalog types it `series int/float` in the merged view and `series int` /
  `series int/float` in the two overloads. We are naming some other
  parameter's type, so a reader is sent to fix the wrong argument. (2) The
  merged `returns` in `functions.json` is `series int`, the FIRST overload's
  return, rather than the widest `series float`; that is what makes us type
  the call `series int` and emit the bogus second error on `plot`. Fixing (2)
  is a `generate.ts` question (which overload's return the merged view should
  take), and it may not fix (1). Note `ta.change` and `ta.mode` are the other
  two source-polymorphic functions and should be checked together. The
  reporter keeps a live guard for this shape in their own suite
  (`compile_rejects_string_source_for_polymorphic_ta_builtins`), so it is a
  standing cross-repo comparison, not a one-off.
- **#71 - user-function overloads are unmodelled
  ([INV157](investigations/INV157-blackbox-audit-adoption/notes.md), cluster
  B).** Pine lets a user function be declared more than once with different
  parameter types. We model none of it, which costs two confirmed false
  negatives:
  - **The collision rule.** Overloads with identical REQUIRED parameter lists
    are illegal even when one adds optional parameters - TV: "The \"f\"
    function has overloads with the same required parameters." Self-contained,
    needs no resolution, and is the half to do first.
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
  `investigations/INV157-blackbox-audit-adoption/probes/ov-optional-only.pine`,
  `ov-na-decisive-rev.pine`.

- **#73 - UNUSED_VARIABLE is on the `analysis` stage, which mirrors TV; TV has
  no such rule
  ([INV158](investigations/INV158-unused-variable-underscore-and-stage/notes.md)).**
  **The premise is not new and must not be re-derived: INV148 established on
  2026-08-21 that this rule "mirrors nothing", and the comment at
  `SemanticWarning.code` says so at the site.** INV148 answered the CODE
  question - UNUSED_VARIABLE deliberately carries none, since inventing a CW
  would hand consumers an identifier irreconcilable with TV - and did not ask
  the STAGE question, which is all that is open here. Re-confirmed 2026-08-25:
  TV returns clean on an unused local, an unused `var`, and an unused
  top-level binding, and pairing analysis-stage warnings with their codes
  yields `{('CONDITIONAL_SERIES', 'CW10003'): 28, ('UNUSED_VARIABLE', None): 2}`
  - that `None` is INV148's deliberate design surfacing, not an oversight.
  Three consequences, none cosmetic:
  `--no-lint` does not silence it (that flag drops the `lint` stage); it falls
  outside #66's suppression design, which is scoped to "the five `lint`-stage
  rules"; and it inflates the local-only warning column that this file already
  calls unstable - the `C_*` unused-var churn named in the measurement note IS
  this rule. Moving it to `lint` would fix all three at once, but weigh it
  rather than assuming: `lint` rules are advisory by contract and an unused
  variable is often a real typo, and the corpus impact is large enough that the
  move needs a `lint:failures` re-run plus a figures update in the same
  landing. Keep the general test the investigation names: an `analysis`-stage
  diagnostic with no CW code is by definition not a mirror. (Separate and still
  open regardless of stage: the AGENTS.md limitation that this rule reports
  built-ins as unused. The `_` half is CLOSED - see INV158.)

## Gotchas

See [gotchas/README.md](gotchas/README.md) for the format and full
index.

- [G001](gotchas/G001-tv-pine-lint-not-spec.md) - TV's pine-lint is an
  unreliable comparator, not a stable spec.
- [G002](gotchas/G002-reference-underdocuments-accepted-types.md) -
  **RETRACTED 2026-06-02.** Claimed the linter accepts more than the
  reference documents (`nz`/`fixnan` bool/string, `int` bool, `plot.title`
  non-const); isolated `--tv` probes show TV flags all of them (CE10123).
  The `FUNCTION_PARAM_TYPE_OVERRIDES` it justified are invalid - see #28.
- [G005](gotchas/G005-tv-diagnostic-position-conventions.md) - TV's
  diagnostic position conventions: lines split at `\r\n`|`\r`|`\n`
  (so `\r\r\n` files double their line numbers), wrapped statements
  reported at logical-line columns (comment-stripped single-space
  join). Both probed 2026-06-04.
- [G004](gotchas/G004-version-detection-leniency.md) - version detection
  and declared-v4/v5 leniency (G003 intentionally unused).
- [G006](gotchas/G006-undetermined-type-suppresses-arg-checks.md) - TV
  skips ALL argument checks on a call containing an "undetermined type"
  argument (untyped UDF results), sibling args included - so a
  mutation-run `tv-accepts` can be a TV FN, and our CE10123 there is an
  INV001-class true positive. Probed 2026-06-11. **Extended 2026-08-21:**
  it also discards an explicit DECLARATION annotation - `bool ph =
  ta.pivothigh(len, len)` with untyped `len` types `ph` as "undetermined
  type", not `bool` - and the suppression is per-EXPRESSION, not
  per-function.
- [G007](gotchas/G007-tv-does-not-enforce-input-qualifier.md) - TV
  enforces the `simple` qualifier on arguments but NOT `input`. Do not add
  an input-qualifier check.
- [G008](gotchas/G008-collection-reassignment-skips-element-check.md) - TV's
  collection element check is POSITION-DEPENDENT: invariant in a declaration
  with an initializer (rejects both directions), widening in a `:=` store
  (int -> float accepted, float -> int rejected), and absent entirely for a
  `map` in store position. The accepting cells are UNSOUND rather than a
  widening coercion - it aliases, so a float can be pushed through the alias
  into an array TV still types as `array<int>`. Keep our error. Probed
  2026-08-21; **headline corrected 2026-08-25 (INV157)** - the original claim
  that TV does not check `:=` at all was generalized from widening-only
  probes.
- [G010](gotchas/G010-re-class-errors-are-chart-only.md) - RE-class RUNTIME
  errors reach neither pine-lint mode nor the editor, only the chart legend.
  A runtime error wipes the script's whole log, and an unused invalid
  construction never raises (dead-code elimination), so a probe must consume
  its result. Banners held in
  `scripts/probes/re-class-runtime-errors/tv-banners/`. Governs #69.
- [G009](gotchas/G009-tv-endpoint-misses-editor-only-gates.md) - `--tv`
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
