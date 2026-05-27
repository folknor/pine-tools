# INV001 — Ternary branches must have compatible types

**Status:** Decided. The check is kept; we are stricter than TV here on
purpose.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV001-ternary-cross-type-branches.pine`

## Summary

`cond ? a : b` requires `a` and `b` to be type-compatible (numeric ↔
numeric, bool ↔ bool, string ↔ string, color ↔ color, plus
series/simple stripping). Cross-type branches like `cond ? 1 :
color.red` or `cond ? "x" : 3.14` are nonsense values — the result
cannot be assigned to a typed variable and has no usable meaning.

`pine-lint` (TradingView's reference linter) is **silent** on these
cases — it does not flag them. We flag them anyway because the code is
broken regardless of what TV says. This is the canonical example of
the methodology rule "TV silence is evidence, not authority" (see
[CLAUDE.md](../../CLAUDE.md)).

## Timeline

### 2026-05-27 — Removed (wrongly), then restored

A differential test against `pine-lint --tv` over 748 v6 fixtures
showed 43 hits of `Ternary branches must have compatible types. Got
'*' and '*'` in 14 files. Sampled `compare-tv.mjs` runs on those files
showed TV reporting 0 errors at those positions. The pair distribution
was:

```
15  color | string
11  color | int
 4  series<color> | series<float>
 4  series<color> | string
 4  bool | color
 2  color | series<float>
 1  series<float> | simple<string>
 1  bool | string
 1  series<float> | string
```

Every pair is a cross-type mix where the resulting "value" has no
single well-defined type. The original `areTernaryBranchTypesCompatible`
function in `packages/core/src/analyzer/checker.ts` had a comment
explaining its strictness:

> TradingView requires that ternary branches have compatible base
> types without arbitrary coercion (e.g., int and color are NOT
> compatible in ternary)

That comment turned out to be wrong about *TradingView's* enforcement
— TV does accept these mixes — but the original author's *intent*
(reject nonsense ternary results) was right.

Claude removed the check based purely on TV's silence (commit
`8c5da63`, "Drop the ternary-branch type-compatibility check"). The
user pushed back: TV being permissive on nonsense expressions is TV
being too lenient, not us being over-strict. The 43 "false positives"
were us correctly catching broken code that TV missed.

The check was then restored.

## Decision

- Keep `areTernaryBranchTypesCompatible` exactly as it was.
- Add an inline `// see INV001` reference at the call site so future
  readers don't repeat the removal.
- The 43 hits remain in the TV-diff report — but they are **not** false
  positives. They are real findings TV missed.

## How to verify

```bash
pnpm test
# The regression fixture INV001-ternary-cross-type-branches.pine
# exercises three cross-type ternaries; the test runner asserts our
# linter emits an error for each.
```

## Methodology notes captured for future investigations

- A code comment explaining *why* a checker is stricter than TV is a
  strong signal. Treat it as the work of someone who already weighed
  the trade-off. Investigate the underlying expressions before
  removing.
- "TV is silent" is not a finding by itself. Pair it with: "is this
  expression actually sensible Pine code?" If no, we keep flagging it.
- Position-only matching in `find-real-failures.mjs` will call a
  finding a "false positive" whenever TV is silent at the same
  `(line, col)`. The label is a navigation aid, not a verdict.
