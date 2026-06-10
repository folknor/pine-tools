# INV055 - void-returning call cannot initialize a variable (CE10098)

**Date:** 2026-06-10
**Status:** fixed (declaration + reassignment; tuple-destructure residual below)
**Code:** `packages/core/src/analyzer/checker.ts` (VariableDeclaration case)

## How it was found

The `fixture-coverage` census (built this session) listed the `matrix.*`
block as referenced in zero fixtures. Building a plain coverage script that
exercises those functions and diffing local vs `--tv` immediately surfaced
two false negatives - this one, and a missing-required-arg lead on
`matrix.sum` (see Residuals). This is the census doing its job: an uncovered
catalog region hid a whole missing check.

## Symptom (false negative)

Assigning the result of a void-returning builtin to a variable is accepted
locally but rejected by TV:

```pine
//@version=6
indicator("t")
a = array.new<float>(0)
x = array.push(a, 1.0)     // TV: 4:1 CE10098 "Void expression cannot be assigned to a variable"
m = matrix.new<float>(2, 2, 0.0)
rev = matrix.reverse(m)    // TV: 6:1 CE10098
array.push(a, 2.0)         // legal - bare void call, NOT flagged
```

127 functions in `functions.json` return `void` (every setter/mutator:
`array.push/set/clear`, `matrix.set/reverse/sort`, `label.set_*`,
`box.set_*`, `strategy.risk.*`, ...). We missed assignment from all of them.

## Root cause

`resolveCallReturnRaw` returns `"void"` for these, but the surrounding type
inference treated a void/unknown return as `"unknown"`, which is assignable
to anything - so neither the declaration nor the assignment path objected.
Confirmed with the bool-reveal probe: `bool z = array.push(a, 1.0)` produced
no type error (an int/float RHS would have), proving the RHS inferred as
`unknown`, not `void`.

Fix: in the `VariableDeclaration` case, when the initializer is a
`CallExpression` whose resolved builtin return is exactly `void`, emit
CE10098 at the statement start. Scoped to a direct void-call initializer, so
a bare void statement and a non-void initializer are untouched.

## TV probes (`pine-lint --tv`, 2026-06-10)

```pine
//@version=6
indicator("t")
a = array.new<float>(0)
x = array.push(a, 1.0)
plot(close)
=> CE10098 4:1..4:22 "Void expression cannot be assigned to a variable"
```

Reassignment to a TYPED variable gives a DIFFERENT message (a type
mismatch, not CE10098):

```pine
//@version=6
indicator("t")
a = array.new<float>(0)
var float x = na
x := array.push(a, 1.0)    // TV 5:1: Cannot assign a value of the "void" type
                           //   to the "x" variable. ... declared with the "float" type.
array.push(a, 2.0)         // TV silent - bare void call is legal
plot(close)
```

`--tv`-reached-TV sanity: TV *disagrees* with our pre-fix silence on the
declaration probe (it flags 4:1, we did not), proving the call reached TV.

## Verification

- Regression fixture `regression/INV055-void-assignment` (CE10098 on the two
  declarations; bare void call + non-void initializer clean).
- Regression check: **0 changes** across 1879 corpus files - no false
  positives, and no published script makes this mistake. Like INV053, the
  check earns its keep on invalid/edited code, not on the valid corpus.

## Reassignment (added 2026-06-10, #49)

`x := voidCall()` is TV's type-mismatch, NOT CE10098 - it names the target's
type:

```
Cannot assign a value of the "void" type to the "x" variable.
The variable is declared with the "float" type.
```

Probed for both an explicitly-typed var (`var float x`) and an inferred one
(`y = 5`); same message, naming `float` / `int`. The strict-assign
reassignment check (INV032) gates on `valueType !== "unknown"`, and void
infers as `unknown`, so it skipped these. Fixed with an explicit void-call
branch in the `AssignmentStatement` `:=` path that names the target's known
type (shared `isVoidCall` helper with the declaration check). Only fires when
the target type is known; if unknown we conservatively skip (can't name it).
Regression check: 0 changes. Fixture: `regression/INV055-void-reassignment`.

We deliberately did NOT make void calls infer as type `"void"` globally - that
would let the existing checks fire but carries cascade risk (void-as-argument,
void in sub-expressions) for uncertain gain. The two explicit checks cover the
real mistakes.

## Residuals

1. **Tuple destructure of a void call** (`[a, b] = voidCall()`) - TV gives a
   generic "the right side must be a function call ... returning a tuple with
   the same number of elements" error, NOT a void-specific one: it fires for
   any non-tuple RHS (`[a, b] = close` too). So this is a separate
   tuple-destructure-arity check (its own future INV), broader than void, and
   out of scope here. (TV also emits an internal `variableType.itemType is not
   a function` crash artifact alongside it - G001, not replicated.)
2. **`matrix.sum` missing required `id2`** - the same matrix probe showed TV
   flags `matrix.sum(m)` for a missing required `id2` while we were silent.
   Generalized and fixed as INV056 (the missing-arg check skipped all
   overloaded functions).
