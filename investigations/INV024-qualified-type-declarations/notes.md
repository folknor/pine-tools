# INV024 - `series`/`simple` qualified type declarations split the statement

**Date:** 2026-06-04. **Found under:** TODO #9 (type-inference where we
infer non-bool but TV infers bool). **Fixed at:** parser
(`packages/core/src/parser/parser.ts`). **Regression fixture:**
`packages/core/test/fixtures/regression/INV024-qualified-type-declarations.pine`.

## The trail

Started from the #9 FP table: `0277c9c016df…` alone carried 11 bool-operand
FPs ("Operator 'and' requires bool operands, but left operand is
series<float>" and friends), all tracing to one variable `_grabBuyside`
destructured from a UDF tuple return:

```pine
[_grabFound, _grabBuyside, _grabSize] = detectLiquidityGrab()
```

Inside the UDF the locals are explicitly typed (`series bool _grabBuyside
= true`), and the INV010 machinery should have recovered the element
types. It never got the chance: the AST showed the function body
containing ONE statement - a stray `Identifier "series"` expression - with
the rest of the declaration (`bool a = ...`) and every following body
line spilled to TOP LEVEL.

## Root cause

`series`/`simple` are lexed as KEYWORD but were deliberately excluded
from `VAR_TYPE_KEYWORDS` ("base types only, excludes qualifiers"), and no
statement-level parse path consumed a qualifier before a type. So:

- `series bool a = ...` at any statement position -> stray `series`
  expression statement + the remainder re-parsed from `bool`. At top
  level the declaration survived by luck (annotation `bool`, qualifier
  dropped). Inside a function body the stray expression terminated the
  body and everything after spilled to the enclosing scope - breaking
  tuple-return typing (INV010 path) AND producing undefined-variable
  cascades (locals declared before the split stayed in the function
  scope; references after the split landed at top level).
- `var series float c = ...` / `const simple int d = ...` were silently
  DROPPED (no statement produced, no error) - every later reference
  became "Undefined variable 'c'".

`mapToPineType` already understood combined strings ("series bool" ->
`series<bool>`); the parser just never produced them.

## TV probes (pine-lint --tv, 2026-06-04)

Probe 1 - qualified declarations inside a UDF body + tuple destructure:

```pine
//@version=6
indicator("probe")
f() =>
    series bool a = close > open
    series int b = 1
    [a, b]
[x, y] = f()
q = x and close > open
plot(q ? 1 : 0)
plot(y)
```

TV: zero errors/warnings; `success:true` with full variable list - `x`
typed `series bool`, `y` `series int`, `f` returning
`[series bool, series int]`. (Disagrees with our pre-fix local verdict,
proving the call reached TV.)

Probe 2 - top-level qualifier-led and var-qualified forms:

```pine
//@version=6
indicator("probe")
series float a = close
simple int b = 1
var series float c = close
plot(a + b + c)
```

TV: zero errors; `a` `series float`, `b` `simple int`, `c` `series float`.

Probe 3 - qualifier after `const`:

```pine
//@version=6
indicator("probe")
const simple int d = 2
plot(d)
```

TV: CE10147 at 3:7-3:12 - "Cannot specify a type form \"{typeKeyword}\"
without also specifying the type." (ctx.typeKeyword = "simple"). So
TV REJECTS the qualifier-after-const combination while accepting it
after var/varip. We parse it leniently (declaration kept, no error);
implementing CE10147 is a possible follow-up.

Probe 4 - subscripted declaration target (see "Recovery" below; v5 form
from the corpus file that surfaced it):

```pine
//@version=5
indicator("p")
f(int index) =>
    series float body = math.abs(close[index] - open[index])
    series float t[index] = 1.5 * body
    t
plot(f(0))
```

TV: ONE error at 5:19 - "Mismatched input '[' expecting '='" - and
stops.

## Fix

`parser.ts`, four sites plus one recovery:

1. `isQualifiedVarTypeKeyword()` helper - `series`/`simple` KEYWORD
   directly followed by a base type keyword.
2. Statement-level typed-declaration branch accepts the qualifier and
   folds it into the annotation (`"series bool"`), including the
   comma-separated continuation units.
3. The comma-after-var sequence branch does the same.
4. `varDeclarationAfterKeyword` consumes an optional qualifier after
   var/varip/const (`var series float c = ...`). Lenient on the
   const+qualifier combination TV rejects (probe 3).
5. Recovery for `type name[expr] = ...` (probe 4): without it, the
   backtrack re-parsed the line as junk expression statements and the
   enclosing function body broke - in `64556f6c…` (v5) that converted to
   160 undefined-variable cascades once the qualifier fix let the body
   parse correctly up to its real syntax error. Now we emit exactly TV's
   one error ("Mismatched input '[' expecting '='" at the bracket),
   parse the line as a declaration, and keep the block intact.

## Outcome (corpus, 2026-06-04, on top of `a472f3a`)

- Baseline error records 17159 -> 16835 (-324 net).
- `0277c9c016df…`: all 14 targeted records gone (11 bool-operand FPs +
  3 undefined-variable artifacts), every one TV-silent-confirmed.
- 52 TV-silent disappearances + ~274 disappearances in v4/v5 files
  (cascades cleared); the heavy hitters were function bodies split by
  a qualified declaration.
- 2 new appearances, both verified intentional:
  - `64556f6c…` 13:34 "Mismatched input '[' expecting '='" - the probe-4
    true positive (TV reports the same and stops there; our line-21
    "Cannot assign series<bool> to series<float>" is a real catch TV
    never reaches).
  - `b16b394…` 511:6 "Undefined variable 'TFhrdata'" - pre-existing
    default-switch-arm parse break (the "Unexpected token: =>"
    pending category; the same file already had the identical artifact
    at 295:6 in baseline). Visible now because the body parses deeper;
    swaps against a disappeared 307:29 artifact in the same file.
- 3 same-position message changes - more precise qualified types in the
  wording (e.g. "Cannot assign series<bool> to float" -> "... to
  series<float>").

## Side notes

- Inline statement units (`parseInlineStatementUnit`) accept no typed
  declarations at all (not even `int x = 1` inline) - unchanged here,
  separate gap if it ever surfaces.
- `series array<float> xs = ...` folds to an annotation `mapToPineType`
  doesn't map (returns `unknown`) - lenient, no FP risk.
- CE10147 (qualifier without type / after const) is a checker FN we
  could add cheaply now that the parse is structured.
