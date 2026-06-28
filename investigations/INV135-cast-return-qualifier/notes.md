# INV135 - Builtin overload return inference preserves qualifiers

## Status

Fixed 2026-06-28.

## Source

Follow-up after INV134. The real change is general: builtin return inference now
uses the matched overload return (`resolveCallReturnRaw`) where available, instead
of the frozen merged `functions.json` return. `resolveCallReturnRaw` was already
the more precise source used elsewhere in the checker (call-arg validation), so
this aligns the inference path with it.

Casts are the motivating probe and highest-signal carrier: their merged return is
const (`int()` -> `const int`) while their overloads vary by qualifier, so the
merged return made `int(close)` look const locally even though TV types it as
`series int`. The same overload shape exists for `int`, `float`, `bool`, `string`,
and `color`.

## Regression fixture

`packages/core/test/fixtures/regression/INV135-cast-return-qualifier.pine`

## TV probes

Measured 2026-06-28 with `pine-lint --tv -c`.

Probe 1, inline cast into a simple UDF param:

```pine
//@version=6
indicator("INV135-direct")
f(simple int n) => n
plot(f(int(close)))
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"n","argUserFriendlyRepresentation":"call \"int\" (series int)","argumentType":"series int","currentTypeDocStr":"simple int","funId":"f","typePostfix":""},"end":{"column":17,"line":4},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":8,"line":4}}],"variables":[{"definition":{"end":{"column":14,"line":3},"start":{"column":3,"line":3}},"name":"n","scopeId":"#1","type":"simple int"}],"functions":[{"args":[{"allowedTypeIDs":["simple int","input int","const int"],"displayType":"simple int","name":"n","required":true}],"definition":{"end":{"column":20,"line":3},"start":{"column":1,"line":3}},"name":"f","returnedTypes":["simple int"],"syntax":["f(simple int n) \u2192 simple int"]}],"types":[],"enums":[]}}
```

Probe 2, cast assigned through a variable:

```pine
//@version=6
indicator("INV135-var")
x = int(close)
f(simple int n) => n
plot(f(x))
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10123","ctx":{"argDisplayName":"n","argUserFriendlyRepresentation":"x","argumentType":"series int","currentTypeDocStr":"simple int","funId":"f","typePostfix":""},"end":{"column":8,"line":5},"message":"Cannot call \"{funId}\" with argument \"{argDisplayName}\"=\"{argUserFriendlyRepresentation}\". An argument of \"{argumentType}\" type was used but a \"{currentTypeDocStr}\" {typePostfix} is expected.","start":{"column":8,"line":5}}],"variables":[{"definition":{"end":{"column":14,"line":3},"start":{"column":1,"line":3}},"name":"x","type":"series int"},{"definition":{"end":{"column":14,"line":4},"start":{"column":3,"line":4}},"name":"n","scopeId":"#1","type":"simple int"}],"functions":[{"args":[{"allowedTypeIDs":["simple int","input int","const int"],"displayType":"simple int","name":"n","required":true}],"definition":{"end":{"column":20,"line":4},"start":{"column":1,"line":4}},"name":"f","returnedTypes":["simple int"],"syntax":["f(simple int n) \u2192 simple int"]}],"types":[],"enums":[]}}
```

Probe 3, const-cast control:

```pine
//@version=6
indicator("INV135-control")
f(simple int n) => n
plot(f(int(5)))
```

TV result:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":14,"line":3},"start":{"column":3,"line":3}},"name":"n","scopeId":"#1","type":"simple int"}],"functions":[{"args":[{"allowedTypeIDs":["simple int","input int","const int"],"displayType":"simple int","name":"n","required":true}],"definition":{"end":{"column":20,"line":3},"start":{"column":1,"line":3}},"name":"f","returnedTypes":["simple int"],"syntax":["f(simple int n) \u2192 simple int"]}],"types":[],"enums":[]}}
```

## Fix

`inferExpressionType` now asks `resolveCallReturnRaw` for builtin calls before
using a signature's merged return. Generic `type` placeholder returns still keep
their existing collection-element path first. The CLI result extractor mirrors
the same raw-return lookup so `x = int(close)` is reported as `series int`.

The broader overload-aware path also reworded one existing corpus diagnostic at
the same position: an expected ternary branch type changes from `const color` to
`series color` where `color.new(...)` receives series-qualified input. This is NOT
TV-confirmed: the carrier file (`ae11a5e...`) has a single TV error at line 30 (an
unterminated string) and TV stops there, so the line-889 position sits in the
post-TV-stop cascade region TV never adjudicates (tv-only is 0). The shift is a
local cascade-path wording becoming more precise, not a message TV validated.
