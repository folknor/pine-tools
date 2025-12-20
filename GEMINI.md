# Pine Script v6 Extension - Development Guide

**Project:** Pine Script v6 VS Code Extension  
**Repository:** https://github.com/folknor/pinescript-vscode-extension  
**Purpose:** Professional Pine Script v6 development in VS Code with IntelliSense, real-time validation, and 100% language coverage.

---

## 🎯 Project Overview

This is a **VS Code extension** that provides comprehensive Pine Script v6 support including:
- **Real-time validation** with zero false positives
- **IntelliSense** for 6,665+ language constructs
- **Function signature help** and hover documentation
- **Parameter validation** for all built-in functions
- **CLI tool** for standalone validation

The extension is built with **TypeScript** and follows VS Code extension patterns.

---

## 📁 Project Structure

```
src/                    # Main extension source code
├── extension.ts         # VS Code extension entry point
├── cli.ts             # CLI validation tool entry point
├── completions.ts      # IntelliSense providers
├── signatureHelp.ts    # Function signature help
└── parser/            # Pine Script language processing
    ├── lexer.ts        # Tokenization
    ├── parser.ts       # AST building
    ├── ast.ts          # AST node definitions
    ├── astExtractor.ts # Function/variable extraction
    ├── comprehensiveValidator.ts # Main validation logic
    ├── semanticAnalyzer.ts # Type checking
    ├── symbolTable.ts  # Variable tracking
    ├── typeSystem.ts   # Type inference
    └── validator.ts    # Legacy validator

v6/                     # Pine Script v6 language data
├── raw/               # Scraped TradingView data
├── parameter-requirements.ts # Manual function specs (32 critical functions)
├── parameter-requirements-generated.ts # Auto-generated specs (457 functions)
├── pine-constants-complete.ts # All v6 constants
└── scripts/           # Data generation scripts

pine/                   # Test Pine Script files
├── indicators-processed/  # Successfully parsed indicators
├── strategies-processed/  # Successfully parsed strategies
├── indicators-todo/       # Challenging indicators (for development)
└── strategies-todo/       # Challenging strategies (for development)

examples/               # Example Pine Script files
test/                   # Test suite
dev-tools/              # Development and debugging tools
├── analysis/           # Analysis scripts
├── debug/             # Debug utilities
└── testing/           # QA automation tools
```

---

## 🛠️ Essential Commands

### Development Workflow
```bash
# Install dependencies
pnpm install

# Build the extension
pnpm run build

# Watch for changes during development
pnpm run watch

# Run full test suite
pnpm test

# Lint code (uses Biome)
pnpm run lint
# or
pnpm run check
```

### Testing & Validation
```bash
# Run validation tests only
pnpm run test:validation

# Run benchmark tests
pnpm run test:benchmark

# Validate all Pine Script files in project (QA)
pnpm run qa:pinescript

# Watch mode for continuous validation
pnpm run qa:pinescript:watch

# Test MCP server
pnpm run test:mcp
```

### Build & Package
```bash
# Clean build artifacts
pnpm run clean

# Package extension (creates .vsix)
pnpm run package

# Full rebuild with tests
pnpm run rebuild

# Rebuild without tests (faster)
pnpm run rebuild:skip-tests
```

### Language Data Management
```bash
# Crawl TradingView documentation
pnpm run crawl

# Generate built-in functions from scraped data
pnpm run generate

# Alternative scraping method
pnpm run scrape
```

---

## 🧪 Testing Strategy

### Test Structure
- **Unit tests** in `test/validation.test.js` - Test parameter requirements
- **Integration tests** in `test/` - Test parser and validator end-to-end
- **QA automation** in `dev-tools/testing/` - Validate real Pine Script files
- **Benchmark tests** - Performance testing

### Test Categories
1. **Parameter Validation**: Ensures function signatures match TradingView specs
2. **Parsing Tests**: Validates AST construction from Pine Script code
3. **Regression Tests**: Prevents breaking changes to existing functionality
4. **Real-world Tests**: Validates against actual Pine Script indicators/strategies

### Running Tests
```bash
# Run specific test file
node --test test/validation.test.js

# Run all tests
pnpm test

# Validate specific Pine Script file
node dist/src/cli.js path/to/script.pine
```

---

## 🔧 Development Patterns

### Code Style (Biome Configuration)
- **Formatter**: Enabled (auto-format on save recommended)
- **Linter**: Enabled with strict rules
- **File patterns**: TypeScript files (`**/*.ts`) excluding generated files
- **Excludes**: `**/*.generated.js`, `**/dist`

### TypeScript Configuration
- **Target**: ES2022
- **Module**: CommonJS (for VS Code compatibility)
- **Strict mode**: Enabled
- **Source maps**: Generated for debugging

### Parser Architecture
1. **Lexer** (`lexer.ts`): Tokenizes Pine Script source code
2. **Parser** (`parser.ts`): Builds AST from tokens
3. **AST Extractor** (`astExtractor.ts`): Extracts functions/variables
4. **Semantic Analyzer** (`semanticAnalyzer.ts`): Type checking and symbol resolution
5. **Validator** (`comprehensiveValidator.ts`): Final validation with error reporting

### Validation Pipeline
```typescript
// Typical validation flow
const parser = new Parser(code);
const ast = parser.parse();

const lexerErrors = parser.getLexerErrors();
const extractor = new ASTExtractor();
const result = extractor.extract(ast);

const validator = new ComprehensiveValidator();
const errors = validator.validate(ast, result);
```

---

## 📊 Data Sources & Management

### Primary Language Data
- **Manual specs** (`v6/parameter-requirements.ts`): 32 critical functions, 100% accurate
- **Generated specs** (`v6/parameter-requirements-generated.ts`): 457 functions, 95% accurate
- **Constants** (`v6/pine-constants-complete.ts`): All v6 constants
- **Raw data** (`v6/raw/`): Scraped TradingView documentation

### Data Generation Workflow
1. **Scrape** TradingView documentation (`pnpm run crawl`)
2. **Process** raw data into structured format
3. **Generate** TypeScript definitions (`pnpm run generate`)
4. **Validate** generated data against test suite
5. **Manual review** of critical function specifications

---

## 🐛 Debugging Tools

### Development Debugging
```bash
# Debug specific parsing issues
node dev-tools/debug/debug-parser.js path/to/script.pine

# Debug lexer output
node dev-tools/debug/debug-lexer.js path/to/script.pine

# Analyze parsing errors
node dev-tools/analysis/analyze-parsing-errors.js
```

### Validation Debugging
```bash
# Test comprehensive validator
node dev-tools/testing/test-comprehensive-validator.js

# Check AST coverage
node dev-tools/analysis/check-ast-coverage.js

# Validate all examples
node dev-tools/testing/validate-all-examples.js
```

### CLI Usage
```bash
# Validate single file
./dist/src/cli.js path/to/script.pine

# Output format: JSON with errors/warnings
{
  "success": false,
  "errors": [
    {
      "message": "Too many arguments for plot()",
      "line": 10,
      "column": 15,
      "severity": 0
    }
  ]
}
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow
- **Triggers**: Push to main/develop, PR to main
- **Matrix**: Node.js 18.x and 20.x
- **Steps**:
  1. Checkout code
  2. Setup Node.js
  3. Install dependencies (`npm ci`)
  4. Run linting
  5. Run tests
  6. Build extension
  7. Package artifact

### Quality Gates
- **All tests must pass** on both Node.js versions
- **Linting must pass** with Biome
- **Build must succeed** without errors
- **Extension must package** correctly

---

## 📝 Important Gotchas & Patterns

### Extension Development
1. **VS Code API**: Use official VS Code extension API patterns
2. **Activation Events**: Extension activates on `onLanguage:pine`
3. **File Associations**: Automatically maps `.pine` files to pine language
4. **Disposable Resources**: Clean up resources in `deactivate()` method

### Parser Development
1. **Error Recovery**: Parser should continue after syntax errors
2. **Version Detection**: Support both v5 and v6 syntax
3. **Performance**: Validate large files efficiently
4. **Memory**: Avoid memory leaks in long-running processes

### Validation Rules
1. **Parameter Count**: Exact matching of required/optional parameters
2. **Parameter Names**: Validate parameter names (e.g., `style=` not `shape=`)
3. **Namespace Validation**: Check function namespace existence
4. **Constant Validation**: Verify all constants exist in v6

### Testing Patterns
1. **Real-world Files**: Test against actual Pine Script code
2. **Edge Cases**: Include malformed code in test suite
3. **Performance**: Benchmark validation speed
4. **Regression**: Prevent breaking changes to existing functionality

---

## 🚀 Performance Considerations

### Extension Performance
- **Lazy Loading**: Load language data on demand
- **Caching**: Cache validation results when possible
- **Incremental Updates**: Revalidate only changed portions
- **Memory Management**: Clean up unused resources

### Parser Performance
- **Single Pass**: Parse and validate in one pass when possible
- **Early Exit**: Stop parsing on critical errors
- **Optimized Data Structures**: Use efficient algorithms for lookups
- **Parallel Processing**: Process multiple files independently

---

## 🔗 External Dependencies

### VS Code Extension API
- **Main API**: `vscode` module
- **Language Features**: `vscode.languages.*`
- **Diagnostics**: `vscode.languages.createDiagnosticCollection`
- **Completion**: `vscode.languages.registerCompletionItemProvider`

### Node.js Modules
- **File System**: `node:fs`, `node:path`
- **Testing**: Built-in `node:test` framework
- **TypeScript**: For type checking and compilation
- **Biome**: For linting and formatting

### Development Tools
- **Glob**: File pattern matching (`glob` package)
- **Cheerio**: HTML parsing for web scraping
- **Playwright**: For integration testing
- **MCP SDK**: Model Context Protocol integration

---

## 📚 Reference Documentation

### Internal Documentation
- **AI Assistant Guide**: `docs/AI-ASSISTANT-GUIDE.md`
- **Architecture Decisions**: `docs/ADR-*.md`
- **Testing Guide**: `docs/TESTING-GUIDE.md`
- **Publishing Guide**: `docs/PUBLISHING-GUIDE.md`

### External References
- **VS Code Extension API**: https://code.visualstudio.com/api
- **Pine Script v6 Docs**: https://www.tradingview.com/pine-script-docs/
- **TypeScript Handbook**: https://www.typescriptlang.org/docs/
- **Biome Linter**: https://biomejs.dev/

---

## 🏗️ Contributing Guidelines

### Code Contribution Flow
1. **Fork** repository and create feature branch
2. **Implement** changes following existing patterns
3. **Test** thoroughly with provided test suite
4. **Lint** code with Biome (`pnpm run lint`)
5. **Commit** with conventional commit messages
6. **PR** to main branch with description

### Adding New Functions
1. **Update** `v6/parameter-requirements.ts` for critical functions
2. **Regenerate** auto-generated specs (`pnpm run generate`)
3. **Add** test cases to `test/validation.test.js`
4. **Validate** with real Pine Script examples
5. **Update** documentation if needed

### Bug Fixes
1. **Reproduce** issue with minimal example
2. **Add** failing test case
3. **Fix** underlying issue
4. **Verify** fix with all tests
5. **Document** any behavior changes

---

**Last Updated:** Based on project structure analysis  
**Maintainer:** Jaroslav Pantsjoha (@jpantsjoha)  
**License:** MIT