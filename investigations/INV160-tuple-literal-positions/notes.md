# INV160 - where a tuple literal is legal, measured cell by cell

Filed 2026-08-25 from a cross-repo probing round with the piners project,
which was re-measuring its own `PINE0312` rule. Both tools turned out to
be wrong about tuple positions, in OPPOSITE directions, and the grid
below is the shared measurement. Ours is three false NEGATIVES.

[INV046](../INV046-array-literal-assignment/notes.md) established the
`x = [a, b]` cell and stated the rule as "a `[...]` tuple expression is
only valid in return positions (UDF tails, `request.security` args)".
That description is too narrow - TV accepts a bare tuple statement
anywhere inside a block, including a `for` body, which is never a return
position - but INV046's actual CHECK is unaffected and stays correct.

## The grid

All cells `pine-lint --tv`, 2026-08-25. The piners column is that
project's own measurement, reproduced because the disjointness is the
interesting part.

| shape | TV | us | piners |
|---|---|---|---|
| last statement of a callable body | clean | clean | clean |
| last statement of a `for` body | clean | clean | PINE0312 |
| tuple as a statement-form `switch` arm value | clean | clean | PINE0312 |
| NON-final bare tuple in a callable body | clean | clean | PINE0312 |
| NON-final bare tuple in an `if` body | clean | clean | PINE0312 |
| NON-final bare tuple in a `for` body | clean | clean | - |
| **top-level bare tuple, non-final** | **error** | **clean** | error |
| **top-level bare tuple, final** | **error** | **clean** | error |
| **sub-expression (`[a,b] == [a,b]`)** | **error** | **clean** | error |
| `x = [a, b]` | error | error | error |
| `var x = [a, b]` | error | error | - |
| `varip x = [a, b]` | error | error | - |
| `x := [a, b]` | error | error | - |

## The rule

The discriminator is NOT final-versus-non-final, which is what both
tools' machinery was built around. It is **top level versus inside a
block**, plus value position:

- **Inside any indented block** a bare tuple statement is accepted
  anywhere in the block - final or not, and in a `for` body that can
  never be a return position.
- **At top level** a `[...]` at statement start is parsed as a
  DESTRUCTURING TARGET and TV then demands `=`. It errors even as the
  script's last statement.
- **In value position** - sub-expression operand, or the RHS of a
  declaration or assignment (`=`, `var`, `varip`, `:=` alike) - the
  bracket is simply not a valid expression opener.

**TV's two distinct messages are the evidence for that split**, and they
are worth keeping straight because they anchor differently:

| position | message | anchor |
|---|---|---|
| top-level statement start | `Mismatched input "end of line without line continuation" expecting set "="` | END of the tuple |
| value position | `Syntax error at input "["` | the BRACKET |

The first is TV committing to a destructuring parse and then failing to
find `=`. The second is the bracket being rejected outright.

## Our three false negatives

1. Top-level bare tuple, non-final.
2. Top-level bare tuple, final.
3. Tuple as a sub-expression.

We are correct on everything else, including all six legal in-block cells
and all four value-position cells (identical message AND column to TV on
each).

Tracked as TODO #75. **The trap for whoever implements it:** the
top-level cells cannot key on "a bracket at statement start" - that is
also how the LEGAL destructuring `[a, b] = f()` begins. The check has to
key on the absence of a following `=`, which is exactly what TV's own
message says it is doing.

A second cell worth pinning at the same time, because `var` behaves
differently there than everywhere else:

```pine
var [x, y] = [a, b]
```

TV: `""var"" cannot be used as a variable or function name.` - a
different error from every other cell. So a `var`-qualified destructuring
does not exist; the destructuring path is bare `[a, b] = ...` only.

## Why the disjointness matters beyond this rule

We are too permissive in exactly three cells; piners is too strict in
exactly five; **no cell is wrong in both, and none overlaps**. Two
independent implementations of the same rule, failing in opposite
directions.

That has a direct consequence for piners'
`parser_corpus_acceptance_matches_local_pine_lint` cross-check, which
compares their parse acceptance against our LOCAL validator. On tuple
positions the check is genuinely informative - they reject where we
accept, so it flags rather than masks. That is the exact inverse of
[INV156](../INV156-tail-qualifier-fold-through-returns/notes.md), where
both sides wrongly ACCEPTED and the same cross-check stayed green while
hiding the whole class.

So the cross-check's reliability is not a property of the check, it is a
property of whether the two implementations' errors happen to be
correlated on the rule in question - and it never says which tool is
right. Only `--tv` does. Worth knowing before reading local agreement, or
local disagreement, as evidence about either tool.
