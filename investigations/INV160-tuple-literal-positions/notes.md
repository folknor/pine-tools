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

### FIXED 2026-08-25

Two checks, one per message, both keyed on the discriminator above rather
than on tail-ness:

- **Top-level statement.** An `ExpressionStatement` whose expression is an
  `ArrayExpression` while `blockDepth === 0`. `blockDepth` counts function
  bodies as well as `if`/loop blocks, so zero really is top level.
  Anchored one past the closing bracket, which is where TV puts it.
- **Value position.** `rejectTupleInValuePosition` on binary operands, the
  unary operand and the ternary CONDITION, anchored at the bracket - the
  same message and anchor as the declaration/assignment RHS cells INV046
  already covered.

Two things the implementation had to get right, both caught by tests
rather than by reading:

- **Ternary BRANCHES are not this error.** The first version flagged them
  and turned `INV127-ternary-tuple-return` red: a tuple in a ternary
  branch is TV's CE10163 ("Ternary operations cannot return tuples...")
  which INV127 probed and `validateTernaryExpression` already emits.
  Flagging it here both duplicated that and replaced the better message.
  The ternary CONDITION is a plain value position and does get the syntax
  error - probed separately, as was the unary operand, because neither
  was in the original grid and guessing at them is exactly what this
  investigation is about.
- **Only the leftmost offender per expression.** `[a,b] == [a,b]` has two
  offending operands; TV stops at the first, so reporting both puts a
  record past TV's stop. The binary case flags `left`, and `right` only
  if `left` was clean.

Pinned by `packages/core/test/fixtures/regression/INV160-tuple-literal-positions.pine`,
which carries every cell - six legal in-block positions, the three
errors, and the legal destructuring that begins exactly like the
top-level error and must stay clean. Mutation-verified per half:
disabling the top-level check drops it to 2 errors, disabling the
value-position check drops it to 1.

Note `--tv` on that combined fixture reports only the FIRST error and
stops, so it confirms the legal cells above the first error and nothing
below; the per-cell TV adjudication is the isolated probes in `probes/`,
each clean-diffed with `lint-batch --diff`.

Corpus: `regression-check` 0 changed fixtures. As with the other
additions this round that is no-regression only - no corpus file carries
these shapes.

Closed TODO #75.

**The trap, which the fix had to avoid:** the
top-level cells cannot key on "a bracket at statement start" - that is
also how the LEGAL destructuring `[a, b] = f()` begins. The check has to
key on the absence of a following `=`, which is exactly what TV's own
message says it is doing.

A second cell, measured while fixing the three above and left OPEN as
TODO #75's residual, because `var` behaves differently there than
anywhere else:

```pine
var [x, y] = f()
```

TV: ONE error, `""var"" cannot be used as a variable or function name.`
at 5:1 - a third message, distinct from both of the above. `var` in that
position is read as a variable NAME, so a var-qualified destructuring
does not exist at all; the destructuring path is bare `[a, b] = ...`
only.

We reject it too, so nothing is missed, but with a generic
`Expected variable name at line 5` four columns to the right AND two
cascading `Undefined variable` errors on `x` and `y` - names whose only
problem is the line above them. The cascade is the substantive half.
Untouched here because it is a parser-shape question rather than a tuple
POSITION question, and this investigation is about positions.

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
