# #31 - `if`/`while` bodies drop statements; SemanticAnalyzer blind spots

Status: FIXED 2026-06-04 (same day as diagnosis). All findings 1-7
addressed except Finding 7 (CONDITIONAL_SERIES re-foundation), which
remains a follow-up as planned. See the Resolution section at the end
for what shipped, the lateral fixes the corpus diff surfaced, and the
remaining follow-ups.

Diagnosed 2026-06-04; verified and expanded the same day
after two independent reviews (every claim below re-verified against the
code or an AST/CLI repro). Language-behavior claims additionally
cross-checked against `po` (pine-data snapshot 2026-06-02 plus the
indexed manual) - `po:` references inline.

## Discovery context

Linting a real-world script (`adaptive-session-filter.pine`, copied to the
repo root for debugging) produced 14 warnings, most of them wrong:

- 10x "Reassignment of variable 'X' inside conditional scope may cause
  series coherence issues" - fired on the canonical Pine `var`
  state-machine idiom, and only ever on the FIRST statement of each
  conditional block (`entryPrice := close` flagged at 153, but not
  `isLong := true` directly below it at 154).
- 3x "Variable 'macdFast/macdSlow/macdSignal' is declared but never used" -
  all three are plainly used at line 89 inside
  `[macdLine, signalLine, macdHist] = ta.macd(close, macdFast, macdSlow, macdSignal)`.
- 1x correct warning: `supertrendOk` (line 126) really is dead code.

Chasing the "first statement only" pattern exposed a foundational parser
bug that the warnings were merely the visible symptom of.

## Finding 1 (parser, foundational): `if` bodies lose statements 2..n

`ifStatement()` in `packages/core/src/parser/parser.ts` parses the
consequent (and alternate) with an indent-tracked loop that checks
`peek().indent` for dedent BEFORE calling `statement()`. After the first
body statement, `peek()` is the trailing NEWLINE token. NEWLINE tokens
carry no `indent`, so `currentToken.indent || 0` reads 0, the dedent
check `0 < consequentIndent` fires, and the loop breaks. `statement()`
itself would have skipped that NEWLINE - but the break check runs first.

Net effect: in EVERY multi-statement `if` body, statements 2..n are
parsed as top-level siblings of the `if`, outside its scope.

AST evidence (via `pnpm run debug:internals parse`):

```pine
if close > open
    x = 1
    y = 2
plot(close)
```

produces `IfStatement.consequent = [x = 1]` with `y = 2` as a SIBLING
top-level `VariableDeclaration`. Same for assignments and call
statements.

The multi-statement premise is documented grammar, not an assumption:
the manual defines `<local_block>` as "zero or more statements followed
by a return value" and allows `{else if ...}` zero-or-more plus `[else]`
zero-or-one (po: language/conditional-structures).

**Worse: `else` never attaches at all.** The consequent loop breaks while
`peek()` is still the trailing NEWLINE, so the
`this.match([TokenType.KEYWORD, ["else"]])` that follows (parser.ts ~570)
sees that NEWLINE and fails - `alternate` stays undefined. The stranded
`else` then parses as `ExpressionStatement(Identifier("else"))`, because
`primary()` accepts KEYWORD tokens as identifiers (expressions.ts ~668),
and the else-body statements leak to top level. AST-verified on the
canonical multi-line `if`/`else`. Consequences:

- Every `else` branch corpus-wide is currently analyzed as unconditional
  top-level code.
- The alternate-parsing loop inside `ifStatement()` is dead code in
  practice (which is why its own bugs - see Finding 6 - never surfaced).
- Nothing in `packages/core/test` references `alternate` - zero coverage.

The NEWLINE-skip fix repairs attachment for free: the loop skips the
NEWLINE, re-checks its condition, sees `else`, exits cleanly, and the
match succeeds.

The NEWLINE guard already exists elsewhere in the same file:
`forStatement` (both `for` and `for...in` bodies) and the multi-line
function body loop carry a "Skip NEWLINE tokens when determining body
boundaries" guard at the top of the loop (advance + continue on NEWLINE
before the indent checks). `ifStatement` never got it. The bug predates
INV008 (which fixed a different `if`-indent problem in the same loop).
NOTE: `forStatement` is the template for the NEWLINE guard ONLY - it
lacks the strict indent guard (Finding 6), so do not copy it wholesale.

Downstream consequences beyond the warnings:

- Conditional-scope semantics are wrong corpus-wide: local declarations
  inside `if` bodies leak to the enclosing scope, scope-sensitive checks
  (local-scope restrictions, CONDITIONAL_SERIES, blockDepth) only see
  the first statement of each block.
- Likely interacts with task #4 (local-scope FPs) and the INV012
  cascade numbers - re-measure both after the fix.

## Finding 2 (parser): `while` bodies are single-statement

`whileStatement()` (parser.ts ~748) has no block loop at all - it parses
exactly ONE statement as the body and returns. Verified via AST: the
second body statement becomes a top-level sibling. Needs the same
indent-tracked loop as the other block parsers - with BOTH guards
(NEWLINE skip + strict body indent, see Finding 6).

## Finding 3 (SemanticAnalyzer): unwalked node variants - tuples and four more

`packages/core/src/parser/semanticAnalyzer.ts` walks the AST with two
hand-rolled switches (`analyzeStatement`, `collectDeclarationsInStatement`)
plus `analyzeExpression`. Five node variants are missing, all verified
with CLI repros (`pnpm run test:snippet`); each produces the same FP/FN
shape: variables used only inside the unwalked node are reported
"declared but never used", and declarations inside it are never collected.

- **TupleDeclaration** (the original finding): the RHS init is never
  walked (the macdFast/macdSlow/macdSignal FPs) and the declared tuple
  names are never collected (a genuinely unused tuple member is never
  flagged - the mirror-image FN). Minimal repro:

  ```pine
  //@version=6
  indicator("x")
  int fastLen = 12
  [m, s, h] = ta.macd(close, fastLen, 26, 9)
  plot(m)
  plot(s)
  plot(h)
  ```

  Today: warns "Variable 'fastLen' is declared but never used". Expected:
  no warnings.

- **ForInStatement**: the `case "ForStatement"` dispatch does not match
  the distinct `"ForInStatement"` type string, so neither the collection
  expression nor the body is walked, in either pass. Repro: `arr` (used
  as collection) and `factor` (used in body) both flagged unused.
  `analyzeForStatement` already feature-tests `"from" in statement` /
  `"to" in statement`, so dispatching ForInStatement there is nearly
  free - but it must also walk `collection`, which nothing touches today.

- **MethodDeclaration**: body never walked, params never collected.
  Repro: `offsetVal` used only inside a `method` body flagged unused.

- **SequenceStatement** (comma-separated declarations, e.g.
  `a = base + 1, b = 2`): the inner statements are never walked or
  collected. Repro: `base` flagged unused (FP); genuinely unused `b`
  never flagged (FN). Caveat: this comma-separated form is absent from
  the manual's declaration grammar (po: language/variable-declarations).
  Our parser supports it deliberately
  (`syntax/comma-separated-declarations.pine`, incl. type inheritance),
  but no `--tv` probe has ever confirmed TV accepts it. The analyzer fix
  is warranted regardless - the analyzer must not be blind to nodes our
  parser emits - but probing the syntax itself is a separate follow-up.

- **SwitchExpression** (Expression union, not Statement):
  `analyzeExpression` has no case for it, so discriminant and case
  condition/result expressions are invisible. Repro: `bullColor` /
  `bearColor` used only in switch arms both flagged unused. Walking it
  is also a precondition for CONDITIONAL_SERIES ever covering switch
  arms, where TV does warn (see Finding 7).

Correctly ignored (no action): `TypeDeclaration`, `EnumDeclaration`, and
`ImportStatement` are name-only AST nodes - there is nothing to walk.
Minor deferred FN: `for`/`for...in` iterator names are never collected
as declarations, so an unused iterator is never flagged.

Five missing variants is evidence the per-case switch approach does not
hold up - prefer a small shared statement/expression walker over adding
five more ad-hoc cases.

Scope nuance: `UnifiedPineValidator` has its own unused-variable check
(checker.ts ~1776) which already handles TupleDeclaration - verified: the
validator produces no FP on the tuple repro. The FPs above live solely in
the SemanticAnalyzer path, which is the CLI's only warning channel
(cli.ts runs SemanticAnalyzer for warnings and strips validator warnings
from its output).

## Finding 4 (SemanticAnalyzer): CONDITIONAL_REASSIGNMENT rule is unsound

The rule (`checkConditionalReassignment`, semanticAnalyzer.ts ~line 297)
warns on EVERY assignment inside conditional scope. The code comment
introducing it concedes it is a "simplified heuristic" where "false
positives are acceptable". It is not TV-derived - it is our own
invention.

The criterion is wrong, not just noisy: reassignment inside a
conditional is never itself a series-coherence hazard - it is the
canonical Pine idiom for `var` state machines and false-initialized
flags. The real hazard is conditionally CALLING series functions
(`ta.*` etc.), which is already covered by the separate
CONDITIONAL_SERIES rule.

Today the rule fires "only" on the first statement of each block - but
that is Finding 1 masking it. Once Finding 1 is fixed, it would fire on
every assignment in every conditional block (~25 lines of the perfectly
normal discovery script).

Decision: delete the rule. Recorded here explicitly because removing a
check needs justification per the methodology - the justification is
that the check's criterion is unsound (flags the canonical idiom), not
that TV is silent.

TV's manual confirms the deletion directly: the CW10003 page (the
compiler warning CONDITIONAL_SERIES mirrors) shows a global call's
result being reassigned inside an `if`, annotated "This code does not
cause a warning. Reassigning the call's result to another variable does
not change the call's behavior" (po: errors/CW10003). Conditional
reassignment is TV's own recommended fix pattern, not a hazard.

Deletion is fully contained: CONDITIONAL_REASSIGNMENT exists only in
semanticAnalyzer.ts (the rule plus its dispatch in
`analyzeAssignmentStatement` ~178) and in docs. No tests reference it.

## Finding 5 (extractor, lateral): tuple members get the whole tuple type

In the variables output (`astExtractor.ts` path), each member of a
destructured tuple reports the FULL tuple type:
`[m, s, h] = ta.macd(...)` lists `m`, `s`, and `h` each as
`[series float, series float, series float]` instead of `series float`.

Mechanism: `extractTupleVariables` (astExtractor.ts ~308) resolves the
called function's full return type and assigns it verbatim to every
member. The cheap fix is to split a `[a, b, c]`-shaped type string at
top level and index by member position - the split must be
bracket/angle-aware (`map<string, float>` members contain commas), with
a fallback to the whole string when member count mismatches.

Likely related to the two-inference-paths note in task #18, and to
INV010 (UDF tuple return types). Lower priority than 1-4.

## Finding 6 (parser): strict body-indent guard missing - `for` is live-buggy

The INV008 guard ("body must be indented STRICTLY MORE than the
keyword") exists only in the if-consequent loop (parser.ts ~545). It is
missing in three places:

- **`forStatement` (both `for` and `for...in` loops): a live bug today,
  not just a copy-hazard.** AST-verified: a bodyless `for j = 0 to 10`
  followed by a same-column `plot(close)` swallows the plot into the
  loop body (`bodyIndent` gets set to 0; the dedent check `0 < 0` never
  fires; everything to EOF is consumed). This is exactly the INV008
  failure mode, in `for`.
- **The if-alternate loop** (parser.ts ~587) - latent today only because
  the loop is unreachable (Finding 1). The Finding 1 fix makes it
  reachable, and then two failure modes appear:
  - `else if` chains (the common form): the nested `if` is parsed by
    `statement()` on the same line as `else`, so `alternateIndent` is
    still null when it returns; the next top-level statement then sets
    `alternateIndent = 0`, the dedent check `0 < 0` never fires, and the
    rest of the file is swallowed into the alternate.
  - A malformed `else` with no indented body: same EOF swallow INV008
    fixed for the consequent.
- **`whileStatement`** - gets a block loop for the first time in this
  work (Finding 2); it must include the guard from the start.

Fix: the if-CONSEQUENT loop is the canonical template (NEWLINE skip from
`forStatement` + strict indent guard from INV008). For the alternate,
compare against the `else` keyword's own indent
(`elseToken.indent ?? ifIndent`), not just `ifIndent`. The original fix
plan's phrasing "mirror forStatement" was wrong on this axis: copying
`forStatement` as written propagates the hole.

(The manual's spec is local blocks "must be indented by four spaces or
a tab" (po: language/conditional-structures); the strictly-deeper-than-
keyword criterion is the looser superset we already use - INV008.)

## Finding 7 (SemanticAnalyzer, risk): CONDITIONAL_SERIES gets unmasked too

Fixing Finding 1 puts statements 2..n back inside conditional scope,
which unmasks CONDITIONAL_SERIES, not just CONDITIONAL_REASSIGNMENT
(Finding 4 handles the latter by deletion; nothing handles this one).

`isSeriesFunction` (semanticAnalyzer.ts ~318) flags any function whose
pine-data return type starts with `series`, plus a bare namespace
fallback for `ta.` / `request.` / `str.`. That net is too wide: every
drawing constructor returns a `series` object type - `label.new`,
`line.new`, `box.new`, `polyline.new`, `linefill.new`, `table.new`
(po: catalog) - and `str.tostring` is namespace-matched despite a
merged returns of `const string` (po: str.tostring; per-overload it
ranges up to `series string`, but the merged field is what
`isSeriesFunction` reads). Conditional drawing and string formatting
are canonical Pine idioms, so expect a new corpus-wide FP wave from
this rule once the parser fix lands.

TV documents the actual criterion: its CW10003 warning fires on
**history-dependent** calls - functions that use the `[]` operator or
rely on history internally - executed conditionally or iteratively
(po: errors/CW10003). The same page explicitly exempts side-effect
functions: forcing `label.new` inside an `if` to execute every bar
"would cause a new label drawing to appear on every bar", and names
`math.max` as a stateless exception. So the follow-up fix has a
documented criterion - history-dependence - not return type or
namespace.

Scope nuance from the same page: CW10003 also covers history-dependent
calls in ternary and `and`/`or` operands, and the manual's
switch-without-expression example warns on `ta.crossover` inside switch
arms (po: language/conditional-structures). Our `inConditionalScope` is
set only by if/for/while statements, so those are FNs for the same
follow-up.

Not fixed in #31 unless it falls out cheap - it is its own follow-up
(re-found CONDITIONAL_SERIES on history-dependence instead of
`isSeriesFunction`'s return-type/namespace net, and extend its scope to
ternary / and-or / switch arms). Budget a triage category for it in the
regression diff. The discovery script is unaffected (all its `ta.*`
calls are top-level and it draws nothing), so the expected end state
below still holds for that file.

## Test wiring gaps (why nothing caught this)

- `syntax/if-else.pine` and `syntax/while-loops.pine` cover these exact
  constructs but assert only `parse: success` + `no-errors` - the leaked
  statements are still valid top-level code, so a total structural
  mis-parse passes both assertions. Only AST-shape assertions can
  regression-protect Findings 1/2/6.
- The fixture runner (`helpers.ts` `runTest`) runs only
  `UnifiedPineValidator`. SemanticAnalyzer is wired only in the CLI
  (cli.ts ~290). So `@expects warning:` / `warnings: N` directives
  cannot exercise Findings 3/4 at all today. Fix: wire SemanticAnalyzer
  into `runTest` for v6 (preferred - fixtures then assert the same
  warning channel the CLI emits) or unit-test SemanticAnalyzer directly.
- Stale doc note: CLAUDE.md claims the bare `// @expects errors: N`
  count form "is currently ignored by the runner"; helpers.ts ~130
  implements both `errors: N` and `warnings: N`. Correct CLAUDE.md when
  committing this work.

## Fix plan

1. `ifStatement()`: add the NEWLINE-skip guard (advance + continue) at
   the top of both the consequent and alternate loops. In the alternate
   loop ALSO add the strict body-indent guard, comparing against
   `elseToken.indent ?? ifIndent` (Finding 6). Together these stop the
   statement leak AND make `else` attach at all.
2. `whileStatement()`: replace the single-statement body with the
   indent-tracked block loop - NEWLINE skip + strict indent guard.
3. `forStatement()` (both variants): add the missing strict indent
   guard (live sibling-swallow bug, Finding 6).
   - Consider extracting a shared `parseIndentedBlock(startToken,
     baseIndent)` helper: after steps 1-3 the same loop exists six times
     (if-consequent, if-alternate, while, for, for-in, function body),
     and the guards were missed precisely because the loop is
     copy-pasted. Decide at implementation time; spot-fixes are
     acceptable if the helper turns risky.
4. `SemanticAnalyzer`: cover the missing variants in both passes -
   `TupleDeclaration` (collect names, walk init), `ForInStatement`
   (walk collection + body; dispatch can reuse `analyzeForStatement`),
   `MethodDeclaration` (collect params, walk body), `SequenceStatement`
   (recurse into statements), and `SwitchExpression` in
   `analyzeExpression` (walk discriminant + every case
   condition/result). Prefer a small shared walker over five more
   switch cases.
5. Delete CONDITIONAL_REASSIGNMENT (rule + dispatch in
   `analyzeAssignmentStatement`; no tests reference it).
6. Wire SemanticAnalyzer into the fixture runner (`helpers.ts`
   `runTest`, v6 only, matching the CLI) so warning directives become
   meaningful for Findings 3/4.
7. Tests:
   - Parser unit tests asserting AST shape: multi-statement
     if/else/while bodies (body lengths + sibling placement); `else`
     attaches (`alternate` defined); an `else if` chain followed by a
     top-level statement (nothing swallowed); bodyless
     if/else/for/while do not swallow same-column siblings.
   - Regression fixtures under
     `packages/core/test/fixtures/regression/` for the SemanticAnalyzer
     FP repros (tuple, for-in, method, sequence, switch) using
     `@expects warnings: 0` (meaningful once step 6 lands), plus one
     asserting a genuinely unused tuple member IS flagged.
8. Finding 5: fix in `astExtractor` if the bracket-aware split stays
   small; otherwise leave noted in this doc and reference from #18.
9. CLAUDE.md: fix the stale "bare `errors: N` is ignored" note (bundle
   with the code commit).

Workflow reminder (per TODO.md): snapshot the baseline BEFORE touching
the parser (`node scripts/snapshot-local-lint.mjs`), then
`pnpm run install:cli` + `node scripts/regression-check.mjs` after.
Findings 1/2/6 shift corpus-wide error counts, so expect a noisy diff
needing per-category triage:

- undefined-variable changes (locals declared in if/else/while/for
  bodies no longer leak; later references to them correctly become
  errors)
- local-scope restriction errors now seeing statements 2..n of every
  block
- new CONDITIONAL_SERIES warnings, including the Finding 7 FP wave
- unused-variable shifts in both directions

Re-measure #4 and the INV012 numbers afterwards.

Expected end state for the discovery script: exactly one warning
(`supertrendOk` declared but never used). Verified plausible (its `ta.*`
calls are all top-level and it draws nothing), but re-measure rather
than assume.

## Resolution (2026-06-04)

All plan steps executed. Implementation notes where reality differed
from the plan:

- **Steps 1-3 became one shared helper.** `parseIndentedBlock(startLine,
  baseIndent, stopAtElse)` in parser.ts now carries both guards
  (NEWLINE skip + INV008 strict indent) and is used by if-consequent,
  if-alternate, while, for, and for-in. The function/method body loops
  kept their own copies (they wrap `statement()` in try/catch recovery
  and handle same-line bodies) but gained the strict-indent guard via a
  threaded `baseIndent` param - the delta-debugging below proved the
  bodyless-declaration swallow was live there too.
- **`else` attachment is indent-aware**, beyond the plan: an `else` is
  consumed only when its indent equals the `if`'s, so a dedented `else`
  attaches to the enclosing `if`, not the innermost one. (The lexer
  already gives the inline `if` of an `else if` the `else`'s indent, so
  chains nest correctly.) If-expressions (`x = if cond`) were confirmed
  unsupported in general - `startToken.indent` is therefore always
  defined where `ifStatement()` runs.
- **Steps 4-6 as planned.** The collect pass now recurses through a
  single `childStatements()` enumeration so a new statement variant
  can't silently go unwalked; CONDITIONAL_REASSIGNMENT deleted;
  the fixture runner mirrors the CLI's channels (validator errors +
  SemanticAnalyzer warnings, v6 only).
- **Step 7:** `packages/core/test/parser-blocks.test.ts` (15 AST-shape
  tests) plus 6 regression fixtures (`unused-vars-*.pine`,
  `unused-tuple-member-flagged.pine`).
- **Step 8 (Finding 5) done** - the bracket-aware split stayed small
  (`splitTupleType` in astExtractor.ts); `[m, s, h] = ta.macd(...)`
  members now report `series float` each.
- Discovery-script end state: TWO warnings, both correct -
  `supertrendOk` (predicted) plus `macdHist`, a genuinely unused tuple
  member that only became flaggable once TupleDeclaration names were
  collected (the FN-mirror of Finding 3 working as intended).

### Lateral fixes surfaced by the corpus regression diff

Triaged with `scripts/triage-regression.mjs` (new helper that groups
the regression report's appeared/disappeared records into normalized
message categories):

- **Lexer: U+00A0 (non-breaking space) indentation.** Real published
  scripts indent with nbsp; the lexer silently dropped the char, so
  body tokens read indent 0 and (with the strict guard) function
  bodies swallowed the rest of the file. Now counted as whitespace
  (lexer.ts `case " "`). Found via greedy delta-debugging of a
  library fixture whose top-level plots were flagged as local-scope
  calls.
- **Parser: `for [index, value] in` tuple iterators.** Previously
  "Expected iterator variable" - the parse abort leaked every for-in
  body corpus-wide (~80 parse errors + ~1300 cascading
  undefined-variable FPs). `ForInStatement` gained `iterator2?`;
  checker/astExtractor/semanticAnalyzer updated. Iterator names accept
  type keywords (`for [i, line] in lines` is real published code).
- **Parser: `for int i = 0 to 10` typed iterators.** Type annotation
  consumed and dropped (not tracked in the AST).
- **Checker: ForInStatement was never dispatched** (`case
  "ForStatement"` doesn't match the distinct type string) - the same
  Finding 3 blind spot, in UnifiedPineValidator. For-in bodies and
  collections are now validated; for-in element iterators are typed
  "unknown" (lenient) since we don't derive element types yet.

### Follow-ups (not fixed here)

- **Finding 7 stands**: re-found CONDITIONAL_SERIES on
  history-dependence (po: errors/CW10003) instead of the return-type/
  namespace net, and extend to ternary / and-or / switch arms.
- **Inline switch-arm statements**: `cond => x := y` and
  `=> f(), na` fail to parse (`parseSwitchCaseBody` parses the inline
  body as a pure expression). Multi-line arm bodies are fine. ~12
  corpus sites.
- **Parenthesized expressions spanning lines**: `x = (\n  "a"\n  + "b"\n)`
  fails ("Unexpected token: \n"). ~18 corpus sites, all TV-valid.
- **UDF tuple return-type inference** (INV010 / task #18): now that
  bodies parse fully, mis-inferred tuple member types surface as
  type-check FPs (e.g. "Cannot assign series<float> to bool", 6 sites).
- Re-measure task #4 and the INV012 cascade counts against the new
  baseline (the old numbers predate correct block scoping).

Final corpus diff vs the pre-fix baseline: ~2400 disappeared error
records (spurious "Unexpected token: \n" from the NEWLINE-dedent bug,
"Unexpected token: =>", for-in cascades, local-scope FPs at column 1)
vs ~480 appearances, of which the bulk are correct new
undefined-variable errors (block locals no longer leak into the
enclosing scope - Pine blocks are real scopes) plus cascade
repositioning inside files with unrelated pre-existing parse errors.
The remainder map to the follow-ups above.

## Follow-up resolution: #33 + #34 (2026-06-04, same day)

Both parser follow-ups landed in the next session:

- **#34 (multi-line bracket groups)**: fixed at the LEXER - NEWLINE
  tokens are not emitted while inside an open `(`/`[` group (depth
  clamped at 0 so a stray `)` can't poison the rest of a broken file).
  Newlines inside brackets are continuations, not statement boundaries,
  per the manual's "no restriction inside parentheses" wrap rule. This
  fixed `x = (` ... `)` groupings, and made the parser's explicit
  newline-skips inside call/param parsing redundant-but-harmless.
- **#33 (inline switch-arm statements)**: `SwitchCase` gained a
  `statements?: Statement[]` field carrying the FULL arm body - both
  for inline forms (`cond => a := b`, `=> f(), na`, trailing commas
  tolerated) and multi-line blocks, which previously kept only the
  final expression. `result` remains the arm's value (the last
  statement's expression/value/init); walkers visit `statements`
  INSTEAD of `result` when present. The checker now validates arm
  statements in a per-arm scope; the SemanticAnalyzer walks them.
- **INV017 (found under #33)**: the postfix line-continuation
  heuristic continued expressions onto any next line starting with an
  operator/`(`/`.`, gluing switch arms into calls (`1(a - b)`). Pine's
  documented wrap rule - continuation indent must not be a multiple of
  4 - is now enforced; TV probes (CE10013) recorded in
  investigations/INV017.
- Also fixed while triaging: an indented tuple line after a switch arm
  (`    [a, b]` as a function's tuple return) was parsed as SUBSCRIPT
  on the switch result - the "new statement" check for `[` only looked
  at column 1. Now: a `[` directly preceded by a NEWLINE token starts a
  new statement (inside brackets no NEWLINEs exist post-#34, so wrapped
  subscripts like `f(...)\n  [1])` keep working).

Corpus diff after #33+#34 (same pre-#31 baseline): ~3500 disappeared vs
~590 appeared; every appearance category triaged - correct
block-scoping errors, UDF-return/tuple inference FPs (the documented
#9/#18/INV010 umbrella, now visible on newly-validated arm statements),
cascade repositioning in malformed files, and two expected sites from
the INV017 tightening (our own synthetic fixture + glued comment text).

Remaining from the original follow-up list: #32 (CONDITIONAL_SERIES
re-foundation) and the #4/INV012 re-measure. New: #35 (arrow-function
bodies still drop intermediate statements; align with the
SwitchCase.statements approach).
