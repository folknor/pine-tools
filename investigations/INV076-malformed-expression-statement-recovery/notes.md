# INV076 - malformed expression statement recovery

## Status

Fixed 2026-06-20.

## Minimal repro

Regression fixture:

- `packages/core/test/fixtures/regression/INV076-malformed-expression-statement-recovery.pine`

```pine
//@version=6
indicator("INV076")
at https://mozilla.org/MPL/2.0/
at https
```

## TV probe

Measured 2026-06-20 with `pine-lint --tv -c`.

Probe 1:

```pine
//@version=6
indicator("x")
at https://mozilla.org/MPL/2.0/
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\":\""},"end":{"column":9,"line":3},"message":"Syntax error at input {value}","start":{"column":9,"line":3}}],"functions":[],"types":[],"enums":[]}}
```

Probe 2:

```pine
//@version=6
indicator("x")
at https
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\"end of line without line continuation\""},"end":{"column":9,"line":3},"message":"Syntax error at input {value}","start":{"column":9,"line":3}}],"functions":[],"types":[],"enums":[]}}
```

## Local behavior before fix

The parser accepted `at` and `https` as separate expression statements when a pasted license header missed the leading `//`, so semantic validation emitted undefined-variable diagnostics:

```text
[3:1] Undefined variable 'at'. Did you mean 'ask'?
[3:4] Undefined variable 'https'
```

This appeared in corpus files with malformed MPL header lines, including `4d78be7e...pine` and `988d8b...pine`.

## Fix

`Parser.statement()` now recognizes the exact malformed prose shape `at https...` before expression-statement parsing and emits a syntax error at the same anchor TV uses:

- `:` for `at https://...`
- end of line for `at https`

The guard is intentionally lexical and narrow because a broader adjacent-identifier rule collides with valid Pine grammar, including UDF tail expressions, UDT fields, and type annotations.
