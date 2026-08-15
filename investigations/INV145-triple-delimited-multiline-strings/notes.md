# INV145 - Triple-delimited multiline strings

Status: fixed (lexer + CW10001 gate).
Date: 2026-08-15.

## What

TradingView added multiline strings in **April 2026**: a literal enclosed by
three pairs of quotation marks (`"""..."""`) or apostrophes (`'''...'''`).
Everything between the delimiters is literal text - each code line is a
separate line of the string, the newline is included automatically, and all
indentation spaces are kept verbatim regardless of the enclosing block.

Our lexer had no notion of the form. It is grammar, not catalog data, so no
amount of re-scraping would have produced it - this is exactly the
Data-vs-Syntax split in AGENTS.md.

## The bug

```pine
//@version=6
indicator("x")
s = """line one
line two"""
plot(close)
```

Local, before the fix (`pine-lint`, 2026-08-15) - **4 errors**:

| line:col | stage | message |
|---|---|---|
| 3:1 | syntax | `Missing enclosing character in the literal string. Enclose literal strings using a set of quotation marks (") or apostrophes (') on the same code line.` |
| 4:12 | syntax | `mismatched character '\n' expecting '"'` |
| 4:1 | type | `Undeclared identifier "line"` |
| 4:6 | type | `Undefined variable 'two'. Did you mean 'ta'?` |

The opening `"""` lexed as an empty string `""` followed by a stray `"`, which
then opened a single-pair literal; the newline hit `scanString`'s INV025
continuation rule (a non-whitespace char at column 1 ends the literal, with
TV's CE10017), and the string's own text lines were left to the checker as
bare identifiers.

TV on the same source - **clean**:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":23,"line":3},"start":{"column":1,"line":3}},"name":"s","type":"const string"}],"functions":[],"types":[],"enums":[]}}
```

(`--tv` reachability for this session was confirmed separately with an
`nosuchvar` control returning CE10272 - see INV144's notes.)

## Fix

`packages/core/src/parser/lexer.ts`

- `scanToken`'s `"` / `'` case now looks ahead two characters. Three identical
  delimiters dispatch to a new `scanMultilineString`; anything else keeps the
  existing `scanString` path untouched.
- `scanMultilineString` consumes to the matching triple delimiter, tracking
  `line`/`column` across the literal newlines (`\r\n` breaks at the `\n`, a lone
  `\r` is its own break - G005). It deliberately does NOT apply `scanString`'s
  column-1 continuation rule: a multiline string's lines routinely start at
  column 1, which is the entire point of the form. Escapes are still honoured,
  so `\"""` does not close the literal. Running to EOF without the closer emits
  `mismatched character '<EOF>' expecting '"""'`.
- The token keeps its delimiters in `value`, exactly as the single-line form
  keeps its quotes. Consumers that strip delimiters must strip three - the only
  one in tree was `isChartTimeframe` in `analyzer/lint-semantic.ts` (INV144),
  now width-aware.

`packages/core/src/parser/semanticAnalyzer.ts`

- `checkMultilineStringLiteral` (CW10001) now returns early for a
  triple-delimited literal. CW10001 deprecates spanning a SINGLE pair of
  delimiters across lines and its own message tells the author to use the
  triple form instead; warning on the triple form would tell them to do what
  they just did.

## TV probes (all 2026-08-15)

### 1. CW10001 control - the deprecated form still warns

```pine
//@version=6
indicator("ctrl")
s = "line one
     line two"
if barstate.isfirst
    log.info(s)
plot(close)
```

`pine-lint --tv` ->

```json
{"success":true,"result":{"warnings":[{"code":"CW10001","end":{"column":12,"line":4},"message":"Defining a string enclosed in a single pair of quotation marks (\") or apostrophes (') across multiple lines is deprecated. Split the string into smaller strings and concatenate them with the `+` operator instead (\"like \" + \"this\"). Alternatively, to create a multiline string, enclose the text in three pairs of apostrophes ('''like this''') or quotation marks (\"\"\"like this\"\"\").","start":{"column":1,"line":3}}],"variables":[{"definition":{"end":{"column":23,"line":3},"start":{"column":1,"line":3}},"name":"s","type":"const string"}],"functions":[],"types":[],"enums":[]}}
```

This is the pair that matters: TV warns CW10001 here and emits NO warning for
the triple-delimited probe above. So the two forms are genuinely distinct to
TV, and the exemption is not us guessing. Our CLI reproduces both sides.

### 2. Indentation and local scope - `probe-indentation.pine`

The Manual's own example (indentation preserved at global and local scope).
`pine-lint --tv` ->

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":154,"line":5},"start":{"column":1,"line":5}},"desc":["A multiline string with indentation defined in the global scope."],"name":"globalIndentedStr","type":"const string"},{"definition":{"end":{"column":85,"line":14},"start":{"column":5,"line":14}},"desc":["A multiline string with indentation defined in a local block."],"name":"localIndentedStr","scopeId":"#1","type":"const string"}],"functions":[],"types":[],"enums":[]}}
```

Clean, both `const string`. We match. Note TV reports the definition `end` as a
column on the OPENING line (154 / 85), i.e. it flattens the literal to one
logical line for position purposes; we do not, but that is a variable-list
display detail on a channel the error/warning diff does not key on.

### 3. Full fixture vs TV

`pnpm run debug:compare -- packages/core/test/fixtures/regression/multiline-string-triple-delimited.pine`:

```
=== local (0 errors) ===
=== tradingview (0 errors) ===
=== local-only (we flag, TV silent - 0) ===
=== tv-only (TV flags, we silent - 0) ===
=== warnings: local 0 / tv 0, local-only 0 / tv-only 0 ===
```

Zero disagreement on both channels, including the escaped-delimiter case
(`"""a \""" b"""`).

## Verification

- `regression/multiline-string-triple-delimited.pine` covers column-1 lines,
  preserved indentation at global and local scope, both delimiter flavours,
  concatenation as ordinary operands, an escaped delimiter, and asserts 0
  warnings so a CW10001 re-regression fails the build. An AST directive pins
  the initializer as a single `Literal` so the fixture cannot pass with the
  literal shredded into separate tokens.
- `regression/multiline-string-deprecation.pine` (INV019) still passes
  unchanged - the deprecated form's two CW10001 warnings are intact.
- `regression-check.mjs`: 1879 fixtures, **0 new error appearances**; the lone
  changed fixture is the pre-existing `2997d729…` baseline drift documented in
  TODO.md, unrelated to this change. The corpus predates April 2026, so it
  carries no triple-delimited literals - the fixture is the coverage here, not
  the corpus.
- Full vitest: 450 passing.

## Not covered

The Manual notes an `\n`-vs-literal-newline distinction in the string's VALUE.
We store the literal's raw source text (delimiters included) and never
interpret escapes or newline semantics, so nothing downstream depends on it.
If a consumer ever needs the decoded value, that is a separate piece of work.
