# INV170 - a built-in constant or variable called as a function

Found 2026-08-27 by the sweep TODO #81 asked for: after INV169 turned up a
suppression that cited a TradingView diagnostic nothing emitted, check the
other skip-with-a-reason sites in the checker for the same shape.

## The sweep

Scope: every `continue` / `return` / guard clause in `checker-calls.ts`,
`checker.ts`, `checker-expressions.ts`, `checker-helpers.ts` and the parser
whose comment makes a claim about what TradingView does.

Result: **one more instance**, below. The others hold up:

- `checkUnionArgs`'s header ("real CE10123 errors in TV - slipped through") is
  past tense - it describes the bug that function FIXES, not a live gap.
- `builtins.ts`'s NAMESPACE_PROPERTIES header is likewise a record of a removal.
- The `scalarReceiver` / collection-receiver guards in `checker-calls.ts` are
  conservatism against false positives with the trade-off stated, and their
  NAMESPACE_PROPERTIES exemption turns out to be CORRECT for a reason nobody
  had measured - see "The control that nearly did not happen" below.
- `checker.ts`'s exported-variable rule and the parser's CE10156 sites are
  emitters, not suppressions.

So the anti-pattern INV169 named is rare rather than systemic. That is the
useful result: the sweep was worth running once and does not need to become a
standing chore.

## The finding

`checker-calls.ts`, the known-namespace-path branch of the CE10271 check,
carried:

```ts
// A member that IS a known builtin (function via the signature lookup
// above, or a const/variable in NAMESPACE_PROPERTIES) is left alone:
// calling a built-in variable like `ta.tr(...)` is TV-silent, and calling
// a const like `color.red(...)` IS a TV error but the const-vs-variable
// split is murky, so we conservatively skip all known members - we never
// want a false positive on a real member.
```

It states outright that `color.red(...)` is a TV error we do not report, so
unlike INV169 this one DISCLOSES its miss rather than mis-attributing it. What
made it worth reopening is that the reason given for the miss is false.

### The premise is wrong, and `ta.tr` is what made it look right

`ta.tr` is not silent because it is a variable. **`ta.tr` is also a function** -
`ta.tr(handle_na)` - so the signature lookup above claims it and it never
reaches this branch at all. Confirmed locally: `ta.tr(2)` reports
`Cannot call "ta.tr" with argument "handle_na"="2"`, which is an argument-type
error on a resolved call, and TV reports the identical thing.

So there is no const-vs-variable split to be murky about. The real predicate is
"is there a FUNCTION of this name", which is exactly the lookup that already
failed to get us here.

### TV probes, 2026-08-27

Constants and variables alike, all `//@version=6`:

| probe | TV |
|---|---|
| `x = math.pi(2)` (const) | `Could not find function or function reference 'math.pi'` |
| `x = color.red(1)` (const) | `... 'color.red'` |
| `strategy.entry("e", strategy.long(1))` (const) | `... 'strategy.long'` |
| `x = syminfo.tickerid(2)` (variable) | `... 'syminfo.tickerid'` |
| `barstate.isfirst(1)` (variable) | `... 'barstate.isfirst'` |
| `x = ta.tr(2)` (variable AND function) | argument-type error, not CE10271 |

We were silent on the first five.

## The control that nearly did not happen

The first version of the fix dropped the `NAMESPACE_PROPERTIES` clause
outright. Tests passed and `regression-check` reported **0 changed fixtures**,
so both gates said ship it. It was wrong:

```pine
//@version=6
indicator("t")
color = "abc"
x = color.red(1)
plot(close, title = x)
```

- **TV: clean.**
- Us, with the clause dropped: `Could not find method or method reference 'color.red'`

Shadowing the namespace with a user variable really does change TV's verdict on
the identical member call. So the exemption is correct on the SHADOWED branch
and wrong only on the unshadowed one, and the guard now says so:

```ts
(!userShadowed ||
  (scalarShadow && !(functionName in NAMESPACE_PROPERTIES))) &&
```

Worth keeping as a lesson, since it is the second time in two investigations
that the corpus proved nothing: **the corpus carries neither shape.** Nobody
writes `math.pi(2)` in real code, and nobody shadows `color` and then calls
`color.red(1)`. A 0-changed regression-check over 1879 fixtures was equally
consistent with "no false positives" and with "this rule is untested", and only
the hand-written probe separated them. Both halves are now in the fixture.

## Verification

- All five CE10271 shapes match TV's wording and position.
- Both controls (`ta.tr(true)`, and the shadowed `color.red(1)`) are clean at
  TV and clean here, probed together in one script.
- `regression-check`: 0 changed fixtures, 0 new error appearances.
- Full suite 476 passing.

### Regression fixture

`packages/core/test/fixtures/regression/INV170-builtin-member-called-as-function.pine`
pins two constants, two variables, and both controls in one file.
Mutation-verified red: with the fix reverted it reports 0 errors instead of 4,
failing the count and all four individual assertions.

## Left open

The collection-receiver and scalar-receiver guards elsewhere in the same
function keep their own `NAMESPACE_PROPERTIES` exemptions. Those sit behind
`userShadowed`, which the probe above shows is the branch where the exemption
is RIGHT, so they are correct as they stand - but only the `color`/scalar case
was measured. A user variable shadowing a namespace and then calling a
COLLECTION member on it was not probed and is not pinned.
