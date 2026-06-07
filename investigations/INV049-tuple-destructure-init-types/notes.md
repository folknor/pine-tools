# INV049 - tuple destructure init types (if/switch expressions, bare literals)

## Origin

The last two unexplained bool-FP records in the 2026-06-07 inventory
(`failures-by-category.json`, commit 7f0e28d):

- `fixtures/909eb9bf…pine:15` - `Ternary condition must be bool, got
  series float` on `oiColorCond ? color.teal : color.red`, where
  `oiColorCond` comes from `[oiOpen, …, oiColorCond] = if … request.security(…,
  [open, high, low, close, close > close[1]], …) else [na, na, na, na,
  false]`. TV is clean on the whole file.
- `fixtures/b369d637…pine` - same shape but the destructure init is an
  imported library call (`[valid, _] = mlzigzag.find(…)`); that one is
  blocked on #41 (no import-alias member data) and NOT fixed here.

## Root cause

`inferTupleElementTypes` (checker.ts) only understood a `CallExpression`
init - `request.security` with a tuple expression arg, or a UDF with a
captured tuple return (INV010). For an `IfExpression` or
`SwitchExpression` init it returned no types, and
`defineTupleVariables` defaulted every element to `series<float>` - so
a destructured bool drew bool-condition FPs downstream.

## Probes (`probes/`, `pine-lint --tv` 2026-06-07)

| probe | shape | TV verdict | ours (before) |
|---|---|---|---|
| p01 | `[a, b] = if … request.security(…, [close, close > close[1]]) else [na, false]`, `b ? …` | clean | FP `Ternary condition must be bool, got series float` |
| p02 | `[a, b] = [close, true]`, `b ? …` | CE10156 `Syntax error at input "["` at 3:10 (the RHS `[`) | silent (FN) |
| p03 | `[a, b] = switch … => [close, true]` / `=> [na, false]`, `b ? …` | clean | FP, same as p01 |

p02 resolves INV046's deferred residual ("tuple-destructure RHS
literals … unprobed - probe before deciding"): only CALL providers are
valid on a destructure RHS, not bare literals.

All three TV runs returned `success:true`; p02's error proves the
probes reached TV (disagreed with our then-current local verdict).

## Fix

- **Checker** (`checker.ts`): `inferTupleElementTypes` now dispatches on
  the init expression - `ArrayExpression` (typed for recovery),
  `CallExpression` (unchanged), `IfExpression`/`SwitchExpression`
  (descend branch/arm tails via `branchTailTupleTypes`, which also
  follows nested tail `IfStatement`s). Branches merge per element
  preferring the first non-`na` type, since the default branch is
  typically `[na, na, false]` (same reasoning as `tailTupleExpr`'s
  consequent preference, INV030).
- **Parser** (`parser.ts` `tupleDestructuring`): a direct
  `ArrayExpression` init pushes TV's `Syntax error at input "["` at the
  RHS opener (`startLine`/`startColumn`), reported after the full tuple
  statement parses for the same backtracking-safety reason as INV044's
  `:=` error. The declaration is still returned so the checker types
  the elements for recovery.

Five `syntax/` fixtures used the now-flagged literal form as incidental
shorthand while testing LHS parsing behavior; their inits were
rewritten to calls (`makeTuple()` / `makeTuple2(…)`), preserving what
they test.

## Corpus effect (regression-check 2026-06-07)

- Disappeared: 30 records across 15 files - the targeted bool/ternary
  condition FPs plus downstream type-mismatch records that the
  mistyped elements had been feeding (`Operator … requires bool
  operands`, `Type mismatch: cannot apply …`).
- Appeared: 18 `Syntax error at input "["` records in 5 files - all
  bare-literal destructure inits, all in our own synthetic test
  fixtures swept into the corpus (no `//@version`, so their TV
  "verdicts" are vacuous; the form itself is probe-backed by p02).

## Fixture

`packages/core/test/fixtures/regression/INV049-tuple-destructure-init-types.pine`

## Residual

- `b369d637…`'s `if(valid)` FP remains - destructure from an imported
  library function; needs #41's member data. The honest interim fix
  (type such elements `unknown` rather than guessing `series<float>`)
  is a separate decision.
- Ternary inits (`[a, b] = cond ? […] : […]`) unprobed; tuples are not
  first-class values so the form is likely invalid like p02, but probe
  before flagging.
