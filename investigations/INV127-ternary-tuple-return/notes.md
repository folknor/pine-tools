# INV127 - ternary tuple returns

Date: 2026-06-28

## Source

TODO #62. While probing INV126, a `getStandardOHLC() => cond ? [..] :
request.security(..)` probe was malformed because TV rejects ternaries that
return tuples. Our checker accepted the shape, so this was a CE false negative.

## TV probes

All probes were run with `pine-lint --tv -c`, 2026-06-28. Each result returned
`success:true`.

### p01 - both branches are tuple literals

```pine
//@version=6
indicator("INV127")
f() => close > open ? [open, high] : [low, close]
[a, b] = f()
plot(a)
```

Raw TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10163","end":{"column":23,"line":3},"message":"Ternary operations cannot return tuples. Convert the expression into an `if` or `switch` conditional structure to return a tuple.","start":{"column":23,"line":3}}],"functions":[],"types":[],"enums":[]}}
```

### p02 - only the alternate branch is a tuple

```pine
//@version=6
indicator("INV127-alt")
f() => close > open ? close : [low, close]
[a, b] = f()
plot(a)
```

Raw TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10163","end":{"column":27,"line":3},"message":"Ternary operations cannot return tuples. Convert the expression into an `if` or `switch` conditional structure to return a tuple.","start":{"column":23,"line":3}}],"functions":[],"types":[],"enums":[]}}
```

### p03 - only the consequent branch is a tuple

```pine
//@version=6
indicator("INV127-conseq")
f() => close > open ? [open, high] : close
[a, b] = f()
plot(a)
```

Raw TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10163","end":{"column":23,"line":3},"message":"Ternary operations cannot return tuples. Convert the expression into an `if` or `switch` conditional structure to return a tuple.","start":{"column":23,"line":3}}],"functions":[],"types":[],"enums":[]}}
```

### p04 - direct tuple destructure from tuple ternary

```pine
//@version=6
indicator("INV127-direct")
[a, b] = close > open ? [1, 2] : [3, 4]
plot(a)
```

Raw TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10163","end":{"column":25,"line":3},"message":"Ternary operations cannot return tuples. Convert the expression into an `if` or `switch` conditional structure to return a tuple.","start":{"column":25,"line":3}}],"functions":[],"types":[],"enums":[]}}
```

## Decision

Emit CE10163 when either ternary result branch can produce a tuple. The anchor is
the first result expression (`expr1`), matching p02 where TV still starts the
diagnostic on `close` even though the alternate branch is the tuple.

The tuple arity classifier now returns `unknown` for ternaries with any
tuple-producing branch. This keeps direct destructures from emitting the older
tuple-shape or tuple-count diagnostics in addition to CE10163. Scalar-only
ternaries still classify as scalar, so `[a, b] = cond ? 1 : 2` keeps the
existing tuple-shape error.

Regression fixture:
`packages/core/test/fixtures/regression/INV127-ternary-tuple-return.pine`.

## Implementation result

Date: 2026-06-28

Implemented in:

- `packages/core/src/analyzer/checker-expressions.ts`: `validateTernaryExpression`
  emits structured CE10163 when either result branch is tuple-producing.
- `packages/core/src/analyzer/checker-tuples.ts`: `tupleInitArity` keeps
  scalar-only ternaries as scalar, but returns `unknown` for tuple-producing
  ternaries so CE10163 is the primary diagnostic.

Local verification, 2026-06-28:

- `node_modules/.bin/tsc --noEmit`: pass.
- `node_modules/.bin/tsc -p .`: pass.
- `node_modules/.bin/vitest run packages/core/test/core.test.ts -t regression/INV127-ternary-tuple-return`: pass.
- `node_modules/.bin/vitest run`: 13 files, 413 tests passed.
- `node scripts/regression-check.mjs`: 1879 fixtures checked, 0 changed, 0 new
  error appearances.
- `node_modules/.bin/biome check --max-diagnostics=none --reporter=github --formatter-enabled=true --linter-enabled=true --assist-enabled=true`: pass.
- `node scripts/audit-fixtures.mjs`: no malformed `@expects` directives.
