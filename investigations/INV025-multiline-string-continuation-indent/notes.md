# INV025 - string continuation requires leading whitespace (CE10017)

**Status:** resolved 2026-06-04. The lexer now terminates a single-pair
string literal at a line break when the next line starts with a
non-whitespace character, emitting TV's CE10017 verbatim at column 1 of
the line where the literal opens.

## Trigger

The `4d78be7e…` corpus file - the biggest undefined-variable cluster in
the 2026-06-04 inventory (~312 records, plus 32 `=>` token errors). The
file is a hard-wrapped (~80 col) mangle of a published script: line 1's
`//` comment spills unprefixed onto line 2, and `indicator('BigBeluga -
Smart Money Concepts` wraps onto lines 7-8 at column 1. TV reports
exactly ONE error and stops:

> 6:1 CE10017 Missing enclosing character in the literal string. Enclose
> literal strings using a set of quotation marks (") or apostrophes (')
> on the same code line.

We accepted the line-spanning string (CW10001 deprecation warning only,
INV019) and parsed the rest of the file into a 348-error cascade.

## The rule (probed)

A `"`/`'` literal continues onto the next physical line **only if that
line starts with whitespace (space/tab) or is blank**. A non-whitespace
character at column 1 - even the closing quote itself - terminates the
literal with CE10017. Unlike expression wrapping (INV017), the indent
does NOT have to avoid multiples of 4: indent-4 and indent-8
continuations are accepted (with CW10001).

Position convention: START is column 1 of the line where the literal
opens - same line-anchor convention as CW10001 (INV019). END does not
follow a convention we could decode (probe a: end 3:5 with the quote at
col 6; probe e: end 3:5 with the quote at col 12; probe h: end 4:6);
as with INV019 we record the observation and emit a nominal length of 1.

## Probes (`pine-lint --tv`, 2026-06-04, files in this directory)

| probe | continuation | TV verdict |
|-------|--------------|-----------|
| `probe-a-indent0.pine` | col 1 | CE10017, start 3:1 end 3:5 |
| `probe-b-indent4.pine` | 4 spaces | accepted, CW10001 |
| `probe-c-indent2.pine` | 2 spaces | accepted, CW10001 |
| `probe-d-indent8.pine` | 8 spaces | accepted, CW10001 |
| `probe-e-endcol.pine` | col 1, literal opens col 12 | CE10017, start 3:1 end 3:5 (end identical to probe a - undecodable) |
| `probe-f-blankline.pine` | blank line, then 2 spaces | accepted, CW10001 |
| `probe-g-tab.pine` | tab | accepted, CW10001 |
| `probe-h-third-line-col0.pine` | 2 spaces, then col 1 | CE10017, start 3:1 end 4:6 |
| `probe-i-quote-col1.pine` | closing `"` at col 1 | CE10017, start 3:1 end 3:5 |

Raw outputs (errors only; accepted probes returned CW10001 +
`success:true` with the variable typed `const string`):

```json
probe-a: {"errors":[{"code":"CE10017","end":{"column":5,"line":3},"message":"Missing enclosing character in the literal string. Enclose literal strings using a set of quotation marks (\") or apostrophes (') on the same code line.","start":{"column":1,"line":3}}]}
probe-e: {"errors":[{"code":"CE10017","end":{"column":5,"line":3},"message":"…same…","start":{"column":1,"line":3}}]}
probe-h: {"errors":[{"code":"CE10017","end":{"column":6,"line":4},"message":"…same…","start":{"column":1,"line":3}}]}
probe-i: {"errors":[{"code":"CE10017","end":{"column":5,"line":3},"message":"…same…","start":{"column":1,"line":3}}]}
```

The probes disagree with our pre-fix validator (which accepted all nine
with at most a CW10001), confirming they reached TV and not a fallback.

Corpus confirmation: all five v6 fixtures that changed under the fix
(`13a74513…`, `4d78be7e…`, `8439b236…`, `988d8b59…`, `b65bc03d…`) now
match TV's single CE10017 at the exact position, tv-only = 0 on each.
`b65bc03d…` is the corpus hash-copy of our own old `syntax/multiline.pine`
synthetic fixture, which encoded the col-1 continuation as valid - same
situation as INV017's `2dd139c2…` note.

## Implementation

- `packages/core/src/parser/lexer.ts` `scanString`: at a line break
  inside the literal, peek the first char of the next line; if it is not
  space / tab / U+00A0 / another line break (blank lines stay inside the
  string, probe f), push the CE10017 message at `(startLine, 1)`, close
  the STRING token at the break, and return - the break is re-scanned as
  a normal NEWLINE. EOF right after a break still takes the existing
  unterminated-at-EOF path.
- `packages/core/test/helpers.ts`: `@expects error:` directives now also
  match parse (lexer + parser) errors and are checked even when parsing
  failed, so parse-error fixtures can pin line + message instead of only
  `parse: fail`.
- Regression fixture:
  `packages/core/test/fixtures/regression/INV025-string-continuation-indent.pine`.
- `syntax/multiline.pine` amended: its multiline-string case used col-1
  continuations, i.e. encoded the bug as expected behavior.

## Measurement impact (2026-06-04)

- tv-only: 57 -> 52 (the five CE10017 true FNs now matched).
- Local corpus baseline: 16835 -> 21636 error records. All growth is on
  46 mangled hard-wrapped files (2 v4, 39 v5, 5 v6) where strings used
  to silently swallow wrapped code and now break at the wrap point; the
  surfaced garbage parses into honest cascade errors. TV stops at its
  first fatal error on such files, so the cascades have no TV verdict.
- That cascade noise motivated the `find-real-failures` post-TV-stop
  bucketing (same date): local-only errors strictly after the last error
  TV reported on a TV-erroring file are unconfirmable and now counted
  separately. Inventory: 1110 mixed local-only -> 125 confirmable +
  985 post-TV-stop.
