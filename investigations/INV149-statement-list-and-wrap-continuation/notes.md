# INV149 - mixed statement lists, and wraps interrupted by a blank line

Two parser false positives from the INV148 audit, both on shapes TV accepts.
Filed together because both are "the parser looked one token too far and gave
up", and both were originally reported as something else.

## 1. A comma-separated statement list may mix assignments and bare calls

`cvd-profiles.pine:577` reported `Unexpected token: :=`. Minimized:

```pine
//@version=6
indicator("t")
var a = 0.0
var b = 0.0
var c = array.new<float>()
if close > open
    b := na   , c.clear()
plot(a + b)
```

TV: clean (2026-08-21). Us, before: `7:7: error: Unexpected token: :=`.

The assignment-led comma loop in `parser.ts` required every unit after a
comma to be an assignment:

```ts
const nextTarget = this.expression();
if (!this.match(ASSIGN) && !this.match(COMPOUND_ASSIGN)) {
    throw new Error("Expected assignment operator after comma");
}
```

A bare call has no assignment operator, so it threw, the catch backtracked to
the checkpoint, and the whole statement failed - reporting at the LEADING
`:=`, which is the one unit that was fine. That misdirection is why the
external report attributed the failure to line 100 (method calls in tuple
position) rather than 577; line 100 parses fine.

The mirror-image path, `expressionStatement`'s comma loop, already handled
both forms, which is why order decided the verdict:

- `c.clear(), a := na` - call-led, parsed
- `b := na, c.clear()` - assignment-led, failed

Fixed by giving the assignment-led loop the same both-forms handling.

## 2. A wrapped expression survives a blank or comment-only line

`volume-supply-demand.pine:734` reported `Unexpected token: .`. The source is
a method chain with one link commented out:

```pine
profile_data := CandleData.new(data.data.slice(0, data_width), true)
 .market_profile_data(number_of_bins, period)
 .filter_profile(filtering)
//  .normalize()
 .set_poc()
```

Minimized, and a BLANK line reproduces it identically - so this is not about
comments:

```pine
//@version=6
indicator("t")
a = array.new<float>(5, 1.0)
x = a.slice(0, 3)
 .slice(0, 2)

 .size()
plot(x)
```

TV: clean (2026-08-21). Us, before: `7:2: error: Unexpected token: .`

Comments are filtered out of the token stream as trivia, so a comment-only
line and a blank line both leave two consecutive NEWLINE tokens. The postfix
wrap check read `peekNext()` - one token past the current NEWLINE - which is
the SECOND NEWLINE. A NEWLINE carries no `indent`, `(undefined ?? 0) % 4` is
0, so `continuationIndent` went false and the wrap was treated as ended.

Fixed with `firstTokenAfterNewlines()`, which resolves past every NEWLINE, and
by consuming all of them when continuing rather than one per loop pass.

Note the earlier minimal repro in INV148 was wrong: it was only ever run
through `--tv`, never through our own linter, and it does not reproduce. The
trailing comma is incidental - what mattered was the bare call in the list
(finding 1) and the interrupted wrap (finding 2).

## Verification

- TV, 2026-08-21: the full regression fixture body is clean, including the
  binary-operator wrap across a blank line (`x = a` / ` + 1.0` / blank /
  ` + 2.0`), which the earlier probes had not covered.
- Corpus regression-check: **0 fixtures changed, 0 new appearances**. Both
  fixes are strictly additive - they only accept shapes that previously
  failed - so no corpus fixture could change.
- `volume-supply-demand.pine` now reports no errors, matching TV (which
  returns one CW10003 warning and no errors). `cvd-profiles.pine`'s parse
  error is gone; its remaining diagnostics are the collection `:=` class
  recorded as INV148 finding (b).
- 454 vitest passing.

## Files touched

- `packages/core/src/parser/parser.ts` - both-forms handling in the
  assignment-led comma loop; new `firstTokenAfterNewlines()`
- `packages/core/src/parser/expressions.ts` - postfix wrap resolves past all
  newlines and consumes them together
- `packages/core/test/fixtures/regression/INV149-statement-list-and-wrap-continuation.pine`
