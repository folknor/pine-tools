# INV131 - undetermined UDF result gates suppress consistency warnings

**Date:** 2026-06-28
**Status:** fixed
**Code:** `packages/core/src/parser/semanticAnalyzer.ts`
**Fixture:** `packages/core/test/fixtures/regression/consistency-warning-undetermined-udf-gate.pine`
**Source:** TODO #61 / TODO #9 residual, `25a4a7` `math.sum` local-only
CW10003 false positive.

## Finding

The `25a4a7` carrier is not a "we are more correct than TV" case. TV really is
silent on the two local `math.sum` warnings while still warning on the nearby
`ta.change` condition calls. The load-bearing shape is:

- a UDF has untyped params;
- its tail is series-producing;
- the series tail depends on those untyped params, directly or through a local;
- a caller assigns that UDF result to a variable TV displays as
  `undetermined type`;
- that variable appears in the immediate branch gate.

When those conditions hold, TV suppresses CW10003/4 for history-dependent calls
inside that branch, even when another part of the same gate is plainly series.
The suppression is not a blanket "untyped UDF" rule: an identity return and a
series tail that ignores the untyped param both still warn. The `and` / `or`
right operand check is also independent: a history-dependent call inside the
gate expression still gets CW10002.

## TV probes

All probes were run with `pine-lint --tv -c` on 2026-06-28. Each returned
`success:true`. TV output syntax arrows are rendered as `\u2192` below so this
note stays ASCII-only.

### P1 - focused fixture shape

```pine
//@version=6
indicator("undetermined udf gate")
f(x, len) =>
    ta.sma(x, len)
u = f(close, 6)
g(x) =>
    ta.sma(close, 6)
gu = g(1)
var float y = na
var float z = na
var float a = na
var float b = na
if close > u and close > open
    y := math.sum(volume, 6)
    z := ta.sma(close, 6)
if close > open
    a := math.sum(volume, 6)
if close > gu and close > open
    b := math.sum(volume, 6)
plot(y + z + a + b)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10003","ctx":{"functionName":"math.sum"},"end":{"column":28,"line":17},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":10,"line":17}},{"code":"CW10003","ctx":{"functionName":"math.sum"},"end":{"column":28,"line":19},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":10,"line":19}}],"variables":[{"definition":{"end":{"column":15,"line":5},"start":{"column":1,"line":5}},"name":"u","type":"undetermined type"},{"definition":{"end":{"column":9,"line":8},"start":{"column":1,"line":8}},"name":"gu","type":"series float"},{"definition":{"end":{"column":16,"line":9},"start":{"column":1,"line":9}},"name":"y","type":"undetermined type"},{"definition":{"end":{"column":16,"line":10},"start":{"column":1,"line":10}},"name":"z","type":"undetermined type"},{"definition":{"end":{"column":16,"line":11},"start":{"column":1,"line":11}},"name":"a","type":"series float"},{"definition":{"end":{"column":16,"line":12},"start":{"column":1,"line":12}},"name":"b","type":"series float"},{"definition":{"end":{"column":3,"line":3},"start":{"column":3,"line":3}},"name":"x","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":8,"line":3},"start":{"column":6,"line":3}},"name":"len","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":3,"line":6},"start":{"column":3,"line":6}},"name":"x","scopeId":"#2","type":"undetermined type"}],"functions":[{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"x","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"len","required":true}],"definition":{"end":{"column":18,"line":4},"start":{"column":1,"line":3}},"name":"f","returnedTypes":[],"syntax":["f(x, len) \u2192 undetermined type"]},{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"x","required":true}],"definition":{"end":{"column":20,"line":7},"start":{"column":1,"line":6}},"name":"g","returnedTypes":["series float"],"syntax":["g(x) \u2192 series float"]}],"types":[],"enums":[]}}
```

### P2 - identity return does not suppress

```pine
//@version=6
indicator("INV131-identity-control")
f(x) => x
u = f(close)
if close > u and close > open
    y = math.sum(volume, 6)
plot(close)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10003","ctx":{"functionName":"math.sum"},"end":{"column":27,"line":6},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":9,"line":6}}],"variables":[{"definition":{"end":{"column":12,"line":4},"start":{"column":1,"line":4}},"name":"u","type":"series float"},{"definition":{"end":{"column":3,"line":3},"start":{"column":3,"line":3}},"name":"x","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":27,"line":6},"start":{"column":5,"line":6}},"name":"y","scopeId":"#2","type":"series float"}],"functions":[{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"x","required":true}],"definition":{"end":{"column":9,"line":3},"start":{"column":1,"line":3}},"name":"f","returnedTypes":[],"syntax":["f(x) \u2192 undetermined type"]}],"types":[],"enums":[]}}
```

### P3 - series tail that ignores the untyped param does not suppress

```pine
//@version=6
indicator("INV131-independent-series-tail")
f(x) => ta.sma(close, 6)
u = f(1)
if close > u and close > open
    y = math.sum(volume, 6)
plot(close)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10003","ctx":{"functionName":"math.sum"},"end":{"column":27,"line":6},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":9,"line":6}}],"variables":[{"definition":{"end":{"column":8,"line":4},"start":{"column":1,"line":4}},"name":"u","type":"series float"},{"definition":{"end":{"column":3,"line":3},"start":{"column":3,"line":3}},"name":"x","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":27,"line":6},"start":{"column":5,"line":6}},"name":"y","scopeId":"#2","type":"series float"}],"functions":[{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"x","required":true}],"definition":{"end":{"column":24,"line":3},"start":{"column":1,"line":3}},"name":"f","returnedTypes":["series float"],"syntax":["f(x) \u2192 series float"]}],"types":[],"enums":[]}}
```

### P4 - local derived tail suppresses

```pine
//@version=6
indicator("INV131-local-tail")
f(x, len) =>
    v = 0.0
    v := ta.sma(x, len)
    v
u = f(close, 6)
if close > u and close > open
    y = math.sum(volume, 6)
plot(close)
```

TV output:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":15,"line":7},"start":{"column":1,"line":7}},"name":"u","type":"undetermined type"},{"definition":{"end":{"column":3,"line":3},"start":{"column":3,"line":3}},"name":"x","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":8,"line":3},"start":{"column":6,"line":3}},"name":"len","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":11,"line":4},"start":{"column":5,"line":4}},"name":"v","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":27,"line":9},"start":{"column":5,"line":9}},"name":"y","scopeId":"#2","type":"series float"}],"functions":[{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"x","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"len","required":true}],"definition":{"end":{"column":5,"line":6},"start":{"column":1,"line":3}},"name":"f","returnedTypes":[],"syntax":["f(x, len) \u2192 undetermined type"]}],"types":[],"enums":[]}}
```

### P5 - `and` right operand remains independent

```pine
//@version=6
indicator("INV131-andor-control")
f(x, len) => ta.sma(x, len)
u = f(close, 6)
if close > u and ta.change(close) > 0
    y = math.sum(volume, 6)
plot(close)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10002","ctx":{"functionName":"ta.change"},"end":{"column":33,"line":5},"message":"The \"{functionName}()\" call inside the conditional expression might not execute on every bar, which can cause inconsistent calculations because the function depends on historical results. For consistency, assign the call's result to a global variable and use that variable in the expression instead.","start":{"column":18,"line":5}}],"variables":[{"definition":{"end":{"column":15,"line":4},"start":{"column":1,"line":4}},"name":"u","type":"undetermined type"},{"definition":{"end":{"column":3,"line":3},"start":{"column":3,"line":3}},"name":"x","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":8,"line":3},"start":{"column":6,"line":3}},"name":"len","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":27,"line":6},"start":{"column":5,"line":6}},"name":"y","scopeId":"#2","type":"series float"}],"functions":[{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"x","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"len","required":true}],"definition":{"end":{"column":27,"line":3},"start":{"column":1,"line":3}},"name":"f","returnedTypes":[],"syntax":["f(x, len) \u2192 undetermined type"]}],"types":[],"enums":[]}}
```

## Implementation

`SemanticAnalyzer` now tracks two related facts in the existing collection pass:

- UDFs whose returned series tail depends on untyped params, including simple
  local derivations like `v := ta.sma(x, len); v`.
- User variables assigned from those UDFs, or assigned inside a branch gated by
  such a variable, as TV-style `undetermined type` values.

`isUndeterminedGate` then treats a condition that references one of those
variables as an immediate undetermined gate. The existing `and` / `or` right
operand logic is unchanged, so CW10002 still fires inside a gate expression.

## Verification

- `node_modules/.bin/biome check packages/core/src/parser/semanticAnalyzer.ts packages/core/test/fixtures/regression/consistency-warning-undetermined-udf-gate.pine`: pass.
- `node_modules/.bin/tsc -p . --pretty false`: pass.
- `node_modules/.bin/vitest run`: 13 files passed, 418 tests passed.
- `node scripts/build-extension.js`: pass.
- `node scripts/regression-check.mjs`: 1879 fixtures checked, 0 changed
  fixtures, 0 new error appearances, 0 disappeared errors.
- `node scripts/install-cli.js`: pass, installed updated `pine-lint`.
- `pine-lint --human fixtures/25a4a7fad1236eac77960104679de730be5dd27701d58832a68c2ebaa5e8b951.pine`:
  exactly two warnings, both `ta.change` CW10002 controls; the two `math.sum`
  CW10003 warnings are gone.
- `node scripts/compare-tv.mjs fixtures/25a4a7fad1236eac77960104679de730be5dd27701d58832a68c2ebaa5e8b951.pine`:
  0 local-only errors, 0 tv-only errors; warnings local 2 / TV 2, local-only 0
  / tv-only 0.
- `node scripts/compare-tv.mjs packages/core/test/fixtures/regression/consistency-warning-undetermined-udf-gate.pine`:
  0 local-only errors, 0 tv-only errors; warnings local 2 / TV 2, local-only 0
  / tv-only 0.
- `node scripts/find-real-failures.mjs --concurrency 4`: v6 scanned 748; total
  local-only errors 29; total tv-only errors 0; same-pos message pairs 1; TV
  response unparseable 4; warning local-only 1293; warning local-only past TV
  stop 200; warning tv-only 4.
- `node scripts/categorize-failures.mjs`: 29 local-only hits in 3 error
  categories; 0 tv-only categories.
