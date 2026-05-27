# INV006 — methods and variables shared a symbol-table slot

**Status:** Fixed. `Scope` now stores methods in a separate `methods`
map; bare-identifier lookups consult only the variable namespace, and
call-site lookups consult both via the new `lookupCallable()`.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV006-method-shadows-variable.pine`

## Summary

Pine v6 allows a variable and a method to share a name:

```pine
int n = bar_index
method n(float v) => not na(v)

x = n - 1          // bare identifier — resolves to the variable
y = n(5.0)         // call — resolves to the method
z = (5.0).n()      // method call — resolves to the method
```

Our `Scope` used a single `Map<string, Symbol>` for all symbols. The
later registration (the method) overwrote the variable's entry, so
`n - 1` looked up `n`, found the method symbol whose `type` was the
method's *return type* (`bool`), and reported

```
Type mismatch: cannot apply '-' to bool and int
```

`pine-lint --tv` on the same input: 0 errors.

## Repro

Minimal:

```pine
//@version=6
indicator("t")

int n = bar_index

method n(float v) => not na(v)

x = n - 1
plot(x)
```

Before: 1 error (the message above). After: 0 errors.

## Root cause

`packages/core/src/analyzer/symbols.ts`. `Scope.define` did
`this.symbols.set(symbol.name, symbol)` with no awareness of kind.
`Scope.lookup` returned the single symbol stored at that key. When a
`MethodDeclaration` registered itself after a `VariableDeclaration` of
the same name, it clobbered the variable's slot and its stored `type`
(the method's *return type*) leaked into every subsequent
type-inference call that hit the variable's identifier.

Worth knowing: the method's `type` field stores the return type, not
a callable signature. That's a separate cleanup but not required for
this fix.

## Fix

`packages/core/src/analyzer/symbols.ts`:

- Extended `Symbol.kind` to `"variable" | "function" | "parameter" |
  "method"`.
- Added a parallel `methods: Map<string, Symbol>` on `Scope`.
  `define` routes `"method"` entries there; everything else stays in
  the existing `symbols` map.
- Added `Scope.lookupCallable(name)` that consults variables first
  (so a same-named variable still wins for clarity), then the method
  namespace. Walks the parent chain like the regular `lookup`.
- `SymbolTable.lookupCallable(name)` delegates to the current scope.
- `getAllSymbols()`, `markUsed()`, and similar helpers walk both maps.

`packages/core/src/analyzer/checker.ts`:

- `MethodDeclaration` registration now uses `kind: "method"` so the
  symbol lands in the method namespace.
- The UDF call-site return-type lookup
  (`validateCallExpression` → `inferExpressionType` for callable
  identifiers) switched from `lookup()` to `lookupCallable()` and
  accepts both `"function"` and `"method"` kinds.

Inline `// see INV006` references at each change site.

`FunctionDeclaration` was *not* changed. Pine functions and variables
can also share a name in principle, but we have no fixture
demonstrating real-world need; if and when one shows up, the same
namespace-split pattern extends straightforwardly.

## Verification

- Minimal repro: 1 → 0 errors.
- New regression fixture
  `packages/core/test/fixtures/regression/INV006-method-shadows-variable.pine`
  exercises bare-identifier use, function-style call (`n(5.0)`), and
  method-style call (`(5.0).n()`) all with the same name. 153/153
  tests pass.
- Corpus regression-check: 16 disappearances at TV-silent positions
  (correct FP removals), 0 TV-also-flagged disappearances. 20
  "appearances" examined:
  - 18 are *message-text differences* at the same `(line, col)`. The
    `findSimilarSymbols` suggestion shifted because the method
    namespace is no longer queried during similarity ranking. Same
    underlying "Undefined variable …" error, different "Did you
    mean …?" wording.
  - 2 are *truly new* errors: `Undefined variable 'overlap'` in
    `8439b2366…pine:1057` and `Undefined variable 'is_extended'` in
    `93badd17…pine:142`. Both files declare the names at the top
    level *and* declare a same-named method. Before INV006 the
    method's symbol satisfied the variable lookup (with the wrong
    type — masking a real type bug); after INV006 the variable
    lookup uses the variable namespace, and the bare-identifier
    reference inside a deep nested block doesn't reach the
    top-level variable because of an independent scope-visibility
    issue. TV emits 0 errors on both positions — so these are FPs
    of our scope tracking, not caused by INV006. Captured as a
    follow-up task.

## Adjacent finding (not fixed here)

Top-level variables don't appear to be visible from inside deeply
nested blocks of certain user-defined functions / methods. Two of the
20 regression "appearances" surfaced this — both at positions where
TV is silent. Reproducible against `8439b2366…pine:1057` and
`93badd17…pine:142`. Likely a `Scope.lookup` walk that bottoms out
before reaching the global scope under some condition; needs a focused
minimal repro.

## Methodology notes captured

- Adding a new symbol *kind* with its own storage requires touching
  every consumer of `symbols` — `getAllSymbols`, `getUnusedSymbols`,
  `markUsed`, `findSimilarSymbols`, plus all the `lookup` call sites
  in the checker. Easy to miss one; the regression check caught the
  resulting "Did you mean" suggestion shift.
- "Suggestion-shift" appearances (same `(line, col)`, same first
  half of the message, different "Did you mean" tail) should
  probably be reframed in `regression-check.mjs` as "message changed
  at known position" rather than "new error appearance" — closing
  the loop with the `samePositionDifferentMessage` category that
  `find-real-failures.mjs` already has. Adding to the tooling backlog.
