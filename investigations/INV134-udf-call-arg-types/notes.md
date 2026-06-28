# INV134 - UDF call-site argument type checking for UDT and simple params

## Status

Fixed 2026-06-28.

## Source

TODO #62. The existing UDF call-site validator covered argument count and
primitive type mismatches, but skipped UDT params and stripped `simple` from
primitive params before checking assignability. That left two TV-only targeted
probe shapes:

- `g(b)` where `g(A a)` receives `b : B`.
- `f(bar_index)` where `f(simple int n)` receives a series int.

The full 2026-06-28 corpus sweep has 0 TV-only type-checker categories, so this
is targeted probe coverage rather than a corpus carrier.

## Regression fixture

`packages/core/test/fixtures/regression/INV134-udf-call-arg-types.pine`

## TV probes

Measured 2026-06-28 with `pine-lint --tv -c`.

Probe 1, UDT mismatch:

```pine
//@version=6
indicator("INV134-udt")
type A
    int x
type B
    int y
g(A a) => a.x
b = B.new(1)
plot(g(b))
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"a","argUserFriendlyRepresentation":"b","argumentType":"B","currentTypeDocStr":"A","funId":"g","typePostfix":""},"end":{"column":8,"line":9},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":8,"line":9}}],"variables":[{"definition":{"end":{"column":12,"line":8},"start":{"column":1,"line":8}},"name":"b","type":"B"},{"definition":{"end":{"column":5,"line":7},"start":{"column":3,"line":7}},"name":"a","scopeId":"#1","type":"A"}],"functions":[{"args":[{"allowedTypeIDs":["series int","simple int","input int","const int"],"displayType":"series int","name":"x","required":false}],"name":"A.new","returnedTypes":["A"],"syntax":["A.new(series int x) \u2192 A"]},{"args":[{"allowedTypeIDs":["A"],"displayType":"A","info":"The identifier of the object to be copied.","name":"object","required":true}],"name":"A.copy","returnedTypes":["A"],"syntax":["A.copy(A object) \u2192 A"]},{"args":[],"name":"A.copy","returnedTypes":["A"],"syntax":["copy() \u2192 A"],"thisType":["A"]},{"args":[{"allowedTypeIDs":["series int","simple int","input int","const int"],"displayType":"series int","name":"y","required":false}],"name":"B.new","returnedTypes":["B"],"syntax":["B.new(series int y) \u2192 B"]},{"args":[{"allowedTypeIDs":["B"],"displayType":"B","info":"The identifier of the object to be copied.","name":"object","required":true}],"name":"B.copy","returnedTypes":["B"],"syntax":["B.copy(B object) \u2192 B"]},{"args":[],"name":"B.copy","returnedTypes":["B"],"syntax":["copy() \u2192 B"],"thisType":["B"]},{"args":[{"allowedTypeIDs":["A"],"displayType":"A","name":"a","required":true}],"definition":{"end":{"column":13,"line":7},"start":{"column":1,"line":7}},"name":"g","returnedTypes":["series int"],"syntax":["g(A a) \u2192 series int"]}],"types":[{"definition":{"end":{"column":13,"line":4},"start":{"column":1,"line":3}},"fields":[{"name":"x","type":"series int"}],"name":"A","template":false},{"definition":{"end":{"column":13,"line":6},"start":{"column":1,"line":5}},"fields":[{"name":"y","type":"series int"}],"name":"B","template":false}],"enums":[]}}
```

Probe 2, series value into simple UDF param:

```pine
//@version=6
indicator("INV134-simple")
f(simple int n) => n
plot(f(bar_index))
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"n","argUserFriendlyRepresentation":"bar_index","argumentType":"series int","currentTypeDocStr":"simple int","funId":"f","typePostfix":""},"end":{"column":16,"line":4},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":8,"line":4}}],"variables":[{"definition":{"end":{"column":14,"line":3},"start":{"column":3,"line":3}},"name":"n","scopeId":"#1","type":"simple int"}],"functions":[{"args":[{"allowedTypeIDs":["simple int","input int","const int"],"displayType":"simple int","name":"n","required":true}],"definition":{"end":{"column":20,"line":3},"start":{"column":1,"line":3}},"name":"f","returnedTypes":["simple int"],"syntax":["f(simple int n) \u2192 simple int"]}],"types":[],"enums":[]}}
```

Probe 3, control:

```pine
//@version=6
indicator("INV134-control")
f(int x) => x
plot(f(5))
```

TV result:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":7,"line":3},"start":{"column":3,"line":3}},"name":"x","scopeId":"#1","type":"series int"}],"functions":[{"args":[{"allowedTypeIDs":["series int","simple int","input int","const int"],"displayType":"series int","name":"x","required":true}],"definition":{"end":{"column":13,"line":3},"start":{"column":1,"line":3}},"name":"f","returnedTypes":["series int"],"syntax":["f(series int x) \u2192 series int"]}],"types":[],"enums":[]}}
```

## Fix

`validateUserFunctionCall` now checks typed params when the expected type is a
primitive or a declared UDT. Unqualified primitive UDF params still render as
`series <type>`, while UDT params render bare (`A`). A dedicated simple-param
gate mirrors the builtin-argument rule from INV088: a series value is rejected
when the raw param annotation is exactly `simple <primitive>`.

The CLI result extractor now also records UDT constructor calls (`B.new()`) as
the UDT type and avoids double-rendering qualified annotations such as
`simple int`.
