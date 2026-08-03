# INV142 - strategy.exit inter-parameter argument groups

**Date:** 2026-08-03
**Status:** fixed
**Code:** `packages/pipeline/src/generate.ts` (`ARG_GROUPS`, index.ts emission),
`pine-data/schema/types.ts` (`FunctionFlags.argGroups`),
`packages/core/src/analyzer/builtins.ts` (`getArgGroups`),
`packages/core/src/analyzer/checker-calls.ts`, regenerated
`pine-data/v6/functions.{ts,json}`

## Scope

TODO #65. Reported externally in `../freedom/FINDINGS.md` finding 2: we accepted
`strategy.exit(..., trail_price = ...)` with no `trail_offset =`, which TV
rejects. A genuine **tv-only error class** - the kind our sweep reports 0 of,
because the corpus is published WORKING scripts and a shape TV rejects cannot
appear in one. That is the #48/#52 blind spot, not a gap in the sweep.

## Probes (`pine-lint --tv`, 2026-08-03)

Scripts are in `probes/`, run with `node scripts/lint-batch.mjs --diff
investigations/INV142-strategy-exit-arg-groups/probes`.

| probe | shape | TV |
|---|---|---|
| p01 | `trail_price` alone | **error** |
| p02 | `trail_price` + `trail_offset` | clean |
| p03 | `stop` + `trail_price` | clean |
| p04 | no exit params at all | **error** |
| p05 | `trail_points` + `trail_offset` | clean |
| p06 | `trail_offset` alone | **error** |
| p07 | `profit` alone | clean |
| p08 | `trail_points` alone | **error** |
| p09 | `profit = na` explicitly | clean |
| p10 | `profit` supplied positionally | clean |
| p11 | `trail_price` positional, no offset | clean |
| p12 | violating call INDENTED in an `if` | error at **6:5** |

TV's wording, verbatim:

```
strategy.exit must have at least one of the following parameters: "profit",
"limit", "loss", "stop" or one of the following pairs: "trail_offset" and
"trail_price" / "trail_points". To close the position at market price, use
"strategy.close"
```

Four of the twelve disagreed with the local validator before the fix, so `--tv`
demonstrably answered rather than returning an empty/fallback result, and the
eight clean ones bound the rule rather than the surrounding scaffolding.

### Three things re-probing established that the report did not

Worth separating, because the reported finding was a lead and not all of it
survived contact:

1. **The quoted message was TRUNCATED.** FINDINGS.md ends it at
   `"trail_price" / "trail_points".`; TV actually continues
   `To close the position at market price, use "strategy.close"`. Aligning to
   the report's text would have left a permanent same-position message
   disagreement.
2. **Presence is SYNTACTIC, not value-based (p09).** `profit = na` is clean on
   TV even though the value is na. This is the load-bearing fact: a value-based
   rule would not be statically checkable at all, whereas a syntactic one is
   exactly checkable. It also means the rule is about what the call WRITES.
3. **A positional `trail_price` can never violate the rule (p11).** Reaching it
   positionally requires writing profit/limit/loss/stop first, even as `na`, and
   by (2) those count. p11 was originally intended as a positional counterpart
   to p01 and is confounded as such - but it is retained, because what it
   actually demonstrates is (2) from the other direction.

Anchor is the callee's start, not the statement's: p12 puts a violating call at
indent 4 inside an `if` and TV reports 6:5.

## The rule

Satisfied if ANY of these combinations is fully supplied:

```
profit | limit | loss | stop | (trail_offset AND trail_price)
                             | (trail_offset AND trail_points)
```

## Where it lives

The reference documents no such constraint - `strategy.exit`'s remarks describe
the trailing pair's behavior but never say a call must carry one of these, and
`"at least one of"` appears nowhere in the function catalog. So there is nothing
to scrape, and per the pipeline rule for facts the reference under-documents it
is probed and baked into the data instead of the checker.

The existing param schema expresses only PER-PARAMETER facts (`required`,
`allowedValues`, `min`/`max`), so this needed a new shape rather than a new
value: `FunctionFlags.argGroups = { message, anyOf: string[][] }`, where each
`anyOf` entry is a combination whose members must all be present. That
generalizes to any "at least one of / or one of these pairs" rule; only
`strategy.exit` populates it today. TV's own message is carried in the data, so
the checker holds no wording of its own.

Guards match the neighbouring CE10165 check: v6 only (G004 - pine-data ships v6
signatures), and skipped for recovery-truncated calls, whose arguments are
incomplete rather than absent.

## A pipeline footgun found on the way

`pnpm run generate` rewrites `pine-data/v6/index.ts` from a fixed template that
omitted `export * from "./libraries"`, so every `generate` silently dropped
`LIBRARY_EXPORTS_BY_PATH` from the barrel - disabling imported-library
validation (#53/#41's whole data layer) until someone noticed. `generate:libraries`
did NOT put it back, so the two-step refresh in AGENTS.md did not heal it either.
The template now emits the export keyed on whether `libraries.ts` exists, so a
tree that has never run the libraries step still compiles and one that has keeps
its export. Unrelated to argument groups; found because the regeneration diff
showed a deletion nobody asked for.

## Verification

- 12 probes, all at 0 local-only / 0 tv-only after the fix.
- The original external repro reproduces exactly:
  `trail_bare.pine:9:1` with TV's message, while `trail_complete.pine`,
  `trail_accompanied.pine` and `trail_stoponly.pine` all stay clean - so the
  verdict is about the missing offset, not the scaffolding, and there is no
  over-rejection.
- Regression fixture
  `packages/core/test/fixtures/regression/INV142-strategy-exit-arg-groups.pine`
  (one violating call plus five valid shapes) compared against TV: 1 error each
  side, same position, same message.
- `regression-check.mjs`: **0 changed fixtures, 0 new error appearances** over
  1879 fixtures - and 111 corpus fixtures do call `strategy.exit`, so that is
  real coverage of the new check rather than silence from it never running.
- Full vitest: 440 passing.

## Not adjudicated here

FINDINGS 3 (piners EXECUTES an offset-free trail leg, and it dominates - 23 of
29 exits, ~5x pnl swing) is a runtime FILL-semantics question. `--tv` settles
compilation only, so nothing in this investigation speaks to it.
