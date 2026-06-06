# INV043 - /* block comments */ are not Pine

**Date:** 2026-06-07
**Status:** RESOLVED
**Category:** tv-only FN `Syntax error at input "new line"` (1 record:
`34d19af9…:12`, a `/* Block comment on single line */` line) from the
2026-06-05 inventory.

## Claim

Pine has NO block comments in any version - only `//`. Our lexer
deliberately scanned `/* ... */` (including multiline) into a COMMENT
token, silently accepting C-style comments TV rejects. TV has no
block-comment concept at all: it lexes `/` and `*` as two operator
tokens and the parse fails emergently, which is why the message varies
by position.

## Probes (`probes/`, `pine-lint --tv` 2026-06-07)

| probe | shape | TV verdict |
|---|---|---|
| p01 | line-leading `/* block comment */` | CE10156 `Syntax error at input "new line"` at 3:1 (column 1 of the comment's line) |
| p02 | mid-line `y = 2 /* hi */` | CE10156 `Syntax error at input "*"` at 3:8 (the `*` of `/*` - TV parsed `2 /` and choked on the `*`) |
| p03 | multiline `/*` ... `*/` | CE10156 `Syntax error at input "new line"` at 3:1 (the opening line) |

## Implementation

`scanBlockComment` in `lexer.ts` still consumes the whole `/* ... */`
as trivia (recovery: one stray C-style comment must not shred the rest
of the file) but now records a lexer error at TV's anchor: line-leading
(`atLineStart`) gets `Syntax error at input "new line"` at column 1;
mid-line gets `Syntax error at input "*"` at the `*`. One error per
block comment - TV stops at the first, so extras land past its stop.

Corpus effect: +3 records in 1 file (the carrier fixture; its later
block comments sit past TV's stop). `syntax/comments.pine` - which had
codified block comments as valid - now asserts the three errors.

Fixture: `packages/core/test/fixtures/regression/INV043-block-comments.pine`
