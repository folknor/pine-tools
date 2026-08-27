# Changelog

## Unreleased

- Argument values TradingView enforces only at RUNTIME are now reported.
  `ta.sma(close, 0)`, `ta.sma(close, na)` and `ta.pivothigh(high, -1, 2)`
  compile at both validators and then kill the script on bar 0, producing no
  values at all; they are now `lint`-stage warnings
  (`ARGUMENT_OUT_OF_RANGE`, `ARGUMENT_NA_AT_RUNTIME`). The domains are data,
  not code: they are transcribed from captured chart banners into
  `pine-data/raw/v6/runtime-domains.json` and merged into `functions.json` at
  generate-time, since RE-class errors reach neither pine-lint mode. Coverage
  is deliberately the three captured facts - a domain that plainly generalizes
  still needs its own capture. Only literals are decided; an input-driven
  length stays silent. See INV164, G010.
- Fixed: `ARGUMENT_OUT_OF_RANGE` read arguments positionally against the merged
  parameter list, which is the first overload's order, so a call using another
  overload's signature had its bounds checked against the wrong arguments.
  Overloads are now narrowed by arity and named arguments, and a position is
  decided only where every candidate agrees. See INV164.
- New error: TradingView's CE10111, user-function overloads with the same
  REQUIRED parameter types. `f(float x)` and `f(float x, float scale = 1.0)`
  are illegal - an optional parameter cannot disambiguate a call that omits it
  - and so are same-arity pairs whose full lists differ only in their
  optionals. An untyped required parameter is undetermined and collides with
  nothing. Twelve probes, zero disagreement with TradingView. See INV165.
- `UNUSED_VARIABLE` moved from the `analysis` stage to `lint`. TradingView
  emits nothing for an unused variable, and `analysis` means "TradingView says
  this too" - so `--no-lint` now silences it, and it no longer inflates the
  local-only warning column (which dropped from 1292 to 41). Routed by the
  absence of a CW code rather than by rule name, so any future non-mirroring
  warning lands there automatically. See INV166.
- Fixed a missed CW10003: a library export that returns its work through a
  local variable rather than the call itself was not recognised as
  series-returning, which silently narrowed the gate deciding which exports are
  history-dependent. Regenerating the library data added ~160 history-dependent
  exports and removed none; the TradingView sweep afterwards went to zero
  tv-only warnings with no new local-only ones. See INV167.
- Fixed: an if/else in EXPRESSION position (`x = if cond` and its branches) was
  never walked by the semantic analyzer - it was the one expression form with
  no case in the walker. Variables read only inside such a branch were reported
  "declared but never used" (652 false positives across 2257 files), and the
  branches escaped conditional-scope tracking, so a shadowing declaration, a
  `[]` read of a branch-local, and a history-dependent call in a branch drew no
  warning. The three resulting CW10013 / CW10018 / CW10003 additions were each
  probe-confirmed against TradingView at the same position and wording. The
  TradingView sweep afterwards left the error window byte-identical and took
  local-only warnings from 41 to 12, tv-only still 0. See INV168.
- Fixed the same walk gap in the second walker: declaration collection also
  stopped at an if/else in expression position, since it recursed through child
  STATEMENTS and an `x = if cond` puts a block in an expression slot. Nothing
  declared inside such a branch was collected, so an unused binding there was
  never reported, and - the half that matters - the branches propagated no
  series-conditional context, so a `:=` to an outer `var` under a series-gated
  if-expression left that variable const-qualified and the discriminant it
  later fed drew no CW10003. Probe-confirmed against TradingView at the same
  position and wording, with the unconditional-`:=` control clean on both
  sides. No corpus carrier (warning channel unchanged at 2073 records over 1879
  fixtures), so a mutation-verified fixture is what holds it. See INV168.
- Fixed: `Could not find method or method reference` was anchored at the
  receiver where TradingView anchors it at the dot, so every method-form
  CE10271 sat one receiver-name's width to the left of TradingView's column.
  Measured on 17 cells. Four regression fixtures had pinned the wrong column
  and were re-probed against TradingView before being corrected. See INV173.
- New errors: a user-function or method parameter's DEFAULT value is now
  validated. Nothing walked parameter defaults before, so neither the default
  expression's own validity nor TradingView's rules about what a default may
  be were checked - `f(int x, y = math.max(1, 2))` passed silently. All four
  of TradingView's codes are reported with its wording and anchors: CE10132 (a
  user variable), CE10133 (a call), CE10134 (a calculation) and CE10169 (a
  bare `na` on an untyped parameter). Literals, parenthesised and negative
  forms, built-in variables and constants, and `na` on a TYPED parameter stay
  accepted, each measured rather than assumed. UDT field defaults share the
  rule and are not yet covered. See INV172.
- `UNUSED_VARIABLE` no longer exempts 40 hardcoded variable names (`ma`, `bb`,
  `c`, `col`, `up`, `len`, `src`, `show`, ...), which it had matched
  case-insensitively on the reasoning that such names "may appear unused but
  are actually used by plots or external references". Neither half holds: a
  plotted variable's identifier appears in the plot call and is marked used,
  and Pine has no external-reference mechanism for a local binding. The list
  suppressed by name regardless of use, so every warning it hid was a real
  one. Costs +9 warnings over 1879 corpus fixtures, each hand-verified
  genuinely unused. See INV168.
- The expected-type noun in a union-typed parameter's CE10123 is now
  TradingView's own. It had been fabricated as `simple <first union member>`,
  which was wrong on 194 of the 201 union parameters in the catalog -
  `ta.sma(source = true)` said `simple int` where TradingView says
  `series float`. The noun is not derivable from the union, so it is measured
  per function+parameter into `pine-data/raw/v6/union-type-nouns-probe.json`
  and merged into `functions.json` at generate-time; the checker reads it and
  carries no table of its own. Verdicts and argument names are unchanged - only
  the quoted type was ever wrong. See INV171.
- New error: calling a built-in namespace member that is not a function -
  a constant (`math.pi(2)`, `color.red(1)`) or a variable
  (`syminfo.tickerid(3)`, `barstate.isfirst(1)`) - now reports TradingView's
  CE10271 instead of passing silently. The check had been suppressed on the
  reasoning that the constant-versus-variable split was too murky to act on;
  it is not a split at all, only "is there a function of this name". A member
  that IS also a function (`ta.tr`) is unaffected, and a namespace shadowed by
  a user variable stays clean, matching TradingView in both directions. See
  INV170.
- New error: a positional argument after a named one, which TradingView rejects
  as `Syntax error after the argument for "<name>"`. We accepted it silently,
  even though the union-argument checker already recognised the shape well
  enough to suppress its own type checks on it - so the only rule that knew
  about it was one that could only stay quiet. Raised from the parser, because
  TradingView raises it for user-defined functions too. One error per call, at
  the first offending positional, naming the named argument immediately before
  it; all four conventions probed against TradingView. See INV169.
- Removed dead code: a second, unreachable copy of the unused-variable rule in
  `checker.ts`, with `SymbolTable.getAllUnusedSymbols` and
  `Scope.getUnusedSymbols`. It emitted warnings into a channel both consumers
  discard, and it was the copy the retracted Known Limitation below named. See
  INV168.
- Retracted a Known Limitation: the semantic analyzer does not report built-in
  variables or keywords as unused, and the code path the note named cannot
  reach a user at all. A 2257-file sweep found only correct warnings on
  built-in names - user declarations that shadow one and are never read. See
  INV168.

- A type keyword may now be a destructured name, as it already could be a
  single declaration's name. `[line, signal, hist] = ta.macd(close, 12, 26, 9)`
  is accepted by TradingView and is idiomatic - those are MACD's own output
  names - but the first such name failed to parse, took the whole destructuring
  with it, and left NOTHING in the statement declared, so a TradingView-clean
  file drew four errors including two about a name that never existed. One
  corpus script carried six of them and now agrees with TradingView exactly.
- Parse errors now use TradingView's wording. `Unexpected token: )` becomes
  `Syntax error at input ")"`, at the same position we already reported, from
  both emission sites - the in-call unexpected token and the
  primary-expression fallback. TradingView's other template,
  `Mismatched input "X" expecting set "Y"`, is used where its grammar has a
  specific expectation and is deliberately left alone: those sites already
  match it. 873 messages reworded across the corpus with no error appearing or
  disappearing.
- `[a, b] := f()` no longer adds a redeclaration error per name. Tuple
  reassignment is not Pine and the error at the `:=` was already correct, but
  the invalid form was still re-declaring names the earlier `=` had introduced,
  turning TradingView's single error into three. A genuine duplicate
  declaration still errors. See INV163.

- New `lint`-stage rule `ARGUMENT_OUT_OF_RANGE`: a numeric literal outside the
  range the reference documents for that parameter, such as
  `color.rgb(300, 0, 0)` where the docs say 0-255. TradingView compiles these,
  so it is a warning and never an error, and the message does not claim a
  runtime consequence - whether TV clamps or raises is unmeasured. Only
  literals are decided (a negated one counts); an identifier, an input or any
  expression is left alone, and the range boundaries are legal. The domains
  come from `functions.json`, parsed from each parameter's own prose, so the
  rule covers exactly the 11 parameters the reference documents a range for and
  extends by adding data rather than code. Zero findings across the corpus.
  See INV162.

- A qualified tuple destructuring (`var [x, y] = f()`, and the `varip` and
  `const` spellings) now reports one error instead of three. Pine has no such
  form, and all three were already rejected, but the parser gave up at the
  bracket - so the names were never declared and every later use of them added
  an undefined-variable error that TradingView does not emit. The parser now
  recovers through the destructuring, which removes the cascade, and each
  spelling carries TradingView's own wording: `var`/`varip` name the keyword
  (`""var"" cannot be used as a variable or function name.`), while `const` is
  read by TV as a type annotation and fails at the first NAME instead
  (`Mismatched input "x" expecting set "]"`). Matched to the column in all
  three. See INV160.

- New error CE10059: the `strategy.*` namespace may not appear in any
  `request.*()` argument - mutating commands and plain variable reads alike.
  TradingView's Pine editor rejects the whole surface there; we were silent.
  Note this check's oracle is a hand-run editor capture rather than
  `pine-lint --tv`, which cannot see the rule: `--tv` rejects a void
  `strategy.*` COMMAND in that position on ordinary type grounds, and is clean
  on a READ such as `strategy.position_size`, which is precisely the shape a
  script is likeliest to contain by accident. `strategy.*` anywhere outside a
  request argument is unaffected. See INV161 and G009.

- Three tuple-literal positions TradingView rejects are now caught: a bare
  `[a, b]` statement at top level (in ANY position, including as the script's
  last statement), and a tuple used as a value - a binary or unary operand, or
  a ternary condition. Both directions matter here, so the rule was measured
  cell by cell rather than inferred: the discriminator is top level versus
  inside a block, NOT final versus non-final, and TV accepts a bare tuple
  statement anywhere inside a block including a `for` body, which is never a
  return position. TV's two messages differ and anchor differently, and both
  are reproduced exactly. Unaffected on purpose: the legal `[a, b] = f()`
  destructuring, which begins exactly like the top-level error; tuples as call
  arguments; and tuples in ternary BRANCHES, which are CE10163 (INV127) and
  keep that better message. See INV160.

- A function whose return type follows one of its arguments no longer takes
  that type from an argument the parameter REJECTS. `ta.range("x", 3)` was
  typed `string` (its return follows `source`), so the enclosing call checked a
  string against its own parameter and reported a second, bogus error -
  `plot(ta.range("x", 3))` gave two errors where TradingView gives one, and the
  extra one pointed at `plot` rather than at the actual mistake. Also affects
  `ta.change` and `ta.mode`, the other source-polymorphic functions. The return
  still follows any source the parameter accepts. See INV159.

- A user function whose body TAIL is a statement-form `if` now carries a
  qualifier, so `plot(close, title = f())` is caught when `f` ends in an
  `if`/`else` under a series condition. TradingView rejects it (`series string`
  into a `const string` slot) and we passed it - the dangerous direction. The
  qualifier is the join of the CONDITION with both branch values, which is what
  the ternary and `switch` forms already did; the statement form was the one
  shape that reached neither, so the call had no qualifier at all rather than
  the wrong one. The identical body under a const condition (`if 1 > 0`) stays
  clean, and nested `if` tails fold too. See INV156.

- A `:=` now raises a variable's qualifier for every later read, so passing a
  promoted variable to a `simple`-qualified parameter is caught. `n = 5` /
  `n := int(close)` / `request.security(..., calc_bars_count = n)` was accepted
  locally and rejected by TradingView - the dangerous direction, since the file
  passed here and failed at chart load. The rule is narrower than "a `:=` makes
  it series", and the narrow parts are probed: it is FLOW-SENSITIVE, so the
  same script with the `:=` moved after the call stays clean, and a write that
  RUNS conditionally promotes regardless of what it writes, so a plain
  `sum := sum + 1` inside a loop body or under a series-gated `if` promotes
  while the identical write at top level, or under a const-gated `if`
  (`if 1 > 0`), does not. All six cells are pinned by one fixture that
  TradingView adjudicates directly. See INV157.

- `_`, Pine's discard identifier, no longer produces warnings. Two rules fired
  on it: `UNUSED_VARIABLE` reported it as declared-but-never-used, and
  `SHADOW_VARIABLE` (CW10013) reported a second `_` as shadowing the first.
  The manual reserves `_` for *marking* a binding unused and it is the only way
  to drop part of a tuple, so both were warning at the identifier for doing its
  job - and there was no quieter spelling, since naming the unwanted legs
  (`[_m, _sg, _h]`) warns once per name and produces more warnings than it
  removes. TradingView is clean on both shapes; for the shadowing rule, which
  unlike `UNUSED_VARIABLE` mirrors a real TV warning, a control confirmed TV
  emits CW10013 for an ordinary name in the identical nested-scope structure
  and stays silent for `_`. The shadowing half was not reported by anyone - it
  needs two discards in nested scopes in one file, and surfaced only when the
  regression fixture covered both documented discard positions at once. Real
  unused variables and ordinary shadowing are unaffected. See INV158.

- New error CE10088: a user-defined function or method may not reassign a
  global variable. TradingView rejects it and we accepted it silently, so a
  file passed locally and then failed at chart load - the dangerous direction.
  The boundary is what makes the check safe: reassigning a global *scalar* is
  the error, while mutating a *field* of a global object (`state.flag := true`)
  is legal and is the ordinary way to carry mutable state into a function.
  Locals and parameters that shadow a global are unaffected, as is a `:=` in a
  top-level `if` block. Not version-gated. 24 new errors across the corpus, all
  in the reported shape. See INV150.
- `REPAINTING_SECURITY` now follows a call in the `expression` argument into
  the script's own function and method bodies, so an offset taken inside a
  helper is no longer reported as repainting. This was not an avoidable style:
  TradingView rejects the history operator on a tuple-returning call, so a
  multi-value non-repainting request has no form other than moving the offset
  into a helper - the rule was flagging the only correct construction. Removes
  10 corpus findings. See INV151.
- `REPAINTING_SECURITY` no longer treats an explicit
  `lookahead = barmerge.lookahead_off` as an exemption. That is the *default*,
  so writing it out produces the identical call to omitting it, and the rule
  warned on one spelling and not the other - with the silent half being the one
  that hid a repainting read. A sweep of the 97 corpus calls passing it
  explicitly found higher-timeframe requests (`"60"`, `"240"`, `"D"`, variables
  named `i_htf` / `selectedHTF`), not the lower-timeframe population the
  exemption assumed. Reverses INV146; corpus findings go 124 to 193. See
  INV152.
- New rule `LOOKAHEAD_BIAS` splits the un-offset `request.security` finding in
  two. A call passing `lookahead = barmerge.lookahead_on` with no history offset
  reads the requested period from its *start*, so on historical bars it returns
  data that did not exist yet; that is now its own rule with its own wording.
  Everything else keeps `REPAINTING_SECURITY`, reworded: `lookahead_off`
  (written or defaulted) leaks nothing - history settles on the period's final
  value - it only repaints against realtime, the higher-timeframe fix shifts the
  value by one period, and a same- or lower-timeframe request needs no change at
  all. The old shared message made the future-leak claim for all of them, which
  invited a "fix" that changes what a script computes. `lookahead` still never
  exempts a call (INV152 stands); it only selects the rule. Corpus total
  unchanged at 193 - 23 `LOOKAHEAD_BIAS`, 170 `REPAINTING_SECURITY`. See INV153.
- A comma-separated declaration list led by `var` / `varip` / `const` now
  declares every unit, not just the first. `var a = 0, isNew = false` left
  `isNew` undeclared, reporting `Undeclared identifier` at its own declaration
  site and at every use, on a file TradingView accepts. The typed form
  (`int a = 0, b = 1`) already handled untyped units; the `var`-led one did not.
  A `:=` unit still parses as a reassignment, since it does not declare. The
  false positive invited prefixing `var`, which would turn a per-bar local into
  a persistent one. See INV154.
- `array.from` with all-const-int arguments now widens to `array<float>` where
  one is expected, matching TradingView's overload choice: `array<float> v =
  array.from(0, 0, 0)` is accepted, in a declaration, a `:=` to a UDT field, or
  a constructor argument. The deciding property is const-ness, not literal
  spelling - `array.from(0, 1 + 2)` widens, and a single non-const `int`
  argument (`array.from(0, k)`) still errors, as on TradingView. This is the
  collection form of the ordinary `float x = 0` promotion. See INV155.
- A comma-separated statement list may now mix an assignment with a bare call,
  as TradingView allows: `b := na, c.clear()`. The assignment-led loop required
  every unit after a comma to be an assignment and threw otherwise, which
  aborted the whole statement and reported `Unexpected token: :=` back at the
  leading assignment - the one unit that was fine. The call-led path always
  accepted both forms, so the same list parsed in one order and failed in the
  other. See INV149.
- A wrapped expression now survives a blank or comment-only line. Commenting
  out one link of a method chain broke the wrap with `Unexpected token: .`,
  because comments are filtered as trivia and both a comment-only line and a
  blank line leave two consecutive newlines - and a newline carries no indent,
  so peeking a single token past the wrap read it as ended. Applies to
  operator wraps as well as method chains. See INV149.
- `analysis`-stage warnings now carry `rule` (e.g. `SHADOW_BUILTIN`) and, where
  the warning mirrors one, TradingView's `code` (`CW10011`). They previously
  carried neither, so 122 of 140 corpus warnings were filterable only by
  matching message prose - despite `--help` advertising the stage as TV's CW
  codes, mirrored. Every code was probed rather than assumed;
  `UNUSED_VARIABLE` deliberately carries none, because TV emits no warning at
  all for an unused variable. See INV148.
- Pre-v5 scripts now report the unsupported-version refusal and nothing else.
  Three v4 files in a corpus sweep got syntax errors alongside it, so the same
  population received two different explanations depending on whether the file
  tripped the lexer. Our lexer and parser implement v6 grammar, so their
  verdicts on v4 source are not evidence, and TV never adjudicates them - it
  rejects the file before parsing. Reverses the call made in INV146. See
  INV148.
- The unknown-argument-name error (CE10120) is now v6-only, matching the
  argument-type gating that already existed for the same reason. `pine-data`
  ships only v6 signatures, so a v5 call was flagged for every parameter v6
  removed: TradingView accepts `plot(..., transp = 100)` on v5 with a
  deprecation warning and rejects it only on v6. Removes 445 false errors
  across 79 corpus fixtures with no new ones. See INV148.

- CLI: `--version` now reports the git commit the binary was built from, e.g.
  `pine-lint 0.5.0 (12ef0e0, built 2026-08-21 10:29:59)`. The ref carries a
  `-dirty` suffix when the working tree had uncommitted changes, so a ref in a
  bug report always points at source that actually ran, and degrades to
  `unknown` outside a git checkout.

- Built-in overload return types now resolve against generic arguments.
  `baseOfRawType` only strips the qualifier, so `matrix<float>` was compared
  verbatim against a `matrix<int/float>` parameter - and the union split was
  naive enough to shred that parameter into `matrix<int` and `float>` - so no
  overload ever matched and the resolver fell back to overload #0's return
  type. `matrix.mult` consequently typed every call as `array<int>`, making
  the function unusable: `matrix<float> c = matrix.mult(a, b)` was rejected on
  code TradingView compiles clean. Union splitting is now bracket-depth aware
  and generics match by container plus element type, invariant in the element
  (Pine collections are). `matrix.diff` and `matrix.sum` had the same bug
  unmasked; 31 further functions were exposed but masked. See INV147.
- Overload selection breaks a qualifier-rank tie by picking the narrowest
  matching overload instead of the first listed. `array.abs` is
  `(array<int/float>) -> array<float>` and `(array<int>) -> array<int>`; an
  `array<int>` argument satisfies both, so `array.abs(array<int>)` typed as
  `array<float>` and was rejected against an `array<int>` declaration that TV
  accepts. See INV147.

- `REPAINTING_SECURITY` no longer exempts a `request.security` just because it
  passes `lookahead`. The old check matched NAMED arguments only and treated
  either value as a statement of intent, so it stayed silent on
  `lookahead = barmerge.lookahead_on` with an un-offset expression - the
  future leak the rule exists to catch, per the Manual - while still flagging
  the same call written positionally. `lookahead` is now resolved
  positionally as well as by name, and only `barmerge.lookahead_off` exempts,
  since that is the Manual's prescribed idiom for lower-timeframe requests and
  HTF vs LTF cannot be decided statically. The message advises the offset
  instead of "record the intent," which taught the wrong fix. Corpus goes from
  119 to 134 sites, all `lookahead_on` without an offset. See INV146.
- The leading `//@version` directive now wins. Version detection took the LAST
  directive scanned, so a `//@version=4` anywhere in the file retroactively
  rewrote the declared version - accepting `study()` under v4 rules while
  still judging `plot(transp = ...)` by v6 rules, a file validated against no
  coherent version. TradingView ignores the trailing directive (probed
  2026-08-21). See INV146.
- Pre-v5 scripts now get one "not supported" diagnostic instead of a cascade
  of v6 argument errors. `pine-data` ships only v6 signatures, and while
  argument-*type* checking was already gated to v6, the unknown-argument-*name*
  error was not - so correct v4 (`input(..., type = input.source)`,
  `plot(..., transp = 50)`) was reported as invalid. TradingView refuses these
  outright with "Supported versions are >= 5"; we now mirror that. Parse
  diagnostics are unaffected. See INV146.

- CLI: `--no-lint` skips the `lint` stage, for callers who want TradingView's
  verdict and nothing else. The lints are on by default.
- CLI: `lint`-stage diagnostics now carry their `rule` id (e.g.
  `REPAINTING_SECURITY`) in the JSON output, so consumers can filter or
  suppress by rule instead of pattern-matching the message prose. Human
  (`-H`) output prefixes the rule in brackets, which also distinguishes our
  findings from TradingView's mirrored warnings at a glance.
- CLI: `--help` now documents the four diagnostic stages (`syntax`, `type`,
  `analysis`, `lint`) and states that warnings never affect the exit code.

- Refresh the Pine v6 reference data and Manual mirror against TradingView
  (previous scrape was 2026-05-29, so the catalog predated TV's July and August
  2026 additions). New parameters: `sort_field` on `array.binary_search`,
  `array.binary_search_leftmost` and `array.binary_search_rightmost`, and
  `calc_on_every_history_tick` on `strategy()`. No functions, variables,
  constants, types, operators or keywords were added or removed - the other
  catalogs regenerated byte-identical. The Manual mirror picks up the rewritten
  Strategies, Chart information and Arrays pages.
- `find-real-failures.mjs` now drops `lint`-stage diagnostics before diffing
  against TradingView. They mirror no TV diagnostic by design, so counting them
  could only ever produce "local-only" - 131 phantom records on the first sweep
  after the semantic lints landed. See INV144.

- Lex triple-delimited multiline strings (`"""..."""` / `'''...'''`), added to
  Pine in April 2026. They previously produced four errors on a script
  TradingView accepts clean: the opening delimiter lexed as an empty string
  plus a stray quote, the newline drew CE10017, and the string's text lines
  became phantom undeclared identifiers. CW10001 (the single-pair multiline
  deprecation) now exempts the new form, which is what its own message tells
  authors to use. See INV145.

- Semantic lints: five checks for Pine that compiles cleanly and is still
  wrong. TradingView accepts all five, so they are warnings on a new `lint`
  stage in the CLI's `result.warnings`, separate from the TV-mirroring
  diagnostics, and they surface as editor warnings too. See INV144.
  - `REPAINTING_SECURITY` - a `request.security()` reading the current,
    still-forming bar of a higher timeframe. Silent on an explicit
    `lookahead=`, a history offset in the expression or on the call, and
    same-timeframe requests.
  - `ACCUMULATOR_LIFETIME` - a `var` accumulator a loop unconditionally re-adds
    to on every bar with no reset, so it grows for the life of the chart (or,
    for `while`, never runs again after the first bar).
  - `PLOT_BUDGET` / `REQUEST_BUDGET` - more than 64 plot-budget calls, or more
    than 40 UNIQUE `request.*()` calls (identical calls are free, per the
    Manual). Also the one-call `request.footprint()` cap.
  - `ENTRY_WITHOUT_EXIT` - a strategy that opens positions with no
    `strategy.exit`/`close`/`close_all` and no opposing entry to reverse into.
    `strategy.cancel` withdraws a pending order and does not count.

- Flag transitively-required library imports. TV requires a library to be
  imported explicitly when a UDT you use has fields referencing its types:
  using `PF.Profile` having imported only `lib_profile` draws four errors, one
  per referencing field type, naming `lib_plot_objects`. We were silent. The
  generator now resolves each library's field annotations through that
  library's own import aliases, since a field type like `D.Line` names an alias
  private to its source that a consumer never sees. Reported once per distinct
  type per script, triggered by member access rather than declaration. See
  INV143.
- Validate `strategy.exit`'s inter-parameter argument groups. TV requires at
  least one of `profit`/`limit`/`loss`/`stop`, or the pair
  `trail_offset` + `trail_price`/`trail_points`; we accepted a bare
  `trail_price =` and passed a script that fails to compile on TV. The
  reference documents no such constraint, so it is probed and baked into
  `functions.json` as `flags.argGroups` rather than written into the checker,
  carrying TV's own wording. Presence is syntactic - an explicit `na` counts.
  See INV142.
- Emit CE10288 for `var` in a type declaration. `varip` is the only legal
  qualifier on a UDT field. The field scanner recognised only `varip`, so a
  `var`-qualified field was dropped entirely, and a dropped field name reads as
  a typo - which relocated the complaint to "Object has no field" at every
  usage, or produced silence outright where the field was never read. See
  INV141.

- Validate imported UDT surfaces. We knew a library exported `News` but nothing
  about its insides, so every member of an imported UDT instance stayed
  lenient. Libraries now emit their type fields, and imported types register
  through the same machinery as local UDTs. Two pre-existing bugs surfaced and
  were fixed en route, neither about imports: UDT-annotated *parameters* typed
  as `unknown` (so `f(pt p) => p.bogusField` was silent for local types too),
  and the field scanner silently dropping `varip`-qualified and UDT-typed array
  fields - a live false positive on TV-clean code that cost one library 17 of
  its 30 fields. See INV140.
- Validate imported-library types. A library's `export type` never reached its
  export set, so dotted type annotations (`ffUtil.News`) went unchecked. Two
  layers were broken: the parser did not mark a `TypeDeclaration` as exported,
  and the generator filtered to functions and methods. TV reuses its local-type
  wording here (`"ffUtil.Newz" is not a valid type keyword.`) rather than the
  CE10271 form it uses for unknown library function members. Lenient wherever
  the surface is unknown. See INV139.
- Check method calls on scalar and collection receivers. An unknown member on a
  receiver resolving to a scalar (`x.abs()`) or to an array/matrix/map
  (`arr.pushx()`) is TV's CE10271 and we were silent. The collection method
  surface is derived from the catalog rather than hardcoded, since the builtin
  method form and the namespace function are the same entry. Gated on imported
  libraries' export sets, because a library's exported method is callable
  unqualified on a receiver of its first parameter's type - TV authority over
  prose, which documents only namespace-qualified access. Also fixes an
  inference bug this exposed: `arr[1]` is the history operator, so it stays
  `array<T>` rather than typing as the element. See INV138.

- Strip TradingView's invisible whitespace from generated examples and prose.
  TV renders reference examples with `&nbsp;` for indentation, which Puppeteer
  decodes to literal U+00A0, so `annotations.json` carried 1330 non-breaking
  spaces - every space in each annotation example, none of which would compile
  if copied as Pine. Offline generate-time normalization; no re-scrape needed.

- Extend the `==`/`!=` CE10123 alignment to nonliteral and both-const operand
  pairs (`boolVar == stringVar`, `color.red == 1`), which still fell back to
  our own "Type mismatch" wording. Applies TV's probed operand priority; pairs
  outside the probed primitive/enum set keep the generic fallback. See INV137.
- Type namespaced constants in the pine-lint variable list. Variables
  initialized from `color.red`, `display.none`, `barmerge.gaps_off` and the
  like reported as "undetermined type" in the variable-list output even though
  the checker typed them correctly. See INV136.
- Use matched overload returns in builtin inference, preserving argument
  qualifiers the merged return drops. Casts are the motivating case: their
  merged return is const, so `int(close)` was inferred const where TV types it
  `series int`. `int(5)` stays const. See INV135.
- Check UDT and simple-qualified parameters at user-function call sites: a
  declared UDT passed where a different UDT is expected, and a series value
  passed into a `simple <primitive>` parameter. Scoped to non-overloaded,
  non-method UDFs with a clean parse. See INV134.
- Flag ternary tuple returns (CE10163). TV rejects ternaries whose branches
  produce tuples; our checker accepted the shape. See INV127.
- Diagnostics no longer leak doubled line numbers on `\r\r\n` files. The lexer
  counts those as two breaks to match TV internally (G005), but the raw line
  numbers reached emitted diagnostics, so a 3-line file reported on line 5. Raw
  lexer lines now map back to displayed source lines at the emission boundary.
  See INV128.
- Consistency-warning (CW10003/4) precision: four further false-positive
  classes suppressed and two false negatives caught, all probe-validated
  against TV - `bar_index[1]` inside a UDF counts as function history while
  ordinary builtin history like `high[1]` does not; undetermined-UDF and
  undetermined-local gates no longer read as series gates; and UDT names now
  count as parent-scope names for CW10013 shadowing, whose anchor also moves to
  the leading type token to match TV. See INV129 through INV133.

- Warn on user-global-index UDFs called inconsistently. TV emits CW10003 when a
  UDF body indexes a user-declared global series variable *and* the call sits
  in an inconsistent context (conditional or in a loop). Neither ingredient is
  sufficient alone, which is why an earlier bare user-global-index rule
  over-fired; the classification deliberately does not cascade to callers. See
  INV126.
- Type drawing-handle annotations, so `line`/`label`/`box`/`table`/`linefill`/
  `polyline`/`chart.point` declarations catch int-into-handle assignments
  (CE10173). Matched case-sensitively against the original annotation, since a
  capitalized `Box`/`Line` is a legal user-defined type. Previously blocked by
  the `series<float>` UDF guess, now removed. See INV125.
- Const-argument (INV014) and union-argument (INV016) CE10123 checks now catch
  violations flowing through a variable or a UDF call. The two blanket gates
  that skipped user-typed values are gone, made safe by the grounded inference
  below. See INV124.
- UDF return inference is call-site sensitive. An untyped parameter was bound
  to a hardcoded `series<float>` guess, so a UDF returning that parameter was
  typed `series<float>` at every call site regardless of the arguments passed -
  masking real false negatives and manufacturing false positives wherever the
  guess was consumed. Replaced with a monotone call-graph fixpoint that binds
  each untyped parameter to the join of its call-site argument types; ambiguous
  sites ground to `unknown` rather than to a scalar guess. See INV123.
- New qualifier-provenance layer exposing a value's qualifier (the
  series/simple/input/const lattice) to the checker, deduplicating three prior
  copies of that lattice. Const is preserved through const-returning UDFs. See
  INV122.

- Consistency-warning precision, the first round. Series is now contagious
  through call arguments, so the McGinley `na(mg[1]) ? ...` idiom is recognised
  as series-conditional; an untyped UDF parameter is treated as "undetermined"
  rather than series, which alone removed 249 corpus false positives on
  TV-clean files from the dominant MA-selector idiom; a conditional `:=` to a
  const under a series-gated branch makes its target series; history-dependent
  *method* calls register under their bare name and so can warn; and a local
  assigned under an undetermined gate no longer counts as own-scope history.
  See INV114 through INV116, INV120.
- Detect history-dependence of imported-library calls. CW10003 fires when a
  conditionally-called function is history-dependent, including one living in
  an imported library, but we knew only each library's export *names*. Library
  generation now scans vendored bodies and records which exports are
  history-dependent. For libraries whose source cannot be redistributed, the
  API fact alone is recorded, derived once and the source discarded. See
  INV118.
- Series-type tuple destructuring from a UDF return, so
  `[a, b] = f()` marks its members series and a later `if a > b` reads as
  series-conditional. See INV117.
- Align `==`/`!=` type-mismatch diagnostics to TV's CE10123 template, the last
  binary path still emitting our own wording. TV anchors at the literal operand
  and reports the other operand's type as expected, independent of operand
  order.

## 0.5.0 - 2026-06-25

First release as pine-tools.

- Pine Script v6 language support
- IntelliSense with 475 functions, 162 variables, 237 constants
- Real-time diagnostics and validation
- Go-to-definition and find references
- Hover documentation
- Code formatting
- Symbol outline and folding
- Semantic token highlighting
- Rename support
- Inlay hints for function parameters
- Library import resolution via `/// @source` directive
- LSP server for editor integration
- MCP server for AI assistants
- CLI linter tool
