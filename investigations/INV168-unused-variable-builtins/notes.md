# INV168 - UNUSED_VARIABLE on built-ins (disproved), and the if-expression walk gap it exposed

Date: 2026-08-25. Scope: TODO #73's remaining half.

## The claim under test

AGENTS.md has carried this as a Known Limitation for a long time:

> **Built-in unused variable warnings** - The core validator
> (`UnifiedPineValidator`) incorrectly reports built-in variables/keywords as
> "declared but never used". This is a bug in the unused variable detection
> logic that needs to exclude built-ins from the check. Location:
> `packages/core/src/analyzer/checker.ts`.

INV158 restated it and left it open ("that bug is separate and still open"),
and TODO #73 carried it forward after INV166 settled the stage question. It
had never been reproduced in an investigation - it was inherited prose.

## Verdict: it does not reproduce, and it cannot

Two independent reasons, both checked.

**1. Both implementations mark built-ins used at define time.**
`SymbolTable.initializeBuiltins` (`analyzer/symbols.ts`) defines every
built-in variable, function, reserved keyword, and namespace with
`used: true`, so `getAllUnusedSymbols` can never return one. The
SemanticAnalyzer's own copy of the rule never sees a built-in at all: its
`declaredVariables` map is populated only from `VariableDeclaration`,
`TupleDeclaration`, and function parameters.

**2. The named location is dead code.** `checker.ts`'s
`checkUnusedVariables` emits a `DiagnosticSeverity.Warning`, and both
consumers of `UnifiedPineValidator.validate` keep only errors: the CLI
filters `severity === DiagnosticSeverity.Error` when building
`validationPineLintErrors`, and the language service's diagnostics feature
filters `error.severity === 0`. Nothing that rule produces can reach a
user. The one rule that does reach users is the SemanticAnalyzer's.

That also explains how the note survived: the LSP used to compare against
the LSP severity convention (Error = 1) rather than the core one (Error = 0),
which surfaced validator WARNINGS as errors - fixed as a lateral finding in
INV061. Before that fix, this rule's output was visible.

### The sweep

`sweep.mjs` (in this directory, offline, needs a prior `pnpm run build:tsc`)
runs the SemanticAnalyzer over all 1879 corpus fixtures plus every test
fixture and vendored library - 2257 files - and reports every
UNUSED_VARIABLE whose name is in the catalog's built-in set (132 bare names
across variables, functions, constants, keywords, types, annotations, and
namespaces).

Result: **15 hits, all of them correct**. Every one is a user declaration
that happens to shadow a built-in name and is genuinely never read -
`hl2   = (_high + _low) / 2.0` with no other `hl2` in the file,
`text = "Line 1"`, `size = array.size(prices)`, `var line line = na`. The
declaration exists, the name is unused, the warning is right. Not one hit is
a built-in being warned about on its own.

**Conclusion: remove the limitation from AGENTS.md.** It was accurate about
a code path that no longer reaches output, and inaccurate about the rule
that does.

## What the sweep did find: if-expression branches were never walked

`analyzeExpression` in `semanticAnalyzer.ts` had a case for every
`Expression` variant except `IfExpression` - the if/else in expression
position (`x = if cond` / branches), which INV031 added to the parser. The
whole subtree was therefore invisible to the analyzer.

Minimal repro (`probes/p1-unused-in-if-expression.pine`):

```pine
//@version=6
indicator("p1")
var aa = 10
var bb = 5
var cc = 7
x = if aa > bb
    cc
else
    aa
plot(x)
```

Before the fix, `pine-lint -H` reported `aa` and `cc` as declared but never
used, though both are read three lines below. (`bb` escaped only because it
is in `isCommonlyUsedVariable`'s whitelist as the Bollinger-bands
abbreviation - see the lateral finding below.) TV, 2026-08-25: clean, as it
is for every unused variable.

Two consequences, not one:

1. **UNUSED_VARIABLE false positives** - identifiers read only inside a
   branch or the condition were never marked used.
2. **Missing CW10013 / CW10018 / CW10003** - the branches are a scope, and
   a series-gated condition makes them a CONDITIONAL scope, so a shadowing
   declaration, a `[]` read of a branch-local, and a history-dependent call
   in a branch all draw TV warnings we did not emit.

### The fix

`analyzeIfStatement`'s body became `analyzeIfBranches(statement:
IfStatement | IfExpression)` and `analyzeExpression` gained an
`IfExpression` case that calls it. This is the correct sharing rather than a
coincidence: the parser builds an if-expression with the statement
machinery and re-tags it, so the branch arrays already have IfStatement's
shape (the AST's own `IfExpression` comment says so).

### Measurement (2257 files, before -> after)

| warning | before | after |
|---|---|---|
| UNUSED_VARIABLE | 6915 | **6263** |
| CW10002 | 802 | 802 |
| CW10003 | 409 | **411** |
| CW10013 | 205 | **211** |
| CW10018 | 209 | **210** |
| CW10001 / CW10004 / CW10011 | 143 / 136 / 15 | unchanged |

**652 false positives removed; 9 warnings added, in three classes.** All
nine were probe-verified against TV rather than assumed - a new warning on
the `analysis` stage is a claim about TV, and this rule's standing contract
makes a false positive worse than a miss.

### TV verification of the 9 new warnings

Probes in `probes/`, run with `pine-lint --tv`, 2026-08-25:

- `p2-cw10003-in-if-expression.pine` - `cmf = if compIn and nzVolume > 0` /
  branch calling `math.sum` twice. **TV: 2 warnings, `8:5` and `8:28`,
  "The function "math.sum" should be called on each calculation for
  consistency...".** We now emit both at the same positions with the same
  wording. This is the reduced form of the corpus carrier
  `baebbbf69b00...pine` (whose reported lines are `\r\r\n`-doubled, G005).
- `p3-cw10013-shadow-in-if-expression.pine` - `l = 10` at global scope,
  `l = 20` inside an if-expression branch. **TV: 1 warning at `5:5`,
  "Shadowing variable "l" which exists in parent scope...".** Match.
- `p4-cw10018-local-history-in-if-expression.pine` - `isOrderOpen` declared
  in a branch and read as `isOrderOpen[1]`. **TV: 1 warning at `5:5`,
  "The variable "isOrderOpen" is declared in local scope...".** Match.
- `p1-unused-in-if-expression.pine` - **TV: clean.** We are now clean too;
  before the fix we emitted two UNUSED_VARIABLE records here.

All four also show `0 local-only / 0 tv-only` on `lint-batch --diff`.

### Corpus gates

- `regression-check.mjs`: **0 changed fixtures / 0 new error appearances**
  against a freshly re-taken baseline (770 fixtures with errors / 7093 error
  records - the figures TODO records for 2026-08-25).
- Full `lint:failures` TV sweep, 748 v6 fixtures: errors **29 local-only /
  0 tv-only / 1 same-position message pair**, byte-identical to the window
  recorded since 2026-06-28. Warnings: **local-only 41 -> 12**, **tv-only
  stays 0**. So the change removed 29 local-only warning records and bought
  no false positives with them.
- Full vitest: 473 passing (472 + this investigation's fixture).

### Regression fixture

`packages/core/test/fixtures/regression/INV168-if-expression-branches-analyzed.pine`
pins both halves and was verified to go red when the `IfExpression` case is
removed: the two CW warnings vanish and three spurious UNUSED_VARIABLE
records appear in their place.

## Lateral finding, NOT acted on: the `isCommonlyUsedVariable` whitelist

`checkUnusedVariables` suppresses the warning for 40 hardcoded names -
`ma`, `sma`, `bb`, `atr`, `c`, `col`, `up`, `down`, `buy`, `sell`, `show`,
`plot`, `src`, `len`, `length`, `period`, `mult`, and so on - matched
case-insensitively. Its comment justifies them as "input parameter names
that may appear unused but are actually used by plots or external
references".

That justification does not hold. If a plot uses the variable, the
identifier appears in the plot call and usage tracking marks it used; Pine
has no external-reference mechanism for a local binding. The real cause of
the noise it was papering over is the walk gap fixed above - which is why
`bb` was silent in the repro while `aa` and `cc` warned, an inconsistency
no author could predict.

Measured cost of removing it, taken on the PRE-fix build so it is an upper
bound: **+103 warnings over the 2257 files, 33 additional distinct names**.
Spot-checking those additions found the `close`/`open` pair in
`fcb5e184e7a0...pine` - which turned out to be the walk gap again, not a
whitelist question.

Left for a decision rather than removed here: it is a deliberate
recall-versus-noise trade-off on the one channel whose contract says a false
positive is worse than a miss, and the argument for removing it is much
stronger now that the FP class it was masking is gone. Tracked in TODO #73.

### REMOVED 2026-08-27, and the framing above was wrong

**It was never a recall-versus-noise trade-off.** The list suppressed by NAME
unconditionally - usage tracking has already marked genuinely-used variables
as used before `isCommonlyUsedVariable` is consulted - so every warning it
removed was on a binding that really is never read. Removing it adds TRUE
positives, not false ones, and the "a false positive is worse than a miss"
contract has no purchase here. That mischaracterization is the only reason
this sat open for two days as a judgement call; it was an ordinary
measurement.

**Re-measured post-fix, and the +103 was mostly the walk gap.** Over the 1879
corpus fixtures the delta is **+9**, across 8 distinct names
(`sma`x2, `length`, `buy`, `ema`, `c`, `rsi`, `src`, `multiplier`). The +103
figure in the section above was taken on the PRE-fix build, where the
IfExpression walk gap was inflating unused-variable reporting generally; it
was an upper bound and it was a loose one.

**All nine hand-verified genuinely unused**, not assumed:

- Seven have zero other mentions of the identifier anywhere in the file.
- `sma = ON` (`8439b23…:156`) has 27 other `sma` occurrences and every one is
  `ta.sma(...)` - the builtin, not the local. A word-boundary search matches
  after the dot, which is a trap worth naming for the next person doing this.
- `buy = low + atr` (`4d78be7…:1032`) has one other occurrence, inside a
  string literal (`'Display internal buy and sell activity'`).

`checkUnusedVariables` now warns whenever a declared name is unused, and the
function is deleted rather than left unreferenced.

Pinned by
`packages/core/test/fixtures/regression/INV168-no-name-whitelist-for-unused.pine`,
mutation-verified red (5 warnings -> 0 with the list restored). Its controls
deliberately carry whitelisted names too - `source` and `period`, both read -
because the distinction under test is USE, not spelling. Writing it turned up
one more thing worth keeping: `plot = true` does NOT warn, because a later
`plot(...)` call marks the name used. That is correct, and it is a small live
example of the very mechanism the list's justification denied.

## The collect-side twin, FIXED 2026-08-27

The lead recorded here as "also noted, not fixed" turned out to be the same
gap in the second walker, and one of its two consequences was a real false
negative rather than the harmless miss this note predicted.

`collectDeclarationsInStatement` recursed only through `childStatements`,
which yields the branch arrays of an `IfStatement` but knows nothing about an
`IfExpression` - that node lives in a `VariableDeclaration.init`,
`TupleDeclaration.init` or `AssignmentStatement.value`, all expression
positions. So no declaration inside an `x = if cond` branch was ever
collected.

Two consequences, and the second is the one this note got wrong:

1. **UNUSED_VARIABLE could not fire inside such a branch.** As predicted, a
   silent miss: a name never collected is never warned about.
2. **The branches propagated no series-conditional context.** A `:=` to an
   OUTER `var` performed under a SERIES-gated if-expression did not mark that
   variable series, so the discriminant it later feeds did not make a `ta.*`
   call conditional. That is a missing CW10003 - the TV-mirroring channel, so
   a genuine false negative, not a typing detail.

### TV verification

Probed 2026-08-27. TV emits the warning at the same position and wording:

```pine
//@version=6
indicator("t")
var int state = 0
x = if close > open
    state := 1
    1.0
else
    0.0
y = state == 1 ? ta.sma(close, 14) : 0.0
plot(x + y)
```

| | verdict |
|---|---|
| us, before | clean |
| us, after | `9:18: warning: [CONDITIONAL_SERIES] The function 'ta.sma' should be called on each calculation...` |
| `pine-lint --tv` | `9:18: warning: The function "ta.sma" should be called on each calculation...` |

Control, confirming we did not simply start always-warning - the same `:=`
run unconditionally, where INV115's rule says a `var` reassigned to a const
stays const:

```pine
//@version=6
indicator("t")
var int state = 0
state := 1
y = state == 1 ? ta.sma(close, 14) : 0.0
plot(y)
```

Clean on both, before and after.

### Corpus gates

`regression-check` 0 changed fixtures. The warning channel is **unchanged at
2073 records over 1879 fixtures** on identical before/after runs of
`scripts/lint-batch.mjs` - the corpus carries no instance of either
consequence, which is why the original lead surfaced with no carrier. The
fixture is therefore the only thing holding this.

### Regression fixture

`packages/core/test/fixtures/regression/INV168-if-expression-init-declarations.pine`
pins both consequences in one file and was mutation-verified red: with the
IfExpression-init recursion removed the file reports 0 warnings instead of 2,
failing both the count and each individual assertion.

## Also fixed 2026-08-27: the dead second implementation

`checker.ts`'s `checkUnusedVariables` and `SymbolTable.getAllUnusedSymbols` /
`Scope.getUnusedSymbols` are deleted. They were unreachable from both
consumers (each keeps only ERRORS from `validate()`, and these pushed
Warnings), and they were the second implementation of the rule that kept the
false built-in limitation alive - the copy AGENTS.md named when it recorded
the claim this investigation retracted. `Scope.getAllSymbols` stays; it has
other callers.
