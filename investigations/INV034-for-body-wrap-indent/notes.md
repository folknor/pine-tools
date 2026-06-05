# INV034 - CE10161: Incorrect "for" statement on wrap-continuation body

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FN `Incorrect "for" statement. Expecting "to
<expression>".` (2 records in 2 files) from the 2026-06-05 inventory.
Task tracker #2.

## Claim

TV flags `for i = 1 to 7` at 17:1 / 16:1 in two corpus files where the
header looks perfectly valid (plain ASCII, verified byte-by-byte). The
trigger is the BODY indentation: the body lines sit at indent 5, and an
indent that is not a multiple of 4 is a wrap CONTINUATION under Pine's
line-wrapping rule (INV017) - so the body glues onto the header
(`for i = 1 to 7 if close[i] > open[i] ...`), breaking the for-statement
grammar.

## Probes (pine-lint --tv, 2026-06-05; scripts in probes/)

| probe | shape | TV verdict |
|---|---|---|
| p01 | `for i = 1 to 7` + body at indent 5 | CE10161 `Incorrect "for" statement. Expecting "to <expression>".`, anchor 4:1-4:3 (the `for` keyword) |
| p02 | same, body at indent 4 | clean |
| p03 | wrapped HEADER (`for i = 1 to` / indent-5 `7`) + indent-4 body | clean - a continuation completing an incomplete header is legal |

So the error is specifically: header already complete, next line is a
wrap continuation.

## Implementation

In the parser's counted-for path, after the `to` expression (and
optional `by`): if the next token is NEWLINE and the following line's
indent is a non-multiple of 4 AND deeper than the for's own indent,
push CE10161's message anchored at the `for` keyword. Recovery
unchanged - the lines still parse as the body, so the rest of the file
stays analyzable (no new cascades).

The genuinely-wrapped-header case (p03) never reaches the check: the
`to` expression consumes the continuation before the body check runs.

## Corpus outcome

3 new appearances: the two TV-confirmed inventory records (exact
position match) plus one past-TV-stop record in `0b45d086…` (TV stops
at line 2 on that file; the site is a for at indent 6 with body at 10 -
wrap-mangle either way, consistent with the rule).

Fixture: `packages/core/test/fixtures/regression/INV034-for-body-wrap-indent.pine`

## Residual

- The same complete-header-then-continuation shape presumably errors
  for `while` / `if` / `switch` headers too (different CE messages).
  No corpus evidence yet - probe before extending.
