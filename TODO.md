# TODO

Discrepancies between our linter and TradingView's pine-lint over 748 v6
fixtures.

- **6609 false positives** (errors we report that TV doesn't) across 193
  files, in **48 categories**.
- **59 false negatives** (errors TV catches that we don't) across 43 files,
  in **19 categories**.

Authoritative per-occurrence list lives in
`lint-reports/failures-by-category.json`. For every category below the JSON
holds every `(fixture, line, column, exact message)` that contributed to the
count.

Repro for any fixture:

```bash
node scripts/compare-tv.mjs fixtures/<hash>.pine
```

Refresh both reports after a change:

```bash
node scripts/find-real-failures.mjs --concurrency 4
node scripts/categorize-failures.mjs
```

---

## Parser — error recovery cascades

One bad token causes hundreds of downstream "Unexpected token" hits because
recovery has no synchronization point. Adding a `synchronize()` that
discards tokens until a statement-boundary anchor (top-level keyword, dedent
to column 1, etc.) should collapse most of these.

| count | files | category |
|---|---|---|
| 1697 | 44 | `Undefined variable '*'` *(many are recovery artifacts, see Symbols below)* |
| 1652 | 14 | `Unexpected token: \n` |
| 1292 | 48 | `Undefined variable '*'. Did you mean '*'?` *(also partly recovery)* |
| 145 | 12 | `Unexpected token: =>` |
| 56 | 4 | `Unexpected token: =` |
| 56 | 7 | `Expected variable name` |
| 48 | 7 | `Expected ")" after arguments` |
| 46 | 17 | `Expected iterator variable` |
| 41 | 11 | `Unexpected token: .` |
| 36 | 10 | `Unexpected token: )` |
| 34 | 11 | `Unexpected token: ,` |
| 24 | 6 | `Expected ")" after method parameters` |
| 18 | 4 | `Unexpected token: ]` |
| 15 | 5 | `Expected function name after 'export'` |
| 11 | 2 | `Expected type name` |
| 9 | 4 | `Expected ']'` |
| 7 | 5 | `Unexpected token: :=` |
| 5 | 4 | `Unexpected token: +` |
| 2 | 2 | `Unexpected token: :` |
| 1 | 1 | `Expected method name after 'method'` |
| 1 | 1 | `Unexpected token: ==` |

Example: `fixtures/0c053259a16ba1b4aa4898add6830d5fe0e6bcb90766e1595ca40c08f5644da8.pine`
— TV reports 1 error at L61 (invalid `series float` qualifier in function
parameter); we report 525, all cascade.

## Parser — syntax we silently accept (false negatives)

These are real syntax errors in the user's code that we don't surface.

| count | files | category |
|---|---|---|
| 6 | 6 | `no viable alternative at character {unexpectedToken}` |
| 5 | 5 | `Missing enclosing character in the literal string` (unterminated string) |
| 5 | 5 | `Syntax error at input {value}` |
| 3 | 3 | `"{typeKeyword}" is not a valid type keyword` |
| 2 | 2 | `Incorrect "for" statement. Expecting "to <expression>"` |
| 2 | 2 | `"{variableName}" is already defined` |
| 2 | 1 | `All exported functions args should be typified` |
| 1 | 1 | `Script doesn't contain any statements` |
| 1 | 1 | `Syntax error: Missing closing parenthesis` |
| 1 | 1 | `Exported variable should have const modifier and type` |

---

## Type checker — numeric series rejected in bool contexts

Pine v6 truthifies numeric series (0/na → false). Our `and`/`or`/`not` and
ternary/`if` condition checks demand strict `bool`. Update `types.ts` /
`checker.ts` to accept `int`, `float`, `series<int>`, `series<float>` as
bool-coercible.

| count | files | category |
|---|---|---|
| 199 | 28 | `Operator 'and' requires bool operands, but left operand is *` |
| 166 | 32 | `Ternary condition must be bool, got *` |
| 130 | 20 | `Operator 'and' requires bool operands, but right operand is *` |
| 59 | 17 | `Condition must be boolean, got *` |
| 38 | 7 | `Type mismatch: 'not' operator requires bool, got *` |
| 26 | 15 | `Operator 'or' requires bool operands, but left operand is *` |
| 13 | 12 | `Operator 'or' requires bool operands, but right operand is *` |

The categories above collapse two underlying issues — *numeric series* and
*color* — distinguishable per occurrence in the JSON via the `got` value.

## Type checker — color in bool contexts

Pine treats `na` color as false; we reject color → bool entirely. Same
category names as above; the JSON occurrences disambiguate via `got color`
vs `got series<float>`.

| count | files | category |
|---|---|---|
| 110 (of 127) | 6 | `Type mismatch for parameter 'active': expected bool, got color` |

## Type checker — user-defined type name lowercasing

Type-name comparison is case-insensitive on one side. `array<POI>` should
equal `array<POI>`, not `array<poi>`.

| count | files | category |
|---|---|---|
| 85 | 23 | `Cannot assign array<X> to array<x>` (case-mismatch class) |

JSON shows the concrete type names (`POI`, `OrderBlock`, `Trade`, …).

## Type checker — over-strict operand/arg/branch types

Probably a mix of legitimate-bug and over-strict-rule cases; need to walk
the JSON occurrences and decide per category.

| count | files | category |
|---|---|---|
| 238 | 57 | `Type mismatch: cannot apply '*' to * and *` |
| 98 | 45 | `Type mismatch for argument *: expected *, got *` |
| 90 | 27 | `Cannot assign * to *` |
| 41 | 14 | `Ternary branches must have compatible types. Got '*' and '*'` |
| 127 | 6 | `Type mismatch for parameter '*': expected *, got *` (concentrated in 6 files — likely 1–2 root causes) |

## Type checker — false negatives

| count | files | category |
|---|---|---|
| 16 | 8 | `Cannot call "{funId}" with argument ...` (arg type mismatches on built-ins we miss) |
| 3 | 3 | `Cannot assign * to *` (TV catches assignment type errors we don't) |
| 2 | 2 | `Could not find {kind} '{fullName}'` |
| 2 | 1 | `Cannot use a collection in a type template of another collection` |
| 2 | 1 | `The condition of the "{blockName}" statement must evaluate to a "bool" value` |
| 2 | 1 | `Undeclared identifier "{identifier}"` |
| 2 | 2 | `Value with NA type cannot be assigned to a variable that was defined without type keyword` |
| 1 | 1 | `Incorrect field type "{id}" of enum "{enumName}"` |

The 16 missed argument-type-mismatches are particularly worth chasing —
these are real runtime bugs in the user's code that we'd hide. Look first
at functions registered with `type: "unknown"` parameters (see
`hasOverloads()` in `builtins.ts`) — that bypass skips positional type
checking.

---

## Symbols — undefined-variable clusters

`Undefined variable '*'` (1697 hits in 44 files) and `Undefined variable '*'.
Did you mean '*'?` (1292 hits in 48 files) dominate the count, but most of
both come from a handful of files where the same name appears dozens of
times. The JSON groups occurrences per category — find the names that
repeat:

| ~count | name | example fixture |
|---|---|---|
| 95 | `Timezone` | `fffe6a2f18a42e0f83a5aa832b48019ad0f121627ca61cc0b5e63252f682433a.pine:131` |
| 66 | `entryOrderType` | `6293fd713714b37c8f108b12e64e92399f72036aac8ff8f9f2933ac09e042022.pine:499` |
| 64 | `fvg` | `4d78be7e3f7e6ab005629fa3e77f339e1107cfdf026d883dfca1e9c2797d9c5d.pine:919` |
| 60 | `exiu` | `e1a8cc990e645380ff1c4fa0718ab38012db5ac3df5221efd66e859acd8091ae.pine:108` |
| 56 | `numOfTakeProfitTargets` | `6293fd713714b37c8f108b12e64e92399f72036aac8ff8f9f2933ac09e042022.pine:698` |

Per-file root causes are almost always one of:

- library `import User/Lib/N as alias` not exposing members
- `var`/`varip`/type-annotated declarations not added to symbol table
- block scope leaking the wrong way
- recovery cascade swallowing the declaration so later references look unbound

Pick one file at a time, find where the name is "defined," fix one root
cause, watch many false positives evaporate.

The `Unexpected identifier '*' - did you mean '*'?` category (19 hits, 6
files) is the same shape applied to identifiers in syntactic positions.

---

## pine-data — stale or incomplete built-in surface

We reject access to built-ins that exist in v6. Likely the scraper missed
fields, or v6 added them after the last regen.

| count | files | category |
|---|---|---|
| 23 | 5 | `Unknown property '*' on namespace 'syminfo'` (`target_price_*`, `mincontract`, `volumetype`, `shares_outstanding_float/total`, `cftc_code`, `sector`, `target_price_estimates`) |
| 7 | 3 | `Unknown property '*' on namespace 'chart'` (e.g. `chart.point`) |
| 5 | 2 | `Unknown property '*' on namespace 'ta'` (e.g. `ta.accdist`) |
| 4 | 3 | `Unknown property '*' on namespace 'session'` (e.g. `session.islastbar`) |
| 2 | 2 | `Unknown property '*' on namespace 'strategy'` (e.g. `strategy.eventrades`, `strategy.max_contracts_held_all`) |
| 2 | 2 | `Unknown property '*' on namespace 'line'` (`line.all`) |
| 1 | 1 | `Unknown property '*' on namespace 'barmerge'` (`barmerge.lookhead_on`) |
| 1 | 1 | `Unknown property '*' on namespace 'box'` (`box.all`) |

JSON has every concrete property name. Cross-check current TradingView Pine
v6 reference, add to `pine-data/v6/*.ts`, regenerate.

Also stale: `log.info` / `log.error` arity (4 hits, 3 files) — they accept
more arguments in v6 than our signature allows.

```
2  Too many arguments for 'log.info'
2  Too many arguments for 'log.error'
```

## Checker — local-scope restrictions probably too strict

`Function '*' cannot be called from a local scope` fires 31 times across 6
files for `plot`, `plotshape`, `plotcandle`, `alertcondition`, `barcolor`,
`bgcolor`, `fill`. Some of these (`alertcondition` in particular) may
actually be callable from `if`/`for` bodies in v6 — verify per-function with
TV.

---

## Open questions worth answering before tackling individual fixes

- `lint-reports/real-failures.json` has 2 entries where TV returned
  unparseable output (`tvOk: false`). Worth checking whether TV truncates
  responses past some size — affects how trustable the comparison is for
  large fixtures.
- A few categories ("All exported functions args should be typified",
  "Exported variable should have const modifier and type") look like
  library-only constraints. Decide whether we want to implement those at all
  before counting them as bugs.

---

## Measurement

After each change, rerun the two scripts above and compare summary counts in
`lint-reports/failures-by-category.json`. The cascade-driven Parser
categories should drop sharply once sync lands; everything else should track
distinct type-system / scope / pine-data fixes.
