# G002 - TradingView's reference under-documents accepted param types

**Keywords:** reference-vs-linter, overloads, accepted-types, nz, fixnan,
na, int, plot, FUNCTION_PARAM_TYPE_OVERRIDES, SUPERSEDED, swallowed-tv-failure,
failed-probe-misread, stale-override

## SUPERSEDED 2026-06-02 - the widenings were a swallowed `--tv` failure

This gotcha recorded that TV's *linter* accepts more param types than its
*reference* documents, verified with `pine-lint --tv` on **2026-05-28**
(commit `71f6122`). As of **2026-06-02**, direct isolated `--tv` probes show
TV now **flags every one** with CE10123:

| isolated `--tv` probe | claimed 2026-05-28 | actual 2026-06-02 |
|---|---|---|
| `plot(title=syminfo.tickerid)` (simple string) | accepts | **CE10123** - `const string` |
| `plot(title=str.tostring(close))` (series string) | accepts | **CE10123** - `const string` |
| `nz(close > open)` (series bool) | accepts | **CE10123** - `simple int` |
| `nz(syminfo.tickerid)` (simple string) | accepts | **CE10123** - `simple int` |
| `int(true)` | accepts | **CE10123** - `simple int` |
| `na(close > open)` | universal | **CE10123** - `simple float` |

Stable on re-runs (not TV flakiness), reproduced in full-file context, and
control `plot(title="ok")` is clean. So as of today the reference is NOT a
lower bound the linter widens - TV enforces these types (and qualifiers)
exactly.

### Why it differs from 2026-05-28 - a measurement error, not a TV change

Two dated `--tv` measurements, opposite results, five days apart:

- **2026-05-28** (commit `71f6122`): *"Differential-tested ... all three are
  TV-ACCEPTED."*
- **2026-06-02** (probes above): all flagged with CE10123.

A production type-checker does not flip basic rules in two days, so the likely
options are (a) the 2026-05-28 measurement was wrong, or (b) the 2026-06-02
measurement is wrong. **(b) is ruled out:** `pine-lint --tv` flags
`nz(close > open)` while our *local* validator does not (we skip union params),
and `--tv` cleanly accepts the valid `nz(close)` - so `--tv` is genuinely
hitting TradingView (not echoing local) and discriminates valid from invalid.
The 2026-06-02 result is sound.

That leaves **(a): the 2026-05-28 measurement was wrong** - and there is a
concrete, code-grounded mechanism (no TV change needed). On a network failure
`pine-lint --tv` *used to* print `{success:false, errors:[]}` to stdout
(cli.ts), and the diff tooling reads `result?.errors ?? errors ?? []`
(`find-real-failures.mjs:59`, `compare-tv.mjs:36`) → `[]` → "TV reported no
errors" → recorded as **"TV accepts."** A single transient `--tv` failure on
2026-05-28 would produce exactly the false "TV-ACCEPTED" verdict for the
constructs probed at that moment. I can't *prove* that is what happened (no
logs from then), but it requires no TV behavior change, unlike the alternative.
**This hole is now fixed:** a failed `--tv` probe emits nothing on stdout and
exits non-zero, so it can never be parsed as a clean result. The 2026-05-28
*reasoning* was fine; the tooling could silently feed it a failed probe.

### Why it persisted silently - a permanent override with no re-check

The bad measurement then survived because it was baked into pine-data as a
**permanent** override (`FUNCTION_PARAM_TYPE_OVERRIDES` in
`packages/pipeline/src/generate.ts`), with no expiry, no re-verification guard,
and no test that would fail when it diverged from TV. So the false "accepts"
became a silent false-negative source: our linter passed
`plot(title=<non-const>)`, `nz(<bool>/<string>)`, `int(true)`, which TV
rejects.

**Resolved (INV015):** the override map is emptied and pine-data regenerated.
`plot.title` is back to `const string`, so INV014's const-arg check now flags
`plot(title=<non-const>)`. The `nz`/`fixnan`/`int` cases revert to *union*
types (`series int/float/color`, `series int/float`) the checker still skips
(it passes over union-typed params - the INV013 safety net), so those
base-type FNs await union-param validation - TODO #28.

## Lesson (the durable one)

1. **A failed external probe must not be parseable as a clean result.**
   `errors: []` from a crashed/timed-out `--tv` call is indistinguishable from
   "TV reported no errors" - that ambiguity manufactured this entire false
   gotcha. Fixed: `--tv` failures now emit nothing on stdout + a non-zero exit.
   When recording a TV verdict, confirm TV actually answered (`success:true` /
   real output), not just that the error list was empty.
2. **Don't bake a TV-only verdict into pine-data permanently** without a dated,
   re-runnable probe guarding it - a one-off measurement frozen as a permanent
   fact has nothing to catch it when it was wrong (or later changes).
3. When a current `--tv` finding contradicts a dated note, re-probe in
   isolation, confirm `--tv` disagrees with our local validator (proving it's
   really TV), and prefer "the earlier *measurement* was wrong" over "TV
   changed" - a mature linter rarely flips basic rules in days.

## References

- INV014 - const-arg enforcement; surfaced that TV now flags `plot.title` and
  the na/cast family while auditing const params.
- INV015 - removed the stale overrides this note had justified.
- INV009 - its *original* "these are real FNs" reading matches today's TV; its
  2026-05-28 "TV-accepts" correction was a `--tv` measurement error (likely a
  swallowed network failure read as empty errors).
- [G001](G001-tv-pine-lint-not-spec.md) - TV's pine-lint is an unreliable
  comparator; this gotcha shows a second-order trap: the *tooling* around it
  silently turned a failed probe into a false "TV accepts."
- `packages/pipeline/src/generate.ts` `FUNCTION_PARAM_TYPE_OVERRIDES`
  (now empty - see INV015 / TODO #28).
