# INV156 - qualifier fold through a statement-form `if` return

Filed 2026-08-25 from two cross-repo findings reported by the piners
project (`../piners/notes/todo.md`, "Toolchain findings"). Both were
claims about *our* validator, made from a 1027-file sweep on 2026-08-24.
Measured here against `pine-lint --tv`: **one reproduces and is a real
false negative; the other does not reproduce and their conclusion is
wrong.**

## Finding 1 - the qualifier does not fold through a statement-form `if` tail (REAL FN)

### Probe (`probes/if-tail.pine`)

```pine
//@version=6
indicator("tail qualifier direct")
f() =>
    if close > open
        "a"
    else
        "b"
plot(close, title = f())
```

`plot`'s `title` is `const string`. `f` returns a `series string`,
because a statement-form `if` on a series condition produces a series
value, so the call is illegal.

**TV (`pine-lint --tv`, 2026-08-25):** rejects, CE10123 at 8:21-8:23.

```json
{"code":"CE10123","ctx":{"argDisplayName":"title",
"argUserFriendlyRepresentation":"call \"f\" (series string)",
"argumentType":"series string","currentTypeDocStr":"const string",
"funId":"plot"},"start":{"column":21,"line":8},"end":{"column":23,"line":8}}
```

TV's `functions` block types `f` as `f() → series string`, so it folds
the tail qualifier through the return.

**Us, same date:** clean. A false negative.

### The gap is narrower than reported

piners filed this as "qualifier-fold parity with TV through user-function
returns, statement-form `if`/`switch` tails included". The `switch` half
is already correct, and so is the return type itself. Measured
2026-08-25, all against the same `plot(close, title = ...)` site:

| function body | our verdict |
|---|---|
| statement-form `if` / `else` tail (`probes/if-tail.pine`) | **clean - the FN** |
| `switch` tail (`probes/switch-tail.pine`) | errors, `call "g" (series string)` |
| ternary tail (`probes/ternary-tail.pine`) | errors, `call "h" (series string)` |

And the return type is not the broken part. On the *same* `if`-tail
function, an arithmetic misuse is caught with the correct type:

```pine
y = f() + 1
// :10:5: error: Cannot call "operator +" with argument "expr0"="call
//   "f" (series string)". An argument of "series string" type was used
//   but a "const int"  is expected.
```

So `f` IS typed `series string` where the operator check reads it, while
the `plot` argument check on the same call is skipped. Two further cells
confirm the skip is at the argument check rather than in the type:
`plot(close, title = f() + "z")` is also clean, and so is
`x = f()` / `plot(close, title = x)`.

**Conclusion:** this is not a return-type inference bug and not a
`switch`/ternary bug. Something about a body whose tail is a
statement-form `if` suppresses the const-qualifier argument check
specifically - the shape of a G006-style undetermined-type suppression
firing where it should not, though the mechanism is unconfirmed and is
the first thing the fix has to establish.

### Why piners cares, and why it is worse than one missed error

The piners parser corpus cross-checks its own parse acceptance against
our LOCAL validator (`parser_corpus_acceptance_matches_local_pine_lint`).
A shape where both sides wrongly accept agrees, so their suite stays
green and the whole divergence class is masked. Their manual rule
("prefer `--tv` when they disagree") covers a human adjudication; an
automated cross-check has no such escape. Fixing this on our side
un-masks it on theirs.

### FIXED 2026-08-25

The suppression theory in the previous section was wrong in its guess at
the mechanism, and the real cause is simpler. `udfCallProvenance` asked
`returnExpression` for the body's single value expression, and
`branchValue` yields the tail only when it is an `ExpressionStatement`.
A statement-form `if` tail is an `IfStatement`, so it returned null, the
UDF call had NO provenance at all, and the const-qualifier argument check
skipped for want of a qualifier rather than because anything suppressed
it. Nothing was suppressed; the qualifier was simply never computed.

That also explains why the return TYPE was right all along: the type
comes from a different path, and only the qualifier flows through
provenance.

`bodyValueProvenance` replaces that call. It handles the same cases and
adds one: a tail that is a statement-form `if` folds to the join of the
CONDITION with both branch values, recursively, so nested `if` tails work
too. A missing `else`, or a branch with no readable value, still yields
null.

**The condition is the load-bearing half.** Both branches in the repro
are const strings; TV types the call `series string` purely because the
condition is series. The `IfExpression` and `TernaryExpression` cases
already joined the condition the same way - the statement form was the
one shape that never reached them.

Pinned by `packages/core/test/fixtures/regression/INV156-tail-qualifier-fold.pine`,
which `--tv` adjudicates directly (3 errors, clean on the const-condition
cell). Four cells: a series-condition tail errors, the IDENTICAL shape
under `if 1 > 0` stays clean, and the switch and ternary tails guard
against regressing. Mutation-verified by dropping the condition from the
join, which goes red on exactly the first cell.

Corpus: `regression-check` 0 changed fixtures - no-regression only, since
no corpus file carries the shape.

Closed TODO #68.

## Finding 2 - `ta.change(...) and ...` DOES NOT REPRODUCE (their claim is wrong)

piners' sweep recorded, as an example of us being right and an oracle
being wrong, that "local pine-lint wrongly err[s] on `ta.change(...) and
...` (\"a `series bool` is expected\"), where TradingView emits only a
warning."

### Probe (`probes/ta-change-and.pine`)

```pine
//@version=6
indicator("change bool")
c = ta.change(close) and close > open
plot(c ? 1 : 0)
```

**Us, 2026-08-25:**

```
:3:5: error: Cannot call "operator and" with argument "expr0"="call
"ta.change" (series float)". An argument of "series float" type was used
but a "series bool"  is expected.
```

**TV (`pine-lint --tv`, 2026-08-25):** the *same* error, CE10123, at the
same position (3:5-3:20), with the same `funId`/`argumentType`/
`currentTypeDocStr` triple. Not a warning. Full response in
`probes/ta-change-and.tv.json`.

So on this shape we agree with TradingView exactly, and there is nothing
to fix. Either their sweep hit a different shape that they compressed
into this description, or it read a `warning` from somewhere other than
the error channel. Their entry stands uncorrected upstream; if this ever
comes back, ask for the actual file before spending time on it.

Recorded because a wrong claim about our correctness is worth pinning
down once, so the next person who reads their ledger does not re-open it.

## Finding 3 - their versionless-`--code` caveat is STALE for our local mode

The same upstream section warns that `pine-lint --code` without a
`//@version=6` header "silently validates as a pre-v6 dialect and reports
`clean` for code v6 rejects", and tells its readers to always include the
header.

That was true when they measured it. It is not true now - INV146's pre-v5
refusal closed it. Checked 2026-08-25:

```
$ pine-lint -H -c 'indicator("no version")
c = ta.change(close) and close > open
plot(c ? 1 : 0)'
:1:1: error: Pine Script v1 is not supported. Supported versions are >= 5.
```

A versionless script now fails loudly instead of validating quietly under
the wrong dialect, so the trap they hit cannot recur on our side. Their
advice to include the header is still good practice - it just is no
longer load-bearing against a silent wrong answer.

Note the caveat is only retired for the LOCAL validator. `--tv` forwards
whatever it is given, so a versionless script sent to TradingView is
still adjudicated under TV's own default-dialect rules, which we do not
control.

## Related

- [G009](../../gotchas/G009-tv-endpoint-misses-editor-only-gates.md) -
  the third finding from the same source, which is not ours to fix: the
  `--tv` endpoint cannot see the editor's CE10059 request-argument gates.
- [G006](../../gotchas/G006-undetermined-type-suppresses-arg-checks.md) -
  TV's own undetermined-type argument-check suppression, whose shape
  Finding 1 resembles from our side.
