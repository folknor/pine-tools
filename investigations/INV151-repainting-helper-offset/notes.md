# INV151 - REPAINTING_SECURITY could not see an offset taken inside a helper

Status: fixed.

Our own `lint` stage, not a TV disagreement - TV is silent on every script here
by design (see INV144). The failure is a false positive, which on this channel
is the expensive kind: it teaches readers to ignore the channel.

## The disagreement

`checkRepaintingSecurity` looked for a literal `[n]` in the `expression`
argument text. When the offset is applied inside a function that the expression
calls, the test could not see it and reported a correct call as repainting.

```pine
//@version=6
indicator("t")
f() =>
    [close[1], open[1]]
[a, b] = request.security(syminfo.tickerid, "D", f(), lookahead = barmerge.lookahead_on)
plot(a + b)
```

Before the fix: 1 `REPAINTING_SECURITY`. After: clean.

## Why the author has no other option

This is not a stylistic preference the rule was penalising. A tuple-returning
request cannot be written any other way: TV rejects the history operator applied
to a tuple-returning call.

Probe, `pine-lint --tv`, 2026-08-23:

```pine
//@version=6
indicator("t")
[a, b] = request.security(syminfo.tickerid, "D", [close, open])[1]
plot(a + b)
```

TV, 3:10-3:66:

```
CE10123  Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}".
         An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.
         ctx: funId="operator SQBR", argumentType="[series float, series float]", currentTypeDocStr="series na"
```

The shape TV does accept is the one we were flagging. Same date, the helper form
above returns `success: true` with zero errors and
`f() → [series float, series float]`. So the offset HAS to move into a helper,
and the rule was flagging the only correct construction.

## Implementation

`packages/core/src/analyzer/lint-semantic.ts`.

`LintContext` now records the script's own function and method bodies while it
does its existing single walk (`functionBodies`, `methodBodies`), and exposes
`bodyOf(call)`. The two tables are separate on purpose: a method call reads as
`obj.name()`, so the dotted callee name never matches the bare declaration name,
and resolving a dotted callee against the FUNCTION table would match
`request.security` to any UDF named `security`. A dotted callee therefore
consults the method table by its final segment only.

`containsHistoryOffset` takes the context and, when the subtree has no literal
offset of its own, follows each call it contains into that callee's body and
repeats. A `visited` set of body arrays stops the walk revisiting a body; Pine
forbids recursion, so that guards a malformed tree rather than legal code.

This only ever widens what counts as offset, so it can remove findings and never
add one.

## Corpus sweep

1879 fixtures, 723 parse clean as v6. `REPAINTING_SECURITY` 134 -> 124: ten
false positives removed, no other rule's count moved.
