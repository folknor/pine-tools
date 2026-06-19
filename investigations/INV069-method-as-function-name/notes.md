# INV069 - `method` as a function name mis-parsed (false parse error)

**Date:** 2026-06-19
**Status:** fixed
**Code:** `packages/core/src/parser/parser.ts` (non-export function-definition
detection ~L508; export dispatch + export function-name consume)

## Symptom (false positive - parse error TV doesn't emit)

A function whose name is `method` - `method(...)` with `(` directly after the
keyword - failed to parse:

```pine
//@version=6
method(int idx) =>     // we: 5 errors (Unexpected token: idx / =>, ...)
    idx + 1            // TV: clean (probed 2026-06-19, p01)
plot(method(1))
```

`method` is a CONTEXTUAL keyword: it introduces a method declaration only when
followed by `<name>(` (`method dbl(float v) =>`). When `(` follows `method`
directly, it is an ordinary function named `method`, which TV accepts. INV051
already taught the NON-export statement dispatcher this (so `method(...)` is not
routed to methodDeclaration), but two spots still rejected it:

1. The function-definition detector keys on `this.check(IDENTIFIER)`, and
   `method` lexes as KEYWORD - so `method(...) =>` never entered the
   function-declaration branch and fell through to expression parsing, where
   `=>` is unexpected.
2. The `export` dispatcher routed ANY `export method ...` to methodDeclaration
   unconditionally, and its function-name consume required an IDENTIFIER - so
   `export method(...)` (the corpus library form) errored too.

## How it surfaced

INV067's library-vendoring quarantine: `RicardoSantos/
FunctionZigZagMultipleMethods/1` (v5) defines `export method(int idx) =>` (a
helper named `method`). It was 1 of the 5 quarantined libraries.

## Fix

- Non-export: the function-definition detector also accepts `method` (KEYWORD)
  when immediately followed by `(`. If it's a call (no `=>`), the existing
  backtrack handles it.
- Export: guard the method-declaration routing on the `method <name>(` shape
  (mirroring INV051); accept `method` as the export function name in the
  function-name consume.

## Verification (`pine-lint --tv`, 2026-06-19)

- `method(int idx) => idx + 1` clean on TV - pre-fix parse error was a false
  positive (INV001-class).
- Method declarations unaffected: `method dbl(float v) =>`, `export method
  dbl(...)`, and `method` as a variable (`method = input.int(5)`) all still
  parse.
- 1 regression fixture (`regression/INV069-method-as-function-name`): a
  function named `method` PLUS a real method declaration `dbl`, local == TV
  clean.
- `RicardoSantos/FunctionZigZagMultipleMethods/1` now parses (0 errors),
  libraries.json 87 -> 88.
- `regression-check.mjs`: 0 changes over 1879 fixtures. Full suite passes.

## Remaining quarantine

1 library still quarantined: `TFlab/FVGDetectorLibrary/1` - a `switch` arm body
that wraps to the next line with a leading `and` (free-form continuation /
statement-bodied switch arm; ties to #45/INV042 leading-operator wraps and
INV066). Separate, not yet addressed.
