# INV019 - CW10001: multiline-string deprecation warning (TODO #37a)

**Status:** resolved 2026-06-04. We now emit TV's CW10001 verbatim from
the SemanticAnalyzer (`MULTILINE_STRING` rule), anchored to TV's
position convention. 37 corpus hits were tv-only in the 2026-06-04
warning inventory; the probed fixture below now diffs clean.

## The rule

TV warns CW10001 once per string literal (single `"` / `'` pair) that
spans multiple physical lines. Message (no ctx placeholders):

> Defining a string enclosed in a single pair of quotation marks (")
> or apostrophes (') across multiple lines is deprecated. Split the
> string into smaller strings and concatenate them with the `+`
> operator instead ("like " + "this"). Alternatively, to create a
> multiline string, enclose the text in three pairs of apostrophes
> ('''like this''') or quotation marks ("""like this""").

An escaped `\n` inside a single-line literal does NOT warn (it is not
a physical line span).

## Position convention (probed)

START is always **column 1 of the line where the literal opens** -
NOT the literal's own column, NOT the statement's indent column, and
not the logical-line convention from G005. END does not follow any
convention we could decode (see probe outputs - `4:10`, `5:19`; not
physical, not the G005 logical join); since the TV-diff keys on start
positions, we record the observation and emit a nominal length of 1.

## Probes (`pine-lint --tv`, 2026-06-04)

Probe 1 - typed declaration at column 1 (literal opens at 3:13):

```pine
//@version=6
indicator("x")
string TT = "Line 1
     Line 2"
plot(close, title=TT)
```

CW10001 start **3:1**, end 4:10.

Probe 2 - literal mid-expression (opens at 3:12):

```pine
//@version=6
indicator("x")
tt = "a" + "Line 1
     Line 2"
plot(close, title=tt)
```

CW10001 start **3:1**, end 4:10. Start col is 1 even though the
literal is the second operand - so the anchor is the line, not the
literal or statement.

Probe 3 - statement indented inside an if-body (literal opens 4:10):

```pine
//@version=6
indicator("x")
if close > open
    tt = "Line 1
     Line 2"
    label.new(bar_index, high, tt)
plot(close)
```

CW10001 start **4:1** - column 1 even for indented statements.

Probe 4 - three-line literal:

```pine
//@version=6
indicator("x")
tt = "Line 1
     Line 2 is longer
       Line 3"
plot(close, title=tt)
```

CW10001 start **3:1**, end 5:19 (line 5 is 14 chars - the end is past
EOL but does not match the G005 logical-join coordinates either; left
undecoded).

Corpus confirmation: `fixtures/076f5b4a…pine` (a `\r\r\n` file) - TV
reports CW10001 at 17:1; after implementation `compare-tv.mjs` shows
warning tv-only = 0.

## Implementation notes

- `semanticAnalyzer.ts`: `checkMultilineStringLiteral` in the
  `Literal` walk - fires when the raw lexeme contains a line break,
  warning at `(literal.line, 1)`. Wording verbatim from the probe.
- Lexer bug found en route: `addToken` stamps `this.line` and
  `this.column - length`, which for tokens spanning lines (multiline
  strings, block comments) lands on the END line with a nonsense,
  often negative, column (`col -92`, `col -381` in the corpus
  baseline). `scanString`/`scanBlockComment` now pass their recorded
  start position through a new optional `at` override. The corpus
  regression diff for this change was exactly 2 files, both parse
  errors anchored on multiline strings moving from end/negative
  positions to the literal's true start.
- Regression fixture:
  `packages/core/test/fixtures/regression/multiline-string-deprecation.pine`.
