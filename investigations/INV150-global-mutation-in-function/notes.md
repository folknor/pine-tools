# INV150 - "Cannot modify global variable in function" (CE10088) was not implemented

Status: fixed.

## The disagreement

Pine forbids a user-defined function reassigning a global variable. TradingView
raises CE10088. We accepted it silently - the dangerous direction: a file passes
locally, gets committed, and fails when it is actually loaded.

Reported from downstream use (`../strategies/PINE-LINT-BUGS.md` item 1), where a
diagnostic counter incremented inside a `resetSetup()` helper passed our linter
and was then refused by both piners (`PINE0305`) and TradingView.

## Probe 1 - the minimal repro

```pine
//@version=6
indicator("t")
var int g = 0
f() =>
    g := g + 1
    g
plot(f())
```

`pine-lint --tv`, 2026-08-23:

```
CE10088  5:5-5:5  Cannot modify global variable "{variableName}" in function   ctx: {variableName: "g"}
```

`pine-lint` (local, before the fix): clean, `success: true`, zero errors.

The `--tv` call reached TV: it returned the full `variables`/`functions` blocks
and disagreed with our local verdict, so this is a real answer and not an empty
or crashed result.

Same script under `//@version=5`, same date, raises TV's older wording -
`Cannot modify global variable 'g' in function`, no code, same 5:5 anchor. The
rule is therefore not version-gated.

## Probe 2 - the boundary

The check is only safe if it distinguishes reassigning a global SCALAR from
mutating a FIELD of a global object, which is legal and is the ordinary way to
carry mutable state into a function. This is the whole reason a naive
implementation would be worse than none.

The probe is the regression fixture itself,
`packages/core/test/fixtures/regression/global-mutation-in-function.pine`.
`pine-lint --tv` on that file, 2026-08-23:

```
CE10088  21:5-21:5  Cannot modify global variable "{variableName}" in function   ctx: {variableName: "g"}
CE10088  24:5-24:9  Cannot modify global variable "{variableName}" in function   ctx: {variableName: "total"}
```

Two errors, and TV is silent on all four legal shapes in the same file:

- `s.flag := true` - field of a global object, inside a function.
- `local = 0` / `local := local + 1` - a body-local.
- a parameter named `g` shadowing the global `g`, read inside the body.
- `g := 3` inside a top-level `if` block - not a function, so not the rule.

Our local output after the fix is the same two diagnostics at the same
positions with the same rendered text.

Note TV's anchor is zero-width on the first and five columns wide on the
second, which is TV being inconsistent about the target's extent rather than
anything meaningful. We emit the identifier's own length in both cases.

## Implementation

`packages/core/src/analyzer/checker.ts`, `AssignmentStatement`. Three
conditions, each carrying one of the boundary cases above:

- `functionDepth > 0` - a new counter incremented around the body of both
  `FunctionDeclaration` and `MethodDeclaration`. `blockDepth` could not be
  reused: it also counts if/loop blocks, where a top-level `g := 3` is legal.
- `operator !== "="` - inside a body, `=` is a local declaration, not a write
  to the global.
- `target.type === "Identifier"` - this is what excludes the field-mutation
  case, and the whole check rests on it.

Whether the name is a global is decided by `SymbolTable.resolvesToGlobal`, added
in `symbols.ts`: the current scope's resolution must be the same object as the
global scope's own entry. Identity rather than a scope-depth count, so a
parameter or body-local that shadows a global answers false. Builtin seeds
(`line === 0`) are excluded - writing to those is a different error.

Not gated on version, per probe 1.

## Corpus sweep

1879 fixtures. 24 new CE10088 diagnostics, in 2 files
(`442a9d64...`, `cc2536d8...` - near-duplicates), 12 each. Both are the exact
reported shape: a `resetSetup()` helper assigning `na` / `0` to twelve
top-level `var` globals. Zero other files affected, so no false-positive class.

TV cannot confirm those two files directly - it stops at a syntax error on line
153 and never reaches line 213 (its known first-error-only behaviour, G001).
The construct is identical to probe 1's, which TV does answer.

## Follow-up, not fixed here

TV also raises CE10175 `Function arguments cannot be mutable ("{variableName}")`
when a body assigns to one of its own parameters (probed 2026-08-23, same
session, on `f(gg) => gg := gg + 1`). We are silent on that. Same family, same
place in the code, out of scope for this investigation.
