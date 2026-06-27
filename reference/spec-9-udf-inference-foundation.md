# Foundation: robust UDF-return inference (TODO #9) - the substrate for three spec loops

## 0. What this document is, and how the spec loops use it

This is the **design foundation** for completing TODO #9's remaining core. It is
NOT an implementation spec. It is the shared substrate that three separate
spec-loop runs draw from: each loop's step-1 spec writer is pointed at the
relevant Piece below (Section 6) plus this whole document for context, and
authors its own implementation spec from it per
`reference/technical-implementation-spec.md`.

The orchestration procedure (`reference/orchestrate.md`) forbids enriching a
step's prompt with conversation context - the documents carry all context by
design. This document is therefore the sanctioned channel for the analysis that
justifies the work: the real bug, why four prior attempts reverted, the three
foundational pieces, the TV-parity facts already pinned, and the constraints the
work is judged against. A spec writer who reads only this and the contract has
everything.

**The goal: three spec loops, one landed commit each.** Section 7 gives the
loop -> piece decomposition and the gate for each.

## 1. The goal in one sentence

Make user-defined-function (UDF) return-type inference reliable enough to drop
the two blanket reliability gates - INV016's `isReliablyTyped` and INV014's
`describeNonConstArg` user-var/UDF conservatism - which today SKIP any argument
typed through a user variable or a UDF call, so the const-arg (INV014) and
union-arg (INV016) CE10123 checks catch the real violations that flow through a
variable, WITHOUT introducing one new false positive.

## 2. The real bug: call-site-insensitive return inference

`UnifiedPineValidator.inferFunctionReturnType` (`checker.ts:1835`) computes a
UDF's return type ONCE, at symbol-registration time, independent of how the
function is called. The single root of the unreliability is the untyped-param
binding at **checker.ts:1865**: an untyped param is bound to a hardcoded
`series<float>` guess. (A parallel, identical guess lives in the tuple path -
see Piece 3.)

The consequence is a call-site-insensitive return type. Worked example, probed
2026-06-26 (Section 5, the corrected B0):

```pine
//@version=6
indicator("x")
f(p) => p
plot(nz(f("hello")))
```

`f(p) => p` returns its untyped param `p`. Bound to the `series<float>` guess,
`f` is typed `f() -> series<float>` for ALL call sites. So `f("hello")` is
typed `series<float>` (not `string`), `nz(series<float>)` is `series float`,
and `plot(...)` accepts it. **We emit no error. TV flags CE10123 at `nz`** (a
`literal string` was passed where `simple int` is expected). This is the
false-negative class #9 exists to close: the violation is invisible because the
guess masks the real argument type.

### 2.1 Two reasons the bug is subtle (both must be in the spec writer's model)

- **The param-less UDF is a red herring.** A UDF with NO untyped params (e.g.
  `g() => close > open`) infers correctly from its body - `series bool` - because
  the `series<float>` guess never fires. Our checker AND TV both already handle
  `plot(nz(g()))` identically (CE10123 at `plot`, `nz(bool)` coerced to
  `series color`). Any probe that uses a param-less UDF does NOT exercise the
  bug. The bug needs an **untyped param used in the return**, called with a
  non-float argument. (The earlier INV121 B0 probes were all param-less and so
  mis-targeted; see Section 5.)

- **A dual param-binding path.** The displayed inference for `f(p) => p` reads
  `undetermined type` (from the SemanticAnalyzer path, per INV114 Fix 2), while
  `inferFunctionReturnType` at checker.ts:1865 still binds `series<float>`. The
  const-arg / union-arg checks read the **checker.ts type path** (via
  `inferExpressionType`), NOT the display path. The spec writer MUST identify
  which path feeds each consumer and reconcile them; "the display says
  undetermined" does not mean the checker sees undetermined.

## 3. Why four prior attempts reverted - the necessary-set argument

Every prior attempt at this area substituted a LOCAL or STRUCTURAL proxy for
actual whole-program type/qualifier propagation, and each reverted because the
proxy did not match TV's real criterion - too aggressive produced false
positives, too suppressive produced false negatives:

- **INV063** typed the drawing annotations (a downstream consumer) while the
  inference under it still guessed `series<float>` -> a line-returning UDF
  mis-typed `series<float>` -> **58 corpus FPs** on `lineN := new_level(...)`
  reassignments. Reverted.
- **INV120 (two attempts)** used ancestor / context suppression heuristics as a
  stand-in for a real qualifier model in the consistency-warning channel ->
  **+5, then +11 tvOnly FNs**. Both reverted.
- **INV066** dropped a gate (undefined method-call receiver) without the
  receiver resolution beneath it -> **247 corpus FPs**. Reverted before commit.
- **INV119** used a structural proxy (user-global-index) for real data-flow
  history -> refuted on re-measurement, **+4 FPs**.

The shared lesson: the cheap proxies are exhausted. The demand for the
foundation is proven by the repeated failure of everything cheaper. The three
pieces in Section 6 are the necessary set - each closes a specific revert cause.
Grounding the guess to `unknown` alone (the FP-safe floor) does NOT solve #9: it
trades the FP direction for the FN direction (everything becomes `unknown` and
the checks skip), so the through-variable violations stay uncaught. Reliability,
not just safety, is the bar.

## 4. The two gates that compensate for the bad inference (the things being dropped)

Both live in `packages/core/src/analyzer/checker-calls.ts`. Line numbers below
are approximate (from the prior survey, independently confirmed accurate by
review); the spec writer reads the actual code.

- **INV016 - `isReliablyTyped(v, expr)`** (checker-calls.ts ~1284-1319), called
  by `checkUnionArgs` (~1365). Returns `true` ONLY for literals,
  binary/unary expressions, built-in variables/constants/members, and built-in
  calls. A **user variable** and a **UDF call** return `false` -> the union-arg
  check skips the argument. This is why `nz(<UDF-returning-bool>)` /
  `int(someUserVar)` real CE10123s are missed.

- **INV014 - `describeNonConstArg(v, expr, version)`** (checker-calls.ts
  ~1539-1628), called by `checkConstArgs` (~1437). Returns `null` ("leave it
  alone") for a UDF call (`resolveCallReturnRaw` only knows the builtin catalog)
  and for a user variable not already `series<...>`/`input<...>` qualified (the
  INV040 branch). So a UDF call or a bare-scalar user var passed to a
  const-required param is never flagged, even when TV rejects it.

## 5. TV-parity facts already pinned (and what still must be probed)

The methodology requires every new true positive to be `--tv`-backed with the
exact script and TV's dated verdict, recorded in an INV. codex (the implementer)
cannot run `--tv`, so any verdict a spec relies on must ALREADY be recorded
before that loop's step-4 implement run; the orchestrator produces missing
verdicts via a side-step BEFORE step 4.

### 5.1 Verified (probed 2026-06-26, `pine-lint --tv`, all `success:true`)

- **The FN canary** (`investigations/INV121-.../probe-param-dependent.pine`):
  `f(p) => p` / `plot(nz(f("hello")))`. **TV: CE10123** at line 4, the `nz`
  call - `call "f" (literal string)` where `simple int` is expected. **We: no
  error** (the `series<float>` guess masks the string). A genuine disagreement
  (we accept, TV rejects), which also proves TV answered rather than returning an
  empty/fallback result. This is the load-bearing positive that justifies the
  whole effort.

- **The param-less control** (`probe-p2-p3.pine`): `g() => close > open` /
  `plot(nz(g()))` and the through-var form `b = g()` / `plot(nz(b))`. **Both we
  AND TV flag CE10123 at `plot`** (`nz(bool)` -> `series color`, plot wants a
  numeric). No disagreement - this confirms param-less UDFs are already handled
  and are NOT the bug (Section 2.1).

### 5.2 The earlier B0 probes were mis-targeted

The INV121 notes record P1-P5 as the B0 round, but P1-P5 use param-less UDFs and
so do not exercise the call-site-insensitivity bug. INV121 must be corrected: its
"B0" framing is superseded by 5.1's param-dependent canary. A spec writer must
NOT build a rule on the param-less probes alone.

### 5.3 Probes still REQUIRED before the gate-drop loop (Loop 3)

These pin the exact gate-drop rule and must be run as orchestrator side-steps and
recorded (dated, with output) BEFORE Loop 3's step-4 implement run:

- **Const-eligibility through a UDF**: `f() => 5` / `y = input.int(defval = f())`.
  Earlier recorded as ACCEPTED by TV (a UDF returning a const literal IS
  const-eligible). Re-confirm with a disagreement witness. This CONSTRAINS
  Piece 1: provenance must **preserve const** through a const-returning UDF call,
  not floor it at simple. (Any rule that flags this is a false positive on a
  script TV accepts.)
- **Direct user-var / UDF into a union param** (the shape Loop 3's union-gate
  drop actually targets, distinct from the `nz`-then-`plot` shape): e.g.
  `int(f(close))` and `b = f(close)` / `int(b)` where `f`'s return is provably
  non-numeric. Confirm TV flags at the `int(...)` call itself.
- **Direct UDF/user-var into a const-required param** that TV rejects (a positive
  for the const-arg gate drop), if one exists beyond the const-eligible case.

## 6. The three foundational pieces (each closes a revert cause)

### Piece 1 - Qualifier-provenance in the type model

Today `mapToPineType` (builtins.ts ~204-226) collapses `const int`, `input int`,
and `simple int` ALL to the bare base `"int"`; literals infer bare bases. The
checker literally cannot see a value's qualifier. The const-arg gate (INV014)
therefore CANNOT be dropped without false positives - there is no qualifier to
test.

The work: give `PineType` (or a parallel provenance channel) the qualifier as a
first-class, inspectable property - `{ base, qualifier }` with qualifier in the
lattice `series > simple > input > const` (the order already used at
checker-calls.ts ~1460). This is the change that makes the const-arg gate drop
**expressible**.

The hard constraint, set by the const-eligibility fact (5.3): provenance must
**preserve const through a UDF call** when the UDF returns a const literal -
`f() => 5` stays const-eligible where `const int` is required. (The earlier
spec's "a UDF return is never const / floors at simple" assertion is BACKWARDS
and must not be reproduced.) A UDF return that is genuinely non-const must render
its real qualifier; a const-folded one must stay const.

This piece is FP-neutral on its own: it widens what the type system can express
and audits the consumers, without yet changing any verdict. It lands green as a
coherent type-model change with a consumer audit; zero corpus change is the
expected result.

The Data-vs-Syntax split holds: no language-fact table moves into the checker.
Qualifiers on builtin returns come from the data (pine-data); UDF return
qualifiers are derived structurally from the builtin returns the body grounds out
in.

### Piece 2 - A correctly-timed, identity-keyed, monotone call-graph fixpoint

Replace the `series<float>` guess at checker.ts:1865 with call-site-sensitive,
grounded inference: bind an untyped param to the join of the argument types
actually passed at every call site; ground a param-dependent return leaf to
`unknown` (never a wrong scalar) where no call-site type resolves. `unknown`
return == "inference could not determine it," never a guess.

This is the piece that makes the inference RELIABLE (not merely safe), so the
gates can drop and the through-variable violations get caught. It directly clears
the INV063 line-UDF FP class (those UDFs infer `unknown`/their real base, not
`series<float>`) and unblocks Item 4 WITHOUT doing Item 4.

It must resolve the three defects the prior design carried (review findings
4/5/6):

- **Timing (finding 4):** the call-site profile must be built AFTER symbols are
  registered, not in the early pre-scan, or normal call-site args (user vars,
  locals) profile as `unknown` because their symbols do not yet exist.
- **Monotonicity (finding 5):** the fixpoint must be internally consistent -
  resolve the pass-0-starts-unknown vs unknown-is-absorbing contradiction. Joins
  over the finite lattice (4 qualifiers x finite base set) must be monotone so the
  fixpoint provably converges; the iteration cap is only a mutual-recursion guard,
  and args unresolved at the cap stay `unknown` (conservative), never guessed.
- **Identity keying (finding 6):** profiles must be keyed by declaration /
  signature identity, NOT bare function name, so overloads and
  function/method-name collisions do not corrupt the profile. (Existing call
  validation already skips method-shared names for exactly this reason -
  checker-calls.ts ~76.) Where identity is ambiguous, stay lenient.

It must also union ALL return points (every `ReturnStatement` value plus the
implicit tail), not just the first (checker.ts ~1886-1901 takes only the first);
mixed-base branches join to `unknown`. The cache isolation at checker.ts:1850-1851
is load-bearing (INV005) and stays.

This piece changes corpus-wide inference output; its gate is the full regression
+ FP/FN sweep, not a local fixture. It is FP-reducing/neutral (grounding a wrong
`series<float>` to a correct base or to `unknown` only relaxes or corrects checks).

### Piece 3 - The unified tuple path

`inferUdfTupleReturnTypes` (checker-tuples.ts ~453) carries the VERBATIM
duplicate of the bad guess at **checker-tuples.ts:473** (untyped param ->
`series<float>`), plus a related tuple-merge default at
**checker-tuples.ts:420** (`pick ?? "series<float>"`). Tuple destructuring feeds
variables and downstream checks the same way the scalar path does, so it must get
the same grounded, call-site-sensitive treatment - not a forgotten copy
(finding 7). "Unified" means the scalar and tuple paths share one grounding rule.

## 7. The three-loop decomposition (the goal)

The orchestrator derives three work items from this foundation, processed
serially, one commit each, tree green at every boundary (`pnpm test` +
`pnpm run lint:regression` green between items).

- **Loop 1 - Piece 1 (qualifier-provenance).** Lays the type-model foundation.
  FP-neutral; expected zero corpus change. Gate: suite + regression green; zero
  new error appearances; the const-eligibility constraint encoded (`f() => 5`
  into `input.int(defval=)` stays clean once Piece 1's qualifier exists, even
  before the gates drop).

- **Loop 2 - Piece 2 (the fixpoint) + Piece 3 (tuple unification).** The
  inference rewrite, both paths together. Changes corpus output. Gate: suite +
  regression green; ZERO new error appearances; every disappearance a known FP
  fixed (the INV063 line-UDF / binary-op FPs do not reappear); the warning-channel
  tvOnly baseline (currently 7) is unperturbed; the INV063 carriers compare clean
  (`debug:compare`), proving the Item-4 unblock without doing Item 4.

- **Loop 3 - drop the INV014 and INV016 gates (the payoff).** Now that
  provenance + grounded inference make the types trustworthy, remove
  `isReliablyTyped`'s blanket skip and extend `describeNonConstArg` to UDF
  calls / grounded user vars, per the rules the 5.3 probes fix. Gate: every new
  CE10123 appearance is a named, TV-confirmed true positive (recorded dated in the
  INV); ZERO TV-silent new appearances (those are FPs -> revert/narrow); suite +
  regression green. A gate that provably cannot drop without an FP after narrowing
  is recorded as a documented blocked residual (the FindST pattern), not forced.

Loop 3 depends on Loops 1+2. The 5.3 probe round is an orchestrator side-step run
BEFORE Loop 3's step-4 implement (codex cannot run `--tv`).

## 8. Constraints and non-negotiables

- **TV is the authority for v6 validity; TV silence is evidence, not authority.**
  Every new true positive is `--tv`-probe-backed and recorded in a new INV with
  the exact `.pine` and TV's dated output (with a disagreement witness so an empty
  result is not mistaken for acceptance - the G002 caution).
- **Zero new false positives** is the decisive corpus gate. Named, TV-confirmed
  false-negative fixes are the only new error appearances allowed.
- **Reliability, not just safety.** Grounding everything to `unknown` is not a
  solution; it must catch the through-variable violations (Section 3).
- **Const-preservation** through const-returning UDFs (Section 6, Piece 1) - the
  one rule the earlier design had backwards.
- **Data-vs-Syntax split** holds: no language-fact table enters the checker.
- The `inferFunctionReturnType` cache isolation (INV005) is load-bearing and
  stays.

## 9. Explicitly out of scope (named, not deferred)

- **Item 4 / INV063** - typing `line`/`label`/`box`/`table`/UDT annotations in
  `mapToPineType`. This foundation makes the inference that BLOCKED Item 4
  correct; Item 4 is separate, after these three loops.
- **Consistency warnings (CW10002/3/4)** - a different channel
  (SemanticAnalyzer). The fixpoint must not perturb the warning sweep (tvOnly=7),
  but it changes none of that logic. The typed-param call-site framing for the
  warning channel was already refuted (it fixes none of the live #61 warning FPs).
- **Library data-flow history (#61 Phase 2)** - history-dependence through
  reassigned library-tainted globals; not a type-inference base/qualifier problem.

## 10. Pointers

- Code: checker.ts:1835 / 1863-1865 / 1886-1901 (scalar inference);
  checker-tuples.ts:453 / 420 / 473 (tuple inference);
  builtins.ts:185 / 204-226 (mapToPineType, qualifier collapse, drawing-types
  unmapped); checker-calls.ts (the two gates - confirm line numbers at
  implementation).
- Investigations: INV005 (cache isolation), INV014 (const-arg gate), INV016
  (union-arg gate), INV040 (series/input user-var branch), INV063 (the 58-FP
  canary + the Item-4 block), INV114 (the dual param-binding path / undetermined),
  INV120/INV066/INV119 (the reverted proxy attempts).
