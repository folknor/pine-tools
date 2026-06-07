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
- **#41 - MemberExpression callee validation.** INV036's CE10271 covers
  Identifier callees only; undefined `lib.fn` / `ns.fn` / UDT-method
  calls still pass silently. Needs import-alias member data we don't
  have, plus UDT method namespaces. (INV036 residual.)
- ~~#42~~ **CLOSED 2026-06-05** - both halves probed and implemented
  (addenda in INV040/INV041). The qualifier rule turned out BROADER
  than assumed: conditional results take the condition's qualifier
  including INPUT (input.bool-driven ternary/switch titles are
  CE10123 "input string" - the original INV040 input-negative
  assumption was wrong; condition-less switches stay const, probed).
  Landed `input<T>` internal types for input.*() calls plus the
  knock-on qualifier-blindness fixes (isAssignable equal-base rule,
  numeric polymorphic bases, message rendering). while gets CE10101
  at the condition span; counted `for` has no bool condition to check.
- ~~#43~~ **CLOSED 2026-06-05** - all three residual groups probed and
  closed (addenda in INV033/INV035/INV038): CE10149 fires on UDF/method
  param annotations (anchored at the type token); tuple names enter the
  CE10095 frames (later redecl AND within-tuple duplicates; inline
  arrow bodies turned out already-correct, probed clean); annotation
  nesting splits by outer collection - array CE10022 / matrix CE10023
  / map CE10025, inner base in the {inner} slot.
- ~~#44~~ **CLOSED 2026-06-07 - resolved AGAINST the bucketing
  proposal.** Blanket no-verdict for string-lexer-abort files was a
  cop-out: "TV didn't grade this homework" doesn't make the homework
  ungradeable. Per-record triage of `13a745…` (158 records) and
  `8439b236…` (170) instead - see
  [INV047](investigations/INV047-mangle-file-recovery-fps/notes.md).
  Outcome: the records split cleanly into (a) probe-backed TRUE
  positives we keep counting (unterminated strings - TV confirms the
  class at each file's first one; INV042 wraps; `bar index` mangles -
  probed 2026-06-07, TV CE10156 at our exact anchor) and (b) four
  reproducible parser-RECOVERY bugs that flag correct code - now #46.
  Bonus probe-backed language fact: continuation inside an open call
  paren is INDENT-FREE in TV (column-1 and indent-4 both accepted;
  control probe proved TV parsed the join) - our silent in-paren join
  is correct; only our post-error in-call recovery shreds.
- **#46 - parser recovery quality on error-bearing files (INV047
  residual).** The LSP case: after one real error, the user should
  still get correct symbols for the rest of the file, not ~40 phantom
  "undefined variable" diagnostics. Shapes from the INV047 triage:
  (a) ~~declaration-swallow (~66 records)~~ **FIXED 2026-06-07** (see
  the INV047 addendum) - NOT the suspected #20 sync over-skip but two
  pieces of state poisoned by a broken string literal hundreds of
  lines earlier: the lexer's bracketDepth (closers swallowed by
  shifted string lexing → NEWLINE suppression for the rest of the
  file) and the parser's parenDepth (never reset by synchronize →
  later `name = expr` parsed as assignment-to-undeclared). Corpus
  -3233/+1197 records, all triaged; the +1197 are honest INV042-shape
  wrap errors and noise on genuinely-broken lines the suppression
  used to hide.
  (b) ~~in-call error recovery (~30 records)~~ **FIXED 2026-06-07**
  (see the second INV047 addendum) - finishCall records ONE anchored
  error per malformed argument and recovers to the next argument
  boundary; NEWLINEs inside a call (only possible after a
  broken-string lexer reset) split structurally - a following line
  whose bracket balance goes negative is the call's torn continuation,
  a balanced line is the next statement. Includes the depth
  snapshot/restore in the recovery catch (a swallowed throw used to
  leave parenDepth/bracketDepth stuck, silently disabling the INV042
  wrap check downstream), a (line,column,message) dedupe in
  getParserErrors, the `recovered` call flag exempting truncated arg
  lists from missing-required-parameter checks, and `const` UDF param
  qualifier support (TV-clean fixture `3d985aaf…` now lints 0).
  Inventory 60 -> 44 confirmable local-only; baseline
  18292 -> 17325.
  (c) ~~body-spill scope loss~~ **FIXED 2026-06-07** (third INV047
  addendum, probes p05/p08/p09) - the spill had three legs: mid-line
  leftover tokens read as indent 0 ended bodies (`indent || 0`),
  thrown body statements broke/propagated instead of
  record-and-resume, and several VALID wrap forms never parsed
  (trailing-`=` and leading-`=` tuple RHS wraps, comma unit lists
  wrapping across lines, `var`/tuple/expression comma units). Five
  TV-clean fixtures went from 2-72 FPs to 0.
  (d) ~~switch-arm resume~~ **FIXED 2026-06-07** (same addendum,
  probes p06/p07) - leading-`=>` arm wraps and arm-internal ternary
  wraps now join; a failed arm records one error and resumes at the
  next line; assignment-shaped `switch` and non-declaration `type`
  (pre-v6 variable names) no longer enter the switch/type-declaration
  machinery.
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
- ~~#47~~ **CLOSED 2026-06-07** - TV's second broken-string wording
  decoded and matched (fourth INV047 addendum, probes p10-p16). Quote
  type is irrelevant; the rule is: v6 emits CE10017 at brokenLine:1
  when ANY closing quote exists later in the source, and CE10004
  `mismatched character '\n' expecting <quote>` at the broken line's
  EOL when the source holds no later quote; the pre-v6 compiler ALWAYS
  uses the mismatched wording at the EOL (the three carrier files were
  simply `//@version=5` - and the "opening quote" anchor guess was
  wrong, 17:10/22:74 are EOL columns). Implemented in scanString;
  corpus was a clean 1187<->1187 wording swap, v6 inventory untouched.
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
| `scripts/summarize-regression.mjs` | Groups `regression-report.json`'s appeared/disappeared records into message templates so a 1000-record diff reads as a dozen categories; `--files <substring>` lists per-file counts for matching categories. Run right after `regression-check.mjs`. |
| `scripts/slice-lines.mjs` | Extracts 1-based line ranges (`"1-2,1041-1051"`) from a file into a new file - the bisection helper for narrowing parser-state repros out of large fixtures (see INV047). |
| `scripts/check-changed-files-broken-string.mjs` | INV047 safety check: verifies every regression-changed fixture carries a broken-string record (i.e. is a file TV rejects at the lexer stage), flagging any possibly-TV-clean file whose behavior changed. |
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

**Measured 2026-06-07 (evening), working tree on `55f0c4f` + the
#46(c)/(d) round (third INV047 addendum)**: **49 local-only / 6
tv-only / 33 same-pos-different-message**, plus 710 past TV's stop
point (4 unparseable, transient). Corpus baseline 17325 -> 17020.
Five TV-clean fixtures that carried 2-72 FPs each (b16b3948…,
f7bc17b0…, 1f6fb53c…, 73b16637…, a6d1bf91…) now lint 0 - the round's
chases kept surfacing VALID Pine wrap/comma/switch-arm forms we
mishandled (probes p05-p09). The 44 -> 49 rise is +6 probe-backed
CE10156 wrap TPs (p09's trailing-`not` shape) surfacing pre-stop in
`13a745…` while its phantom undefineds died; the confirmable set is
now 20 wrap TPs + the 8+8 `bar index` pairs + small known residue.
tv-only unchanged. New follow-up: #47 (TV's second broken-string
wording).

Previous measurement 2026-06-07 (later PM), working tree on `dd2ac7d`
+ the #46(b) in-call recovery round (second INV047 addendum): **44
local-only / 6 tv-only / 33 same-pos-different-message**, plus 800
past TV's stop point (4 unparseable, transient). Local-only 60 -> 44:
the in-call shrapnel ("already defined" x15, stray `.` x6, `)`/`:=`)
is gone; the `bar index` mangle sites now read as TP pairs (`bar`
undefined + `index` did-you-mean, 8+8 records in `13a745…`) next to
the 14 probe-backed wrap records and the small known residue. The
TV-clean `3d985aaf…` const-params fixture lints 0 (was 2 FPs).
Corpus baseline 18292 -> 17325. tv-only unchanged (3 library-only
constraints + `35a58bb9…`'s ternary trio); all five TV-recheck
carriers diff tv-only 0.

Previous measurement 2026-06-07 (PM), working tree on `5029839` +
INV047 (broken-string depth poisoning: lexer bracketDepth reset +
synchronize parenDepth reset): **60 local-only / 6 tv-only / 33
same-pos-different-message**, plus 875 past TV's stop point (4
unparseable, transient). Local-only 73 -> 60 and past-stop 981 -> 875
despite the corpus baseline DROPPING 20328 -> 18292 (-3233 phantom
cascade records, +1197 honest surfaced records - see the INV047
addendum): the declaration-evaporation FPs are gone, and the two
missing-paren-vs-string samePos pairs became exact matches. What
remains confirmable is INV047's triaged set: 14 probe-backed wrap TPs,
the #46(b) in-call shrapnel (already-defined x15, stray-dot x6,
bar-index x6 - all in `13a745…`'s pre-stop region), and the known
small residue (3 synthetic ternary TPs, condition-bool, `at`/`https`
mangled-URL tokens). tv-only unchanged: the 3 library-only constraint
records and `35a58bb9…`'s ternary trio.

Previous measurement 2026-06-07 (AM), working tree on `2bb7466` + the
parser-FN round (INV042-INV046): **73 local-only / 6 tv-only / 35
same-pos-different-message**, plus 981 past TV's stop point (4
unparseable, transient). The tv-only side fell 13 -> 6 and now holds
ONLY the 3 library-only constraint records (the standing policy
question) and `35a58bb9…`'s ternary trio (INV028's undecoded
branch-priority anchors) - every parser FN row is cleared:
trailing-operator wraps at multiple-of-4 indents incl. column 1
(INV042), `/* block comments */` (INV043), tuple `:=` reassignment
(INV044), statement-less scripts incl. TV's position-less CE10250
(INV045), and unclosed `(`/`[` + the closed-array-literal-RHS discovery
(INV046 - `arr = [1, 2, 3]` is invalid even closed; Pine has no array
literals). The local-only rise (61 -> 73) is exactly the +12 new wrap
records, ALL in the two string-lexer-abort mangle files (`13a745…` 10,
`8439b236…` 2) where TV's parse stage never ran - see the strengthened
#44. Corpus baseline 20088 -> 20328 (+240, all triaged: zero on
TV-clean files; each record matches TV, lies past TV's stop, or sits in
lexer-abort no-man's-land).

Previous measurement 2026-06-05 (later PM), working tree on `51680aa` + the
#42/#43 residual round (INV033/INV035/INV038/INV040/INV041 addenda):
**61 local-only / 13 tv-only / 33 same-pos-different-message**, plus
942 past TV's stop point (4 unparseable). Headline identical to the
previous measurement - this round implemented probe-sourced residuals
(while-condition CE10101, UDF param CE10149, tuple CE10095, matrix/map
annotation nesting, conditional-qualifier propagation incl. input) that
were never inventory rows, and killed 23 qualifier-blocked
assignability FPs whose records sat past TV's stop or in legacy files.
Corpus baseline 20111 -> 20088; ~900 same-position wording shifts
(operand qualifiers now visible / bracket types rendered in TV's space
form).

Previous measurement 2026-06-05 (PM), working tree on `f7663dd` after
the task-queue round (INV033-INV041 + INV024 addendum): **61
local-only / 13 tv-only / 33 same-pos-different-message**, plus 943
past TV's stop point (3 unparseable). The tv-only side fell 31 -> 13 and now holds
ONLY: 5 parser `Syntax error at input ...` forms + missing-paren +
script-without-statements (7 records), the 3 library-only constraint
records (the standing policy question), and `35a58bb9…`'s ternary trio
(INV028's undecoded branch-priority anchors). The local-only rise
(42 -> 61) is concentrated in the `13a745…` hard-wrap mangle file
(~33 records: wrap-shredded definitions and arg-spill comma
declarations that the new CE10095/CE10271 checks now name) - TV's
stop on that file is late, so they count as confirmable despite being
mangle noise. Corpus baseline 20069 -> 20111.

Previous measurement 2026-06-05 (AM), working tree on `fc2a6d6` + INV032
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
| 14 | 2 | `Syntax error at input "end of line without line continuation"` *(probe-backed TPs - INV042's wrap rule, surfaced pre-stop in the two mangle carriers)* |
| 8+8 | 1 | `bar` undefined + `index` did-you-mean *(TP pairs - `bar index` mangle sites, probed INV047 p04; TV anchors one CE10156 at `index`)* |
| 3 | 3 | `Undefined variable '*'. Did you mean '*'?` |
| 3 | 3 | `Undefined variable '*'` |
| 2-1 | - | long tail: `:` `==`, `Expected method name after 'method'` |

(2026-06-04 post-INV031: the undefined-variable categories fell
27+15 -> 3+5; the giant clusters' history is in the Symbols section.
2026-06-07 post-INV047: `Unexpected token: \n` cleared from the
confirmable set, and the phantom undefined-variable cascades on the
string-abort mangle files are gone - the broken-string depth poisoning
is fixed. Post-#46(b) the same day: the in-call shrapnel ("already
defined" x15, stray `.` x6, `)`/`:=`) is gone too - what remains is
probe-backed TPs plus a tiny residue)

## Parser - syntax we silently accept (false negatives)

These are real syntax errors in the user's code that we don't surface.

| count | files | category |
|---|---|---|
| 2 | 1 | `All exported functions args should be typified` |
| 1 | 1 | `Exported variable should have const modifier and type` |

(2026-06-07: the whole `Syntax error at input {value}` family - 6 in 5
files - plus `Script doesn't contain any statements` and
`Syntax error: Missing closing parenthesis` are fixed and gone, each
probed: INV042 trailing wraps at multiple-of-4 indents, INV043 block
comments, INV044 tuple `:=`, INV045 empty scripts, INV046 unclosed
groups + array-literal RHS. Only the library-only constraint rows
remain - the standing policy question below.)

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

The operator-argument cluster is resolved (INV028): every site was
already detected, anchored differently. The `Cannot assign * to *` (3)
and `Value with NA type ...` (2) categories are resolved by INV032's
strict declaration/reassignment base-type rule (CE10173/CE10097, 21
probes). The 2026-06-05 task-queue round (INV033-INV041) then cleared
every other row this table held: invalid type keyword (INV033),
for-to (INV034), already-defined (INV035), CE10147 (INV024 addendum),
Could-not-find-callable (INV036), Undeclared identifier (INV037),
collection-in-template (INV038), enum field type + the 'pinePos'
TV-crash echo (INV039), plot-title series string (INV040), and the
if-condition bool wording/anchor (INV041 - never a detection gap).
Only the ternary-trio row above remains.

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
(`int m = if cond` ...). The lexer-abort phantom clusters (filt/src/
metric/lineTpSl - thousands of corpus records, 26+ confirmable) fell
to INV047 (2026-06-07): a broken string literal poisoned the lexer's
bracketDepth (NEWLINE suppression for the rest of the file) and the
parser's parenDepth (synchronize never reset it) - declarations after
the break were never parsed as declarations. What remains (3 + 3 hits)
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

