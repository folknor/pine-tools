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
├── language-service/src/ # Language service (TO BE CREATED)
├── lsp/src/              # LSP server (TO BE REIMPLEMENTED)
├── mcp/src/              # MCP server (TO BE IMPLEMENTED)
├── cli/src/              # CLI tool (STABLE)
└── vscode/src/           # VS Code extension (TO BE REIMPLEMENTED)

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

### Stable Components (No Changes Needed)

| Package | Status | Description |
|---------|--------|-------------|
| `packages/core/` | ✅ Stable | Parser, lexer, validator, type checker |
| `packages/cli/` | ✅ Stable | CLI validation tool |
| `packages/pipeline/` | ✅ Stable | Data generation scripts |
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

**51 tests passing** in `packages/core/test/`

---

## Major Work Items

### Work Item 1: Create Language Service Layer

**Priority: High | Effort: Medium | Prerequisite for LSP/MCP/VSCode**

#### Problem
The current `packages/lsp/` directly imports `vscode` module, making it unusable outside VS Code. Both LSP and MCP need the same language intelligence but currently there's no shared abstraction.

#### Solution
Create `packages/language-service/` as an editor-agnostic language service that both LSP and MCP can consume.

#### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    PineLanguageService                          │
├─────────────────────────────────────────────────────────────────┤
│ Document Management:                                            │
│   openDocument(uri, content, version)                           │
│   updateDocument(uri, content, version)                         │
│   closeDocument(uri)                                            │
├─────────────────────────────────────────────────────────────────┤
│ Intelligence Features:                                          │
│   getCompletions(uri, position) → CompletionItem[]              │
│   getHover(uri, position) → HoverInfo | null                    │
│   getDiagnostics(uri) → Diagnostic[]                            │
│   getSignatureHelp(uri, position) → SignatureHelp | null        │
│   format(uri, options) → TextEdit[]                             │
│   getDefinition(uri, position) → Location | null                │
│   getReferences(uri, position) → Location[]                     │
│   getDocumentSymbols(uri) → DocumentSymbol[]                    │
├─────────────────────────────────────────────────────────────────┤
│ Internal State:                                                 │
│   documents: Map<uri, ParsedDocument>                           │
│   symbolTable: SymbolTable                                      │
└─────────────────────────────────────────────────────────────────┘
```

#### Files to Create
```
packages/language-service/
├── src/
│   ├── index.ts                 # Public exports
│   ├── PineLanguageService.ts   # Main service class
│   ├── types.ts                 # Protocol-agnostic types
│   │   ├── Position, Range, Location
│   │   ├── CompletionItem, CompletionItemKind
│   │   ├── Diagnostic, DiagnosticSeverity
│   │   ├── HoverInfo, SignatureHelp
│   │   └── TextEdit, DocumentSymbol
│   ├── features/
│   │   ├── completions.ts       # Completion logic (from current lsp/)
│   │   ├── hover.ts             # Hover logic
│   │   ├── diagnostics.ts       # Validation + pattern checks
│   │   ├── signatures.ts        # Signature help
│   │   ├── formatting.ts        # Code formatting
│   │   ├── definition.ts        # Go-to-definition
│   │   └── symbols.ts           # Document symbols
│   └── documents/
│       ├── DocumentManager.ts   # Document lifecycle
│       └── ParsedDocument.ts    # Cached parse results
└── test/
    └── service.test.ts
```

#### Implementation Steps
1. Create `packages/language-service/src/types.ts` with protocol-agnostic types
2. Create `DocumentManager` for document lifecycle
3. Port completion logic from `packages/lsp/` (remove vscode imports)
4. Port hover logic (remove vscode imports)
5. Port signature help logic (remove vscode imports)
6. Move hardcoded validation patterns from `packages/vscode/extension.ts` to `diagnostics.ts`
7. Create `PineLanguageService` facade class
8. Add unit tests

#### Success Criteria
- [ ] Zero imports from `vscode` module
- [ ] All current IntelliSense features working
- [ ] Hardcoded validation patterns moved from extension.ts
- [ ] Unit tests for each feature
- [ ] Can be consumed by both LSP and MCP

---

### Work Item 2: Reimplement LSP Server

**Priority: High | Effort: Medium | Depends on: Work Item 1**

#### Problem
Current `packages/lsp/` is not a proper LSP server - it's a collection of helpers that return VS Code types. Need a real LSP server using `vscode-languageserver`.

#### Solution
Implement proper LSP server that wraps `PineLanguageService` and communicates via JSON-RPC.

#### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                       LSP Server                                │
├─────────────────────────────────────────────────────────────────┤
│ Transport: stdio | socket | IPC                                 │
├─────────────────────────────────────────────────────────────────┤
│ Protocol Handlers:                                              │
│   initialize → capabilities                                     │
│   textDocument/didOpen → diagnostics                            │
│   textDocument/didChange → diagnostics                          │
│   textDocument/completion → completions                         │
│   textDocument/hover → hover                                    │
│   textDocument/signatureHelp → signatures                       │
│   textDocument/formatting → edits                               │
│   textDocument/definition → location                            │
│   textDocument/references → locations                           │
│   textDocument/documentSymbol → symbols                         │
├─────────────────────────────────────────────────────────────────┤
│ Delegates to: PineLanguageService                               │
└─────────────────────────────────────────────────────────────────┘
```

#### Files to Create
```
packages/lsp/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # LSP server setup
│   ├── capabilities.ts    # Server capabilities
│   └── handlers/
│       ├── lifecycle.ts   # initialize, shutdown
│       ├── documents.ts   # didOpen, didChange, didClose
│       ├── completion.ts  # textDocument/completion
│       ├── hover.ts       # textDocument/hover
│       ├── signature.ts   # textDocument/signatureHelp
│       ├── formatting.ts  # textDocument/formatting
│       ├── definition.ts  # textDocument/definition
│       └── symbols.ts     # textDocument/documentSymbol
├── bin/
│   └── pine-lsp.ts        # CLI entry point
└── test/
    └── lsp.test.ts
```

#### Dependencies
```json
{
  "dependencies": {
    "vscode-languageserver": "^9.0.0",
    "vscode-languageserver-textdocument": "^1.0.0"
  }
}
```

#### Implementation Steps
1. Delete current `packages/lsp/src/languageService/` (will be replaced by language-service/)
2. Set up LSP server with `vscode-languageserver`
3. Implement lifecycle handlers (initialize, shutdown)
4. Implement document sync handlers
5. Wire each LSP method to corresponding `PineLanguageService` method
6. Add CLI entry point for standalone usage
7. Add integration tests

#### Success Criteria
- [ ] Works as standalone process (stdio transport)
- [ ] All current features exposed via LSP
- [ ] Can be used by any LSP-compatible editor (Neovim, Sublime, etc.)
- [ ] Integration tests passing

---

### Work Item 3: Implement MCP Server

**Priority: High | Effort: Medium | Depends on: Work Item 1**

#### Problem
`packages/mcp/` is empty. Need MCP server for AI assistant integration (Claude, Cursor, etc.).

#### Solution
Implement MCP server using `@modelcontextprotocol/sdk` that exposes Pine Script intelligence as tools.

#### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                       MCP Server                                │
├─────────────────────────────────────────────────────────────────┤
│ Transport: stdio                                                │
├─────────────────────────────────────────────────────────────────┤
│ Tools:                                                          │
│   pine_validate                                                 │
│     Input: { code: string }                                     │
│     Output: { errors: Diagnostic[], warnings: Diagnostic[] }    │
│                                                                 │
│   pine_complete                                                 │
│     Input: { code: string, line: number, character: number }    │
│     Output: { completions: CompletionItem[] }                   │
│                                                                 │
│   pine_hover                                                    │
│     Input: { symbol: string }                                   │
│     Output: { documentation: string, type?: string }            │
│                                                                 │
│   pine_lookup_function                                          │
│     Input: { name: string }                                     │
│     Output: { syntax: string, description: string, params: [] } │
│                                                                 │
│   pine_list_functions                                           │
│     Input: { namespace?: string }                               │
│     Output: { functions: string[] }                             │
│                                                                 │
│   pine_format                                                   │
│     Input: { code: string }                                     │
│     Output: { formatted: string }                               │
├─────────────────────────────────────────────────────────────────┤
│ Resources:                                                      │
│   pine://reference/functions                                    │
│   pine://reference/variables                                    │
│   pine://reference/constants                                    │
│   pine://docs/{symbol}                                          │
├─────────────────────────────────────────────────────────────────┤
│ Delegates to: PineLanguageService + pine-data                   │
└─────────────────────────────────────────────────────────────────┘
```

#### Files to Create
```
packages/mcp/
├── src/
│   ├── index.ts           # Entry point
│   ├── server.ts          # MCP server setup
│   ├── tools/
│   │   ├── validate.ts    # pine_validate tool
│   │   ├── complete.ts    # pine_complete tool
│   │   ├── hover.ts       # pine_hover tool
│   │   ├── lookup.ts      # pine_lookup_function tool
│   │   ├── list.ts        # pine_list_functions tool
│   │   └── format.ts      # pine_format tool
│   └── resources/
│       ├── reference.ts   # Reference documentation
│       └── docs.ts        # Symbol documentation
├── bin/
│   └── pine-mcp.ts        # CLI entry point
└── test/
    └── mcp.test.ts
```

#### Implementation Steps
1. Set up MCP server with `@modelcontextprotocol/sdk`
2. Implement `pine_validate` tool (highest priority for AI usage)
3. Implement `pine_lookup_function` and `pine_list_functions` tools
4. Implement `pine_hover` tool
5. Implement `pine_complete` tool
6. Implement `pine_format` tool
7. Add resource handlers for documentation browsing
8. Add integration tests
9. Document MCP configuration for Claude Desktop

#### Success Criteria
- [ ] Works with Claude Desktop
- [ ] `pine_validate` returns accurate diagnostics
- [ ] AI can look up function documentation
- [ ] Integration tests passing

---

### Work Item 4: Reimplement VS Code Extension

**Priority: High | Effort: Low | Depends on: Work Item 2**

#### Problem
Current `packages/vscode/extension.ts` has:
- 530 lines of mixed concerns
- 11 hardcoded validation patterns that belong in core
- Direct parser/validator calls instead of using LSP

#### Solution
Thin VS Code extension that is purely an LSP client, plus minimal VS Code-specific features.

#### Architecture
```
┌─────────────────────────────────────────────────────────────────┐
│                    VS Code Extension                            │
├─────────────────────────────────────────────────────────────────┤
│ LSP Client:                                                     │
│   - Spawns pine-lsp server process                              │
│   - Forwards all language features to LSP                       │
├─────────────────────────────────────────────────────────────────┤
│ VS Code-Specific Features:                                      │
│   - File association (*.pine → pine)                            │
│   - Commands (pine.validate, pine.showDocs)                     │
│   - Status bar integration                                      │
│   - Settings UI                                                 │
└─────────────────────────────────────────────────────────────────┘
```

#### Files to Create
```
packages/vscode/
├── src/
│   ├── extension.ts       # Activation, LSP client setup
│   ├── commands.ts        # VS Code commands
│   └── settings.ts        # Configuration handling
└── test/
    └── extension.test.ts
```

#### Dependencies
```json
{
  "dependencies": {
    "vscode-languageclient": "^9.0.0"
  }
}
```

#### Implementation Steps
1. Remove all validation logic (now in language-service/)
2. Remove completion/hover/signature providers (now via LSP)
3. Set up LSP client using `vscode-languageclient`
4. Configure client to spawn `pine-lsp` server
5. Keep VS Code-specific commands
6. Keep file association logic
7. Update package.json with LSP server bundling

#### Success Criteria
- [ ] Extension.ts < 150 lines
- [ ] All features work via LSP
- [ ] No hardcoded validation patterns
- [ ] Extension size reduced

---

## Implementation Order

```
┌──────────────────────────────────────────────────────────────────┐
│  Phase 1: Foundation                                             │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Work Item 1: Language Service Layer                       │  │
│  │  - Create packages/language-service/                       │  │
│  │  - Port all intelligence features                          │  │
│  │  - Move validation patterns from extension.ts              │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Phase 2: Protocol Servers (can be parallel)                     │
│  ┌──────────────────────────┐  ┌──────────────────────────────┐  │
│  │  Work Item 2: LSP Server │  │  Work Item 3: MCP Server     │  │
│  │  - Proper JSON-RPC       │  │  - AI assistant tools        │  │
│  │  - All LSP methods       │  │  - Documentation resources   │  │
│  └──────────────────────────┘  └──────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  Phase 3: Editor Integration                                     │
│  ┌────────────────────────────────────────────────────────────┐  │
│  │  Work Item 4: VS Code Extension                            │  │
│  │  - Thin LSP client                                         │  │
│  │  - VS Code-specific features only                          │  │
│  └────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────┘
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

## Future Work (Out of Scope for Current Items)

- **Library imports for IntelliSense** - Handle `import User/Lib/1` for local development in LSP/VS Code extension (fetch/cache library definitions)
- **language-configuration.json autogeneration** - Consider generating from pine-data
- **Fuzzer implementation** - Property-based testing for parser robustness

---

## Comparison Tool

Compare CLI output against TradingView's pine-lint:

```bash
node dev-tools/analysis/compare-validation-results.js
```
