# INV031 - undefined-variable stragglers on TV-clean files

**Status:** resolved 2026-06-04. The three TV-clean files carrying the
remaining genuinely-fixable undefined-variable FPs (34 records:
`d88ffa83…` 14, `ca2e4ee7…` 10, `fffe6a2f…` 10) all lint **0 errors**
now. Three distinct parser gaps; one fix each.

The rest of the undefined-variable category was NOT fixable: the
`at`/`https` pairs (`4d78be7e…`, `988d8b59…`) and `13a74513…`'s trio
sit in files where TV's single reported error is a LEXICAL abort
(INV025's CE10017), so TV has no parse/semantic verdict for any
position - including positions BEFORE the stop. (The post-TV-stop
bucketing keys on position and deliberately keeps pre-stop records
visible; a lexical-abort refinement would bucket these too.)

## Bug 1 - tuple destructure RHS on a wrapped blank-line continuation

```pine
[priceBasis, upperPriceInner, lowerPriceInner, upperPriceOuter, lowerPriceOuter] = 

     calculateBollingerBands(src, ...)
```

(`d88ffa83…:547`.) `tupleDestructuring` consumed `=` and called
`expression()` directly - unlike `variableDeclaration`, it never called
`skipWrapContinuationNewline()`, so the blank line broke the parse and
the backtrack re-read `[...]` as an ArrayExpression USE of the five
names: undefined-variable errors at the declaration site plus every
later use. One-line fix.

## Bug 2 - type keywords as variable names

```pine
method draw_circle(bool src, int mult_x, int mult_y) =>
    ...
    var color color = na
```

(`ca2e4ee7…:181`.) `variableDeclaration`'s
`consume(IDENTIFIER, "Expected variable name")` threw on the KEYWORD
token, shredding the method body - its params and locals (`src`,
`source`, `angle`, `mult_x`, `mult_y`) spilled out as 10 undefineds.
TV accepts type keywords as variable names (`var color color = na`,
`var line line = na` - probe b types them series color / series line).
Fixes: `variableDeclaration` accepts a type-keyword token as the name
when directly followed by `=`; `varDeclarationAfterKeyword` leaves a
type keyword followed by `=` for the name (so `var color = na`
declares `color` rather than reading an annotation with no name).

## Bug 3 - if-expressions parsed as a bare `if` Identifier

```pine
export monthInDays(int mon, int yer, bool rolloverMonths = false) =>
    int m = if rolloverMonths
        ...
    else
        ...
```

(`fffe6a2f…:303`.) `expression()` had no if-expression support - the
`if` keyword fell through to the generic keyword-as-Identifier branch
in `primary()`, the declaration captured `init = Identifier("if")`,
and the branches shredded the enclosing function body (params + locals
undefined, 10 records). At top level the same form "worked" only by
accident (the branch lines parsed as harmless loose statements).

Fix: new `IfExpression` AST node mirroring `SwitchExpression`'s
treatment - `primary()` parses `if` in expression position with the
statement machinery (`Parser.ifStatement`, made public like
`switchExpression`) and re-tags it; the checker validates branches as
scoped statement blocks and infers the value from the consequent's
tail expression (mirroring the switch first-arm rule).

## Probes (`pine-lint --tv`, 2026-06-04, files in this directory)

All accepted with zero errors; each disagreed with our pre-fix
validator, confirming they reached TV:

- `probe-a-tuple-blank-line-rhs.pine` - `[mid, upper, lower] =` +
  blank line + indented RHS. TV: all three series float, the UDF
  `bands(...) → [series float, series float, series float]`.
- `probe-b-type-keyword-names.pine` - `var color color = na`,
  `var line line = na`, `color := ternary`. TV: variables named
  `color` (**series color**) and `line` (**series line**).
- `probe-c-if-expression-in-udf.pine` - `int m = if roll` ... `else`
  ... inside a UDF. TV: `m` **series int** spanning the whole
  if-expression (definition 4:5-8:47), `normalized` scoped to the
  consequent (scopeId #2), `monthClamp(...) → series int`.

## Verification

- Regression fixture:
  `packages/core/test/fixtures/regression/INV031-undefined-variable-stragglers.pine`
  (all three patterns, `@expects no-errors`).
- All three corpus files: 0 errors. 257/257 tests.
- Corpus diff: 13 appearances, all explained - `22ce35b0…` (a 2-line
  versionless fragment where `var color = isGreen ? green : red` now
  correctly declares `color` and the init's names are genuinely
  undefined in the fragment); `71e51a35…` (mangled v5 hard-wrap with
  bracket depth 19 at the affected line - 19 unclosed parens whose
  closers were eaten by INV025-style string breaks suppress every
  NEWLINE token, so any parse there is cascade shuffle);
  `b1381725…` (v5 truthiness reached by newly-correct parsing).
  ~570 disappearances, dominated by the three clusters and their
  knock-on cascades in the mangled files.

## Side observations

- `71e51a35…`'s bracket-depth runaway suggests a lexer hardening:
  reset `bracketDepth` when a column-1 statement keyword appears at
  depth > 0 (a real `(`-continuation can't start a new top-level
  statement). Not attempted this round - it would shift cascades on
  all 46 mangled files; needs its own measured pass.
- The lexical-abort refinement to the post-TV-stop bucketing (above)
  would move ~7 unconfirmable records out of the confirmable count.
