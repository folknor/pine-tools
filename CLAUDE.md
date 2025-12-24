# pinescript-vscode-extension

VS Code extension providing Pine Script v6 support: IntelliSense, validation, and CLI linting.

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
pnpm run generate         # Generate pine-data/v6/*.ts
pnpm run generate:syntax  # Generate syntaxes/pine.tmLanguage.json
pnpm run discover:behavior # Discover polymorphism → function-behavior.json

# CLI
node dist/packages/cli/src/cli.js <file.pine>

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

## Project Structure

```
packages/
├── pipeline/src/         # Data generation scripts
│   ├── crawl.ts          # Crawl TradingView reference
│   ├── scrape.ts         # Scrape function details
│   ├── generate.ts       # Generate TypeScript data
│   ├── generate-syntax.ts # Generate tmLanguage
│   └── discover-function-behavior.ts
├── core/src/             # Parser, analyzer, types (STABLE)
│   ├── parser/           # Lexer, parser, AST
│   └── analyzer/         # Type checker, builtins
├── language-service/src/ # Editor-agnostic language service (COMPLETE)
│   ├── PineLanguageService.ts  # Main facade class
│   ├── features/         # Completions, hover, diagnostics, etc.
│   └── documents/        # Document lifecycle management
├── lsp/src/              # LSP server (COMPLETE)
│   ├── server.ts         # JSON-RPC server over stdio
│   ├── handlers/         # LSP protocol handlers
│   └── converters.ts     # Type conversions
├── mcp/src/              # MCP server for AI assistants (COMPLETE)
│   ├── server.ts         # MCP server with tools/resources
│   └── bin/pine-mcp.ts   # CLI entry point
├── cli/src/              # CLI tool (STABLE)
└── vscode/src/           # VS Code extension (IN PROGRESS)

dev-tools/
├── test-snippet.js       # Quick Pine snippet testing via CLI
├── debug-internals.js    # Debug parser/validator/symbols directly
└── analysis/             # Comparison tools

pine-data/
├── v6/                   # Generated data (safe to regenerate)
│   ├── functions.ts      # 457 functions
│   ├── variables.ts      # 80 variables
│   ├── constants.ts      # 237 constants
│   └── function-behavior.json  # Polymorphism metadata
└── raw/v6/               # Scraped JSON data

syntaxes/
└── pine.tmLanguage.json  # Generated syntax highlighting
```

---

## Current Status

### Package Status

| Package | Status | Description |
|---------|--------|-------------|
| `packages/core/` | ✅ Stable | Parser, lexer, validator, type checker |
| `packages/cli/` | ✅ Stable | CLI validation tool |
| `packages/pipeline/` | ✅ Stable | Data generation scripts |
| `packages/language-service/` | ✅ Complete | Editor-agnostic language service |
| `packages/lsp/` | ✅ Complete | LSP server (JSON-RPC over stdio) |
| `packages/mcp/` | ✅ Complete | MCP server for AI assistants |
| `packages/vscode/` | ✅ Complete | Thin LSP client (197 lines) |
| `pine-data/` | ✅ Stable | Generated language data |
| `syntaxes/` | ✅ Stable | TextMate grammar |

### Corpus Validation

**44 of 49 v6 scripts pass validation (89.8%)**

Run `pnpm run debug:corpus --summary` for fresh stats.

5 failing scripts have source file issues (not parser bugs):
- `tdf-20251102.pine` - Missing commas between function arguments
- `854667873-nsdt-2.pine` - Broken comment (line wrap without `//`)
- `873410237-v6.pine` - Broken comments with Chinese characters
- `878477865-BigBeluga` - Broken comment + inconsistent switch indentation
- `894372674-Smrt-Algo` - `bar index` typo (should be `bar_index`)

### Test Suite

**72 tests passing** (51 in `packages/core/test/` + 21 in `packages/language-service/test/`)

---

## Recently Completed

### Architecture Refactor (December 2024)

Restructured the extension from monolithic to modular architecture:

| Before | After |
|--------|-------|
| `packages/lsp/` imported `vscode` directly | Editor-agnostic `packages/language-service/` |
| `packages/mcp/` was empty | Full MCP server with 4 tools, 3 resources |
| `packages/vscode/extension.ts` 530 lines | Thin LSP client at 197 lines |

**New Package Structure:**
```
packages/
├── language-service/     # Shared brain (21 tests)
│   ├── PineLanguageService.ts
│   ├── features/         # completions, hover, diagnostics, etc.
│   └── documents/        # Document lifecycle
├── lsp/                  # LSP server (JSON-RPC over stdio)
│   ├── server.ts
│   ├── handlers/
│   └── converters.ts
├── mcp/                  # MCP server for AI assistants
│   └── server.ts         # pine_validate, pine_lookup, etc.
└── vscode/               # Thin LSP client
    └── extension.ts      # 197 lines
```

---

## Data Pipeline

All API data is scraped from TradingView docs and generated:

| Command | Output |
|---------|--------|
| `crawl` | `pine-data/raw/v6/v6-language-constructs.json` |
| `scrape` | `pine-data/raw/v6/complete-v6-details.json` |
| `generate` | `pine-data/v6/*.ts` |
| `generate:syntax` | `syntaxes/pine.tmLanguage.json` |
| `discover:behavior` | `pine-data/v6/function-behavior.json` |

**Regenerating is safe** - customizations are in the scripts, not output files.

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

## Feature Analysis: Comparison to Best-in-Class Extensions

This section compares our Pine Script extension to industry-leading VS Code language extensions to identify gaps and prioritize improvements.

### Reference Extensions

| Extension | Language | Why It's Best-in-Class |
|-----------|----------|------------------------|
| **TypeScript** (built-in) | TS/JS | Gold standard for IDE features; same team builds language and tooling |
| **Pylance** (Microsoft) | Python | Excellent type inference, fast, great UX for dynamic language |
| **rust-analyzer** | Rust | Community-driven, excellent code navigation and refactoring |
| **Go** (Google) | Go | Clean, fast, well-integrated with language tooling |

---

### Feature Comparison Matrix

| Feature | TypeScript | Pylance | rust-analyzer | **Pine Script** | Gap |
|---------|------------|---------|---------------|-----------------|-----|
| **Completions** | ✅ | ✅ | ✅ | ✅ | None |
| **Hover docs** | ✅ | ✅ | ✅ | ✅ | None |
| **Signature help** | ✅ | ✅ | ✅ | ✅ | None |
| **Diagnostics** | ✅ | ✅ | ✅ | ✅ | None |
| **Formatting** | ✅ | ✅ | ✅ | ⚠️ Basic | Indentation, alignment |
| **Go to definition** | ✅ | ✅ | ✅ | ❌ | **Major gap** |
| **Find references** | ✅ | ✅ | ✅ | ❌ | **Major gap** |
| **Rename symbol** | ✅ | ✅ | ✅ | ❌ | Medium gap |
| **Document symbols** | ✅ | ✅ | ✅ | ❌ | Medium gap |
| **Workspace symbols** | ✅ | ✅ | ✅ | ❌ | Low priority |
| **Code actions** | ✅ | ✅ | ✅ | ❌ | Medium gap |
| **Semantic tokens** | ✅ | ✅ | ✅ | ❌ | Nice to have |
| **Inlay hints** | ✅ | ✅ | ✅ | ❌ | Nice to have |
| **Call hierarchy** | ✅ | ✅ | ✅ | ❌ | Low priority |
| **Folding ranges** | ✅ | ✅ | ✅ | ❌ | Nice to have |
| **Breadcrumbs** | ✅ | ✅ | ✅ | ❌ | Depends on document symbols |

---

### Current Feature Assessment

#### What We Do Well

**1. Completions (IntelliSense)** - ✅ Excellent
- 457 functions with full signatures, docs, and examples
- Context-aware: knows when you're in a function call vs top-level
- Parameter-aware: `color=` suggests `color.red`, `color.green`, etc.
- Namespace completions: `ta.` shows all technical analysis functions
- Snippet generation for function calls

**2. Hover Documentation** - ✅ Excellent
- Full markdown rendering with syntax blocks
- Parameter descriptions included
- Return type annotations
- Deprecation warnings shown

**3. Signature Help** - ✅ Excellent
- Active parameter highlighting
- Handles nested parentheses correctly
- Shows all parameters with types and descriptions

**4. Diagnostics** - ✅ Good
- Parser errors with accurate line/column
- Type checking for function arguments
- 11 Pine-specific pattern warnings (common mistakes)
- Real-time validation as you type

#### What's Missing or Incomplete

**1. Go to Definition** - ❌ Not implemented
- Cannot jump to where a variable/function is defined
- Cannot navigate to user-defined function bodies
- This is the #1 most-used navigation feature in any IDE

**2. Find All References** - ❌ Not implemented
- Cannot find all usages of a symbol
- Essential for understanding code impact before changes

**3. Rename Symbol** - ❌ Not implemented
- Cannot safely rename variables/functions across file
- Users must manually find/replace (error-prone)

**4. Document Symbols (Outline)** - ❌ Not implemented
- No outline view in sidebar
- No breadcrumb navigation
- Cannot quickly jump to functions/variables in file

**5. Code Actions / Quick Fixes** - ❌ Not implemented
- No "Extract to variable" refactoring
- No "Add missing import" suggestions
- No auto-fix for common errors

**6. Formatting** - ⚠️ Basic only
- Only trims trailing whitespace and normalizes blank lines
- No indentation rules
- No operator/parameter alignment
- No configurable style options

**7. Semantic Tokens** - ❌ Not implemented
- TextMate grammar only (regex-based highlighting)
- Cannot distinguish user variables from built-ins by color
- Cannot highlight based on resolved types

---

### What Makes Extensions Feel "Best-in-Class"

Based on analysis of top extensions, users perceive quality through:

1. **Navigation speed** - Can I jump to definitions instantly? (We can't)
2. **Refactoring confidence** - Can I rename safely? (We can't)
3. **Code understanding** - Can I see the outline/structure? (We can't)
4. **Error recovery** - Does it suggest fixes? (We don't)
5. **Responsiveness** - Is it fast? (We are, actually)
6. **Completions quality** - Are suggestions relevant? (Yes, we're good here)

Our extension excels at the "writing new code" experience but falls short on the "understanding/navigating existing code" experience.

---

### Work Items: Path to Best-in-Class

#### Priority 1: Navigation (High Impact)

**WI-1: Go to Definition**
- Implement `textDocument/definition` LSP handler
- Track symbol definitions during parsing (variables, functions, parameters)
- Build a symbol table mapping names to definition locations
- Handle: user variables, user functions, function parameters, for-loop variables
- Built-in symbols should show "this is a built-in" message or link to docs
- Files: `language-service/src/features/definition.ts`, `lsp/src/server.ts`
- Estimated complexity: Medium

**WI-2: Find All References**
- Implement `textDocument/references` LSP handler
- Track all usages of each symbol during validation pass
- Return list of locations where symbol is used
- Files: `language-service/src/features/references.ts`, `lsp/src/server.ts`
- Estimated complexity: Medium

**WI-3: Document Symbols (Outline)**
- Implement `textDocument/documentSymbol` LSP handler
- Walk AST to extract: functions, variables, imports
- Return hierarchical symbol tree
- Enables: outline view, breadcrumbs, go-to-symbol (Ctrl+Shift+O)
- Files: `language-service/src/features/symbols.ts`, `lsp/src/server.ts`
- Estimated complexity: Low

#### Priority 2: Refactoring (Medium Impact)

**WI-4: Rename Symbol**
- Implement `textDocument/rename` and `textDocument/prepareRename` LSP handlers
- Use references implementation to find all usages
- Generate text edits for all locations
- Validate: cannot rename built-ins, handle scope correctly
- Files: `language-service/src/features/rename.ts`, `lsp/src/server.ts`
- Estimated complexity: Medium (depends on WI-2)

**WI-5: Basic Code Actions**
- Implement `textDocument/codeAction` LSP handler
- Start with quick fixes for existing diagnostics:
  - "Add `//@version=6`" when missing
  - "Change `input.string()` to `input.timeframe()`" for HTF inputs
  - "Wrap with `not na()`" for time() boolean pitfall
- Files: `language-service/src/features/codeActions.ts`, `lsp/src/server.ts`
- Estimated complexity: Medium

#### Priority 3: Code Intelligence (Lower Impact, Nice to Have)

**WI-6: Semantic Tokens**
- Implement `textDocument/semanticTokens/full` LSP handler
- Provide token types: function, variable, parameter, property, keyword
- Provide modifiers: declaration, definition, readonly, deprecated
- Enables: theme-aware coloring that distinguishes user vs built-in symbols
- Files: `language-service/src/features/semanticTokens.ts`, `lsp/src/server.ts`
- Estimated complexity: Medium

**WI-7: Inlay Hints**
- Implement `textDocument/inlayHint` LSP handler
- Show parameter names at call sites: `ta.sma(close, /*length:*/ 14)`
- Show inferred types for variables: `x /*: float*/ = 1.5`
- Files: `language-service/src/features/inlayHints.ts`, `lsp/src/server.ts`
- Estimated complexity: Low

**WI-8: Folding Ranges**
- Implement `textDocument/foldingRange` LSP handler
- Fold: function bodies, if/else blocks, for/while loops, switch cases
- Files: `language-service/src/features/folding.ts`, `lsp/src/server.ts`
- Estimated complexity: Low

#### Priority 4: Formatting (Quality of Life)

**WI-9: Enhanced Formatting**
- Add indentation normalization (consistent 4-space or tab)
- Add operator spacing rules (`a+b` → `a + b`)
- Add alignment for multi-line function arguments
- Consider using a configurable formatter like prettier-style
- Files: `language-service/src/features/formatting.ts`
- Estimated complexity: Medium-High

#### Priority 5: External Integration

**WI-10: Library Import Resolution**

Pine Script libraries use `import User/Library/Version` syntax (e.g., `import TradingView/ta/12`), but this doesn't map to any discoverable location:
- No local path convention exists
- URLs are unpredictable (e.g., `TradingView/ta/12` → `tradingview.com/script/BICzyhq0-ta/` - the hash is opaque)
- TradingView has no public API for fetching library source code

**Solution: Triple-slash source directive**

```pine
/// @source ./libs/ta-v12.pine
import TradingView/ta/12 as ta
```

The `/// @source` comment immediately before an import tells the language service where to find the library source locally. This follows TypeScript's triple-slash reference pattern (`/// <reference path="..." />`).

**Implementation steps:**
1. In parser/lexer, detect `/// @source <path>` comments and attach to following import AST node
2. When processing imports, check for attached source directive
3. Parse the referenced library file
4. Extract exported functions/variables/types (look for `export` keyword)
5. Provide completions for `alias.` namespace (e.g., `ta.sma()`, `ta.ema()`)
6. Include library symbols in hover, signature help, go-to-definition
7. If no `/// @source` directive, show diagnostic: "Library source not specified. Add `/// @source <path>` above import."

**Why this approach:**
- Co-located with import (easy to see mapping)
- No config files to manage
- Per-import granularity
- Portable (works in LSP, CLI, MCP)
- Follows established triple-slash pattern from TypeScript

**Files to create/modify:**
- `packages/core/src/parser/parser.ts` - Attach source directive to import AST
- `packages/language-service/src/features/imports.ts` - Import resolution and library parsing
- `packages/language-service/src/features/completions.ts` - Add library completions
- `packages/language-service/src/features/hover.ts` - Show library symbol docs

**Estimated complexity:** High (cross-cutting feature affecting multiple systems)

---

### Implementation Plan

#### Why Parallelization Is Limited

Almost every work item modifies the same shared files:
- `lsp/src/server.ts` - handler setup
- `lsp/src/capabilities.ts` - capability declaration
- `language-service/src/PineLanguageService.ts` - method exposure
- `language-service/src/types.ts` - type definitions

Parallel subagents would create merge conflicts. **Execution must be mostly sequential.**

#### Dependency Graph

```
WI-0 (Symbol Table) ─┬─→ WI-1 (Definition) ─→ WI-2 (References) ─→ WI-4 (Rename)
                     │
                     └─→ WI-6 (Semantic Tokens)

WI-3 (Document Symbols) ─→ standalone (walks AST)
WI-5 (Code Actions) ─→ standalone (uses existing diagnostics)
WI-7 (Inlay Hints) ─→ standalone (uses existing type info)
WI-8 (Folding Ranges) ─→ standalone (walks AST)
WI-9 (Formatting) ─→ standalone
WI-10 (Library Imports) ─→ standalone but touches many files
```

#### Execution Order

**Phase 0: Symbol Table Infrastructure** (prerequisite for navigation)
- Modify `checker.ts` to build symbol table during validation
- Track: definition locations, reference locations, symbol kinds, scopes
- This is new infrastructure that WI-1, WI-2, WI-6 depend on

**Phase 1: Core Navigation** (sequential, high impact)
1. WI-3: Document Symbols - enables outline view, Ctrl+Shift+O
2. WI-1: Go to Definition - highest user impact
3. WI-2: Find References - builds on symbol table from WI-1

**Phase 2: Refactoring** (sequential, depends on Phase 1)
4. WI-4: Rename Symbol - uses WI-2's reference finding

**Phase 3: Polish Features** (sequential, but independent of Phases 1-2)
5. WI-5: Code Actions - quick fixes for existing diagnostics
6. WI-7: Inlay Hints - parameter names, type annotations
7. WI-8: Folding Ranges - code folding

**Phase 4: Advanced** (sequential)
8. WI-6: Semantic Tokens - benefits from symbol table
9. WI-9: Enhanced Formatting
10. WI-10: Library Imports - most complex, do last

#### Parallelization Opportunities

**Minimal.** The only safe parallel execution:

1. **Phase 0 + WI-9 in parallel**: Symbol table work is in `checker.ts`, formatting is in `formatting.ts` - no overlap.

2. **Research in parallel**: Before starting implementation, research tasks can run in parallel:
   - Subagent A: Research how rust-analyzer implements document symbols
   - Subagent B: Research LSP semantic token protocol
   - Subagent C: Prototype symbol table data structure

After research, implementation must be sequential due to shared file modifications.

#### Estimated Effort Per Phase

| Phase | Work Items | New Files | Modified Files | Complexity |
|-------|------------|-----------|----------------|------------|
| 0 | Symbol Table | 0 | 2-3 | Medium |
| 1 | WI-3, WI-1, WI-2 | 6 | 4 | Medium |
| 2 | WI-4 | 2 | 4 | Low |
| 3 | WI-5, WI-7, WI-8 | 6 | 4 | Low-Medium |
| 4 | WI-6, WI-9, WI-10 | 3 | 5+ | Medium-High |

---

### Architecture Notes for Implementation

The language service already tracks parsed documents with full ASTs. To implement navigation:

1. **Symbol Table** - During parsing/validation, build a map:
   ```typescript
   interface SymbolInfo {
     name: string;
     kind: 'variable' | 'function' | 'parameter';
     definitionLocation: Location;
     references: Location[];
     type?: string;
   }
   ```

2. **Scope Tracking** - Pine has simple scoping:
   - Global scope (top-level declarations)
   - Function scope (parameters + local vars)
   - Block scope (for-loop variables, if-block variables)

3. **Built-in Detection** - Check `FUNCTIONS_BY_NAME`, `VARIABLES_BY_NAME`, `CONSTANTS_BY_NAME` before treating as user-defined.

The `UnifiedPineValidator` in `checker.ts` already walks the AST and tracks some symbol info. Extending it to build a proper symbol table is the key infrastructure work.

---

## Future Work (Out of Scope for Current Items)

- **Library imports for IntelliSense** - Handle `import User/Lib/1` for local development in LSP/VS Code extension (fetch/cache library definitions)
- **language-configuration.json autogeneration** - Consider generating from pine-data
- **Fuzzer implementation** - Property-based testing for parser robustness

---

## Comparison Tool

Compare CLI output against TradingView's pine-lint:

```bash
node dev-tools/compare-validation-results.js
```
