# INV122 - qualifier provenance foundation

**Date:** 2026-06-27
**Status:** Loop 1 implementation for TODO #9. No verdict changes.
**Source:** TODO #9 (robust UDF-return inference, Loop 1 qualifier-provenance).
The originating design substrate (`reference/spec-9-udf-inference-foundation.md`)
was an orchestration artifact, deleted once landed; its durable record is TODO #9
plus this loop's INV122/INV123/INV124 trail and the git history.

## Scope

This loop adds a checker-internal provenance channel:

```ts
{ base: string, qualifier: "const" | "input" | "simple" | "series" }
```

The qualifier lattice is centralized in
`packages/core/src/analyzer/qualifier.ts` as `const < input < simple < series`.
`PineType` is not widened. The live checker paths still use the conservative
policy, so the new UDF and broad user-variable branches are available only to
unit tests and later loops.

## Resolution table

`qualifierProvenance(v, expr, version, policy)` resolves:

| expression | base | qualifier |
|---|---|---|
| literal | `inferExpressionType` base | `const` |
| builtin variable | pine-data variable base | pine-data qualifier |
| builtin constant | inferred/catalog base | `const` |
| builtin call | raw resolved return base | leading raw return qualifier |
| unary | operand base | operand qualifier |
| binary / ternary | operator result base | joined operand qualifiers |
| switch / if expression | result base | joined condition/result qualifiers, trusting policy only |
| user variable | symbol type base | bracket-form qualifier; conservative policy trusts only existing `series<>` / `input<>` |
| UDF call | first-return or tail expression base | first-return or tail expression qualifier, trusting policy only |

The base and qualifier axes are deliberately separate. For example,
`close > open` resolves to `{ base: "bool", qualifier: "series" }`: the base
comes from the operator result, while the qualifier is the join of the operands.

## Const preservation through UDF calls

The UDF branch preserves the body return expression's qualifier. A function
`f() => 5` therefore resolves as `{ base: "int", qualifier: "const" }`, not
`simple` or `series`.

This reuses the already recorded INV121 TV probe:

```pine
//@version=6
indicator("x")
f() => 5
y = input.int(defval = f())
```

Recorded TV result in INV121, dated 2026-06-26, `success:true`: TV accepts this
script with 0 errors. This loop adds
`packages/core/test/fixtures/regression/INV122-udf-const-into-input.pine` to
keep that witness green.

Untyped params are not inserted into the qualifier walk. For `f(p) => p`, the
return leaf has no structural qualifier, so `f("hello")` resolves to `null`.
That is independent of the existing base-inference pass, which still carries the
old `series<float>` untyped-param guess until Loop 2.

## Consumer audit

- `exprQualifier`: replaced by a wrapper over `qualifierProvenance(...,
  { trustUdfAndUserVars: false })`. It preserves the previous live behavior:
  literals, builtins, builtin calls, unary, binary, ternary, and existing
  `series<>` / `input<>` user vars resolve; UDF calls, bare user vars, and
  switch/if expressions stay `null`.
- `describeNonConstArg`: unchanged gate shape. It still calls `exprQualifier`
  only for binary/ternary composites and still has its existing direct UDF and
  user-variable conservatism.
- `isReliablyTyped`: unchanged. It still excludes user vars and UDF calls.
- `getBuiltinVarInfo` / `getBuiltinQualifiedType`: unchanged data consumers.
  They continue reading qualifiers from pine-data.
- `resolveCallReturnRaw`: same behavior, but its private qualifier rank and
  leading-qualifier helper now delegate to `qualifier.ts`.
- `QUALIFIER_RANK` / `qrank` and `QUALIFIER_NAMES` / `qrankOf`: duplicate
  literal lattices removed or repointed at `qualifier.ts`.
- `canonicalizeQualifier`: unchanged type-compatibility behavior. It still
  collapses `input<T>` and `const<T>` to `simple<T>` for assignability.
- `inferExpressionType` INV040 bracket wrapping: unchanged. The provenance
  resolver reads those existing bracket forms from user-variable symbols.

No live consumer uses `{ trustUdfAndUserVars: true }` in this loop.

## Neutrality

The corpus-visible path remains conservative:

- INV014 const-arg checking keeps its old UDF/user-var skip behavior.
- INV016 union-arg checking is untouched.
- `exprQualifier` still returns `null` for UDF calls, unqualified user vars, and
  switch/if expressions under the live policy. HEAD's `exprQualifier` had no
  `IfExpression` case (it fell to the `null` default); the resolver's new
  `IfExpression` branch must therefore floor to `null` under the conservative
  policy, exactly as `SwitchExpression` does (R2-H4).

Verification on 2026-06-27:

```bash
./node_modules/.bin/tsc -p . --pretty false
./node_modules/.bin/vitest run
node scripts/regression-check.mjs --concurrency 4
```

`regression-check.mjs` spawns `pine-lint` from PATH; for this run that resolved
to the freshly built CLI bundle (`node dist/packages/cli/src/cli.js`), so the
regression compared the current local validator against the snapshot baseline.

Result: typecheck clean, all 396 vitest tests passed. Regression checked 1879
fixtures with 0 changed fixtures, 0 new error appearances, and 0 disappearances.
