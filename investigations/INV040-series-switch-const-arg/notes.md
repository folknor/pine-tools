# INV040 - series switch results vs const-required params (plot title)

**Date:** 2026-06-05
**Status:** RESOLVED
**Category:** tv-only FN `Cannot call "plot" with argument
"title"="trend". An argument of "series string" type was used but a
"const string" is expected.` (1 record) from the 2026-06-05 inventory.
Task tracker #9.

## Claim

`trend = switch / close > open => "Up" / ... / => "Flat"` followed by
`plot(close, title=trend)` is TV's CE10123 at 29:19 - the
condition-based switch over series comparisons yields a SERIES string,
and `title` requires const. This is the corpus verdict itself (file
`5291ac42…`, our own `syntax/switch.pine` fixture's copy); no extra
probe needed - the implemented check reproduces TV's message
byte-for-byte and compare-tv now diffs the file at zero.

Two gaps stacked here:

1. **Inference**: our SwitchExpression typing took the first arm's
   result type verbatim ("string" for a literal), ignoring that a
   series discriminant or series case conditions make the whole value
   series. `isSeriesDriven` now wraps primitive results in `series<>`
   when the discriminant or any case condition infers
   series-qualified. (Comparisons only infer `series<bool>` when an
   operand is series-prefixed, so input-driven switches stay
   unqualified - the negative case in the fixture.)
2. **The INV014 reliability gate**: `describeNonConstArg` returned
   null for ALL user variables. It now flags a user variable whose
   inferred type is series-QUALIFIED (`series<...>`), which is
   provably non-const; unqualified inferences stay on the conservative
   null path, so the gate's original FP protection (mis-guessed
   user-variable types) remains for everything we cannot prove.

Corpus outcome: exactly the 1 inventory record, message and anchor
identical to TV; zero other corpus movement (the qualifier wrap
touched nothing else - the strict INV032 checks compare base types
only).

Fixture: `packages/core/test/fixtures/regression/INV040-series-switch-const-arg.pine`
(plus `syntax/switch.pine`, the carrier, now asserting the error).

## Residual

- ~~Ternary and if-expression results are NOT yet series-wrapped by
  condition~~ - resolved by the 2026-06-05 addendum below.
- The broader #9 umbrella (UDF-return inference unlocking the
  INV014/INV016 gates) still stands; this closes only the
  conditional-expression slice.
- Conditional expressions passed DIRECTLY as a const-required argument
  (`plot(title = close > open ? "U" : "D")`, no intermediate variable)
  still take describeNonConstArg's conservative null path - TV's
  argUserFriendlyRepresentation for an inline expression is unprobed.

## Addendum 2026-06-05: ternary/if-expression + INPUT conditions

Probed the deferred extension (probes in `probes/`, all
`pine-lint --tv` 2026-06-05):

| probe | shape | TV verdict |
|---|---|---|
| p01 | `trend = close > open ? "Up" : "Down"` -> `plot(close, title=trend)` | CE10123 at 4:19, "series string" vs const string |
| p02 | `b = input.bool(true)` / `trend = b ? "Up" : "Down"` -> title | CE10123 at 5:19, **"input string"** vs const string |
| p03 | if-EXPRESSION over `close > open` -> title | CE10123 at 7:19, "series string" |
| p04 | switch with `input.bool` condition -> title | CE10123 at 7:19, **"input string"** |
| p05 | condition-less `switch / => "Static"` -> title | CLEAN - no conditions, result stays const |

So the rule is broader than the original claim in two ways: it covers
ALL conditional expressions (ternary, if-expression, switch), and the
propagated qualifier is the CONDITION's qualifier - input conditions
make the result input-qualified, which is still non-const. The
original assumption that input-driven switches stay const-usable was
wrong (the fixture's condition-LESS negative case remains correct,
p05).

Implementation (all `see INV040` in code):

- `governingConditions` + `conditionQualifier` in checker.ts replace
  `isSeriesDriven`; a central wrap at the `inferExpressionType` tail
  wraps bare primitive results of ternary/if-expression/switch in
  `series<T>` or `input<T>` (series wins over input).
- `input.*()` call results are re-wrapped `input<T>` from the
  pine-data raw return (the polymorphic defval path collapsed them to
  the bare base; `input.source` stays series<float>).
- `describeNonConstArg` flags input-QUALIFIED user variables alongside
  series-qualified ones.
- Knock-on fixes, all qualifier-blindness the new `input<T>` exposure
  surfaced: `isAssignable` gained a qualifier-insensitive equal-base /
  numeric-cross rule (qualifiers never block `:=` in Pine - this also
  removed pre-existing `Cannot assign string to simple<string>`-class
  FPs); the `numeric` polymorphic branch (math.max etc.) compares
  bases so `input<int>` keeps int-ness; `array.from` element typing
  and ternary-branch compatibility strip bracket qualifiers; messages
  render bracket forms in TV's space form (`displayType`).

Corpus: zero new error appearances; ~900 same-position wording shifts
(qualifiers now visible in operand-type messages); 23 disappeared
records, all qualifier-blocked assignability FPs.

Fixture: `packages/core/test/fixtures/regression/INV040-conditional-qualifier-propagation.pine`
