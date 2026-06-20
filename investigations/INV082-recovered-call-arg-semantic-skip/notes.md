# INV082 - recovered call argument semantic suppression

## Status

Fixed 2026-06-20.

## Minimal repro

Regression fixture:

- `packages/core/test/fixtures/regression/INV081-recovered-call-mangled-arg.pine`

```pine
//@version=6
indicator("INV081")
label.new(bar index, high, text="x")
plot(close)
```

## TV probe

Measured 2026-06-20 with `pine-lint --tv -c` during INV081:

```pine
//@version=6
indicator("x")
if true
    label.new(bar index, high, text="x")
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\"index\""},"end":{"column":19,"line":4},"message":"Syntax error at input {value}","start":{"column":19,"line":4}}],"functions":[],"types":[],"enums":[]}}
```

## Finding

INV081 aligned the parser wording for adjacent identifiers in a call argument
(`bar index`) with TV's single CE10156 at the second identifier. The parser still
left the prefix identifier (`bar`) as a recovered argument expression, so the
checker walked it and emitted a duplicate local-only undefined-variable error.

A broad `call.recovered` semantic skip is too coarse because INV062 intentionally
validates arguments of unresolved, UDF, import-alias, and method calls. Recovered
calls can also retain valid later arguments that should still be checked.

## Fix

The parser now marks only the torn argument prefix from the adjacent-identifier
recovery path with `CallArgument.skipSemanticValidation`. The checker skips just
that argument expression. Other arguments in the same recovered call still get
normal semantic validation.
