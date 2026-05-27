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

- **#3 — pine-data scraper missing v6 built-ins.** ~45 FPs across
  `syminfo.target_price_*`, `chart.point`, `ta.accdist`,
  `session.islastbar`, `strategy.eventrades`, etc. Verified via
  `pine-lint --tv` that TV recognises these; pine-data was regenerated
  recently but they're still absent, so the gap is in the scraper.
  Fix lives in `packages/pipeline/`, not the generated files.
- **#4 — over-strict "cannot be called from a local scope" FPs.** Was
  31 across 6 files; INV008 cut it to 15. Most of the residual is in
  one file (`d40d7b52…pine`, 11 hits) whose trigger pattern resists
  minimal-repro extraction — `head -446` is clean, `head -447`
  (adding the wrap-continuation line of a `plotshape(…)` call) tips
  it. Needs more bisection. The other five files have one hit each
  and probably need their own minimal repros.
- **#8 — true argument-type-mismatch FNs gated on #17.** Per INV009,
  most of the "16 missed FNs" turned out to be column-shift
  artefacts; only 3 are genuinely missed (`nz(bool)`,
  `plot(title=non-const)`, `int(bool)`). Fixing them requires
  widening pine-data signatures before tightening the
  `validateFunctionArguments` polymorphic bypass — gated on #17.
- **#9 — type-inference where we infer non-bool but TV infers bool.**
  Umbrella task. Several big wins landed via INV005, INV010, INV011;
  remaining FPs need a fresh corpus diff and per-category dives. The
  current top non-cascade category likely needs a new pass.
- **#17 — pine-data scraper: emit union types for
  polymorphic-function params.** Right now polymorphic functions list
  one overload's parameter types ("`simple color`" for `nz.source`),
  forcing the checker to bypass type validation entirely via
  `functionIsPolymorphic`. Goal: union of types across overloads, so
  the checker can validate against the union and unblock the 3 FNs
  from #8.
- **#18 — built-in color constants infer as `undetermined type`.**
  Surfaced by INV011 — accounts for ~117 newly-visible "Ternary
  branches must have compatible types. Got 'color' and 'string'" FPs.
  The constants ARE in `CONSTANTS_BY_NAME` with `type: "color"`,
  but minimal repros mimicking the pattern lint cleanly. The
  `"undetermined type"` label in pine-lint's variable-list output
  comes from `astExtractor.ts`, a separate path from the validator's
  `inferExpressionType` — investigating may need to reconcile the
  two type-inference paths.
- **#20 — refine INV012 with a context-aware synchronize.** Current
  `synchronize()` skips to the next column-1 statement after a parse
  error. Correct in aggregate (−1270 cascade FPs across the corpus)
  but occasionally skips legitimate declarations between the error
  and the next true top-level statement, accounting for some of the
  "Undefined variable …" appearances that surfaced after INV012
  (sampling suggests *most* are real but not all). A
  parser-state-aware synchronize that tracked "in a function body /
  switch arm / if body" and skipped to the end of *that* context
  rather than all the way out would be more precise. Bigger change
  needing a context stack; defer until the simpler win is stable.

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
| 1697 | 44 | `Undefined variable '*'` *(many are recovery artifacts, see Symbols below)* |
| 1652 | 14 | `Unexpected token: \n` |
| 1292 | 48 | `Undefined variable '*'. Did you mean '*'?` *(also partly recovery)* |
| 145 | 12 | `Unexpected token: =>` |
| 56 | 4 | `Unexpected token: =` |
| 56 | 7 | `Expected variable name` |
| 48 | 7 | `Expected ")" after arguments` |
| 46 | 17 | `Expected iterator variable` |
| 41 | 11 | `Unexpected token: .` |
| 36 | 10 | `Unexpected token: )` |
| 34 | 11 | `Unexpected token: ,` |
| 24 | 6 | `Expected ")" after method parameters` |
| 18 | 4 | `Unexpected token: ]` |
| 15 | 5 | `Expected function name after 'export'` |
| 11 | 2 | `Expected type name` |
| 9 | 4 | `Expected ']'` |
| 7 | 5 | `Unexpected token: :=` |
| 5 | 4 | `Unexpected token: +` |
| 2 | 2 | `Unexpected token: :` |
| 1 | 1 | `Expected method name after 'method'` |
| 1 | 1 | `Unexpected token: ==` |

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

The single biggest cluster. These look like over-strict rules but per
task #9 the root cause is more likely our type inference producing
non-bool types where TV correctly produces bool.

| count | files | category |
|---|---|---|
| 238 | 57 | `Type mismatch: cannot apply '*' to * and *` |
| 199 | 28 | `Operator 'and' requires bool operands, but left operand is *` |
| 166 | 32 | `Ternary condition must be bool, got *` |
| 130 | 20 | `Operator 'and' requires bool operands, but right operand is *` |
| 127 | 6 | `Type mismatch for parameter '*': expected *, got *` |
| 98 | 45 | `Type mismatch for argument *: expected *, got *` |
| 90 | 27 | `Cannot assign * to *` |
| 59 | 17 | `Condition must be boolean, got *` |
| 38 | 7 | `Type mismatch: 'not' operator requires bool, got *` |
| 26 | 15 | `Operator 'or' requires bool operands, but left operand is *` |
| 13 | 12 | `Operator 'or' requires bool operands, but right operand is *` |

**Right approach**: pick a specific FP, trace through `inferExpressionType`
in `checker.ts` to see why we produce e.g. `series<float>` for what
should be `series<bool>`. Don't relax the bool checks — they're correct.

## Type checker — false negatives

| count | files | category |
|---|---|---|
| 24 | 8 | `Cannot call "{funId}" with argument ...` (arg type mismatches on built-ins we miss) |
| 3 | 3 | `Cannot assign * to *` (TV catches assignment type errors we don't) |
| 2 | 2 | `Could not find {kind} '{fullName}'` |
| 2 | 1 | `Cannot use a collection in a type template of another collection` |
| 2 | 1 | `The condition of the "{blockName}" statement must evaluate to a "bool" value` |
| 2 | 1 | `Undeclared identifier "{identifier}"` |
| 2 | 2 | `Value with NA type cannot be assigned to a variable that was defined without type keyword` |
| 1 | 1 | `Incorrect field type "{id}" of enum "{enumName}"` |

The 24 missed argument-type-mismatches are particularly worth chasing —
these are real runtime bugs in the user's code that we'd hide. Look first
at functions registered with `type: "unknown"` parameters (see
`hasOverloads()` in `builtins.ts`) — that bypass skips positional type
checking.

---

## Symbols — undefined-variable clusters

`Undefined variable '*'` (1697 hits in 44 files) and `Undefined variable '*'.
Did you mean '*'?` (1292 hits in 48 files) dominate the count, but most of
both come from a handful of files where the same name appears dozens of
times. The JSON groups occurrences per category — find the names that
repeat:

| ~count | name | example fixture |
|---|---|---|
| 95 | `Timezone` | `fffe6a2f18a42e0f83a5aa832b48019ad0f121627ca61cc0b5e63252f682433a.pine:131` |
| 66 | `entryOrderType` | `6293fd713714b37c8f108b12e64e92399f72036aac8ff8f9f2933ac09e042022.pine:499` |
| 64 | `fvg` | `4d78be7e3f7e6ab005629fa3e77f339e1107cfdf026d883dfca1e9c2797d9c5d.pine:919` |
| 60 | `exiu` | `e1a8cc990e645380ff1c4fa0718ab38012db5ac3df5221efd66e859acd8091ae.pine:108` |
| 56 | `numOfTakeProfitTargets` | `6293fd713714b37c8f108b12e64e92399f72036aac8ff8f9f2933ac09e042022.pine:698` |

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

## pine-data — scraper missing v6 built-ins

We reject access to built-ins that exist in v6. Pine-data was regenerated
2026-05-26 and these are still absent from `pine-data/v6/variables.json`
— verified via `pine-lint --tv` that TradingView accepts code referencing
them (`syminfo.target_price_average`, `ta.accdist`, `chart.point`, etc.).
So the scraper is missing them; fix belongs in the pipeline scripts, not
the generated files (which would be lost on next regen).

| count | files | category |
|---|---|---|
| 23 | 5 | `Unknown property '*' on namespace 'syminfo'` (`target_price_*`, `mincontract`, `volumetype`, `shares_outstanding_float/total`, `cftc_code`, `sector`, `target_price_estimates`) |
| 7 | 3 | `Unknown property '*' on namespace 'chart'` (e.g. `chart.point`) |
| 5 | 2 | `Unknown property '*' on namespace 'ta'` (e.g. `ta.accdist`) |
| 4 | 3 | `Unknown property '*' on namespace 'session'` (e.g. `session.islastbar`) |
| 2 | 2 | `Unknown property '*' on namespace 'strategy'` (e.g. `strategy.eventrades`, `strategy.max_contracts_held_all`) |
| 2 | 2 | `Unknown property '*' on namespace 'line'` (`line.all`) |
| 1 | 1 | `Unknown property '*' on namespace 'barmerge'` (`barmerge.lookhead_on`) |
| 1 | 1 | `Unknown property '*' on namespace 'box'` (`box.all`) |

JSON has every concrete property name. Cross-check current TradingView Pine
v6 reference, add to `pine-data/v6/*.ts`, regenerate.

Also stale: `log.info` / `log.error` arity (4 hits, 3 files) — they accept
more arguments in v6 than our signature allows.

```
2  Too many arguments for 'log.info'
2  Too many arguments for 'log.error'
```

## Checker — local-scope restrictions probably too strict

`Function '*' cannot be called from a local scope` fires 31 times across 6
files for `plot`, `plotshape`, `plotcandle`, `alertcondition`, `barcolor`,
`bgcolor`, `fill`. Some of these (`alertcondition` in particular) may
actually be callable from `if`/`for` bodies in v6 — verify per-function with
TV.

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

