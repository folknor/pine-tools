# G006 - TV skips ALL argument checks on a call containing an "undetermined type" argument

**Date:** 2026-06-11. **Found by:** the second #48 mutation run (seed 2):
two `wrong-type-literal` mutants came back `tv-accepts` even though the
mutation put a literal `42` into a parameter the catalog (and TV's own
reference) types as string.

## Symptom

`plotshape(goLong, 42, ...)` - title is `const string`, the argument is
`literal int` - compiles CLEAN on TV when `goLong`'s type is
"undetermined type" (e.g. it flows from an untyped UDF parameter). The
identical call with a determinate first argument is rejected with
CE10123. Same for `strategy.close(42, txt)`: the wrong-typed argument
itself is a determinate literal, but one undetermined SIBLING argument
suppresses the check on every argument of the call.

## Cause

When TV's own type inference gives up on any argument of a call (its
variable list shows "undetermined type" - the same display INV026
documented for UDF params/results), it skips argument validation for
that ENTIRE call, including arguments whose types are perfectly known.
TV's silence on such calls is an inference limitation, not a verdict
that the arguments are valid.

## Probes (`pine-lint --tv`, 2026-06-11)

Probe 1 - undetermined first arg, wrong-typed title. TV: ZERO errors,
`success:true` WITH full variable list (`goLong` "undetermined type") -
a genuine compile, not a crash/empty response:

```pine
//@version=6
indicator("p")
f(x) => x > 0
goLong = f(close)
plotshape(goLong, 42)
```

Probe 2 (control) - same file, determinate first arg, the UDF still
present. TV: CE10123 at 5:25 ("Cannot call "plotshape" with argument
"title"="42". An argument of "literal int" type was used but a
"const string" is expected."):

```pine
//@version=6
indicator("p")
f(x) => x > 0
goLong = f(close)
plotshape(close > open, 42)
plot(goLong ? 1 : 0)
```

Probe 3 - the suppression extends to SIBLING args: `42` for `id`
(`series string`) is determinate and provably wrong, but the
undetermined `txt` argument silences the whole call. TV: ZERO errors,
full variable list:

```pine
//@version=6
strategy("p")
f(x) => x > 0 ? "a" : "b"
txt = f(close)
if close > open
    strategy.close(42, txt)
```

Probe 4 (minimal control) - TV: CE10123 at 4:20 for `id`:

```pine
//@version=6
strategy("p")
if close > open
    strategy.close(42)
```

Both original mutant carriers re-verified with `compare-tv.mjs`: TV
returns zero errors AND zero warnings on the full files, with populated
variable lists (most variables "undetermined type" - both fixtures lean
on untyped UDFs throughout).

## Lesson

- **Do not relax our arg checks to match TV's silence here.** Our
  CE10123 on these calls is a true positive of the INV001 class (we
  catch what TV misses). Pinned by
  `packages/core/test/fixtures/regression/G006-undetermined-arg-suppression.pine`.
- **Mutation-run triage:** a `tv-accepts` verdict does not always mean
  "the breakage was not invalid". When the mutated call sits near
  undetermined-typed values (untyped UDF results/params), TV's accept is
  this suppression. Check the mutant with a minimal isolated probe
  before discarding the operator/site as a signal source.
- This is also a structural reason TV-vs-us "FP" labels on UDF-heavy
  fixtures under-count our correct findings (cf. G001: TV silence is
  evidence, not authority).
