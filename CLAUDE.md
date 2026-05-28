# pine-tools

**This project uses pnpm.** Do not use npm or yarn.

```bash
pnpm install          # Install dependencies
pnpm run <script>     # Run scripts
pnpm test             # Run tests
```

---

## Methodology — we aim to be MORE correct than TradingView's pine-lint

TradingView's `pine-lint` is a reference, not the spec. It has real bugs:
it stops at the first error, blames whitespace for a missing `)`
elsewhere in the file, silently accepts nonsense expressions, and its
results sometimes change run-to-run for no apparent reason. **Matching
it is not the goal.** Our linter should catch what TV catches *and*
what TV misses.

### Hard rules

- **TV silence is evidence, not authority.** When TV is silent and we
  flag an expression, that is a disagreement — it might be us being
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
   picks it up automatically — a repro that doesn't fail-on-regression
   is just a paragraph with code in it. Use the
   `// @expects error: line=N, message="..."` directive form (the bare
   `// @expects errors: N` is currently ignored by the runner).
2. **Open an investigation** under `investigations/INV###-name/` with
   `notes.md` and the repro file (or a pointer to the regression
   fixture). Sequential numbering, never reuse. Index entries live in
   `investigations/README.md` and are surfaced in `TODO.md`.
3. **Annotate code decisions inline** with a `// see INV###` or
   `// see G###` pointer. Don't wax lyrical in the code — the long
   reasoning lives in the markdown.
4. **Record side-knowledge as gotchas.** A gotcha is something *we
   can't fix* that we need to remember when working — Pine language
   quirks, TV linter behaviors, scraping anomalies in upstream docs.
   It is *not* a known bug in our own code (those go in TODO.md as
   work items). Examples: "TV's parser flakes on multiline strings",
   "Pine v6 deprecates multiline string literals but still parses
   them". Add `gotchas/G###.md` with as much context as possible.
   Index in `gotchas/README.md`, surfaced in `TODO.md`.

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
reference page's "Type" field — never guess them by namespace. The old
`inferVariableType` / `inferConstantType` heuristics were retired for
exactly that reason; don't reintroduce that pattern.

---

## Commands

```bash
# Development
pnpm install              # Install dependencies
pnpm run build            # Build extension
pnpm test                 # Run tests

# Data Pipeline (packages/pipeline/src/)
pnpm run crawl            # Crawl TradingView docs
pnpm run scrape           # Scrape function details
pnpm run generate         # Generate pine-data/v6/*.{ts,json}
pnpm run generate:syntax  # Generate syntaxes/pine.tmLanguage.json
pnpm run discover:behavior # Discover polymorphism → function-behavior.json

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

The dev tools handle temp files, JSON parsing, and output formatting automatically.

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
| `crawl` | `pine-data/raw/v6/v6-language-constructs.json` |
| `scrape` | `pine-data/raw/v6/complete-v6-details.json` |
| `generate` | `pine-data/v6/*.ts` + `*.json` (vendor-friendly snapshot for downstream Rust/non-node consumers) |
| `generate:syntax` | `syntaxes/pine.tmLanguage.json` |
| `discover:behavior` | `pine-data/v6/function-behavior.json` |

**Regenerating is safe** - customizations are in the scripts, not output files.

⚠️ `function-behavior.json` is regenerated **only** by `discover:behavior`,
*not* by `generate` — so it goes stale after a `crawl`/`scrape`/`generate`
refresh unless you re-run `discover:behavior`. (Its `.ts` sibling is a
hand-written loader that embeds the JSON — see INV011.)

### Re-running type logic WITHOUT scraping

**Be sparing with `scrape` — it hits TradingView's site.** Most type work does
**not** need a re-scrape. The scrape captures every overloaded function's
*per-overload* argument types into `overloadArgs` (the "overload dump") inside
`pine-data/raw/v6/complete-v6-details.json`. The union of those into a single
type per parameter is computed **offline at generate-time** by
`packages/pipeline/src/union-types.ts`. So to iterate the union / type-derivation
rules:

```bash
# 1. edit packages/pipeline/src/union-types.ts (the offline union rule)
pnpm run generate          # recompute pine-data from the existing dump — NO network
pnpm run install:cli       # rebuild the CLI bundle
node scripts/regression-check.mjs   # verify against the snapshot baseline
```

`pnpm run generate` is deterministic and offline — re-running it produces a
byte-identical `functions.json`. **Only `scrape` (or `scrape -- --force`) when
you need to change what is *extracted* from TradingView's DOM** (new fields,
new selectors), not when changing how param types are *derived* from the dump.
A full site mirror to make even DOM-extraction offline is tracked in TODO #22.

### Polymorphic Functions

Discovered automatically via `discover:behavior`:

```json
{
  "input": { "polymorphic": { "returnTypeParam": "defval" } },
  "nz": { "polymorphic": { "returnTypeParam": "source" } }
}
```

`input(defval=42)` → `input int`, `input(defval=2.0)` → `input float`

---

## Key Implementation Details

### Function Overloads
`hasOverloads()` in `builtins.ts` detects overloaded functions by checking for `type: "unknown"` parameters. The type checker skips positional type checking for these functions.

### Type Coercion
`types.ts` handles:
- `simple<T>` ↔ `series<T>` coercion
- `series<T>` → `T` coercion (series values in simple contexts)
- `int` ↔ `float` bidirectional coercion
- `series<float>` → `color` coercion
- Numeric → `string` coercion
- Color type arithmetic

---

## Known Limitations

- **Legacy color constants** - v4/v5 scripts use bare `red`, `green`, etc. In v6, must use `color.red`. Not fixing since these are pre-v6 scripts.
- **Invalid parameter names** - Some scripts use deprecated params like `type` (input) and `when` (strategy). These are v5 params not valid in v6.
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
installed to `~/.local/bin/pine-lint` by `pnpm run install:cli` — re-run after
any CLI source change). Run bare, it executes our offline parser + validator;
with `--tv` it forwards the source to TradingView's `translate_light` endpoint
and returns TV's response instead. TradingView is the source of truth for Pine
v6 *validity* — when our checker disagrees, TV (via `--tv`) wins. (But see the
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
local-only / tv-only error diff — the everyday repro tool.

---

## Differential Testing

Compare internal validator against TradingView's pine-lint API:

```bash
pnpm run debug:diff -- --count 10           # Test 10 random scripts
pnpm run debug:diff -- --count 5 --verbose  # Show generated scripts
pnpm run debug:diff -- --count 20 --save    # Save discrepancies to JSON
```

**What it finds:**
- ❌ **Only in TradingView** - Errors we're missing (false negatives)
- ⚠️ **Only in Internal** - Errors we report that TV doesn't (false positives)
- 📝 **Different messages** - Same error, different wording

---

## Comparison Tool

Compare CLI output against TradingView's pine-lint:

```bash
node dev-tools/compare-validation-results.js
```
