# INV018 - CONDITIONAL_SERIES re-founded on history-dependence (CW10002/3/4)

**Status:** Fixed. The rule fires on TV's documented criterion - history-
dependent calls executed conditionally - instead of the old return-type/
namespace net, with TV's context-specific wording per conditional kind.

**Regression fixture:**
`packages/core/test/fixtures/regression/conditional-series-history-dependence.pine`

## Summary

The old `isSeriesFunction` flagged any function whose pine-data return
type starts with `series`, plus a bare ta./request./str. namespace
fallback. That net flagged canonical idioms - conditional drawing
(`label.new` returns `series label`), conditional string formatting
(`str.format`), `array.get`, `box.get_top` - producing FP waves the #31
parser fix unmasked (plan/31 Finding 7; e.g. ~30 spurious warnings in
`6874e636…pine` alone).

TV's actual criterion (po: errors/CW10003): a call is warned when the
function **relies on values from past executions of its own scope** -
the `[]` operator or internal state - and executes conditionally or
iteratively. The page explicitly exempts side-effect functions
(`label.new`: forcing it every-bar "would cause a new label drawing to
appear on every bar") and stateless functions (`math.max` is the named
example). The page's own primary example is a USER function
(`previousValue(source) => source[1]`), so UDFs qualify by body content.

## Implementation

- **pine-data**: `flags.historyDependent: true` baked at generate-time
  for the ta.* namespace (generate.ts; FunctionFlags in
  pine-data/schema/types.ts). The checker reads the flag - no language
  facts embedded in the checker, per the Data-vs-Syntax rule. str./
  request.* are deliberately not flagged (the old heuristic's FP
  sources); `fixnan` carries internal state but is unprobed - left
  unflagged until measured.
- **SemanticAnalyzer**: `isHistoryDependentFunction` reads the flag;
  user functions/methods are scanned at collect time for
  IndexExpression (`[]`) or calls to history-dependent functions
  (transitive, source order = declaration before use).
- **Scope coverage**: in addition to if/for/while bodies, conditional
  scope now covers ternary BRANCHES (not the condition - it always
  executes), and/or RIGHT operands (lazy evaluation; the left always
  executes), and switch arms (results + conditions after the first;
  the first condition always executes).
- **Wording follows TV's three codes** (probes below): CW10003 (local
  scope), CW10004 (ternary), CW10002 (and/or).

## TV probes (2026-06-04, pine-lint --tv)

Probe 1 - the manual's own CW10003 example. TV warns CW10003:

```pine
//@version=6
indicator("x")
float inconsistentSMA = if close > close[1]
    ta.sma(close, 20)
plot(inconsistentSMA)
```

```json
{"warnings":[{"code":"CW10003","ctx":{"functionName":"ta.sma"},"end":{"column":21,"line":4},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from this scope","start":{"column":5,"line":4}}]}
```

Probe 2 - exemptions: conditional `label.new` and `str.tostring`. TV
emits NO warnings (success:true, no warnings field):

```pine
//@version=6
indicator("x")
if close > open
    label.new(bar_index, close)
    s = str.tostring(close)
    label.new(bar_index, open, s)
plot(close)
```

```json
{"success":true,"result":{"variables":[{"name":"s","scopeId":"#1","type":"series string", "definition":{"start":{"line":5,"column":5},"end":{"line":5,"column":27}}}],"functions":[],"types":[],"enums":[]}}
```

Probe 3 - and/or operand and ternary branch. TV warns CW10002 and
CW10004 respectively, with distinct wordings:

```pine
//@version=6
indicator("x")
ok = close > open and ta.crossover(close, open)
t = close > open ? ta.rsi(close, 14) : na
plot(ok ? 1 : 0)
plot(t)
```

```json
{"warnings":[
 {"code":"CW10002","ctx":{"functionName":"ta.crossover"},"message":"The \"{functionName}()\" call inside the conditional expression might not execute on every bar, which can cause inconsistent calculations because the function depends on historical results. For consistency, assign the call's result to a global variable and use that variable in the expression instead.","start":{"column":23,"line":3},"end":{"column":47,"line":3}},
 {"code":"CW10004","ctx":{"functionName":"ta.rsi"},"message":"The function \"{functionName}\" should be called on each calculation for consistency. It is recommended to extract the call from the ternary operator or from the scope","start":{"column":20,"line":4},"end":{"column":36,"line":4}}
]}
```

These probes also establish that TV's translate_light endpoint RETURNS
compiler warnings (a `warnings` array beside `errors`) - earlier
assumptions treated it as errors-only.

## Verification

- Corpus census after the change: 1165 CONDITIONAL_SERIES warnings in
  219 files, all ta.* or body-scanned UDFs (`f_filt9x`, `processPOI`,
  `calcStopLossLTF`, ...). The str.format/label.new/box.*/array.get FP
  waves are gone (e.g. `6874e636…pine`: ~30 -> 6, the 6 being
  conditional `ta.cross*` and two genuinely history-dependent UDFs).
- Error channel unchanged (regression check: 0 changed fixtures).

## Round 2 (#36, same day): warning-channel differential + the series-condition model

The diff tooling (find-real-failures / compare-tv) now diffs the
`warnings` channel by position alongside errors. The first corpus run
immediately produced refinements, each probed:

**Probe 4** - `prevClose() => close[1]` called conditionally: TV silent.
A GLOBAL series' history is committed every bar regardless of when a
call executes, so `[]` on globals is consistent. Our UDF scan now counts
`[]` only on the function's OWN scope values (params/locals).

**Probe 5** - the manual's verbatim CW10003 UDF example
(`previousValue(source) => source[1]`, conditional named-arg call): the
translate_light endpoint emits NO warning and does not even infer the
UDF's return type (returnedTypes []). The endpoint's warning engine
skips untyped UDF bodies entirely. The manual documents the warning, so
we keep our UDF detection - endpoint silence is evidence, not authority.

**Probes 6-9** - the GOVERNING CONDITION must be a series:

- `if input.bool(...)` + ta.sma: TV SILENT (same branch every bar).
- `switch <input string>` arms with ta.*: TV SILENT - including fully
  typed UDF variants with `simple string` discriminants. This is the
  ubiquitous MA-selector idiom (TV's own template).
- `switch <series int>` discriminant / discriminant-less `switch` with
  series conditions: TV WARNS on all arms (incl. the default arm).
- `b = close > open` then `if b`: TV WARNS - the qualifier is tracked
  through variable assignment.
- `for i = 0 to 5` (const bounds): TV WARNS - iterative execution is
  unconditional (multiple executions per bar break the series).

Implemented as `isSeriesishExpression` + a `seriesVars` set built in
source order (declarations AND `:=` reassignments), gating every
conditional-scope entry: if branches, ternary branches, and/or right
operands, switch arms (series discriminant, or any series arm condition
in the discriminant-less form). Loops stay ungated. Unprovable
expressions (UDT fields, unknown calls) count as NOT series - zero FPs
on the input-selector idiom at the cost of rare FNs.

**CORRECTION 2026-06-04 (INV022):** the gate on AND/OR RIGHT OPERANDS
was an extrapolation from probes 6-7 (which covered if/switch only)
and is WRONG - TV warns CW10002 even when the left operand is a plain
`input.bool(...)` (probed). The gate now applies to if/ternary/switch
only; and/or right operands are always conditional. See INV022.

**Probe 10** - UDF params: `f(float source, int length, string t)` with
`switch t` arms - TV infers `series string` for the unqualified param
and WARNS both arms; `simple string t` is silent; probe at
`00a1c14f…pine:246` showed `if direction == 1` (typed `int` param)
warning too. So params are series by default unless annotated
simple/const/input - implemented via `withSeriesParams` (both analyzer
passes), matching TV's printed inference exactly.

`fixnan` and `math.sum` probed: TV warns CW10003 on conditional calls
to both - flagged historyDependent in generate.ts. `nz` and
`request.security` probed clean - not flagged.

## Warning-channel measurement (2026-06-04 ~11:50 UTC, post-fix)

748 v6 fixtures: local 1889 warnings / TV 376; local-only 1681,
tv-only 164. Composition:

- local-only is dominated by UNUSED_VARIABLE (TV never reports unused
  variables - not a comparable channel) plus CONDITIONAL_SERIES inside
  UNTYPED UDF bodies, where the endpoint does no analysis (probe 5) but
  TV's own qualifier rules say series (probe 10) - we are deliberately
  more correct than the endpoint there.
- tv-only: 37 multiline-string deprecation warnings, ~23 variable-
  shadowing warnings, ~14 local-variable-history warnings (the CW10003
  page's NOTE) - three rules we don't implement (TODO #37) - plus
  position artifacts on wrapped lines (TV's columns accumulate across
  the LOGICAL line, e.g. col 103 on a 60-char physical line, so the
  position-keyed diff splits matching warnings into both columns).
