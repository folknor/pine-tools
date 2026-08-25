# INV159 - a polymorphic return taken from an argument the parameter rejects

Filed 2026-08-25 from a report against the `strategies` repo, which keeps
a live guard for the shape
(`compile_rejects_string_source_for_polymorphic_ta_builtins`). The probe
is two statements:

```pine
//@version=6
indicator("bad source")
plot(ta.range("x", 3))
```

| | verdict |
|---|---|
| us, before | 2 errors: `source` wants **`simple int`**, PLUS one on the enclosing `plot` |
| `--tv` | 1 error: `source` wants **`series float`** |

Both tools reject the call, so this was never a missed error - it is two
separate message-accuracy defects that happened to arrive together. One
is fixed; the other is recorded below with its evidence and deliberately
left alone.

## Fixed: the cascade onto the enclosing call

`ta.range` carries `flags.returnTypeParam = "source"`, so its return type
FOLLOWS its source argument. With a string source the call was typed
`string` - confirmed directly, `string s = ta.range("x", 3)` was clean -
and the enclosing `plot` then checked a string against its own parameter
and reported a second error. Same for `ta.change` and `ta.mode`, the
other two source-polymorphic functions.

The repair is one gate in `getPolymorphicReturnType`: do not propagate a
determining type the parameter cannot accept; fall through to the static
return instead. That is TradingView's own shape - one error at the bad
argument, silence about the enclosing call - and the same principle as
[G006](../../gotchas/G006-undetermined-type-suppresses-arg-checks.md),
where an argument TV cannot type silences the checks around it.

**The gate has to be conservative, and the first version was not.** It
split the parameter's catalog type on `/` to get union members, which is
wrong for the several catalog types that are PROSE rather than a type
expression. `input`'s `defval` reads
`const int/float/bool/string/color or source-type built-ins`, which
splits into a member `color or source-type built-ins`, so
`members.includes("color")` was false and every `input(#hex)` in the
corpus was mistyped - **100 new errors in one file**, caught by
`regression-check` before it went anywhere. The gate now decides only
when every member is a clean scalar base and stays permissive otherwise.

Pinned by
`packages/core/test/fixtures/regression/INV159-polymorphic-return-from-rejected-arg.pine`,
which `--tv` adjudicates directly: three bad calls, three errors, and
three valid controls that must stay clean because the return must STILL
follow an acceptable source. Mutation-verified - disabling the gate
restores all three cascades and the fixture goes red at 6 errors.

Corpus: `regression-check` 0 changed fixtures.

## NOT fixed: `currentTypeDocStr` is fabricated

We name the expected type as `simple int`; TV says `series float`. My
first write-up of this (TODO #74) guessed we were "naming some other
parameter's type" - **that was wrong**, and worth correcting: `simple
int` is not `length`'s type either (`length` is `series int`). The string
is fabricated by the union-argument check, which hardcodes
`currentTypeDocStr: \`simple ${members[0]}\``.

That hardcode is not arbitrary - [INV085](../INV085-union-arg-ce10123-template/notes.md)
probed `nz(<bool>)` and `int(true)` and TV really did answer `simple int`
for both. It is simply not general.

**TV's actual rule is not derivable from the data I gathered.** Four
probes, all with an `int/float` union in the parameter
(`pine-lint --tv`, 2026-08-25):

| call | catalog param type | TV's `currentTypeDocStr` |
|---|---|---|
| `ta.sma("x", 3)` | `series int/float` | `series float` |
| `ta.highest("x", 3)` | `series int/float` | `series float` |
| `math.max("x", 1)` | `series int/float` | `const int` |
| `nz("x")` | `series int/float/color` | `simple int` |

Same union shape, three different answers, differing in BOTH the
qualifier and the member. Candidate rules and why each dies:

- *First overload's param type verbatim* - fits `math.max` (overload 0 is
  `const int`) but not `nz`, whose overload 0 is `simple color` while TV
  says `simple int`.
- *Declared qualifier with the union collapsed to its widest member* -
  fits the whole `ta.*` family but breaks `nz`, which currently matches.
- *First numeric overload* - fits `math.max` and `nz`, but not
  `ta.range`, whose first numeric overload has `source: series int` while
  TV says `series float`.

So any change here fixes one family and regresses another, and the
per-function table that would satisfy all of them is exactly what the
Data-vs-Syntax rule in AGENTS.md forbids the checker to carry. Left as
is deliberately. Reopen with a broader probe sweep - enough functions to
separate the overload-ordering hypothesis from the widest-member one -
not with a fourth guess.

The practical impact is bounded: the accept/reject verdict is right, the
argument NAME is right, and only the expected-type noun is wrong, so a
reader is pointed at the correct argument with a misleading target type.
