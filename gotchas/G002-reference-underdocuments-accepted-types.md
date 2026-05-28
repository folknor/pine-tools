# G002 — TradingView's reference under-documents accepted param types

**Keywords:** reference-vs-linter, overloads, accepted-types, nz, fixnan,
na, int, plot, under-documentation, FUNCTION_PARAM_TYPE_OVERRIDES

## Observation (verified 2026-05-28 via `pine-lint --tv`)

TV's **reference manual** lists *fewer* accepted parameter types than its
**linter** actually accepts. The documented overloads are a subset of
what's valid. Concrete, TV-verified cases:

| call                     | reference overloads        | `--tv` also accepts        |
|--------------------------|----------------------------|----------------------------|
| `nz(x)` / `fixnan(x)`    | int / float / color        | **bool, string**           |
| `na(x)`                  | (series-bool overload only) | **every type** (universal) |
| `int(x)`                 | int / float                | **bool** (`int(true)` ok)  |
| `plot(title=…)`          | const string               | **series string** (non-const) |

Crucially these extra types are **not in the reference at all** — no
overload lists them — so scraping the reference can never recover them.
The only source is the linter (`--tv` differential testing).

## The trap it caused

INV009 listed `nz(close>open)`, `int(true)`, and `plot(title=non-const)`
as three "missed FNs" (TV-only errors our linter doesn't catch). **All
three were wrong** — TV accepts all of them (verified 2026-05-28). They
were position-based heuristic artifacts from `find-real-failures.mjs`
(TV reports at the operand column, we report at the call/operator column;
the `(line,col)` keying counted them as TV-only). So the entire premise
of the "tighten the polymorphic bypass to catch these FNs" work (#8 /
#17 Phase 2) was false: there were no real FNs, and dropping the bypass
would only have produced false positives.

## Lesson

The reference overload list is a **lower bound** on accepted types, not
the full set. When a parameter's accepted types matter, verify with
`--tv`; don't trust the reference overloads alone. Because the extras
can't be scraped, bake TV-verified sets into pine-data via
`FUNCTION_PARAM_TYPE_OVERRIDES` in `packages/pipeline/src/generate.ts`
(hardcoded, but the knowledge then lands in the generated JSON). The
na-handling family (`na`/`nz`/`fixnan`) accept all na-able types; the
reference only documents a subset.

## References

- INV009 — corrected: all three of its "FNs" disproven here.
- TODO #8 — closed (no real FNs); #17 blocker #2 — resolved (data widened).
- [G001](G001-tv-pine-lint-not-spec.md) — the linter is also unreliable as
  a *spec*; this is the complementary quirk on the *reference* side.
- `packages/pipeline/src/generate.ts` `FUNCTION_PARAM_TYPE_OVERRIDES`.
