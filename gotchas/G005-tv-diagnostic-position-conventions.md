# G005 - TV's diagnostic position conventions (line splitting + logical-line columns)

**Status:** active. Probed 2026-06-04 via `pine-lint --tv`.

TV's `translate_light` reports diagnostic positions (both the `errors`
and `warnings` channels) under two conventions that differ from naive
expectations. Both produced position-keyed diff artifacts in our
TV-comparison reports (TODO #38) until accounted for.

## 1. Line splitting: `\r\n` | `\r` | `\n` are each one break

TV splits source into lines exactly like VS Code and LSP: at `\r\n`,
lone `\r`, and `\n`. Consequences:

- A file with `\r\r\n` line endings (each "line" ends `\r` + `\r\n`)
  counts TWO breaks per visual line: content sits on TV lines 1, 3, 5,
  ... i.e. `tv_line = 2n - 1` for visual line n. **522 of 1879 corpus
  fixtures** have `\r\r\n` endings (TradingView's own script export
  produces them, apparently), so this skew was corpus-wide.
- CR-only files (130 fixtures) split normally at every `\r`.

Our lexer used to SKIP `\r` entirely: `\r\r\n` counted one break
(halved line numbers vs TV), and CR-only files never broke at all - the
first `//` comment swallowed the whole file and we reported ZERO
diagnostics. Fixed 2026-06-04 in `lexer.ts` (`handleLineBreak`; lone
`\r` breaks, `\r\n` breaks at the `\n`) - our positions now match TV's
on every terminator style. Tests: `packages/core/test/lexer-line-endings.test.ts`.

### Probe (line conventions)

The same script was sent with four terminator styles; joined here with
visible terminators. Content lines:

```pine
//@version=6
indicator("x")
s = 0.0
if close > open
    s := ta.sma(close, 14)
plot(zzz)
```

`pine-lint --tv`, 2026-06-04:

| terminator | CW10003 (ta.sma) | CE10272 (zzz) |
|---|---|---|
| `\n` (probe-lf) | line 5 | line 6 |
| `\r\n` (probe-crlf) | line 5 | line 6 |
| `\r` (probe-cr) | line 5 | line 6 |
| `\r\r\n` (probe-crcrlf) | **line 9** (= 2*5-1) | **line 11** (= 2*6-1) |

Raw `\r\r\n` output (abridged):

```json
{"errors":[{"code":"CE10272","ctx":{"identifier":"zzz"},"start":{"column":6,"line":11}}],
 "warnings":[{"code":"CW10003","ctx":{"functionName":"ta.sma"},"start":{"column":10,"line":9}}]}
```

Our local CLI (before the lexer fix) reported lines 5/6 for `\r\r\n`
and NOTHING AT ALL for CR-only. After the fix it matches TV on all four.

## 2. Wrapped statements: positions on the LOGICAL line

For a statement wrapped across physical lines, TV anchors the position
at the statement's FIRST physical line and accumulates the column over
a join of the continuation lines. The join rule (derived to exact-match
on two independent probes and a corpus fixture):

- line comments are stripped; the whitespace BEFORE them is kept
- continuation lines have their leading whitespace stripped
- parts are joined with a single space

This cannot be changed on TV's side; our linter reports physical
positions (correct for editors). The TV-diff scripts invert the rule
(`scripts/lib/tv-positions.mjs`, used by `compare-tv.mjs` and
`find-real-failures.mjs`): walk forward from the reported line while
the column overflows the line's contributed length, bailing back to the
raw position when the shape doesn't look like a continuation.

### Probe (wrap, no comments)

```pine
//@version=6
indicator("x")
b = close > open and
     ta.crossover(close, open)
plot(b ? 1 : 0)
```

`pine-lint --tv`, 2026-06-04: CW10002 for `ta.crossover` at
**3:22-3:46**. Physically the call is at 4:6. Line 3 is 21 chars; join
space puts the continuation's first char at col 22. (Our local CLI
reports 4:6.)

### Probe (wrap, with comments)

```pine
//@version=6
indicator("x")
buySignal = close < 25 and                 // LSMA deep oversold
             open < 25 and                 // Green above extreme low
             high < 50 and                 // Energy not dead
             ta.crossover(close, open) and   // Red crosses ABOVE
             low > 70          // sRSI overbought
plot(buySignal ? 1 : 0)
```

`pine-lint --tv`, 2026-06-04: CW10002 at **3:107-3:131**. Physically
`ta.crossover` is at 6:14. Arithmetic: line 3 code part incl
whitespace-before-comment = 43, lines 4/5 stripped of 13-char indent =
30 each; 43+1+30+1+30+1 = 106 chars precede, call at col 107. Exact.
Corpus confirmation: `fixtures/24ca62d3…pine` warning at TV 128:103 =
physical 131:14 (41+1+29+1+29+1 = 102).

## Lessons

- When local-only and tv-only diff records pair up with the same
  message, suspect a position-convention mismatch before assuming a
  real disagreement.
- An "impossible" TV column (past the physical line's end) is the
  signature of the logical-line convention.
- TV's verdict content was IDENTICAL across all terminator styles -
  only positions move. Line-ending weirdness does not change what TV
  accepts.
