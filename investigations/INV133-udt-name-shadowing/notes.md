# INV133 - UDT names participate in CW10013 shadowing

## Status

Fixed 2026-06-28.

## Source

TODO #61 residual warning tail after INV132: three CW10013 TV-only records in
`1727708a...`:

- `hz hz = this._hz` inside a method body.
- `kz kz = this._kz` inside a method body.
- `string lo_txt = this.lo_txt` inside a method body.

The third one was not truly missing: local emitted it at the identifier column
(`lo_txt`), while TV anchors typed declarations at the leading type token
(`string`). The first two were missing because the semantic shadow stack did not
record user-defined type names as parent-scope names.

## Regression fixture

`packages/core/test/fixtures/regression/INV133-udt-name-shadowing.pine`

```pine
//@version=6
indicator("INV133")
outer = 1
type hz
    int x
f() =>
    hz hz = hz.new(1)
    hz.x
g() =>
    int outer = 2
    outer
plot(f() + g())
```

## TV probes

Measured 2026-06-28 with `pine-lint --tv -c`.

Probe 1, regression fixture:

```json
{"success":true,"result":{"warnings":[{"code":"CW10013","ctx":{"variableName":"hz"},"end":{"column":21,"line":7},"message":"Shadowing variable \"{variableName}\" which exists in parent scope. Did you want to use the \":=\" operator instead of \"=\" ?","start":{"column":5,"line":7}},{"code":"CW10013","ctx":{"variableName":"outer"},"end":{"column":17,"line":10},"message":"Shadowing variable \"{variableName}\" which exists in parent scope. Did you want to use the \":=\" operator instead of \"=\" ?","start":{"column":5,"line":10}}],"variables":[{"definition":{"end":{"column":9,"line":3},"start":{"column":1,"line":3}},"name":"outer","type":"const int"},{"definition":{"end":{"column":21,"line":7},"start":{"column":5,"line":7}},"name":"hz","scopeId":"#1","type":"hz"},{"definition":{"end":{"column":17,"line":10},"start":{"column":5,"line":10}},"name":"outer","scopeId":"#2","type":"const int"}],"functions":[{"args":[{"allowedTypeIDs":["series int","simple int","input int","const int"],"displayType":"series int","name":"x","required":false}],"name":"hz.new","returnedTypes":["hz"],"syntax":["hz.new(series int x) \u2192 hz"]},{"args":[{"allowedTypeIDs":["hz"],"displayType":"hz","info":"The identifier of the object to be copied.","name":"object","required":true}],"name":"hz.copy","returnedTypes":["hz"],"syntax":["hz.copy(hz object) \u2192 hz"]},{"args":[],"name":"hz.copy","returnedTypes":["hz"],"syntax":["copy() \u2192 hz"],"thisType":["hz"]},{"args":[],"definition":{"end":{"column":8,"line":8},"start":{"column":1,"line":6}},"name":"f","returnedTypes":["series int"],"syntax":["f() \u2192 series int"]},{"args":[],"definition":{"end":{"column":9,"line":11},"start":{"column":1,"line":9}},"name":"g","returnedTypes":["const int"],"syntax":["g() \u2192 const int"]}],"types":[{"definition":{"end":{"column":13,"line":5},"start":{"column":1,"line":4}},"fields":[{"name":"x","type":"series int"}],"name":"hz","template":false}],"enums":[]}}
```

Probe 2, typed method local shadowing an earlier global:

```pine
//@version=6
indicator("typed shadow method")
lo_txt = "global"
type kz
    int x
method manage(kz this) =>
    string lo_txt = "local"
    lo_txt
plot(1)
```

TV result:

```json
{"success":true,"result":{"warnings":[{"code":"CW10013","ctx":{"variableName":"lo_txt"},"end":{"column":27,"line":7},"message":"Shadowing variable \"{variableName}\" which exists in parent scope. Did you want to use the \":=\" operator instead of \"=\" ?","start":{"column":5,"line":7}}],"variables":[{"definition":{"end":{"column":17,"line":3},"start":{"column":1,"line":3}},"name":"lo_txt","type":"const string"},{"definition":{"end":{"column":21,"line":6},"start":{"column":15,"line":6}},"name":"this","scopeId":"#1","type":"kz"},{"definition":{"end":{"column":27,"line":7},"start":{"column":5,"line":7}},"name":"lo_txt","scopeId":"#1","type":"const string"}],"functions":[{"args":[{"allowedTypeIDs":["series int","simple int","input int","const int"],"displayType":"series int","name":"x","required":false}],"name":"kz.new","returnedTypes":["kz"],"syntax":["kz.new(series int x) \u2192 kz"]},{"args":[{"allowedTypeIDs":["kz"],"displayType":"kz","info":"The identifier of the object to be copied.","name":"object","required":true}],"name":"kz.copy","returnedTypes":["kz"],"syntax":["kz.copy(kz object) \u2192 kz"]},{"args":[],"name":"kz.copy","returnedTypes":["kz"],"syntax":["copy() \u2192 kz"],"thisType":["kz"]},{"args":[{"allowedTypeIDs":["kz"],"displayType":"kz","name":"this","required":true}],"definition":{"end":{"column":10,"line":8},"start":{"column":1,"line":6}},"name":"manage","returnedTypes":["const string"],"syntax":["manage(kz this) \u2192 const string"]},{"args":[],"definition":{"end":{"column":10,"line":8},"start":{"column":1,"line":6}},"name":"manage","originalName":"kz.manage","returnedTypes":["const string"],"syntax":["manage() \u2192 const string"],"thisType":["kz"]}],"types":[{"definition":{"end":{"column":13,"line":5},"start":{"column":1,"line":4}},"fields":[{"name":"x","type":"series int"}],"name":"kz","template":false}],"enums":[]}}
```

Probe 3, UDT name shadowing inside a method:

```pine
//@version=6
indicator("type shadow method")
type hz
    int x
method m(hz this) =>
    hz hz = this
    hz.x
plot(1)
```

TV result:

```json
{"success":true,"result":{"warnings":[{"code":"CW10013","ctx":{"variableName":"hz"},"end":{"column":16,"line":6},"message":"Shadowing variable \"{variableName}\" which exists in parent scope. Did you want to use the \":=\" operator instead of \"=\" ?","start":{"column":5,"line":6}}],"variables":[{"definition":{"end":{"column":16,"line":5},"start":{"column":10,"line":5}},"name":"this","scopeId":"#1","type":"hz"},{"definition":{"end":{"column":16,"line":6},"start":{"column":5,"line":6}},"name":"hz","scopeId":"#1","type":"hz"}],"functions":[{"args":[{"allowedTypeIDs":["series int","simple int","input int","const int"],"displayType":"series int","name":"x","required":false}],"name":"hz.new","returnedTypes":["hz"],"syntax":["hz.new(series int x) \u2192 hz"]},{"args":[{"allowedTypeIDs":["hz"],"displayType":"hz","info":"The identifier of the object to be copied.","name":"object","required":true}],"name":"hz.copy","returnedTypes":["hz"],"syntax":["hz.copy(hz object) \u2192 hz"]},{"args":[],"name":"hz.copy","returnedTypes":["hz"],"syntax":["copy() \u2192 hz"],"thisType":["hz"]},{"args":[{"allowedTypeIDs":["hz"],"displayType":"hz","name":"this","required":true}],"definition":{"end":{"column":8,"line":7},"start":{"column":1,"line":5}},"name":"m","returnedTypes":["series int"],"syntax":["m(hz this) \u2192 series int"]},{"args":[],"definition":{"end":{"column":8,"line":7},"start":{"column":1,"line":5}},"name":"m","originalName":"hz.m","returnedTypes":["series int"],"syntax":["m() \u2192 series int"],"thisType":["hz"]}],"types":[{"definition":{"end":{"column":13,"line":4},"start":{"column":1,"line":3}},"fields":[{"name":"x","type":"series int"}],"name":"hz","template":false}],"enums":[]}}
```

## Fix

`semanticAnalyzer.ts` now records `TypeDeclaration` names into the lexical
shadow stack in source order, without warning on the type declaration itself.
Variable-declaration shadow warnings now use `startLine` / `startColumn`, so
typed declarations and `var` declarations anchor at the declaration start
instead of the identifier token.
