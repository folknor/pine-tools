# INV065 - shadow gate over-suppressed undefined member calls (CE10271 FN)

**Date:** 2026-06-19
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (validateCallExpression
`!signature` MemberExpression block; new module const `SCALAR_BASE_TYPES`)

## How it surfaced

#48 mutation harness. A full-pool dry-run (`mutation-run.mjs --seed 1
--fixtures 9999 --sites-per 6 --dry-run`, 18,978 mutants over all 697
both-clean fixtures, local side only) left 38 `local-accepts` mutants
(mutants TV would reject but our checker accepts): 16 `delete-decl`, 22
`typo-member`. The dry-run is free (no TV) and is the right gate before
spending TV budget - only `local-accepts` mutants can be survivors.

Triaging the 22 `typo-member` by the fixture's imports split them:
- **#41 import-shadow residual** (namespace bound to a library): fixtures
  importing `.../ta/N` (aliased or not) - `ta.*` members are library calls
  we cannot resolve. Out of scope, expected miss.
- **genuine FN (this INV):** 4 fixtures typo a member of a builtin namespace
  (`timeframe`, `ticker`, `str`) that is **not** imported but **is shadowed
  by a local scalar variable/parameter** of the same name.

## Symptom (false negative)

INV053 added CE10271 for `ns.member(...)` on builtin namespaces but skipped
whenever the root name was user-shadowed (`symbolTable.lookup(ns).line !==
0`) - reasoning that a shadow means members we cannot resolve. That gate is
too broad. When the shadow is a SCALAR, the call is still a CE10271:

```pine
//@version=6
indicator("x")
f(simple string timeframe) =>
    timeframe.changex(timeframe)   // TV CE10271, we were silent
```

Real corpus carriers (mutants, all v6, namespace shadowed by a string
param/var):
- `a98dae05…` `timeframe.changex` (param `simple string timeframe`)
- `c3dd7111…` `str.trimx` (param `series string str`)
- `e66311ac…` `ticker.heikinashix` (`var string ticker = … ticker.heikinashix(…)`)
- `ccacb463…` `timeframe.in_secondsx` (`string timeframe = input.timeframe(…)`)

## TV's resolution model (probes, `pine-lint --tv`, 2026-06-19)

`ns.member(args)` when `ns` is a value (shadowed or a plain variable) is a
METHOD call on the value; TV phrases the failure "Could not find **method**
or method reference" (vs "function or function reference" for a pure
namespace). It is valid iff the member resolves as (a) a builtin namespace
function `ns.member`, (b) a builtin method on the receiver's type
(collections only), or (c) a user-defined method named `member`.

| probe | script (key line) | TV verdict |
|---|---|---|
| p01 | `f(simple string timeframe) => timeframe.changex(timeframe)` | CE10271 `method` ref `timeframe.changex` |
| p02 | `… => timeframe.in_seconds(timeframe)` | clean (valid namespace fn through shadow) |
| p03 | `math = array.new<float>(0)` / `math.push(1.0)` | clean (real array method) |
| p04 | `math = array.new<float>(0)` / `math.pushx(1.0)` | CE10271 `method` ref `math.pushx` |
| p05 | `method changex(simple string s) => …` / `… timeframe.changex()` | clean (user method) |
| p06 | `f(float x) => x.abs()` | CE10271 `method` ref `x.abs` |
| p07 | `f(string s) => s.length()` | CE10271 `method` ref `s.length` |

p06/p07 are the keystone: **scalars carry NO builtin methods** (you cannot
call `math.abs`/`str.length` as `x.abs()`/`s.length()`). So a scalar shadow
calling an unknown member can only be valid via a user method - never a
builtin. p02 stays valid because `timeframe.in_seconds` resolves as the
namespace function (it never reaches the `!signature` branch). p05 stays
valid because the user method `changex` is in `declaredFunctionNames`.

All probes reached TV (TV *disagreed* with our pre-fix silence on
p01/p04/p06/p07), so the silence was a real FN, not an empty/crashed `--tv`.

## Fix

In the `!signature` MemberExpression branch, the user-shadow skip is relaxed
for scalar shadows. Flag when:
- root is user-shadowed AND the shadow symbol's base type is a scalar
  (`SCALAR_BASE_TYPES` = int/float/bool/string/color), AND
- the member name is NOT in `declaredFunctionNames` (no user method/function
  could legitimize it),

in addition to the existing guards (`KNOWN_NAMESPACE_PREFIXES.has(nsPath)`,
not imported, not a `NAMESPACE_PROPERTIES` member, not a
`GENERIC_FUNCTION_BASES` constructor). The message switches to "Could not
find **method** or method reference" for the scalar-shadow form to match TV.

FP-safety rests on p06/p07: a scalar genuinely has no builtin methods, so the
only escape hatches (namespace fn / user method) are both checked.

## Verification

- 7 probe files under `probes/`.
- 2 regression fixtures: `regression/INV065-shadowed-scalar-member`
  (timeframe.changex + str.trimx flagged), `regression/INV065-shadow-no-
  false-positive` (p02 + p03 + p05 combined, local == TV clean).
- 4 corpus mutants now caught, message matches TV (CE10271). Columns differ
  a few chars (TV anchors at the member, we at the call start - G005-class
  position noise); e66311ac's wording differs (TV "function" - it read
  `ticker` as the namespace mid-self-declaration - we say "method"); both
  flag CE10271.
- `regression-check.mjs`: **0 changes** over 1879 fixtures (no new FP).
- Full suite: 326 pass.

## Residual (still #41 / future)

Deliberate conservative skips, all FP-safe (we stay silent where TV flags):
- **Collection-typed shadow** (p04 `math.pushx`): array/matrix/map carry
  methods that are themselves catalog functions; resolving member-vs-typo
  needs the per-collection method set and would also have to honor
  user-defined methods on builtin types. Skipped for now.
- **Method call on a non-namespace scalar** (p06/p07 `x.abs()`,
  `s.length()`): the receiver name is not a builtin namespace, so
  `KNOWN_NAMESPACE_PREFIXES` excludes it. Catching these is the broader
  "validate all method calls" work, not the namespace-member slice.
- Import-alias members and UDT method calls (the original #41 residual).
