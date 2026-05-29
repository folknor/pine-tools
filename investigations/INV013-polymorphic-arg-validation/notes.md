# INV013 — validate args on polymorphic functions now that pine-data emits union types

**Status:** resolved (TODO #24)
**Repro:** `packages/core/test/fixtures/regression/INV013-polymorphic-arg-typecheck.pine`

## Problem

`validateFunctionArguments` skipped argument type-checking for any function with
`flags.polymorphic` set (the bypass at checker.ts, guarded by a comment citing
INV009). It existed because pine-data used to list only overload #0's param
types, so checking polymorphic/overloaded args against that one form produced
false positives. Consequence: real argument-type mismatches on these functions
were missed FNs — e.g. `math.round(close, "x")` (the `precision` param is
`series int`) went unflagged though TradingView flags it.

## What changed

#17 made pine-data emit **union** param types across all overloads. With that:

- Union types (e.g. `series int/float`, nz's widened
  `series int/float/bool/string/color`) map to `unknown` via `mapToPineType`
  and are skipped by the existing `param.type !== "unknown"` guard. So removing
  the polymorphic bypass only validates **cleanly-typed** params — exactly the
  cases where a single concrete type is known and a mismatch is real.
- The bypass (`functionIsPolymorphic` in the named- and positional-arg checks)
  was removed. `functionHasOverloads` (a function with any still-`unknown`
  param) still skips positional checking, since positions are ambiguous across
  divergent overload forms.

Net: `math.round(close, "x")` → "Type mismatch for argument 2: expected
series int, got string", with no new FPs on v6 fixtures (regression-check: 0
new appearances).

## v6-only arg checks (the v4/v5 caveat)

Removing the bypass first surfaced 20 false positives — all on `//@version=4`
scripts using the legacy `input(defval, title, type, …)` form (v6 removed the
`type` param, so arg 3 maps to `tooltip: string` and `input.color` mismatches).
pine-data ships only **v6** signatures, so validating v4/v5 calls against them
is unsound. Arg-type checks are therefore gated to `version === "6"`; legacy
scripts are left lenient (consistent with G004's version-driven leniency). This
also retired ~166 pre-existing, unreliable arg-type errors on v4/v5 fixtures.

Return-type inference still reads the polymorphic flag separately
(`getPolymorphicReturnType`); only the arg-*validation* bypass was removed.
