# Validation Improvement Plan - Close the Gap to Zero

**Status**: Phase 1 COMPLETE (partial success)
**Created**: 2025-12-19
**Baseline**: 89/176 mismatches (50.6%)
**After Phase 1**: 140/176 mismatches (79.5%) → **36 matches (20.5%)**
**Target**: <10 mismatches (94%+ match rate)

---

## Phase 1 Results Analysis

✅ **String validation works** - Files with string errors now match authority exactly
❌ **Exposed hidden issue** - 129 files now show `extra_errors` (CLI false positives)

**Breakdown of 140 mismatches:**
| Type | Count | Issue |
|------|-------|-------|
| `extra_errors` | 129 | CLI reports errors authority doesn't find |
| `first_error_mismatch` | 11 | Different first error |
| `success_mismatch` | 10 | CLI succeeds, authority fails |

**Root Cause**: CLI validator has false positive errors:
- "Undefined variable" for function parameters (e.g., `price` in `func(price, window) =>`)
- "Undefined variable 'else'" - parser misinterpreting `else` keyword
- Type mismatch errors due to unresolved variable types

---

## Revised Priority: Fix False Positives FIRST

### Phase 1B: Symbol Table / Scope Tracking (URGENT)
**Goal**: Eliminate false positive "undefined variable" errors

**Problem**: Function parameters not being tracked in symbol table
```pine
ehlers_dft_adapted_rsi(price, window, overbought, oversold, frac) =>
    hp := price  // ❌ CLI says "Undefined variable 'price'"
```

**Fix Required**: [`src/parser/symbolTable.ts`](src/parser/symbolTable.ts) or [`src/parser/validator.ts`](src/parser/validator.ts)
- Register function parameters when parsing function definition
- Track `else` as keyword, not identifier

**Test**: Run on `pine/indicators-processed/dominant-v1.pine`
- Current: 14 false positive errors
- Target: 0 errors (matches authority)

---

## Executive Summary

Comparison of CLI validator against official pine-lint authority reveals 4 distinct issue categories:
1. **String escape handling** ✅ FIXED - Malformed strings now detected correctly
2. **Symbol table gaps** (~129 files) - Function params, keywords not tracked
3. **Code quality warnings** (~30 warnings) - Missing semantic analysis
4. **Edge case syntax** (~10 failures) - Grammar too lenient

Addressing symbol table gaps is now highest priority.

---

## Issue Analysis

### Category 1: String Literal Validation (Priority 1)
**Files Affected**: 50+ in strategies-todo folder  
**Example Error**:
```
"mismatched character '\n' expecting '\"'"
at line 13, column 66
```

**Problem**: CLI lexer accepts:
- Unclosed strings (missing terminating quote)
- Newlines inside string literals (should require `\n`)
- Invalid escape sequences

**Current Code**: [`src/parser/lexer.ts`](src/parser/lexer.ts) - `scanString()` method

**Required Changes**:
```typescript
// Current (overly permissive)
scanString() {
  while (peek() !== '"' && !isAtEnd()) {
    advance();
  }
  // Missing: check if actually hit end without closing quote
}

// Fixed (strict validation)
scanString() {
  while (peek() !== '"' && !isAtEnd()) {
    if (peek() === '\n') {
      throw error('Unexpected newline in string literal');
    }
    if (peek() === '\\') {
      advance(); // Escape char
      if (!isValidEscape(peek())) {
        throw error('Invalid escape sequence');
      }
    }
    advance();
  }
  
  if (isAtEnd()) {
    throw error('Unterminated string literal');
  }
  
  advance(); // Closing quote
}
```

**Test Files**: All files in `pine/strategies-todo/*.pine`

---

### Category 2: Semantic Warnings (Priority 2)
**Files Affected**: 30+ mixed indicators/strategies  
**Example Warning**:
```
"The function 'ta.sma' should be called on each calculation
for consistency. It is recommended to extract the call from
this scope"
at line 134, columns 43-67
```

**Problem**: CLI doesn't perform semantic analysis for best practices:
- Series functions (`ta.*`, `request.*`) called conditionally
- Variable reassignments inside conditionals (series coherence)
- Unused variables detected but not warned

**Current Code**: [`src/parser/validator.ts`](src/parser/validator.ts) - Only syntax validation

**Required Changes**: Create new analyzer module

**New File**: [`src/parser/semanticAnalyzer.ts`](src/parser/semanticAnalyzer.ts)
```typescript
export class SemanticAnalyzer {
  analyze(ast: Program): Warning[] {
    const warnings: Warning[] = [];
    
    // Rule 1: Series functions in conditionals
    warnings.push(...this.checkConditionalSeriesCalls(ast));
    
    // Rule 2: Reassignments in conditional scope
    warnings.push(...this.checkConditionalReassignments(ast));
    
    // Rule 3: Unused declarations
    warnings.push(...this.checkUnusedVariables(ast));
    
    return warnings;
  }
  
  private checkConditionalSeriesCalls(ast: Program): Warning[] {
    // Walk AST, find CallExpressions inside IfStatement/ForStatement
    // If callee matches ta.*, request.*, warn
  }
}
```

**Integration**: Call from [`src/cli.ts`](src/cli.ts) after parsing:
```typescript
const ast = parser.parse(tokens);
const semanticWarnings = new SemanticAnalyzer().analyze(ast);
// Merge with validator errors
```

**Test Files**:
- `pine/indicators-processed/dominant-v1.pine` (line 134)
- `pine/indicators-processed/noi-funding-cvd.pine` (8 warnings)
- `pine/strategies-processed/ssl-hybrid-advanced.pine` (25 warnings)

---

### Category 3: Grammar Edge Cases (Priority 3)
**Files Affected**: 8 files  
**Example**:
```json
{
  "cli": {"success": true, "errorCount": 0},
  "authority": {"success": false, "errorCount": 0}
}
```

**Problem**: Authority failed during parse (before semantic checks), CLI succeeded

**Hypothesis**:
1. Parser grammar has holes (accepts invalid syntax)
2. Missing post-parse AST validation
3. Authority stricter on syntactic ambiguity

**Files to Investigate**:
- `pine/indicators-processed/ehlers-correlation-angle.pine`
- `pine/indicators-processed/ehlers-early-onset-trend.pine`
- `pine/indicators-processed/ehlers-universal-oscillator.pine`
- `pine/indicators-todo/squeeze-overlays.pine`
- `pine/strategies-processed/hlc3-kaufman-strategy-orig.pine`
- `pine/strategies-todo/613637689-Auto-BuySell-Trend-and-Targets-V4-by-stockfinz-com.pine`
- `pine/strategies-todo/710431615-camrilla.pine`
- `pine/strategies-todo/854667873-nsdt-2.pine`
- `pine/strategies-todo/873410237-v6.pine`
- `pine/strategies-todo/878477865-BigBeluga-Smart-Money-Concepts.pine`

**Required Changes**:
1. **Manual review**: Parse each file, compare AST structure to authority expectations
2. **Add strictness**: Reject ambiguous constructs (e.g., dangling expressions)
3. **Post-parse validation**: Check AST semantic invariants

**New File**: [`src/parser/astValidator.ts`](src/parser/astValidator.ts)
```typescript
export class ASTValidator {
  validate(ast: Program): Error[] {
    const errors: Error[] = [];
    
    // Check: All expressions part of statements
    errors.push(...this.checkOrphanedExpressions(ast));
    
    // Check: No unreachable code after return
    errors.push(...this.checkUnreachableCode(ast));
    
    // Check: Function declarations have valid signatures
    errors.push(...this.checkFunctionSignatures(ast));
    
    return errors;
  }
}
```

---

## Implementation Phases

### Phase 1: String Validation ✅ COMPLETE
**Goal**: Detect unterminated strings
**Result**: Working - CLI now matches authority on string errors

**Completed Tasks**:
- [x] Added `LexerError` interface and `lexerErrors` array to lexer
- [x] Modified `scanString()` to detect raw newlines → error
- [x] CLI combines lexer errors with validator errors
- [x] First-error matching implemented in comparison script

**Files Modified**:
- `src/parser/lexer.ts` - String validation
- `src/parser/parser.ts` - `getLexerErrors()` method
- `src/cli.ts` - Error combination logic

---

### Phase 1B: Symbol Table Fix (NEXT - URGENT)
**Goal**: Eliminate 129 "extra_errors" false positives

**Tasks**:
1. [ ] Investigate why function parameters aren't tracked
2. [ ] Fix: Register params in symbol table when parsing function definition
3. [ ] Fix: Ensure `else`, `if`, `for` etc. not treated as identifiers
4. [ ] Run comparison, verify false positives eliminated

**Files to Fix**: `src/parser/validator.ts`, `src/parser/symbolTable.ts`

**Success Metric**: `extra_errors` count drops from 129 to <20

---

### Phase 2: Semantic Warnings
**Goal**: Reduce warning mismatches from 30 to <5

**Tasks**:
1. [ ] Create [`semanticAnalyzer.ts`](src/parser/semanticAnalyzer.ts)
2. [ ] Implement rules:
   - **CONDITIONAL_SERIES**: `ta.*`, `request.*` inside if/for/while
   - **CONDITIONAL_REASSIGNMENT**: `var :=` inside conditionals
   - **UNUSED_VARIABLE**: Declared but never referenced
3. [ ] Integrate into [`cli.ts`](src/cli.ts) pipeline
4. [ ] Test on high-warning files:
   - `ssl-hybrid-advanced.pine` (25 warnings)
   - `noi-funding-cvd.pine` (8 warnings)
5. [ ] Run comparison, verify warning alignment

**Success Metric**: `_SUMMARY.json` totals.mismatches < 20

---

### Phase 3: Grammar Strictness (Week 3)
**Goal**: Eliminate success/failure mismatches (8 files)

**Tasks**:
1. [ ] Manually parse 8 failing files in TradingView web editor
   - Note exact error messages
   - Identify what CLI accepts that authority rejects
2. [ ] Tighten [`parser.ts`](src/parser/parser.ts) grammar rules:
   - Forbid orphaned expressions
   - Enforce statement terminators
   - Validate block structure
3. [ ] Create [`astValidator.ts`](src/parser/astValidator.ts) post-parse pass
4. [ ] Run comparison, target zero success mismatches

**Success Metric**: `_SUMMARY.json` totals.mismatches < 10

---

## Validation Workflow

After each phase:

```bash
# Rebuild CLI
pnpm run build:cli

# Run full comparison
node compare-validation-results.js

# Check results
cat differences/_SUMMARY.json | jq '.totals'

# Focus on specific issue type
jq '.discrepancies[] | select(.type=="error_count_mismatch")' differences/*.json | wc -l
```

**Iterate**: If mismatches persist, inspect individual diff files:
```bash
# Find highest discrepancy files
jq -r 'select(.discrepancies | length > 0) | "\(.discrepancies | length) \(.jsonFile)"' differences/*.json | sort -rn | head -10

# Investigate specific file
cat differences/pine__strategies-processed__scdtm-1.json | jq .
```

---

## Edge Case Handling

### When CLI is Correct, Authority Wrong
If investigation reveals authority false positives:
1. Document in `KNOWN_AUTHORITY_ISSUES.md`
2. Add to comparison script allowlist
3. File bug report with TradingView (if warranted)

### Acceptable Residual Mismatches
Target allows <10 mismatches due to:
- Authority internal heuristics we can't replicate
- Ambiguous spec interpretations
- Version drift (authority ahead of published docs)

**Final Goal**: 94%+ match rate (166/176 matches)

---

## Metrics Tracking

Create [`plans/validation-metrics.json`](plans/validation-metrics.json):
```json
{
  "baseline": {
    "date": "2025-12-19",
    "total": 176,
    "matches": 87,
    "mismatches": 89,
    "rate": 49.4
  },
  "phase1": {
    "date": "TBD",
    "total": 176,
    "matches": null,
    "mismatches": null,
    "rate": null
  },
  "phase2": {...},
  "phase3": {...}
}
```

Update after each phase to track progress.

---

## References

- **Comparison Script**: [`compare-validation-results.js`](compare-validation-results.js)
- **Results Folder**: [`./differences/`](./differences/)
- **Parser Implementation**: [`src/parser/`](src/parser/)
- **Pine Script v6 Spec**: https://www.tradingview.com/pine-script-reference/v6/

---

## Next Steps

1. Review this plan with team
2. Allocate resources (1-3 weeks effort)
3. Begin Phase 1: String validation fixes
4. Monitor progress via automated comparison runs
5. Document learnings in this plan for future reference
