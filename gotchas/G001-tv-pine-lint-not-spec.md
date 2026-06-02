# G001 - TradingView's pine-lint is not a stable spec

**Keywords:** pine-lint, --tv, TradingView, reference-not-spec,
non-determinism, error-recovery, warning-vs-error

## Observation

`pine-lint --tv` (and the underlying TradingView linter it proxies) is
unreliable in ways that make matching it a bad goal. Concrete failure
modes we have personally observed in this project:

- **Stops at the first error.** A single bad token early in a file
  often produces one error in TV's response and silences everything
  else. We have a fixture (`0c053259…pine`) where TV reports 1 error at
  line 61 (`series float source` - invalid type qualifier in a function
  parameter) and a *real* user-visible bug at line 197 is masked
  entirely.
- **Blames whitespace for distant syntax errors.** Known anecdotally
  from real Pine development: a missing `)` several lines up surfaces
  as a complaint about indentation/whitespace at the next token. Don't
  trust TV's error *location* - verify against the source.
- **Non-deterministic on identical input.** Re-submitting the same
  script can yield slightly different responses (we've seen warning
  sets shift; less commonly, error sets shift). Don't treat a single
  `--tv` run as authoritative; spot-check if a finding looks important.
- **Escalates warning → error based on operand origin.** The same
  syntactic shape gets different severity depending on whether the
  operand is a literal vs computed/series:

  ```pine
  x = 123 or false       // → error (TV stops or flags)
  y = some_series or true // → warning (TV emits CW about bool param)
  ```

  Both should arguably be the same level. We do not have a clean rule
  for when TV escalates; treat the difference as a TV quirk, not a
  meaningful semantic distinction.
- **Silently accepts nonsense expressions.** Cross-type ternary
  branches like `cond ? 1 : color.red` or `cond ? "x" : 3.14` produce
  no error and no warning. The resulting value has no usable type, but
  TV is happy. See INV001.

## Lesson

`--tv` is a *comparator* - useful to surface discrepancies we should
look at - and never a source of truth. Workflow:

1. Find a disagreement via `scripts/find-real-failures.mjs` or
   `scripts/compare-tv.mjs`.
2. **Read the actual Pine code** at the disagreement site. Is the
   expression sensible code that TV is wrong to flag, or nonsense that
   TV is wrong to ignore?
3. Decide based on the code, not on TV's verdict.
4. Record the decision in an investigation
   (`investigations/INV###`) so future-us doesn't repeat the analysis.

This is the foundational gotcha behind the methodology in
[CLAUDE.md](../CLAUDE.md). When in doubt, re-read this and INV001.

## References

- INV001 - the canonical example of TV being wrong to be silent
  (cross-type ternary branches).
- `scripts/compare-tv.mjs` - the per-file repro tool that surfaces
  TV-vs-us discrepancies.
- `scripts/find-real-failures.mjs` - the corpus-wide TV diff (notes
  that its `localOnly` / `tvOnly` labels are navigation aids, not
  verdicts).
