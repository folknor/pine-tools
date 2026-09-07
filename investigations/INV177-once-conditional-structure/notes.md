# INV177 - the `once` conditional structure (August 2026) was invisible to the pipeline

**Date:** 2026-09-07
**Status:** fixed - crawler gap closed, keyword scraped, statement implemented
**Code:** `packages/pipeline/src/crawl.ts` (the `#kw_` TOC classification),
`packages/core/src/parser/{ast,parser,expressions}.ts` (`OnceStatement`),
`packages/core/src/parser/semanticAnalyzer.ts`, `packages/core/src/analyzer/
{checker,lint-semantic,checker-udf-fixpoint}.ts`, `packages/core/src/parser/astExtractor.ts`.
**Fixtures:** `regression/INV177-once-statement.pine` (valid forms, contextual
identifier, CE10101, void UDF) and `regression/INV177-once-syntax-errors.pine`
(assignment, else).

## The question

Does the last scrape include the `once` keyword TV added in August 2026? No.
Neither the 2026-08-15 scrape nor a fresh crawl on 2026-09-07 listed it, and
`po lookup once` / `debug:internals lookup once` found nothing.

## Why the pipeline could not have found it

`crawl.ts` classified TOC links by anchor prefix - `#var_`, `#fun_`, `#const_`,
`#type_`, `#an_`, `#op_` - and harvested KEYWORDS with a hardcoded regex over
the page's code blocks (`if|else|for|...|varip`). The reference's own `#kw_`
links were never read; they were tallied as an "unclassified prefix" (15 in
August, 16 now - the 16th is `once`). So a keyword TV adds can never enter the
catalog, whatever the regex says, and the regex also manufactured non-Pine
"keywords" (`case`, `default`, `do`, `return`, `const`) from prose examples.

The crawler now classifies `#kw_` links as keywords alongside the regex. The
next crawl discovered 27 (was 25): `once` and `for...in`, and the
unclassified tally went to zero. The scrape then fetched the `once` page
(`pine-data/v6/keywords.json` carries TV's description and remarks), the
manual mirror was refreshed (`release-notes.md` now has the August entry
describing `once`, and `conditional-structures.md` its section), and the
TextMate grammar was regenerated.

## The language rule, measured

`probes/` - 18 scripts, `pine-lint --tv` via `scripts/lint-batch.mjs --diff`,
2026-09-07. Preamble `//@version=6` / `indicator("t")` unless noted.

| probe | shape | TV |
|---|---|---|
| p01 | `once close > open` + indented block | clean |
| p02 | bare `once` + block (condition defaults to true) | clean |
| p03 | `x = once close > open` / `    1` | 3:5 `A \`once\` statement cannot return a value or be assigned to a variable. Convert the statement to an equivalent \`if\` or \`switch\` structure to return a usable result.` |
| p04 | once block followed by `else` + block | 6:1 `Syntax error at input "new line"` (column 1 of the `else` line) |
| p05 | `plot(close)` inside the block | 4:5 `Cannot use "plot" in local scope` |
| p06 | `f() =>` whose tail is a once; `y = f()` | 6:1 `Void expression cannot be assigned to a variable` |
| p07 | `once = 1` / `plot(once)` | **clean** - `once` is a valid identifier |
| p08 | `int once = 1` / `plot(once)` | **clean** |
| p09 | p01 under `//@version=5` | 4:12 `Syntax error at input '>'` - not a keyword in v5 |
| p10 | once nested in an if body and in a for body | clean |
| p11 | `once close` (float condition) | 4:6 `The condition of the "once" statement must evaluate to a "bool" value.` |
| p12 | two-statement block; `once (a) and (b)` | clean |
| p13 | function whose tail is a once, called unassigned | clean |
| p14 | unused local, `lvl[1]` read and `:=` inside the block | clean, 0 warnings |
| p15 | `ta.sma(close, 5)` inside the block, nested once | 1 warning: 5:10 `The function "ta.sma" should be called on each calculation for consistency. It is recommended to extract the call from this scope` |
| p16 | `once(close > open)` - no space before the paren | clean (statement, not a call) |
| p17 | `once close > open` with the next line UNindented | 4:12 `Syntax error at input ">"` |
| p18 | `once = 1` then a `once close > open` block reading `once` | clean |

Every erroring probe was local-only "Undeclared identifier once" before the
implementation, so the calls reached TV.

## What that establishes

- **`once` is contextual**, like `method` (INV051) and `switch` (#46d): the
  statement is `once` followed by a newline-plus-indented-block or by an
  expression start; an identifier use is followed by `=`, `:=`, an operator,
  `[`, `.`, `,` or a closer. `once(cond)` with no space is the statement. The
  corpus never uses `once` as an identifier outside comments and strings.
- **No value, no else.** Assignment draws TV's dedicated wording at the `once`
  token; a function whose tail is a once is void when assigned (CE10098
  wording at the declaration). `else` is a syntax error at column 1 of its
  line.
- **A local, bar-conditional scope.** `plot` inside is the local-scope error;
  a `ta.*` call inside draws CW10003, so the analyzer treats the block as a
  conditional scope whatever the condition's qualifier (it runs on one bar),
  and the checker treats it as series-gated for `:=` promotion.
- **Bodyless `once cond`** is read by TV as an expression statement and fails
  at the token after the condition's first operand.

## Implementation

- `OnceStatement { condition?, body }` in the AST. The lexer is untouched:
  `once` lexes as IDENTIFIER and `Parser.looksLikeOnceStatement` decides by
  the next token (a NEWLINE counts only when an indented block follows - p18's
  `n := once` is followed by a shallower line).
- `onceStatement()` parses the optional single-line condition and the block;
  reports the bodyless shape at the second condition token (p17) and an
  `else` at column 1 (p04), consuming the else block so nothing cascades.
- In expression position, `ExpressionParser.primary()` reports TV's
  assignment wording at the `once` token, consumes the block, and yields an
  int placeholder so the declaration draws no second error.
- Checker: CE10101 with blockName `once` at the condition; the block enters a
  scope with `blockDepth` (local-scope rule) and `seriesGateDepth`. A UDF
  call whose every overload ends in a once is void for the CE10098 check.
- Semantic analyzer: `analyzeOnceStatement` enters a conditional scope
  unconditionally; `childStatements`, `statementExpressions` and the
  declaration-collection series propagation know the new variant.
- Lint walker, UDF fixpoint walker and the AST extractor walk the body.

## Verification

- All 18 probes: 16 no disagreement. p05 differs only in our pre-existing
  local-scope wording (`Function 'plot' cannot be called from a local scope`
  vs TV's `Cannot use "plot" in local scope` - older than this work). p09 is
  v5 and is excluded by the version-scope rule in CLAUDE.md. p06 and p14
  each carry one local `UNUSED_VARIABLE` (lint stage, TV never emits it).
- Two regression fixtures, including AST-shape locks for the statement and
  the identifier use.
- `regression-check.mjs` over 1879 fixtures: 0 appearances; 1 disappearance
  on a mangled v5 file (`27ee56bf...:28`, a prose line beginning `once per
  bar close`) whose `Undeclared identifier "once"` is gone while its other
  three errors on that line remain.
- The full TV sweep (748 v6 fixtures) run earlier the same day was
  byte-identical to 2026-08-27 (29 / 0 / 1); the corpus predates the
  keyword, so it exercises none of this and the probes are the evidence.
- Full suite green.

## Residual

- The `plot`-in-local-scope wording (p05) predates this and is unchanged.
- The manual's remark that a `once` block stays active on an OPEN bar (it
  re-executes on each tick until the bar closes) is runtime semantics with no
  static diagnostic; recorded in `keywords.json` remarks for consumers.
- A UDF whose tail is a void BUILTIN call (`f() => array.push(a, 1)`) is
  still not void for the CE10098 check; only the once tail was added here.
