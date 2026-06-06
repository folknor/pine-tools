# INV042 - trailing-operator wraps at multiple-of-4 indent

**Date:** 2026-06-07
**Status:** RESOLVED (trailing case); leading case probed, deferred (TODO #45)
**Category:** tv-only FN `Syntax error at input "end of line without line
continuation"` (2 records in 2 files: `5d51031…:33` ternary with 4-space
continuation, `577f110…:475` and-chain with 24-space continuation) from
the 2026-06-05 inventory.

## Claim

A TRAILING operator at end of line (`x = cond ?`, `a and`) only wraps its
right operand onto the next line when the continuation line's indent is
NOT a multiple of 4 - INV017's wrap-indent rule, which our expression
parser enforced for operator-LEADING wraps and blank-line wraps but NOT
for the plain trailing case: the post-operator newline skip joined
unconditionally. TV rejects the multiple-of-4 continuation with CE10156
anchored at the wrapping line's END column (line length + 1).

## Probes (`probes/`, `pine-lint --tv` 2026-06-07)

| probe | shape | TV verdict |
|---|---|---|
| p01 | ternary `?` at EOL, continuation indent 4, top level | CE10156 `Syntax error at input "end of line without line continuation"` at 3:19 (EOL of the `?` line) |
| p02 | same, continuation indent 5 | clean (`c` typed `series color`) |
| p03 | `and` at EOL inside if-body at indent 8, continuation indent 24 | CE10156 at 5:52 (EOL of the `and` line) - the rule is absolute indent % 4, not relative to the statement |
| p04 | ternary `?` at EOL, continuation at column 1, top level | CE10156 at 3:19 - column 1 (indent 0) is also a multiple of 4 |
| p05 | `?` at EOL on an indent-4 local statement, continuation at column 1 | CE10156 at 4:23 |
| p06 | LEADING `?` at indent 4 (`cond` EOL, `    ? high`) | CE10013 `Mismatched input "?" expecting set "end of line without line continuation"` at 4:5 (the `?` itself) - different code/wording/anchor, see Residual |

## Implementation

`skipPostOperatorNewlines()` in `expressions.ts` replaces the seven
unconditional skip loops (after ternary `?` and `:`, and after
`or`/`and`/comparison/`+ -`/`* / %`): the newline(s) are still consumed
and the wrap still JOINS (so the statement parses whole and downstream
diagnostics survive), but when the continuation token's indent % 4 === 0
at paren/bracket depth 0 the parser records TV's CE10156 message at the
first NEWLINE token's position (which is exactly the EOL column).
`parseSameLineBinary` (switch arms) and `skipWrapContinuationNewline`
(post-`=`) already refused multiple-of-4 joins; they are unchanged.

Corpus effect: +190 records in 30 files, all triaged 2026-06-07 - zero on
TV-clean files; every record either matches TV's own error exactly (the
two inventory carriers now diff tv-only 0), lies past TV's first-error
stop, or sits in string-lexer-abort files where TV's parse stage never
ran (`13a745…`, `b65bc03d…`, `6080cf…` - the TODO #44 shape; the rule
itself is what p04/p05 confirm, since those files' flagged sites are
column-1 continuations).

Fixture: `packages/core/test/fixtures/regression/INV042-wrap-multiple-of-4-indent.pine`
(also updated `syntax/if-else.pine`, `syntax/multiline.pine`,
`syntax/newline-continuation.pine`, which had codified 4-space
continuations as valid).

## Residual

- **Leading-operator wraps at multiple-of-4 indent (p06) are still
  accepted.** `skipWrapNewlines`'s single-NEWLINE path keeps its
  historical leniency (only the blank-line path enforces % 4). TV
  rejects these with CE10013 anchored at the operator, not CE10156 at
  the EOL. No inventory rows exist for this shape (no v6 corpus file
  hits it before TV's stop), so it is deferred - tracked as TODO #45.
- A statement with SEVERAL bad wraps gets one CE10156 per trailing
  operator (e.g. `?` line and `:` line both flagged); TV stops at the
  first. The extras land past TV's stop and are bucketed accordingly.
