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
