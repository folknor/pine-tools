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

- ~~#3~~ **CLOSED 2026-06-07 - the premise inverted.** See
  [INV048](investigations/INV048-type-namespace-as-value/notes.md).
  The `chart.point` FP no longer existed (fixed by intervening parser
  work; zero corpus records); what remained was the opposite: bare
  built-in type/namespace names in value position (`x = line`,
  `x = ta`, `x = chart.point`) are TV's CE10272 `Undeclared identifier`
  and bare enum names CE10074 - both now implemented (13 probes; bare
  UDT names probed accepted). Plus one true data-gap FP:
  `syminfo.cftc_code` is linter-accepted but reference-undocumented -
  added via the new probe-backed `UNDOCUMENTED_VARIABLES` override in
  `generate.ts` (the #21 override-data-file refactor should absorb it).
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
  two risks in the inputs. **No evidence anything is wrong right now** -
  no corpus FP/FN traces to these maps - so this is insurance, not a
  bug hunt. (1) *Unverified guessing:* `isParameterOptional` +
  `commonOptionalParams` derive param `required` by prose-matching
  ("default value is", "if omitted") plus a ~40-name "usually optional"
  list - the last cousin of the retired `inferVariableType` /
  `inferConstantType` guessers, and never probe-checked against TV.
  (2) *Silent drift:* facts stored as bare TS literals carry no
  re-verification recipe, which is exactly how G002's bad widenings
  survived - whether TV changes or our own measurement was wrong, a
  stale fact has nothing attached to re-check it against. Current
  inventory of hand-coded facts: `getFunctionFlags.topLevelOnly`
  (14 fns), the `polymorphic` category map (shrunk by INV032:
  math.round/floor/ceil were wrongly listed - their 1-arg forms return
  int regardless of the argument; the per-overload data already encodes
  this → see #17), `variadic`/`minArgs` (authoritative where the scrape
  over/under-counts - `array.from`/`str.format` valid with 1 arg,
  `math.sum` not variadic), `historyDependent` (ta.* + fixnan +
  math.sum, probed 2026-06-04, INV018), `RETURN_TYPE_PARAM_OVERRIDES`
  (`input` → `defval`, see #17), INV048's `UNDOCUMENTED_VARIABLES`
  (already carries fact + probe + date inline - the model), and the
  optionality heuristics above. Concrete first step for (1): an offline
  script diffing `isParameterOptional`'s verdicts against scraped
  evidence (`default` present, "optional" prose) - params the heuristic
  calls optional with no supporting evidence are the suspicious set to
  probe, likely far smaller than the full surface. Done means: every
  retained fact is probe-verified with `pine-lint --tv` (dated) or
  derived from scraped data, each carries its probe so it can be
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
  Identifier callees only; undefined `lib.fn` / `ns.fn` / UDT-method
  calls still pass silently. Needs import-alias member data we don't
  have, plus UDT method namespaces. (INV036 residual.) Also blocks the
  last bool-condition FP (`b369d637…` - tuple destructure from an
  imported lib call gets `series<float>` elements; the interim option
  of typing such elements `unknown` instead of guessing is noted in
  INV049's residual).
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
wording - since closed, see git log / the fourth INV047 addendum).

Earlier measurements live in git history (this section, prior
revisions) - each is a dated point-in-time record per G001.

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

## Parser - syntax we silently accept (false negatives)

These are real syntax errors in the user's code that we don't surface.

| count | files | category |
|---|---|---|
| 2 | 1 | `All exported functions args should be typified` |
| 1 | 1 | `Exported variable should have const modifier and type` |

(Both rows are the library-only constraint policy question - see Open
questions below. Every other category this table once held is fixed;
the trail is in git history and the investigations index.)

---

## Type checker - over-strict bool / arg / assign rules

Per task #9 the root cause is more likely our type inference producing
non-bool types where TV correctly produces bool. Much reduced this round:
the `input`/`const` qualifier coercion and display-flag fixes cleared the
`Type mismatch for parameter` category entirely (was 127) and most of the
bool-operator and ternary FPs. INV049 (2026-06-07) cleared the last
unexplained record - tuple destructures with if/switch-expression inits
defaulted every element to `series<float>`; element types now flow from
the branch tails.

| count | files | category |
|---|---|---|
| 3 | 1 | `Ternary branches must have compatible types. Got '*' and '*'` (our own synthetic fixture's deliberate true positives - TV flags them too, at the argument position; see INV026) |
| 1 | 1 | `The condition of the "if" statement must evaluate to a "bool" value.` (`b369d637…` - destructure from an imported library call; blocked on #41's member data, see INV049 residual) |

**Right approach**: pick a specific FP, trace through `inferExpressionType`
in `checker.ts` to see why we produce e.g. `series<float>` for what
should be `series<bool>`. Don't relax the bool checks - they're correct.

## Type checker - false negatives

| count | files | category |
|---|---|---|
| 3 | 1 | `Cannot call "operator ?:" with argument ...` (was 13 in 9 files - never a detection gap, just anchor mismatch; resolved by INV028's operand-anchored errors. The 3 left are `35a58bb9…`'s ternary trio, where TV anchors at one branch by undecoded type-priority rules; we detect all three at the ternary) |

Every other row this table once held is cleared (INV028, INV032-INV041);
only the ternary trio remains.

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
Nothing left to relax here.

---

## Open questions worth answering before tackling individual fixes

- Occasional `tvOk: false` results are transient empty responses from
  TV - retry before reading anything into it. (Root-caused 2026-06-04:
  our own CLI used to truncate >64KB responses, now fixed; what
  remains is genuinely TV-side and transient.)
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

