# INV100 - enum-member arg not validated against allowedValues (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/builtins.ts` (`ParameterInfo.allowedValues`
plumbed through `buildSignatureFromPineFunction`),
`packages/core/src/analyzer/checker-calls.ts` (CE10068 check).
**Source:** `../freedom/FINDINGS.md` F-055 - the order-generating `strategy.*`
surface; piners + (for `direction`) local pine-lint miss it; TV flags it.

## Symptom (false negative)

```pine
//@version=6
strategy("s")
strategy.entry("L", 5)
```

`direction` is typed `series strategy_direction` with allowed members
`strategy.long` / `strategy.short`. A bare `5` is invalid. We were silent;
TV rejects.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

Script: the snippet above. Raw TV output:

```json
{"code":"CE10068","ctx":{"argumentName":"direction","funName":"strategy.entry",
 "possibleValues":"strategy.long, strategy.short"},
 "start":{"column":21,"line":3},"end":{"column":21,"line":3},
 "message":"Invalid argument \"{argumentName}\" in \"{funName}\" call. Possible values: [{possibleValues}]"}
```

TV reports the allowed MEMBERS (CE10068), not a type mismatch (CE10123).
(`success:true`.)

## Fix

`ParameterInfo` now carries `allowedValues` from pine-data. The call checker
emits CE10068 when:
- `param.type === "unknown"` - a special enum type the checker doesn't model
  (`strategy_direction`, `plot_display`, `barmerge_*`, ...). EXCLUDES modeled
  string-typed params, both genuine string enums (out of scope) and the
  scrape-corrupted `strategy().close_entries_rule` (a `const string` taking
  "FIFO"/"ANY" whose `allowedValues` wrongly scraped a stray `strategy.exit`
  cross-ref - corpus FP `6293fd71...`).
- every allowedValue is a dotted NAMESPACED member (`strategy.long`). The other
  allowedValues shape is bare idents (`close`, "Traditional") for params that
  accept a series var or a plain string literal - flagging there would be wrong
  (`max_bars_back(close)`, pivot type `"Classic"`).
- the argument is a numeric/string LITERAL. A namespaced constant is an
  Identifier/MemberExpression, never a literal, so a literal is unambiguously
  invalid; a valid `strategy.long`, a ternary of members, or a variable stay
  lenient.
- positional args are checked only on single-signature functions
  (`!hasOverloadSignatures`); real overloads (fill's plot/hline forms) scramble
  positions, so a positional title could land in `display`'s slot (corpus FP).
  Named args are always unambiguous.

## Verification

- Regression fixture `regression/INV100-strategy-direction-allowedvalues.pine`
  (literal `5` flagged + valid-member and ternary-of-members controls, exactly
  1 error).
- `regression-check.mjs` over 1879 corpus fixtures: 0 new appearances after the
  three guards above (each guard removed a distinct corpus FP class:
  `max_bars_back` bare-ident allowedValues, `fill` positional overload scramble,
  `strategy().close_entries_rule` corrupted allowedValues). Full suite green.

## Residual / follow-up

- Genuine string-typed enum params (`box.new(xloc=)`, `plotshape(style=)`,
  `indicator(format=)`) are NOT checked: a string literal there is invalid on TV
  but our `param.type === "unknown"` gate excludes modeled `string` params to
  stay clear of the `close_entries_rule` data corruption. Tightening that needs
  distinguishing genuine string enums from the corrupted scrape (e.g. the param
  default being a dotted member vs a plain string) - left for a follow-up.
- Wrong-namespace member args (`strategy.entry("L", display.all)`) are not
  flagged (only literals are); detecting cross-namespace member misuse is a
  broader change.
