# INV083 - bool operator CE10123 templates

## Status

Fixed 2026-06-20.

## TV probes

Measured 2026-06-20 with `pine-lint --tv -c`.

Probe 1, invalid `not` operand:

```pine
//@version=6
indicator("x")
x = not 5
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":5,"argumentType":"literal int","currentTypeDocStr":"simple bool","funId":"operator not","typePostfix":""},"end":{"column":9,"line":3},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":9,"line":3}}],"variables":[{"definition":{"end":{"column":9,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"undetermined type"}],"functions":[],"types":[],"enums":[]}}
```

Probe 2, invalid ternary condition:

```pine
//@version=6
indicator("x")
x = 5 ? 1 : 2
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":5,"argumentType":"literal int","currentTypeDocStr":"const bool","funId":"operator ?:","typePostfix":""},"end":{"column":5,"line":3},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":5,"line":3}}],"variables":[{"definition":{"end":{"column":13,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"undetermined type"}],"functions":[],"types":[],"enums":[]}}
```

Probe 3, invalid `and` and `or` operands:

```pine
//@version=6
indicator("x")
x = 1 and true
y = true or 2
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"expr0","argUserFriendlyRepresentation":1,"argumentType":"literal int","currentTypeDocStr":"const bool","funId":"operator and","typePostfix":""},"end":{"column":5,"line":3},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":5,"line":3}},{"code":"CE10123","ctx":{"argDisplayName":"expr1","argUserFriendlyRepresentation":2,"argumentType":"literal int","currentTypeDocStr":"const bool","funId":"operator or","typePostfix":""},"end":{"column":13,"line":4},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":13,"line":4}}],"variables":[{"definition":{"end":{"column":14,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"undetermined type"},{"definition":{"end":{"column":13,"line":4},"start":{"column":1,"line":4}},"name":"y","type":"undetermined type"}],"functions":[],"types":[],"enums":[]}}
```

## Finding

The checker already anchored invalid bool-context operands at TV's operand
positions, but used custom prose for logical operators, `not`, and the ternary
condition. That left same-position different-message discrepancies.

## Fix

Bool-context operator diagnostics now share TV's CE10123 operator template:

- `operator and` / `operator or` use `expr0` and `expr1`, expected `const bool`.
- `operator not` uses `expr0`, expected `simple bool`.
- `operator ?:` conditions use `expr0`, expected `const bool`.

Branch-type ternary diagnostics remain unchanged and continue to use the
operator `?:` CE10123 template from INV001.
