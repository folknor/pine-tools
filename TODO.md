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

- **#3 - `chart.point` flagged "Unknown property 'point' on namespace
  'chart'" (checker bug, not data).** `chart.point` is a type with
  constructors (`chart.point.new`/`.now`); a bare `chart.point` reference
  trips the unknown-property check. This is type-as-namespace handling in
  the checker, not missing data. (`barmerge.lookhead_on`, also surfaced
  here, is a user typo TV flags too - not a bug.)
- ~~#4~~ **CLOSED 2026-06-04.** "Cannot be called from a local scope" is
  down to 5 hits in 1 file (was 31 -> 15 -> 5 across INV008 and the
  #31/#33/#34 parser work), and those 5 are TRUE positives: `plot()`
  inside `if showZones` in `577f110…pine:824-828`. TV is silent there
  only because it stops at that file's line-475 syntax error; probed
  directly, TV rejects plot-in-if with CE10188 "Cannot use 'plot' in
  local scope" (pine-lint --tv, 2026-06-04, minimal probe
  `if close > open` / `    plot(close)`).
- **#9 - type-inference where we infer non-bool but TV infers bool.**
  Umbrella task. Several big wins landed via INV005, INV010, INV011;
  remaining FPs need a fresh corpus diff and per-category dives. The
  current top non-cascade category likely needs a new pass. Robust
  UDF-return inference here would also let INV016's union-arg check and
  INV014's const-arg check drop their conservative reliability gates (both
  currently skip args typed via UDF returns / user vars to avoid FPs, so
  they miss real violations that flow through a variable).
  2026-06-04 progress: the biggest single cluster (11 bool-operand FPs in
  `0277c9c016df…`) was not type inference at all but a parser bug -
  `series`/`simple` qualifier-led declarations split the statement and
  truncated function bodies - see
  [INV024](investigations/INV024-qualified-type-declarations/notes.md)
  (-324 corpus error records). The CE10147 follow-up surfaced there
  (qualifier after const / without type) was implemented 2026-06-05 -
  see the INV024 addendum (probes 7-10).
- **#18 - ~~ternary "Got 'color' and 'string'" FP residue~~ resolved**
  via [INV026](investigations/INV026-literal-color-and-param-guess-fps/notes.md)
  (2026-06-04): the residue was never the color *constants* (those were
  fine in `CONSTANTS_BY_NAME`) but hex color *literals* (`#00ff41`)
  inferred as 'string', plus the UDF return-type inference pass
  poisoning the shared expression-type cache with `series<float>`
  guesses for untyped params, plus `ta.valuewhen`-style
  return-follows-param builtins falling back to a frozen overload-#0
  'color' return. Cluster 18 -> 3, and the 3 are our own synthetic
  fixture's deliberate true positives. Still open from the original
  item: pine-lint's variable-list output (`astExtractor.ts`) labels
  some built-in color constants `"undetermined type"` - a separate
  display-path quirk, cosmetic, not a validator issue.
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
- **#21 - retire the remaining hardcoded function metadata in
  `generate.ts`.** Still hand-coded because TV doesn't expose them cleanly:
  `getFunctionFlags.topLevelOnly` (15 fns, "global scope only"), the
  `polymorphic` category map (shrunk by INV032: math.round/floor/ceil were
  wrongly listed - their 1-arg forms return int regardless of the argument;
  the per-overload data already encodes this → see #17), and `isParameterOptional`
  + `commonOptionalParams` - prose-matching heuristics for argument
  optionality, the last cousin of the retired `inferVariableType` /
  `inferConstantType` guessers. (The `variadic` map stays: its `minArgs`
  values are authoritative where the scrape over/under-counts - 
  `array.from`/`str.format` valid with 1 arg, `math.sum` not variadic.)
  Done means three things: (a) no guessing heuristics - any fact that can't
  be derived from scraped data must be probe-verified with `pine-lint --tv`
  (dated); (b) retained facts live as an explicit override *data file*
  under `pine-data/` (fact + probe + date), which `generate.ts` merely
  applies - not as TypeScript literals only readable in our pipeline
  source; (c) the values keep flowing into `functions.json`
  (`flags.*`, param `required`) as they already do, so the generated JSON
  stays self-contained for external consumers, now with inspectable
  provenance. The `variadic` exemption keeps its values but moves to the
  same override file.
- **#22 - `--only <names>` / `--only-overloaded` scrape flag.** The only
  remaining scrape-load reduction: a flag for a targeted re-scrape of just
  the named entries, instead of hand-deleting their `.cache/function-details/`
  files and running plain `scrape`. Lower priority now that both type-logic
  and DOM-extraction iteration are fully offline via the `.cache/dom` mirror
  + `reextract:dom` (see CLAUDE.md "Re-running type logic WITHOUT scraping"),
  so full `--force` re-scrapes should be rare - only when TV's DOM *structure*
  changes.
- ~~#29~~ **CLOSED 2026-06-04.** (a) Inventory regenerated with the fixed
  CLI (see the dated measurement under "Periodic re-baseline" below).
  (b) `find-real-failures.mjs` and `compare-tv.mjs` now treat an
  unparseable side as "no verdict" - the file is flagged and skipped,
  never diffed against an empty error list. Both reports also embed
  `generatedAt` + `gitCommit` provenance (a TV verdict is a
  point-in-time fact - G001). Bonus root cause found while rechecking
  the 3 "unparseable" files: the `--tv` CLI path called `process.exit()`
  straight after `console.log`, TRUNCATING large responses (>64KB pipe
  buffer) mid-JSON - exactly what made those 3 files unparseable. Fixed
  with the write-callback pattern the local path already used.
- **#30 - consider rich (MarkupContent) diagnostic messages.** LSP 3.18
  (vscode-languageserver 10) widened `Diagnostic.message` to
  `string | MarkupContent`. Our language-service diagnostics are plain
  strings, and `convertLSPDiagnostic` in `packages/lsp/src/converters.ts`
  flattens any MarkupContent to its `.value`. We could instead emit
  markdown messages (code spans around symbols/types, links to TV
  reference pages, INV/G pointers) where the client advertises support.
  Requires widening the internal `Diagnostic.message` type or adding a
  parallel rich field, plus a capability check before sending markup.
- ~~#32~~ **CLOSED 2026-06-04** - see
  [INV018](investigations/INV018-conditional-series-history-dependence/notes.md).
  CONDITIONAL_SERIES now fires on history-dependence
  (`flags.historyDependent` baked into pine-data for ta.*, plus a UDF
  body scan for `[]`/transitive calls), covers ternary / and-or /
  switch arms with TV's per-context wording (CW10002/3/4, probed), and
  no longer flags drawing/str.* side-effect calls. Discovered en route:
  `--tv` responses carry a `warnings` array - warning-channel
  differential testing is now possible (follow-up below).
- ~~#36~~ **CLOSED 2026-06-04** - find-real-failures/compare-tv now diff
  the `warnings` channel by position (summary + topWarning* in the
  report). The first runs drove a round of CONDITIONAL_SERIES
  refinements, all probed and recorded in INV018: the series-condition
  gate (warn only when the governing condition/discriminant is
  series-qualified, tracked through assignments; loops always),
  `[]`-on-globals exemption in UDF scanning, params-are-series-by-
  default, and `fixnan`/`math.sum` flagged historyDependent (probed;
  `nz`/`request.security` probed clean). Measurement 2026-06-04: local
  1889 / TV 376 warnings, tv-only 164 (mostly the #37 missing rules +
  wrapped-line position artifacts).
- ~~#37~~ **CLOSED 2026-06-04** - all three missing TV warning rules
  implemented, each probed and recorded in its own investigation:
  (a) CW10001 multiline-string deprecation -
  [INV019](investigations/INV019-cw10001-multiline-string-deprecation/notes.md)
  (also fixed the lexer stamping line-spanning tokens at their END
  line with negative columns); (b) CW10013/CW10011 variable shadowing
  from a lexical scope stack -
  [INV020](investigations/INV020-cw10013-variable-shadowing/notes.md);
  (c) CW10018 history of conditionally-declared locals, sharing the
  INV018 series-condition gate -
  [INV021](investigations/INV021-cw10018-local-variable-history/notes.md).
- ~~#40~~ **CLOSED 2026-06-04** - see
  [INV023](investigations/INV023-ce10190-builtin-shadow-after-use/notes.md).
  CE10190 implemented in the checker (v6-only): declaring a variable
  named after a built-in errors when the built-in was referenced
  earlier in source (any scope, global redeclarations too; four
  probes). Zero corpus hits - it never appeared in the FN inventory;
  it came from the INV020 probing.
- ~~#38~~ **CLOSED 2026-06-04** - the "position artifacts" were TWO
  separate conventions, both probed and recorded in
  [G005](gotchas/G005-tv-diagnostic-position-conventions.md):
  (a) line splitting - our lexer skipped `\r`, so the 522 fixtures
  with `\r\r\n` endings had halved line numbers vs TV and the 130
  CR-only fixtures lexed as ONE comment line with zero diagnostics;
  fixed in `lexer.ts` (lone `\r` breaks, `\r\n` breaks at the `\n`),
  tests in `lexer-line-endings.test.ts`; (b) wrapped statements - TV
  anchors at the logical line's first physical line with columns
  accumulated over a comment-stripped single-space join; inverted in
  `scripts/lib/tv-positions.mjs` (used by both diff scripts), bails
  to the raw position when the continuation shape doesn't hold.
- ~~#39~~ **CLOSED 2026-06-04** - see
  [INV022](investigations/INV022-andor-right-always-conditional/notes.md).
  Not a call-argument descent problem: INV018's series-condition gate
  on and/or right operands was an over-extrapolation. Probed: TV warns
  CW10002 on `input.bool() and ta.crossover(...)` (input left operand!)
  while the input-gated TERNARY stays silent - and/or right operands
  are always conditional; the gate stands for if/ternary/switch. Gate
  removed for and/or; the two heavy fixtures now diff zero tv-only.
- ~~#35~~ **CLOSED 2026-06-04.** Single-line function/method arrow
  bodies parse comma-separated statement units via a shared
  parseInlineStatementUnit (also adopted by inline switch arms): the
  last unit becomes the ReturnStatement, `name = expr` units emit
  VariableDeclaration (Pine's `=` declares - emitting assignments left
  the names undeclared), `:=`/compound emit AssignmentStatement.
  Multi-line bodies already kept full statements.
- ~~Re-measure #4 and the INV012 cascade counts~~ **DONE 2026-06-04** -
  the category tables below now reflect the `9d64b4c` measurement
  (955 local-only, vs the ~2200+ in the pre-#31 tables). The cascade
  story compressed dramatically: "Unexpected token: \n" went 549 -> 78
  (4 files), and the two undefined-variable categories went 1086+1072
  -> 231+444 (concentrated in ~13 files).
- **Minor data residue (record-only, low value):** `ta.vwap.anchor`'s default
  and the "X by default" phrasing are deliberately unparsed (see
  `parse-default.ts`). Skip unless a consumer needs them. (`since`/`deprecated`,
  formerly #27, resolved: TV exposes no version-introduced data so `since` was
  dropped; `deprecated` is parsed from the description - only `request.quandl`
  in v6.) The "Returns" prose, "Remarks", and "See also" cross-references - once
  uncaptured - now ship on every catalog as `returnsDescription`/`remarks`/
  `seeAlso`, and operators ship as their own `operators.{ts,json}` catalog
  (reference data for external consumers; the checker ignores both - see the
  Data Pipeline section in CLAUDE.md).

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
| `scripts/audit-fixtures.mjs` | Scans every `.pine` fixture under `packages/core/test/fixtures/` without running vitest. Flags fixtures with malformed `@expects` directives and fixtures whose only assertion is a total `errors: N` count (no per-error coverage), printing suggested `// @expects error: line=N, message="..."` directives ready to paste. Exits non-zero on malformed directives. Wrapper: `pnpm run audit:fixtures` (also rebuilds the compiled helpers it imports). |

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

**Measured 2026-06-05, working tree on `fc2a6d6` + INV032**
(declaration/`:=` strict base-type rule CE10173 + CE10097, float-literal
raw-lexeme typing, na identifier typing, version threading,
no-annotation = v1, math.round/floor/ceil polymorphic fixes; 748 v6
fixtures, 4 unparseable): **42 confirmable local-only error records /
31 tv-only / 30 same-pos-different-message**, plus 924 past TV's stop
point. The "Cannot assign * to *" (3) and "Value with NA type" (2)
tv-only categories are cleared, and the local-only type-FP rows
shrank with them (the 'and'-operand, argument-mismatch, and
cannot-apply categories are gone - all fed by `0.0`-style literals
typed int): the type-checker local-only residue is now 3 deliberate
synthetic TPs + 3 condition-bool + 1 ternary-cond. Corpus baseline
20120 -> 20069.

Previous measurement 2026-06-04 (~20:00 UTC, `42d522f` + INV031,
tuple blank-line RHS, type-keyword names, if-expressions;
`6874e636…` + the 3 NBSP-refusal files no-verdict that run): **42
confirmable local-only error records / 36 tv-only / 29
same-pos-different-message**, plus 919 past TV's stop point. The
undefined-variable categories collapsed from 27+15 to 3+5 - the three
TV-clean carrier files (`d88ffa83…`, `ca2e4ee7…`, `fffe6a2f…`) lint 0
errors; the remainder sits in lexical-abort mangled files with no
real TV verdict (see INV031 notes). Corpus baseline 20683 -> 20120.

Previous measurement the same day (~19:00 UTC, `635192b` + INV030,
blank-line operator wraps + if-tail tuple capture; `6874e636…` did not
answer): **77 confirmable local-only / 36 tv-only / 29 samePos**, plus
986 past TV's stop point. INV030 resolved the `6874e636…` cluster
outright - 201 records -> **0 errors**, matching TV's clean verdict -
by generalizing INV027's blank-line wrap handling to all binary
operator continuations (gated on INV017's wrap-indent rule) and
capturing UDF tuple returns from if/else tails. Corpus baseline
21060 -> 20683 (-377, the cascade and its knock-on type FPs).

Previous measurement the same day (~18:00 UTC, `637c236` + INV029,
mid-line NBSP CE10005 + refusal handling in find-real-failures;
`6874e636…` answered that run): **279 confirmable local-only / 36
tv-only / 29 samePos** (279 = 78 + `6874e636…`'s then-unfixed 201).
INV029 cleared the whole `no viable alternative at character` FN
category (6 files, all matching TV's exact anchors) and exposed that
TV's translate_light REFUSES files whose `//@version` annotation is
NBSP-mangled ("Supported versions are >= 5", null result) - a refusal
find-real-failures previously counted as "TV reports no errors" (the
G002 shape); it now buckets those as no-verdict (3 files). Corpus
baseline 21051 -> 21060 (+9: one CE10005 per NBSP-obfuscated file).

Previous measurement the same day (~17:15 UTC, `fe1b880` + INV028,
operand-anchored operator errors; `6874e636…` tvUnparseable that run):
**78 confirmable local-only / 42 tv-only / 29 samePos**. INV028 moved
the 10 decodable "Cannot call operator" anchor-mismatch pairs into the
wording channel (tv-only 52 -> 42, samePos 19 -> 29); the 3 left are
`35a58bb9…`'s ternary trio (TV's branch-priority anchor not decoded -
see the INV). Corpus baseline 20941 -> 21051 (+674 per-operand
doubles, 657 of them legacy-truthiness sites on v2/v4/v5 scripts
where the left operand was already flagged).

Previous measurement the same day (~16:30 UTC, `f42cd6f` + INV027,
placeholder-generic returns, security_lower_tf element type,
comma-declaration annotation binding, blank-line ternary wraps; the
one run where `6874e636…` answered): **286 confirmable local-only /
52 tv-only**. The jump from 104 was NOT a regression: the "Cannot
assign" category (13) was cleared, but `6874e636…` - tvUnparseable on
every other run, so never counted - entered the pool with **201
undefined-variable records against TV's clean 0-error verdict**. It is
a valid 3000-line UDT- and method-heavy script (BigBeluga order
blocks); our errors are almost certainly UDT-method/scope resolution
(`bull_ob.create_profile()`, `this.broken`, objects declared in one
if-body and used in later ones). That single file remains the biggest
lever in the inventory (it just isn't counted in runs where TV fails).
Excluding it: 85 confirmable local-only. Corpus baseline
21051 -> 20941.

Previous measurement the same day (~15:30 UTC, `cb11335` + INV026,
hex-literal color inference, inference-pass cache isolation,
return-follows-param fallback): **104 confirmable local-only / 52
tv-only**. INV026 cleared 15 of the 18 ternary-branch FPs (the 3 left
are our own synthetic fixture's deliberate true positives) and most of
the cannot-apply category (7 -> 3); the corpus baseline dropped 585
guessed-type records (21636 -> 21051).

Previous measurement the same day (~14:15 UTC, `40119dc` + INV025,
string-continuation lexer fix + post-TV-stop bucketing): **125
confirmable local-only / 52 tv-only**, plus **985 local-only past TV's
stop point**
(no TV verdict - errors strictly after the last error TV reported on a
TV-erroring file; TV stops there, so these cascades on mangled
hard-wrapped sources are unconfirmable and now bucketed separately
rather than mixed in). Pre-bucketing equivalent: 1110 mixed local-only
(was 903 at `a472f3a`+INV024, 955 at `9d64b4c`, 1561 at `6644c91`; the
1110 includes the honest new cascades INV025 surfaces on 5 broken v6
files where strings used to swallow wrapped code). INV025 fixed all 5
CE10017 tv-only FNs (57 -> 52). Warning channel: local 2149 / TV 376,
local-only 1598 confirmable + 205 past-TV-stop, **tv-only 26** - the
remaining 26 are UDF-call CW10003s our UDF scan misses, three
shadowing stragglers in `fca605cb…`, and ternary-wording position
cases. The warning local-only count is dominated by UNUSED_VARIABLE
(TV has no such channel) plus our deliberate
warn-inside-untyped-UDF-bodies stance (INV018).

---

## Parser - error recovery cascades

One bad token causes downstream "Unexpected token" hits because recovery
synchronizes coarsely (see #20). Much compressed since the original
inventory (the table once started at 1086+1072+549), and the 2026-06-04
post-INV025 measurement now excludes post-TV-stop cascades (985 records
on mangled hard-wrapped files - no TV verdict), which is where most of
the previous counts lived. Confirmable counts:

| count | files | category |
|---|---|---|
| 6 | 1 | `Unexpected identifier '*' - did you mean '*'?` |
| 6 | 1 | `Unexpected token: .` |
| 5 | 1 | `Unexpected token: \n` |
| 5 | 3 | `Undefined variable '*'. Did you mean '*'?` *(lexical-abort files, see Symbols below)* |
| 3 | 3 | `Unexpected token: :` |
| 3 | 3 | `Undefined variable '*'` |
| 2-1 | - | long tail: `:=` `)` `=>` `==`, `Expected method name after 'method'` |

(2026-06-04 post-INV031: the undefined-variable categories fell
27+15 -> 3+5; the giant clusters' history is in the Symbols section)

## Parser - syntax we silently accept (false negatives)

These are real syntax errors in the user's code that we don't surface.

| count | files | category |
|---|---|---|
| 6 | 5 | `Syntax error at input {value}` (end-of-line continuation, new line, `:=`, `[`) |
| 2 | 1 | `All exported functions args should be typified` |
| 1 | 1 | `Script doesn't contain any statements` |
| 1 | 1 | `Syntax error: Missing closing parenthesis` |
| 1 | 1 | `Exported variable should have const modifier and type` |

(The `Cannot read properties of undefined (reading 'pinePos')` record
is a TV-side crash string that deterministically accompanies CE10125
on int-valued enum fields at the same span - reproduced and explained
in INV039; with CE10125 now matched there, it pairs in the
same-position channel instead of counting as a gap.)

(2026-06-04 post-INV025: the `Missing enclosing character in the
literal string` category - 5 files - is fixed and gone; see INV025.
Post-INV029: the `no viable alternative at character` category - 6
files, mid-line NBSP at bracket depth 0 - is fixed and gone; see
INV029, which also covers TV refusing NBSP-mangled `//@version`
annotations outright. 2026-06-05 post-INV033: the
`"{typeKeyword}" is not a valid type keyword` category - 3 in 3
files, `source`/`plot` - is fixed and gone; CE10149 now validates
declaration annotations against built-ins + earlier UDT/enum names.
Post-INV034: the `Incorrect "for" statement` category - 2 in 2
files - is fixed and gone; CE10161 fires when a complete counted-for
header is followed by a wrap-continuation body line. Post-INV035: the
`"{variableName}" is already defined` category - 2 in 2 files - is
fixed and gone; CE10095 fires on same-scope redeclaration via a
lexical declScopes stack, with `:=` comma units now correctly parsed
as reassignments)

---

## Type checker - over-strict bool / arg / assign rules

Per task #9 the root cause is more likely our type inference producing
non-bool types where TV correctly produces bool. Much reduced this round:
the `input`/`const` qualifier coercion and display-flag fixes cleared the
`Type mismatch for parameter` category entirely (was 127) and most of the
bool-operator and ternary FPs.

| count | files | category |
|---|---|---|
| 3 | 2 | `Condition must be boolean, got *` |
| 3 | 1 | `Ternary branches must have compatible types. Got '*' and '*'` (our own synthetic fixture's deliberate true positives - TV flags them too, at the argument position; see INV026) |
| 1 | 1 | `Ternary condition must be bool, got *` |

(2026-06-05 post-INV032: the 'and'/'or'-operand, argument-mismatch,
and cannot-apply categories are gone and condition-bool halved - all
were fed by whole-valued float literals (`0.0`, `2e3`) typed int;
inferLiteralType now consults the raw lexeme. Earlier history:
2026-06-04 post-INV027 cleared "Cannot assign" - 13 in 6 files -
via placeholder-generic returns, security_lower_tf element typing,
comma-declaration annotation binding, blank-line ternary wraps;
INV026 resolved the ternary-branch FP cluster (#18, was 18 in 8
files; hex color literals inferred as string, inference-pass cache
poisoning, the ta.valuewhen frozen-overload fallback); INV024 cleared
the 'and'-left-operand and 'not'-requires-bool categories; at
`9d64b4c` cannot-apply fell 75 -> 9)

**Right approach**: pick a specific FP, trace through `inferExpressionType`
in `checker.ts` to see why we produce e.g. `series<float>` for what
should be `series<bool>`. Don't relax the bool checks - they're correct.

## Type checker - false negatives

| count | files | category |
|---|---|---|
| 3 | 1 | `Cannot call "operator ?:" with argument ...` (was 13 in 9 files - never a detection gap, just anchor mismatch; resolved by INV028's operand-anchored errors. The 3 left are `35a58bb9…`'s ternary trio, where TV anchors at one branch by undecoded type-priority rules; we detect all three at the ternary) |
| 2 | 1 | `The condition of the "{blockName}" statement must evaluate to a "bool" value` |
| 1 | 1 | `Cannot call "plot" with argument "title"=... (series string for const string)` |

The operator-argument cluster is resolved (INV028): every site was
already detected, anchored differently. The `Cannot assign * to *` (3)
and `Value with NA type ...` (2) categories are resolved by INV032's
strict declaration/reassignment base-type rule (CE10173/CE10097, 21
probes). The `Could not find {kind}` category (2) is resolved by
INV036's CE10271 undefined-callable check, the
`Undeclared identifier` category (2) by INV037's v6 if-branch
scoping, the collection-in-template category (2) by INV038's
CE10025/CE10022 checks, and the enum-field-type category (1) by
INV039's CE10125 (which also explains the 'pinePos' record as a
TV-side crash echo). The remaining rows above are genuine gaps.

---

## Symbols - undefined-variable clusters

The giant clusters are all resolved (2026-06-04): `6874e636…` (201
records vs TV's clean verdict) was NOT scope or UDT-method resolution -
a wrapped `or` chain with blank lines between continuation lines
truncated a ~600-line function body, spilling its locals to top level
(INV030; the file now lints 0 errors). `4d78be7e…` (~250 hits) was a
hard-wrapped mangle TV rejects at its first broken string literal -
INV025 made us match that CE10017, and the post-TV-stop bucketing
moved its cascade (and `8439b236…`'s `src` cluster) out of the signal.
The last fixable stragglers (34 records in 3 TV-clean files) fell to
INV031: tuple-destructure RHS on a blank-line wrap, type keywords as
variable names (`var color color = na`), and if-EXPRESSIONS
(`int m = if cond` ...). What remains (3 + 5 hits) sits in
lexical-abort mangled files with no real TV verdict.

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
those 5 are TRUE positives - `plot()` inside `if showZones`, probed
directly against TV (CE10188; see the closed #4 above). Nothing left to
relax here.

---

## Open questions worth answering before tackling individual fixes

- ~~TV unparseable responses~~ - root-caused in #29 (our own CLI
  truncated >64KB responses on process.exit; fixed). The remaining
  occasional `tvOk: false` is a transient empty response from TV -
  retry before reading anything into it. (`6874e636…` failed on every
  inventory run until 2026-06-04 ~16:30, then answered with a clean
  0-error verdict - so even a repeatedly-failing file is eventually
  measurable, and its first verdict surfaced a 201-record FP cluster;
  see the Symbols section.)
- A few categories ("All exported functions args should be typified",
  "Exported variable should have const modifier and type") look like
  library-only constraints. Decide whether we want to implement those at all
  before counting them as bugs.
- TV emits NO warnings for files with compile errors (stops at the
  first error - G001), so warning local-only counts are structurally
  inflated for error-bearing fixtures. The post-TV-stop bucketing
  (INV025) moves local-only warnings positioned AFTER TV's stop out of
  the count (205 records), but warnings BEFORE the stop on TV-erroring
  files still count as confirmable even though TV's warning pass may
  never have run there - a full fix would bucket ALL local-only
  warnings on TV-erroring files.

