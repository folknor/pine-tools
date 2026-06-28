# INV132 - bar_index history makes UDFs history-dependent

**Date:** 2026-06-28
**Status:** fixed
**Code:** `packages/core/src/parser/semanticAnalyzer.ts`
**Fixture:** `packages/core/test/fixtures/regression/consistency-warning-bar-index-history.pine`
**Source:** TODO #61 / TODO #9 residual, `db76cf79` `FindST` TV-only CW10003.

## Finding

The `FindST` residual reduces to a narrow builtin-history exception:
`bar_index[1]` inside a UDF/method makes that UDF history-dependent for TV's
CW10003 check. Ordinary builtin history reads such as `high[1]` and `time[1]`
stay silent.

This explains the carrier without broadening the user-global-index rule from
INV126. `FindST` passes `bar_index[1]` into `MS.Add(...)`, so its body contains
the `bar_index` history read TV cares about. The earlier "builtin indexes are
silent" statement was too broad: it is true for price/time series, but not for
`bar_index`.

## TV probes

All probes were run with `pine-lint --tv -c` on 2026-06-28. Each returned
`success:true`. TV output syntax arrows are rendered as `\u2192` below so this
note stays ASCII-only.

### P1 - exact regression fixture shape

```pine
//@version=6
indicator("bar index udf history")
usesBarIndex() => bar_index[1]
usesTime() => time[1]
usesHigh() => high[1]
var int b = na
var int t = na
var float h = na
var float c = na
if barstate.isconfirmed
    b := usesBarIndex()
    t := usesTime()
    h := usesHigh()
if close > open
    c := ta.sma(close, 2)
plot(b + t + h + c)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10003","ctx":{"functionName":"usesBarIndex"},"end":{"column":23,"line":11},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":10,"line":11}},{"code":"CW10003","ctx":{"functionName":"ta.sma"},"end":{"column":25,"line":15},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":10,"line":15}}],"variables":[{"definition":{"end":{"column":14,"line":6},"start":{"column":1,"line":6}},"name":"b","type":"series int"},{"definition":{"end":{"column":14,"line":7},"start":{"column":1,"line":7}},"name":"t","type":"series int"},{"definition":{"end":{"column":16,"line":8},"start":{"column":1,"line":8}},"name":"h","type":"series float"},{"definition":{"end":{"column":16,"line":9},"start":{"column":1,"line":9}},"name":"c","type":"series float"}],"functions":[{"args":[],"definition":{"end":{"column":30,"line":3},"start":{"column":1,"line":3}},"name":"usesBarIndex","returnedTypes":["series int"],"syntax":["usesBarIndex() \u2192 series int"]},{"args":[],"definition":{"end":{"column":21,"line":4},"start":{"column":1,"line":4}},"name":"usesTime","returnedTypes":["series int"],"syntax":["usesTime() \u2192 series int"]},{"args":[],"definition":{"end":{"column":21,"line":5},"start":{"column":1,"line":5}},"name":"usesHigh","returnedTypes":["series float"],"syntax":["usesHigh() \u2192 series float"]}],"types":[],"enums":[]}}
```

### P2 - direct bar_index history warns

```pine
//@version=6
indicator("INV132-direct-bar-index-tail")
f() =>
    x = bar_index[1]
    0
if barstate.isconfirmed
    f()
if close > open
    c = ta.sma(close, 2)
plot(close)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10003","ctx":{"functionName":"f"},"end":{"column":7,"line":7},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":5,"line":7}},{"code":"CW10003","ctx":{"functionName":"ta.sma"},"end":{"column":24,"line":9},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":9,"line":9}}],"variables":[{"definition":{"end":{"column":20,"line":4},"start":{"column":5,"line":4}},"name":"x","scopeId":"#1","type":"series int"},{"definition":{"end":{"column":24,"line":9},"start":{"column":5,"line":9}},"name":"c","scopeId":"#3","type":"series float"}],"functions":[{"args":[],"definition":{"end":{"column":5,"line":5},"start":{"column":1,"line":3}},"name":"f","returnedTypes":["literal int"],"syntax":["f() \u2192 literal int"]}],"types":[],"enums":[]}}
```

### P3 - time history stays silent

```pine
//@version=6
indicator("INV132-wrapper-plain-fn-time")
g(int t) =>
    t
f() =>
    g(time[1])
    0
if barstate.isconfirmed
    f()
if close > open
    c = ta.sma(close, 2)
plot(close)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10003","ctx":{"functionName":"ta.sma"},"end":{"column":24,"line":11},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":9,"line":11}}],"variables":[{"definition":{"end":{"column":7,"line":3},"start":{"column":3,"line":3}},"name":"t","scopeId":"#1","type":"series int"},{"definition":{"end":{"column":24,"line":11},"start":{"column":5,"line":11}},"name":"c","scopeId":"#4","type":"series float"}],"functions":[{"args":[{"allowedTypeIDs":["series int","simple int","input int","const int"],"displayType":"series int","name":"t","required":true}],"definition":{"end":{"column":5,"line":4},"start":{"column":1,"line":3}},"name":"g","returnedTypes":["series int"],"syntax":["g(series int t) \u2192 series int"]},{"args":[],"definition":{"end":{"column":5,"line":7},"start":{"column":1,"line":5}},"name":"f","returnedTypes":["literal int"],"syntax":["f() \u2192 literal int"]}],"types":[],"enums":[]}}
```

### P4 - high history stays silent

```pine
//@version=6
indicator("INV132-builtin-index-only")
f() =>
    h = high[1] > high
    if h
        x = 1
    0
if barstate.isconfirmed
    f()
if close > open
    c = ta.sma(close, 2)
plot(close)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10003","ctx":{"functionName":"ta.sma"},"end":{"column":24,"line":11},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":9,"line":11}}],"variables":[{"definition":{"end":{"column":22,"line":4},"start":{"column":5,"line":4}},"name":"h","scopeId":"#1","type":"series bool"},{"definition":{"end":{"column":13,"line":6},"start":{"column":9,"line":6}},"name":"x","scopeId":"#2","type":"const int"},{"definition":{"end":{"column":24,"line":11},"start":{"column":5,"line":11}},"name":"c","scopeId":"#4","type":"series float"}],"functions":[{"args":[],"definition":{"end":{"column":5,"line":7},"start":{"column":1,"line":3}},"name":"f","returnedTypes":["literal int"],"syntax":["f() \u2192 literal int"]}],"types":[],"enums":[]}}
```

## Implementation

`scanExpressionForHistoryDependence` now treats an `IndexExpression` whose
object is exactly `bar_index` as UDF history. Other builtin series values remain
outside the own-scope history set, preserving INV018/INV126's builtin-history
boundary for `high[1]`, `close[1]`, and `time[1]`.

## Verification

- `node_modules/.bin/biome check packages/core/src/parser/semanticAnalyzer.ts packages/core/test/fixtures/regression/consistency-warning-bar-index-history.pine`: pass.
- `node_modules/.bin/tsc -p . --pretty false`: pass.
- `node_modules/.bin/vitest run`: 13 files passed, 419 tests passed.
- `node scripts/build-extension.js`: pass.
- `node scripts/regression-check.mjs`: 1879 fixtures checked, 0 changed
  fixtures, 0 new error appearances, 0 disappeared errors.
- `node scripts/install-cli.js`: pass, installed updated `pine-lint`.
- `node scripts/compare-tv.mjs fixtures/db76cf79108400e3eba36ba23426471272b65cd44b0b2f970d0779312e6332f6.pine`:
  0 local-only errors, 0 tv-only errors; warnings local 14 / TV 6, local-only 8
  / tv-only 0. The remaining warning diffs are pre-existing local-only noise;
  `FindST` is now shared with TV.
- `node scripts/compare-tv.mjs packages/core/test/fixtures/regression/consistency-warning-bar-index-history.pine`:
  0 local-only errors, 0 tv-only errors; warnings local 2 / TV 2, local-only 0
  / tv-only 0.
- `node scripts/find-real-failures.mjs --concurrency 4`: v6 scanned 748; total
  local-only errors 29; total tv-only errors 0; same-pos message pairs 1; TV
  response unparseable 4; warning local-only 1293; warning local-only past TV
  stop 200; warning tv-only 3.
- `node scripts/categorize-failures.mjs`: 29 local-only hits in 3 error
  categories; 0 tv-only categories.
