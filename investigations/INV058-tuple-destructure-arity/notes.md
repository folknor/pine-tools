# INV058 - tuple destructure requires a tuple RHS of matching arity (TODO #51)

**Status: implemented 2026-06-10.** The re-attempt of TODO #51 after its
three blockers were fixed (INV057 + addendum). The first draft (before the
blockers) produced 51 FPs across 17 corpus files; this implementation
ships with **zero corpus changes** (1879 fixtures, regression-check clean)
and reproduces TV's two errors exactly on all 10 probes.

## TV's two errors (probed 2026-06-10, exact wordings)

**SHAPE** - the RHS cannot produce a tuple (anchored at statement start,
col 1):

> Cannot assign a variable to a tuple. The right side must be a function
> call or structure ("if", "switch", "for", "while") returning a tuple
> with the same number of elements.

TV emits an internal `variableType.itemType is not a function` crash
artifact ALONGSIDE the shape error (G001) - deliberately not replicated.

**COUNT** - the RHS produces a tuple of the wrong arity:

> Syntax error: The quantities of tuple elements on each side of the
> assignment operator do not match. The right side has N but the left
> side has M.

## Probe matrix (`pine-lint --tv` via lint-batch --diff, 2026-06-10)

All probes are `.pine` files in this directory; TV verdicts below; after
implementation our local output matches every row at the same position.

| probe | RHS shape | TV verdict |
|---|---|---|
| p01 | `[a, b] = close` (builtin variable) | SHAPE + artifact, 3:1 |
| p02 | `[a, b] = array.size(arr)` (scalar builtin call) | SHAPE + artifact, 4:1 |
| p03 | `[a, b, c] = f()` on a 2-tuple UDF | COUNT "right 2 left 3", 4:1 |
| p04 | `[a, b] = ta.macd(...)` (3-tuple builtin) | COUNT "right 3 left 2", 3:1 |
| p05 | `[a, b] = ta.vwap(close)` (scalar form of mixed-overload fn) | SHAPE + artifact, 3:1 |
| p06 | `[a,b,c,d] = request.security(sym, tf, ta.dmi(...))` | COUNT "right 3 left 4", 3:1 |
| p07 | `[a, b] = alert("x")` (void call) | SHAPE + artifact, 3:1 |
| p08 | `[a, b] = request.security(sym, tf, close)` (scalar passthrough) | SHAPE + artifact, 3:1 |
| p09 | `[a, b] = if ...` with scalar branch tails | SHAPE + artifact, 3:1 |
| p10 | `[a, b, c] = if ...` with 2-tuple branch tails | COUNT "right 2 left 3", 3:1 |

p05 is the load-bearing discovery: **TV resolves mixed scalar/tuple
overloads by the call's arguments.** `ta.vwap(close)` destructured is the
SHAPE error (scalar form), not a count mismatch against the tuple
overload. The discriminator is whether the call provides an argument for
a param that exists only in the tuple overload(s) (`stdev_mult` - the
reference: "If specified ... return a [vwap, upper_band, lower_band]
tuple", "The default is na, in which case the function returns a single
value").

## Implementation

`checker.ts` TupleDeclaration validation + `tupleInitArity` classifier
(+ `builtinCallTupleness` in `builtins.ts`):

- Classification is three-valued: `tuple(arities[])` / `scalar` /
  `unknown`, and **unknown disables both errors** - everything we cannot
  positively classify stays silent. The 51-FP first draft died by
  treating unclassifiable as scalar.
- `scalar`: literals, identifiers, operators, member/index access (none
  can produce a tuple in Pine - TV's own wording), calls resolved to
  scalar/void returns (UDF via the INV057 capture + inferred return,
  builtin via catalog overloads), structures whose branch tails are all
  scalar (p09).
- `tuple`: tuple literals, UDF/method shapes captured by INV057 (all
  arities of same-name overloads), builtin bracketed overload returns
  (args-aware for ta.vwap per p05), request.security/_lower_tf
  passthrough (recursion on the expression arg - scalar passes through
  too, p08), structures whose tails are all tuples (arity union).
- `unknown`: recovered calls (INV047), unresolvable callee chains
  (import aliases - #41's data gap), UDFs with unknown inferred returns
  (uncaptured body tails like for-loop values), structures mixing
  scalar/tuple tails (TV behavior unprobed).
- Bare tuple-literal RHS is excluded - already the parser's CE10156
  (INV049); emitting COUNT/SHAPE there would double-report.
- v6-gated (the catalog data backing the classifier is v6 - G004).

## Result

- 10/10 probes match TV's wording, count direction, and anchor.
- Corpus: zero changes across 1879 fixtures (the all-valid corpus cannot
  exercise this FN class - exactly the #48 mutation-testing blind spot;
  the probes are the negative coverage).
- Regression fixture:
  `packages/core/test/fixtures/regression/INV058-tuple-destructure-arity.pine`
  (9 asserted errors).

## Residual

- Reassignment (`[a, b] := f()`) goes through TupleDeclaration? No -
  tuple REASSIGNMENT is INV044's territory; the arity check currently
  covers declarations only. If TV applies the same errors to `:=`
  re-destructures, that is a separate (cheap) extension - unprobed.
- `pine-lint`'s variable-list output displays the WHOLE tuple string as
  each element's type for arity-mismatched builtin destructures
  (`a4: "[series float, series float, series float]"`) and
  `series <type>` for generic passthrough elements - the #18
  display-path quirk, not a validator issue.
