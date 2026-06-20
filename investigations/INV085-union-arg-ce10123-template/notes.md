# INV085 - union argument CE10123 template

## Status

Fixed 2026-06-20.

## Minimal repro

Regression fixture:

- `packages/core/test/fixtures/regression/INV016-union-arg-validation.pine`

```pine
//@version=6
indicator("INV016 union-arg validation")
plot(nz(close > open) ? 1 : 0)
x = int(true)
plot(x)
```

## TV probes

Measured 2026-06-20 with `pine-lint --tv -c`.

Probe 1, `nz()` rejects a bool source:

```pine
//@version=6
indicator("x")
plot(nz(close > open) ? 1 : 0)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"source","argUserFriendlyRepresentation":"call \"operator >\" (series bool)","argumentType":"series bool","currentTypeDocStr":"simple int","funId":"nz","typePostfix":""},"end":{"column":20,"line":3},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":9,"line":3}}],"functions":[],"types":[],"enums":[]}}
```

Probe 2, `int()` rejects a bool source:

```pine
//@version=6
indicator("x")
x = int(true)
plot(x)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"x","argUserFriendlyRepresentation":true,"argumentType":"literal bool","currentTypeDocStr":"simple int","funId":"int","typePostfix":""},"end":{"column":12,"line":3},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":9,"line":3}}],"variables":[{"definition":{"end":{"column":13,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"undetermined type"}],"functions":[],"types":[],"enums":[]}}
```

## Finding

INV016 added conservative union-parameter checking for cases the main argument
checker skips because a merged union maps to `unknown`. The check correctly
caught `nz(<bool>)` and `int(true)` at TV's positions, but used custom prose:
`Type mismatch for argument ...`. TV uses the normal CE10123 call template.

## Fix

The union-parameter checker now emits structured CE10123 diagnostics using the
same argument rendering helper as other call-argument checks. The parameter name
comes from the matching catalog overload/position. For the expected type, TV
reports the first scalar member with `simple` qualification for these union
casts, so the message uses `simple <first-member>` while the accept/reject logic
still checks the full union member set.
