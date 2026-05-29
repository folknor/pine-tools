# TODO

> **Read first**: [CLAUDE.md](CLAUDE.md) — Methodology. We aim to be MORE
> correct than TradingView's pine-lint. The "false positive" / "false
> negative" labels below are TV-diff heuristics, not verdicts. Treat
> them as navigation aids; investigate each before acting.

Discrepancies between our linter and TradingView's pine-lint over 748 v6
fixtures.

- **disagreements where we flag and TV doesn't** ("FP"-labelled) —
  some are genuine over-strictness in our linter, some are us
  correctly catching what TV missed (see INV001 for the canonical
  example).
- **disagreements where TV flags and we don't** ("FN"-labelled).

Current counts live in `lint-reports/failures-by-category.json` —
regenerate with `node scripts/find-real-failures.mjs` followed by
`node scripts/categorize-failures.mjs`. Past investigations are
indexed at [investigations/README.md](investigations/README.md)
and are not duplicated here — TODO.md is for *pending* work only.

## Pending follow-ups

Open work items, each either deferred from an investigation or queued
as a discrete next step. Sequential numbering matches the task-tool
IDs so the two stay in sync.

- **#3 — `chart.point` flagged "Unknown property 'point' on namespace
  'chart'" (checker bug, not data).** `chart.point` is a type with
  constructors (`chart.point.new`/`.now`); a bare `chart.point` reference
  trips the unknown-property check. This is type-as-namespace handling in
  the checker, not missing data. (`barmerge.lookhead_on`, also surfaced
  here, is a user typo TV flags too — not a bug.) The namespaced-variable
  catalog gap formerly tracked under this item is **resolved**: variables
  are now scraped from TV (crawl→scrape→generate), retiring the
  hand-maintained `namespaceVars` list; `scripts/diff-tv-inventory.mjs`
  re-runs the authoritative TOC diff.
- **#4 — over-strict "cannot be called from a local scope" FPs.** Was
  31 across 6 files; INV008 cut it to 15. Most of the residual is in
  one file (`d40d7b52…pine`, 11 hits) whose trigger pattern resists
  minimal-repro extraction — `head -446` is clean, `head -447`
  (adding the wrap-continuation line of a `plotshape(…)` call) tips
  it. Needs more bisection. The other five files have one hit each
  and probably need their own minimal repros.
- **#9 — type-inference where we infer non-bool but TV infers bool.**
  Umbrella task. Several big wins landed via INV005, INV010, INV011;
  remaining FPs need a fresh corpus diff and per-category dives. The
  current top non-cascade category likely needs a new pass.
- **#17 — union types for overloaded/polymorphic params (data work
  LANDED; only consolidation pending).** The scraper captures a complete
  per-overload `overloadArgs` dump and unions param types **offline at
  generate-time** (`packages/pipeline/src/union-types.ts`; structural
  rule: primitive union / collection-element union / identical / else
  `unknown`). Return-follows-source functions are detected from the dump
  and resolve their return from the actual argument
  (`flags.returnTypeParam`); universal params (`na`) and
  TV-under-documented accepted types (`nz`/`fixnan`/`int`/`plot`, see
  [G002](gotchas/G002-reference-underdocuments-accepted-types.md)) are
  handled. Net across the arc: accurate union/return types, **~979 false
  positives removed**, and type logic is now iterable offline (no
  re-scrape — see CLAUDE.md). Commits 52a7028 / 043f4f4 / c1ba9c3.
  - **Phase 2 (drop the polymorphic bypass to validate args) is
    ABANDONED.** It existed to catch the "3 arg-type FNs" from the old
    #8 — but all three (`nz(bool)`, `int(true)`, `plot(title=non-const)`)
    are **TV-accepted** (verified 2026-05-28). The bypass is *correct*;
    removing it would only add false positives. See the corrected INV009
    and [G002](gotchas/G002-reference-underdocuments-accepted-types.md).
    The TV-verified accepted-type widenings (`nz`/`fixnan` all primitives,
    `int`+bool, `plot.title` series string) are baked into pine-data via
    `FUNCTION_PARAM_TYPE_OVERRIDES` in `generate.ts`.
  - **Still pending — consolidate the two polymorphism encodings:** the
    *discovered* `pine-data/v6/function-behavior.json` (`returnTypeParam`,
    arg-ordering) vs the *hand-coded* `polymorphic` map + the new
    `flags.returnTypeParam` in `getFunctionFlags`/generate. The JSON is
    regenerated only by `discover:behavior` (stale — stamped 2026-05-24,
    5 functions). Unify so return-type behavior has a single source.
- **#18 — built-in color constants infer as `undetermined type`.**
  Surfaced by INV011. The "Ternary branches must have compatible types"
  cluster is now down to **31** (from ~117+) after the variable/constant
  scraping and display-flag fixes, but a residue of "Got 'color' and
  'string'" FPs remains. The constants ARE in `CONSTANTS_BY_NAME` with
  `type: "color"`, but minimal repros mimicking the pattern lint cleanly.
  The `"undetermined type"` label in pine-lint's variable-list output
  comes from `astExtractor.ts`, a separate path from the validator's
  `inferExpressionType` — investigating may need to reconcile the two
  type-inference paths.
- **#20 — refine INV012 with a context-aware synchronize.** Current
  `synchronize()` skips to the next column-1 statement after a parse
  error. Correct in aggregate (−1270 cascade FPs across the corpus)
  but occasionally skips legitimate declarations between the error
  and the next true top-level statement, accounting for some of the
  "Undefined variable …" appearances that surfaced after INV012.
  Sampling suggests *most* of those are real findings the cascade
  was hiding (e.g. comma-pair declarations our parser doesn't
  recognise), not sync over-skipping — so the upside here is smaller
  than it first looked. **Half-measure attempted** (looser sync that
  preferred next-NEWLINE over column-1 when followed by a plausible
  statement-start keyword) — produced 2244 *new* cascade FPs and was
  reverted. The real fix needs a parser-state stack tracking
  "currently inside function body / switch arm / if body / type
  body" and a sync that skips to the end of *that* context, not the
  next column-1. Bigger refactor; defer until someone has appetite
  for the stack-threading work.
- **#21 — retire/scrape the remaining hardcoded function metadata in
  `generate.ts`.** `MISSING_PARAMETERS` is **done** — removed (the
  re-scrape now carries `input.int`/`input.float`'s `minval`/`maxval`/`step`,
  the merge deduped, regression-check confirmed a no-op). The `variadic`
  map turned out **not** safe to delete: the scrape sets `variadic: true`
  for most of them, but its required-param count overcounts `minArgs` for
  `array.from` and `str.format` (both valid with 1 arg, scrape says 2), and
  `math.sum` isn't variadic at all — so the map's `minArgs` values are
  authoritative and stay. Still hand-coded and harder (TV doesn't expose
  these cleanly): `getFunctionFlags.topLevelOnly` (15 fns, "global scope
  only"), the `polymorphic` category map (~25 fns → see #17), and
  `isParameterOptional` + `commonOptionalParams` — prose-matching heuristics
  for argument optionality, the last cousin of the retired
  `inferVariableType` / `inferConstantType` guessers.
- **#22 — reduce scraper load on TradingView.** We should not hit TV's
  reference site more than necessary; prefer targeted re-scrapes / an offline
  mirror over repeated full `--force` runs. Note the footprint is smaller than
  it looks: `scrape.ts` loads the SPA **once** per run, then navigates
  client-side via `#fun_<name>` / `#fun_<name>-<i>` hash changes (not
  per-function HTTP requests), so a full run ≈ one page-load of TV's bundle.
  - ✅ **Type-logic iteration is already offline (2026-05-28, #17 rework).**
    The scrape captures the full per-overload `overloadArgs` dump and the union
    runs offline at generate-time (`union-types.ts`). So changing how param
    types are *derived* needs only `pnpm run generate` — no scrape. Documented
    in CLAUDE.md ("Re-running type logic WITHOUT scraping"). This covers the
    most common reason we were re-scraping.
  - Remaining ways to cut scraping further:
    - **Targeted re-scrape (quick win):** the per-function disk cache
      (`.cache/function-details/`, 24h TTL) already lets you delete only the
      entries you want refreshed and run plain `scrape` (no `--force`). Add an
      `--only <names>` / `--only-overloaded` flag so this doesn't require
      hand-deleting cache files.
    - ✅ **DOM-extraction iteration is now offline too (2026-05-29).** The
      **open question is resolved**: the overload arg widget is rendered
      *dynamically* per sub-anchor (`#fun_<name>-<i>`), so a flat page dump is
      insufficient — a per-overload rendered-DOM snapshot is required. `scrape`
      now captures that snapshot (`saveDomSnapshot` -> `.cache/dom/<name>/{base,
      overload-<i>}.html`, gitignored — a local build artifact, never committed
      so we don't republish TV's HTML). `pnpm run reextract:dom`
      (`reextract-overload-args.ts`) re-derives every `overloadArgs` from that
      mirror with no network, sharing the arg-type parser (`arg-parse.ts`) with
      the live scrape. So a DOM-*extraction* change is now: edit `arg-parse.ts`
      -> `reextract:dom` -> `generate` -> `regression-check`, zero TV calls.
      The mirror is built as a byproduct of any normal `scrape`, so no separate
      `scrape:mirror` step is needed.
    - **Targeted `--only` re-scrape** is still the one remaining quick win
      (delete-cache-and-rescrape works today; a flag would be nicer). With the
      mirror + offline reextract in place, full `--force` re-scrapes should now
      be rare — only when TV's DOM *structure* itself changes.
- **#23 — move all hardcoded data transmogrifications pre-JSON.** Any
  hardcoded correction, addition, or transformation of the scraped language
  data (type overrides, accepted-type widenings, flag maps, polymorphism /
  return-type derivation, optionality heuristics, deprecation lists, etc.)
  must run at **generate time and be baked into `pine-data/v6/*.json`** -
  never applied downstream in `packages/core` (the checker) or other
  consumers after the JSON is loaded. **Goal:** `pine-data/v6/*.json` is a
  complete, self-contained source of truth that external consumers (e.g. a
  Rust port) can use cleanly without replicating any TypeScript logic.
  Already pre-JSON and correct: `FUNCTION_PARAM_TYPE_OVERRIDES`,
  `getFunctionFlags` maps, `detectReturnTypeParam` -> `flags.returnTypeParam`,
  the offline union in `union-types.ts`. **Audit & relocate:** walk
  `packages/core` (esp. `builtins.ts`, `checker.ts`, `types.ts`) for any
  table or rule that *derives or corrects language data* after load (vs.
  merely mapping the JSON into the checker's internal representation, which
  is fine) and move the data-deriving part into the pipeline. See the
  "Architecture: Data vs Syntax" principle in CLAUDE.md and G002.
- **#24 — relax the polymorphic arg-validation bypass now that param types
  are accurate.** The variadic / nested-overload data work (#17, #22)
  resolved real param types for `math.max`/`min`/`avg`/`round` (no more
  `unknown` params), so `hasOverloads()` no longer bypasses them. But
  `validateFunctionArguments` (checker.ts ~933/954) ALSO skips arg type
  checking whenever `flags.polymorphic` is set — and these carry
  `polymorphic: "numeric"` for *return-type* inference. So the FN-catching
  benefit (e.g. `math.round(close, "x")` should error) is still masked.
  The `polymorphic` flag conflates two concerns: return-type-follows-input
  (keep) and "args untyped, don't validate" (no longer true). Gate the
  arg-validation skip on actually-unknown param types, not on the
  polymorphic flag. **Read INV009 first** (checker.ts:913 warns the bypass
  removed ~real FPs when pine-data listed only overload #0's types — that
  premise is now weaker, but verify per-function with `--tv` before
  tightening). Likely catches several of the "16 missed arg-type FNs".
- **#25 — make `pine-data/v6/*.json` complete for EXTERNAL consumers, not
  just our checker.** pine-data is a *published* dataset (the JSON is the
  vendor snapshot for downstream Rust/non-node consumers — see CLAUDE.md).
  Completeness must be judged by "is this a faithful, self-contained Pine
  API description for any consumer", **not** by "does our checker read this
  field". Today the generated JSON delivers *less* than the raw dump we
  already capture. Gaps found 2026-05-29 (counts vs the 475-function set):
  - **Overload structure is flattened away (headline).** 0 functions expose
    an `overloads` array, yet **118 functions are overloaded**. `syntax` and
    `returns` are frozen to overload #0, so e.g. `math.round`'s
    `(number, precision) → float` form is invisible. The raw
    `complete-v6-details.json` has every overload's signature
    (`overloads`) + per-overload typed args (`overloadArgs`); generate drops
    it for a single lossy merged signature. **Fix:** expose
    `overloads: [{ parameters: [{name, type, description}], returns }]` per
    function, built offline from the dump + mirror. Additive — keep the
    existing merged `parameters`/`syntax`/`returns` so current consumers
    (incl. our checker) don't break.
  - ✅ **Empty param descriptions recovered (2026-05-29).** Was 61/1292 flat
    params (and the per-overload params) with no description — lost in the
    merge for params appearing only in a later overload (`box.new.left/top/
    right/bottom`, `fill.plot1/plot2`, …). `arg-parse.ts` now captures the
    trailing description from each arg row, `overloadArgs` carries it, and
    `reextract:dom` re-derived it from the mirror (offline, tags stripped).
    Now 0/1292 flat and 0/784 overload params empty; backfilled into both the
    merged `parameters` and the per-overload `overloads[].parameters`.
  - ✅ **Default values parsed (2026-05-29).** Was 0/1292. `parse-default.ts`
    extracts the value after "the default (value) is" at generate-time —
    handling namespaced consts (`alert.freq_once_per_bar`), booleans/`na`,
    numbers, quoted literals (incl. embedded quotes like
    `"yyyy-MM-dd'T'HH:mm:ssZ"`), word-numbers (`zero`), empty-string phrasings
    (→ `""`), and "no color" (→ `na`). 285 flat params + 112 overload params
    now carry `default`. Dynamic/inherited defaults that have no literal value
    use a MAGIC SENTINEL (CHART_SYMBOL, CHART_BARS, SCRIPT_FORMAT,
    SCRIPT_PRECISION, SOURCE_LENGTH, or `ARG:<sibling>`) — distinguished by
    that set/prefix, not casing (some literals are uppercase, e.g. "FIFO").
    Only `ta.vwap.anchor` is left undefined (its expr prose is too awkward to
    reconstruct). Best-effort, not authoritative (the "X by default" phrasing
    is skipped: ambiguous). Sentinel set documented in schema/types.ts.
  - ✅ **Allowed values & numeric ranges parsed (2026-05-29).**
    `parse-constraints.ts` reads "Possible values are: …" prose at
    generate-time. 116 params now expose `allowedValues: string[]` (namespaced
    constants like `alert.freq_all`/`display.none`, or quoted-string enums like
    `"TTM"`/`'open'`) and 11 expose an inclusive `{min, max}` numeric range
    (`color.rgb.*` 0-255, `strategy.max_*_count` 1-500). A param is an enum XOR
    a range (enforced in generate + a contract test); free-prose value
    descriptions ("a string representing a valid currency code") are skipped.
    Both surfaced on the merged `parameters` and per-overload `overloads[]`.
  - **Polymorphic `returns` frozen/wrong** (subset of the overload gap):
    `nz → "simple color"`, `fixnan → "series color"`, `math.max →
    "const int"`. Exposing per-overload returns (above) covers this; a
    unioned top-level `returns` (`nz → series int/float/color`) is an
    optional extra.
  - ✅ **Built-in types catalog generated (2026-05-29).** TV's reference has
    its own "Types" section (`type_<name>` anchors); the crawl already
    discovered 20. `scrape` now scrapes each type page (description, examples,
    and a Fields list where present), mirrors the DOM, and `generate` emits
    `types.json` + `types.ts` (`PineBuiltinType`): `name`/`namespace`/`kind`
    (primitive · qualifier · container · object) + description/examples, plus
    `fields` for the one non-opaque object type that has them — `chart.point`
    (index/time/price). The opaque ID types (line/label/box/table/footprint/…)
    have no fields (manipulated via their `.*()` functions), confirmed from the
    pages. No built-in enums in v6 (enums are user-defined).
  **Remaining reference sections (the dataset still omits 2 of 7):**
  - **Operators** — the reference documents an Operators section and the crawl
    captured 33 items, but the list is CORRUPT (`=-`, `><`, `=|:=`, `://` are
    mis-parsed artifacts). Operators are grammar fundamentals the parser
    hardcodes (CLAUDE.md Data-vs-Syntax), so probably do NOT emit them as data;
    at most clean up the buggy crawl extraction separately. Low priority.
  - ✅ **Annotations catalog generated (2026-05-29).** The crawl now classifies
    `#an_` TOC links (10 found: `@version=`, `@param`, `@function`, `@returns`,
    `@type`, `@field`, `@enum`, `@variable`, `@description`,
    `@strategy_alert_message`), `scrape` fetches each `an_<name>` page
    (description + examples; mirrored), and `generate` emits `annotations.json`
    + `annotations.ts` (`PineAnnotation`). The crawl also reports
    `metadata.unclassifiedPrefixes` as a one-run safety net for finding new
    section anchors (confirmed only `kw`/`op` remain, both handled elsewhere).
  **Principle:** additive, non-breaking schema changes; derived offline (dump +
  `.cache/dom` mirror via `reextract:dom`) and baked into the JSON at
  generate-time (#23). New reference *sections* (types, and a future
  annotations) need one targeted scrape to capture their pages; type/param
  *derivation* from already-captured data stays offline.
  **⚠ Workflow gotcha:** a re-`scrape` rebuilds `complete-v6-details.json` from
  the per-function cache (`.cache/function-details/`), which is written by the
  scrape's *own* extraction — it does NOT carry `reextract:dom`'s offline
  re-derivation. So **always run `pnpm run reextract:dom` after any `scrape`**
  to restore the variadic `overloadArgs` + per-overload descriptions, else they
  revert to the cache's (pre-fix) state. (Caught when the type scrape clobbered
  `math.max`'s unioned args back to empty.)

## Gotchas

See [gotchas/README.md](gotchas/README.md) for the format and full
index.

- [G001](gotchas/G001-tv-pine-lint-not-spec.md) — TV's pine-lint is an
  unreliable comparator, not a stable spec.
- [G002](gotchas/G002-reference-underdocuments-accepted-types.md) — TV's
  reference under-documents accepted param types; the linter accepts more
  (e.g. `nz`/`fixnan` take bool/string; `int` takes bool). Verify with
  `--tv`, not just the overload list.

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
| `scripts/snapshot-local-lint.mjs` | Runs `pine-lint` (local) on every fixture and writes `lint-reports/local-baseline.json` — sorted per-file error lists. The regression contract. Re-run after every intentional change. |
| `scripts/regression-check.mjs` | Reruns local lint over the corpus and diffs against the baseline. **No network.** Annotates disappeared errors against `real-failures.json` to distinguish "fixed a known FP" from "stopped catching a real error". Exits non-zero on any new error appearance. |
| `scripts/audit-fixtures.mjs` | Scans every `.pine` fixture under `packages/core/test/fixtures/` without running vitest. Flags fixtures with malformed `@expects` directives and fixtures whose only assertion is a total `errors: N` count (no per-error coverage), printing suggested `// @expects error: line=N, message="..."` directives ready to paste. Exits non-zero on malformed directives. Wrapper: `pnpm run audit:fixtures` (also rebuilds the compiled helpers it imports). |

Repro for any fixture:

```bash
node scripts/compare-tv.mjs fixtures/<hash>.pine
```

---

## Regression check — the local-only loop (paramount before any parser/lexer/type work)

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

---

## Parser — error recovery cascades

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
— TV reports 1 error at L61 (invalid `series float` qualifier in function
parameter); we report 525, all cascade.

## Parser — syntax we silently accept (false negatives)

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

## Type checker — over-strict bool / arg / assign rules

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
should be `series<bool>`. Don't relax the bool checks — they're correct.

## Type checker — false negatives

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

The 16 missed argument-type-mismatches are particularly worth chasing —
these are real runtime bugs in the user's code that we'd hide. Look first
at functions registered with `type: "unknown"` parameters (see
`hasOverloads()` in `builtins.ts`) — that bypass skips positional type
checking.

---

## Symbols — undefined-variable clusters

`Undefined variable '*'` (1086 hits in 38 files) and `Undefined variable '*'.
Did you mean '*'?` (1072 hits in 41 files) dominate the count, but most of
both come from a handful of files where the same name appears dozens of
times. The JSON groups occurrences per category — find the names that
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

## Checker — local-scope restrictions probably too strict

`Function '*' cannot be called from a local scope` fires 15 times across 5
files for `plot`, `plotshape`, `plotcandle`, `alertcondition`, `barcolor`,
`bgcolor`, `fill` (down from 31 after INV008; see #4). Some of these
(`alertcondition` in particular) may actually be callable from `if`/`for`
bodies in v6 — verify per-function with TV.

---

## Open questions worth answering before tackling individual fixes

- `lint-reports/real-failures.json` has 2 entries where TV returned
  unparseable output (`tvOk: false`). Worth checking whether TV truncates
  responses past some size — affects how trustable the comparison is for
  large fixtures.
- A few categories ("All exported functions args should be typified",
  "Exported variable should have const modifier and type") look like
  library-only constraints. Decide whether we want to implement those at all
  before counting them as bugs.

