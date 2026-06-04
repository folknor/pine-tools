# INV020 - CW10013/CW10011: variable shadowing warnings (TODO #37b)

**Status:** resolved 2026-06-04. SemanticAnalyzer now emits both rules
(`SHADOW_VARIABLE`, `SHADOW_BUILTIN`) from a lexical scope stack. ~23
corpus hits were tv-only in the 2026-06-04 warning inventory; the
heaviest fixture (`5ece2a30…pine`, 10 hits) now diffs clean on them.

## The rules (probed)

**CW10013** - template:
`Shadowing variable "{variableName}" which exists in parent scope. Did you want to use the ":=" operator instead of "=" ?`
(note TV's space before the final `?`). Fires when a declaration in a
non-global scope reuses a name declared EARLIER (source order) in any
enclosing scope - global or an enclosing function/if/loop scope.

**CW10011** - template: `Shadowing built-in variable "{variableName}"`.
Fires in ANY scope (global included) when a declaration reuses a
built-in VARIABLE name. Built-in function and namespace names are
silent.

Covered declaration forms (all probed): plain `name =`, `var name =`,
typed `float name =`, tuple members `[a, b] =` (one warning per
member, anchored at the tuple statement), and loop iterators
(`for i = ...`, anchored at the iterator name). NOT params, NOT `:=`
reassignments.

Position: the warning spans the variable's definition (statement start
through the init expression; for iterators, the `i = 0` init part).

## Probes (`pine-lint --tv`, 2026-06-04)

Probe 1 - declaration forms. CW10013 on all five marked lines
(9:5, 12:5, 13:5, 14:5, 16:5):

```pine
//@version=6
indicator("x")
a = 0.0
b = 0.0
c = 0.0
d = 0.0
i = 0
f(x) =>
    d = x * 2
    d
if close > open
    a = ta.sma(close, 14)
    var b = 2.0
    float c = 3.0
    label.new(bar_index, a + b + c)
for i = 0 to 3
    label.new(i, close)
plot(a + b + c + d + i + f(close))
```

CW10013 for `d` (UDF body), `a` (plain), `b` (var), `c` (typed), `i`
(for iterator). Spans: e.g. `a` 12:5-12:25 (the whole declaration),
`i` 16:5-16:9 (`i = 0`).

Probe 2 - source order, params, built-ins:

```pine
//@version=6
indicator("x")
g(y) =>
    e = y * 2
    e
e = 1.0
xp = 0.0
h(xp) => xp * 2
if close > open
    open = 1.0
    [p, q] = ta.supertrend(3, 10)
    label.new(bar_index, open + p + q)
p = 0.0
q = 0.0
plot(e + xp + p + q + g(close) + h(close))
```

- `e` in `g()` (global `e` declared LATER): **silent** - source order
  gates the rule.
- `[p, q]` (globals later): silent for the same reason.
- param `xp` shadowing the earlier global: **silent** - params exempt.
- `open = 1.0`: CW10011 `Shadowing built-in variable "open"` PLUS the
  error `CE10190 Cannot shadow the built-in variable "open" because it
  has already been used as a built-in` (it was used in the `if`
  condition). The error half is a checker FN for us - TODO #40.

Probe 3 - tuple with preceding globals, unused built-in, nested local
scopes:

```pine
//@version=6
indicator("x")
m = 0.0
n = 0.0
if close > open
    [m, n] = ta.supertrend(3, 10)
    hl2 = 1.0
    label.new(bar_index, m + n + hl2)
k(z) =>
    w = z * 2
    if z > 0
        w = z * 3
        label.new(bar_index, w)
    w
plot(m + n + k(close))
```

- `[m, n]`: CW10013 for BOTH members, each anchored at the tuple
  statement span (6:5-33).
- `hl2` (built-in never used before): CW10011 only - no CE10190.
- `w` in the nested if inside `k`: CW10013 - "parent scope" means any
  enclosing scope, not just global.

Probes 4-6 - global scope + name classes:

```pine
//@version=6
indicator("x")
hl2 = 1.0
var vwap = 2.0
plot(hl2 + vwap)
```

CW10011 for `hl2` at GLOBAL scope. (`vwap` is silent because bare
`vwap` is not a built-in variable at all - only `ta.vwap` is; probe 5
confirmed `var hl2` / `hlc3` warn.) Probe 6: `nz = 1.0` (built-in
FUNCTION name) and `str = "a"` (namespace): both **silent**.

## Implementation notes

- `semanticAnalyzer.ts`: `scopeNames` stack of per-scope name sets;
  `withScopeFrame` wraps function/method bodies, if consequent and
  alternate (separate frames), for/while bodies, and switch arms with
  statement bodies. `declareName` checks built-ins first (CW10011),
  then enclosing frames (CW10013), then records the name in the
  current frame - analysis runs in source order, so frame membership
  IS the "declared earlier" test. Params are added to the function
  frame without warning.
- Open question deliberately not probed: a LOCAL declaration whose
  name is both a built-in and an earlier user global emits only
  CW10011 here (the `open` probe suggests built-in classification
  wins). Revisit if the corpus disagrees.
- Iterator anchor columns are derived structurally (`for ` prefix,
  `[a, b]` shape) rather than stored by the parser; odd spacing would
  shift them. Acceptable for diff purposes.
- Regression fixture:
  `packages/core/test/fixtures/regression/variable-shadowing.pine`.
