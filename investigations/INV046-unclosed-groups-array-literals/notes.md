# INV046 - unclosed groups and array-literal RHS

**Date:** 2026-06-07
**Status:** RESOLVED
**Category:** two tv-only FN rows from the 2026-06-05 inventory:
`Syntax error: Missing closing parenthesis` (1 record: `b08c3d61…:8`,
`x = ta.sma(close, 14` unclosed) and `Syntax error at input "["`
(1 record: `bdd99160…:8:7`, `arr = [1, 2, 3` unclosed).

## Claims

Two distinct findings hid under "unclosed group":

1. **Unclosed `(`** - we detected it but anchored at the NEXT statement
   (`Expected ")" after arguments` at line 10) with our own wording,
   while TV anchors CE10015 at the opener's logical line, column 1.
   Anchor/wording mismatch, not a detection gap.
2. **`[...]` on a single-name RHS is invalid even when CLOSED.** Pine
   has no array literals - a `[...]` tuple expression is only valid in
   return positions (UDF body tails, request.security's expression
   argument, tuple-destructure RHS providers). TV rejects
   `arr = [1, 2, 3]` and `x := [1, 2]` with CE10156 at the `[`
   regardless of closure - so the `bdd99160…` record was never about
   the missing `]` at all.

## Probes (`probes/`, `pine-lint --tv` 2026-06-07)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `arr = [1, 2, 3]` - CLOSED | CE10156 `Syntax error at input "["` at 3:7 (the `[`) |
| p02 | `x := [1, 2]` - closed, `:=` RHS | CE10156 at 4:6 (the `[`) |
| p03 | unclosed call paren on an indent-4 statement in an if-body | CE10015 `Syntax error: Missing closing parenthesis` start 4:1 (column 1 despite the indent) |
| p04 | unclosed GROUPING paren `x = (close + 1` | CE10015 start 3:1 |
| p05 | `[a, b] = request.security(..., [open, close])` | clean (`a`/`b` typed `series float`) - tuple args and destructure RHS stay valid |

Plus the two original fixtures: TV anchors `b08c3d61…` at 8:1 and
`bdd99160…` at 8:7 (the `[`).

## Implementation

- **Lexer** (`lexer.ts`): an opener stack records every `(`/`[` with
  its position (closers pop the nearest opener regardless of character;
  mismatched pairs only occur in already-broken files). At EOF the
  EARLIEST unclosed opener is reported once per file - `(` as CE10015
  "Syntax error: Missing closing parenthesis" at (opener line, col 1),
  `[` as CE10156 'Syntax error at input "["' at the bracket. This
  covers the unclosed forms globally; the parser's own "Expected )"
  cascade still fires later, past TV's stop.
- **Checker** (`checker.ts`, v6-gated like the neighbouring declaration
  checks): a VariableDeclaration init or `:=` AssignmentStatement value
  that is an ArrayExpression gets CE10156 at the opening bracket. This
  catches the CLOSED literal (p01/p02), which never reaches the lexer
  check. ArrayExpression nodes now carry `startLine`/`startColumn` for
  the opening `[` (their `line`/`column` historically anchor at the
  CLOSING bracket and downstream consumers rely on that).

Corpus effect: +36 missing-paren records in 36 files (one per file with
a genuinely unclosed paren - triaged 2026-06-07: zero on TV-clean
files), +2 `[` records. `syntax/multiline.pine`'s `var arr = [...]`
example - codified as valid - was rewritten to `array.from`.

Fixtures:
`packages/core/test/fixtures/regression/INV046-array-literal-rhs.pine`,
`INV046-missing-closing-paren.pine`, `INV046-unclosed-bracket.pine`.

## Residual

- ~~Tuple-destructure RHS literals (`[a, b] = [2, 3]`) are deliberately
  NOT flagged - unprobed, and `syntax/newline-continuation.pine` uses
  the form as a parser-behavior case. Probe before deciding.~~
  **Resolved by INV049 (2026-06-07):** probed - TV rejects the form
  with CE10156 at the RHS `[`; now flagged from the parser, and the
  syntax fixtures that used it as shorthand were rewritten to call
  inits. Note this narrows finding 2's "tuple-destructure RHS" valid
  position: only CALL providers (request.security, UDFs) are valid
  there, not literals.
- Bare `[1, 2]` as an expression statement or operand is also
  unflagged (no inventory rows; rare).
