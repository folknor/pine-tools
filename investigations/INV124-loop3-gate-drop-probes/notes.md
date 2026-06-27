# INV124 - Loop 3 gate-drop TV probes (TODO #9)

Date: 2026-06-27

## Source

TODO #9, `reference/spec-9-udf-inference-foundation.md` Section 5.3 / Section 7
Loop 3. Loop 3 drops the two blanket reliability gates that compensate for the
old `series<float>` UDF guess (now replaced by the Loop 2 fixpoint, INV123):

- INV016's `isReliablyTyped` (union-arg check, `checker-calls.ts`) - skips any
  argument typed through a user variable or a UDF call.
- INV014's `describeNonConstArg` user-var/UDF conservatism (const-arg check) -
  returns null ("leave alone") for a UDF call or a bare-scalar user var.

Dropping these is only safe if it matches TV. The foundation requires the exact
gate-drop rule be pinned by `--tv` BEFORE the codex implement run (codex is
network-isolated and cannot run `--tv`). This is that probe round, run by the
orchestrator as a side-step.

## Method

Each probe is a minimal `.pine` script in this directory. Verdicts via
`pnpm run debug:compare -- <probe>` (local validator vs TradingView
`translate_light`), 2026-06-27. `tv-only` = TV flags, we are silent = a real
false negative the gate currently hides.

## Probes and TV verdicts (all `success` - TV genuinely answered)

### Probe A - const preserved through a const-returning UDF (TV ACCEPTS)

`probe-a-const-udf-accept.pine`:

```pine
//@version=6
indicator("probe a")
f() => 5
y = input.int(defval = f())
plot(y)
```

- local: 0 errors. TV: **0 errors (ACCEPT)**.
- A UDF returning a const literal IS const-eligible for a `const int`-required
  param. This CONSTRAINS the gate drop: provenance must PRESERVE const through a
  const-returning UDF call - any rule that flags this is a false positive on a
  script TV accepts. (Loop 1's qualifier-provenance already resolves `f() => 5`
  to `const int`; see INV122.)

### Probe C - series UDF return into a const-required param (TV REJECTS)

`probe-c-series-udf-into-const.pine`:

```pine
//@version=6
indicator("probe c")
f() => close
y = input.int(defval = f())
plot(y)
```

- local: 0 errors. TV: **1 error, tv-only** -
  `4:24 Cannot call "input.int" with argument "defval"="call "f" (series float)".
  An argument of "series float" type was used but a "const int" is expected.`
- The const-arg gate (INV014) drop positive: a UDF returning a non-const
  (`series`) value passed where `const` is required. We currently miss it.
- A vs C together are the disagreement WITNESS: TV accepts A and rejects C, so
  it is genuinely evaluating const-eligibility, not blank-accepting (G002
  caution satisfied).

### Probe B0 - string literal into int() (witness: both flag)

`probe-b0-literal-into-int.pine`:

```pine
//@version=6
indicator("probe b0")
x = int("hello")
plot(x)
```

- local: 1 error. TV: **1 error, same position/message** -
  `3:9 Cannot call "int" with argument "x"="hello". An argument of "literal
  string" type was used but a "simple int" is expected.`
- Witness that TV's int-arg type check is live and that our checker already
  catches the DIRECT literal case. The gap is only the through-UDF / through-var
  forms below.

### Probe B1 - non-numeric UDF return into int() (TV REJECTS)

`probe-b1-udf-into-int.pine`:

```pine
//@version=6
indicator("probe b1")
f(p) => p
x = int(f("hello"))
plot(x)
```

- local: 0 errors. TV: **1 error, tv-only** -
  `4:9 Cannot call "int" with argument "x"="call "f" (literal string)". An
  argument of "literal string" type was used but a "simple int" is expected.`
- The union-arg gate (INV016) drop positive for a DIRECT UDF call argument.
  `isReliablyTyped` returns false for a UDF call, so the check is skipped today.

### Probe B2 - through-variable non-numeric into int() (TV REJECTS)

`probe-b2-uservar-into-int.pine`:

```pine
//@version=6
indicator("probe b2")
f(p) => p
b = f("hello")
x = int(b)
plot(x)
```

- local: 0 errors. TV: **1 error, tv-only** -
  `5:9 Cannot call "int" with argument "x"="b". An argument of "const string"
  type was used but a "simple int" is expected.`
- The union-arg gate drop positive for a through-USER-VARIABLE argument: `b` is
  inferred `const string` (TV monomorphizes `f(p)=>p` on the string arg), passed
  where `simple int` is required. `isReliablyTyped` returns false for a user
  variable, so the check is skipped today.

## Conclusion for Loop 3

- Drop INV016's blanket `isReliablyTyped` skip and extend INV014's
  `describeNonConstArg` to UDF calls / grounded user vars, so C, B1, B2 are
  caught.
- The rule MUST preserve const through a const-returning UDF (Probe A), so
  `f() => 5` into a `const`-required param stays clean. Flagging A would be a
  false positive.
- All three new positives (C, B1, B2) are TV-confirmed here, dated, with the
  exact probe scripts retained, satisfying the methodology's `--tv` recording
  requirement for the new true positives Loop 3 will emit.
- TV reports the through-var type as `const string` (B2) and the direct-UDF type
  as `literal string` (B1); the Loop 2 fixpoint + Loop 1 provenance already
  ground these to `string` locally, so the data needed to catch them is present
  once the gates drop.

## Loop 3 landed local gate (2026-06-27)

Implementation removed the INV016 `isReliablyTyped` blanket skip and added the
INV014 UDF-call qualifier-provenance fallback in `checker-calls.ts`.

Local targeted fixtures added:

- `packages/core/test/fixtures/regression/INV124-probe-a-const-udf-accept.pine`
  stays clean.
- `packages/core/test/fixtures/regression/INV124-probe-c-series-udf-into-const.pine`
  emits one CE10123 with `series float` into `const int`.
- `packages/core/test/fixtures/regression/INV124-probe-b1-udf-into-int.pine`
  emits one CE10123 into `simple int`.
- `packages/core/test/fixtures/regression/INV124-probe-b2-uservar-into-int.pine`
  emits one CE10123 into `simple int`.

Local verification:

- `pnpm test` (tsc -p . + vitest): 13 files, 409 tests, pass.
- `pnpm run install:cli` then `node scripts/regression-check.mjs`: 1879
  fixtures checked, 0 changed fixtures, 0 new error appearances, 0 disappeared.
- `pnpm exec biome check ...`: pass.

## Loop 3 corpus delta + the union-gate FP it surfaced (2026-06-27, review pass)

The first implement-run measurement reported "0 new appearances" but had been
taken against a STALE installed `pine-lint` (the review re-ran
`pnpm run install:cli` BEFORE `lint:regression`, per spec Section 4). Against
the freshly installed Loop 3 CLI, `lint:regression` surfaced exactly ONE new
appearance - a union-gate (Brick 1) false positive:

- Fixture
  `fixtures/12f2c9e56837655c26d772203e8664126cad31830a6af0e6e26c66686e90abe4.pine`,
  line 449:
  `Cannot call "ta.crossover" with argument "source2"="sslDown". An argument of
  "series bool" type was used but a "simple int" is expected.`

`debug:compare` (`--tv`, 2026-06-27) verdict - TV is SILENT at 449:

```
=== tradingview (3 errors) ===
  358:40  ...operator and...series float...series bool...
  359:42  ...operator and...series float...series bool...
  370:1   "sslDown" is already defined
=== local-only (we flag, TV silent - 1) ===
  Cannot call "ta.crossover" ... "series bool" ... "simple int" ...
```

Root cause: `sslDown` is declared TWICE - `float sslDown = ...` (line 251) and
`bool sslDown = ta.crossover(...)` (line 370). TV reports the CE10095
redeclaration and resolves the later reference at line 449 to the FIRST (float)
declaration (a valid `ta.crossover` source, so TV is silent). Our symbol table
keeps the LAST (bool) declaration, infers `series bool`, and - with the
`isReliablyTyped` blanket gone - the union gate flags it. This is precisely the
"Loop 2 confidently infers a WRONG known scalar" FP vector the spec's Section
4.3 step 2 / Section 6 anticipated.

Narrowing fix (NOT a blanket revert, per Section 6): the validator now records
CE10095 redeclared names in `redeclaredNames`; `checkUnionArgs` skips an
argument that references a redeclared name (its base is untrustworthy because
the two channels disagree on which declaration wins). This restores parity at
449 while keeping every INV124 probe positive (B1/B2/C) intact, since those use
single, unambiguous declarations. Locked by
`packages/core/test/fixtures/regression/INV124-redeclared-uniongate-fp.pine`.

After the fix: `lint:regression` (Loop 3 CLI installed) reports 0 new
appearances, so the corpus delta is 0 net new positives and no snapshot refresh
is needed.
