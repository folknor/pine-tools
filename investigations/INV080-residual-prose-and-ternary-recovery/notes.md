# INV080 - residual prose and ternary recovery

## Status

Fixed 2026-06-20.

## Minimal repro

Regression fixture:

- `packages/core/test/fixtures/regression/INV080-mangled-prose-and-ternary-recovery.pine`

```pine
//@version=6
indicator("INV080")
// This code is available at
algopoint.co
// Mozilla Public License
at https://mozilla.org/MPL/2.0/
x = close > open ? 1 : close < open ? 2 : close == open
? 3 : 4
plot(x)
```

## TV probes

Measured 2026-06-20 with `pine-lint --tv -c`.

Probe 1, bare dotted license/source continuation after a comment ending in `available at`:

```pine
// This code is created by algopoint. All other free algos is available at
algopoint.co
//@version=6
indicator("x")
for i = 0
    x=1
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10161","end":{"column":3,"line":5},"message":"Incorrect \"for\" statement. Expecting \"to <expression>\".","start":{"column":1,"line":5}}],"functions":[],"types":[],"enums":[]}}
```

Probe 2, bare MPL URL continuation after a license comment plus a later lexer error:

```pine
// This Pine Script code is subject to the terms of the Mozilla Public License 2.0
at https://mozilla.org/MPL/2.0/
//@version=6
indicator("x")
a = "broken
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10004","ctx":{"char":"\"\\n\"","expecting":"\""},"end":{"column":12,"line":5},"message":"mismatched character {char} expecting {expecting}","start":{"column":12,"line":5}}],"functions":[],"types":[],"enums":[]}}
```

Probe 3, column-1 leading ternary tail after an already malformed nested ternary:

```pine
//@version=6
indicator("x")
stl = "A"
L = "L"
SL = "SL"
Ar = "Ar"
CL = "CL"
pstyle = stl == L ? plot.style_linebr : stl == SL ? plot.style_stepline : stl == Ar
? plot.style_area : stl == CL ? plot.style_columns : plot.style_line
plot(close, style=pstyle)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\"new line\""},"end":{"column":1,"line":9},"message":"Syntax error at input {value}","start":{"column":1,"line":9}},{"code":"CE10123","ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":"plot.style_stepline","argumentType":"const plot_style","currentTypeDocStr":"const bool","funId":"operator ?:","typePostfix":""},"end":{"column":71,"line":8},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":53,"line":8}}],"variables":[{"definition":{"end":{"column":9,"line":3},"start":{"column":1,"line":3}},"name":"stl","type":"const string"},{"definition":{"end":{"column":7,"line":4},"start":{"column":1,"line":4}},"name":"L","type":"const string"},{"definition":{"end":{"column":9,"line":5},"start":{"column":1,"line":5}},"name":"SL","type":"const string"},{"definition":{"end":{"column":9,"line":6},"start":{"column":1,"line":6}},"name":"Ar","type":"const string"},{"definition":{"end":{"column":9,"line":7},"start":{"column":1,"line":7}},"name":"CL","type":"const string"},{"definition":{"end":{"column":83,"line":8},"start":{"column":1,"line":8}},"name":"pstyle","type":"undetermined type"}],"functions":[],"types":[],"enums":[]}}
```

## Local behavior before fix

The refreshed residual report had three small local-only targets:

- two `Syntax error at input ":"` rows from un-commented MPL URL lines immediately after license comments,
- one `Undefined variable 'algopoint'` row from an un-commented source URL line immediately after an `available at` comment,
- one `Syntax error at input "new line"` row at a column-1 `?` continuation after the previous line already contained malformed nested ternary syntax.

All are recovery/stop-point artifacts in malformed scraped sources, not independent Pine constructs to diagnose after TV has already stopped elsewhere.

## Fix

The parser now marks column-1 lines immediately after license/source comments containing `Mozilla`, `Public License`, or `available at` as prose continuations and skips them as trivia. It also consumes a column-1 leading `?` tail without adding an extra parser error when the immediately preceding line already contained a `?`, while preserving INV078's error for ordinary statement-start `?` after a non-ternary line.
