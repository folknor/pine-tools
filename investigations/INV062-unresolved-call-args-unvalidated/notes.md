# INV062 - arguments of unresolvable calls were never validated

**Status: fixed 2026-06-11.** The FIRST real run of the #48 mutation-testing
harness (mutation-run.mjs, 86 mutants over 20 both-clean fixtures) produced
exactly one SURVIVOR - a mutant TV rejects and we accepted - and it pointed
at a structural validation hole, not a one-off.

## The survivor

Fixture `19b330212da3...` (TradingView's Zig Zag, both-clean), operator
`delete-decl`: the mutator removed the top-level declaration
`priceDiffInput = input.string(...)` whose only use sits inside
`ZigZagLib.Settings.new(..., priceDiffInput, ...)` - an import-alias member
call. TV: CE10272 `Undeclared identifier "priceDiffInput"`. Us: clean.

## Root cause

`validateCallExpression` returned early when no builtin signature resolved
(`if (!signature) { ...CE10271 handling... return; }`) - and the argument
EXPRESSION walk sat AFTER that return. So the arguments of every UDF call,
import-alias member call, and method call were completely unvalidated: no
undefined-variable check, no na-comparison check, no bool-context checks,
nothing. Builtin call args were fine (the walk ran for resolved signatures).

This is precisely the blind-spot class #48 predicted: the valid-code corpus
can never reveal it (valid code has no undefined variables to miss), and
every fixture/probe that exercised undefined-variable detection happened to
use builtin or top-level contexts.

## Probes (2026-06-11, `pine-lint --tv`, scripts in `probes/`)

- **p01** (UDF arg): `f(x) => x * 2` / `plot(f(missingVar))` ->
  `success:true`, CE10272 `Undeclared identifier "missingVar"` anchored at
  the identifier (4:8-17). We were silent before the fix.
- **p02** (alias arg): `import TradingView/ZigZag/7 as ZigZagLib` /
  `zz = ZigZagLib.newInstance(missingVar)` -> `success:true` but TV's error
  list is an internal crash: `TypeError: e.equals is not a function` (no
  code, no position). TV still REJECTS the script, it just trips over the
  undefined identifier while resolving the imported signature. The full
  mutant (the same shape with more context) drew a clean CE10272, so the
  crash is a TV quirk of the minimal form, not a different verdict.

## Fix

Moved the argument-expression walk in `validateCallExpression` ABOVE
signature resolution, so it runs for every call. Signature-dependent checks
(`validateFunctionArguments`) still run only for resolved builtins.

## Corpus effect

+605 error records across 107 fixtures, all argument expressions of
previously-unwalked calls. Cross-checked against the TV inventory:

- **0 on both-clean fixtures** - the widened walk contradicts TV nowhere.
- 53 on TV-erroring v6 files - all PAST TV's stop point (post-stop bucket
  715 -> 768; the confirmable window is unchanged at 46/3/32).
- 552 on legacy v4/v5 files - dominated by bare v4 builtins (`tickerid`
  et al, 462 records are did-you-mean variants) inside `security(...)`
  calls, whose callee is not in the v6 catalog so its args were never
  walked. Flagging bare v4 names on legacy scripts is existing policy
  (Known Limitations: legacy scripts get v6 symbol resolution).

Baseline 15236 -> 15841, re-snapshotted. find-real-failures re-run
(2026-06-11): 46 local-only / 3 tv-only / 32 same-pos - identical to the
pre-change measurement.

## Fixtures

`regression/INV062-unresolved-call-args.pine` pins both shapes (UDF arg +
alias arg, 2 errors, count-enforced). 313 tests green.

## Residual

- TV's p02 internal TypeError is a TV-side anomaly (their checker crashes
  instead of reporting CE10272 on the minimal alias-arg form). Point-in-time
  observation; nothing for us to act on.
- The 53 post-stop records on mangled v6 files include cascade-adjacent
  noise of the INV047 class (e.g. switch-arm bodies broken to column 1
  referencing for-scope variables). Same residue family as the existing
  undefined-variable stragglers (INV031); no new mechanism.
