# INV184: A failed call's result type - TV poisons to "unknown", and the format tail is where it shows

Source: `../strategies/PINE-LINT-BUGS.md` finding 13 (open as of 2026-09-10),
found there while confirming finding 12's fix.

## The disagreement

Both validators reject the same first error identically; they diverge on the
cascade. TV assigns a call whose argument checks failed the result type
`unknown` and carries it outward, transitively through enclosing calls.
pine-lint keeps the call's declared return type.

That mechanism only becomes visible where `unknown` fails a downstream check,
and probing showed TV's surface for that is much narrower than the finding
assumed: the **format tail** (the `argN` values-to-format of `str.format` and
`log.info`/`log.warning`/`log.error`) is the one place TV re-checks the
poisoned type. Everywhere else TV's plain-param check skips `unknown` and goes
silent - which is TV *losing* a diagnostic, not gaining one.

## Probes (all `pine-lint --tv`, 2026-09-10, TV genuinely reached - every
## probe below shows TV output disagreeing with the pre-fix local validator)

### Case A (the finding's repro) - TV cascades, local (pre-fix) silent

```pine
//@version=6
indicator("t")
bool b = true
plot(str.length(str.format("{0}", na(b))))
```

TV: `4:38` na error, then
`4:35: Cannot call "str.format" with argument "arg_1"="call "na" (unknown)".
An argument of "unknown" type was used but one from
"simple int/float/bool/string" is expected` (code **CE10122**, per the raw
`--tv` JSON). Local pre-fix: only the na error.

### Case B - local cascades (kept), TV silent

```pine
//@version=6
indicator("t")
plot(math.abs(str.length(na(close > open))))
```

TV: only the na error at `3:29`. Local additionally reports
`3:26: Cannot call "str.length" with argument "string"="call "na"
(series bool)". An argument of "series bool" type was used but a
"const string"  is expected.` - **kept deliberately**: `na()` genuinely
returns bool, the statement is true of the code, and the methodology forbids
relaxing on TV silence. The finding itself recommends exactly this split.

### Scope probes - where TV does NOT cascade (all 2026-09-10)

- `plot(math.abs(na(close > open)))` -> TV: na error only. Union doc type
  alone does not trigger it.
- `plot(ta.sma(na(b), 10))` -> TV: na error only. Overloads alone do not
  trigger it.
- `plot(math.max(na(b), 1))` -> TV: na error only. Variadic alone does not
  trigger it; math.max's tail params are `number0`/`number1`, not `argN`.
- `plot(str.length(str.tostring(na(b))))` -> TV: na error only.

### Scope probes - where TV DOES cascade

- `log.info("{0}", na(b))` -> TV adds
  `Cannot call "log.info" with argument "arg_1"="call "na" (unknown)". An
  argument of "unknown" type was used but one from
  "series int/float/bool/string/array<int/float/bool/string>" is expected`.
  The noun is log.info's own argN overload type - per-function, from the
  catalog's first argN-bearing overload.
- Poison is transitive and the message names the OUTERMOST call:
  `plot(str.length(str.format("{0}", str.upper(na(b)))))` -> TV:
  `arg_1"="call "str.upper" (unknown)"`.

### The tail is a full union check, not only a poison consumer

`plot(str.length(str.format("{0}", color.red)))` -> TV (raw JSON):
`code CE10122, arg_1="color.red", const color, expected
"simple int/float/bool/string"`. Local pre-fix: silent. So local had NO
format-tail check at all; finding 13's case A was one symptom of it.

## The fix

1. **Poisoned-call tracking** (`checker.ts` / `checker-calls.ts`):
   `validateCallExpression` is now a wrapper that marks a call poisoned when
   its validation (including the nested argument subtree, matching TV's
   transitivity probe) emitted a CE10122/CE10123. Nothing else consumes the
   set, so every other path keeps the declared return type - case B's
   diagnostic is untouched.
2. **Format-tail union check** (`builtins.ts` `formatTailUnion` +
   `checker-calls.ts` variadic branch): data-driven from the overloads - a
   variadic function whose overloads carry params named `arg0`/`arg1`
   (the name criterion is what excludes math.max). Membership is the union of
   member bases across all overloads; the quoted noun is the first
   argN-bearing overload's type verbatim (matches TV for both str.format and
   log.info). Flagged: the five scalar bases outside the union, and poisoned
   calls (rendered `call "<name>" (unknown)`). Lenient: na, non-poisoned
   unknown, UDTs; arrays accepted when any overload admits them.

## Verification

- Fixtures `INV184-format-tail-poisoned-call.pine` (cascades + color +
  negatives) and `INV184-failed-call-keeps-declared-type.pine` (locks case B's
  kept diagnostic). Full suite green.
- Corpus: `lint:regression` diff vs clean HEAD (change stashed, both builds
  swept 2026-09-10) is byte-identical - zero new format-tail errors on 1879
  fixtures. (The sweep's 2633 "new error appearances" exist at clean HEAD too:
  baseline drift since 2026-08-25, unrelated.)
