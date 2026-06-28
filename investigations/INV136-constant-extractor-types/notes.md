# INV136 - Constant types in pine-lint variable extraction

## Status

Fixed 2026-06-28.

## Source

TODO #18 residual. The local pine-lint result extractor checked
`VARIABLES_BY_NAME` when typing member expressions, but namespaced constants
such as `color.red` live in `CONSTANTS_BY_NAME`. As a result, variables
initialized from built-in constants were reported as `undetermined type` even
though the checker itself already typed them correctly.

## Regression fixture

`packages/core/test/fixtures/regression/INV136-constant-extractor-types.pine`

The fixture locks parse/validation cleanliness. The variable-list display path
is pinned by `packages/core/test/astExtractor.test.ts`.

## TV probes

Measured 2026-06-28 with `pine-lint --tv -c`.

Probe 1, color constants:

```pine
//@version=6
indicator("INV136-color-constants")
x = color.red
y = color.silver
z = color.rgb(1, 2, 3)
plot(close)
```

TV result:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":13,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"const color"},{"definition":{"end":{"column":16,"line":4},"start":{"column":1,"line":4}},"name":"y","type":"const color"},{"definition":{"end":{"column":22,"line":5},"start":{"column":1,"line":5}},"name":"z","type":"const color"}],"functions":[],"types":[],"enums":[]}}
```

Probe 2, non-color constants:

```pine
//@version=6
indicator("INV136-constant-control")
a = display.none
b = barmerge.gaps_off
plot(close)
```

TV result:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":16,"line":3},"start":{"column":1,"line":3}},"name":"a","type":"const plot_simple_display"},{"definition":{"end":{"column":21,"line":4},"start":{"column":1,"line":4}},"name":"b","type":"const barmerge_gaps"}],"functions":[],"types":[],"enums":[]}}
```

## Fix

`getVariableType` in `astExtractor.ts` now falls back to `CONSTANTS_BY_NAME` and
renders those catalog entries as `const <type>`.
