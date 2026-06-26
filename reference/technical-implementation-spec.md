# Technical implementation specification

The single document from which an open TODO item is built to completion without
re-deriving its design. Two implementers working from it independently produce
the same artifact.

## What it is

1. **Every brick.** It lays each step on the road from the current code to the
   finished item. No step is left to discover during implementation.
2. **Obstacles resolved inline.** Anything blocking the road is solved in the
   document, as part of it. An unresolved obstacle is a missing brick.
3. **No deferral.** Nothing in the originating TODO is pushed to "later" -
   deferred work is a hole in the road. (Work that belongs to a genuinely
   separate TODO is named and excluded; that is not deferral.)
4. **No shoehorning.** We do not fit the work into existing abstractions,
   structures, or conventions because they already exist. The structure that
   best serves the end goal is the one we build; whatever stands in its way is
   ripped out and rebuilt. Breaking any internal API (parser, analyzer, checker,
   pipeline) is legal - the only frozen contract is the generated `pine-data`
   shape downstream consumers read, and TV's observable verdicts.

## What it must also pin (or it is aspiration, not a spec)

5. **Verification per brick.** Every change names its gate, matched to what the
   change can break:
   - **TradingView v6-validity parity** for anything touching parser, lexer,
     checker, or type semantics - the change must agree with TV on the repro
     (via `pine-lint --tv` / `pnpm run debug:compare -- <file>`), or be a
     deliberate, documented disagreement (an `investigations/INV###` with the
     probe and TV's dated output, per the methodology - TV silence is evidence,
     not authority). Corpus-wide, the gate is the FP/FN sweep
     (`pnpm run lint:failures -- --concurrency 4` then `pnpm run lint:categorize`):
     no new false positives, named expected false-negative fixes.
   - **The regression baseline** (`lint-reports/local-baseline.json`) for
     anything that risks shifting corpus output: `pnpm run lint:regression` must
     report zero new error appearances; every disappearance is a known FP being
     fixed, not a real positive lost. Re-snapshot with `pnpm run lint:snapshot`
     only once the change is accepted.
   - **Named `pnpm test` cases** (vitest + `@expects` regression fixtures under
     `packages/core/test/fixtures/`) for behavior neither parity nor the corpus
     reaches.

   A brick whose load is unproven is not laid. Per gate, the spec contains the
   EXACT command to run - copy-pasteable, flags and all, not "run the relevant
   tests". If no command exists that can verify a gate (no corpus file exercises
   it, no fixture pins the behavior), building that instrument - a minimal
   `.pine` repro fixture with its `// @expects` directives, or a `--tv` probe
   recorded in an INV - is itself a brick of the spec, specified to the same
   standard and laid before the brick it gates.
6. **A keep/revert path.** The implementation unit is one coherent, fully
   intrusive change that lands and is then kept or reverted on its gate
   results - never a tiny gated probe or an env-var experiment switch. The
   sequence of such landings is ordered so `pnpm test` and `pnpm run
   lint:regression` both stay green at every boundary between them.
   Complete-but-unorderable is a failed spec.
7. **The target as concrete artifacts.** "The ideal structure" is pinned to
   exact types, signatures, ownership, and data flow - buildable, not merely
   directional. For data-driven facts, name whether they belong in the parser
   (grammar fundamentals) or in generated `pine-data` (API data) per the
   Data-vs-Syntax split in AGENTS.md; never embed a language-fact table in the
   checker.
8. **A survey of the ground.** The current structure and everything depending on
   it is inventoried before the teardown, so the rip is precise and drops no
   load-bearing work. Specs authored as a batch reconcile their surveys against
   siblings covering the same ground before any is implemented; a sibling's
   survey may already state the fact that refutes this spec's premise.
9. **A stopping rule.** The rebuild has a bounded blast radius. Where the
   teardown stops, and what is out of scope, is stated explicitly.
10. **The standing references.** Every spec MUST cite, by path: this document
    (`reference/technical-implementation-spec.md`) as the contract it is
    written against; the document the spec was spawned from (the TODO source
    naming the item - the `TODO.md` entry, or the `investigations/INV###` it
    derives from); AND the standing obligations the work discharges -
    `CLAUDE.md` and `AGENTS.md`, specifically the **Methodology** section ("we
    aim to be MORE correct than TradingView's pine-lint"), the hard rules, and
    the Data-vs-Syntax architecture. A spec citing the methodology must also
    direct its reviewers and implementers to READ it, not merely name it - those
    obligations are the bar the work is judged against. A spec missing any of
    the three is incomplete.

    The **measurement record** is the regression/parity ledger, not a
    performance file (pine-tools is a static analyzer; throughput is not the
    axis). A spec whose changes touch corpus output cites it and updates it at a
    minimum twice: before implementation (the baseline the keep/revert verdict
    will be read against - `pnpm run lint:snapshot`, and the current FP/FN
    counts in `lint-reports/failures-by-category.json` plus the dated
    measurement paragraph in `TODO.md`) and after landing (the re-snapshot and
    the refreshed counts). A spec off every corpus-affecting path owes the
    ledger no update; it states that, and names the gate (a clean
    `pnpm run lint:regression`) whose unchanged result confirms neutrality.

## Stance

- **Structural over micro.** The spec pursues the structural change that
  materially moves the goal - real correctness and TV-parity for checker work,
  real capability for feature work - not local tweaks. Full rewrites are labeled
  as such, distinct from local changes.
- **Cleanliness is a deliverable.** No env-var scaffolding, debug knobs, or
  temporary routing switches left as the way forward.
- **Aggressive internal rewrites assumed.** Old abstractions earn no protection
  from age; shared abstractions and generic reuse are not goals in themselves.
  Correctness and maintainability of the *result* still hold, as does the
  Data-vs-Syntax discipline (the generated JSON stays the self-contained source
  of truth; the checker reads facts, it does not hardcode them).
