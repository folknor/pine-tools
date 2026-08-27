# pine-tools

**This project uses pnpm.** Do not use npm or yarn.

```bash
pnpm install          # Install dependencies
pnpm run <script>     # Run scripts
pnpm test             # Run tests
pnpm check            # Formatter + linter + assist (biome). Alias: pnpm lint
```

---

## Rules

### General rules

- Don't use gremlins! Em-dash, en-dash, strange quotes, whatever - they're
  all verboten.
- No emojis in docs (notes, gotchas, READMEs, TODO, commit messages, etc.).
  Plain text only - use a word like "WARNING"/"NOTE" instead of a symbol.
- Don't remind the user of the rules. They wrote them, so they know them.
- The user can exempt you from any rule at any time.
- Prefer structural or semantic criteria over arbitrary numeric thresholds
  in heuristics. Magic numbers (`> 10x`, `count > N`, `> N lines`) are
  brittle and hide the real criterion. If a number only surfaces candidates
  to look at, say so and treat it as exploratory, not a rule.
- Once a plan is agreed, execute it end-to-end without pausing for per-step
  go-aheads. Surface genuine new decision points (an unexpected regression,
  a fork the plan didn't cover), but don't re-confirm already-agreed steps.
  (Commits stay the exception - see git commit rules.)

### Doc scope (where things go)

- `notes/todo.md` is **pending work only** - things someone could pick up.
  Resolved/reverted items, past investigations, and indexes of completed
  work do NOT belong; those live in git log, `investigations/`, and
  `gotchas/`. Link to the canonical home instead of copying. (It lived at
  `TODO.md` in the repository root until 2026-08-25; older investigation
  notes refer to it by that name.)
- `investigations/INV###` is **only** for lint/parser/lexer disagreements
  that come with a minimal `.pine` repro. Pipeline/data/scraper/architecture
  work goes in `notes/todo.md`; unfixable TV or Pine-language quirks go in
  `gotchas/`.

---

## Methodology - we aim to be MORE correct than TradingView's pine-lint

TradingView's `pine-lint` is a reference, not the spec. It has real bugs:
it stops at the first error, blames whitespace for a missing `)`
elsewhere in the file, silently accepts nonsense expressions, and its
results sometimes change run-to-run for no apparent reason. **Matching
it is not the goal.** Our linter should catch what TV catches *and*
what TV misses.

### Hard rules

- **TV silence is evidence, not authority.** When TV is silent and we
  flag an expression, that is a disagreement - it might be us being
  wrong, or it might be us correctly catching something TV missed.
  Investigate the expression itself before deciding.
- **Never relax a check just because TV is silent.** If the existing
  checker is stricter than TV, treat the comment / commit that
  introduced it as a signal that someone already weighed this trade-off.
- **Disagreements are claims, not bugs.** The "false positive" /
  "false negative" labels in `lint-reports/real-failures.json` are
  position-based heuristics. Treat them as "things to look at," not
  "things to fix."

### Per-disagreement workflow

For every concrete TV-vs-us discrepancy we choose to act on:

1. **Reproduce** with a minimal `.pine` fixture in
   `packages/core/test/fixtures/regression/`. The discovery test runner
   picks it up automatically - a repro that doesn't fail-on-regression
   is just a paragraph with code in it. Prefer the
   `// @expects error: line=N, message="..."` directive form; the
   count forms `// @expects errors: N` / `warnings: N` are also
   supported. Use `// @expects ast: body.0.type = "IfStatement"`
   for targeted AST-shape locks when diagnostics alone could pass with the
   wrong parse shape. AST directives support dot paths with numeric array
   indexes, `=`, `~= /regex/`, and `exists`. Warnings assert the
   SemanticAnalyzer channel (same as the CLI); validator warnings are stripped.

   **`line=N` counts the fixture WITHOUT its `// @` directive lines.** The
   harness consumes every leading `// @...` line and validates what remains,
   so a fixture with seven directive lines reports an error the CLI puts at
   line 14 as line 7. Ordinary `//` comments and blank lines are KEPT and do
   count. Easiest not to compute it: run `pine-lint -H <fixture>`, then
   subtract the directive-line count from each line it reports. A wrong `N`
   fails as `Expected error not found` while the `errors: N` count still
   passes, which reads like a message-match failure and is not one.

   **A `parse: fail` fixture cannot assert anything about validation.** The
   harness runs the validator only when there are zero parse errors, so on
   such a fixture `// @expects errors: N` is vacuous - it can never go red,
   whatever N is. The CLI does NOT behave this way: it validates regardless
   and will happily emit an undefined-variable cascade behind a parse error.
   So a fix whose point is suppressing that cascade cannot be pinned by a
   fixture at all; pin the parse errors there and carry the validation half
   in a probe with the expected `pine-lint -H` output written down.
2. **Open an investigation** under `investigations/INV###-name/` with
   `notes.md` and the repro file (or a pointer to the regression
   fixture). Sequential numbering, never reuse. Index entries live in
   `investigations/README.md` and are surfaced in `notes/todo.md`.

   **Every finding validated with `pine-lint --tv` MUST record, in the
   investigation, both:**
   - **the exact `.pine` script(s)** sent to `--tv` (the reproducible
     probe, not a paraphrase), and
   - **TV's results** for them (the verdict / raw output), dated.

   A prose conclusion ("TV accepts/rejects X") without the probe + output
   is not acceptable. A `--tv` verdict is a point-in-time measurement, not
   a permanent fact (TV is an unreliable comparator - G001), so it must be
   re-runnable by anyone; a later contradiction is grounds to re-measure,
   not to assume the earlier author erred.

   **Confirm TV actually answered.** An empty error list is NOT proof of
   acceptance - a crashed/timed-out `--tv` call can look identical to "TV
   reported no errors." Record `success:true` / real TV output, and when a
   result claims "TV accepts," sanity-check that `--tv` *disagrees* with our
   local validator somewhere (proving it reached TV, not a fallback/empty
   result). This exact ambiguity manufactured the false gotcha G002.
3. **Annotate code decisions inline** with a `// see INV###` or
   `// see G###` pointer. Don't wax lyrical in the code - the long
   reasoning lives in the markdown.
4. **Record side-knowledge as gotchas.** A gotcha is something *we
   can't fix* that we need to remember when working - Pine language
   quirks, TV linter behaviors, scraping anomalies in upstream docs.
   It is *not* a known bug in our own code (those go in `notes/todo.md` as
   work items). Examples: "TV's parser flakes on multiline strings",
   "Pine v6 deprecates multiline string literals but still parses
   them". Add `gotchas/G###.md` with as much context as possible.
   Index in `gotchas/README.md`, surfaced in `notes/todo.md`. The same `--tv`
   rule as step 2 applies: any gotcha recording TV behavior must carry the
   exact probe `.pine` script(s) and TV's dated results.

### Indexes

`notes/todo.md` carries two summary indexes (`gotchas/` and `investigations/`)
so a reader can scan the entire trail of decisions from one place.

---

## Architecture: Data vs Syntax

**Hardcoded in parser** (grammar fundamentals):
- Keywords: `if`, `else`, `for`, `while`, `var`, `varip`, `return`, `import`, `export`, `method`
- Operators: `+`, `-`, `*`, `/`, `and`, `or`, `not`, `?:`
- Type keywords: `int`, `float`, `bool`, `string`, `color`, `array`, `matrix`, `map`

**Generated from pine-data/** (API data):
- Function signatures, parameters, return types
- Built-in variables (`close`, `high`, `volume`)
- Constants (`color.red`, `shape.circle`)
- Syntax highlighting patterns

Variable and constant **types** (incl. qualifier) are scraped from each
reference page's "Type" field - never guess them by namespace. The old
`inferVariableType` / `inferConstantType` heuristics were retired for
exactly that reason; don't reintroduce that pattern.

When TV's *linter* accepts more than its *reference* documents (the reference
under-documents accepted types - see `gotchas/G002`), or any language fact
can't be scraped, verify it with `pine-lint --tv` (record the date) and bake
it into the **pipeline** (`generate.ts` overrides / `union-types.ts`) so it
lands in `pine-data/v6/*.json`. The checker reads types/flags from the data;
it must not embed its own table of language facts. The generated JSON is the
self-contained source of truth - see TODO #23.

---

## Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm run build            # Build extension
pnpm test                 # Run tests
pnpm check                # biome formatter + linter + assist (alias: pnpm lint).
                          # Use this, never a bare `npx biome`.

# Data Pipeline (packages/pipeline/src/)
pnpm run crawl            # Crawl TradingView docs (TOC inventory)
pnpm run scrape           # Scrape details + build .cache/dom mirror
pnpm run reextract:dom    # Re-derive overloadArgs from the mirror (offline; run after scrape)
pnpm run reextract:sections # Re-derive returnsDescription/remarks/seeAlso from the mirror (offline; run after scrape)
pnpm run generate         # Generate pine-data/v6/*.{ts,json}
pnpm run fetch:library -- User/Lib/Major  # Download a published library's source into vendor/ (network: TV pine-facade; public open_no_auth libs only)
pnpm run generate:libraries # Generate pine-data/v6/libraries.{ts,json} from vendor/**.pine (offline; needs a prior `build`)
pnpm run generate:syntax  # Generate syntaxes/pine.tmLanguage.json

# Manual (the prose guide, separate from the reference above)
pnpm run scrape:manual    # Fetch the Pine Script Manual -> .cache/manual/v6 HTML mirror (network)
pnpm run generate:manual  # Convert the mirror -> pine-manual/v6/**.md + README.md (offline)

# CLI
pnpm run install:cli                          # build bundle + install to ~/.local/bin/pine-lint
pine-lint <file.pine>                         # run the installed CLI (re-run install:cli after src changes)
node dist/packages/cli/src/cli.js <file.pine> # or run the bundle directly without installing

# Dev Tools
pnpm run test:snippet -- 'code'              # Test Pine snippet via CLI
pnpm run test:snippet -- --errors 'code'     # Show only errors
pnpm run test:snippet -- --filter text 'code'  # Filter errors

pnpm run debug:internals -- lookup hour      # Check symbol in pine-data
pnpm run debug:internals -- parse 'x = 1'    # Show AST
pnpm run debug:internals -- trace <file> --line <N> [--context <N>] [--verbose] # Trace parser state/block context around a line
pnpm run debug:internals -- validate 'code'  # Full validation details
pnpm run debug:internals -- tokens 'code'    # Show lexer tokens with line/indent
pnpm run debug:internals -- symbols hour     # List matching symbols
pnpm run debug:internals -- analyze --summary          # Discrepancy summary
pnpm run debug:internals -- analyze --cli-errors       # CLI error summary
pnpm run debug:internals -- analyze --filter "token"   # Filter by message
pnpm run debug:internals -- corpus --summary           # v6 parse error stats
pnpm run debug:internals -- corpus --errors            # Files with parse errors
pnpm run debug:compare -- fixtures/<hash>.pine         # Compare local vs TV for one file
pnpm run debug:repro -- fixtures/<hash>.pine --line <N> # Minimize a diagnostic repro

# Convenience aliases
pnpm run debug:tokens 'code'                 # Shortcut for tokens command
pnpm run debug:corpus --summary              # Shortcut for corpus analysis
pnpm run debug:diff -- --count 10            # Differential test vs TradingView
pnpm run debug:diff -- --count 5 --verbose   # Show generated scripts
pnpm run debug:compare -- fixtures/<hash>.pine
pnpm run debug:repro -- <file.pine> --line <N> --source parser --no-candidate

# Lint report loop
pnpm run lint:snapshot                        # Save local fixture baseline
pnpm run lint:regression                      # Compare local lint to baseline
pnpm run lint:failures                        # Refresh TV-vs-local inventory
pnpm run lint:categorize                      # Group refreshed inventory
```

**Use the dev tools above instead of complex shell commands.** These tools are pre-approved and avoid permission prompts:

| Instead of... | Use this |
|---------------|----------|
| `cat > /tmp/test.js << 'EOF' ... EOF && node /tmp/test.js` | `pnpm run debug:internals -- validate 'code'` |
| `echo 'code' > /tmp/test.pine && node dist/.../cli.js /tmp/test.pine` | `pnpm run test:snippet -- 'code'` |
| `for f in ...; do jq ...; done` on lint reports | `pnpm run debug:internals -- analyze --filter "..."` |
| Grepping for function definitions in pine-data | `pnpm run debug:internals -- lookup <name>` |
| Creating temp files to test Parser/Validator | `pnpm run debug:internals -- parse 'code'` or `validate 'code'` |
| Manually slicing large parser repros | `pnpm run debug:repro -- <file.pine> --line <N> --source parser` |
| One-file local-vs-TV comparisons | `pnpm run debug:compare -- <file.pine>` |
| Debugging lexer tokens and indentation | `pnpm run debug:tokens 'code'` |
| Scanning pinescripts for v6 parse errors | `pnpm run debug:corpus --summary` or `--errors` |
| `for f in ...; do pine-lint $f; done` loops | `node scripts/lint-batch.mjs <files\|dirs\|globs>` (also `--diff` for per-file TV diffs) |

The dev tools handle temp files, JSON parsing, and output formatting automatically.

---

## Pine reference oracle (`po`)

`po` (Pine v6 oracle CLI, installed on PATH) is the local source of truth for
*what a Pine identifier is and how the language behaves* - the reference you
consult while implementing builtins and reading corpus scripts. It is backed by
a baked `pine-data` snapshot (run `po version` for the snapshot date and
catalog counts: ~475 functions, 161 variables, 237 constants, 28 keywords,
20 types, 10 annotations, 21 operators, plus the 76-page / 1140-section
indexed manual). Output is always text.

- `po lookup <NAME>` - structured entry for one identifier: signature,
  per-argument prose (name / type / required), return type + description,
  remarks, runnable example(s), and see-also. This is the data `nordquant`'s
  `list_indicators`/`get_indicator_info` re-served less richly, which is why
  those CLI verbs were cut (see `docs/roadmap.md` M8). `--list` switches to
  catalog mode; narrow with
  `--kind <function|variable|constant|keyword|type|annotation|operator>`
  (`--kind '?'` prints the kinds with counts) and/or `--grep <text>` (matches
  name, namespace, or detail).
- `po search <QUERY>` - full-text search over the Pine User Manual prose for
  conceptual "how does X work" questions (e.g. repaint, lookahead, session
  semantics). Accepts a query, a `page#anchor` section ref, or a page path;
  `--limit <N>` caps the hits (default 8). Returns a compact list of matching
  sections (one `<hash>  page / heading / subheading` line each), not the
  prose. Print a section with `po show <hash>...` (space-separated hashes for
  several at once).

---

**Library Import Resolution Usage:**
```pine
/// @source ./libs/my-library.pine
import User/MyLibrary/1 as myLib

x = myLib.myFunction(close)  // IntelliSense works!
```

---

## Data Pipeline

All API data is scraped from TradingView docs and generated:

| Command | Output |
|---------|--------|
| `crawl` | `pine-data/raw/v6/v6-language-constructs.json` (TOC inventory of every reference section) |
| `scrape` | `pine-data/raw/v6/complete-v6-details.json` (+ DOM mirror under `.cache/dom/`) |
| `reextract:dom` | re-derives `overloadArgs` from the mirror, **offline** - run after every `scrape` (see below) |
| `reextract:sections` | re-derives `returnsDescription`/`remarks`/`seeAlso` from the mirror, **offline** - run after every `scrape` (see below) |
| `generate` | `pine-data/v6/*.ts` + `*.json` (vendor-friendly snapshot for downstream Rust/non-node consumers) |
| `generate:libraries` | `pine-data/v6/libraries.{ts,json}` - the `export` surface of each vendored Pine library under `vendor/<Author>/<Lib>/<Version>.pine`, keyed by `Author/Lib/Version`. The checker validates imported-library member calls against this (CE10271 on unknown exports). Offline, parses with the COMPILED core parser so it needs a prior `build`. SKIPS libraries that don't parse cleanly (incomplete export set -> would cause FPs; left lenient). Re-run after vendoring/updating a library...
| `fetch:library` | Downloads a published library's source from TV pine-facade into `vendor/<Author>/<Lib>/<Major>.pine` (the only network step in this feature; public `open_no_auth` libs only). `--from <file>` reads a newline-separated ref list. Port of piners' `pine_facade.rs`. See INV067. |
| `generate:syntax` | `syntaxes/pine.tmLanguage.json` |
| `scrape:manual` | `pine-data/raw/v6/manual-pages.json` (page inventory) + `.cache/manual/v6/*.html` mirror |
| `generate:manual` | `pine-manual/v6/**.md` (per-page tree mirroring the Manual's URLs) + `README.md` index |

### Manual (prose guide) vs Reference (API data)

The commands above the `scrape:manual` row build the **reference** (`pine-data`):
structured API facts the linter consumes. `scrape:manual`/`generate:manual` are a
**separate, parallel pipeline** for the prose **Manual**
(`https://www.tradingview.com/pine-script-docs/`). It is documentation output
only - Markdown for humans/RAG, **not** consumed by the checker, and it touches
nothing in `pine-data` or the reference flow.

It mirrors the reference pipeline's split: `scrape:manual` is the only network
step (the Manual is a static Astro site - plain `fetch`, no Puppeteer; it reads
the full page list from any page's sidebar), and `generate:manual` is offline and
deterministic, so the converter (`manual-to-markdown.ts`, Turndown + GFM + a few
custom rules for `div.pine-colorizer` / `div.expressive-code` / heading anchors)
can be re-run freely against the cache. Refresh from TV only with
`pnpm run scrape:manual --force`.

`generate` emits one catalog per reference section: `functions`, `variables`,
`constants`, `types`, `annotations`, `operators`, `keywords` (`.ts` + `.json`
each). The `functions` entries carry an `overloads[]` array (exact per-overload
param types + returns) alongside the merged view, and params carry `default`
(literal or a magic sentinel like `CHART_SYMBOL`/`ARG:<name>`), `allowedValues`,
and `min`/`max`. `types` includes `chart.point`'s fields; the opaque ID types
have none.

A parameter's `min`/`max` come from two sources and the `rangeSource` field says
which, because the two mean different things: `"reference"` is the range the
docs state, which TV compiles AND RUNS outside of, while `"runtime"` is a domain
TV documents nowhere and enforces by killing the script on bar 0. The runtime
ones (plus `notNa`) are merged in at generate-time from
`pine-data/raw/v6/runtime-domains.json`, which transcribes captured chart
banners - the only oracle they can have, since RE-class errors reach neither
pine-lint mode (G010). **Never add a row there by analogy**: a domain without
its own banner is a guess, and G002 is what guesses cost. See INV164.

INTER-parameter requirements, which the per-param fields above cannot express,
live in `flags.argGroups = { message, anyOf: string[][] }` - the call must
supply at least one `anyOf` combination, each combination being names that must
ALL be present. Probe-backed, since the reference documents no such constraint
(`strategy.exit`'s "at least one of profit/limit/loss/stop, or the pair
trail_offset + trail_price / trail_points" is the only populated entry - see
INV142). Presence is SYNTACTIC, matching TV: an explicitly-passed `na` counts.
The message is TV's own, so the checker carries no wording of its own.

Every reference item also carries the prose sub-sections the structured fields
otherwise drop, for downstream/external consumers: `returnsDescription` (the
Returns *sentence*, distinct from the typed `returns`), `remarks` (free-text
caveats - na-handling, every-bar-calling, side effects), and `seeAlso` (bare
cross-ref symbol names). These are re-derived offline by `reextract:sections`
from the `.cache/dom` mirror; **our own checker does not read them** - they are
reference data only.

**Operators are emitted as reference data** (`operators.{ts,json}` -
description/syntax/examples + the prose sub-sections), for external consumers of
pine-data. This does NOT change the Data-vs-Syntax split: operators are still
grammar the parser hardcodes and the checker does not consume the catalog. The
crawl records the symbol set from `#op_` TOC links; the operator detail pages
are scraped via `op_<symbol>` anchors and mirrored under `op__<hex-slug>` (the
slug avoids the `?:`/`+=`/`==` filename collisions a naive safe-name produces).

**Regenerating is safe** - customizations are in the scripts, not output files.
(One exception is now handled rather than merely known: `generate` rewrites
`pine-data/v6/index.ts`, whose template used to omit `export * from
"./libraries"` - so every `generate` silently dropped `LIBRARY_EXPORTS_BY_PATH`
from the barrel, and `generate:libraries` did not put it back. The template now
emits that export when `libraries.ts` exists. See INV142.)

**WARNING: Always run `pnpm run reextract:dom` AND `pnpm run reextract:sections`
after any `scrape`.** A `scrape` rebuilds `complete-v6-details.json` from the
per-function cache (`.cache/function-details/`), which holds the scrape's *own*
extraction - NOT the offline re-derivation. Skipping `reextract:dom` reverts the
variadic `overloadArgs` (e.g. `math.max` → empty) and per-overload descriptions
to the cache's pre-fix state; skipping `reextract:sections` drops every
catalog's `returnsDescription`/`remarks`/`seeAlso`. The standard refresh is:
`crawl` → `scrape` → `reextract:dom` → `reextract:sections` → `generate` →
`install:cli` → `regression-check`.

Note: `scrape` now also DOM-mirrors variables and constants (under
`var__<name>`/`const__<name>`) and operators (`op__<hex-slug>`), not just
functions/types/annotations - so `reextract:sections` can re-derive their prose
offline. The first scrape after this change re-fetches the un-mirrored members
(a valid details cache with a missing mirror triggers a re-scrape of that item).

**Param requiredness is probe data, not scrape data.** The scrape's per-param
`optional`/`required` flags are polarity-broken (optional unless the prose says
"required argument") and `generate.ts` ignores them; `required` in
`functions.json` comes from `pine-data/raw/v6/required-params-probe.json` - a
per-function `pine-lint --tv` sweep (zero-arg call -> TV enumerates every
required param as CE10165). See INV050. The file survives scrapes (it lives in
`raw/` but is generated by `scripts/probe-required-params.mjs`, not the
scraper); re-run the sweep only when the catalog gains functions (`--retry`
re-probes just unsettled/new entries) - functions absent from it fall back to
prose evidence at generate-time.

**A union parameter's expected-type NOUN is probe data too.** The string TV
quotes in CE10123 ("...but a `series float` is expected") for a parameter typed
`series int/float` is not derivable from that union: the same doc type draws
five different answers across the catalog, `int/string` splits evenly between
`int` and `string`, and `math.*` alone draws six answers - nothing distinguishes
`math.abs` from `math.ceil` from `math.max`. It is measured per
function+parameter into `pine-data/raw/v6/union-type-nouns-probe.json` by
`scripts/probe-union-type-nouns.mjs` (one call per parameter carrying exactly
one deliberately-wrong argument) and merged into each parameter's
`expectedTypeNoun` at generate-time. Same lifecycle as the requiredness probe:
it lives in `raw/` but no scrape produces it, and `--retry` re-probes only
unsettled entries. A parameter with no measured noun keeps the checker's
fallback - **do not extrapolate a neighbour's answer onto it**, and do not
"simplify" the seven parameters whose measured noun happens to equal the old
`simple <first member>` fabrication; they agree by coincidence. See INV171.

### Re-running type logic WITHOUT scraping

**Be sparing with `scrape` - it hits TradingView's site.** Most type work does
**not** need a re-scrape. The scrape captures every overloaded function's
*per-overload* argument types into `overloadArgs` (the "overload dump") inside
`pine-data/raw/v6/complete-v6-details.json`. The union of those into a single
type per parameter is computed **offline at generate-time** by
`packages/pipeline/src/union-types.ts`. So to iterate the union / type-derivation
rules:

```bash
# 1. edit packages/pipeline/src/union-types.ts (the offline union rule)
pnpm run generate          # recompute pine-data from the existing dump - NO network
pnpm run install:cli       # rebuild the CLI bundle
node scripts/regression-check.mjs   # verify against the snapshot baseline
```

`pnpm run generate` is deterministic and offline - re-running it produces a
byte-identical `functions.json`.

**Changing what is *extracted* from the DOM is also offline now.** Every
`scrape` mirrors each function's rendered element to `.cache/dom/<name>/{base,
overload-<i>}.html` (gitignored - a local build artifact; we never commit TV's
HTML to this public repo). So a DOM-*extraction* change does **not** need a
re-scrape either:

```bash
# 1. edit packages/pipeline/src/arg-parse.ts (the shared arg-type parser) or
#    packages/pipeline/src/section-parse.ts (the Returns/Remarks/See-also parser)
pnpm run reextract:dom       # re-derive overloadArgs from .cache/dom - NO network
pnpm run reextract:sections  # re-derive returnsDescription/remarks/seeAlso - NO network
pnpm run generate            # recompute pine-data from the corrected dump
pnpm run install:cli
node scripts/regression-check.mjs
```

The mirror is built as a byproduct of any normal `scrape`. **Only re-scrape
(hitting TV) when the mirror is missing or TV's DOM *structure* itself changed**
 - e.g. a new field that isn't captured in the snapshot at all. The overload arg
widget renders dynamically per sub-anchor, so the mirror snapshots each overload
separately (`scrape.ts` `saveDomSnapshot`). See TODO #22.

### Polymorphic Functions

Return-type/polymorphism behavior has a **single source**: the generated
`flags` on each function in `pine-data/v6/functions.json` -
`flags.polymorphic` (`"input"` | `"element"` | `"numeric"`, from the hardcoded
map in `generate.ts`) and `flags.returnTypeParam` (auto-detected offline by
`detectReturnTypeParam` in `union-types.ts`, with the small
`RETURN_TYPE_PARAM_OVERRIDES` map for cases the detector can't derive, e.g.
`input` → `defval`). The checker reads only these (`getPolymorphicReturnType` /
`getPolymorphicType` in `builtins.ts`).

```jsonc
// functions.json
{ "name": "input", "flags": { "polymorphic": "input", "returnTypeParam": "defval" } }
{ "name": "ta.valuewhen", "flags": { "returnTypeParam": "source" } }
```

`input(defval=42)` → `input int`, `input(defval=2.0)` → `input float`. (The
former discovered `function-behavior.json` second source was retired - see
TODO #17 / git log.)

---

## Key Implementation Details

### Function Overloads
`hasOverloads()` in `builtins.ts` detects overloaded functions by checking for `type: "unknown"` parameters. The type checker skips positional type checking for these functions.

### Type Coercion
`types.ts` handles:
- `simple<T>` ↔ `series<T>` coercion
- `series<T>` → `T` coercion (series values in simple contexts)
- `int` ↔ `float` bidirectional coercion
- Color type arithmetic
- **Legacy-only** (v4/v5, behind `isAssignable`'s `legacy` param): string →
  `color` ("red"), numeric ↔ `color` (ARGB ints), numeric → `string`
  (implicit tostring). v6 rejects all of these with CE10123 - probed
  2026-06-10, see INV059. Do not re-add them to the v6 path.

---

## Known Limitations

- **Legacy color constants** - v4/v5 scripts use bare `red`, `green`, etc. In v6, must use `color.red`. Not fixing since these are pre-v6 scripts.
- **Invalid parameter names** - Some scripts use deprecated params like `type` (input) and `when` (strategy). These are v5 params not valid in v6.
- **Argument type-checking is v6-only** - pine-data ships only v6 signatures, so we don't validate argument *types* on `//@version=4`/`5` scripts (their signatures differ - e.g. v4 `input`'s `type` param). Legacy scripts are left lenient; arg-type mismatches are flagged only for v6. See INV013 / G004.
- **Legacy bool contexts accept numerics** - v4/v5 auto-coerce int/float in if/while/ternary conditions and `and`/`or`/`not` operands (TV compiles with a warning; v6 errors). `boolContextOk` in `checker.ts` gates the bool-context errors accordingly; string/color operands are flagged on every version. See INV060.
- **Nested inline switches with tuples** - Deeply nested inline switches with tuple assignments inside case bodies are not yet fully supported. Basic inline switch with tuples works.
- **Built-in unused variable warnings - RETRACTED 2026-08-25 (see [INV168](investigations/INV168-unused-variable-builtins/notes.md)).** This entry claimed `UnifiedPineValidator` reports built-in variables/keywords as "declared but never used". It does not, and cannot: `SymbolTable.initializeBuiltins` defines every built-in variable, function, keyword and namespace with `used: true`; the SemanticAnalyzer's copy of the rule - the only one that reaches a user - populates its map solely from user declarations and parameters; and the validator's own copy was unreachable, since both the CLI and the language service keep only ERRORS from `validate()` - that dead copy has since been deleted. A 2257-file sweep found 15 warnings on built-in NAMES, every one of them correct (a user declaration shadowing the name and genuinely never read).

### Multiline String Behavior (v6)

Multiline strings are valid but **deprecated** in v6:
```pine
string TT = "Line 1
     Line 2"  // Each wrapped line adds exactly one space
```

Recommended approach - concatenate with `+`:
```pine
string TT = "Line 1 " +
     "Line 2"
```

---

## Type Checker Improvements

Run `pnpm run debug:diff -- --count 20 --verbose` to see current discrepancies.

---

## pine-lint CLI & TradingView authority

`pine-lint` is **this repo's own CLI** (bundled from `packages/cli/src/cli.ts`,
installed to `~/.local/bin/pine-lint` by `pnpm run install:cli` - re-run after
any CLI source change). Run bare, it executes our offline parser + validator;
with `--tv` it forwards the source to TradingView's `translate_light` endpoint
and returns TV's response instead. TradingView is the source of truth for Pine
v6 *validity* - when our checker disagrees, TV (via `--tv`) wins. (But see the
Methodology section above: TV *silence* is evidence, not authority.)

**`--tv` is not the Pine editor.** It forwards to `translate_light`, which
typechecks but does not enforce the editor's contextual restrictions on
`request.*()` arguments - so a `--tv` clean verdict does not settle whether the
editor accepts the script. See `gotchas/G009`. TradingView has at least two
validation layers and `--tv` reaches the more permissive one.

Usage (JSON on stdout, matching the pine-lint format):

```bash
pine-lint <file.pine>                         # our local validator
pine-lint -c 'indicator("x")'                 # validate an inline string
cat script.pine | pine-lint -                 # validate from stdin
pine-lint --tv <file.pine>                    # TradingView's verdict (the authority)
pine-lint --tv --full-response <file.pine>    # keep the verbose "scopes" block (stripped by default)
pine-lint --no-lint <file.pine>               # skip our own semantic lints (the `lint` stage)
```

Every locally-produced diagnostic carries a `stage` (`syntax` / `type` /
`analysis` / `lint`) and `lint`-stage ones also carry a `rule` id, so a
consumer filters by field rather than by pattern-matching the prose. Warnings
never affect the exit code; only errors do.

`pnpm run debug:compare -- <file.pine>` runs both at once and prints the
local-only / tv-only error diff - the everyday repro tool.

### The `lint` stage - the one channel that is NOT TV

Every locally-produced diagnostic carries a `stage`: `syntax` (lexer/parser),
`type` (the validator), `analysis` (the SemanticAnalyzer's TV-mirroring
CW100xx warnings), and `lint`. The first three mirror TradingView. `lint` does
not: it is our own semantic lints (`packages/core/src/analyzer/lint-semantic.ts`)
for code that COMPILES and is still wrong - a repainting `request.security`, a
`var` accumulator a loop re-adds to every bar, the plot / `request.*` budgets,
an entry with no exit, an argument outside its documented or runtime-enforced
range. TV is silent on all of them by design, so **do not treat
a `lint`-stage finding as a TV disagreement**, and anything diffing us against
TV should drop the stage wholesale. They are always warnings, never errors, and
carry a `rule` id instead of a `CW` code. See INV144.

**The stage is decided by the CW code, not by which module computed the
diagnostic.** A SemanticAnalyzer warning with no CW code mirrors nothing, so it
is routed to `lint` too - UNUSED_VARIABLE is the one such rule today, and any
future code-less warning lands there automatically. The corollary is a rule
worth keeping: **an `analysis`-stage diagnostic with no CW code is a bug.** See
INV166.

Two standing rules for that module: a false positive there is worse than a
miss (it teaches readers to ignore the channel), and any new rule must be
swept over the corpus before it lands -
`node investigations/INV144-semantic-lint-checks/count-lints.mjs`.

---

## Differential Testing

Compare internal validator against TradingView's pine-lint API:

```bash
pnpm run debug:diff -- --count 10           # Test 10 random scripts
pnpm run debug:diff -- --count 5 --verbose  # Show generated scripts
pnpm run debug:diff -- --count 20 --save    # Save discrepancies to JSON
```

**What it finds:**
- **Only in TradingView** - Errors we're missing (false negatives)
- **Only in Internal** - Errors we report that TV doesn't (false positives)
- **Different messages** - Same error, different wording

## Document folders

The standing layout, across every project. Three live folders plus one retired,
split by durability first, subject second.

| Folder | Contents | Rule |
|---|---|---|
| `reference/` | Durable in-repo reference for anyone working on or with the code - how the thing is built and why: `architecture.md`, `technical-implementation-spec.md`, `performance.md` (the durable record of measured numbers over time), invariants, protocol contracts | Citable from source as a source of truth. What it says must be true. |
| `docs/` | Durable in-repo documentation of how the thing is used - guides, CLI reference, the consumer-facing API surface. Sometimes exposed as a hand-edited VitePress gh-pages site | Same must-be-true rule. |
| `notes/` | Transient - work items (`todo.md`), future plans, hypotheticals, bug reports, research, analysis. Things that will die | No truth guarantee. Nothing durable cites it. |
| `plans/` | Retired | Plan documents are transient: they go in `notes/`. |

`reference/` and `docs/` are both durable and both binding. The difference is
subject, not audience: `reference/` covers how the thing is built and why - what
you need in order to change it safely - while `docs/` covers how it is used. A
developer or library consumer reads both. Where a project publishes a site,
`docs/` is what gets published; the folder means the same thing either way.
`notes/` is neither durable nor binding, which is the whole point of keeping it
separate: a document that may be wrong must not sit where a document that must
be right is expected.

The dependency direction is therefore one-way. `notes/` may cite `docs/` and
`reference/`; nothing durable may cite `notes/` - not a code comment, not
`docs/`, not `reference/`. A code comment must carry its full context, because
it outlives the note.

**Root-level convention files are exempt.** `AGENTS.md`, `CLAUDE.md`,
`README.md`, `LICENSE`, `CHANGELOG.md` and their kin are found by tooling and by
convention at the repository root, and stay there. These folders govern
documents we chose where to put, not files whose location is dictated.

In `notes/`, `docs/` and `reference/` alike, avoid citing source line numbers -
they drift fast.
