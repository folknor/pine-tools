# INV016 — validate union-typed arguments (the nz/fixnan/int base-type FNs)

**Status:** Fixed. Completes the follow-up INV015 opened (was TODO #28).

**Regression fixtures:**
- `packages/core/test/fixtures/regression/INV016-union-arg-validation.pine` (must flag)
- `packages/core/test/fixtures/regression/INV016-union-arg-valid.pine` (must stay clean)

## Problem

After INV015 removed the bad overrides, `nz`/`fixnan` revert to
`series int/float/color` and `int` to `series int/float`. But the checker still
missed `nz(<bool>)` / `int(true)` (real CE10123 in TV) because
`validateFunctionArguments` skips any param whose `mapToPineType` is `"unknown"`
— and a *union* collapses to `"unknown"` (the INV013/#17 safety net that avoided
FPs on overload unions). So union params were never type-checked.

## Validation (isolated `pine-lint --tv`, 2026-06-02)

```pine
//@version=6
indicator("x")
plot(nz(close > open))                 // CE10123 — source: series bool, simple int expected
y = int(true)                          // CE10123 — x: literal bool, simple int expected
z = nz(syminfo.tickerid)               // CE10123 — source: simple string, simple int expected
var bool d = true
d := nz(d[1], true)                    // CE10123 on BOTH source and replacement (bool)
// in-set args are clean:
plot(nz(close))                        // ok
plot(math.max(close, open))            // ok
bgcolor(nz(close > open ? color.red : color.green)) // ok (color in set)
```

TV flags every bool/string-into-numeric-union case and accepts the in-set ones,
confirming the accepted set is exactly the reference union (`int/float[/color]`).

## Fix

`checkUnionArgs` (checker.ts) + `getScalarUnionMembers` /
`namedParamUnionMembers` / `positionalParamUnionMembers` (builtins.ts). For an
arg whose param's raw type is a scalar union, flag if the arg's base is a known
scalar outside the union (int/float interchangeable). The merged param type is
already the cross-overload union (union-types.ts), so an out-of-set base is
rejected by every overload — sound for rejection (no FPs from the union logic
itself). Positional checks are skipped for overloaded funcs and for positional
args after a named one (malformed ordering — TV's own error).

### Two FP classes the broad check exposed, and how they're handled

Union-checking applies to *all* union params (`plot` `series int/float`,
`color.from_gradient`, `math.*`, …), so it amplified pre-existing
type-**inference** gaps into visible FPs. Two were found and fixed:

1. **`nz`/`fixnan` mis-typed as `color`.** Their syntax freezes to
   `→ simple color` (overload #0). When the arg type was unresolved (e.g.
   `nz(tonumber(x))` where `tonumber` is unrecognized), `getPolymorphicReturnType`
   returned null and inference fell back to that frozen `color` — so
   `int(nz(...))` falsely saw `color`. Fix: a polymorphic function whose return
   follows an unresolved arg now yields `unknown`, not the frozen return
   (checker.ts). This also removed **21 pre-existing TV-silent FPs** elsewhere
   (the bogus `color` was tripping ternary/assignment checks).

2. **UDF-return / user-var args.** `color.from_gradient(Vol, …)` where
   `Vol = someUdf()` (a float we mis-infer as bool) would FP. Fix: a **reliability
   gate** (`isReliablyTyped`) — only flag when the arg's type comes from a
   trustworthy source (literal, operator, built-in var/const/call), never a user
   identifier or UDF call. This mirrors `describeNonConstArg`'s conservatism
   (INV014). Cost: we miss union violations whose arg flows through a user var
   (a conservative FN), which is the right trade until UDF-return inference is
   solid (task #9).

## Verification

- Targets flag, matching TV; valid in-set args clean (fixtures lock both).
- Corpus regression: **+7** new appearances, all TV-confirmed true positives
  (`int(true)`/`int(false)`/`float(true)`, `nz(close>open)`, `nz(bool,true)`×2);
  **−21** TV-silent FPs removed (the `color` fix); **0** TV-also-flagged errors
  lost (no real catch regressed). Baseline re-snapshotted.
- `pnpm test`: 210 pass.

## Known limitation

Union args typed via a UDF return or user variable are not validated (the
reliability gate). Lifting it needs robust UDF-return inference — see task #9.
