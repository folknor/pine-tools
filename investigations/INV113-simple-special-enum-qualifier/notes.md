# INV113 - simple-qualifier on special-enum-typed params (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker-calls.ts` (new `simple <special-enum>`
qualifier check, reusing INV112's `exprQualifier`).
**Source:** `../freedom/FINDINGS.md` F-050 / TODO #63.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
la = close > 0 ? barmerge.lookahead_on : barmerge.lookahead_off
h = request.security(syminfo.tickerid, "D", close, lookahead = la)
```

`request.security`'s `lookahead` is `simple barmerge_lookahead`; a series value
(the ternary over a series condition) is illegal. INV088's simple-qualifier
check only matches `simple (int|float|bool|string|color)`, and the special enum
type `barmerge_lookahead` collapses to `unknown` in `mapToPineType`, so neither
INV088 nor the generic loop saw it. We were silent; TV rejects.

## TV's verdict (probes, `pine-lint --tv`, 2026-06-25)

| probe | CE10123 ctx (repr / argType / expected) |
|---|---|
| `lookahead = la` (variable) | `la` / series barmerge_lookahead / simple barmerge_lookahead, col 64 |
| `lookahead = close>0 ? on : off` (inline) | `operator ?:` / series barmerge_lookahead / simple barmerge_lookahead, col 64 |
| `lookahead = barmerge.lookahead_on` (control) | accepted |

(`success:true`; our output matches repr / types / columns byte-for-byte.)

Note TV renders the inline composite's repr BARE (`operator ?:`), unlike the
string-typed const case (INV112) which gets the `call "operator ?:" (series
string)` wrapper - a TV rendering quirk specific to the special enum types.

## Fix

A new check: for a param whose `rawType` is `simple <X>` with X a NON-scalar
identifier (the special enum types - `barmerge_lookahead`, `scale_type`, ...),
flag the arg when `exprQualifier` (INV112's lattice const<input<simple<series)
proves it is series. The arg's base is `unknown` to us, but it IS an X value
(just series-qualified), so the argumentType renders as `series <X>` from the
param's own base. The repr is built per arg shape: a leaf var/member by name
(`la`), a ternary as `operator ?:`, a binary/unary as `operator <op>` - matching
TV's special-enum rendering. A const/simple/input arg (a bare
`barmerge.lookahead_on`) is left alone (exprQualifier != series).

`exprQualifier` resolves the variable form because the ternary's inferred type
carries the series qualifier (`series float` - base wrong, qualifier right), and
the inline form directly (`close > 0` is series; the barmerge members are const).

## Verification

- Regression fixture `regression/INV113-simple-special-enum-qualifier.pine`:
  variable + inline series forms flagged, bare-const-member control clean
  (2 errors).
- `regression-check.mjs`: 0 corpus changes. Full vitest suite green (374 tests).

## Residual

- The arg's BASE is taken from the param (`series <X>`), not inferred from the
  arg, because the special enum types collapse to `unknown`. This is exact for
  the qualifier mismatch (the only error here), but it assumes the arg's base IS
  the param's - safe because the check fires only on a series-qualified arg to a
  `simple <special-enum>` slot, where a base mismatch would be a separate CE10123
  TV reports first anyway. Modeling the special const types (barmerge_*,
  scale_type) with real base types is the broader follow-up (TODO #63 framing).
