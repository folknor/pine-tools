# INV123 - UDF call graph fixpoint

Date: 2026-06-27

## Summary

**Source:** TODO #9 and `reference/spec-9-udf-inference-foundation.md` Piece 2
(the call-graph fixpoint) and Piece 3 (the unified tuple path). Loop 2 of TODO #9
replaces the checker-side untyped UDF parameter guess (`series<float>`) with a
call-graph fixpoint. The fixpoint binds each untyped parameter to the join of the
argument types passed at resolvable call sites. Unresolved or conflicting call
sites ground to `unknown`, not to a scalar guess.

This investigation, together with the implementing commit (the durable record in
git history), documents the implementation:

- `checker-udf-grounding.ts` owns identity keys, `joinPineType`,
  `defineParamsWithBindings`, and scalar return leaf joining.
- `checker-udf-fixpoint.ts` runs before the main validation pass, under an
  isolated symbol scope and expression cache.
- `checker.ts` stores `udfParamBindings`, runs the fixpoint, and consumes those
  bindings when freezing UDF and method symbol return types.
- `checker-tuples.ts` uses the same parameter binding helper and grounds missing
  tuple elements to `unknown`.

## Design Notes

The fixpoint stores only parameter bindings. It does not store final return
types. The main pass still computes the frozen symbol return type through the
same grounded scalar return helper used by the fixpoint, which avoids two
independent return-type answers.

UDF identities are keyed by name, kind, and ordered type-annotation signature.
Same-name scalar overloads are treated conservatively on the consumer side:
their frozen bare-name return is `unknown`, since the existing call-expression
consumer is not identity-aware.

The scalar return helper joins every explicit `return` found in the body and the
implicit tail value. For a trailing `if`, it descends both branch tails. The join
keeps `na` as bottom, widens int/float to float, promotes bare to series when
needed, and returns `unknown` for incompatible bases.

## Implementation Findings

The first implementation isolated `expressionTypes` for each fixpoint round, but
not for the initial seed pass that registered top-level variables. That let a
top-level initializer such as `x = f("hello")` cache the call as `unknown`
before the fixpoint had published `f`'s return type. The final implementation
sets a fresh expression cache immediately after entering the throwaway fixpoint
scope, then still resets the cache at the start of every round.

The fixpoint does not populate `udfBodyRecords`. That registry is for Loop 1
qualifier provenance. Eagerly populating it here would duplicate records before
the main pass and break `udfCallProvenance`'s single-record trust condition.

## Fixtures

Added:

- `packages/core/test/fixtures/regression/INV123-udf-param-grounded.pine`
- `packages/core/test/fixtures/regression/INV123-udf-multi-return-union.pine`
- `packages/core/test/fixtures/regression/INV123-udf-tuple-grounded.pine`
- `packages/core/test/fixtures/regression/INV123-paramless-control.pine`
- `packages/core/test/udf-fixpoint.test.ts`

The unit test directly asserts the base-type flips that Loop 2 delivers:

- `f(p) => p`, called as `f("hello")`, infers `string`.
- mixed string/int branch tails infer `unknown`.
- int/float branch tails infer `float`.
- tuple destructuring from `pair(p) => [p, close > open]`, called with a string,
  binds the first element as `string` and the second as `series<bool>`.

## Review Corrections

A post-implementation review against the spec found and fixed two items:

1. Diagnostic leak (correctness). `inferExpressionType` is not pure: its
   MemberExpression case calls `addError` (CE10272 "Undeclared identifier") for a
   known-namespace member with an undeclared property. The fixpoint re-infers UDF
   bodies and call-site args many times under provisional bindings, so a broken
   member access inside a UDF body or argument would push that error repeatedly
   and the main pass would push it again, double-reporting. Fixed in `validate()`
   by snapshotting `this.errors.length` before `resolveUdfParamBindings` and
   truncating back after, extending the INV005 isolate-and-restore discipline to
   the errors axis (the fixpoint already isolated the scope and the expression
   cache, but not diagnostics).

2. Scalar tail switch/if-expression descent (spec Section 3.1). The first cut of
   `tailScalarTypes` descended a trailing `IfStatement` arm-by-arm but delegated a
   trailing `SwitchExpression` or `IfExpression` (as an expression statement) to
   `inferExpressionType`, which uses the first-arm rule (`cases[0].result` /
   consequent tail). That is exactly defect 2 for the switch/if-expression shapes:
   mixed-base arms collapse to the first arm instead of unioning to `unknown`.
   Fixed with `tailExprScalarTypes`, which descends switch cases and if-expression
   arms and joins their leaves, mirroring the tuple path's
   `tupleInitElementTypes`/`branchTailTupleTypes`. A unit test (`unions trailing
   switch arms instead of taking the first arm`) locks it: int/float switch arms
   widen to `float`, which first-arm-only inference would have reported as `int`.

## Measurement

Baseline before code changes:

- `node scripts/snapshot-local-lint.mjs`
- Result: 1879 fixtures, 622 fixtures with errors, 16063 total error records.
- `node scripts/find-real-failures.mjs --concurrency 4`
- Result: 748 v6 fixtures scanned, but all 748 TV responses were unparseable.
  The printed local-only and tv-only counts were both 0, but they are not a
  usable TV parity measurement because TV did not provide parseable verdicts.
- `node scripts/categorize-failures.mjs`
- Result: local-only 0 categories, tv-only 0 categories, based on the unusable
  TV inventory above.

Verification after implementation:

- `./node_modules/.bin/tsc -p . --pretty false`: passed.
- `./node_modules/.bin/vitest run packages/core/test/udf-fixpoint.test.ts`:
  passed, 3 tests.
- `./node_modules/.bin/tsc -p . && cp pine-data/v6/*.json dist/pine-data/v6/ &&
  chmod +x dist/packages/cli/src/cli.js && ./node_modules/.bin/vitest run`:
  passed, 13 files, 403 tests.
- `node scripts/regression-check.mjs --concurrency 4`: passed, 1879 fixtures,
  0 changed fixtures, 0 new error appearances.
- `node scripts/regression-check.mjs`: passed, 1879 fixtures, 0 changed
  fixtures, 0 new error appearances.

Post-change ledger:

- `node scripts/snapshot-local-lint.mjs`
- Result: 1879 fixtures, 622 fixtures with errors, 16063 total error records.
- `node scripts/find-real-failures.mjs --concurrency 4`
- Result: same TV measurement problem as baseline. All 748 TV responses were
  unparseable.
- `node scripts/categorize-failures.mjs`
- Result: local-only 0 categories, tv-only 0 categories, based on the unusable
  TV inventory above.

`pnpm` itself failed in this sandbox with `[ERROR] unable to open database file`,
so the equivalent direct Node and local binary commands were used. `node
scripts/install-cli.js` also failed because it shells out to `pnpm`.

## Authoritative landed measurement (orchestrator, 2026-06-27)

The "0 changed fixtures" figures above were codex's pre-review measurement (taken
before the two Review Corrections landed, via direct-binary equivalents because
`pnpm` was broken in its sandbox). The authoritative measurement, taken in the
main environment AFTER the review fixes, with a working `pnpm`:

- `pnpm run check`: clean (after `biome check --write` on the review-touched
  files, which the reviewer could not run).
- `pnpm test`: passed, 13 files, 404 tests (the +1 over codex's 403 is the
  review's switch-arm union test).
- `pnpm run install:cli` then `pnpm run lint:regression`: 1879 fixtures,
  **2 fixtures changed, 0 new error appearances, 6 disappeared errors** (all 6
  the `series<float>` guess class this loop removes). The non-zero delta vs
  codex's run is the review's `tailExprScalarTypes` switch/if-expression tail
  descent, which grounds the carriers below.

## TV Results (orchestrator, 2026-06-27, `pnpm run debug:compare`)

The 6 disappearances were `--tv`-verified to be false positives this loop
correctly removed (or unverifiable post-stop cascade), confirming the Item-4
unblock without doing Item 4:

- `fixtures/7d05f1fa5c26ec6f8c281175f208f523ed40cb0fd3a1bc2ec8fa4b4f5c774f8d.pine`
  (the INV063-class carrier): local previously emitted 4 `Cannot assign a value
  of the "series float" type to ... "const bool"` errors at lines 753/803/881/931
  (`isHighLast`/`isHighLast2`). After grounding, those are GONE. **TV: 0 errors**
  (plus 10 warnings, which prove TV genuinely answered rather than returning an
  empty/fallback result - the G002 caution). So TV is silent at those lines: the
  4 were false positives. The remaining local-only errors on this file (`htf_c`
  undefined; the 1951/1963 `?:` series-bool/series-int) are pre-existing and
  unrelated (no new appearances introduced by this loop).
- `fixtures/7587a4c902938c3b42c4cb2272cd50a19077cf072f6fe7cfe301be71626b540b.pine`:
  the 2 disappearances at 1193-1194 (`series float` into a `const color` ternary)
  are far past TV's stop point - TV halts at the 302:80 multiline-string lexer
  error and reports only that 1 error, so it has no verdict beyond line 302
  (INV025 post-stop cascade). Their disappearance is benign cascade-noise
  reduction, not a confirmable regression.

Net: 0 new error appearances, every disappearance a confirmed FP or unverifiable
post-stop cascade. The corpus-wide `lint:failures`/`lint:categorize` TV inventory
remains a separate periodic re-baseline (it was unparseable in codex's sandbox
and is not a per-commit gate).
