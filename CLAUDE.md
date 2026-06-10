# pine-tools

**This project uses pnpm.** Do not use npm or yarn.

```bash
pnpm install          # Install dependencies
pnpm run <script>     # Run scripts
pnpm test             # Run tests
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
- Subagents must always be launched in the foreground (never
  `run_in_background: true`) so the user can approve tool requests.
- Prefer structural or semantic criteria over arbitrary numeric thresholds
  in heuristics. Magic numbers (`> 10x`, `count > N`, `> N lines`) are
  brittle and hide the real criterion. If a number only surfaces candidates
  to look at, say so and treat it as exploratory, not a rule.
- Once a plan is agreed, execute it end-to-end without pausing for per-step
  go-aheads. Surface genuine new decision points (an unexpected regression,
  a fork the plan didn't cover), but don't re-confirm already-agreed steps.
  (Commits stay the exception - see git commit rules.)

### Memory rules

Do not use your Memory functionality. Do not read, write, or update
memories. Do not suggest saving things to memory. Durable context belongs
in CLAUDE.md or the relevant docs.

### Bash rules

- Never use `sed`, `find`, `awk`, `head`, `tail`, or complex bash commands.
- Never `find /`.
- Never run `git` with `-C <path>`.
- One Bash() invocation === one command.
- Never chain commands with `&&`.
- Never chain commands with `;`.
- Never chain/pipe commands with `|`. Exception: piping into `review` is
  allowed (writing scratch prompt files is wasteful).
- Never capture stdout into env vars (`UUID=$(...)`).
- Never read or write from `/tmp`. All data lives in the project.

### git commit rules

- Never commit unless the user explicitly asks for that specific commit. A
  prior "commit" authorization covers only what was ready then, not later
  edits. When unsure, leave changes unstaged and wait.
- Never commit markdown changes alone. Bundle them with upcoming code commits.
- When committing other changes: always tag along markdown files if dirty.
- Write substantive engineering-focused commit messages.
- Never `git push` unless the user explicitly asks. Stop after the commit.

### Doc scope (where things go)

- `TODO.md` is **pending work only** - things someone could pick up.
  Resolved/reverted items, past investigations, and indexes of completed
  work do NOT belong; those live in git log, `investigations/`, and
  `gotchas/`. Link to the canonical home instead of copying.
- `investigations/INV###` is **only** for lint/parser/lexer disagreements
  that come with a minimal `.pine` repro. Pipeline/data/scraper/architecture
  work goes in `TODO.md`; unfixable TV or Pine-language quirks go in
  `gotchas/`.

### Multi-Agent Orchestration

**Always get permission** from the user before launching subagents.

**Do NOT use git worktree isolation for parallel agents.** Worktrees create
merge conflicts that silently drop agent work. Instead, launch agents in the
same tree with strict file ownership - zero overlap.

Agent coordination rules:

- Each agent gets exclusive ownership of specific files. No two agents touch
  the same file.
- Agents must read their target file FIRST. Do not replace existing code with
  placeholders or stub it out.
- Agents must NOT run builds, the test suite, or the CLI install (`pnpm test`,
  `pnpm run build`, `pnpm run install:cli`). The orchestrator validates
  between agents.

Audit protocol:

- Do not trust agent claims of completion. Verify existence + wiring + behavior.
- Use the 3-pass audit structure: domain-specific verification, then
  cross-cutting reconciliation (does the new instruction actually dispatch? is
  the new builtin actually installed?), then editorial normalization.
- Any discrepancies doc should contain only current gaps, not historical
  records. Remove resolved items entirely.

Subagent prompt rules:

- Scope the investigation, not the report. Caps like "under 1500 chars" or
  "max 15 findings" throw away signal you asked them to surface.
- Invite lateral findings up front. If they notice a bug, optimization, smell,
  or anything surprising while doing the scoped work, they should flag it, even
  when it's outside the immediate task.
- Name the question, not the method. Don't prescribe tools ("use `git diff`",
  "use `Read`"), don't prescribe steps ("read in full, not just hunks"), don't
  enumerate files when the scope already implies them ("packages/core only" +
  the agent's own `ls` / `git diff --name-only` is enough). Prescribing the
  method wastes tokens and signals distrust.
- Don't restate rules the agent already inherits. Subagents load the same
  CLAUDE.md as the main session, so the bash rules, no-worktrees, gremlins,
  etc. are already in scope. Re-listing them is noise.
- Do pass anything learned in *this* conversation that the agent can't see: the
  user's framing, prior decisions, what's already been ruled out, the specific
  claim being audited.
- For review tasks, ask for findings labeled *bug* / *gap* / *smell* / *nit* so
  the orchestrator can triage without re-reading the whole report.

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
   supported. Warnings assert the SemanticAnalyzer channel (same as
   the CLI); validator warnings are stripped.
2. **Open an investigation** under `investigations/INV###-name/` with
   `notes.md` and the repro file (or a pointer to the regression
   fixture). Sequential numbering, never reuse. Index entries live in
   `investigations/README.md` and are surfaced in `TODO.md`.

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
   It is *not* a known bug in our own code (those go in TODO.md as
   work items). Examples: "TV's parser flakes on multiline strings",
   "Pine v6 deprecates multiline string literals but still parses
   them". Add `gotchas/G###.md` with as much context as possible.
   Index in `gotchas/README.md`, surfaced in `TODO.md`. The same `--tv`
   rule as step 2 applies: any gotcha recording TV behavior must carry the
   exact probe `.pine` script(s) and TV's dated results.

### Indexes

`TODO.md` carries two summary indexes (`gotchas/` and `investigations/`)
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

# Data Pipeline (packages/pipeline/src/)
pnpm run crawl            # Crawl TradingView docs (TOC inventory)
pnpm run scrape           # Scrape details + build .cache/dom mirror
pnpm run reextract:dom    # Re-derive overloadArgs from the mirror (offline; run after scrape)
pnpm run reextract:sections # Re-derive returnsDescription/remarks/seeAlso from the mirror (offline; run after scrape)
pnpm run generate         # Generate pine-data/v6/*.{ts,json}
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
pnpm run debug:internals -- validate 'code'  # Full validation details
pnpm run debug:internals -- tokens 'code'    # Show lexer tokens with line/indent
pnpm run debug:internals -- symbols hour     # List matching symbols
pnpm run debug:internals -- analyze --summary          # Discrepancy summary
pnpm run debug:internals -- analyze --cli-errors       # CLI error summary
pnpm run debug:internals -- analyze --filter "token"   # Filter by message
pnpm run debug:internals -- corpus --summary           # v6 parse error stats
pnpm run debug:internals -- corpus --errors            # Files with parse errors

# Convenience aliases
pnpm run debug:tokens 'code'                 # Shortcut for tokens command
pnpm run debug:corpus --summary              # Shortcut for corpus analysis
pnpm run debug:diff -- --count 10            # Differential test vs TradingView
pnpm run debug:diff -- --count 5 --verbose   # Show generated scripts
```

### For LLM Agents

**Use the dev tools above instead of complex shell commands.** These tools are pre-approved and avoid permission prompts:

| Instead of... | Use this |
|---------------|----------|
| `cat > /tmp/test.js << 'EOF' ... EOF && node /tmp/test.js` | `pnpm run debug:internals -- validate 'code'` |
| `echo 'code' > /tmp/test.pine && node dist/.../cli.js /tmp/test.pine` | `pnpm run test:snippet -- 'code'` |
| `for f in plan/pine-lint-vs-cli-differences/*.json; do jq ... $f; done` | `pnpm run debug:internals -- analyze --filter "..."` |
| Grepping for function definitions in pine-data | `pnpm run debug:internals -- lookup <name>` |
| Creating temp files to test Parser/Validator | `pnpm run debug:internals -- parse 'code'` or `validate 'code'` |
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
- Don't use `po validate`, use `pine-lint` instead.

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
- **Built-in unused variable warnings** - The core validator (`UnifiedPineValidator`) incorrectly reports built-in variables/keywords as "declared but never used". This is a bug in the unused variable detection logic that needs to exclude built-ins from the check. Location: `packages/core/src/analyzer/checker.ts`.

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

## VS Code Marketplace Publishing

### Required Steps

1. **Add extension icon** (128x128 PNG):
   ```bash
   # Add icon.png to project root, then update package.json:
   "icon": "icon.png"
   ```

2. **Create Azure DevOps PAT**:
   - Go to https://dev.azure.com
   - Create Personal Access Token with "Marketplace (Publish)" scope
   - Token must be for "All accessible organizations"

3. **Publish**:
   ```bash
   pnpm exec vsce login folknor
   pnpm exec vsce publish
   ```

### Optional Enhancements

| Feature | Description | Effort |
|---------|-------------|--------|
| **Extension icon** | Pine tree or chart icon, 128x128 PNG | Required |
| **Gallery banner** | Marketplace header image/color in package.json | Low |
| **Badges** | Version, installs, rating badges in README | Low |
| **GIF demos** | Animated demos of IntelliSense, formatting | Medium |
| **Keybindings** | Default keyboard shortcuts for commands | Low |
| **Snippets** | Code snippets for common patterns (`indicator`, `strategy`) | Medium |
| **Code actions** | Quick fixes for diagnostics (auto-import, fix typos) | High |
| **Debugger** | Step-through debugging (requires TradingView API) | Not feasible |

### Package Commands

```bash
pnpm run package          # Build VSIX to dist/
pnpm run rebuild          # Clean + build + test + package
pnpm run rebuild:skip-tests  # Clean + build + package (no tests)
```

---

## TODO: Type Checker Improvements

Issues discovered via differential testing (`pnpm run debug:diff`).

### Completed

| Issue | Description | Location |
|-------|-------------|----------|
| **Builtins as unused** | ~100 built-ins reported as "declared but never used" | `symbols.ts` |
| **Ternary condition type** | `?:` condition must be bool | `checker.ts` |
| **Logical operator types** | `and`/`or`/`not` require bool operands | `checker.ts`, `types.ts` |
| **Arithmetic on bool/color** | `+`/`-`/`*`/`/`/`%` reject bool/color | `types.ts` |
| **Comparison on color** | `<`/`>`/`<=`/`>=` reject color | `types.ts` |
| **Direct na comparison** | `x == na` must use `na(x)` | `checker.ts` |
| **Local scope restrictions** | `plotshape`/`plotchar`/`bgcolor` etc. can't be called from local scope | `checker.ts` |
| **Ternary branch types** | `?:` branches must have compatible types | `checker.ts` |
| **Switch expression parsing** | Fixed discriminant parsing to not continue across newlines | `parser.ts` |

### Status

The type checker is in good shape. Differential testing shows most discrepancies are:
- Expected wording differences between our messages and TradingView's
- Unused variable warnings (expected for randomly generated test code)
- Our new checks working correctly (ternary types, logical operators, etc.)

### Remaining (Low Priority)

| Issue | Description | Location |
|-------|-------------|----------|
| **Function consistency** | Warning when `ta.crossover`/`ta.rsi` etc. are in conditional scope. This is a recommendation, not an error - code still runs. Requires building a list of functions needing every-bar calling. | `checker.ts` |
| **Complex type compatibility** | `array<T>`, `matrix<T>`, `line`, `label`, `box`, `table` not fully handled in ternary branch type checking | `checker.ts` |

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

Usage (JSON on stdout, matching the pine-lint format):

```bash
pine-lint <file.pine>                         # our local validator
pine-lint -c 'indicator("x")'                 # validate an inline string
cat script.pine | pine-lint -                 # validate from stdin
pine-lint --tv <file.pine>                    # TradingView's verdict (the authority)
pine-lint --tv --full-response <file.pine>    # keep the verbose "scopes" block (stripped by default)
```

`scripts/compare-tv.mjs <file.pine>` runs both at once and prints the
local-only / tv-only error diff - the everyday repro tool.

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

---

## Comparison Tool

Compare CLI output against TradingView's pine-lint:

```bash
node dev-tools/compare-validation-results.js
```
