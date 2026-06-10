# Investigations

Each investigation captures the full story behind a specific
disagreement between our linter and `pine-lint`: how we narrowed it
down, what we tested, what we decided, and why. The matching
regression fixture lives in
`packages/core/test/fixtures/regression/` so the discovery test runner
locks the decision in.

## Format

`INV###-short-name/` - sequential numbering, never reused. Each
directory contains at minimum `notes.md` (the timeline + reasoning) and
should link to the regression fixture that exercises the decision. If
an investigation is later overturned, mark it superseded inside the
file rather than renumbering.

**`--tv` validation is mandatory to record.** Any finding validated
against TradingView must include, in the investigation:

1. the exact `.pine` script(s) sent to `pine-lint --tv` - the
   reproducible probe, not a paraphrase, and
2. TV's results for them (verdict / raw output), dated.

A prose verdict without the probe + output is not acceptable. A `--tv`
result is a point-in-time measurement, not a permanent fact (TV's linter
changes - see `gotchas/G001`), so it must be re-runnable; a later
contradiction means re-measure, not "the earlier author was wrong."

## How to use this folder

- Add an entry to the **Index** below: link + a few keywords.
- Reference investigations from code via `// see INV###`. Long
  reasoning belongs in `notes.md`, not at the call site.
- See [CLAUDE.md](../CLAUDE.md) for the project methodology that
  drives this folder.

## Index

- [INV001](INV001-ternary-branch-compat/notes.md) - ternary branches,
  cross-type, TV-silent-on-nonsense, type-compatibility
- [INV002](INV002-export-enum-type/notes.md) - parser, `export enum`,
  `export type`, library exports, symbol-table-cascade
- [INV003](INV003-qualifier-user-type-param/notes.md) - parser, method
  / function parameters, qualifier + user-defined type, parameter-scope
- [INV004](INV004-array-suffix-in-params/notes.md) - parser, method /
  function parameters, `T[]` array-suffix syntax, mapToPineType
- [INV005](INV005-udf-param-type/notes.md) - type-inference,
  inferFunctionReturnType, UDF parameter type, expression cache,
  bool-param-as-series-float
- [INV006](INV006-method-variable-namespace/notes.md) - symbol-table,
  Scope, methods, variables, namespace, lookupCallable
- [INV007](INV007-type-body-blank-line/notes.md) - parser, type/enum
  body, blank-line, NEWLINE indent, body-skip
- [INV008](INV008-if-body-indent-leak/notes.md) - parser,
  ifStatement, body indent, scope leak, blockDepth-stuck, also fixes
  task #4
- [INV009](INV009-cannot-call-fns-mostly-column-shifts/notes.md) - 
  analysis, "Cannot call" FNs, column shifts, polymorphic bypass,
  pine-data unions. **RE-MEASURED 2026-06-02: isolated --tv probes show all 3
  are real CE10123 FNs, contradicting the 2026-05-28 "all TV-accepted"
  correction (a `--tv` measurement error - see G002). See INV014 / G002.**
- [INV010](INV010-udf-tuple-return-types/notes.md) - type-inference,
  inferTupleElementTypes, UDF tuple destructure,
  bool-as-series-float
- [INV011](INV011-bundled-function-behavior-not-loaded/notes.md) - 
  bundle, esbuild, __dirname, function-behavior.json,
  polymorphic-resolution-disabled
- [INV012](INV012-parser-sync-column-1/notes.md) - parser, error
  recovery, synchronize, cascade, column-1 anchor
- [INV013](INV013-polymorphic-arg-validation/notes.md) - polymorphic
  arg-validation bypass removed, union param types, v6-only arg checks,
  v4/v5 leniency
- [INV014](INV014-const-arg-enforcement/notes.md) - const-arg enforcement
  (CE10123), overload return-qualifier resolution, qualifier-stripping,
  `input.time(timestamp(...))`, exhaustive `--tv` audit, supersedes G002's
  widenings (a `--tv` measurement error)
- [INV016](INV016-union-arg-validation/notes.md) - validate union-typed
  args (`nz`/`fixnan`/`int` base-type FNs); reliability gate; fixed
  polymorphic-fallback-to-color mis-inference (−21 FPs). Completes #28.
- [INV015](INV015-remove-disproven-overrides/notes.md) - removed the
  now-stale `FUNCTION_PARAM_TYPE_OVERRIDES` (G002 superseded); `plot.title`
  const-enforcement now fires; `nz`/`fixnan`/`int` need union-param
  validation (the checker skips union-typed params - INV013 safety net)
- [INV017](INV017-wrap-indent-multiple-of-4/notes.md) - line-wrap
  continuation lines must not be indented by a multiple of 4 (TV CE10013,
  probed); unrestricted continuation glued switch arms into calls.
  Found under TODO #33.
- [INV018](INV018-conditional-series-history-dependence/notes.md) -
  CONDITIONAL_SERIES re-founded on history-dependence (flags from
  pine-data + UDF body scan), scope extended to ternary/and-or/switch,
  TV's CW10002/3/4 wordings probed. Also: --tv responses DO carry a
  `warnings` array. Closes TODO #32.
- [INV019](INV019-cw10001-multiline-string-deprecation/notes.md) -
  CW10001 multiline-string deprecation warning implemented (TV wording
  verbatim, anchored col 1 of the literal's opening line, probed).
  Lexer addToken position bug for line-spanning tokens fixed en route.
  Part of TODO #37.
- [INV020](INV020-cw10013-variable-shadowing/notes.md) - CW10013
  (shadowing parent-scope variable, source-order gated, params exempt)
  and CW10011 (shadowing built-in VARIABLE, any scope; function/
  namespace names silent) implemented from a lexical scope stack.
  Found CE10190 as a checker FN (TODO #40). Part of TODO #37.
- [INV021](INV021-cw10018-local-variable-history/notes.md) - CW10018
  (history of conditionally-declared locals) implemented per `[]`
  occurrence; same series-condition gate as INV018 (input-gated arms
  silent, loops always, function top-level bodies exempt - probed
  with a TYPED UDF to rule out endpoint blindness). Closes TODO #37.
- [INV022](INV022-andor-right-always-conditional/notes.md) - and/or
  right operands are ALWAYS conditional (CW10002 fires under an input
  left operand - probed); INV018's series gate there was an
  over-extrapolation and is removed. Gate stands for
  if/ternary/switch. Closes TODO #39.
- [INV023](INV023-ce10190-builtin-shadow-after-use/notes.md) -
  CE10190: declaring a variable named after a built-in errors when
  the built-in was referenced earlier in source (any scope, global
  redecls too; no prior use = CW10011 only). Checker-side, v6-only.
  Closes TODO #40.
- [INV024](INV024-qualified-type-declarations/notes.md) - parser,
  `series`/`simple` qualifier-led declarations split the statement
  (function bodies truncated, `var series` decls dropped); qualifier
  now folds into the annotation; subscripted-target recovery
  (`type name[i] = ...`, TV's "Mismatched input '['" probed). Found
  under TODO #9; -324 corpus error records.
- [INV025](INV025-multiline-string-continuation-indent/notes.md) -
  lexer, a single-pair string continues onto the next line only if that
  line starts with whitespace or is blank; a non-whitespace char at
  column 1 (even the closing quote) terminates it with CE10017 at
  (openLine, 1) - probed, indent need NOT avoid multiples of 4 (unlike
  INV017 expression wraps). Five corpus CE10017 FNs fixed; motivated
  the find-real-failures post-TV-stop bucketing.
- [INV026](INV026-literal-color-and-param-guess-fps/notes.md) - the
  18-hit ternary-FP cluster (#18): hex color literals inferred as
  'string'; the UDF return-type inference pass poisoning the shared
  expression-type cache with series<float> param guesses; and
  return-follows-param builtins (ta.valuewhen) falling back to a
  frozen overload-#0 'color' return when the source arg is untyped.
  TV probes: all three patterns accepted, params/results typed
  "undetermined type". INV001's strict branch check itself stands.
- [INV027](INV027-cannot-assign-fps/notes.md) - the "Cannot assign"
  FP cluster: generic placeholder returns (matrix.transpose ->
  matrix<type>) now resolve from the collection arg's element type;
  request.security_lower_tf's array<type> follows the expression arg;
  a comma-declaration annotation binds only to its own unit (TV-probed:
  `bool a = true, b = 1` types b const int); blank lines are allowed
  inside a wrapped ternary. All probed; 13-hit cluster cleared.
- [INV028](INV028-operand-anchored-operator-errors/notes.md) - TV's
  CE10123 operator errors anchor at the offending OPERAND, one error
  per bad operand (`if ph or pl` with two float operands = two errors,
  probed). Our and/or and arithmetic/comparison errors re-anchored to
  match; the 13-hit tv-only "Cannot call operator" cluster was never
  a detection gap, just anchor mismatch counted twice by the
  position-keyed diff.
- [INV029](INV029-nbsp-between-tokens/notes.md) - U+00A0: mid-line at
  bracket depth 0 is TV's CE10005 ("no viable alternative at
  character"), anchored at the NBSP; inside ( ) / [ ] it is accepted
  whitespace; as indentation TV wrap-joins the line (we deliberately
  keep reading it as block indent - plan/31). One error per file,
  matching TV's stop-at-first. All six corpus FN positions match.
- [INV030](INV030-blank-line-wraps-and-if-tail-tuples/notes.md) - the
  6874e636 cluster (201 records vs TV's clean verdict): ALL binary
  operator continuations now skip blank lines like INV027's ternary
  (blank-line path gated on INV017's wrap-indent rule - an ungated
  version glued `    -1 =>` switch arms), and UDF tuple returns are
  captured from if/else tails (previously only trailing
  expression/return; elements defaulted to series<float>). Both
  probed. File now lints 0 errors, matching TV.
- [INV031](INV031-undefined-variable-stragglers/notes.md) - the last
  fixable undefined-variable FPs (34 records, 3 TV-clean files):
  tuple-destructure RHS on a blank-line wrap (the missing
  skipWrapContinuationNewline); type keywords as variable names
  (`var color color = na` - TV types it series color, probed); and
  if-EXPRESSIONS (`int m = if cond` ...) - new IfExpression node
  mirroring SwitchExpression, parsed with the statement machinery.
  All three files now lint 0 errors.
- [INV032](INV032-declaration-initializer-types/notes.md) - strict
  declaration/`:=` base-type rule (CE10173: exact base match, int->float
  widening only, na to any keyword but bool, qualifiers free) and
  CE10097 bare-na-needs-type-keyword; 21 probes. Exposed and fixed:
  `0.0` literal typed int (raw lexeme now consulted), na identifier
  typed unknown (RESERVED_KEYWORDS overwrote simple<na>), ternary
  unknown-vs-na typed na, version not threaded into function/method
  bodies, no-annotation files validated as v6 (now v1 per TV),
  math.round/floor/ceil wrongly polymorphic-numeric (+
  detectReturnTypeParam set-equality coincidence on math.round, now
  requires a functional per-overload mapping).
- [INV033](INV033-invalid-type-keyword/notes.md) - CE10149 `"X" is not
  a valid type keyword.`: declarations must name a built-in type, a
  pine-data object type, or a UDT/enum declared EARLIER in source
  (use-before-declaration is the same error; undeclared CamelCase
  types get the same message - 6 probes). Validated at the statement
  start with a same-physical-line gate so hard-wrap mangle artifacts
  (`IDENT IDENT =` glued across lines) stay unflagged.
- [INV034](INV034-for-body-wrap-indent/notes.md) - CE10161
  `Incorrect "for" statement. Expecting "to <expression>".`: a
  COMPLETE counted-for header whose body line is a wrap continuation
  (indent not a multiple of 4 - INV017) glues into the header and
  breaks the statement. Anchored at the `for` keyword; 4-multiple
  bodies and genuinely wrapped headers stay clean (3 probes).
- [INV035](INV035-already-defined/notes.md) - CE10095 `"X" is already
  defined`: same-scope redeclaration with `=` (typed, untyped, after
  var, and params-in-body all error; `_` is exempt; parent-scope
  shadowing stays the INV020 warning - 6 probes). Implemented as a
  lexical declScopes stack since the symbol table neither scopes
  if-bodies nor separates builtins. En route: `name := expr` comma
  units were parsed as DECLARATIONS - now AssignmentStatement, which
  also collapsed a 14-record cascade in `dd8f47ce…`.
- [INV036](INV036-undefined-function-reference/notes.md) - CE10271
  `Could not find function or function reference 'X'`: an identifier
  callee must be a built-in or a UDF/method declared earlier in source
  (call-before-definition and variables-as-callees error too - 3
  probes). Tracked in a checker-side declaredFunctionNames set because
  variables hide functions in the shared symbol namespace
  (`loss = loss(...)`, `[sto] = sto()`, body-local pre-collected over
  a global UDF are all TV-legal calls).
- [INV037](INV037-if-branch-scope/notes.md) - v6 if branches are real
  scopes: branch-local declarations are invisible outside (TV
  "Undeclared identifier" on `[stopLoss, takeProfit]` after if/else
  declarations). v6-GATED - an ungated draft hit 230 v4/v5 corpus
  records on published working scripts, proving the leak was legal
  pre-v6 (G004).
- [INV038](INV038-nested-collection-template/notes.md) - CE10025
  `Cannot use a collection in a type template of another collection`:
  array/matrix/map as a constructor type argument errors TWICE (at the
  call and the statement start, matched exactly); the
  `array<array<float>>` ANNOTATION form is the distinct CE10022
  `Arrays of type array are not supported.` (3 probes).
- [INV039](INV039-enum-field-type/notes.md) - CE10125 `Incorrect field
  type ... Expected type: "literal string"`: enum field values must be
  string literals; int/float/bool values error per field at the field
  name. Bonus: the inventory's mysterious `pinePos` record is a
  TV-SIDE CRASH STRING (CE10294) deterministically accompanying
  CE10125 at the same span - TV noise, not a diagnostic (3 probes).
- [INV040](INV040-series-switch-const-arg/notes.md) - series-condition
  switch results are SERIES (inference now wraps them) and a
  series-qualified USER variable is provably non-const, so
  `plot(title=trend)` matches TV's CE10123 byte-for-byte. Narrows the
  INV014 reliability gate without giving up its FP protection
  (unqualified inferences still pass).
- [INV041](INV041-if-condition-anchor/notes.md) - the non-bool
  if-condition error now uses TV's wording and anchors at the
  CONDITION, not the if keyword. Never a detection gap (the INV028
  anchor-mismatch pattern); 235 corpus records moved as verified
  same-line rename pairs.
- [INV042](INV042-trailing-wrap-multiple-of-4/notes.md) - a TRAILING
  operator (`?`, `:`, `and`, ...) only wraps when the continuation
  indent is NOT a multiple of 4 (column 1 included); multiple-of-4
  continuations are TV's CE10156 at the wrapping line's end (6 probes).
  We still join for recovery. Leading-operator wraps at indent 4 are a
  probed residual (CE10013) - TODO #45.
- [INV043](INV043-block-comments/notes.md) - Pine has NO block
  comments; our lexer scanned `/* ... */` as a COMMENT token. TV lexes
  `/` `*` as operators and fails emergently: line-leading gets CE10156
  "new line" at column 1, mid-line gets CE10156 "*" at the `*`
  (3 probes). Still consumed as trivia for recovery.
- [INV044](INV044-tuple-reassignment/notes.md) - `[a, b] := f()` is
  invalid (tuples only DECLARE); both `=` and `:=` lex as ASSIGN so the
  tuple parser accepted either. TV's CE10156 at the `:=`, now matched;
  the statement still yields a TupleDeclaration for recovery.
- [INV045](INV045-empty-script/notes.md) - a source with no statements
  (comments-only or empty) is TV's CE10250, sent WITHOUT a position;
  we emit at 1:1 and the diff scripts normalize position-less TV
  diagnostics to 1:1 to match.
- [INV046](INV046-unclosed-groups-array-literals/notes.md) - two
  findings: unclosed `(` was an anchor mismatch (TV: CE10015 at the
  opener's line, column 1 - now lexer-reported from an opener stack at
  EOF), and `[...]` on a single-name RHS is invalid EVEN WHEN CLOSED
  (no array literals in Pine; CE10156 at the `[`, declaration and `:=`
  both probed). Valid tuple positions (UDF tails, request.security
  args, destructures) stay clean.
- [INV047](INV047-mangle-file-recovery-fps/notes.md) - per-record
  triage of the string-lexer-abort mangle files (TODO #44, rejected the
  blanket no-verdict bucketing): the 300+ local records split into
  probe-backed TPs (strings, INV042 wraps, `bar index` - TV CE10156 at
  our anchor) and four reproducible RECOVERY bugs flagging correct code
  (declaration swallow, in-call shredding, body scope spill, switch-arm
  cascade) - queued as TODO #46. Bonus fact (4 probes): continuation
  inside an open call paren is INDENT-FREE in TV; the wrap-indent rule
  is depth-0 only.
- [INV048](INV048-type-namespace-as-value/notes.md) - TODO #3 inverted:
  the `chart.point` FP was already gone; the real gaps were FNs (bare
  built-in type/namespace names in value position are TV's CE10272
  `Undeclared identifier`, bare enum names CE10074, bare UDT names
  accepted - 13 probes) and one data-gap FP (`syminfo.cftc_code` is
  linter-accepted but reference-undocumented; baked in via the new
  UNDOCUMENTED_VARIABLES pipeline override, probe + date recorded).
- [INV049](INV049-tuple-destructure-init-types/notes.md) - tuple
  destructure inits: if/switch EXPRESSION inits now type their elements
  by descending branch tails (was: every element defaulted to
  series<float>, drawing bool-condition FPs - the inventory's last
  unexplained type-checker records), and a BARE tuple literal init is
  flagged with TV's CE10156 at the RHS `[` (probed; resolves INV046's
  deferred residual - only call providers are valid there). 3 probes.
- [INV050](INV050-param-optionality-polarity/notes.md) - param
  optionality polarity: scrape.ts marked params optional unless the
  prose said "required argument", so only 28/1292 builtin params
  shipped required and missing-arg detection never fired (`ta.sma()`
  passed). Fixed empirically: a zero-arg call makes TV enumerate every
  required param as CE10165, so a 475-function probe sweep
  (`scripts/probe-required-params.mjs` ->
  `pine-data/raw/v6/required-params-probe.json`, 718 required params)
  is now the single source; the checker emits TV's exact wording.
  Hidden one-arg overloads (ta.highest et al, remarks-only) probed and
  synthesized into overloads[]. 6 probes + sweep.
- [INV051](INV051-method-contextual-keyword/notes.md) - `method` is a
  contextual keyword: used as a plain variable name (`method =
  input.string(...)`, `method == "ADX" ? ...`) it must not enter the
  method-declaration path - it did, emitting a phantom "Expected method
  name after 'method'". Also TV accepts reserved-word method *names*
  (`method type(...)`, `method float(...)`, `method label(...)`). Fixed
  by gating the declaration on the `method <name> (` shape (name token
  + LPAREN) and letting `methodDeclaration` accept a KEYWORD name. 3
  probes.
