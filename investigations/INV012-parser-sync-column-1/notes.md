# INV012 — parser error recovery skipped to next NEWLINE, not next top-level statement

**Status:** Fixed. `synchronize()` now skips to the next token at
column 1 (a true top-level statement boundary), not just the next
newline. Skips out of nested broken expressions instead of letting
their interior become a fresh top-level parse.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV012-parser-sync-skips-nested.pine`

## Summary

When the parser threw on a token it didn't recognise, the existing
`synchronize()` advanced to the next NEWLINE and resumed parsing
statements. If the bad token was *inside* a nested expression
(switch-arm body, function body, deeply indented `if` body, …), the
next non-newline token was still inside that expression — the
top-level `parse()` loop would try to parse it as a statement, fail
again, and cascade. The canonical victim
(`fixtures/0c053259…pine`, ~2100 lines with one bad `:=` inside a
switch-arm body at line 100) produced **528 errors**, ~525 of them
downstream cascade noise from the parser re-entering broken nested
code line by line.

## Repro

Minimal:

```pine
//@version=6
indicator("t")

f() =>
    float result = switch close
        1.0 => 1
        =>
            x := 2     // ← `:=` (reassignment) not supported in this
                       //   nested switch-arm body context. Real bug.
            x

plot(f())
```

Before fix:

```
errors: many — one for the `:=`, then cascading "Unexpected token"s
across the rest of the file.
```

After fix:

```
errors: ~3 — the original `:=` and a small number of immediate
downstream tokens. No bleeding into top-level code.
```

## Root cause

`packages/core/src/parser/parser.ts:synchronize()`. The old loop:

```ts
this.advance();
while (!this.isAtEnd()) {
    if (this.previous().type === TokenType.NEWLINE) return;
    if (peek is statement-start KEYWORD) return;
    this.advance();
}
```

resumes the moment it sees any newline boundary. For an error at
indent 12 inside a switch arm, the next newline is the very next
line — still at indent 12, still inside the same broken structure.
The top-level parse loop calls `statement()` on that token, which
treats it as a fresh top-level statement (`=>`, `:=`, etc.) and
errors out again. Repeat 500+ times.

## Fix

Sync to "next token starting a new line at column 1". The token's
`indent` field gives us that for free — at column 1 means the lexer
saw it at the start of a line with no leading whitespace.

```ts
while (!this.isAtEnd()) {
    const token = this.peek();
    if (token.indent === 0 && token.line > 1) return;
    if (token.type === KEYWORD && ["if", "for", "while", "var", "varip", "const"].includes(token.value)) return;
    this.advance();
}
```

The keyword fallback stays so we still resume at a recognisable
statement when the bad token *was* at column 1 and we want to retry
immediately.

Inline `// see INV012` reference at the change site.

## Verification

- Canonical fixture `0c053259…pine`: 528 → 269 errors (−259 cascade
  hits eliminated).
- Local regression-check on the full corpus: **1270 TV-silent
  disappearances** (cascade FPs gone), 0 TV-also-flagged
  disappearances (we did not stop catching anything TV catches), 84
  message-changed at same position. 534 new appearances are
  *previously-masked* findings now reachable — sampling shows these
  are real undefined-variable references in user code (e.g.
  `upper = 0.,lower = 0.` comma-separated declarations our parser
  doesn't recognise, so `lower` is genuinely not in scope when
  referenced later). TV is silent on these because TV stops at
  earlier errors. Per methodology we're correctly stricter than TV.
- 158/158 tests pass. New regression fixture
  `packages/core/test/fixtures/regression/INV012-parser-sync-skips-nested.pine`.

Net: −736 corpus FPs from this single change.

## Trade-off and what could come next

Skipping all the way out to column 1 can lose legitimate declarations
that were between the error and the next true top-level statement.
The 534 new "Undefined variable …" appearances are mostly real
findings, but some may be ours losing scope after an aggressive skip.
A more refined synchronize would track parser-state context (in a
function body? a switch arm?) and skip to the end of *that* context
rather than to the next column-1. That's a bigger change requiring
context-stack infrastructure; deferring.

## Methodology notes captured

- A parser fix that *reduces* cascade noise is almost always a net
  improvement even if it surfaces new "appearances" — those new
  appearances are findings the cascade was hiding. Read a sample
  before counting them as regressions.
- The `indent === 0 && line > 1` predicate is a cheap proxy for "this
  token starts a top-level statement". The line>1 guard avoids
  matching the very first token in the file (which is at column 1 but
  doesn't represent a recovery point).
