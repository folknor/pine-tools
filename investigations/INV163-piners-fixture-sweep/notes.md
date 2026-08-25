# INV163 - what sweeping piners' fixtures through pine-lint found

2026-08-25. Full write-up, including the findings that went the other
way, is `SWEEP-piners-tests-2026-08-25.md` at the repo root - it was
written to be forwarded. This records only the two defects that were
OURS and are now fixed, plus the one left open.

Method in one line: extract the Pine embedded in piners' Rust tests
(`scripts/extract-embedded-pine.mjs`), lint all 938 snippets, adjudicate
every cluster against `--tv`. 138 files errored locally; almost all of
those were piners' own non-TV extensions or non-Pine syntax, and three
clusters were ours.

## 1. A type keyword breaks a whole tuple destructuring. FIXED.

```pine
[line, signal, hist] = ta.macd(close, 12, 26, 9)
```

TV: clean. Us, before: FOUR errors - `Undeclared identifier "line"`,
then `"signal"`, then `Undefined variable 'hist'` at each use.

TradingView permits type keywords as variable names, and
`variableDeclaration` has special-cased that since
[INV031](../INV031-type-keyword-names/notes.md) (`var color color = na`).
`tupleDestructuring` never got the same treatment: the consume failed on
`line`, the whole statement threw, and **nothing in it was declared** -
which is why two of the four errors are about `hist`, a name that never
existed as far as the checker was concerned.

The fix admits a type keyword as a name when the next token ENDS the
element - a comma or the closing bracket. That lookahead is what keeps it
narrow, and both positions are covered by the fixture because they are
different tokens.

**This one was worth the sweep on its own.** The shape is idiomatic -
`line`, `signal`, `hist` are MACD's own output names - and a real corpus
script carried six of the errors: `bf691eef…`, at
`[color, trend_line, trend] = market_structure()`. That file now diffs
CLEAN against TV, having previously disagreed on six records.

## 2. Tuple reassignment cascaded redeclarations. FIXED.

```pine
[a, b, box] = ta.macd(close, 12, 26, 9)
[a, b, box] := ta.macd(close, 12, 26, 9)
```

TV: one error, `Mismatched input ":=" expecting set "="` at the `:=`.
Us, before: that same defect at that same position (with our own wording,
see #79) PLUS one `"<name>" is already defined` per name.

`[a, b] := ...` is not a declaration at all, but the node was still
running the redeclaration check over names the earlier `=` had legitimately
introduced. `TupleDeclaration.isReassignment` now marks the form and the
checker skips the check for it. A genuine duplicate (`[a, c] = f()` after
`[a, b] = f()`) still errors, which is the control.

### This half cannot be pinned by a fixture

Worth recording because I hit the trap I had documented earlier the same
day and only caught it by mutating. The cascade is a VALIDATION effect
sitting behind a PARSE error, and the fixture harness runs the validator
only when there are zero parse errors - so an `errors: N` directive on
such a fixture is vacuous. The first version of the fixture carried both
cells; suppressing the fix left it green.

So the fixture covers finding 1 only, where the file is parse-clean and
`errors: 0` is meaningful (mutation-verified: disabling the type-keyword
admission takes it to 12 errors). Finding 2 lives in
`probes/tuple-reassignment.pine` with its expected CLI output written into
the file. The harness limitation is in AGENTS.md.

## 3. Parse-error wording. FIXED.

We said `Unexpected token: )` where TV says `Syntax error at input ")"`,
at the same line and column, across ~40 files in the sweep. Sampled
against `--tv` before changing anything: every file agreed on the POSITION
and differed only in this string.

Two emission sites, both now using TV's template - the in-call unexpected
token in `parseCallArguments`, whose neighbouring branch already used it
(INV081), and the primary-expression fallback, which is where the sweep's
closure cases actually landed. Fixing only the first left the sampled
closure file unchanged, which is how the second was found.

**TV has a SECOND template and these must not be merged.** Where its
grammar has a specific expectation it says
`Mismatched input "X" expecting set "Y"` instead - a top-level `[a, b]`
wanting `=` (INV160), a tuple written with `:=` (INV044). Those have
their own emitters and are deliberately untouched. A blanket rename of
every parse message would have been wrong.

Corpus: 52 fixtures changed, **873 messages reworded at the same
position, 0 errors appeared or disappeared**. Almost all of those records
sit past TV's stop point on mangled-source files (INV025), so TV does not
adjudicate them either way; the measurable gain is on files where TV does
reach, where the sampled message disagreements went to zero. Baseline
re-snapshotted.

## Corpus

`regression-check`: 1 fixture changed, 6 errors disappeared, 0 appeared.
All six are finding 1 on `bf691eef…`, and `lint-batch --diff` on that file
now reports no disagreement with TV at all. That is the rare case where a
corpus change is itself the evidence, rather than something needing a
separate probe to justify.
