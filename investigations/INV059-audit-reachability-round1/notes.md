# INV059 - audit-error-reachability round 1: four findings, one root cause each

**Status: fixed 2026-06-10.** First run of `scripts/audit-error-reachability.mjs`
(the check-site half of #48's free slice) flagged 4 never-firing validator
sites. Probing classified them: one coercion-starved check, one duplicate,
two merely unexercised (one with wrong wording, one with wrong
severity/wording/anchor). All four TV-probed and fixed the same day.

Methodology note: the audit's first classification ("dead") was confounded
by the dev tooling - `test:snippet` does NOT inject `//@version=6` (you
must include the directive yourself), so v6-gated checks looked dead under
casual probing. `debug:internals` DOES inject it. The scratch-script trace
against the raw validator settled it.

## Finding 1: named-arg type mismatch starved by phantom coercions

`checker.ts`'s `Type mismatch for parameter ...` check never fired because
`isAssignable` accepted nearly every scalar cross-type pair via coercions
that do not exist in Pine v6: string->color ("red"), numeric->color (ARGB
ints), color->numeric, numeric->string (implicit tostring). They are
pre-methodology lore from early Pine versions.

**Probes (2026-06-10), all CE10123 on TV:**

- p01 `plot(close, color = "red")` -> TV
  `Cannot call "plot" with argument "color"="red". An argument of "literal string" type was used but a "series color"  is expected.`
  (anchored at the VALUE, 3:21)
- p02 `plot(close, color = 42)` -> same form, "literal int" vs "series color"
- p03 `plot(close, title = 42)` -> "literal int" vs "const string"

**Fix:** the cross-type coercions are gated behind a new `legacy`
parameter on `isAssignable`/`areTypesCompatible`, threaded as
`version !== "6"` from the checker's declaration/reassignment/binary/
ternary sites. v4/v5 keeps them - they were REAL in those versions: the
ungated removal drew 63 corpus appearances across 6 v4/v5 files
(`color == "green"` comparisons, string colors), all of which vanished
under the gate. One v6 corpus file (`044144d…`) still drew 6 appearances -
which exposed Finding 1b.

## Finding 1b (corpus-driven): import-alias destructures must type unknown

`044144d…` destructures `[pvsraColor, …] = trLib.calcPvsra(…)` - an
imported library call (#41's data gap). Elements defaulted to
`series<float>`, so `pvsraColor == vectorGreen` and
`plotcandle(color = pvsraColor)` drew 6 type errors on a file TV accepts
(compare-tv 2026-06-10: TV 0 errors).

**Fix:** `defineTupleVariables` defaults unclassifiable elements to
`unknown` instead of guessing `series<float>` - the interim option
recorded in INV049's residual / TODO #41. Corpus effect: -166 records
across 12 files, all the same FP family (bool/type errors on
lib-destructured elements), including `b369d637…` - the LAST entry in
TODO's over-strict bool table (now local 0 / TV 0, verified) - and 82
post-TV-stop cascade records on a broken-string file (INV047 class).
FN trade-off: TV resolves imports server-side so it CAN flag real misuse
of lib tuples; without the export data (#41) silence is our only sound
option.

## Finding 2: variadic too-few-args wording

`math.max(1)` fired our `'math.max' requires at least 2 arguments, got 1`;
TV says `Wrong number of args: 1` at the same anchor (p04, same-pos diff).
Adopted TV's wording. (The sibling too-MANY-args check still carries our
own wording - TV's not yet probed; queued in TODO #53.)

## Finding 3: plotshape shape= double-report

`plotshape(close > open, shape = shape.triangleup)` (p05) drew TWO local
errors - the generic `Invalid parameter 'shape'. Valid parameters: ...`
AND a special-case `Did you mean "style"?`. TV emits exactly ONE:
`The "plotshape" function does not have an argument with the name "shape"`
(anchored at the ARG NAME, 3:25). Removed the special case. Aligning the
generic check's wording/anchor with TV's is queued (TODO #53) - it fires
5738 times across the corpus and the exact anchor needs argument-NAME
positions, which the AST does not carry (CallArgument has no name
line/col).

## Finding 4: timeframe_gaps severity/wording/anchor

`indicator("x", timeframe_gaps = true)` without `timeframe` (p06): we
emitted a WARNING with invented wording at the call; TV emits an ERROR -
`"timeframe_gaps" has no effect because the "indicator()" call has no
"timeframe" argument` - anchored at the argument (2:42). Adopted all
three (anchored at the arg VALUE, which matches TV's column exactly
here).

## Result

- Audit re-run after fixes: **0 dead sites** (was 4); the 3 formerly-dead
  now fire from probes, and the INV059 regression fixtures pin them.
- Corpus: 0 new errors, -166 known-FP/cascade records (12 files);
  6 appearances on the one v6 file resolved by 1b. Baseline 17011 -> 16845.
- Fixtures: `INV059-v6-arg-type-coercions.pine` (6 asserted errors,
  count-enforced no-duplicates), `INV059-legacy-color-coercions.pine`
  (v5 stays clean).

## Residual (queued as TODO #53)

- CE10123 template alignment for arg-type errors (TV's
  `Cannot call "f" with argument "a"="v". An argument of "T1" type was
  used but a "T2" is expected.`) and the invalid-parameter wording
  (`The "f" function does not have an argument with the name "x"`) +
  anchoring both at the argument NAME/VALUE - requires the parser to
  record argument-name positions.
- Probe TV's too-many-args wording (our site fires 33x in corpus).
- The audit's "corpus-but-never-in-tests" list (5 sites) is fixture
  build-out work, same vein as #52.
