# INV129 - sibling na-seed consistency warning suppression

**Date:** 2026-06-28
**Status:** fixed
**Code:** `packages/core/src/parser/semanticAnalyzer.ts`
**Fixture:** `packages/core/test/fixtures/regression/consistency-warning-sibling-na-seed.pine`
**Source:** TODO #61, `47d21dbd` `ta.sma` residual.

## Finding

TV suppresses CW10004 for a narrow SMMA seed idiom:

```pine
if type == "SMMA"        // `type` is an untyped UDF param
    w = ta.wma(src, len)
    result := na(w[1]) ? ta.sma(src, len) : f(w[1])
```

The same sibling seed warns without the outer untyped gate. A self-seed under the
outer gate still warns:

```pine
mg := na(mg[1]) ? ta.ema(src, len) : f(mg[1])
```

The current TV response reports the sibling seed local `w` as `undetermined
type` in the minimal outer-gate probe, so the implementation does not depend on
INV120's older observation that `w` was `series float`.

## Change

`SemanticAnalyzer` now keeps enough expression context to distinguish this one
shape:

- the active call is in the consequent of a ternary;
- the ternary condition is exactly `na(seed[1])`;
- an outer active gate is undetermined because it references an untyped UDF
  param;
- the current assignment target is not the seed name;
- the ternary alternate also reads `seed[1]`.

That suppresses the `47d21dbd` `ta.sma` false positive while preserving the
McGinley self-seed warning and the INV120 immediate-gate controls.

## TV probes

All probes were run with `pine-lint --tv -c` on 2026-06-28. Each returned
`success:true`. TV's syntax strings contain a non-ASCII arrow; it is escaped as
`\u2192` below so this note stays ASCII-only.

### P1 - sibling seed under outer untyped gate is silent

```pine
//@version=6
indicator("sma-sibling-under-undet")
ma(type, src, len) =>
    float result = 0
    if type == "SMMA"
        w = ta.wma(src, len)
        result := na(w[1]) ? ta.sma(src, len) : (w[1] * (len - 1) + src) / len
    result
plot(ma("SMMA", close, 14))
```

TV output:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":7,"line":3},"start":{"column":4,"line":3}},"name":"type","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":12,"line":3},"start":{"column":10,"line":3}},"name":"src","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":17,"line":3},"start":{"column":15,"line":3}},"name":"len","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":20,"line":4},"start":{"column":5,"line":4}},"name":"result","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":28,"line":6},"start":{"column":9,"line":6}},"name":"w","scopeId":"#2","type":"undetermined type"}],"functions":[{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"type","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"src","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"len","required":true}],"definition":{"end":{"column":10,"line":8},"start":{"column":1,"line":3}},"name":"ma","returnedTypes":[],"syntax":["ma(type, src, len) \u2192 undetermined type"]}],"types":[],"enums":[]}}
```

### P2 - sibling seed without outer untyped gate warns

```pine
//@version=6
indicator("sma-sibling-no-undet")
float result = 0
w = ta.wma(close, 14)
result := na(w[1]) ? ta.sma(close, 14) : (w[1] * 13 + close) / 14
plot(result)
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10004","ctx":{"functionName":"ta.sma"},"end":{"column":38,"line":5},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from the ternary operator or from the scope","start":{"column":22,"line":5}}],"variables":[{"definition":{"end":{"column":16,"line":3},"start":{"column":1,"line":3}},"name":"result","type":"series float"},{"definition":{"end":{"column":21,"line":4},"start":{"column":1,"line":4}},"name":"w","type":"series float"}],"functions":[],"types":[],"enums":[]}}
```

### P3 - self-seed under outer untyped gate still warns

```pine
//@version=6
indicator("ema-self-under-undet")
ma(type, src, len) =>
    float result = 0
    if type == "McGinley"
        mg = 0.0
        mg := na(mg[1]) ? ta.ema(src, len) : mg[1] + (src - mg[1]) / len
        result := mg
    result
plot(ma("McGinley", close, 14))
```

TV output:

```json
{"success":true,"result":{"warnings":[{"code":"CW10004","ctx":{"functionName":"ta.ema"},"end":{"column":42,"line":7},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from the ternary operator or from the scope","start":{"column":27,"line":7}}],"variables":[{"definition":{"end":{"column":7,"line":3},"start":{"column":4,"line":3}},"name":"type","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":12,"line":3},"start":{"column":10,"line":3}},"name":"src","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":17,"line":3},"start":{"column":15,"line":3}},"name":"len","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":20,"line":4},"start":{"column":5,"line":4}},"name":"result","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":16,"line":6},"start":{"column":9,"line":6}},"name":"mg","scopeId":"#2","type":"undetermined type"}],"functions":[{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"type","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"src","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"len","required":true}],"definition":{"end":{"column":10,"line":9},"start":{"column":1,"line":3}},"name":"ma","returnedTypes":[],"syntax":["ma(type, src, len) \u2192 undetermined type"]}],"types":[],"enums":[]}}
```

### P4 - sibling seed suppression is not ta.sma-specific

```pine
//@version=6
indicator("ema-sibling-under-undet")
ma(type, src, len) =>
    float result = 0
    if type == "EMA"
        w = ta.wma(src, len)
        result := na(w[1]) ? ta.ema(src, len) : (w[1] * (len - 1) + src) / len
    result
plot(ma("EMA", close, 14))
```

TV output:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":7,"line":3},"start":{"column":4,"line":3}},"name":"type","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":12,"line":3},"start":{"column":10,"line":3}},"name":"src","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":17,"line":3},"start":{"column":15,"line":3}},"name":"len","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":20,"line":4},"start":{"column":5,"line":4}},"name":"result","scopeId":"#1","type":"undetermined type"},{"definition":{"end":{"column":28,"line":6},"start":{"column":9,"line":6}},"name":"w","scopeId":"#2","type":"undetermined type"}],"functions":[{"args":[{"allowedTypeIDs":[],"displayType":"undetermined type","name":"type","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"src","required":true},{"allowedTypeIDs":[],"displayType":"undetermined type","name":"len","required":true}],"definition":{"end":{"column":10,"line":8},"start":{"column":1,"line":3}},"name":"ma","returnedTypes":[],"syntax":["ma(type, src, len) \u2192 undetermined type"]}],"types":[],"enums":[]}}
```

## Verification

- `node_modules/.bin/tsc --noEmit`: pass.
- `node_modules/.bin/vitest run packages/core/test/core.test.ts`: 235 tests
  passed.
- `node scripts/build-extension.js`: pass.
- `node scripts/install-cli.js`: pass, installed updated `pine-lint`.
- `node dist/packages/cli/src/cli.js --human packages/core/test/fixtures/regression/consistency-warning-sibling-na-seed.pine`:
  exactly two warnings, the no-outer `ta.sma` control and self-seed `ta.ema`
  control.
- `node dist/packages/cli/src/cli.js --human fixtures/47d21dbd3a079b6b88f11405dc9096d46aca8399bd1baf470c7134b0da334834.pine`:
  `ta.sma` line 93 disappeared; `ta.ema` line 106 remains.
- `node scripts/regression-check.mjs`: 0 fixture changes, 0 new error
  appearances, 0 disappeared errors.
- `node scripts/compare-tv.mjs fixtures/47d21dbd3a079b6b88f11405dc9096d46aca8399bd1baf470c7134b0da334834.pine`:
  0 local-only errors, 0 tv-only errors; warnings local 3 / TV 2, local-only 1
  (`slhalfe` unused only), tv-only 0.
- `node scripts/compare-tv.mjs packages/core/test/fixtures/regression/consistency-warning-sibling-na-seed.pine`:
  warnings local 2 / TV 2, local-only 0, tv-only 0.
- `node scripts/find-real-failures.mjs --concurrency 4`: v6 scanned 748;
  total local-only errors 29; total tv-only errors 0; same-pos message pairs 1;
  warning tv-only 4. Warning local-only measured 1290 (5 TV-unparseable files)
  on the landing run, then 1310 on two byte-identical reruns 2026-06-28 (4
  TV-unparseable). That delta is TV-parse-set variance, not a local change:
  `totalWarningLocalOnly` sums only the files TV also parsed (unparseable-on-TV
  files contribute 0 - find-real-failures.mjs `emptyWarningDiff`), so a file
  flipping in/out of TV's unparseable set moves the number by its whole warning
  count (G001). The error split (29/0) and warning tv-only (4) are the stable,
  goal-gating numbers; INV129's only local effect on the warning channel is the
  intended `ta.sma` -1.
- `node scripts/categorize-failures.mjs`: 29 local-only hits in 3 error
  categories; 0 tv-only categories.
