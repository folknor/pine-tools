# INV174 - math.sign / math.avg / math.sum typed as input-following (false negative)

**Date:** 2026-09-07
**Status:** fixed
**Code:** `packages/pipeline/src/generate.ts` (the hardcoded `polymorphic` map)
**Source:** `../strategies/VALIDATOR-FINDINGS.md` LNT-10 - found because piners
refused a probe script that had linted clean here, and TV agreed with piners.
**Fixture:** `packages/core/test/fixtures/regression/INV174-math-float-only-polymorphic.pine`

## Symptom (false negative)

```pine
//@version=6
indicator("t")
int r1 = math.sign(0)      // TV: Cannot assign "const float" to "const int"
int r2 = math.avg(1, 2)    // TV: Cannot assign "simple float" to "const int"
int r3 = math.sum(1, 2)    // TV: Cannot assign "series float" to "const int"
```

We were clean on all three. `int a = math.abs(-2)`, `math.max(1, 2)`,
`math.min(1, 2)` are correct Pine and must stay clean.

## Root cause

`generate.ts` flagged six `math.*` functions `polymorphic: "numeric"` (the
checker's "result follows the argument's numeric base" rule): abs, sign, max,
min, avg, sum. The rule is right for abs/max/min. For sign/avg/sum the data
itself says otherwise - every overload returns FLOAT, only the qualifier
follows the argument (`math.sign`: const/input/simple/series float;
`math.avg`: simple/series float; `math.sum`: series float). With an int
argument the flag typed the result int and the declaration check had nothing
to reject. The three wrong entries were easy to miss precisely because the
rule is right for their three neighbours.

## TV probes (`probes/`, `pine-lint --tv` via `scripts/lint-batch.mjs --diff`, 2026-09-07)

| probe | script | TV |
|---|---|---|
| p01 | `int r1 = math.sign(0)` | 3:1 `Cannot assign a value of the "const float" type to the "r1" variable. The variable is declared with the "const int" type.` |
| p02 | `int r2 = math.avg(1, 2)` | 3:1 same wording, `"simple float"` |
| p03 | `int r3 = math.sum(1, 2)` | 3:1 same wording, `"series float"` |
| p04 (control) | `int a = math.abs(-2)`, `int b = math.max(1, 2)`, `int c = math.min(1, 2)` | clean |

All three erroring probes were local-clean before the fix (tv-only 1 each),
so the calls reached TV.

## Fix

Removed `math.sign`, `math.avg`, `math.sum` from the polymorphic map, with an
inline pointer. `pnpm run generate` drops `flags.polymorphic` from those three
entries in `functions.json`; the checker's generic overload resolution (INV147)
then reads the float return off the overloads.

## Verification

- Probes after the fix: p01, p03, p04 no disagreement; p02 same position and
  wording, qualifier noun differs (below).
- Regression fixture (3 errors; abs/max/min controls clean).
- `regression-check.mjs` over 1879 fixtures: zero appearances from this change
  (the corpus never binds these three to an int declaration).
- Full suite green.

## Residual

- `int r2 = math.avg(1, 2)`: TV says the value is `simple float`, we say
  `const float`. `math.avg`'s lowest overload returns `simple float`, so with
  const arguments the overload's return qualifier should be the FLOOR of the
  result; the declaration check renders the bare inferred `float` as const.
  Position and error match; only the noun differs. Same class as INV032's
  qualifier rendering.
