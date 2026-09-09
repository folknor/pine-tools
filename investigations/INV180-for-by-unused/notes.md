# INV180 - UNUSED_VARIABLE ignores the `by` operand of a `for` header

Source: finding 10 of `../strategies/PINE-LINT-BUGS.md`. Direction: local raises
a warning TradingView does not. Safe in itself, but under a
warnings-are-failures policy it made every variable-stride loop unlintable.

## Repro

`repro.pine`:

```pine
//@version=6
indicator("t")
int stride = input.int(1, "Step")
int lo = 0
int hi = 5
int n = 0
for i = lo to hi by stride
    n += 1
plot(n)
```

| Validator | Verdict (2026-09-09) |
|---|---|
| `pine-lint -H` | `3:5: warning: [UNUSED_VARIABLE] Variable 'stride' is declared but never used` |
| `pine-lint -H --tv` | clean |

`stride` is read on the next line. Using a distinct variable in each of the
three loop slots reports only `stride`: `from` and `to` count as references,
`by` does not.

## Cause

`analyzeForStatement` in `parser/semanticAnalyzer.ts` walked
`statement.from` and `statement.to` (and `statement.collection` for the for-in
form) but never `statement.step`. So the `by` operand was the one loop-header
expression whose identifiers never reached `usedVariables`.

The finding's guess that this was "a single missing edge in the reference walk
rather than a general blindness to loop headers" was exactly right, and the
neighbouring code confirms it: `statementExpressions`, the OTHER enumeration of
a statement's child expressions in the same file, already lists
`...(statement.step ? [statement.step] : [])` for `ForStatement`. Only the
analyze path was missing it.

## Fix

One `analyzeExpression(statement.step)` call, guarded like its neighbours.

Regression fixture:
`packages/core/test/fixtures/regression/INV180-for-by-unused-variable.pine`.
It puts a distinct variable in each of the three loop slots so a future
regression can only be in the slot that broke, and carries an unread
`neverRead` as the control that must STILL warn - otherwise the fixture would
also pass if someone silenced the rule outright.
