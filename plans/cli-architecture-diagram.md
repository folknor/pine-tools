# CLI Tool Architecture Diagram

## Current Architecture (Before Changes)

```
┌─────────────────────────────────────────────────────────────┐
│ VSCode Extension (extension.ts)                              │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Diagnostics Provider                                  │   │
│  │                                                        │   │
│  │  text → Parser → AST → ComprehensiveValidator         │   │
│  │                              ↓                         │   │
│  │                        ValidationError[]              │   │
│  │                              ↓                         │   │
│  │                        VSCode Diagnostics             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CLI Tool (cli.ts) - BEFORE                                   │
│                                                               │
│  args[] → For each file:                                     │
│    └→ fs.readFile()                                          │
│         └→ Parser → AST → ComprehensiveValidator             │
│                              ↓                                │
│                        ValidationError[]                     │
│                              ↓                                │
│  Output: [                                                   │
│    {                                                          │
│      file: "path",                                           │
│      errors: ValidationError[],                              │
│      success: bool                                           │
│    }                                                          │
│  ]                                                            │
└─────────────────────────────────────────────────────────────┘
```

## New Architecture (After Changes)

```
┌─────────────────────────────────────────────────────────────┐
│ VSCode Extension (extension.ts) - UNCHANGED                  │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Diagnostics Provider                                  │   │
│  │                                                        │   │
│  │  text → Parser → AST → ComprehensiveValidator         │   │
│  │                              ↓                         │   │
│  │                        ValidationError[]              │   │
│  │                              ↓                         │   │
│  │                        VSCode Diagnostics             │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                            ↑
                            │ NO CHANGES - Extension keeps working
                            
┌─────────────────────────────────────────────────────────────┐
│ NEW: ASTExtractor (astExtractor.ts)                          │
│                                                               │
│  extract(ast: Program) → PineLintResult                      │
│    ├─ extractVariables(ast)                                  │
│    │    └→ Walks AST VariableDeclarations                    │
│    │       └→ Maps types to pine-lint strings                │
│    │          └→ Tracks position/scope                       │
│    │                                                          │
│    ├─ extractFunctions(ast)                                  │
│    │    └→ Walks AST FunctionDeclarations                    │
│    │       └→ Extracts parameters                            │
│    │          └→ Infers return types                         │
│    │             └→ Generates syntax strings                 │
│    │                                                          │
│    ├─ extractTypes(ast)                                      │
│    │    └→ Walks AST TypeDeclarations (v6)                   │
│    │                                                          │
│    └─ extractEnums(ast)                                      │
│         └→ Walks AST EnumDeclarations (if applicable)        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ CLI Tool (cli.ts) - AFTER                                    │
│                                                               │
│  args[0] → Single file path (matches pine-lint)             │
│    ↓                                                          │
│  fs.readFile()                                               │
│    ↓                                                          │
│  Parser.parse() → AST                                        │
│    ↓                                                          │
│  ASTExtractor.extract(ast) → PineLintResult                 │
│    ↓                                                          │
│  Output: {                                                   │
│    success: true,                                            │
│    result: {                                                 │
│      variables: [                                            │
│        {                                                      │
│          name: "varName",                                    │
│          type: "input int" | "series float" | etc.,         │
│          definition: {                                       │
│            start: { line, column },                          │
│            end: { line, column }                             │
│          },                                                   │
│          scopeId: "#1" (optional)                            │
│        }                                                      │
│      ],                                                       │
│      functions: [                                            │
│        {                                                      │
│          name: "funcName",                                   │
│          definition: { start, end },                         │
│          args: [                                             │
│            {                                                  │
│              name: "param",                                  │
│              required: true,                                 │
│              allowedTypeIDs: [],                             │
│              displayType: "undetermined type"                │
│            }                                                  │
│          ],                                                   │
│          returnedTypes: [],                                  │
│          syntax: ["funcName(param) → returnType"]           │
│        }                                                      │
│      ],                                                       │
│      types: [],                                              │
│      enums: []                                               │
│    }                                                          │
│  }                                                            │
│                                                               │
│  On Parse Error:                                             │
│  Output: {                                                   │
│    success: false,                                           │
│    error: "Parse error message"                              │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
```

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          pine-lint (Official)                        │
│                                                                       │
│  PineScript File → Official Parser → Official AST → Official Analysis│
│                                                          ↓            │
│                                                    pine-lint Output   │
└─────────────────────────────────────────────────────────────────────┘
                                    ↓
                         Target Output Format
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      pine-validate (Our Tool)                        │
│                                                                       │
│  PineScript File → Our Parser → Our AST → ASTExtractor               │
│                                                  ↓                    │
│                                       Compatible Output               │
└─────────────────────────────────────────────────────────────────────┘
```

## Type Mapping Flow

```
Parser/AST Type → ComprehensiveValidator Type → pine-lint Type String
─────────────────────────────────────────────────────────────────────
Literal(42)      → int                        → "simple int"
CallExpr(input.int()) → "input<int>"         → "input int"
CallExpr(ta.sma())    → "series<float>"      → "series float"
Unknown inference     → "unknown"             → "undetermined type"
```

## Variable Extraction Flow

```
AST Traversal:
  Program.body[]
    ├─ VariableDeclaration
    │   ├─ name: "myVar"
    │   ├─ init: CallExpression(input.int, [14, "Length"])
    │   ├─ line: 5, column: 1
    │   └─ Infer type: "input int"
    │
    └─ FunctionDeclaration
        ├─ name: "myFunc"
        ├─ params: [...]
        ├─ body: Statement[]
        │   └─ VariableDeclaration (scopeId: "#1")
        └─ Infer return type from last statement

Output:
  variables: [
    {
      name: "myVar",
      type: "input int",
      definition: { start: {5, 1}, end: {5, 44} }
    },
    {
      name: "localVar",
      type: "series float",
      definition: { start: {10, 5}, end: {10, 30} },
      scopeId: "#1"
    }
  ]
```

## Function Extraction Flow

```
AST Traversal:
  Program.body[]
    └─ FunctionDeclaration
        ├─ name: "calcMA"
        ├─ params: [
        │    { name: "src", typeAnnotation: null },
        │    { name: "len", typeAnnotation: "int" }
        │  ]
        ├─ body: [
        │    ... statements ...
        │    ReturnStatement(CallExpression(ta.sma, [src, len]))
        │  ]
        └─ line: 20, column: 1, endLine: 22, endColumn: 30

Parameter Analysis:
  - param "src": no annotation → infer "undetermined type"
  - param "len": annotation "int" → "simple int"
  
Return Type Analysis:
  - Last statement: ReturnStatement
  - Expression: CallExpression(ta.sma, ...)
  - ta.sma return type: "series float"
  - Function return type: "series float"

Output:
  functions: [
    {
      name: "calcMA",
      definition: { start: {20, 1}, end: {22, 30} },
      args: [
        {
          name: "src",
          required: true,
          allowedTypeIDs: [],
          displayType: "undetermined type"
        },
        {
          name: "len",
          required: true,
          allowedTypeIDs: [],
          displayType: "simple int"
        }
      ],
      returnedTypes: [],
      syntax: ["calcMA(src, len) → series float"]
    }
  ]
```

## Scope Tracking

```
Global Scope:
  myGlobalVar
  myFunction
    Local Scope #1:
      param1
      param2
      localVar1
      nestedFunction
        Local Scope #2:
          nestedLocalVar

Scope ID Assignment:
  Global: no scopeId
  Local Scope #1: scopeId = "#1"
  Local Scope #2: scopeId = "#2"
```

## Error Handling Strategy

```
Case 1: Parse Error
  Parser throws → Catch → Output: { success: false, error: "..." }

Case 2: Successful Parse
  Always output: { success: true, result: {...} }
  (Even if some types are "undetermined type")

Case 3: Validation Warnings
  Include in result if needed, but success: true
```

## Integration Points (No Changes Required)

```
Extension Code (extension.ts):
  ✓ Uses Parser directly
  ✓ Uses ComprehensiveValidator directly
  ✓ Gets ValidationError[]
  ✓ Converts to VSCode Diagnostics
  → No changes needed, no breakage

MCP Server (mcp/validator-server.js):
  ? Check if uses CLI tool or validator directly
  → May need update if uses CLI
  
Test Files (test/*.js):
  ? Check validation test expectations
  → May need updates for new CLI format
```

## Testing Strategy

```
Phase 1: Unit Tests
  ├─ ASTExtractor.extractVariables() → Test variable extraction
  ├─ ASTExtractor.extractFunctions() → Test function extraction
  ├─ ASTExtractor.mapPineTypeToString() → Test type mapping
  └─ ASTExtractor.extract() → Test full extraction

Phase 2: Integration Tests
  ├─ CLI with example files → Compare with pine-lint
  ├─ Extension still works → Validate diagnostics unchanged
  └─ Build process → Ensure no regressions

Phase 3: Comparison Tests
  For each .pine file:
    ├─ Run pine-lint → Save output A
    ├─ Run pine-validate → Save output B
    ├─ Compare A vs B → Document differences
    └─ Iterate until aligned
```

## File Structure After Changes

```
src/
├─ cli.ts (MODIFIED)
│   └─ Uses ASTExtractor for pine-lint format output
│
├─ parser/
│   ├─ ast.ts (NO CHANGE)
│   ├─ parser.ts (MINOR: Add endLine/endColumn if missing)
│   ├─ comprehensiveValidator.ts (NO CHANGE - Extension uses this)
│   ├─ symbolTable.ts (NO CHANGE)
│   ├─ typeSystem.ts (NO CHANGE)
│   └─ astExtractor.ts (NEW)
│       └─ Extracts pine-lint format from AST
│
├─ extension.ts (NO CHANGE)
└─ ...

test/
└─ comparison/
    ├─ pine-lint-outputs/ (NEW)
    ├─ pine-validate-outputs/ (NEW)
    └─ compare-outputs.js (NEW)
```
