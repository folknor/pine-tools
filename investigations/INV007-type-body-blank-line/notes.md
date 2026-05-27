# INV007 — blank line inside a `type` / `enum` body ended the body-skip early

**Status:** Fixed. The `typeOrEnumDeclaration` body-skip now skips
`NEWLINE` tokens before checking indent.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV007-blank-line-in-type-body.pine`

## Summary

```pine
type Session
    string sess
    int session

    bool is_extended    // ← reported "Undefined variable 'is_extended'"
    bool in_session     // ← reported "Undefined variable 'in_session'"
```

A single blank line inside a `type` body terminated our type-body
skip. Every field declaration past the blank line leaked back into
top-level statement parsing, where `bool is_extended` was interpreted
as a bare reference to `is_extended` and reported as undefined.

`pine-lint --tv`: 0 errors on the equivalent file.

## Root cause

`packages/core/src/parser/lexer.ts` emits a `NEWLINE` token for every
`\n`, and the lexer is `atLineStart = true` between newlines. For a
blank line (no content between two `\n`s) the second `\n` is emitted
*while still at line-start*, with `currentIndent` either 0 (truly
blank) or the count of leading whitespace. The `addToken` then sets
`indent` on that `NEWLINE` token. So a blank line inside a type body
produces a `NEWLINE` whose `indent` is 0.

`parser.ts:typeOrEnumDeclaration` walks tokens after the type-header
and breaks out of the body when it sees a line-start token whose
`indent` is below the body's. The check was:

```ts
if (
    isLineStart &&
    currentToken.line > startToken.line &&
    currentToken.indent !== undefined &&
    currentToken.indent < bodyIndent
) {
    break;
}
```

A blank-line `NEWLINE` with `indent: 0` satisfies all four predicates
and breaks out — so the rest of the type body parses as top level.

## Fix

`packages/core/src/parser/parser.ts:typeOrEnumDeclaration` skips
`NEWLINE` tokens before any indent-based break check:

```ts
if (currentToken.type === TokenType.NEWLINE) {
    this.advance();
    continue;
}
```

We considered fixing the lexer to set `indent: undefined` on `NEWLINE`
tokens, which would have been a one-line change. Tried it — and the
regression check immediately surfaced 47 new "Undefined variable …"
appearances across other fixtures. The reason: several block-parser
sites in `parser.ts` use `this.peek().indent || 0` to decide whether a
function or `if`/`for` body has ended; with `NEWLINE.indent` becoming
`undefined`, `undefined || 0 = 0`, every newline looked like "back to
column 0" and bodies terminated prematurely. The parser-local fix
keeps the lexer behaviour stable and surgically corrects only the
body-skip that already used `indent !== undefined` as the line-start
predicate.

Inline `// see INV007` reference at the change site.

## Verification

- Minimal repro: 2 → 0 errors.
- Two large library fixtures both regressed all of their false
  positives caused by leaked type-body fields:
  `93badd17…pine` 157 → 138, `fffe6a2f…pine` 45 → 45 (was already
  clean of this class — no blank line in its type body).
- Regression check: 0 new error appearances, 115 TV-silent
  disappearances (correct FP removals), 0 truly TV-also-flagged
  disappearances. The 1 reported TV-also-flagged is at
  `93badd17…pine:142:10` — same position the fix removes — and
  fresh `pine-lint --tv` on that file now reports 0 errors, so the
  annotation is a stale-reference artifact (see INV003's
  methodology note about refreshing baselines and TV references
  together).
- 154/154 tests pass. New regression fixture
  `packages/core/test/fixtures/regression/INV007-blank-line-in-type-body.pine`
  asserts the minimal repro.

## Adjacent finding (separate from this fix)

`fixtures/8439b2366…pine:1057` still reports `Undefined variable
'overlap'` — that one wasn't caused by a blank line in a type body.
The `overlap` variable IS declared at the top level (line 817) but
isn't visible at line 1057. Task #15 was originally opened thinking
both `is_extended` and `overlap` were the same bug; INV007 covers
`is_extended`. `overlap` is a different scope-visibility issue —
re-pointed task #15 to that single remaining case.

## Methodology notes captured

- A *lexer* change that affects an attribute used by multiple parser
  sites is high-risk. Even if one site looks like the natural home of
  the fix, a parser-local fix at the consuming site is safer when
  there are other consumers with subtly different expectations.
  Discovered by trying the lexer fix first and watching the
  regression check light up.
- "Stale TV reference" stings every time: refreshing the baseline
  after a fix without also refreshing
  `lint-reports/real-failures.json` produces misleading
  `tvSilent`/`tvFlagged` annotations. Already in INV003's notes; this
  is the second occurrence. Worth a tooling fix where
  `regression-check.mjs` warns if the TV reference is older than the
  baseline.
