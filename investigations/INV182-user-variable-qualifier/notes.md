# INV182 - the qualifier quoted for a user variable

**Date:** 2026-09-09
**Status:** fixed
**Source:** `notes/todo.md` #84, first bullet - the residual INV175 left behind,
re-reported independently as finding 12 in `../strategies/PINE-LINT-BUGS.md`.
**Fixture:** `packages/core/test/fixtures/regression/INV182-user-variable-qualifier.pine`

## Symptom

Every bare user variable rendered `series` in a CE10123, whatever it was
declared from:

```pine
float len = 14.0
ta.sma(close, len)     // we: "series float"   TV: "const float"
bool b = true
na(b)                  // we: "series bool"    TV: "const bool"
```

Not a wording nit. The qualifier is the SUBJECT of this class of error - a
reader is being told what qualifier their value carries and acts on it - and
`series` versus `const` is the difference between "restructure this" and "it is
already constant, the call is simply wrong". Naming the strongest qualifier
every time makes the message useless in exactly the cases where it is easiest to
act on. (That framing is `../strategies`', and it is right.)

## The sweep

`scripts/probe-variable-qualifiers.mjs`, 29 cases, `probe.json` (before) and
`probe-after.json` (after), 2026-09-09. Controls before and after each run.

The reader is `str.length(x)`: it expects a string, so TV names the argument's
own type whatever its base is (verified for float, int and bool). TV's answer is
taken from `ctx.argumentType`, not from the prose. One script per case - TV
reports every CE10123 in a file in one pass, its first-error stop being
PARSE-only (INV171), but a reassignment in one case would otherwise leak into
another.

**19 of 29 disagreed before; 0 disagree after.** The 29th, an untyped function
parameter, is TV-silent - the documented per-expression suppression, which is a
TV miss rather than our false positive.

## The rules TV actually uses

| Declaration | TV |
|---|---|
| `float x = 14.0`, `x = 14.0`, `float x = 14.0 * 2` | `const` |
| `bool x = true`, `bool x = 2.0 > 1.0` | `const` |
| `float x = na` | `simple` |
| `const/simple/series float x = ...` | the annotation |
| `var float x = 14.0`, `varip float x = 14.0` | `const` |
| `float x = close`, `int x = bar_index` | `series` |
| `float x = syminfo.mintick` | `simple` |
| `float x = input.float(1.0)`, `... * 2` | `input` |
| `simple float x = input.float(1.0) * 2` | `simple` |
| `float x = math.max(1.0, 2.0)` | `const` |
| `float x = ta.sma(close, 5)` | `series` |
| `f(float p) => ... p ...` | `series` |

Four of these are worth stating because they are not what you would guess:

- **`var` and `varip` do NOT escalate.** Persisting across bars looks like it
  should imply series. It does not.
- **An explicit annotation BEATS the initializer.** `simple float x =
  input.float(1) * 2` is `simple`, not `input`. This is what INV175's residual
  half-recorded as "TV says `simple float` for an input product" - the
  annotation was doing that, and an unannotated input product is `input float`.
- **A typed PARAMETER is `series`**, so "unqualified means const" does not
  transfer to parameters.
- **The rule is FLOW-SENSITIVE.** `x = 14.0` / read / `x := close` reports
  `const` at the read, while moving the `:=` above the read reports `series`.
  The qualifier is the one in force where the value is USED.

## Root cause

INV175 recorded the residual as "symbol types are stored unqualified and the
provenance channel returns nothing for a bare scalar user variable", which is
right. What is worth adding is that `promoteAssignedQualifier`'s comment reads
as though the store DOES carry a qualifier when the initializer had one
(`n = int(close)` stores "series int"). It does not - that describes the
promotion path only. A first attempt at this fix trusted that comment, read
`leadingQualifierOf(symbol.type) ?? "const"`, and collapsed all twelve rows
above to `const`, breaking seven cases that had been right by accident. The
qualifier has to come from the INITIALIZER, at declaration time.

## Fix

Two changes, both rendering-only. Neither feeds assignability, so no error
appears or disappears - the whole point is that the verdicts were already
right and only the nouns were wrong.

1. **`declaredQualifiers`**, a WeakMap beside the existing `promotedQualifiers`,
   recording what a declaration gives a variable: the annotation's qualifier if
   it has one, otherwise `qualifierProvenance` of the initializer. The two maps
   JOIN at read time rather than override, and because a promotion is recorded
   when the `:=` is visited, the flow-sensitivity above falls out for free.
   `describeArgForTemplate` reads the join; a symbol with nothing recorded (a
   parameter) keeps the old `series` default, which is what TV wants there.
2. **`renderQualifiedType` takes the bare-type qualifier as a parameter**, and
   CE10173's declaration message passes the initializer's provenance. `const`
   is only right for a literal; a builtin call carries its selected overload's
   qualifier. This closes the other half of the same todo bullet:
   `int r = math.avg(1, 2)` read `const float` and TV says `simple float`,
   because `math.avg`'s weakest overload is
   `(simple int/float, simple int/float) -> simple float` and there is no const
   one to select.

## Verification

- Sweep: 19 disagreements to 0 of 29.
- `pnpm test`: 490 pass.
- `regression-check` over 1879 fixtures: **0 appeared, 0 disappeared, 20
  messages reworded at the same position across 2 files** - exactly the
  expected shape for a rendering change. All 20 are `series X -> const X` on
  user variables initialized from literals; two were re-probed against TV
  (`c_subtitle = #b2b5be80` -> `const color`, `title = 'AlgoPoint'` ->
  `const string`) and TV gives the new wording, so all 20 are corrections.

## A fixture that was wrong, and how it said so

`regression/polymorphic-return-type-inference.pine` asserted `const int` /
`const float` for `array.mode` and `array.variance`. TV says `series` for all
four, probed one script per line (TV stops after one CE10173). The assertions
were corrected.

Its description had said "Verified correct against TV's documented overloads"
and, separately, "Not an INV: no TV disagreement". Both were true of the BASE
type and neither had been measured for the QUALIFIER - the documented overloads
state a base. **A claim of "no TV disagreement" is only as wide as the thing
that was actually compared**, and the fixture is now explicit about which half
it verified.

## Noted, not fixed

`str.length`'s `string` parameter is `series string` in our data and TV quotes
`const string` as the expected type. That is the same shape as the `ta.highest`
`length` residual in todo #84's second bullet, which means that bullet is not
one function: the expected-type NOUN is unmeasured for NON-union parameters
generally, and INV171's probe covers union parameters only. The fixture here
asserts only the ARGUMENT half of each message for that reason.
