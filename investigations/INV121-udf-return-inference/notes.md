# INV121 - UDF-return inference reliability (the B0 probe record for #9 Item 3)

**Date:** 2026-06-26
**Status:** probe record for #9. NOTE: the original "B0" framing here used
param-less UDFs, which do NOT exercise the call-site-insensitivity bug; it is
superseded by the param-dependent canary recorded below (probed 2026-06-26). The
inference rewrite that this probe round justified landed as Loop 1/2/3 - see
INV122 (qualifier provenance), INV123 (call-graph fixpoint), and INV124 (the
gate-drop probes + landed gate removal).
**Source:** TODO #9 (robust UDF-return inference -> drop INV014/INV016 gates);
INV063 (the 58-FP `series<float>` guess).

## The param-dependent canary (the corrected B0, `pine-lint --tv`, 2026-06-26, `success:true`)

The B0 probes below (P1-P5) are all param-LESS, so they do not exercise the real
bug: call-site-insensitive return inference. A UDF with no untyped params infers
correctly from its body, so the `series<float>` guess never fires. The bug needs
an UNTYPED PARAM used in the return, called with a non-float argument. The
corrected canary (`probe-param-dependent.pine`):

```pine
//@version=6
indicator("x")
f(p) => p
plot(nz(f("hello")))
```

`f(p) => p` returns its untyped param `p`. Bound to the old `series<float>`
guess, `f` typed `f() -> series<float>` for ALL call sites, so `f("hello")` was
`series<float>` (not `string`), `nz(...)` `series float`, and `plot(...)`
accepted it. **TV: CE10123 at line 4 (the `nz` call)** - a `literal string` was
passed where `simple int` is expected. **We (before Loop 2): no error** - the
guess masked the real arg type. A genuine we-accept / TV-rejects disagreement,
which also proves TV answered rather than returning an empty/fallback result.
This is the load-bearing false-negative that justified the whole #9 inference
rewrite; the same through-UDF class is re-probed with full verdicts in INV124
(B1 `int(f("hello"))`, B2 `b = f("hello")` / `int(b)`).

The param-less control (`probe-p2-p3.pine`): `g() => close > open` /
`plot(nz(g()))` and the through-var `b = g()` / `plot(nz(b))`. Both we AND TV
flag CE10123 at `plot` (`nz(bool)` -> `series color`, plot wants numeric) - no
disagreement, confirming param-less UDFs were already handled and are NOT the bug.

## Why

`inferFunctionReturnType` (checker.ts ~1863) binds untyped UDF params to a
hardcoded `series<float>` guess. That guess is wrong (INV063: a line-returning
UDF mis-typed `series<float>`, 58 corpus FPs) and is exactly what INV014's
const-arg gate (`describeNonConstArg` returns null for UDF calls) and INV016's
union-arg gate (`isReliablyTyped` trusts only builtins) compensate for. Item 3
rebuilds inference to ground param-dependent leaves to `unknown` (not a wrong
scalar), then drops the gates so violations flowing through a UDF call / user var
are caught. These probes pin TV's actual verdicts so the dropped-gate rules match
TV, not a guess.

## B0 probes (`pine-lint --tv`, 2026-06-26, main session, all `success:true`)

| probe | script | TV verdict |
|---|---|---|
| P1 | `f() => 5` / `y = input.int(defval = f())` | **ACCEPTS** (0 errors) - a UDF returning a const literal IS accepted where `const int` is required. So a UDF call CAN be const; B2's const-arg rule must treat a UDF-returning-const-literal as const, NOT flag it. |
| P2 | `g() => close > open` / `plot(nz(g()))` | **CE10123** at the `plot`: `nz(g())` is `series color`, `plot` expects `simple int`. TV flags the bool-UDF-return flowing through `nz` into a numeric context. |
| P3 | `h() => close > open` / `b = h()` / `plot(nz(b))` | **CE10123**, same as P2 - the violation is caught even when the UDF result flows THROUGH a user var `b`. This is the value of dropping INV014/INV016's "skip user-var/UDF-typed args" gates. |
| P4 | `s() => syminfo.tickerid` / `z = nz(s())` | **ACCEPTS** (0 errors) - a simple-string UDF return into `nz` is not flagged (nz accepts it). |
| P5 | `k() => 5` / `plot(int(k()))` | (re-run at implementation) int-literal UDF return into `int()` - expected clean (in-set). |

(P2's `nz(bool) -> series color` is TV's own typing quirk; the load-bearing fact
is that TV FLAGS it, at the downstream `plot`, both directly (P2) and through a
var (P3).)

## Consequence for the spec

- B1 (inference rewrite) must make a UDF returning `close > open` infer
  `series bool` (so `nz()`/`plot()` downstream see the real type), and ground a
  param-dependent leaf to `unknown` (not `series<float>`) so INV063's carrier and
  similar do not regress.
- B2 (const-arg gate drop): a UDF call is const-eligible (P1). Drop INV014's
  blanket UDF-call skip but keep `unknown` -> lenient.
- B3 (union-arg gate drop): the P2/P3 bool-into-numeric cases are the new true
  positives; keep `unknown` lenient so no FP.
- The decisive gate stays "ZERO new FPs in the corpus sweep + every new error
  appearance TV-confirmed", per the methodology and the two reverted
  over-firing attempts in the sibling consistency-warning work (INV120).
