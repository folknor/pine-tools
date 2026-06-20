# INV081 - recovered call mangled argument audit

## Status

Fixed 2026-06-20.

## Minimal repro

Regression fixture:

- `packages/core/test/fixtures/regression/INV081-recovered-call-mangled-arg.pine`

```pine
//@version=6
indicator("INV081")
label.new(bar index, high, text="x")
plot(close)
```

## TV probes

Measured 2026-06-20 with `pine-lint --tv -c`.

Probe 1, adjacent identifiers inside a call argument:

```pine
//@version=6
indicator("x")
if true
    label.new(bar index, high, text="x")
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\"index\""},"end":{"column":19,"line":4},"message":"Syntax error at input {value}","start":{"column":19,"line":4}}],"functions":[],"types":[],"enums":[]}}
```

Probe 2, plot-style constant used as ternary condition:

```pine
//@version=6
indicator("x")
pstyle = plot.style_linebr ? plot.style_stepline : plot.style_area
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"plot.style_linebr","argumentType":"const plot_style","currentTypeDocStr":"const bool","funId":"operator ?:","typePostfix":""},"end":{"column":26,"line":3},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":10,"line":3}}],"variables":[{"definition":{"end":{"column":66,"line":3},"start":{"column":1,"line":3}},"name":"pstyle","type":"undetermined type"}],"functions":[],"types":[],"enums":[]}}
```

Probe 3, valid non-multiple-of-4 continuation after trailing ternary colon:

```pine
//@version=6
indicator("x")
lowerBand = 1.0
prevLowerBand = 2.0
lowerBand := lowerBand > prevLowerBand or close[1] < prevLowerBand ? lowerBand :
      prevLowerBand
plot(lowerBand)
```

TV result:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":15,"line":3},"start":{"column":1,"line":3}},"name":"lowerBand","type":"series float"},{"definition":{"end":{"column":19,"line":4},"start":{"column":1,"line":4}},"name":"prevLowerBand","type":"const float"}],"functions":[],"types":[],"enums":[]}}
```

Probe 4, invalid column-1 continuation after trailing ternary colon:

```pine
//@version=6
indicator("x")
lowerBand = 1.0
prevLowerBand = 2.0
lowerBand := lowerBand > prevLowerBand or close[1] < prevLowerBand ? lowerBand :
prevLowerBand
plot(lowerBand)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\"end of line without line continuation\""},"end":{"column":81,"line":5},"message":"Syntax error at input {value}","start":{"column":81,"line":5}}],"variables":[{"definition":{"end":{"column":15,"line":3},"start":{"column":1,"line":3}},"name":"lowerBand","type":"const float"},{"definition":{"end":{"column":19,"line":4},"start":{"column":1,"line":4}},"name":"prevLowerBand","type":"const float"}],"functions":[],"types":[],"enums":[]}}
```

## Findings

The three remaining local-only buckets were distinct:

1. `bar index` inside `label.new()`/`line.new()` produced both parser and checker noise. TV reports one syntax error at `index`. Our in-call recovery already truncated the malformed argument, but then the checker validated the partial argument and emitted `Undefined variable 'bar'`. The parser wording also used an internal suggestion message.
2. The `operator ?:` row is a real type diagnostic on a plot-style constant used as a ternary condition. TV reports the same CE10123 shape in isolation. The row stays local-only only because the full scraped file has an earlier TV stop point/position issue.
3. The `end of line without line continuation` bucket includes real trailing-operator wrap violations. TV accepts non-multiple-of-4 continuations and rejects column-1 continuations. The representative source has form-feed/mangled indentation and earlier lexer errors, so remaining report rows are not safe to relax as a group.

## Fix

The parser now reports adjacent identifier call-argument mangles as `Syntax error at input "<identifier>"`, matching TV's CE10156 wording. This aligns the parser half of the `bar index` bucket. The checker-side `Undefined variable 'bar'` rows remain visible because the partial recovered argument is still represented in the AST; suppressing all recovered-call argument validation would hide real argument-expression errors in other malformed calls and needs a narrower follow-up if we want to remove that noise.
