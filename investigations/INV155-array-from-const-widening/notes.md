# INV155 - `array.from(0, 0, 0)` did not widen to `array<float>`

Status: fixed.

Reported from downstream use (`../strategies/PINE-LINT-BUGS.md` item 6).

## The disagreement

`array.from` has both an `int`-element overload and an `int/float` one returning
`array<float>` (`po lookup array.from`, overloads 10 and 11). We typed the call
`array<int>` from the arguments alone and then rejected the assignment.

```pine
//@version=6
indicator("t")
type T
    array<float> v
var T t = T.new(array.new<float>())
t.v := array.from(0, 0, 0)
plot(t.v.get(0))
```

| | Result |
|---|---|
| `pine-lint -H` (0.5.0, 082f33c) | `6:1: error: Cannot assign array<int> to array<float>` |
| `pine-lint -H --tv`, 2026-08-23 | clean |

## What decides it is CONST-ness, not literalness

The obvious reading - "literal ints widen" - is wrong, and the probe that
separates the two also proves TV answered, since TV disagrees with our verdict on
one line and agrees on the other.

Probe A, `pine-lint --tv`, 2026-08-23:

```pine
//@version=6
indicator("t")
int k = 0
array<float> a = array.from(k, k, k)
array<float> b = array.from(0, 0, 0)
plot(a.get(0) + b.get(0))
```

TV: `4:1: error: Cannot assign a value of the "array<int>" type to the "a"
variable. The variable is declared with the "array<float>" type.` - one error.
Line 5 clean.

Probe B, `pine-lint --tv`, 2026-08-23:

```pine
//@version=6
indicator("t")
int k = 0
array<float> c = array.from(0, k)
array<float> d = array.from(0, 1 + 2)
type T
    array<float> v
var T t = T.new(array.from(0, 0))
t.v := array.from(0, 0, 0)
plot(c.get(0) + d.get(0) + t.v.get(0))
```

TV: `4:1: error: Cannot assign a value of the "array<int>" type to the "c"
variable. ...` - one error. So:

- every argument const int -> widens (`array.from(0, 0, 0)`),
- a const-int EXPRESSION counts (`array.from(0, 1 + 2)`), which is what rules
  out a literal-node test,
- one non-const `int` argument stops it (`array.from(0, k)`), even mixed with
  const ones,
- the widening holds wherever the `array<float>` context comes from: a declared
  annotation, a `:=` to a UDT field, or a `T.new` argument.

That is exactly the ordinary const-int-to-float promotion (`float x = 0`) lifted
to the collection, so it is decided by the argument's QUALIFIER, which we already
resolve.

## Resolution

`arrayFromWidensToFloat` in `checker-provenance.ts`: an `array<int>`-typed
`array.from` call in an `array<float>` context whose every argument has
provenance `{ base: "int", qualifier: "const" }`. Consulted at the two sites that
rejected the repro - the lenient declaration path and the `:=` path in
`checker.ts`. The inferred type of the call is left `array<int>`, since that is
the type TV renders in the message on the non-const case.

The `T.new` argument path needed no change: it did not flag the constructor
argument to begin with.

Regression fixture: `regression/array-from-const-int-widening.pine`, which locks
the negative case (`array<float> = array.from(k, k)` still errors) alongside the
positives - a fix that just accepted every `array<int>` into `array<float>` would
pass the positives and be wrong.
