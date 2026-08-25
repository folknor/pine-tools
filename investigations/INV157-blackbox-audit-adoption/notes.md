# INV157 - what the piners black-box audit says about us

Adopted 2026-08-25 from `../piners/notes/blackbox-audit-2026-08-24.md`, a
1027-file sweep of v6 Pine through `piners validate`, `pine-lint`,
`piners inspect` and `pine-lint --tv`. Most of that document is about
piners' own compile surface and is none of our business. This records the
parts that touch `pine-lint`, each re-measured here before being written
down.

**Result: four confirmed false negatives in our validator, one correction
to a gotcha of ours, and five claims that do not apply to us.**

The audit's own framing is worth carrying over, because it governs how
much any of this proves: it counts FIRST errors only, so a defect behind
an earlier diagnostic is invisible, and it states plainly that its method
"cannot tell you whether a previously-closed cause is still closed".

## Confirmed: four false negatives (TV rejects, we accept)

The audit found these while using our local validator as a cheap
pre-filter, and noted that `pine-lint` accepts all four while piners
rejects them - "cases where piners is stricter than the local oracle and
CORRECT. Do not 'fix' them." They are right. Sources copied to `probes/`
from piners' `scratch/spar/`; all four verified 2026-08-25 as local-clean
and TV-rejected.

They fall into two clusters.

### Cluster A - the `simple` qualifier is not propagated through mutation

`probes/qual5.pine` and `probes/qual7.pine`. Both pass a mutated local to
`request.security`'s `calc_bars_count`, which is `simple int`:

```pine
n = 5
n := int(close)
plot(request.security(syminfo.tickerid, "60", close, calc_bars_count = n))
```

TV: `6:72: Cannot call "request.security" with argument
"calc_bars_count"="n". An argument of "series int" type was used but a
"simple int" is expected.` We are clean.

`qual7` is the same check reached differently - the qualifier comes from
mutation inside a `for` loop (`sum := sum + i`) rather than a top-level
`:=`. TV types both results `series int`.

We already enforce the `simple` qualifier on arguments in general - that
is [G007](../../gotchas/G007-tv-does-not-enforce-input-qualifier.md)'s
finding, and INV088 built it. So the gap is not the check, it is the
INPUT to the check: a binding that starts const/simple and becomes series
through a later `:=` is still being read at its declared qualifier at the
call site. Note we do compute exactly this fact elsewhere - INV115
("conditional const-reassign = series state") tracks reassignment-induced
series state for the CW10003 consistency warnings. The likely repair is
feeding that same state into the argument qualifier check rather than
computing it twice.

### FIXED 2026-08-25 - and the rule is narrower than "a `:=` makes it series"

Probing TV first turned out to matter, because three of the six cells
would have been wrong under the obvious implementation. TV's rule, all
probed 2026-08-25:

| cell | TV |
|---|---|
| series RHS at top level (`n := int(close)`) | **promotes** |
| const RHS inside a loop body (`sum := sum + 1`) | **promotes** |
| const RHS under a series-gated `if` (`if close > open`) | **promotes** |
| const RHS at top level (`n := 6`) | clean |
| const RHS under a CONST-gated `if` (`if 1 > 0`) | clean |
| read BEFORE the `:=`, same script | clean |

Two consequences. The qualifier is **flow-sensitive, not a whole-script
join** - moving the `:=` after the call clears the error - so promoting
in statement order as the walk proceeds is the parity behaviour rather
than an approximation of it. And the trigger is not the written value: a
write that RUNS conditionally is series regardless of what it writes,
which is why the loop and series-gate cells promote a plain `+ 1`. TV
ignores the loop back edge too (a read textually before the `:=` inside
the same loop body is clean).

All six cells are pinned by
`packages/core/test/fixtures/regression/INV157-qualifier-promoted-by-reassignment.pine`,
which TV adjudicates directly: `--tv` on that fixture returns exactly the
three expected errors and is silent on the three negative cells.
Mutation-verified in both directions - disabling the context promotion
drops it to 1 error, and making the gate unconditional adds a fourth on
the const-gated cell.

### The design constraint this ran into, worth knowing before touching it again

The obvious implementation - write the promoted qualifier into
`symbol.type` - **fails, and it fails loudly**: 11 fixtures went red with
`operator +` reporting `series int` against an expected `const int` on
loop accumulators.

The reason is an invariant that is not written down anywhere: **symbol
types are stored UNQUALIFIED and the qualifier is derived per read**, by
`qualifierProvenance`. A qualified string in `symbol.type` is then read
as a base type by everything downstream. `inferExpressionType` hands back
`symbol.type` verbatim, so it feeds every operator and assignment check,
not just the argument check that needed it.

What landed instead keeps the promotion beside the symbol - a
`WeakMap<Symbol, Qualifier>` keyed by the declaring scope's Symbol object
(`lookup` walks to it, so a `:=` in a loop body promotes the declaration
rather than a shadow that dies with the scope) - and consults it in
exactly two places: `qualifierProvenance`, which is the qualifier
authority, and the INV088 simple-qualifier argument check, which reads
`inferExpressionType` and would otherwise never see it. Nothing else
changes behaviour.

Corpus: `regression-check` 0 changed fixtures. Read that as no-regression
only, NOT as evidence the check works - no corpus file carries this
shape, so the corpus supplies no positive evidence here. Same caveat
class as INV141/142/143.

Closed TODO #70.

### Cluster B - user-function overloads are unmodelled

`probes/ov-optional-only.pine` and `probes/ov-na-decisive-rev.pine`.
Pine allows a user function to be declared more than once with different
parameter types, and TV enforces rules about it that we do not implement
at all.

**Collision rule.** Two overloads whose REQUIRED parameter lists are
identical are illegal, even when one declares extra optional parameters:

```pine
f(float x) => x + 1.0
f(float x, float scale = 1.0) => x * scale
```

TV: `7:2: The "f" function has overloads with the same required
parameters. The type of required parameters must be different in
overloaded versions of functions.` We are clean.

**Resolution feeding the return type.** With `f(float x) => 1` and
`f(int x) => "int"`, the call `f(na)` resolves to the `float` overload,
so the call's type is `const int` and `string result = f(na)` is illegal:

TV: `10:1: Cannot assign a value of the "const int" type to the "result"
variable. The variable is declared with the "const string" type.` We are
clean.

The second is the harder half and should not be attempted first: it needs
overload selection (including TV's rule for which overload an `na`
argument picks, which this probe pins in one direction only) before the
return type is even knowable. The collision rule is self-contained and
needs no resolution at all.

Note this is a genuine feature gap rather than a bug - nothing in the
repo currently models user-function overloading. piners implemented it on
2026-08-23 and their notes record the design (a three-valued
applicability resolver with declaration-order tie-break and a never-guess
rule for arguments they cannot type), which is worth reading before
designing ours.

Tracked as TODO #71.

## Correction: G008's headline was too broad

The audit's cause 5 carries a thirty-cell TradingView variance table that
contradicts the headline of our own
[G008](../../gotchas/G008-collection-reassignment-skips-element-check.md),
which said TV "element-type-checks a collection DECLARATION but not a
`:=` reassignment".

Re-probed here 2026-08-25. TV **does** check the `:=` position - our
original probe was a widening (`array<float> := array<int>`), which is
the direction that passes. The narrowing direction rejects:

```pine
a = array.new<float>(1, 1.0)
array<int> b = array.new<int>(1, 1)
b := a
```

TV: `CE10173 Cannot assign a value of the "array<float>" type to the "b"
variable.`

And a third cell neither write-up had tested: the `map` store position is
not element-checked **at all**. `map<string, int> := map<string, string>`
is clean at TV while the identical array and matrix shapes reject. That
is not even a widening.

G008 is corrected in place with the measured table. Its conclusion is
unchanged and better founded - the accepting cells are an asymmetry in
TV's checker, not a variance rule, so our error stays. Worth noting both
this file's first version and piners' first table stated a rule their
untested cells contradict; theirs required two re-probes to settle.

## Does not apply to us - five claims checked and dismissed

Recorded so nobody re-opens them from their ledger.

- **`ta.change(...) and ...`** - the audit's one named example of
  `pine-lint` being wrong where TV is right ("TV emits only a warning").
  It does not: TV returns the identical CE10123 error at the same
  position. Already adjudicated in
  [INV156](../INV156-tail-qualifier-fold-through-returns/notes.md)
  finding 2, with the raw response.
- **`plot(..., transp = 100)` under v5** - listed among thirteen false
  positives "SHARED with pine-lint", both validators rejecting where TV
  accepts. We do not reject it; INV148's v6-only argument-name gate means
  we never check argument names on a v5 file. TV does emit a deprecation
  WARNING we do not mirror - see the residual below.
- **Numeric operands to `and`** - the audit records "TV accepts numeric
  operands to `and`; piners does not", implying a piners false positive.
  In v6 TV rejects: `close > open and 1` returns CE10123, `literal int`
  where `series bool` is expected. Our v4/v5-only leniency gate (INV060 /
  G004) is correct as it stands, and piners is right to reject too.
- **Three catalog cells** the audit found wrong in piners -
  `plot(close, show_last = 1)`, `table.cell(..., width = 12.5)`, and
  `time(timeframe.period, -1)` - are all clean through our checker. Our
  types come from the scraped reference rather than a hand-keyed table,
  which is the Data-vs-Syntax rule paying off.
- **Two parser cells**, likewise: `for int i = 1 to 3 by 1` (a
  type-qualified loop counter) and `na` used as an enum FIELD name both
  parse clean for us. Those were piners grammar gaps.

## Residual, not filed as a work item

TV emits a deprecation warning we do not:

> The `transp` argument is deprecated. We recommend using color.new() or
> color.rgb() ... note that `transp` has no effect in plots where the
> color is calculated at runtime

This is a **tv-only warning**, which TODO.md names as one of the two
correctness-meaningful invariants (currently 0). It does not appear in
our sweeps because those cover 748 *v6* fixtures and `transp` only
reaches this on v5 source. Mirroring it sits inside the deliberate
legacy-leniency policy (arg-type checks are v6-only, G004/INV013), so
whether we want it at all is a policy question rather than a defect.
Recorded here rather than in TODO.md because nothing is currently wrong.

## Method note

Everything above was measured with `pine-lint --tv` on 2026-08-25 against
minimal probes, not inherited from the audit's prose. That mattered: of
the audit's claims that touch us, four held and five did not. The two
"pine-lint is wrong" examples it names both turned out wrong in our
favour, while the findings it did NOT frame as being about us - the spar
true-rejections and the variance table - are where all the real value
was.
