# Pine Script v6 Extension - Development Guide

## Project Architecture

This is a VS Code extension providing Pine Script v6 support (IntelliSense, validation, CLI linting).

### Directory Structure

```
v6/                          # DATA LAYER (source of truth)
├── raw/                     # Raw scraped data from TradingView
│   ├── v6-language-constructs.json  # 866 discovered constructs
│   └── complete-v6-details.json     # Detailed function specs
├── parameter-requirements.ts         # Manual specs (32 critical functions, 100% accurate)
├── parameter-requirements-generated.ts # Auto-generated specs (425+ functions)
├── parameter-requirements-merged.ts  # Merged: manual overrides auto-gen
├── pine-constants-complete.ts        # All 239 constants in 32 namespaces
├── pine-builtins-complete.ts         # All 161 built-in variables
├── v6-manual.ts                      # V6_VARIABLES, V6_FUNCTIONS
└── generated.ts                      # Built-in variable mappings

scripts/                     # GENERATION PIPELINE
├── crawl.js                 # Puppeteer: discovers 866 language constructs
├── scrape.js                # Puppeteer: fetches detailed specs per function
└── generate.js              # Converts raw JSON to TypeScript exports

src/                         # CODE LAYER (logic only - NO hardcoded language data)
├── parser/
│   ├── lexer.ts
│   ├── parser.ts
│   ├── ast.ts
│   ├── symbolTable.ts
│   └── unifiedValidator.ts
├── completions.ts
├── signatureHelp.ts
├── extension.ts
└── cli.ts
```

### Architecture Principle: Data vs Syntax

**Two Categories of Language Knowledge:**

1. **Language Syntax Fundamentals** (OK to hardcode in lexer/parser):
   - Keywords (`if`, `else`, `for`, `while`, `var`, `varip`, `return`) - define grammar
   - Operators (`+`, `-`, `*`, `/`, `and`, `or`, `not`, `?:`)
   - Basic type keywords (`int`, `float`, `bool`, `string`, `color`)
   - These are stable, rarely change, and are needed for parsing before any data loads

2. **Language Library/API Data** (MUST come from `v6/` - never hardcode):
   - Function signatures (`ta.sma`, `input.int`, `plot`, `indicator`)
   - Built-in variables (`close`, `high`, `volume`, `bar_index`)
   - Constants (`color.red`, `shape.circle`, `plot.style_line`)
   - Namespace members and their types
   - Parameter requirements and return types

**Core Rule:** If it's about *what Pine Script functions/variables/constants exist*, it belongs in `v6/`.
If it's about *how the Pine Script language is structured syntactically*, it can be in `src/`.

This follows standard LSP design: the parser knows language grammar, while semantic analysis uses loaded data.

---

## Commands

```bash
# Development
pnpm install          # Install dependencies
pnpm run build        # Build extension
pnpm run watch        # Watch mode

# Generation Pipeline
pnpm run crawl        # Crawl TradingView docs → v6/raw/v6-language-constructs.json
pnpm run scrape       # Scrape details → v6/raw/complete-v6-details.json
pnpm run generate     # Generate TypeScript from raw data

# Testing
pnpm test             # Run all tests
pnpm run qa:pinescript # Validate all .pine files in project

# CLI Tool
node dist/src/cli.js <file.pine>  # Our linter
pine-lint <file.pine>              # TradingView's linter (for comparison)
```

---

## Current Refactoring Plan

**Goal**: Make our CLI produce results at least as good as TradingView's `pine-lint`.

### Phase 1: Fix Data Layer (`v6/`)

Update `scripts/generate.js` to produce missing exports:

1. **V6_NAMESPACES** - Organized by namespace:
   ```typescript
   export const V6_NAMESPACES = {
     ta: { functions: {...}, variables: {...}, constants: {...} },
     math: { functions: {...}, ... },
     // ...
   }
   ```

2. **V6_KEYWORDS** - All Pine Script keywords:
   ```typescript
   export const V6_KEYWORDS = ["if", "else", "for", "while", ...];
   ```

3. **V6_TYPE_NAMES** - All type names:
   ```typescript
   export const V6_TYPE_NAMES = ["int", "float", "bool", "string", "color", ...];
   ```

4. **V6_BUILTIN_VARIABLES** - With types:
   ```typescript
   export const V6_BUILTIN_VARIABLES = {
     close: "series<float>",
     open: "series<float>",
     bar_index: "series<int>",
     // ...
   }
   ```

5. **NAMESPACE_PROPERTIES** - Property type mappings:
   ```typescript
   export const NAMESPACE_PROPERTIES = {
     "plot.style_line": "plot_style",
     "color.red": "color",
     "barstate.isfirst": "series<bool>",
     // ...
   }
   ```

6. **FUNCTION_METADATA** - Function flags:
   ```typescript
   export const FUNCTION_METADATA = {
     indicator: { topLevelOnly: true },
     plot: { topLevelOnly: true },
     "ta.sma": { seriesReturning: true },
     // ...
   }
   ```

### Phase 2: Refactor Code Layer (`src/`)

Remove hardcoded **library/API data** from these files and import from `v6/`:

| File | Keep (Syntax) | Remove → Import from v6/ |
|------|---------------|--------------------------|
| `lexer.ts` | Keywords, operators | - |
| `parser.ts` | Grammar rules | - |
| `symbolTable.ts` | - | Built-in vars, namespaces |
| `completions.ts` | - | V6_KEYWORDS, V6_NAMESPACES, function data |
| `unifiedValidator.ts` | - | namespaceProperties, knownReturnTypes, topLevelOnlyFunctions |
| `semanticAnalyzer.ts` | - | seriesFunctions, commonVariables |
| `astExtractor.ts` | - | INPUT_FUNCTIONS, SERIES_FUNCTIONS |
| `signatureHelp.ts` | - | V6_NAMESPACES |

**Note:** `lexer.ts` can keep keywords hardcoded since they define syntax and rarely change.

### Phase 3: Validate Against pine-lint

1. Compare our CLI output against pre-saved pine-lint results in `./plan/pine-lint-results/*.json`
2. Our linter should catch everything pine-lint catches
3. Fix any remaining gaps
4. Goal: Zero false negatives (we catch at least what TradingView catches)

---

## Data Quality Status

| Data Type | Count | Source | Status |
|-----------|-------|--------|--------|
| Functions (manual) | 32 | parameter-requirements.ts | 100% accurate |
| Functions (auto) | 425+ | parameter-requirements-generated.ts | **BROKEN - empty parameters** |
| Constants | 239 | pine-constants-complete.ts | Complete |
| Variables | 161 | pine-builtins-complete.ts | Complete |
| Namespaces | 48 | Discovered but not exported | **MISSING EXPORT** |
| Keywords | 25 | Discovered but not exported | **MISSING EXPORT** |
| Return types | Partial | Hardcoded in src/ | **NEEDS MIGRATION** |

### Root Cause of Data Quality Issues

The auto-generated function specs have empty `parameters: []` because:
1. `scripts/scrape.js` uses **wrong URL pattern**: tries `fun_ta_sma.html` but TradingView uses hash routing `#fun_ta.sma`
2. The scraper gets "This isn't the page you're looking for" for all function URLs
3. All cached data in `.cache/function-details/` contains empty parameters

**TradingView URL Pattern:**
- Base: `https://www.tradingview.com/pine-script-reference/v6/`
- Function: `https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma`
- It's a single-page app with hash navigation, not separate HTML files

**Solution:** Fix `scripts/scrape.js` to:
1. Navigate to base URL with hash fragment (`#fun_ta.sma`)
2. Wait for SPA content to load
3. Extract parameters from the loaded content

**Validation:** Compare output against local reference manual at `/home/folk/Programs/trading-strategies/pinescriptv6/` to verify correctness.

---

## Known Issues from Test Suite (Aggregated TODOs)

These issues were identified while fixing test files. All skipped tests have `// TODO:` comments.

### Priority 1: Data Quality (31 skipped tests depend on this)

| Issue | Impact | Solution |
|-------|--------|----------|
| Empty `parameters[]` in auto-generated specs | All parameter validation fails | Parse local reference manual |
| Variadic functions (math.max, str.format) | Incorrect "too many params" errors | Mark as variadic in specs |
| Missing strategy.*, shape.*, location.* | False "unknown constant" errors | Add to pine-constants-complete.ts |

**Reference Manual Location:** `/home/folk/Programs/trading-strategies/pinescriptv6/`
- `pinescriptv6_complete_reference.md` - 14,142 lines, complete reference
- `reference/functions/*.md` - Function docs by namespace (ta, strategy, drawing, etc.)
- `reference/constants.md` - All constants
- `reference/variables.md` - All built-in variables

### Priority 2: Parser Issues (10 skipped tests)

| Issue | Impact | Location |
|-------|--------|----------|
| Parser errors logged to console but not exposed via API | Can't report syntax errors in CLI | `src/parser/parser.ts` |
| Generics like `array.new<float>()` not parsed | False syntax errors | `src/parser/parser.ts` |
| Switch statements not parsed | False syntax errors | `src/parser/parser.ts` |
| For loops not parsed correctly | False syntax errors | `src/parser/parser.ts` |
| Library/export declarations not parsed | Library scripts fail | `src/parser/parser.ts` |
| User-defined functions not parsed | UDF scripts fail | `src/parser/parser.ts` |
| Type definitions not parsed | Type scripts fail | `src/parser/parser.ts` |

### Priority 3: Validator Issues (9 skipped tests)

| Issue | Impact | Location |
|-------|--------|----------|
| Unknown functions not detected | `ta.nonexistent()` passes validation | `src/parser/unifiedValidator.ts` |
| Type casting `int(close)` flagged as unknown | False positives | `src/parser/unifiedValidator.ts` |
| Built-in variable shadowing not detected | `close = 5` allowed | `src/parser/unifiedValidator.ts` |
| Type mismatch detection missing | Type errors not caught | `src/parser/unifiedValidator.ts` |
| Boolean validation for `if` conditions | Non-bool in `if` allowed | `src/parser/unifiedValidator.ts` |

### Priority 4: CLI Output Issues (4 skipped tests)

| Issue | Impact | Location |
|-------|--------|----------|
| Version field missing in output | Can't detect script version | `src/cli.ts` |
| Deprecated v5 syntax detection missing | No migration warnings | `src/parser/unifiedValidator.ts` |

---

## Phase 2 Refactoring Plan (Updated)

### Step 1: Fix Data Quality (HIGHEST PRIORITY)

Fix `scripts/scrape.js` to use correct TradingView URL pattern:

```javascript
// Current (BROKEN):
const functionUrl = `${BASE_URL}fun_${functionName.replace(".", "_")}.html`;
// → https://www.tradingview.com/pine-script-reference/v6/fun_ta_sma.html (404)

// Fixed:
const functionUrl = `${BASE_URL}#fun_${functionName}`;
// → https://www.tradingview.com/pine-script-reference/v6/#fun_ta.sma (works)
```

Then update the page.evaluate() selectors to match TradingView's actual HTML structure.

**Validation:** Compare scraped output against `/home/folk/Programs/trading-strategies/pinescriptv6/` to verify parameters are extracted correctly.

### Step 2: Expose Parser Errors via API

Modify `src/parser/parser.ts`:
- Store errors in array instead of console.log
- Add `getParserErrors()` method
- Include in CLI output

### Step 3: Add Unknown Function Detection

Modify `src/parser/unifiedValidator.ts`:
- Check if function exists in V6_FUNCTIONS before validating parameters
- Report "Unknown function" for functions not in any namespace

### Step 4: Fix Type Casting Recognition

Modify `src/parser/unifiedValidator.ts`:
- Recognize `int()`, `float()`, `bool()`, `string()`, `color()` as type casts
- Don't report "Unknown function" for type casts

### Step 5: Refactor Code Layer

Remove hardcoded data from `src/` files and import from `v6/` (as originally planned).

---

## Testing Strategy

1. **Unit tests** - `test/*.test.ts`
2. **Integration tests** - CLI against real .pine files
3. **Comparison tests** - Our output vs pine-lint output
4. **Regression tests** - Ensure fixes don't break existing validation

### Future Testing Enhancements (Option A)

To achieve higher validation confidence:

1. **Property-based testing** with [fast-check](https://github.com/dubzzz/fast-check)
   - Generate random Pine Script code
   - Verify our validator matches pine-lint behavior

2. **Mutation testing** with [Stryker](https://stryker-mutator.io/)
   - Ensure test suite catches logic errors
   - Target: >80% mutation score on validator code

3. **Fuzzing** - Generate random/malformed Pine scripts
   - Test parser robustness
   - Find edge cases in validation logic
