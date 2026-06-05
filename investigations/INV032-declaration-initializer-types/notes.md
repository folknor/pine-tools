# INV032 - Declaration/reassignment initializer type rules (CE10173, CE10097)

**Date:** 2026-06-05
**Status:** RESOLVED - strict declaration/assignment checks implemented
**Categories:** type-checker FNs "Cannot assign * to *" (3 in 3 files) and
"Value with NA type cannot be assigned to a variable that was defined
without type keyword" (2 in 2 files), both from the 2026-06-04 inventory.

## Claim

TV flags declaration initializer / reassignment type mismatches that we
silently accept: `int x = "hello"` (our own fixture even documented
"Currently not detected by validator"), `bool x = na`, bare `x = na`.

## TV's rule (probed)

All 21 probes live in `probes/` and were run against `pine-lint --tv` on
2026-06-05. Verbatim verdicts:

| probe | script (line 3+) | TV verdict |
|---|---|---|
| p01 | `int x = "hello"` | CE10173 `assignedValueType:"const string", ownValueType:"const int"`, anchor 3:1 |
| p02 | `int x = close` | CE10173 `"series float"` -> `"const int"`, 3:1 |
| p03 | `int x = bar_index` | clean; x typed `series int` |
| p04 | `bool x = na` | CE10173 `"simple na"` -> `"const bool"`, 3:1 |
| p05 | `float x = na` | clean; x typed `simple float` |
| p06 | `x = na` | CE10097 "Value with NA type cannot be assigned to a variable that was defined without type keyword", 3:1-3:6 |
| p07 | `int x = 3.14` | CE10173 `"const float"` -> `"const int"`, 3:1 |
| p08 | `x = 1` / `x := "hello"` | CE10173 `"string"` -> `"int"` (UNQUALIFIED), anchor 4:1 |
| p09 | `string x = 42` | CE10173 `"const int"` -> `"const string"` |
| p10 | `color x = 16711680` | CE10173 `"const int"` -> `"const color"` |
| p11 | `bool x = 1` | CE10173 `"const int"` -> `"const bool"` |
| p12 | `float x = 1` | clean; `const float` |
| p13 | `float x = bar_index` | clean; `series float` |
| p14 | `color x = na` | clean; `simple color` |
| p15 | `x = 1` / `x := 2.5` | CE10173 `"float"` -> `"int"` (unqualified), 4:1 |
| p16 | `x = 1` / `x := bar_index` | clean; x becomes `series int` |
| p17 | `var x = na` | CE10097, 3:1 |
| p18 | `var int x = 3.14` | CE10173 `"const float"` -> `"const int"`, 3:1 |
| p19 | `b = false` / `b := na` | CE10173 `"na"` -> `"bool"` (unqualified), 4:1 |
| p20 | `int x = color.red` | CE10173 `"const color"` -> `"const int"` |
| p21 | `if na or close > open` (+ body) | CE10123 "Cannot call operator or ... simple na ... series bool expected", anchor 3:4 (the na operand) |

The rule, synthesized:

- **Base types must match exactly** between the declared type keyword and
  the initializer - the lenient argument-coercion table (int<->float both
  ways, numeric->string, numeric->color, color->numeric) does NOT apply to
  declarations or `:=` reassignment.
- **One widening exception:** int -> float (p12, p13).
- **na assigns to any type keyword EXCEPT bool** (p04 vs p05/p14); same on
  `:=` (p19).
- **Qualifiers are free**: `int x = bar_index` is legal, the variable just
  becomes series-qualified (p03, p13, p16).
- **Bare na needs a type keyword** (CE10097, p06/p17) - applies per
  declaration, including `var` forms.
- **Anchors:** declarations anchor at the statement start (type keyword /
  var keyword), reassignments at the target. **Wording:** declarations
  render qualified type names, with a bare declared keyword rendered
  "const T"; reassignments render unqualified base names (p08/p15/p19).

## Implementation

- `types.ts`: `baseTypeName` / `strictAssignApplies` / `strictAssignOk` /
  `renderQualifiedType`, plus `isNaType` exported. Strict rule only claims
  pairs where the declared base is one of the five primitives and the value
  side is primitive-or-na; UDTs, collections, void, unknown stay on the
  lenient `isAssignable` path (which is untouched - it still serves
  arguments and ternaries).
- `checker.ts` VariableDeclaration / AssignmentStatement (`:=` on a plain
  identifier only): v6-gated, TV wording, TV anchors.
- `parser.ts`/`ast.ts`: VariableDeclaration carries `startLine`/`startColumn`
  (the var keyword / leading type annotation token) so diagnostics can
  anchor where TV does while `line`/`column` stay on the name for the
  symbol table.

## Collateral bugs found and fixed (each exposed by the strict rule)

1. **`na` identifier typed "unknown"**: `na` is in RESERVED_KEYWORDS, whose
   symbol-table registration runs after the pine-data variables loop and
   overwrites na's `simple<na>` with "unknown". inferExpressionType now
   short-circuits the `na` identifier to the na type.
2. **na-initialized variables poisoned**: `x = na` recorded the variable's
   type as na, tripping every later use (`Cannot assign int to na`,
   "operand is na" waves). A bare-na initializer now leaves the symbol
   "unknown" - the declaration itself is the (v6) error.
3. **`0.0` typed int**: the AST literal value is a JS number, and
   `Number.isInteger(0.0)` is true - so `ssf = 0.0` declared an int and
   every `ssf := <float>` errored (hundreds of corpus FPs). Masked for
   years by the bidirectional coercion. `inferLiteralType` now takes the
   raw lexeme and types `[.eE]` literals float.
4. **Version not threaded into function/method bodies**: two
   `validateStatement(stmt)` calls defaulted to "6" inside v4/v5 scripts.
5. **No-annotation files validated as v6** (`cli.ts`): TV's rule is that a
   missing `//@version` means v1 (and translate_light refuses < 5, see
   INV029); legacy stays lenient per G004. The CLI now defaults to "1".
   `test/helpers.ts` and the language-service keep their v6 default
   deliberately - tests target v6 grammar, the editor assumes current Pine.
6. **`math.round`/`math.floor`/`math.ceil` polymorphic flags wrong**: the
   hardcoded `polymorphic: "numeric"` map (TODO #21's territory) claimed
   their return follows the argument; the 1-arg forms return int regardless
   (only the qualifier follows; round's 2-arg form returns float). Removed
   from the map - the per-overload data already encodes it. `math.round`
   additionally carried an auto-detected `returnTypeParam: number`:
   `detectReturnTypeParam`'s set-equality criterion matched coincidentally
   ({int,float} returns come from the PRECISION overloads). The detector
   now also requires the candidate-base -> return-base mapping to be
   functional per overload; only math.round dropped, the seven legitimate
   carriers (fixnan, math.abs, ta.change/median/mode/range/valuewhen)
   survived.
7. **Ternary `cond ? <unknown> : na` typed na**: an na branch carries no
   type information; when the other branch is unknown the result must stay
   unknown, not become na (tripped CE10097 on `x = cond ? mapVar.get(k) :
   na` and UDT-constructor ternaries).

## Corpus outcome

Regression check vs the 2026-06-04 baseline: 19 new error appearances, all
accounted for - 11 probe-confirmed true positives (mostly our own synthetic
fixtures, whose `@expects` were corrected in this round - type-mismatch,
type-coercion, na-coercion, na-handling, literals), 6 v5 `na or ...`
operand records (consistent with the INV028 legacy-truthiness stance;
TV v6 rejects the same shape per p21), 1 `bool bull3 = na` corpus hit
(p04's shape), and 1 cascade record co-located with an existing CE10017 on
the INV025 multiline-string file. 26 same-position message changes are the
old lenient wording upgraded to TV's. The disappeared "TV-also-flagged"
entries on `3544e0fe…`/`b65bc03d…` are the same errors re-anchored to
TV's column.

Fixture: `packages/core/test/fixtures/regression/INV032-declaration-initializer-types.pine`

## Known residual

- Function-argument coercion is intentionally untouched; whether TV's
  argument coercion really admits numeric->string etc. is a separate
  question (G002 retraction suggests it is also stricter than our table) -
  not probed here.
- `math.round(x, precision)` now types as int (frozen overload-#0 return)
  instead of float - an FN only when someone declares `int y =
  math.round(x, 2)`; correct fix is per-overload return resolution by
  arg count, deferred.
- TV renders enum/UDT declaration mismatches with their own type names;
  the strict rule deliberately skips non-primitive declared bases.
