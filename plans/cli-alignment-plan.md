# CLI Tool Alignment Plan: TypeScript CLI → pine-lint Compatibility

**Goal:** Make the TypeScript CLI tool (`pine-validate`) behave exactly like the official `pine-lint` tool

## Important: Backward Compatibility

**Critical Constraint:** The VSCode extension uses `ComprehensiveValidator` directly and depends on its validation API. Changes to the CLI tool MUST NOT break the extension's functionality.

### Extension Usage Pattern
- Extension: Uses `ComprehensiveValidator.validate()` → returns `ValidationError[]`
- CLI Tool: Will use NEW `ASTExtractor` → returns pine-lint format
- **No changes to `ComprehensiveValidator` interface required**

### Implementation Approach
1. Keep `ComprehensiveValidator` unchanged (extension depends on it)
2. Create NEW `ASTExtractor` class for CLI tool
3. CLI tool will:
   - Parse AST (existing)
   - Validate with `ComprehensiveValidator` (track errors)
   - Extract metadata with `ASTExtractor` (new)
   - Output in pine-lint format (new)

## 1. Output Format Analysis

### Official pine-lint Output Structure
```json
{
  "success": true,
  "result": {
    "variables": [
      {
        "name": "varName",
        "type": "input int" | "series float" | "undetermined type" | etc.,
        "definition": {
          "start": { "line": 5, "column": 1 },
          "end": { "line": 5, "column": 44 }
        },
        "scopeId": "#1"  // Optional, for scoped variables
      }
    ],
    "functions": [
      {
        "name": "funcName",
        "definition": {
          "start": { "line": 40, "column": 1 },
          "end": { "line": 41, "column": 46 }
        },
        "args": [
          {
            "name": "paramName",
            "required": true,
            "allowedTypeIDs": [],
            "displayType": "undetermined type"
          }
        ],
        "returnedTypes": [],
        "syntax": ["funcName(paramName) → undetermined type"]
      }
    ],
    "types": [],
    "enums": []
  }
}
```

### Current TypeScript CLI Output Structure
```json
[
  {
    "file": "path/to/file.pine",
    "errors": [
      {
        "line": 0,
        "column": 0,
        "length": 0,
        "message": "Error message",
        "severity": 0
      }
    ],
    "success": true
  }
]
```

### Key Differences

1. **Top-level structure:**
   - `pine-lint`: Single object with `success` and `result`
   - Current CLI: Array of file results with `file`, `errors`, `success`

2. **Content focus:**
   - `pine-lint`: Extracts variables, functions, types, enums from AST
   - Current CLI: Only reports validation errors/warnings

3. **Variable information:**
   - `pine-lint`: Full variable catalog with types and positions
   - Current CLI: No variable extraction

4. **Function information:**
   - `pine-lint`: Full function signatures with parameters and return types
   - Current CLI: No function extraction

5. **Error reporting:**
   - `pine-lint`: Success=true means parsing succeeded (even if undetermined types)
   - Current CLI: Success=false means validation errors found

## 2. Required Changes

### Phase 1: Output Format Transformation (Single File Mode)
- Change from array output to single object format
- Add `success` and `result` top-level keys
- Support single file input (match pine-lint behavior)

### Phase 2: Variable Extraction System
- Build variable catalog from AST
- Extract variable definitions with position tracking
- Map Pine Script types to pine-lint type strings:
  - `"input int"` / `"input float"` / `"input bool"` / `"input string"`
  - `"series float"` / `"series bool"` / `"series int"`
  - `"simple int"` / `"simple float"`
  - `"undetermined type"` (for unknown/inferred types)
- Track scope IDs for function-local variables
- Handle `var`, `varip` modifiers in type strings

### Phase 3: Function Extraction System
- Build function catalog from AST
- Extract function definitions with position tracking
- Build parameter lists with:
  - Parameter names
  - Required vs optional flags
  - Type information (allowedTypeIDs, displayType)
- Infer return types
- Generate syntax strings: `"funcName(param1, param2) → returnType"`

### Phase 4: Type System Integration
- Map ComprehensiveValidator type inference to pine-lint type strings
- Handle Pine Script v6 specific types:
  - Built-in types: int, float, bool, string, color
  - Series types: series<T>
  - Array types: array<T>
  - Matrix types: matrix<T>
  - User-defined types (from `type` keyword)
- Handle special cases:
  - `na` values
  - Type qualifiers (const, simple, series, input)
  - Undetermined types (when inference fails)

### Phase 5: Types & Enums Extraction
- Extract user-defined types (Pine Script v6 `type` declarations)
- Extract enum declarations (if applicable to Pine Script v6)
- May be empty arrays for many scripts

### Phase 6: Testing & Validation
- Test on all example files in project
- Compare outputs line-by-line with pine-lint
- Iterate on differences
- Document intentional differences (if any)
- Test on user's hundreds of scripts

## 3. Implementation Strategy

### Step 1: Analyze AST Structure
- Review [`src/parser/ast.ts`](../src/parser/ast.ts) for available node types
- Review [`src/parser/parser.ts`](../src/parser/parser.ts) for parsing logic
- Review [`src/parser/symbolTable.ts`](../src/parser/symbolTable.ts) for symbol tracking

### Step 2: Create Extraction Functions
Create new module: `src/parser/astExtractor.ts`
```typescript
export interface PineLintVariable {
  name: string;
  type: string;
  definition: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  scopeId?: string;
}

export interface PineLintFunction {
  name: string;
  definition: {
    start: { line: number; column: number };
    end: { line: number; column: number };
  };
  args: Array<{
    name: string;
    required: boolean;
    allowedTypeIDs: number[];
    displayType: string;
  }>;
  returnedTypes: number[];
  syntax: string[];
}

export interface PineLintResult {
  variables: PineLintVariable[];
  functions: PineLintFunction[];
  types: any[];
  enums: any[];
}

export class ASTExtractor {
  extract(ast: Program): PineLintResult;
  extractVariables(ast: Program): PineLintVariable[];
  extractFunctions(ast: Program): PineLintFunction[];
  extractTypes(ast: Program): any[];
  extractEnums(ast: Program): any[];
  mapPineTypeToString(type: PineType): string;
}
```

### Step 3: Modify CLI Entry Point
Update [`src/cli.ts`](../src/cli.ts):
- Change to single-file mode (accept only one file path)
- Create ASTExtractor instance
- Parse AST
- Extract variables, functions, types, enums
- Output in pine-lint format
- Handle parse errors appropriately (success: false)

### Step 4: Type String Mapping
Create comprehensive type string mapping:
```typescript
const typeStringMap = {
  // Input types
  inputInt: "input int",
  inputFloat: "input float",
  inputBool: "input bool",
  inputString: "input string",
  inputColor: "input color",
  
  // Series types
  "series<int>": "series int",
  "series<float>": "series float",
  "series<bool>": "series bool",
  "series<string>": "series string",
  "series<color>": "series color",
  
  // Simple types
  int: "simple int",
  float: "simple float",
  bool: "simple bool",
  string: "simple string",
  color: "simple color",
  
  // Unknown/undetermined
  unknown: "undetermined type",
  na: "undetermined type"
};
```

### Step 5: Position Tracking Enhancement
Ensure AST nodes track:
- Start position (line, column)
- End position (line, column)
- Length (for error reporting)

Update parser if needed to capture end positions.

## 4. Testing Plan

### Test Files Available
```
examples/debug-test.pine
examples/global-liquidity.v6.pine
examples/indicator.2.3.pine
examples/mysample.v6.pine              ← Start with this (already tested with pine-lint)
examples/test-named-args.pine
examples/test-plot-parsing.pine
examples/test-v6-features.pine
examples/test-validation.pine
examples/demo/deltaflow-volume-profile.pine
examples/demo/mft-state-of-delivery.pine
examples/demo/multi-tf-fvg.pine
```

### Testing Process
1. Run pine-lint on each file → save output to `test-outputs/pine-lint/`
2. Run pine-validate on each file → save output to `test-outputs/pine-validate/`
3. Create comparison script to diff outputs
4. Analyze discrepancies
5. Iterate on implementation
6. Repeat until outputs match

### Comparison Script
Create `scripts/compare-outputs.js`:
```javascript
// Load both outputs
// Compare structure
// Compare variable counts
// Compare variable names and types
// Compare function counts
// Compare function signatures
// Report differences
```

## 5. Edge Cases & Considerations

### Variable Type Determination
- **Input functions**: Detect calls to `input.int()`, `input.float()`, etc.
- **Series inference**: Functions like `ta.sma()`, `ta.ema()` return series
- **Undetermined types**: When type cannot be inferred, use `"undetermined type"`

### Scope Tracking
- Track function-local variables with `scopeId` field
- Global variables have no `scopeId`
- Format: `"#1"`, `"#2"`, etc.

### Function Return Types
- Infer from last statement in function body
- Use `returnedTypes: []` when cannot determine
- Use `"undetermined type"` in syntax string

### Parse Errors vs Validation Errors
- Parse errors: `success: false`, no result
- Validation errors: `success: true`, include result (pine-lint validates structure, not semantics)

### Multi-file Support
- pine-lint processes single files
- Current CLI supports multiple files
- **Decision**: Match pine-lint behavior (single file), OR extend format to support multiple files with compatible structure

## 6. Success Criteria

✅ **Structural match**: Output JSON structure matches pine-lint exactly  
✅ **Variable extraction**: All variables extracted with correct types and positions  
✅ **Function extraction**: All functions extracted with correct signatures  
✅ **Type strings**: Pine types mapped to pine-lint type strings correctly  
✅ **Position tracking**: Start/end line/column accurate for all definitions  
✅ **Scope tracking**: Function-local variables tagged with scopeId  
✅ **Edge cases**: Handles parse errors, undetermined types, complex scripts  
✅ **Validation**: Passes comparison tests on all example scripts  
✅ **User validation**: Handles hundreds of user-provided scripts correctly  

## 7. Timeline & Milestones

### Milestone 1: Analysis & Design (Current)
- ✅ Understand pine-lint output format
- ✅ Identify current CLI gaps
- ✅ Design extraction system
- ✅ Create implementation plan

### Milestone 2: Core Extraction System
- Build ASTExtractor class
- Implement variable extraction
- Implement function extraction
- Add position tracking

### Milestone 3: Type System Integration
- Map Pine types to type strings
- Handle input detection
- Handle series inference
- Handle undetermined types

### Milestone 4: CLI Modification
- Update CLI to use new extractor
- Change output format
- Handle single-file mode
- Add error handling

### Milestone 5: Testing & Iteration
- Test on all example files
- Compare with pine-lint outputs
- Fix discrepancies
- Document differences

### Milestone 6: Final Validation
- Test on user's large script collection
- Performance tuning if needed
- Final documentation
- Code review and cleanup

## 8. Notes & Questions

### Questions for User
1. Should we maintain multi-file support or strictly match pine-lint (single file)?
2. Are there specific type edge cases we should prioritize?
3. What's the priority: exact match vs useful extensions?

### Potential Challenges
- **End position tracking**: Parser may not capture end positions for all nodes
- **Type inference accuracy**: May differ from official pine-lint inference
- **Scope ID format**: Need to understand pine-lint's scope numbering scheme
- **Undetermined types**: When to use vs specific type inference

### Future Enhancements
- Add source code snippets to output
- Add documentation strings if available
- Add usage tracking for variables/functions
- Performance metrics in output
