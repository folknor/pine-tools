# INV008 - `if` body swallowed everything at the same indent

**Status:** Fixed. `ifStatement` now requires the body's indent to be
strictly greater than the `if` keyword's own indent.

**Regression fixture:**
`packages/core/test/fixtures/regression/INV008-if-body-indent.pine`

## Summary

A malformed token sequence like `if conflict` left over by a
wrapped-without-`//` comment

```pine
// Note: ensure scope
or rename if conflict       // ← parser sees `if conflict` here

overlap = input.bool(true)  // ← gets absorbed as "if body"
```

was parsed as a column-1 `if` whose body extended to *every*
subsequent statement at column 1, i.e. to end-of-file. Every
declaration past that point lived inside the phantom if-body's scope,
not at the global scope - which is why `overlap` (declared on
line 817 of `fixtures/8439b2366…pine`) wasn't visible at line 1057
inside `fnOB()`. Looked like a "scope visibility" bug; was actually a
parser block-extent bug.

This is the same root cause as task #4 - `plot`, `plotshape`,
`barcolor`, etc. flagged as "cannot be called from a local scope" in
real fixtures. Once the if-body extends past where it should, every
non-locally-callable function lands in a "local" scope and flags.

## Repro

Minimal:

```pine
//@version=6
indicator("t")

or rename if conflict

overlap = input.bool(true)
plot(close)
```

Before fix:

```
errors: 3
  4:4   Undefined variable 'rename'
  4:14  Undefined variable 'conflict'
  7:1   Function 'plot' cannot be called from a local scope.
        It must be called from the global scope.
```

After fix:

```
errors: 2
  4:4   Undefined variable 'rename'
  4:14  Undefined variable 'conflict'
```

`plot(close)` is correctly recognised as a global-scope call again.

## Root cause

`packages/core/src/parser/parser.ts:ifStatement()`. The body-block
collector set `consequentIndent` to the indent of the first
post-`if` statement *without* checking that it was strictly greater
than the `if` keyword's own indent. So a column-1 `if` with no
properly-indented body would set `consequentIndent = 1` and consume
every subsequent column-1 statement until end-of-file as the if's
body. The `if` block's scope (and the blockDepth counter)
correspondingly never closed.

Captured `_baseIndent` already existed in the function but was unused
(name-prefixed with `_`) - the original author recognised this was a
gap but didn't wire the check up.

## Fix

In `ifStatement()`:

```ts
const ifIndent = startToken.indent ?? 0;
// ...
if (consequentIndent === null && currentToken.line > startToken.line) {
    if (currentIndent <= ifIndent) {
        // No properly-indented body - the `if` has no consequent.
        break;
    }
    consequentIndent = currentIndent;
}
```

Inline `// see INV008` reference at the change site.

## Verification

- Minimal repro: 3 → 2 errors. The spurious `plot` "cannot be called
  from a local scope" is gone. `rename` and `conflict` remain
  correctly flagged.
- Full fixture `8439b2366…pine`: 213 → 134 errors. The `overlap`
  cascade resolves; many of the cascading mid-file `Undefined
  variable` and `Cannot be called from local scope` errors clear up.
- 155/155 tests pass. New regression fixture
  `packages/core/test/fixtures/regression/INV008-if-body-indent.pine`
  locks in the behaviour.
- Local regression-check shows 130 new "Undefined variable X"
  appearances across the corpus. These are *correctly flagged*:
  garbage identifiers from wrapped-comment-without-// patterns
  (`the candle is red, stop` etc.) that our parser now reaches and
  reports as undefined. TV is silent on these (TV stops at first
  error and never sees them), so they appear as `localOnly` in the
  TV-diff - methodology says we're more-correct than TV, not in
  conflict with it. They're not regressions.
- 1 "TV-also-flagged" disappearance: that's `8439b2366…pine:1057
  Undefined variable 'overlap'` - the exact bug we fixed. The
  annotation is stale (TV actually says 0 errors on this file in
  fresh `--tv`).

## Methodology notes captured

- "Top-level variables not visible from deeply nested blocks" (the
  original task #15 framing) was the *symptom* - the actual mechanism
  was top-level variables being declared inside a phantom if-body
  scope at parse time. When something looks like a scope-walk
  problem, also check whether the parser is honestly placing
  declarations at the scope you expect.
- Two bugs collapsed into one fix: INV008 resolves both the
  surface-level "task #15 overlap not visible" issue AND task #4's
  "plot cannot be called from local scope" FPs (same blockDepth-stuck
  root cause). Task #4 may be closeable after a fresh corpus-wide
  TV diff.
