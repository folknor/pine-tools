# TODO

> **Read first**: [CLAUDE.md](CLAUDE.md) - Methodology. We aim to be MORE
> correct than TradingView's pine-lint. The "false positive" / "false
> negative" labels below are TV-diff heuristics, not verdicts. Treat
> them as navigation aids; investigate each before acting.

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

## Pending follow-ups

Open work items, each either deferred from an investigation or queued
as a discrete next step. Sequential numbering matches the task-tool
IDs so the two stay in sync.

- **#9 - type-inference where we infer non-bool but TV infers bool.**
  Umbrella task. Several big wins landed via INV005, INV010, INV011,
  and INV024 (the biggest single cluster was a parser bug masquerading
  as inference - qualifier-led declarations truncating function
  bodies); remaining FPs need a fresh corpus diff and per-category
  dives. Robust UDF-return inference here would also let INV016's
  union-arg check and INV014's const-arg check drop their conservative
  reliability gates (both currently skip args typed via UDF returns /
  user vars to avoid FPs, so they miss real violations that flow
  through a variable), and would unblock INV063's residual FNs
  (`line l = 5`, `Point p = 5`: drawing-type/UDT annotations are left
  untyped in mapToPineType because typing them surfaces line-returning
  UDFs mis-inferred as series<float> - 58 corpus FPs in the reverted
  attempt).
- **#18 (residual) - pine-lint's variable-list output
  (`astExtractor.ts`) labels some built-in color constants
  `"undetermined type"`.** A display-path quirk, cosmetic, not a
  validator issue. The original ternary color/string FP cluster was
  resolved via
  [INV026](investigations/INV026-literal-color-and-param-guess-fps/notes.md)
  (2026-06-04).
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
- **#22 - `--only <names>` / `--only-overloaded` scrape flag.** The only
  remaining scrape-load reduction: a flag for a targeted re-scrape of just
  the named entries, instead of hand-deleting their `.cache/function-details/`
  files and running plain `scrape`. Lower priority now that both type-logic
  and DOM-extraction iteration are fully offline via the `.cache/dom` mirror
  + `reextract:dom` (see CLAUDE.md "Re-running type logic WITHOUT scraping"),
  so full `--force` re-scrapes should be rare - only when TV's DOM *structure*
  changes.
- **#30 - consider rich (MarkupContent) diagnostic messages.** LSP 3.18
  (vscode-languageserver 10) widened `Diagnostic.message` to
  `string | MarkupContent`. Our language-service diagnostics are plain
  strings, and `convertLSPDiagnostic` in `packages/lsp/src/converters.ts`
  flattens any MarkupContent to its `.value`. We could instead emit
  markdown messages (code spans around symbols/types, links to TV
  reference pages, INV/G pointers) where the client advertises support.
  Requires widening the internal `Diagnostic.message` type or adding a
  parallel rich field, plus a capability check before sending markup.
- **#41 - MemberExpression callee validation.** INV036's CE10271 covers
  Identifier callees, INV053 extended it to undefined members of
  known builtin namespaces (`ta.bogus`, `math.notreal`), INV064
  generalized that to any namespace DEPTH (`chart.point.newx`,
  `strategy.risk.bogusxyz` - the old check only handled single-segment
  `ns.member`), and INV065 closed the **scalar-shadow** slice (a local
  `string`/`int`/etc. shadowing a namespace name, e.g. `timeframe.changex`
  inside `f(simple string timeframe)`, is still CE10271 because scalars
  carry no builtin methods), and INV067 closed the **vendored-library**
  slice (members of imported libraries we vendor under `vendor/` -
  `import TradingView/ta/9` -> `ta.emax` is CE10271 because it is not in
  ta/9's `export` set; validated against the new
  `pine-data/v6/libraries.json`). The vendored set is now 88 libraries
  (25 authors): TradingView/ta + RelativeValue plus the ~75 MPL-2.0
  community libraries the corpus imports, fetched via the new
  `fetch:library` step (pine-facade) - see the library-infrastructure
  item below. **Still open:** (a) members of imported libraries NOT in
  `vendor/` - any published lib the corpus doesn't import (so wasn't
  fetched), the 10 license-excluded ones (7 CC-BY-NC Trendoscope + 3
  unlicensed, deliberately lenient), the 1 parse-quarantined
  (`TFlab/FVGDetectorLibrary/1`, see #45), and local `/// @source`
  libraries (the language-service resolver isn't wired into the core
  checker); plus UDT method calls (need UDT method namespaces); (b)
  **collection-typed
  shadows** (`math.pushx()` where `math` is an `array` - INV065 p04: TV
  flags, we skip, because array/matrix/map methods are catalog functions
  AND can be user-extended); (c) **method calls on any non-namespace
  scalar** (`x.abs()`, `s.length()` - INV065 p06/p07: TV CE10271, we skip
  because the receiver name is not a known namespace); and (d) **method
  calls on an UNDEFINED receiver** (`undefinedVar.push(x)` - INV066,
  OPEN: TV CE10272+CE10271, but undefined-checking the callee's root
  identifier produced 247 corpus FPs by exposing receiver-resolution
  gaps - function params in nested scopes, import namespaces/aliases,
  legacy versions - so it is gated behind robust receiver resolution,
  same blocker as #9). The interim mitigations are in (INV059 types
  unclassifiable destructure elements `unknown`; INV062 validates the
  argument expressions of unresolvable calls); real member-call
  validation still needs the export-set data.
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
  or the change won't take. **Pending:** (a) vendor more published libs for
  broader member coverage (each is one `fetch:library` + `generate:libraries`
  + regression-check; only MPL-2.0); (b) the 1 quarantined lib
  (`TFlab/FVGDetectorLibrary/1`) becomes coverable once its parser gap is
  fixed (see #45); (c) optionally wire the language-service `/// @source`
  resolver into the core checker so local-file libraries validate too; (d)
  per-version export drift is a non-issue (published majors are immutable).
- **#54 (residual) - method/call chain return types (INV072).**
  UDT field inference and field-existence validation landed: the parser
  now records typed fields on `TypeDeclaration`, the checker indexes them,
  infers `T.new()` as `T`, resolves member chains such as `o.inner.x`,
  emits `Object has no field <name>` only when the receiver resolves to a
  known user type, and derives element returns from collection receiver
  methods such as `arr.first()`, `array.get()`, `matrix.get()`, and
  `map.get()`. Pinned by
  `packages/core/test/fixtures/regression/INV072-udt-field-validation.pine`
  and clean against `regression-check.mjs` (0 corpus changes). Remaining
  INV072 follow-up, if needed: broaden method/call chain return typing
  beyond the data-backed collection element-return methods. Surfaced by
  the #52 census (deep chains under-tested: readChainDepth 3+ 1776 corpus
  / 4 tests).
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
  count). The 16 delete-decl local-accepts were TV-triaged: 14
  survivors (1 tv-accepts, 1 TV crash), all one class -> INV066
  (undefined method-call receiver, OPEN: the FP-safe fix needs receiver
  resolution we don't have - see #41). **Remaining:** periodically
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
  list - #18's astExtractor class; the checker correctly infers
  unknown) and one real catch by our own checker (timeframe.from_seconds
  returns a timeframe STRING - the draft summed it numerically and the
  checker rightly objected). **Remaining (softer) targets:** the
  structural shapes the census lists as corpus-only or near-zero in
  tests (forIn tuples x2, forIn singles x3, if-expressions x6, deep
  member chains) - same method, lower urgency. This is plain
  fixture-building, distinct from #48's mutation testing (you can't
  mutate a construct that appears in zero files).
- **#45 - leading-operator wraps at multiple-of-4 indent (probed
  residual of INV042).** `float x = cond` / `    ? high` / `    : low`
  is TV's CE10013 `Mismatched input "?" expecting set "end of line
  without line continuation"` anchored at the operator (probe p06 in
  INV042, 2026-06-07) - a different code/wording/anchor from the
  trailing case. Our `skipWrapNewlines` single-NEWLINE path keeps its
  historical leniency and joins these silently. No inventory rows hit
  this shape, so it waits; implementing means emitting CE10013-style
  errors from the leading-wrap joins (ternary `?`/`:`, the binary
  operator loops, and parseSameLineBinary's leading path) while still
  joining for recovery, mirroring INV042.
  **Related but OPPOSITE-direction sub-case (fixed):** a `switch` ARM
  BODY whose expression wraps to a leading-operator continuation line -
  `'Defensive' => (expr)` / `     and (expr)` (continuation indented one
  past the arm). TV joins it; our switch-arm body parser used to stop at
  the NEWLINE, so the next line was read as a new arm and errored
  `Expected "=>" in switch case`. Fixed by letting inline switch arm
  expressions consume valid leading-operator continuation newlines. Pinned
  by
  `packages/core/test/fixtures/regression/INV073-switch-arm-leading-operator-continuation.pine`;
  this un-quarantines `vendor/TFlab/FVGDetectorLibrary/1.pine` for #53.
  The remaining #45 work is the original too-lenient CE10013 direction for
  leading operators at multiple-of-4 indent.
- **Minor data residue (record-only, low value):** `ta.vwap.anchor`'s default
  and the "X by default" phrasing are deliberately unparsed (see
  `parse-default.ts`). Skip unless a consumer needs them.

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
- [G006](gotchas/G006-undetermined-type-suppresses-arg-checks.md) - TV
  skips ALL argument checks on a call containing an "undetermined type"
  argument (untyped UDF results), sibling args included - so a
  mutation-run `tv-accepts` can be a TV FN, and our CE10123 there is an
  INV001-class true positive. Probed 2026-06-11.

Authoritative per-occurrence list lives in
`lint-reports/failures-by-category.json`. For every category below the JSON
holds every `(fixture, line, column, exact message)` that contributed to the
count.

## Scripts behind this report

| script | purpose |
|---|---|
| `scripts/collect-pine-fixtures.mjs` | Walks a source tree (default `/home/folk/Programs`), dedupes `.pine` files by sha256, copies unique ones into `fixtures/<hash>.pine`. Run once to (re)build the corpus. |
| `scripts/compare-tv.mjs` | One file at a time: runs local + `--tv` in parallel, prints the error diff (local-only / tv-only) for that file. Pass `--json` to emit machine-readable output. Repro tool. |
| `scripts/lint-batch.mjs` | Batch lint: files, directories, or quoted globs; one compact errors/warnings block per file. `--diff` runs the compare-tv position diff per file (TV-capped at concurrency 4), `--tv` shows TV verdicts, plus `--errors-only`/`--filter`/`--quiet`/`--json`. Replaces ad-hoc `for f in ...` shell loops - the probe-directory workhorse. |
| `scripts/find-real-failures.mjs` | Runs local + `--tv` on every v6 fixture, records per-file false positives (we flag, TV doesn't) and false negatives (TV flags, we don't). Writes `lint-reports/real-failures.json`. Hits TV ~750 times (~2 min at concurrency 4). |
| `scripts/categorize-failures.mjs` | Reads `real-failures.json`, normalizes error messages into templates (strips line numbers, variable names, etc.), groups every occurrence under one of 48 / 19 categories, writes `lint-reports/failures-by-category.json`. |
| `scripts/snapshot-local-lint.mjs` | Runs `pine-lint` (local) on every fixture and writes `lint-reports/local-baseline.json` - sorted per-file error lists. The regression contract. Re-run after every intentional change. |
| `scripts/regression-check.mjs` | Reruns local lint over the corpus and diffs against the baseline. **No network.** Annotates disappeared errors against `real-failures.json` to distinguish "fixed a known FP" from "stopped catching a real error". Exits non-zero on any new error appearance. |
| `scripts/summarize-regression.mjs` | Groups `regression-report.json`'s appeared/disappeared records into message templates so a 1000-record diff reads as a dozen categories; `--files <substring>` lists per-file counts for matching categories. Run right after `regression-check.mjs`. |
| `scripts/slice-lines.mjs` | Extracts 1-based line ranges (`"1-2,1041-1051"`) from a file into a new file - the bisection helper for narrowing parser-state repros out of large fixtures (see INV047). |
| `scripts/check-changed-files-broken-string.mjs` | INV047 safety check: verifies every regression-changed fixture carries a broken-string record (i.e. is a file TV rejects at the lexer stage), flagging any possibly-TV-clean file whose behavior changed. |
| `scripts/audit-fixtures.mjs` | Scans every `.pine` fixture under `packages/core/test/fixtures/` without running vitest. Flags fixtures with malformed `@expects` directives and fixtures whose only assertion is a total `errors: N` count (no per-error coverage), printing suggested `// @expects error: line=N, message="..."` directives ready to paste. Exits non-zero on malformed directives. Wrapper: `pnpm run audit:fixtures` (also rebuilds the compiled helpers it imports). |
| `scripts/fixture-coverage.mjs` | Coverage census behind #52. Parses every corpus + test fixture with our own parser and cross-references the JSON catalog to surface BLIND SPOTS: catalog entries referenced in zero fixtures, behavioral flags whose rule is never exercised (esp. `topLevelOnly` functions never called in a violating local scope - the INV054 class), and a structural-shape census (member-chain depth, switch/forIn/tuple/enum) per set. Deterministic, offline, ~2s. `--json` for machine output. It finds gaps, it does not judge correctness - the uncovered-function list is #52's fixture-building target list. |
| `scripts/mutate.mjs` | The (b) piece of #48. Generates single-site mutants from a clean `.pine`: text-level splices at lexer-located sites, one mutation per mutant, operators mapped to the TV error code they should provoke (drop-required-arg/CE10165, typo-member/CE10271, wrong-type-literal/CE10123, typo-param-name/CE10120, delete-decl/CE10272, unbalance-bracket/CE10015, bad-qualifier-form/CE10147). Module (for the orchestrator) + CLI (`--print <i> --out <path>` for inspection). Offline. |
| `scripts/mutation-run.mjs` | The (c) piece of #48. Picks BOTH-CLEAN fixtures (local AND TV 0 errors, from `real-failures.json`), generates mutants, judges each via `compare-tv.mjs --json`, classifies tv-accepts / killed / SURVIVOR (TV rejects, we accept - the FN signal), groups survivors by (operator, TV code). Bounded TV budget: fixtures x operators x sites-per calls, seed-rotated. `--dry-run` = local side only, zero TV calls. Reports to `mutation-reports/` (gitignored). Run 1 (seed 1, 86 mutants): 1 survivor -> INV062. Run 2 (seed 2, 7 operators, 115 mutants): 0 survivors; the 2 tv-accepts were TV FNs -> G006. |
| `scripts/audit-error-reachability.mjs` | The check-site half of #48's free slice. Enumerates every `addError`/`addWarning`/`addTemplateError` call site in the compiled checker + SemanticAnalyzer, wraps them at runtime to capture call-site stack frames, and validates corpus + test fixtures + investigation probes in-process. Reports DEAD sites (never fire anywhere - the INV050 class), probe-only sites (nothing pins them), and corpus-but-never-in-tests sites (untested real-world behavior). Offline, ~30s. `--json` for machine output. First run yielded INV059 (4 findings); the INV061 addTemplateError widening yielded the str.tostring(map) catch. |

Repro for any fixture:

```bash
node scripts/compare-tv.mjs fixtures/<hash>.pine
```

---

## Regression check - the local-only loop (paramount before any parser/lexer/type work)

Before touching the parser, lexer, or type checker, snapshot the baseline:

```bash
node scripts/snapshot-local-lint.mjs    # ~12s, no network
```

After every change, run the check:

```bash
node scripts/regression-check.mjs       # ~13s, no network
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
node scripts/snapshot-local-lint.mjs    # overwrites lint-reports/local-baseline.json
```

### Periodic re-baseline against TradingView

The TV-touching pipeline only needs to run when you want to refresh the
canonical FP/FN inventory and the category breakdown (after a substantial
change, or before opening a new round of work):

```bash
node scripts/find-real-failures.mjs --concurrency 4    # ~2 min, 750 TV calls
node scripts/categorize-failures.mjs                   # reads JSON, no network
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

The 2026-06-11 window still holds as of 2026-06-19: INV065, INV067,
INV068, and INV069 were all **0-corpus-change** per `regression-check.mjs`
(they add catches on broken/edited code and parse fixes that only affect
quarantined libraries, not the published corpus). A fresh
`find-real-failures` TV sweep isn't needed to trust the window, but would
be the way to fold in the new imported-library / parser catches if a
re-baseline is wanted.

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
| 14 | 2 | `Syntax error at input "end of line without line continuation"` *(probe-backed TPs - INV042's wrap rule, surfaced pre-stop in the two mangle carriers)* |
| 8+8 | 1 | `bar` undefined + `index` did-you-mean *(TP pairs - `bar index` mangle sites, probed INV047 p04; TV anchors one CE10156 at `index`)* |
| 3 | 3 | `Undefined variable '*'. Did you mean '*'?` |
| 3 | 3 | `Undefined variable '*'` |
| 2-1 | - | long tail: `:` `==` |

## Type checker - over-strict bool / arg / assign rules

Per task #9 the root cause is more likely our type inference producing
non-bool types where TV correctly produces bool. Every once-large class
is cleared (qualifier coercion, INV049's destructure-init types,
INV059's unknown-typing of unclassifiable elements, INV060's v4/v5
numeric-bool legacy gate - trail in the investigations index). What
remains:

| count | files | category |
|---|---|---|
| 3 | 1 | `Ternary branches must have compatible types. Got '*' and '*'` (our own synthetic fixture's deliberate true positives - TV flags them too, at the argument position; see INV026) |

**Right approach**: pick a specific FP, trace through `inferExpressionType`
in `checker.ts` to see why we produce e.g. `series<float>` for what
should be `series<bool>`. Don't relax the bool checks - they're correct.

## Type checker - false negatives

| count | files | category |
|---|---|---|
| 3 | 1 | `Cannot call "operator ?:" with argument ...` (`35a58bb9…`'s ternary trio - never a detection gap, just anchor mismatch: TV anchors at one branch by undecoded type-priority rules, we detect all three at the ternary; see INV028) |

Every other row this table once held is cleared (INV028, INV032-INV041).

---

## Symbols - undefined-variable clusters

The giant clusters are all resolved (INV025, INV030, INV031, INV047 -
see the investigations index and git history). What remains (3 + 3
hits) is residual noise on still-mangled lines.

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

