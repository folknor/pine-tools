# Cross-check sweep: piners' test fixtures through pine-lint

**Date:** 2026-08-25. **Direction:** both. **Oracle:** `pine-lint --tv`
(TradingView's `translate_light`) for every adjudication below.

## Why this was worth doing

`ta.fixnan` was found because one eleven-line piners fixture happened to
be run through pine-lint. That suggested the general case: the two tools
reach different conclusions from the same starting point, so a
disagreement between them is informative regardless of which side is
wrong. TradingView settles it.

**Corrected 2026-08-25, after the first version of this report got the
reason wrong.** It claimed the two catalogs are independently derived -
ours scraped from the reference, piners' built from `po`. They are not.
piners vendors this repo's `pine-data` snapshot, and it is byte-identical:
`functions.json`, `variables.json`, `constants.json`, `types.json` and
`keywords.json` all match by SHA-256 (`functions.json` is
`ddb0dae9…c852d76` on both sides). Same data, same date.

The real asymmetry is one layer up. pine-lint consumes that generated data
directly, with nothing between it and the checker. piners maintains a
hand-written registration table on top of it. That is a sharper diagnosis
than the one this report started with, and it strengthens rather than
weakens the conclusion - see the closing section.

Nothing in piners was modified. This is a read-only sweep.

## Method

1. Extract every Pine snippet embedded in Rust raw strings under
   `piners/crates` (`scripts/extract-embedded-pine.mjs`, in the pine-tools
   repo). 1,195 raw strings scanned, 938 written out after dropping 197
   non-script fragments, 24 carrying Rust `{Interpolation}`, and 36
   duplicates.
2. Lint all of them locally: **138 files with errors, 368 errors.**
3. Adjudicate each cluster against `--tv`.

Two extraction details that affect how to read the numbers. A snippet with
no `//@version` gets `//@version=6` synthesized, because piners'
`compile_source` supplies one and pine-lint's version gate would otherwise
answer "v1 not supported" for every file. And fixtures carrying Rust
interpolation were skipped entirely, so a handful of real shapes are not
covered here.

---

## Findings against pine-tools (ours) - 3

### 1. A type-keyword name breaks a whole tuple destructuring. FALSE POSITIVE.

```pine
//@version=6
indicator("t")
[line, signal, hist] = ta.macd(close, 12, 26, 9)
plot(hist)
```

| | verdict |
|---|---|
| `--tv` | **clean** |
| pine-lint | 4 errors: `Undeclared identifier "line"`, `"signal"`, then `Undefined variable 'hist'` twice |

`line` is a type keyword, and TradingView permits type keywords as
variable names - pine-lint already special-cases that for single
declarations (`var color color = na` is idiomatic and accepted) but not in
the tuple-destructuring path, where the first such name breaks the entire
statement and nothing gets declared. Replacing `line` with `a` is clean,
which isolates it.

This is the worst of the three: the shape is idiomatic, since MACD's three
outputs are conventionally named `line`, `signal`, `hist`. Ours to fix.

### 2. Tuple reassignment cascades. FALSE POSITIVES on top of a correct error.

```pine
[a, b] = f()
[a, b] := f()
```

| | verdict |
|---|---|
| `--tv` | 1 error at 6:8 - `Mismatched input ":=" expecting set "="` |
| pine-lint | 3 errors: `Syntax error at input ":="` at 6:8, then `"a" is already defined` and `"b" is already defined` at 6:1 |

The verdict is right and the position of the real error is right. The two
redeclaration errors are recovery noise TradingView does not emit - the
parse error leaves the recovery re-declaring names that already exist.
Ours to fix.

### 3. Parse-error wording does not match TradingView's.

pine-lint says `Unexpected token: )`; TradingView says
`Syntax error at input ")"`, at the same line and column. Seen across ~40
files in this sweep. Accept/reject agrees, so this is message alignment
only - the same class of work as INV081/INV083-085 - and lower priority
than the two above.

---

## Findings against piners - 2 classes

### 4. Five more `ta.`-prefixed names that do not exist in Pine

The same family as the already-confirmed `ta.fixnan` / `ta.nz`: a bare
Pine name that piners also registers under a `ta.` prefix TradingView does
not have.

| spelling | what Pine actually has | `po lookup` |
|---|---|---|
| `ta.hl2` | `hl2`, a top-level **variable** | no match |
| `ta.hlc3` | `hlc3`, a variable | no match |
| `ta.ohlc4` | `ohlc4`, a variable | no match |
| `ta.hlcc4` | `hlcc4`, a variable | no match |
| `ta.sum` | `math.sum`, a function | no match |

The first four are a sharper case than `ta.fixnan`, because the bare names
are **variables, not functions** - so the `ta.` spelling is not a
mis-namespaced function but a function standing where Pine has no function
at all.

Whether each is a deliberate convenience extension or the same inverted
registration is piners' call, not ours. 13 files under `crates/` mention
one of the seven names.

**Adjudicated by piners, 2026-08-25 (`85f0e16f`):** deliberate, with the
rationale recorded at the registration site and a machine-readable list.
The sharper framing above survived that check. One consequence they added,
which this sweep did not reach: piners' own request-fold fixtures call
`ta.hl2(high, low)`, so those tests exercise a shape no TradingView script
can write.

### 5. Fixtures written in syntax TradingView rejects

Not defects in the runtime, but worth knowing if any of these fixtures are
read as describing Pine:

| shape | example | `--tv` |
|---|---|---|
| anonymous closures | `bump = () => ...` | `Syntax error at input ")"` |
| return-type annotations | `f(int x) -> bool => x + 1` | `Syntax error at input "x"` |
| generic functions | `identity<T>(T value) -> T => value` | `Syntax error at input "("` |

206 extracted fixtures use `=>` closure syntax. pine-lint rejects all
three shapes too, at the same positions, differing only by the wording in
finding 3.

**This report under-framed this finding, and piners' reading of it is the
better one (`85f0e16f`).** They re-confirmed all three against `--tv`
independently rather than taking the report's word, and checked the
opposite direction too: the vendored TradingView libraries are real
platform code and use only the plain named form.

The reason it outranks finding 4: a phantom NAME is one table row, while a
phantom CONSTRUCT is a grammar carried by the parser, typechecker,
importer and inliner at once. And a catalog gate that compares names -
which is what a data-driven completeness check does - is structurally
blind to the entire class, because there is no name to compare.

They did not change the features, on the grounds that whether the superset
is intended is a product decision and there is real machinery behind
closures reaching the library export surface, so deliberate is at least as
plausible as accreted. What they could establish is that the choice was
never written down, and that at least one past reader took these for Pine:
a standing item asked for closure capture semantics to be confirmed
against the TradingView oracle, a question that has no answer because
TradingView cannot parse the construct.

### Not findings

The bulk of the 246 unresolved-name errors are piners' documented non-TV
TA extensions - `ta.dema`, `ta.kama`, `ta.trix`, `ta.vortex`,
`ta.aroon`, the oscillator family and so on. piners' own notes record
these as intentional and as not shadowing any TV-real name, and this
sweep agrees: none of them collides with a real Pine name. They are
listed here only so the count is accounted for.

---

## What this says about the cross-check itself

The two tools' errors are **not correlated**, which is what makes this
worth repeating. In this sweep pine-lint was wrong in ways piners is not
(tuple destructuring, recovery cascades) and piners is wrong in ways
pine-lint cannot be (a registered name TradingView lacks).

The reason is not different data - the snapshot is byte-identical, as
above. It is that the two tools have different amounts of machinery
between that data and their verdict:

- **pine-lint has none.** The catalog is generated from the reference and
  read directly, so it cannot invent a name that has no reference page.
  It also cannot correct one: where the reference under-documents or
  misnames something, we inherit that silently with no independent check,
  and our blind spot is exactly the shape of TradingView's documentation.
- **piners has an interpretation layer** - a hand-maintained registration
  table, plus a parser, typechecker, importer and inliner that can accept
  grammar the platform does not have. Every one of those can drift from
  the shared data in a direction the data cannot detect.

So the two blind spots are structurally different, which is the whole
value of running one tool's fixtures through the other. A disagreement is
evidence about one of them and `--tv` says which; agreement is evidence
about neither, since both read the same catalog and would inherit the same
documentation gap together.

It also predicts where each tool's next defect will be found. Ours will
come from the reference being wrong or thin. Theirs will come from the
layer above the data - which is exactly what findings 4 and 5 are, one in
the registration table and one in the grammar.

## Reproducing

```bash
node scripts/extract-embedded-pine.mjs /home/folk/Programs/piners/crates
node scripts/lint-batch.mjs --errors-only --quiet .cache/embedded-pine
node scripts/lint-batch.mjs --diff <file>      # adjudicate one file against TV
```
