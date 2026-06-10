# INV052 - library export constraints (typified args + const-typed vars)

**Date:** 2026-06-10
**Status:** fixed
**Code:** `packages/core/src/parser/parser.ts` (`exportDeclaration`),
`packages/core/src/analyzer/checker.ts`
(`checkExportedParamsTypified` + the VariableDeclaration export check),
`packages/core/src/parser/ast.ts` (FunctionParam line/column,
VariableDeclaration.isExport)

## Symptom (two corpus files)

Both are Pine v6 `library(...)` scripts that TV flags but we did not:

`fixtures/fe06c08f...` - `export add(x, y) => x + y` (untyped args):

```
TV:    11:12  All exported functions args should be typified
       11:15  All exported functions args should be typified
local: (silent)            <- false negative
```

`fixtures/131b0e46...` - `export int seed = 7` (type but no const):

```
TV:    5:1  Exported variable should have const modifier and type
local: 5:8  Expected function name after 'export' at line 5   <- false positive
       6:26 Undefined variable 'seed'                         <- cascade FP
```

The second file shows the parser **gap**: `exportDeclaration` only knew
`export method`, `export enum/type`, and `export <name>(...)` (function). Any
other `export` form fell into the function path, hit `consume(IDENTIFIER)` /
`consume(LPAREN)`, and emitted a phantom "Expected function name after
'export'"; the variable never registered, so `seed` later read as undefined.

## TV's exact rules (probed with `pine-lint --tv`, 2026-06-10)

All probes are `//@version=6` + `library("P")` + the line under test.
`lint-batch --tv` / `compare-tv`, 2026-06-10:

### Exported function/method args must be typified

| probe | line under test | TV |
|---|---|---|
| `probe-fn-typed` | `export add(int x, int y) => x + y` | clean |
| `probe-fn-untyped` | `export add(x, y) => x + y` | `3:12` + `3:15` typify error |
| `probe-fn-mixed` | `export add(int x, y) => x + y` | `3:19` (only the untyped `y`) |
| `probe-method-untyped` | `export method scale(float this, factor) => ...` | `3:33` (the untyped `factor`) |

Rule: every parameter of an EXPORTED function or method must carry a type;
each untyped param gets `All exported functions args should be typified`
anchored at the param. Methods are included (receiver aside, all params).
Non-exported UDFs infer param types and are exempt.

### Exported variables need BOTH const AND type

| probe | line under test | TV |
|---|---|---|
| `probe-var-const-type` | `export const int seed = 7` | clean |
| `probe-var-type-noconst` | `export int seed = 7` | `3:1` const+type error |
| `probe-var-const-notype` | `export const seed = 7` | `3:1` const+type error |
| `probe-var-bare` | `export seed = 7` | `3:1` const+type error |

Rule: an exported variable must have a `const` modifier AND a type, else
`Exported variable should have const modifier and type` at the `export`
keyword (col 1). One message for all three deficient forms.

All four var forms PARSE in TV (the const+type requirement is a
SemanticAnalyzer lint, not a parse error), so our parser must accept them
too.

### `--tv`-reached-TV sanity check

`method = input(defval='BB %B', options=[...])` (bare `input()` has no
`options` param in v6): local `Invalid parameter 'options'` vs TV
`The "input" function does not have an argument with the name "options"` -
TV and local agree there is an error, proving the clean 0-error results
above are real acceptances, not crashed/empty `--tv` responses (per the
CLAUDE.md `--tv` rule / G002).

## Fix

1. **Parser** - `exportDeclaration` now routes the variable forms before the
   function path: `export const [type] name = ...` (reuses
   `varDeclarationAfterKeyword`), `export <type> name = ...` (only on the
   `type name =` shape), and bare `export name = ...` (IDENTIFIER not
   followed by LPAREN). The result is a `VariableDeclaration` with
   `isExport = true` and `startLine`/`startColumn` pinned to the `export`
   keyword (where TV anchors). A function stays the only `export name(...)`
   form. This alone kills the "Expected function name" FP + the undefined
   cascade.
2. **Checker** - `checkExportedParamsTypified` fires on exported
   function/method declarations, emitting the typify error at each untyped
   param (FunctionParam now carries its first-token line/column). The
   VariableDeclaration case emits the const+type error when an exported var
   lacks `const` or a type annotation.

## Verification

- 8 probes + both corpus files: `compare-tv` shows 0 disagreement at every
  position (2026-06-10).
- Regression check: the only changes are on the two target files - 3 new TPs
  matching TV (`fe06c08f` 11:12 / 11:15; `131b0e46` 5:1) and 2 removed FPs
  (`131b0e46` 5:8 / 6:26). The check's "disappeared TV-also-flagged" label on
  the two removed FPs is a stale-`real-failures.json` artifact (it predates
  the fix); direct `--tv` confirms TV never emitted them.
- Full test suite: 290 pass, including the three new fixtures
  (`regression/INV052-exported-untyped-args`, `-exported-var-needs-const-type`,
  `-exported-clean`).

## Scope note

These are library-only constraints. They fire on `isExport` declarations,
which are only legal inside `library()` scripts; a stray `export` elsewhere
is a separate TV error and not in scope here.
