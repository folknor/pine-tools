# INV079 - restricted condition leading binary wraps

## Status

Fixed 2026-06-20.

## Minimal repro

Regression fixture:

- `packages/core/test/fixtures/regression/INV079-if-condition-leading-binary-wrap.pine`

```pine
//@version=6
indicator("INV079")
if close > open
   and high > low
    ok = close
if close > open
    and high > low
    bad = close
plot(close)
```

## TV probes

Measured 2026-06-20 with `pine-lint --tv -c`.

Probe 1, valid non-multiple-of-4 leading `and` wrap in an `if` condition:

```pine
//@version=6
indicator("x")
if close > open
   and high > low
    x = close
plot(close)
```

TV result:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":13,"line":5},"start":{"column":5,"line":5}},"name":"x","scopeId":"#1","type":"series float"}],"functions":[],"types":[],"enums":[]}}
```

Probe 2, invalid multiple-of-4 leading `and` wrap in an `if` condition:

```pine
//@version=6
indicator("x")
if close > open
    and high > low
    x = close
plot(close)
```

TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10156","ctx":{"value":"\"new line\""},"end":{"column":1,"line":4},"message":"Syntax error at input {value}","start":{"column":1,"line":4}}],"functions":[],"types":[],"enums":[]}}
```

## Local behavior before fix

The restricted parser for `if` conditions parsed the left condition with `parseSwitchDiscriminant()`, which uses a same-line precedence climber. In a condition like:

```pine
if low < box.get_top(array.get(bullZone1, i)) and low[1] >= box.get_top(array.get(bullZone1, i))
           and box.get_right(array.get(bullZone1, i)) > bar_index - 1
            buyZone2 := true
```

postfix parsing inside the right-hand call consumed the newline before the wrapped `and` because it recognized the next real token as a continuation. Control then returned to the same-line precedence climber with the current token already on the continuation line. Because the climber only joined wraps when it itself saw the NEWLINE token, it stopped before `and`; the block parser then treated `and ...` as a new statement and emitted `Syntax error at input "new line"`.

This produced four local-only rows in `fixtures/d40d7b5240abe25172dbeab64dd9fcd8e7168bf1772a8c6f5291141583f2ab93.pine` at lines 284, 290, 297, and 303. TV accepted the file.

## Fix

When `parseSameLineBinary()` sees an operator token already on a later line, it now re-anchors to that line only if the token itself is a valid leading wrap operator with non-multiple-of-4 indentation. Invalid multiple-of-4 wraps still terminate the condition and are reported by the statement-start invalid-operator guard from INV078.
