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
- **#8 — true argument-type-mismatch FNs, now gated on #17's Phase 2
  blockers.** Per INV009, most of the "16 missed FNs" were column-shift
  artefacts; only 3 looked genuine (`nz(bool)`, `plot(title=non-const)`,
  `int(bool)`). Status after the #17 Phase 2 attempt (2026-05-28):
  - `int(bool)` — **confirmed catchable** once the checker validates
    union params (`int.x: series int/float`). Works in the reverted
    Phase 2 patch; ships when #17's blockers clear.
  - `nz(bool)` — **doubtful.** Corpus check shows `nz(<bool>)` is
    TV-silent (see #17 blocker 2). Reconcile against INV009's original
    repro before treating it as an FN at all.
  - `plot(title=non-const)` — **not a union problem.** `plot.title` is
    `const string` (no `/`); catching a `series string` arg needs
    *const-qualifier enforcement* (qualifier narrowing), which the
    checker strips globally today. Separate, broader change — leave open.
  Blocker status: (a) union data ✅ (overloadArgs dump + offline union,
  incl. universal params); (b) return-inference ✅ (#17 blocker #3,
  `flags.returnTypeParam`); (c) `nz`/bool reconciliation — **still open**,
  the last gate. Once (c) resolves, re-attempt the Phase 2 checker change
  (validate union params; drop the `functionIsPolymorphic` arg-skip) and
  triage with the regression loop.
- **#9 — type-inference where we infer non-bool but TV infers bool.**
  Umbrella task. Several big wins landed via INV005, INV010, INV011;
  remaining FPs need a fresh corpus diff and per-category dives. The
  current top non-cascade category likely needs a new pass.
- **#17 — pine-data scraper: emit union types for
  polymorphic-function params.** Root cause now found (was the
  "`simple color` for `nz.source`" mystery): `scrape.ts` navigates to
  the **bare** `#fun_<name>` anchor, but TV's reference renders each
  overload as an anchor element `<a href="#fun_<name>-<i>"
  class="js-reference">` and applies a `selected` class to the active
  one. The bare anchor resolves to **overload #0**, so the
  `.tv-pine-reference-item__arg-type` nodes the scraper reads reflect
  overload #0's *resolved* param types — not a union. For `nz`,
  overload #0 is `→ simple color`, hence `source`/`replacement` scrape
  as `simple color`. (The `series int/float` you see in a browser is
  just whichever overload was last clicked — overload #5, `series
  float` — *not* a consolidated-union node. There is no union node in
  the DOM; the union must be reconstructed by visiting every
  sub-anchor.)
  - **Blast radius** (offline audit, `dev-tools/audit-overload-scrape.js`
    over today's scrape): 118 multi-overload functions, **102** of them
    spanning >1 distinct return type — all with params frozen to overload
    #0, which is almost always the *narrowest* (`const`) qualifier. e.g.
    `math.abs.number` froze to `const int` (would reject
    `math.abs(close)`); `color.{b,g,r,t}.color` → `const color`;
    `int.x`/`float.x` → `const int/float`. They don't fire as FPs *today*
    only because of the `functionIsPolymorphic` bypass — the crutch this
    item removes.
  - **Two freeze shapes:** (1) `unknown` params (`array.from`,
    `math.max`/`min`) — already skipped by `hasOverloads()`; (2)
    concrete-but-too-narrow (`nz`, `math.abs`, `color.*`). The
    union-across-sub-anchors approach fixes both uniformly.
  - **STATUS — Phase 1 (scrape the unions) LANDED 2026-05-28.**
    `scrape.ts` now visits each `#fun_<name>-<i>` sub-anchor and unions
    per-param types (`unionParamType` + `unionOverloadParamTypes`),
    **gated to params present in *every* overload**. That gate is
    load-bearing: an earlier "union any collected param" version
    promoted heterogeneous-overload params (`box.new`'s `left`/`top`,
    `label.new`'s `x`/`y`, `input.int`'s `minval`/`maxval`/`step`) from
    `unknown` to concrete, which flipped `hasOverloads()` off and caused
    **628 cascade FPs** (positional validation against a merged
    signature). With the present-in-all gate, those stay `unknown` and
    stay bypassed. Result: accurate union params (`nz.source: series
    int/float/color`, `math.abs.number: series int/float`, `color.b:
    series color`, `ta.change.source: series int/float/bool`) **and −89
    pre-existing false positives** (qualifier widening fixed
    `str.replace`/`str.contains`/`str.tonumber` `const string`→`series
    string`, and `ta.change` now accepts bool). Regenerated pine-data
    committed; checker untouched this phase → regression-check 0 new
    errors. Full `--force` re-scrape was used (475 fns, 118 overloaded
    trigger the sub-anchor loop).
  - **STATUS — Scraper rework LANDED 2026-05-28 (resolves blocker #1).**
    The inline union (`unionParamType` in scrape.ts) was replaced by a
    **capture-then-union-offline** architecture: `scrape.ts`'s
    `collectOverloadArgs` now saves the complete per-overload arg dump as
    `overloadArgs` in the raw JSON, and `packages/pipeline/src/union-types.ts`
    computes per-param unions **at generate-time** (offline). The union rule
    is structural (no thresholds): (1) all clean primitive unions → widest
    qualifier + merged prims; (2) same collection kind → union element types
    (`array<int/float> ∪ array<int>` → `array<int/float>`); (3) all identical
    → keep; (4) differing/mixed (broad overload alongside narrow) → `unknown`.
    Consequences: type/union logic is now **iterable offline** — edit
    `union-types.ts` + `pnpm run generate`, no re-scrape (documented in
    CLAUDE.md; `generate` is byte-deterministic); and universal params resolve
    to `unknown` generically (8 found, see blocker #1). Regression: 0 new
    errors, −6 `matrix.mult` FPs (params were frozen to `matrix<int>`/
    `array<int>`, now `matrix<int/float>`/`unknown`). Behaviour-neutral for
    the current (Phase-2-reverted) checker.
  - **Phase 2 (let the checker validate the unions) was ATTEMPTED and
    REVERTED 2026-05-28** — three blockers; blocker #1 is now resolved
    (above), #2 and #3 remain:
    1. ~~**`unionParamType` silently discards broad/universal types.**~~
       **RESOLVED 2026-05-28** (see "Scraper rework" below). It used to
       bail on any overload type containing `<>` and fall back to the
       frozen overload-#0 value, leaving `na.x` at `simple int/float`
       (would flag **721** valid `na(<series>)` calls). Now the scraper
       captures the full per-overload dump and the offline union rule
       resolves broad/heterogeneous params to `unknown` (accept-anything)
       generically — `na.x` → `unknown`, and 7 other genuinely-varied
       params (`str.tostring.value`, `array.sort.id`,
       `matrix.{mult,sum,diff}.id2`, `matrix.sort.id`,
       `array.sort_indices.id`). No `na` hardcode.
    2. **Unions under-inclusive where TV's per-overload display
       understates.** `nz(<bool>)` is **TV-silent** (verified with
       `scripts/compare-tv.mjs`) — TV tolerates `nz` of a bool, but our
       union (`int/float/color`) excludes bool → 71 FPs. ⚠️ This
       *contradicts* INV009/#8's claim that `nz(bool)` is a genuine
       missed FN — reconcile before re-attempting (the FN was likely a
       specific construct, not all `nz(bool)`).
    3. ~~**Polymorphic return-inference breaks on union source params.**~~
       **RESOLVED 2026-05-28.** The real cause wasn't
       `getPolymorphicReturnType` mis-picking a union member — `nz`/`fixnan`
       are flagged and infer correctly. It was that **return-follows-source
       functions like `ta.valuewhen`/`ta.change`/`ta.median`/`ta.mode`/
       `ta.range` weren't flagged at all**, so their return fell back to the
       static return frozen to overload #0 (`series color` for `ta.valuewhen`),
       cascading `series<color>` into arithmetic/assignment/plot. Fix:
       `union-types.ts` `detectReturnTypeParam` finds these offline from the
       overload dump (return base-set == exactly one scalar param's union,
       no collection param), `generate` emits `flags.returnTypeParam`, and
       `getPolymorphicReturnType` resolves the return from that arg's actual
       type (unresolved `type`/`unknown` args fall back to the static return,
       avoiding `math.abs(<unresolved>) % 2`-style FPs). Result: **−890
       false positives** corpus-wide, 0 new errors; real color arithmetic
       still flagged. Regression fixture: `return-follows-source.pine`.
    - **Reverted checker changes (re-apply when blockers clear):**
      `mapToPineType` passes a clean primitive union (`^(const|input|
      simple|series) <prim>/<prim>…$`) through to
      `isAssignable`→`isUnionTypeMatch`; `checker.ts` drops
      `functionIsPolymorphic` from the arg-validation skip while keeping
      the `functionHasOverloads`/`unknown`-param skip. With these in
      place `int(true)` and `nz(close>open)` *were* caught — the
      mechanism works; the data/inference foundation isn't ready.
  - Still relevant: **two parallel encodings of polymorphism** — the
    *discovered* `pine-data/v6/function-behavior.json` (`returnTypeParam`
    for `input`/`nz`, arg-ordering quirks) and the *hand-coded*
    `polymorphic` map in `getFunctionFlags`. The JSON is regenerated only
    by `discover:behavior` — not the main `crawl→scrape→generate` flow —
    so it's stale (stamped 2026-05-24, 5 functions). Consolidating the
    two encodings is part of this fix.
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
    - **Local mirror (durable fix):** a one-time `scrape:mirror` step that
      snapshots the rendered page + JS/data assets under
      `pine-data/raw/v6/site-mirror/`, then points Puppeteer at `file://` / a
      local static server so re-scrapes are fully offline (zero TV calls). The
      overload selector is client-side (proven during the #17 work), so a mirror
      reproduces sub-anchor navigation faithfully. **Open question:** is the
      reference data a single fetchable JSON asset, or does it need a
      rendered-DOM snapshot? Resolve that before building. **Policy:** if a
      re-scrape is needed and the mirror doesn't exist yet, build the mirror
      *first*, then scrape against it. Now mostly needed only for
      DOM-*extraction* changes, since type derivation is already offline.

## Gotchas

See [gotchas/README.md](gotchas/README.md) for the format and full
index.

_None yet._

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

