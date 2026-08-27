# INV173 - the method-form anchor, and an unpinned shadowing leniency

Opened 2026-08-27 from TODO #82, itself raised by INV170's leftover probe. Two
findings came out of the same grid. **One is fully pinned and fixed here; the
other is not pinned and is deliberately NOT fixed.**

## The grid

`probes/grid.mjs` - 18 receiver names x 2 receiver kinds (a collection and a
scalar), each declaring `<name> = <receiver>` and then calling
`<name>.zzNotAMember(1)`. The member is absent from every catalog namespace,
so a checking TradingView must reject it; a clean verdict means TV stopped
checking. `--local` runs the same grid against our validator.

Probed 2026-08-27. Collection and scalar columns agreed on every row, so only
one is shown:

| receiver name | class | TV |
|---|---|---|
| `color`, `label`, `line`, `box`, `table`, `linefill` | type+namespace | **clean** |
| `polyline` | type+namespace | CE10271 |
| `math`, `ta`, `str`, `syminfo`, `request` | namespace | CE10271 |
| `string`, `int`, `float`, `bool` | type | CE10271 |
| `arr`, `myVar` | plain | CE10271 |

Plus, from a follow-up round: `array`, `matrix`, `map`, `chart`, `ticker` all
CE10271; `strategy` **clean**.

## Finding (a): the leniency is NOT pinned, and is not fixed

We report CE10271 on every row. TV does not, so the six-plus-`strategy` clean
rows are **false positives on the error channel** - the worst kind we can
produce, since an error blocks otherwise valid code.

Three hypotheses are dead, each killed by a measured cell:

- **"shadows a namespace"** - `math`, `ta`, `array` all shadow one and error.
- **"is a type name"** - `string`, `int`, `float` are types and error.
- **"is both"** - `polyline` is both and errors, while `strategy` is a
  namespace only and is clean.

A fourth was tested directly and also fails: TV does **not** re-type the
shadowed variable. `array.get(color, 0)` is clean after
`color = array.new<float>(3, 1.0)`, exactly as it is for a plainly-named
receiver, so the leniency is not "TV thinks `color` is a color".

So after ~30 cells the discriminant is unknown, and **the lenient set is not
derivable from anything in our catalog**. That rules out the tempting fix: a
hardcoded list of the seven lenient names would be exactly the table of
language facts the Data-vs-Syntax rule forbids the checker from carrying.

Two honest options remain, neither taken here:

1. **Suppress the check whenever the receiver shadows any catalog name.**
   Derivable from the catalog, no table. It trades our false positives for
   false negatives on `math`/`array`/`polyline` etc., which is the safer
   direction for an ERROR - but it silently drops real detections.
2. **Probe the full name set and bake the result into pine-data**, exactly as
   INV050 did for requiredness and INV171 for the union nouns. This is the
   architecturally correct answer for a non-derivable language fact, and the
   set is small and enumerable.

Left open in TODO #82 rather than guessed at. The FP is narrow (it needs a
user variable named after a builtin namespace AND a bogus member call) and the
corpus carries none of it.

## Finding (b): the method form anchors at the DOT - FIXED

Fully pinned, and unambiguous: **all 17 erroring cells anchor at the dot**,
`rootName.length` columns right of where we put it.

| cell | TV | us, before |
|---|---|---|
| `math.zzNotAMember(1)` | 4:5 | 4:1 |
| `ta.zzNotAMember(1)` | 4:3 | 4:1 |
| `syminfo.zzNotAMember(1)` | 4:8 | 4:1 |
| `polyline.zzNotAMember(1)` | 4:9 | 4:1 |

The FUNCTION form is different and was already right: an unshadowed
`linefill.zzNotAMember(1)` is TV `3:1`, the name's first character, and
`x = color.red(1)` is `3:5` on both (INV170). So the two CE10271 forms carry
two different anchor conventions and only the method one moved.

Both method-form emission sites in `checker-calls.ts` now add
`rootName.length` to the column. `probes/grid.mjs --local` reproduces TV's
column on every erroring row.

### Four existing fixtures were pinning the WRONG column

This is the part worth remembering. `INV065-shadowed-scalar-member`,
`INV138-collection-receiver-method-call`, `INV138-imported-method-on-scalar`
and `INV138-scalar-receiver-method-call` all asserted the receiver-start
column, and INV138's own description says it probed this family. So the
fixtures had locked in the bug.

They were NOT bulk-updated to match the new code. Each fixture's own source
was re-run through `--tv` first, and TV agreed with the new columns line for
line in every case - e.g. `f(float x) => x.abs()` is TV `3:16`, not the `3:15`
the fixture pinned. Only then were the assertions corrected, and each
description now records why.

**Why no sweep caught it:** a local error at column 15 and a TV error at
column 16 are a local-only plus a tv-only record, and tv-only has read 0 in
every sweep - because the corpus contains none of these shapes. The same
"corpus proves nothing" hole as INV170, INV171 and INV172, now demonstrated to
have hidden a wrong assertion inside our own test suite rather than just a
missing check.

The lesson for fixture authorship: **a `column=` assertion is a claim about
TradingView and needs its own probe.** A fixture that pins a position nobody
measured makes the wrong position permanent.

## Verification

- `probes/grid.mjs --local` matches TV on every erroring row.
- Four corrected fixtures, each re-verified against `--tv` on its own source.
- Full suite 479 passing; `regression-check` 0 changed fixtures.
