# INV138 - method calls on scalar and collection receivers (CE10271 FN)

**Date:** 2026-07-15
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker-calls.ts` (validateCallExpression
`!signature` MemberExpression block; new `importedMethodMayExist`),
`packages/core/src/analyzer/builtins.ts` (new `isCatalogFunction`),
`packages/core/src/analyzer/checker.ts` (IndexExpression inference)

## Scope

TODO #41's residual slices (b) and (c), both deferred by
[INV065](../INV065-shadow-gate-oversuppresses-member-calls/notes.md):

- **(c) method call on a non-namespace scalar** - `x.abs()`, `s.length()`.
  INV065 caught the *namespace-shadow* form (`timeframe.changex` where
  `timeframe` is a string param) but its gate required
  `KNOWN_NAMESPACE_PREFIXES.has(nsPath)`, so a plain `float x` receiver never
  reached the check.
- **(b) collection-typed receiver** - `arr.pushx(1.0)`. INV065 deferred this
  for want of "the per-collection method set". That set turns out to be the
  catalog itself, so no hardcoded table is needed.

INV065's own p06/p07 already established the keystone (scalars carry no
builtin methods). They were re-probed here per G001 rather than trusted.

## The prose docs are wrong-by-omission here

The Manual (`po search`) describes imported library access as
namespace-qualified only: "The script can then use the library's defined title
(or a specified alias) similarly to a *namespace* to access the imported
components", with every example in the `foo.bar()` / `dpl.drawPivots()` form.
Read literally, that says an imported library cannot contribute methods to a
bare receiver, which would make slice (c) safe without any import gate.

**That reading is false.** TV accepts `x.add(2.0)` for a `float x` when
`RicardoSantos/MathOperator/2` (which declares
`export method add(float value_a, float value_b)`) is imported, and rejects the
identical call without the import (p02 vs p04). Documentation silence is not
authority; TV is (G001, and the G002 retraction for the same reason).

The mechanism is visible in TV's `translate_light` response, which emits **two**
signatures per exported method - the qualified function form, and a
receiver form carrying `thisType`:

```jsonc
{ "name": "mo.add", "syntax": ["mo.add(series float value_a, series float value_b) → series float"] }
{ "name": "mo.add", "syntax": ["mo.add(series float value_b) → series float"],
  "thisType": ["series float", "simple float", "input float", "const float"] }
```

So any imported library's exported method can legitimize an unqualified call on
a receiver of its first parameter's type, including a builtin scalar. The check
must gate on the imported export sets or every consumer of such a library
becomes a false positive.

## Probes (`pine-lint --tv`, 2026-07-15)

All scripts are under `probes/`. TV *disagreed* with our pre-fix behavior on
p03/p04/p05/p08/p09, which proves these calls reached TV's checker and that the
clean verdicts (p01/p02/p06/p07/p10) are real acceptances rather than empty or
crashed responses.

| probe | key line | TV verdict | pre-fix us |
|---|---|---|---|
| p01 | `mo.add(x, 2.0)` (qualified, import present) | clean | clean |
| p02 | `x.add(2.0)` (unqualified, import present) | **clean** | clean |
| p03 | `x.addx(2.0)` (unqualified typo, import present) | CE10271 `x.addx` | silent (FN) |
| p04 | `x.add(2.0)` (**no** import) | CE10271 `x.add` | silent (FN) |
| p05 | `f(float x) => x.abs()` / `g(string s) => s.length()` | CE10271 x2 | silent (FN) |
| p06 | `method getType(int this)` overloads, `a.getType()` | clean | clean |
| p07 | `prev = c[1]` / `prev.size()` for `array<float> c` | clean | clean |
| p08 | `float y = c[1]` for `array<float> c` | CE10123 `"array<float>"` | silent (FN) |
| p09 | `arr.pushx` / `m.putx` / `mx.setx` | CE10271 x3 | silent (FN) |
| p10 | valid builtin members + a user `method` on `array<float>` | clean | clean |
| p11 | `math = array.new<float>(0)` / `math.pushx(1.0)` (INV065 p04) | CE10271 `math.pushx` | silent (FN) |

p02 vs p04 is the pair that matters: the ONLY difference is the `import` line,
so the import is what makes the unqualified scalar method call legal.

p11 is INV065's p04 - a COLLECTION shadowing a builtin namespace name, which is
how TODO #41 worded slice (b). The collection check deliberately does NOT
exclude `KNOWN_NAMESPACE_PREFIXES` so that this form is covered; INV065's block
cannot double-report it, because its `scalarShadow` is false for an `array`
receiver. p11 emits exactly one error, and `math.push`/`math.size` stay clean.

## Fix

In the `!signature` MemberExpression branch, two new receiver-typed checks,
both single-dot, `parserClean`, and requiring the receiver to RESOLVE to a user
symbol:

- **scalar receiver** (`SCALAR_BASE_TYPES`, excluding `KNOWN_NAMESPACE_PREFIXES`
  paths so INV065's block stays the only reporter for the shadow form): a
  scalar has no builtin methods, so the only escape hatches are a user method
  and an imported library's exported method.
- **collection receiver** (base matches `array<` / `matrix<` / `map<`): valid
  iff `<kind>.<member>` is a catalog entry (`isCatalogFunction`), since the
  builtin method surface of a collection IS its namespace's function set
  ("Built-in methods": `id.get(i)` and `array.get(id, i)` are equivalent).

Both share the escape hatches: `declaredFunctionNames` (name-only, so it does
not attempt overload matching - deliberately over-lenient) and
`importedMethodMayExist`.

`importedMethodMayExist` is conservative on both unknowns: any import whose
export set we lack (unvendored, license-excluded, parse-quarantined) means ANY
member could be its method, so we stay silent for the whole file; and the export
sets are name-only, so a plain exported *function* named `add` also suppresses.

**FP-safety direction.** These checks fire only when the receiver RESOLVES to a
known scalar or collection, so a resolution gap yields silence rather than a
false flag. That is the complement of INV066, which asserts a receiver resolves
to NOTHING; its first attempt produced 247 corpus FPs by tripping over
resolution gaps, and it was landed in `a35bac7` once the `parserClean` gate
excluded the parser-damaged sources those FPs came from. Both directions now
share that gate.

## Root cause found on the way: `array<T>[n]` is not `T`

The first regression run produced 8 FPs in `eeb8258b…` on `cls_array.size()`,
where line 68 is `cls_array = c[1]`. `inferExpressionType` had a rule
`array<T>[index] → T`, which typed the receiver as its element scalar and so
tripped the new scalar check.

That rule is simply wrong Pine. `[]` on a collection is the **history**
operator, not element access: `arr[1]` is the array reference as of one bar
ago. Elements come from `array.get()` only. TV names the type outright in p08 -
`Cannot assign a value of the "array<float>" type` - and accepts `c[1].size()`
in p07. Removing the branch lets `array<T>` fall through unchanged (matrix and
map already did, having never matched the `array<` pattern).

This was a pre-existing **false negative** in its own right: we silently
accepted `float y = c[1]`, which TV rejects. Fixing it also removed a v5 corpus
FP in `2997d729…:400`, where `getPivots(length,size)[1]` at line 389 was typed
`swingPoint` and propagated through two `request.security` wrappers into a bogus
"Cannot assign a value of the "swingPoint" type" at the eventual assignment.
`compare-tv` on that carrier is now 0 local / 0 TV errors.

Related: [INV098](../INV098-forin-non-iterable/notes.md) worked *around*
this same bug by excluding `IndexExpression` collections from its for-in scalar
check. That exclusion is now redundant for the array case but still does work
for the series case (`for x in close[1]`), so it is left alone.

## Verification

- 10 probe files under `probes/`, all matching TV's verdicts post-fix.
- 6 regression fixtures: `INV138-scalar-receiver-method-call`,
  `INV138-scalar-receiver-no-false-positive`, `INV138-imported-method-on-scalar`,
  `INV138-collection-receiver-method-call`, `INV138-collection-receiver-valid`,
  `INV138-array-history-type`.
- `regression-check.mjs`: **0 new error appearances** over 1879 fixtures. The
  single changed fixture is the `2997d729…` v5 FP above (a correct removal,
  TV-confirmed silent). Collection method calls are pervasive in the corpus, so
  the zero-FP result for slice (b) is a meaningful measurement rather than a
  vacuous one - p09 pins that the check does fire.
- Full vitest: 431 passing.

## Residual (still #41)

- **(a)** members of imported libraries we do not vendor, and UDT method
  namespaces. This is the only #41 slice still open: the undefined-receiver
  slice (d) was fixed in `a35bac7`
  (see [INV066](../INV066-undefined-receiver-method-call/notes.md)).
- A scalar/collection receiver whose type does not resolve (typed `unknown`,
  undetermined UDF results) stays silent by design.
- Columns are anchored at the call start; TV anchors at the member, a few chars
  right. Pre-existing G005-class position noise, shared with INV065/INV103.
