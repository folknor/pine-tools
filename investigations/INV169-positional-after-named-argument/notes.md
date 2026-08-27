# INV169 - a positional argument after a named one was never reported

Adopted 2026-08-27 from `../broadarrow/notes/todo.md`, whose trailing-exit
section carries a three-claim "pine-tools: validator parity" item. Two of the
three were already closed; this is the one that reproduced.

## The three claims, as filed

> Local `pine-lint` accepts the bare activation-without-offset shape and a
> `strategy.exit` with no price/profit/loss/trailing leg, both of which TV
> rejects; it also accepts a positional argument after a named argument, which
> TV and piners reject.

Re-run 2026-08-27 against `pine-lint 0.5.0 (8d55e01)`:

| claim | verdict |
|---|---|
| `strategy.exit` with no price/profit/loss/trailing leg | **already fixed** by INV142 |
| the bare activation-without-offset shape | **already fixed** by INV142 - same rule |
| positional argument after a named one | **reproduced** - fixed here |

The first two are one rule, not two. INV142's `flags.argGroups` on
`strategy.exit` covers every single-leg trailing spelling, each rejected with
TV's own wording:

```
strategy.exit("x", "e")                    -> error
strategy.exit("x", "e", trail_price = 100) -> error
strategy.exit("x", "e", trail_points = 50) -> error
strategy.exit("x", "e", trail_offset = 10) -> error
strategy.exit("x", "e", limit = 200, trail_price = 100) -> clean, and TV agrees
```

The last line is the control: the group is satisfied by `limit`, so the
lone `trail_price` beside it is accepted - and `--tv` accepts it too, which is
also what proves the `--tv` calls in this section reached TradingView rather
than returning empty.

## The reproducing claim

```pine
//@version=6
indicator("t")
plot(close, title = "t", 2)
```

- **us, before:** clean
- **`pine-lint --tv`:** `3:26: error: Syntax error after the argument for "title". Arguments without their parameter name cannot be used after arguments with parameter names.`

### Why it was silent, which is the interesting part

The shape was already KNOWN to the codebase. `checkUnionArgs` in
`checker-calls.ts` carries, from INV016:

```ts
// A positional arg after a named one is malformed ordering (TV's
// own error); positional->param indices are unreliable, so don't
// emit a misleading type mismatch on top. see INV016
if (sawNamed || functionHasOverloads) continue;
```

So the checker recognised the shape well enough to SUPPRESS its own type
checks on it, on the correct reasoning that positional indices are meaningless
past a named argument - but nothing anywhere emitted the error the suppression
comment attributes to TV. A rule that only ever suppresses is a rule that
guarantees silence.

### TV's exact behaviour, probed 2026-08-27

Four probes, because the position and the cited name each had two plausible
conventions:

| probe | TV |
|---|---|
| `plot(close, title = "t", 2)` | `3:26` names `"title"` |
| `plot(close, title = "t", 2, 3)` | `3:26` names `"title"` - ONE error, not two |
| `plot(close, title = "t", color = color.red, 2)` | `3:45` names `"color"` |
| `plot(close, title = "t", 2, color = color.red)` | `3:26` names `"title"` |

So: exactly ONE error per call, anchored at the FIRST positional that follows
any named argument, citing the named argument IMMEDIATELY PRECEDING it. A
later named argument does not change which name is cited, and extra trailing
positionals do not add errors.

**It is not builtin-specific.** TV raises it for user functions too:

```pine
//@version=6
indicator("t")
f(a, b, c) => a + b + c
plot(f(1, b = 2, 3))
```

-> TV: `4:18: error: Syntax error after the argument for "b". ...`

That is what decides WHERE the check belongs: the builtin argument checker
knows nothing about user functions, so this is parser-level, and TV's own
wording ("Syntax error") agrees.

## The fix

`finishCall` in `parser/expressions.ts`, after the argument loop: scan the
collected arguments for the first positional following a named one, emit once,
citing the last named argument seen before it.

Skipped when the call was torn open by the in-call recovery (`recovered` /
`tornAtBoundary`): the argument list is unreliable on a mangled call and TV has
anchored its own error at the mangle instead, so adding a second record there
would be noise.

Anchoring uses the argument VALUE's line/column, which is what makes the
wrapped-line case land correctly - see the corpus finding below.

## Verification

All four probe shapes above now match TV byte-for-byte, position and wording.

### Corpus: one new error over 1879 fixtures, and it is a true positive

`regression-check`: 1 changed fixture, 1 new error appearance, 0
disappearances.

`13a745132b85055eaf82dc9be1f853cae59b6c73bd9d00bf66c554b8387714c4.pine:439:1`:

```pine
    dashboard_cell(1, 1, currentPosition=na ? "No Signal" : currentPosition,
color.black), dashboard_cell_bg(1, 1, positionBgColor == na ? color.gray :
positionBgColor)
```

The author meant `currentPosition == na` and wrote `=`, which turns the third
argument into a NAMED one; `color.black` then follows it positionally, on the
next physical line. Column 1 of line 439 is exactly where that argument starts,
so the anchor is right rather than a degenerate default.

`--tv` on the whole file returns `validation failed` rather than a verdict, so
it settles nothing (per AGENTS.md, a failed call is not an acceptance). The
minimized shape was probed instead and TV agrees exactly, wrapped anchor
included:

```pine
//@version=6
indicator("t")
f(a, b, c) => a + b + c
x = 1.0
y = f(1, 1, x=na ? 2 : x,
3)
plot(y)
```

| | verdict |
|---|---|
| `pine-lint --tv` | `6:1: error: Syntax error after the argument for "x". ...` |
| us | `6:1: <identical>`, plus a pre-existing CE10123 on the `na` ternary at 5:15 |

The second error is TV's first-error stop (G001), not a product of this
change.

### Regression fixture

`packages/core/test/fixtures/regression/INV169-positional-after-named.pine`
pins all four probed conventions in one file plus the wrapped-line anchor, and
was mutation-verified red.

## Not adopted

The broadarrow entry also says piners rejects this shape. Not independently
verified here and not needed - TradingView is the authority and it answered
directly.
