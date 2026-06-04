# INV021 - CW10018: history of conditionally-declared locals (TODO #37c)

**Status:** resolved 2026-06-04. SemanticAnalyzer emits `LOCAL_HISTORY`
(TV's CW10018) per `[]` occurrence on variables declared in conditional
scopes. ~14 corpus hits were tv-only in the 2026-06-04 inventory; the
heaviest fixture (`18a7974e…pine`, 12 hits) now diffs clean both ways
on the warning channel.

## The rule (probed)

TV's CW10018, template:
`The variable "{value}" is declared in local scope, which may not be executed at every update. So, obtaining its historical values may lead to unexpected results`

Fires per `[]`-reference on a variable whose DECLARATION sits in a
scope that may not execute every bar. "May not execute" follows the
INV018 CONDITIONAL_SERIES model exactly:

- series-gated `if` arms count; INPUT-gated arms are SILENT (probe 3:
  `cl[1]` under `if input.bool(...)` draws nothing);
- loop bodies always count (probe 2: `fl[1]` in a const-bound for);
- function top-level bodies do NOT count (probe 2: typed-UDF local
  `y[1]` and param `x[1]` are silent) - but conditional scopes INSIDE
  a UDF body do (probe 3 replicates the corpus `ma(...)` if/else-arm
  case);
- `var` locals still warn (probe 1 `vloc`) - persistence does not
  exempt the declaration scope;
- globals never warn, even when reassigned conditionally (`g[1]`).

Anchored at the indexed expression: start = the identifier, end =
after the `]`. One warning per occurrence (probe 1: two `loc[1]` on
one line draw two warnings).

## Probes (`pine-lint --tv`, 2026-06-04)

Probe 1 - if-arm locals, var locals, globals:

```pine
//@version=6
indicator("x")
var g = 0.0
if close > open
    loc = 0.0
    loc := na(loc[1]) ? 1.0 : loc[1] + 1
    var vloc = 0.0
    vloc := vloc[1] + 1
    g := loc + vloc
f(x) =>
    y = x * 2
    y[1] + x[1]
plot(g + g[1] + f(close))
```

CW10018 x3: `loc` at 6:15-20 and 6:31-36, `vloc` at 8:13-19. `g[1]`
silent. (The untyped-UDF `y[1]`/`x[1]` silence here is inconclusive -
the endpoint skips untyped UDF bodies, INV018 probe 5.)

Probe 2 - typed UDF and loop:

```pine
//@version=6
indicator("x")
f(float x, simple int len) =>
    y = x * 2
    z = y[1] + x[1]
    z + len
for i = 0 to 5
    fl = close * i
    label.new(bar_index, fl + fl[1])
plot(f(close, 3))
```

CW10018 x1: `fl` at 9:31-35. The TYPED UDF's `y[1]`/`x[1]` are still
silent - function top-level bodies are unconditional; the variables[]
block shows full type inference ran, so this silence is a verdict,
not endpoint blindness.

Probe 3 - the gate + corpus replica:

```pine
//@version=6
indicator("x")
useA = input.bool(true)
var float acc = 0.0
if useA
    cl = close * 2
    acc := cl + cl[1]
ma2(string type, float src) =>
    float result = 0.0
    if type == "M"
        mg = src * 2
        result := mg[1]
    result
plot(acc + ma2("M", close))
```

CW10018 x1: `mg` at 12:19-23 only. `cl[1]` under the input-gated if:
SILENT - the series-condition gate applies (the corpus `ma()` warns
because its unqualified `string type` param infers series, INV018
probe 10).

## Implementation notes

- `semanticAnalyzer.ts`: `conditionalLocalFrames` - a stack parallel
  to the INV020 `scopeNames` frames. `declareName` records the name
  in the top frame when `inConditionalScope` is set (which already
  encodes the INV018 gate: series-gated if/switch arms, all loops).
  The `IndexExpression` walk warns when its object is an identifier
  found in any live frame.
- Loop ITERATORS land in conditionalLocalFrames too (`for i` then
  `i[1]` would warn) - unprobed but consistent with the model; noted
  in case the corpus ever disagrees.
- Regression fixture:
  `packages/core/test/fixtures/regression/local-variable-history.pine`.
