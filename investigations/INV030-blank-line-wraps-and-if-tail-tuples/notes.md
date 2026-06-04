# INV030 - blank-line operator wraps + if-tail tuple returns (6874e636)

**Status:** resolved 2026-06-04. `6874e636…` - the 201-record
undefined-variable cluster against TV's clean verdict, the biggest
single lever in the inventory - now lints **0 errors**, matching TV.
Two root causes, neither of them imports (the checker already registers
import aliases as unknown namespaces) and neither UDT-method
resolution.

## Bug 1 - operator continuations stopped at blank lines (197 of 201)

```pine
    bool is_indecision = M.in_range(...) and candle_body[1] > candle_body

     or M.in_range(...)

     or open == close
```

(file lines 553-557; the `or` lines are indent 5, a valid wrap, with
BLANK LINES between.) Every binary-operator continuation lookahead
(`or`, `and`, comparison, `+ -`, `* / %`) peeked exactly ONE token past
a single NEWLINE, so the blank line ended the expression; the orphaned
`or …` lines became parse errors that truncated the enclosing
`track_obs(...)` body (a ~600-line function starting at line 477),
spilling its locals (`bull_ob` 53x, `bear_ob` 51x, ...) to top level -
the same failure shape as INV024's body truncation. INV027 had fixed
exactly this for the ternary `?`; this generalizes it.

Fix (`expressions.ts`): shared `skipWrapNewlines` helper - look past
consecutive NEWLINEs; when the first real token is the expected
operator, consume them. The blank-line path (>1 NEWLINE) additionally
requires the operator line to satisfy Pine's wrap-indent rule (indent
not a multiple of 4 - INV017): ungated, a switch arm `    -1 =>`
(indent 4) after a blank line read as a `- 1` continuation of the
previous arm's body (`13cfc9af…:664` caught this during corpus
verification). The single-NEWLINE path keeps its historical leniency
(no indent gate) - tightening it to INV017's rule across the corpus is
a separate, measured change if ever.

## Bug 2 - tuple returns from if/else tails (4 of 201)

```pine
_detect_fvg_object(int mode, bool enabled, ...) =>
    ...
    if enabled and barstate.isconfirmed and size > size_threshold
        [ true, FVG.new(...)]
    else
        [ false, na]
```

INV010's `udfTupleReturnTypes` capture handled only a trailing tuple
expression / return statement. A tuple returned from an if/else TAIL
fell back to the per-element `series<float>` default, so
`[bullish_fvg_alert, new_bull] = _detect_fvg_object(...)` typed the
bool element float and `if bullish_fvg_alert` /
`alertcondition(bullish_fvg_alert, ...)` flagged (4 records).

Fix (`checker.ts`): `tailTupleExpr` descends if/else branch tails
(consequent preferred - the alternate is typically the `[false, na]`
default whose `na` elements are less informative). Also gave
`inferUdfTupleReturnTypes` the INV026 cache isolation it was missing
(it registers untyped params as series<float> in a temp scope and ran
`inferExpressionType` against the shared cache - the same poison
vector fixed in `inferFunctionReturnType`).

## Probes (`pine-lint --tv`, 2026-06-04, files in this directory)

- `probe-a-or-blank-line-wrap.pine` - or-chain with blank lines
  between operand and operator lines (indent 1). TV: accepted,
  `is_indecision` **series bool**, definition end column 82 = the
  joined logical line (G005), proving the join.
- `probe-b-if-tail-tuple.pine` - UDF whose tuple returns from an
  if/else tail. TV: accepted, `f(series bool enabled) → [series bool,
  series float]`, `alert_` **series bool**, `val` series float.

Both probes disagree with our pre-fix validator (probe a: orphaned-`or`
parse errors; probe b: `if alert_` condition-not-bool), confirming they
reached TV.

## Verification

- `6874e636…`: 201 -> 0 errors (TV verdict: success:true, clean -
  re-verified manually this round; its inventory appearances are
  intermittent because TV times out on the file more often than not).
- Corpus diff after both fixes + the indent gate: 4 appearances, all
  acceptable - 2 v4-truthiness `Condition must be boolean, got int`
  sites on `0281632a…` (blank-line if-bodies now parse; the
  version-blind bool-condition check is a pre-existing stance), and 2
  on `1f9c3031…` (versionless) where an indent-4 ternary continuation
  the INV027-era code had over-leniently joined is now correctly
  rejected per INV017's wrap rule. ~380 disappearances across 29
  files, dominated by the undefined-variable cascade and its knock-on
  bool-operand/argument FPs.
- The CLI variables-list still displays `alert_` as series float on
  probe b - that is the astExtractor display path, separate from the
  checker (same family as TODO #18's leftover note); the checker types
  it correctly (no condition-not-bool error fires).
