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
- **#18 - built-in color constants infer as `undetermined type`.**
  Surfaced by INV011. The "Ternary branches must have compatible types"
  cluster is now down to **31** (from ~117+) after the variable/constant
  scraping and display-flag fixes, but a residue of "Got 'color' and
  'string'" FPs remains. The constants ARE in `CONSTANTS_BY_NAME` with
  `type: "color"`, but minimal repros mimicking the pattern lint cleanly.
  The `"undetermined type"` label in pine-lint's variable-list output
  comes from `astExtractor.ts`, a separate path from the validator's
  `inferExpressionType` - investigating may need to reconcile the two
  type-inference paths.
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
  `polymorphic` category map (~25 fns → see #17), and `isParameterOptional`
  + `commonOptionalParams` - prose-matching heuristics for argument
  optionality, the last cousin of the retired `inferVariableType` /
  `inferConstantType` guessers. (The `variadic` map stays: its `minArgs`
  values are authoritative where the scrape over/under-counts - 
  `array.from`/`str.format` valid with 1 arg, `math.sum` not variadic.)
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
- **Re-measure #4 and the INV012 cascade counts** against the post-#31
  baseline - the old numbers predate correct block scoping (#31/#33/#34
  fixed the if/while/for statement leak, else attachment, nbsp
  indentation, tuple/typed for-in iterators, multi-line bracket groups,
  inline switch-arm statements, and the INV017 wrap-indent rule; see
  [plan/31-if-body-statement-leak.md](plan/31-if-body-statement-leak.md)
  Resolution section).
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

**Measured 2026-06-04 (~08:48 UTC) at commit `6644c91`** (post #31/#33/#34,
fixed CLI, 748 v6 fixtures): 1561 local-only error records / 57 tv-only,
after excluding 3 files with no TV verdict (truncated responses - the
CLI flush bug, fixed since; on recheck those 3 diff clean or
near-clean). The same-day FP-cluster session (import-alias
registration, namespaced/array/user types in declarations and params,
var-comma sequences, `var const`, `map<k,v>` suffixes, unary plus,
annotation-token filtering, same-line precedence + wraps) cleared the
largest local-only clusters; expect materially lower numbers on the
next run.

NOTE: that measurement also predates the #38 lexer line-ending fix
(G005). Positions on the 522 `\r\r\n` fixtures have since shifted to
TV's numbering, and the 130 CR-only fixtures - which previously lexed
as one comment line and produced ZERO local diagnostics - are now
actually linted. Expect both sides of the inventory to move for those
files on the next `find-real-failures` run.

---

## Parser - error recovery cascades

One bad token causes hundreds of downstream "Unexpected token" hits because
recovery has no synchronization point. Adding a `synchronize()` that
discards tokens until a statement-boundary anchor (top-level keyword, dedent
to column 1, etc.) should collapse most of these.

| count | files | category |
|---|---|---|
| 1086 | 38 | `Undefined variable '*'` *(many are recovery artifacts, see Symbols below)* |
| 1072 | 41 | `Undefined variable '*'. Did you mean '*'?` *(also partly recovery)* |
| 549 | 12 | `Unexpected token: \n` |
| 103 | 9 | `Unexpected token: =>` |
| 55 | 7 | `Expected variable name` |
| 54 | 4 | `Unexpected token: =` |
| 45 | 16 | `Expected iterator variable` |
| 42 | 11 | `Unexpected token: .` |
| 38 | 11 | `Unexpected token: ,` |
| 33 | 8 | `Unexpected token: )` |
| 14 | 5 | `Expected ")" after arguments` |
| 14 | 3 | `Expected ")" after method parameters` |
| 7 | 5 | `Unexpected token: :=` |
| 7 | 3 | `Unexpected token: :` |
| 6 | 3 | `Unexpected token: ]` |
| 5 | 4 | `Unexpected token: +` |
| 3 | 3 | `Expected ']'` |
| 1 | 1 | `Expected function name after 'export'` |
| 1 | 1 | `Expected type name` |
| 1 | 1 | `Expected method name after 'method'` |
| 1 | 1 | `Unexpected token: ==` |
| 1 | 1 | `Missing comma before '*' argument` |

Example: `fixtures/0c053259a16ba1b4aa4898add6830d5fe0e6bcb90766e1595ca40c08f5644da8.pine`
 - TV reports 1 error at L61 (invalid `series float` qualifier in function
parameter); we report 525, all cascade.

## Parser - syntax we silently accept (false negatives)

These are real syntax errors in the user's code that we don't surface.

| count | files | category |
|---|---|---|
| 6 | 6 | `no viable alternative at character {unexpectedToken}` |
| 5 | 5 | `Missing enclosing character in the literal string` (unterminated string) |
| 5 | 5 | `Syntax error at input {value}` |
| 3 | 3 | `"{typeKeyword}" is not a valid type keyword` |
| 2 | 2 | `Incorrect "for" statement. Expecting "to <expression>"` |
| 2 | 2 | `"{variableName}" is already defined` |
| 2 | 1 | `All exported functions args should be typified` |
| 1 | 1 | `Script doesn't contain any statements` |
| 1 | 1 | `Syntax error: Missing closing parenthesis` |
| 1 | 1 | `Exported variable should have const modifier and type` |

---

## Type checker - over-strict bool / arg / assign rules

Per task #9 the root cause is more likely our type inference producing
non-bool types where TV correctly produces bool. Much reduced this round:
the `input`/`const` qualifier coercion and display-flag fixes cleared the
`Type mismatch for parameter` category entirely (was 127) and most of the
bool-operator and ternary FPs.

| count | files | category |
|---|---|---|
| 75 | 30 | `Type mismatch: cannot apply '*' to * and *` |
| 44 | 19 | `Cannot assign * to *` |
| 31 | 12 | `Ternary branches must have compatible types. Got '*' and '*'` |
| 16 | 6 | `Type mismatch for argument *: expected *, got *` |
| 11 | 5 | `Condition must be boolean, got *` |
| 6 | 3 | `Operator 'and' requires bool operands, but right operand is *` |
| 5 | 1 | `Operator 'and' requires bool operands, but left operand is *` |
| 5 | 3 | `Operator 'or' requires bool operands, but left operand is *` |
| 4 | 1 | `Type mismatch: 'not' operator requires bool, got *` |
| 3 | 2 | `Ternary condition must be bool, got *` |
| 1 | 1 | `Operator 'or' requires bool operands, but right operand is *` |

**Right approach**: pick a specific FP, trace through `inferExpressionType`
in `checker.ts` to see why we produce e.g. `series<float>` for what
should be `series<bool>`. Don't relax the bool checks - they're correct.

## Type checker - false negatives

| count | files | category |
|---|---|---|
| 16 | 8 | `Cannot call "{funId}" with argument ...` (arg type mismatches on built-ins we miss) |
| 3 | 3 | `Cannot assign * to *` (TV catches assignment type errors we don't) |
| 2 | 2 | `Could not find {kind} '{fullName}'` |
| 2 | 1 | `Cannot use a collection in a type template of another collection` |
| 2 | 1 | `The condition of the "{blockName}" statement must evaluate to a "bool" value` |
| 2 | 1 | `Undeclared identifier "{identifier}"` |
| 2 | 2 | `Value with NA type cannot be assigned to a variable that was defined without type keyword` |
| 1 | 1 | `Incorrect field type "{id}" of enum "{enumName}"` |

The 16 missed argument-type-mismatches are particularly worth chasing - 
these are real runtime bugs in the user's code that we'd hide. Look first
at functions registered with `type: "unknown"` parameters (see
`hasOverloads()` in `builtins.ts`) - that bypass skips positional type
checking.

---

## Symbols - undefined-variable clusters

`Undefined variable '*'` (1086 hits in 38 files) and `Undefined variable '*'.
Did you mean '*'?` (1072 hits in 41 files) dominate the count, but most of
both come from a handful of files where the same name appears dozens of
times. The JSON groups occurrences per category - find the names that
repeat:

| ~count | name | example fixture |
|---|---|---|
| 64 | `fvg` | `4d78be7e3f7e6ab005629fa3e77f339e1107cfdf026d883dfca1e9c2797d9c5d.pine` |
| 60 | `exiu` | `e1a8cc990e645380ff1c4fa0718ab38012db5ac3df5221efd66e859acd8091ae.pine` |
| 55 | `stuff` | `4d78be7e3f7e6ab005629fa3e77f339e1107cfdf026d883dfca1e9c2797d9c5d.pine` |
| 55 | `this` | `6874e63621f8bc08b944708a25d8859bd487a769f8553ed75fea33ea49cd00a6.pine` |
| 54 | `dr` | `6293fd713714b37c8f108b12e64e92399f72036aac8ff8f9f2933ac09e042022.pine` |

Per-file root causes are almost always one of:

- library `import User/Lib/N as alias` not exposing members
- `var`/`varip`/type-annotated declarations not added to symbol table
- block scope leaking the wrong way
- recovery cascade swallowing the declaration so later references look unbound

Pick one file at a time, find where the name is "defined," fix one root
cause, watch many false positives evaporate.

The `Unexpected identifier '*' - did you mean '*'?` category (19 hits, 6
files) is the same shape applied to identifiers in syntactic positions.

---

## Checker - local-scope restrictions probably too strict

`Function '*' cannot be called from a local scope` fires 15 times across 5
files for `plot`, `plotshape`, `plotcandle`, `alertcondition`, `barcolor`,
`bgcolor`, `fill` (down from 31 after INV008; see #4). Some of these
(`alertcondition` in particular) may actually be callable from `if`/`for`
bodies in v6 - verify per-function with TV.

---

## Open questions worth answering before tackling individual fixes

- `lint-reports/real-failures.json` has 2 entries where TV returned
  unparseable output (`tvOk: false`). Worth checking whether TV truncates
  responses past some size - affects how trustable the comparison is for
  large fixtures.
- A few categories ("All exported functions args should be typified",
  "Exported variable should have const modifier and type") look like
  library-only constraints. Decide whether we want to implement those at all
  before counting them as bugs.

