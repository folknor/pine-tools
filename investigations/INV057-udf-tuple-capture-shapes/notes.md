# INV057 - UDF tuple-return capture misses body shapes and overloads

**Status: fixed 2026-06-10.** TODO #51 blocker 1.

## The disagreement

Two TV-clean corpus fixtures carried local-only FPs rooted in tuple
destructures of user-defined functions whose tuple returns we failed to
capture:

- `cfb793bd559d75df…pine` - 4x `Cannot assign series float to bool`
- `712f0eade24a9ea1…pine` - 1x `The condition of the "if" statement must
  evaluate to a "bool" value.`

Both files destructure tuple-returning UDFs; the destructured elements
defaulted to `series<float>` and the wrongly-typed bool elements drew
type errors downstream. The same gap (without symptoms, because the
elements happened to be floats) covers the TODO #51 examples
`[r,g,b,_] = hslToRGB(…)` (fixture `0c053259…`) and
`[v,t] = valueAtTime(…)` (fixture `c3dd7111…`).

## Root causes (three, all in `checker.ts`)

1. **Body-shape gap.** `inferUdfTupleReturnTypes` located the body's
   tuple via `tailTupleExpr`, which only handled a trailing
   `ExpressionStatement(ArrayExpression)`, `ReturnStatement`, and
   if-branch tails. A trailing **discriminantless `switch` whose arms
   are tuples** (the `hslToRGB` shape) returned nothing, so the
   function was never recorded.
2. **Overload collision.** `udfTupleReturnTypes` was
   `Map<string, PineType[]>` - name-keyed, last-wins. The `valueAtTime`
   shape (a 2-tuple **method** plus a 3-tuple **function** overload
   sharing one name, as in TV's published time-library) left only one
   shape recorded, so one of the two destructure arities read wrong
   element types.
3. **Receiver-call miss.** A UDF method called via its receiver
   (`data.valueAtTime(ts)`) produces the dotted callee name
   `data.valueAtTime`; the capture map registers the method under its
   bare name `valueAtTime`, so the lookup missed and elements defaulted.

## The fix

- `inferUdfTupleReturnTypes` now derives element types through
  `branchTailTupleTypes` - the same type-level tail descent the
  destructure site already uses (trailing tuple literal, `return`,
  if tails, if/switch EXPRESSION tails via `tupleInitElementTypes`,
  merged per element with INV030's non-na preference). `tailTupleExpr`
  is deleted.
- `udfTupleReturnTypes` becomes `Map<string, PineType[][]>` - a list of
  captured shapes per name. Same-arity re-captures replace (idempotent);
  a new arity accumulates. The destructure site picks the shape whose
  arity matches the LHS name count (`expectedCount`, threaded through
  `tupleInitElementTypes`/`branchTailTupleTypes`), falling back to the
  first.
- Receiver method calls fall back to the bare property name via
  `receiverMethodTupleShapes`, guarded by `KNOWN_NAMESPACES` so builtin
  namespace calls (`ta.macd(…)`) can never hit a same-named user method.

## Probes (`pine-lint --tv`, 2026-06-10)

**p01-switch-tail.pine** - the body-shape gap, sharpened to bool/string
elements so wrong typing is visible as an error:

```pine
//@version=6
indicator("INV057 p01")
pick(float h) =>
    switch
        h < 1.0 => [true, "low"]
        => [false, "high"]
[flag, lbl] = pick(close)
if flag
    label.new(bar_index, high, text = lbl)
plot(flag ? 1 : 0)
```

TV verdict 2026-06-10: **0 errors, 0 warnings** (`compare-tv.mjs`:
local 0 / tv 0 after the fix; before the fix, local flagged the `if`
condition). TV reachability sanity per the methodology: p02 in the same
session produced a local-only warning diff, and fixture `712f0eade…`
produced tv-only warnings - the TV channel demonstrably answered.

**p02-overload-method.pine** - overload collision + receiver call:

```pine
//@version=6
indicator("INV057 p02")
method vat(array<float> arr, int ts) =>
    [arr.get(0), "x"]
vat(float src, int ts) =>
    [src, "y", true]
a = array.new<float>(1, 0.0)
[v1, s1] = a.vat(1)
[v2, s2, b2] = vat(close, 1)
if b2
    label.new(bar_index, high, text = s1 + s2)
plot(v1 + v2)
```

TV verdict 2026-06-10: **0 errors, 0 warnings.** Local after the fix:
0 errors, one warning (`Variable 'ts' is declared but never used`, the
genuinely-unused second-overload param - and itself the proof this
`--tv` call reached TV rather than an empty fallback).

## Result

- Corpus regression (1879 fixtures): 0 new errors; 5 disappeared
  records in the 2 FP files above, both now lint 0 = TV-equal.
- Regression fixture:
  `packages/core/test/fixtures/regression/INV057-udf-tuple-capture-shapes.pine`.

## Residual / lateral findings

- A user-defined **method's receiver is never marked used** by the
  validator channel (`a = array.new<float>(1, 0.0)` then `x = a.vat(1)`
  warns `Variable 'a' is declared but never used`). CLI/SemanticAnalyzer
  channel is NOT affected (compare-tv shows no such warning), so this is
  the validator-only unused-tracking bug class already noted in
  CLAUDE.md Known Limitations. Recorded here, not fixed.
- `f() => ta.macd(...)` (UDF whose tail is a call to a tuple-returning
  *builtin*) is still uncaptured - element types for builtin tuple
  returns aren't modelled at all (every element defaults). That is TODO
  #51 blocker 3's wider shape (`ta.vwap`), next up.
