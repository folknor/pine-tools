# INV130 - locals derived from untyped params are undetermined for UDF history

**Date:** 2026-06-28
**Status:** fixed
**Code:** `packages/core/src/parser/semanticAnalyzer.ts`
**Fixture:** `packages/core/test/fixtures/regression/consistency-warning-undetermined-local-history.pine`
**Source:** TODO #61 / TODO #9 residual, `f1b6bd45` `draw_lbl` local-only
CW10003 false positive.

## Finding

The broad TODO #9 "typed-param call-site propagation" plan is refuted by a
current TV probe: `f(int x)` called as `f(1)` still types `x` as `series int`
and warns on `ta.sma` / `ta.ema`. That existing INV114 fixture must stand.

The live `draw_lbl` residual is a different shape. Its params are untyped, and
TV types both the params and the local drawing handle `lbl` as `undetermined
type`. A local whose value is derived from an untyped param is not part of the
UDF's own history set, so indexing that local with `[1]` does not make the UDF
history-dependent. Directly indexed params are left alone because INV018 keeps
that manual-backed warning.

## TV probes

All probes were run with `pine-lint --tv -c` on 2026-06-28. Each returned
`success:true`. TV output excerpts below include the warning verdict and the
load-bearing variable types. The raw syntax arrow is rendered as `\u2192` here
so this note stays ASCII-only.

### P1 - typed handle cleanup warns

```pine
//@version=6
indicator("label-cleanup")
draw_lbl(int x, float y, string txt, color col) =>
    var lbl = label(na)
    lbl := label.new(x, y, txt, color = color(na), textcolor = col)
    label.delete(lbl[1])
if close > open
    draw_lbl(bar_index, high, "x", color.red)
plot(close)
```

TV result: one CW10003 warning on `draw_lbl` at line 8. Params are `series int`
/ `series float` / `series string` / `series color`; `lbl` is `series label`.

### P2 - untyped handle cleanup is silent

```pine
//@version=6
indicator("label-cleanup-untyped")
draw_lbl(x, y, txt, col) =>
    var lbl = label(na)
    lbl := label.new(x, y, txt, color = color(na), textcolor = col)
    label.delete(lbl[1])
if close > open
    draw_lbl(bar_index, high, "x", color.red)
plot(close)
```

TV result: 0 warnings. `x`, `y`, `txt`, `col`, and `lbl` are all
`undetermined type`; `draw_lbl` returns `undetermined type`.

### P3 - untyped handle cleanup plus array push is silent

```pine
//@version=6
indicator("label-cleanup-array")
var labels = array.new<label>()
draw_lbl(x, y, txt, col) =>
    var lbl = label(na)
    lbl := label.new(x, y, txt, color = color(na), textcolor = col)
    label.delete(lbl[1])
    labels.push(lbl)
if close > open
    draw_lbl(bar_index, high, "x", color.red)
plot(close)
```

TV result: 0 warnings. The global `labels` is `array<label>`; params and `lbl`
are `undetermined type`.

### P4 - non-delete handle history is also silent when the handle is undetermined

```pine
//@version=6
indicator("label-set-untyped")
draw_lbl(x, y, txt, col) =>
    var lbl = label(na)
    lbl := label.new(x, y, txt, color = color(na), textcolor = col)
    label.set_x(lbl[1], x)
if close > open
    draw_lbl(bar_index, high, "x", color.red)
plot(close)
```

TV result: 0 warnings. Params and `lbl` are `undetermined type`.

### P5 - plain local copied from an untyped param is silent

```pine
//@version=6
indicator("plain-local-untyped-param")
f(x) =>
    s = x
    label.new(bar_index, s[1], "x")
if close > open
    f(high)
plot(close)
```

TV result: 0 warnings. `x` and `s` are `undetermined type`; `f` returns
`undetermined type`.

### P6 - history-dependent builtins still make the UDF warn

```pine
//@version=6
indicator("ta-local-from-untyped")
f(src, len) =>
    w = ta.wma(src, len)
    label.new(bar_index, w[1], "x")
if close > open
    f(close, 14)
plot(close)
```

TV result: one CW10003 warning on `f` at line 7. `src`, `len`, and `w` are
`undetermined type`, but the body still calls history-dependent `ta.wma`, so the
UDF itself is history-dependent.

## Implementation

`scanStatementsForHistoryDependence` already removed locals assigned inside an
undetermined gate (INV116). INV130 extends that same own-scope filter to locals
whose initializer or reassignment value references an untyped param. The
expression is still scanned, so a history-dependent builtin inside the value
continues to make the UDF history-dependent. Direct param indexing is not
changed.

The real carrier `f1b6bd45` now emits no `draw_lbl` warnings locally, matching
TV's 0-warning verdict for that file.

## Known limit

The scan mutates scope membership in source order, so the suppression only
applies after the local has been assigned from an untyped-param-derived value.
This covers the real `draw_lbl` carrier (`lbl := label.new(...)` before
`label.delete(lbl[1])`). A reordered body that indexes the local before that
assignment, such as `label.delete(lbl[1])` before `lbl := label.new(...)`, is
not probed and would still warn locally. Leave that edge alone until it appears
in the corpus or gets a TV-backed probe.

## Verification

- `node_modules/.bin/tsc -p . --pretty false`: pass.
- `node scripts/build-extension.js`: pass.
- Focused CLI checks:
  - `consistency-warning-undetermined-local-history.pine`: 2 warnings, the typed
    handle control and the `ta.wma` builtin-history control.
  - `conditional-series-history-dependence.pine`: still 7 warnings.
  - `consistency-warning-param-and-arg.pine`: still 3 warnings.
  - `consistency-warning-sibling-na-seed.pine`: still 2 warnings.
  - `method-call-history-dependence.pine`: still 1 warning.
  - `fixtures/f1b6bd45...pine`: clean.
