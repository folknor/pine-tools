# INV017 - line-wrap continuation must not be indented by a multiple of 4

**Status:** Fixed. The postfix line-continuation heuristic now refuses to
continue an expression onto a next line whose indent is a multiple of 4
(including 0), matching Pine's documented line-wrapping rule.

**Regression fixture:**
`packages/core/test/fixtures/syntax/newline-continuation.pine` (the dot-
continuation case asserts the valid indent-2 form; the switch-arm gluing
is covered by `packages/core/test/parser-blocks.test.ts` and
`packages/core/test/fixtures/regression/switch-inline-statement-arms.pine`).

## Summary

Our expression parser allowed a "line continuation" whenever the token
after a NEWLINE was an operator, `(`, or `.` - with NO indent restriction.
Pine's actual rule (po: language/script-structure, "Line wrapping"):

> each wrapped line after the first can use any indentation length
> *except* multiples of four, because Pine uses four-space or tab
> indentations to define local code blocks.

(Inside parentheses there is no restriction - and since the lexer now
suppresses NEWLINE tokens at bracket depth > 0 (see TODO #34 / plan/31),
the in-paren case never reaches this heuristic at all.)

The unrestricted heuristic made a switch arm's inline body swallow the
NEXT arm's condition whenever that condition started with `(`:

```pine
x = switch
    close > open => 1
    (close - open) > 2 => 2
    => 3
```

parsed arm 1's result as the CALL `1(close - open)` (the `(` after the
newline was taken as call continuation), corrupting the rest of the
switch ("Unexpected token: =>" on the next arm). Found while fixing
TODO #33; corpus site `2bc21765…pine:162` (`uV += nzV` arms with
parenthesized conditions).

## TV probes (2026-06-04, pine-lint --tv)

Probe 1 - indent-4 continuation (multiple of 4). TV REJECTS:

```pine
//@version=6
indicator("x")
result = math.abs(close)
    .round()
plot(result)
```

TV output (success:true):

```json
{"errors":[{"code":"CE10013","ctx":{"expecting":"\"end of line without line continuation\"","unexpectedToken":"\".\""},"end":{"column":5,"line":4},"message":"Mismatched input {unexpectedToken} expecting set {expecting}","start":{"column":5,"line":4}}]}
```

Probe 2 - identical script with indent-2 continuation (not a multiple
of 4). TV ACCEPTS the wrap - it joins the lines into one expression and
reports only the (intentional) semantic error on the joined expression,
spanning the wrap (positions 3:26-36), proving the parse succeeded:

```pine
//@version=6
indicator("x")
result = math.abs(close)
  .round()
plot(result)
```

TV output (success:true):

```json
{"errors":[{"code":"CE10271","ctx":{"fullName":"float.round","kind":"method or method reference"},"end":{"column":36,"line":3},"message":"Could not find {kind} '{fullName}'","start":{"column":26,"line":3}}]}
```

The probes disagree with our pre-fix parser (which accepted probe 1),
confirming they reached TV and not a fallback.

## Root cause

`packages/core/src/parser/expressions.ts` `postfix()`: the NEWLINE-
continuation branch checked only the FOLLOWING token's type (operator /
LPAREN / DOT), never its indent. A switch arm line, an if-body line, or
any block statement starting with `(` therefore looked like a call
continuation of the previous expression.

## Fix

Gate the continuation on `(nextToken.indent ?? 0) % 4 !== 0`. Tab
indents count as 4 in the lexer, so the modulo holds for tabs too.
Inline `// see TODO #33` pointer at the site (this investigation
documents the probes).

Our own fixture `syntax/newline-continuation.pine` previously asserted
the indent-4 dot-continuation form - i.e. it encoded the bug as
expected behavior. Amended to the TV-valid indent-2 form. (A hash-named
copy of that synthetic fixture also lives in the corpus as
`fixtures/2dd139c2…pine`, so that file's new parse error is expected,
not a published-script regression.)

## Verification

- Corpus regression diff: the only two appearance sites for this
  tightening are `2dd139c2…pine` (our own synthetic fixture, above) and
  `988d8b59…pine:22` (wrapped comment text that lost its `//`, where the
  old behavior silently glued garbage into a call - the new error is
  more honest). No published-script regressions.
- The switch-arm gluing sites (`2bc21765…pine`) parse correctly.
