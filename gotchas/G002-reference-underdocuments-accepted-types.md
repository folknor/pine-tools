# G002 — TradingView's reference under-documents accepted param types

**Keywords:** reference-vs-linter, overloads, accepted-types, nz, fixnan,
na, int, plot, under-documentation, FUNCTION_PARAM_TYPE_OVERRIDES,
RETRACTED, position-keying-artifact

## ⚠️ RETRACTED 2026-06-02 — every claim below was wrong

This gotcha claimed TV's *linter* accepts more param types than its
*reference* documents. **Direct, isolated `pine-lint --tv` probes on
2026-06-02 disprove all of it.** TV flags every example with CE10123:

| isolated `--tv` probe (2026-06-02) | original G002 claim | actual TV verdict |
|---|---|---|
| `plot(title=syminfo.tickerid)` (simple string) | accepts non-const | **CE10123** — `const string` expected |
| `plot(title=str.tostring(close))` (series string) | accepts non-const | **CE10123** — `const string` expected |
| `nz(close > open)` (series bool) | accepts bool | **CE10123** — `simple int` expected |
| `nz(syminfo.tickerid)` (simple string) | accepts string | **CE10123** — `simple int` expected |
| `int(true)` | accepts bool | **CE10123** — `simple int` expected |
| `na(close > open)` | universal (any type) | **CE10123** — `simple float` expected |

The reference's documented types are NOT a lower bound that the linter
widens — at least for these calls, the linter enforces them (and the
qualifier) *exactly*. Controls confirm: `plot(title="ok")` is clean.

### Why the original conclusion was wrong

G002's "verification" trusted the very position-keying artifact it warned
about, and drew it backwards. TV reports these at the **operand column**;
we report at the **call/operator column**. `find-real-failures.mjs` keys by
`(line, col)`, so TV's real CE10123 landed at a different position than
ours and was miscounted as **"TV-silent"** → mislabelled a false positive
on our side → "TV must accept it." It does not. (Whether TV's behavior also
changed between 2026-05-28 and 2026-06-02 is unknowable, but the isolated
single-construct probes above are unambiguous as of today, and that is what
our linter must match.)

### Fallout — `FUNCTION_PARAM_TYPE_OVERRIDES` is invalid

The whole point of G002 was to justify baking these "extra accepted types"
into pine-data via `FUNCTION_PARAM_TYPE_OVERRIDES` in
`packages/pipeline/src/generate.ts`. All five entries
(`nz.source`, `nz.replacement`, `fixnan.source`, `int.x`, `plot.title`) are
therefore wrong, and they cause real **false negatives**: our linter passes
`plot(title=<non-const>)`, `nz(<bool>/<string>)`, and `int(true)`, which TV
rejects. `plot.title` being widened to `series string` also *masks*
INV014's const-arg check for that param (it would otherwise fire).

Removing the overrides + regenerating pine-data + a corpus regression pass
is a base-type-axis change with broader impact than INV014, so it is its
own work item — tracked in `TODO.md`. See `investigations/INV014`.

## Lesson (the durable one)

Verify accepted-type questions with **isolated, single-construct** `--tv`
probes that read TV's structured `ctx` (it names the exact param and the
expected type), NOT with corpus position-diffs — `(line,col)` keying
silently flips real TV errors into apparent silence when the two linters
anchor a diagnostic at different columns. The reference + a direct probe
beat any heuristic over aggregate corpus output.

## References

- INV014 — const-arg enforcement; the work that disproved this gotcha.
- INV009 — its "zero real FNs" conclusion is overturned by the same
  evidence (the three "TV-accepted" cases are real CE10123 errors).
- [G001](G001-tv-pine-lint-not-spec.md) — the linter is unreliable as a
  *spec*; the complementary point here is that *corpus position-diffs* are
  unreliable as evidence about the linter.
- `packages/pipeline/src/generate.ts` `FUNCTION_PARAM_TYPE_OVERRIDES`
  (to be removed — see TODO).
