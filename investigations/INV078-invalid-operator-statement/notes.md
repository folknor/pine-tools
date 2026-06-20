# INV078 - invalid operator statement recovery

## Status

Fixed 2026-06-20.

## Minimal repro

Regression fixture:

- `packages/core/test/fixtures/regression/INV078-invalid-operator-statement.pine`

```pine
//@version=6
indicator("INV078")
x = close
? high : low
f() =>
    and high
validUnary() =>
    -high
badColon() =>
    : high
validNot() =>
    not close
plot(close)
```

## TV probes

Measured 2026-06-20 with `pine-lint --tv -c`.

Probe 1, top-level leading ternary operator:

```pine
//@version=6
indicator("x")
x = close
? high : low
plot(x)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\"new line\""},"end":{"column":1,"line":4},"message":"Syntax error at input {value}","start":{"column":1,"line":4}}],"variables":[{"definition":{"end":{"column":9,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"series float"}],"functions":[],"types":[],"enums":[]}}
```

Probe 2, function-body leading binary keyword:

```pine
//@version=6
indicator("x")
f() =>
    and high
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\"new line\""},"end":{"column":1,"line":4},"message":"Syntax error at input {value}","start":{"column":1,"line":4}}],"functions":[],"types":[],"enums":[]}}
```

Probe 3, valid unary tail expression:

```pine
//@version=6
indicator("x")
f() =>
    -high
plot(close)
```

TV result:

```json
{"success":true,"result":{"functions":[{"args":[],"definition":{"end":{"column":9,"line":4},"start":{"column":1,"line":3}},"name":"f","returnedTypes":["series float"],"syntax":["f() -> series float"]}],"types":[],"enums":[]}}
```

Probe 4, valid `not` unary tail expression:

```pine
//@version=6
indicator("x")
f() =>
    not high
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":"high","argumentType":"series float","currentTypeDocStr":"simple bool","funId":"operator not","typePostfix":""},"end":{"column":12,"line":4},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":9,"line":4}}],"functions":[{"args":[],"definition":{"end":{"column":12,"line":4},"start":{"column":1,"line":3}},"name":"f","returnedTypes":[],"syntax":["f() -> undetermined type"]}],"types":[],"enums":[]}}
```

## Local behavior before fix

A statement starting with `?` threw `Unexpected token: ?`. Statements starting with binary operators such as `and`, `+`, or `*` could be parsed as expression tails in contexts where TV reports CE10156 instead.

This showed up in the refreshed discrepancy inventory as the single `Unexpected token: ?` local-only row in `8439b236...pine`.

## Fix

`Parser.statement()` now rejects statement-start binary/ternary/colon operators before expression parsing and emits TV's `Syntax error at input "new line"` wording. The guard intentionally excludes unary `+`, unary `-`, and `not`, which TV allows as expression tails.
