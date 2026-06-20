# INV084 - numeric operator CE10123 templates

## Status

Fixed 2026-06-20.

## Minimal repro

Existing validation fixture:

- `packages/core/test/fixtures/validation/type-errors-operators.pine`

```pine
//@version=6
indicator("Operator Type Errors")
x5 = true + 1
x6 = 1 - false
x7 = color.red + 1
x8 = 2 * color.blue
x9 = color.red > color.blue
plot(close)
```

## TV probes

Measured 2026-06-20 with `pine-lint --tv -c`.

Probe 1, fixture-style arithmetic and comparison operands:

```pine
//@version=6
indicator("Operator Type Errors")
x5 = true + 1
x6 = 1 - false
x7 = color.red + 1
x8 = 2 * color.blue
x9 = color.red > color.blue
plot(close)
```

TV result excerpt from `lint-reports/real-failures.json` after INV083:

```json
[
  {"line":18,"col":6,"tvMessage":"Cannot call \"operator +\" with argument \"expr0\"=\"true\". An argument of \"literal bool\" type was used but a \"const int\"  is expected."},
  {"line":19,"col":10,"tvMessage":"Cannot call \"operator -\" with argument \"expr1\"=\"false\". An argument of \"literal bool\" type was used but a \"const int\"  is expected."},
  {"line":22,"col":6,"tvMessage":"Cannot call \"operator +\" with argument \"expr0\"=\"color.red\". An argument of \"const color\" type was used but a \"const int\"  is expected."},
  {"line":23,"col":10,"tvMessage":"Cannot call \"operator *\" with argument \"expr1\"=\"color.blue\". An argument of \"const color\" type was used but a \"const int\"  is expected."},
  {"line":26,"col":6,"tvMessage":"Cannot call \"operator >\" with argument \"expr0\"=\"color.red\". An argument of \"const color\" type was used but a \"simple float\"  is expected."},
  {"line":26,"col":18,"tvMessage":"Cannot call \"operator >\" with argument \"expr1\"=\"color.blue\". An argument of \"const color\" type was used but a \"simple float\"  is expected."}
]
```

Probe 2, float arithmetic expectation:

```pine
//@version=6
indicator("x")
x = true + 1.0
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":true,"argumentType":"literal bool","currentTypeDocStr":"const float","funId":"operator +","typePostfix":""},"end":{"column":8,"line":3},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":5,"line":3}}],"variables":[{"definition":{"end":{"column":14,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"undetermined type"}],"functions":[],"types":[],"enums":[]}}
```

Probe 3, comparison expectation:

```pine
//@version=6
indicator("x")
x = true > 1
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":true,"argumentType":"literal bool","currentTypeDocStr":"const float","funId":"operator >","typePostfix":""},"end":{"column":8,"line":3},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":5,"line":3}}],"variables":[{"definition":{"end":{"column":12,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"undetermined type"}],"functions":[],"types":[],"enums":[]}}
```

Probe 4, color equality is allowed:

```pine
//@version=6
indicator("x")
x = color.red == color.blue
plot(close)
```

TV result:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":27,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"series bool"}],"functions":[],"types":[],"enums":[]}}
```

## Finding

The checker already found the same offending operands and anchors as TV for
numeric arithmetic/comparison operator misuse, but emitted custom `Type mismatch`
prose. TV uses CE10123 operator templates for these too.

## Fix

Numeric arithmetic/comparison operand errors now use the same structured
CE10123 path as INV083's bool-context operator errors. Arithmetic operators
expect the other numeric operand's base as `const int` or `const float`;
ordering comparisons expect `simple float`. Equality remains governed by the
existing compatibility path and still permits color equality.
