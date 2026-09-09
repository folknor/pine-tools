# INV176 - v5 rejects a parenthesised wrap at a multiple-of-4 indent (false negative)

**Date:** 2026-09-07
**Status:** fixed (v5 only, by design)
**Code:** `packages/core/src/parser/lexer.ts` - `pendingParenWrap`, set in
`handleLineBreak` while a `(` is open under `//@version=5`, consumed by the next
line's first real token in `addToken`.
**Source:** `../strategies/PINE-LINT-BUGS.md` finding 8. It had sat in that
file's Not-confirmed section as "disproved" because every minimal
reconstruction was written `//@version=6`; a bisect of the real (v5) file
converged on the `//@version=5` line itself.
**Fixture:** `packages/core/test/fixtures/regression/INV176-v5-paren-wrap-multiple-of-4.pine`

## Symptom (false negative - the dangerous direction)

```pine
//@version=5
indicator("t", overlay = true)
bgcolor(bar_index > 5 ? color.new(color.green, 95) :
        bar_index > 9 ? color.new(color.red, 95) : na)
```

TV: `3:53 Syntax error at input 'end of line without line continuation'`. We
were clean. Under `//@version=6` the identical script is clean on both sides.

## Why this was invisible

INV017 and INV042 implemented Pine's wrap rule - a continuation line may not
be indented by a multiple of 4 - for wraps OUTSIDE brackets, and left the
inside-brackets case free-form on the manual's authority ("inside parentheses
there is no restriction"). The lexer emits no NEWLINE at bracket depth > 0, so
the parser never sees those wraps at all. That documented rule is a **v6**
rule. v5 applies the multiple-of-4 restriction inside parentheses too, and the
manual documents only v6, so nothing scraped or read could have said so.

## TV probes (`probes/`, `pine-lint --tv` via `scripts/lint-batch.mjs --diff`, 2026-09-07)

| probe | shape | TV |
|---|---|---|
| p01 | v5, ternary wrapped inside `bgcolor(...)`, continuation indent 8 | CE10156 at 3:53 (EOL of the wrapped line) |
| p02 | same, indent 4 | CE10156 at 3:53 |
| p03 (control) | same, indent 6 | clean |
| p04 (control) | p01 under `//@version=6` | clean |
| p05 | same, indent 0 (column 1) | CE10156 at 3:53 - 0 is a multiple of 4 |
| p06 | v5, `plot(close,` / `    color = color.red,` / `    linewidth = 2)` | CE10156 at 3:12 (EOL of `plot(close,`) |
| p07 | p01 nested in an if-body at indent 4, continuation indent 8 | CE10156 at 4:57 - absolute indent, not relative to the statement |
| p08 | v5, closer `)` alone on a line at column 1 | `3:30 Mismatched input 'end of line without line continuation' expecting ')'` |
| p09 | closer `)` alone at indent 4 | same as p08 |
| p10 | v5, tuple literal `[close,` / `    open]` | `3:10 Syntax error at input '['` - we already match (an existing rule) |
| p11 | v5, continuation indented with one TAB | CE10156 at 3:12 - a tab counts 4 |
| p12 | v5, comment-only line at indent 4 between the wrapped line and an indent-2 continuation | clean - comment lines are ignored |

All erroring probes were local-clean before the fix, so the calls reached TV.
The message TV prints is the same CE10156 wording INV042 already emits.

## Fix

The lexer already knows the version (first-directive-wins, INV146) and the
bracket stack. At a line break while the innermost open bracket is `(` and
the version is `5`, it records the EOL position; the next line's first token
that is not a COMMENT consumes it, and if that token's indent is a multiple
of 4 (tabs count 4) the lexer reports CE10156 at the recorded EOL. A closer
(`)` / `]`) as the first token is left alone (p08/p09 - different wording,
joined-line anchor, see Residual). Restricted to `(` because `[` wraps
already draw the p10 error, and the rule is gated to `5`: v6 is measured
clean, v4 is refused by the version gate before any of this matters.

## Verification

- All probes: p01, p02, p05, p06, p07, p11 same position and wording as TV;
  p03, p04, p12 clean; p10 unchanged. p06 gets a second CE10156 at 4:23 for
  its second bad continuation line - past TV's first-error stop, the same
  treatment INV042 records.
- Regression fixture (`parse: fail`, two pinned positions, two clean wraps
  including the comment-line case).
- `regression-check.mjs`: **2632 new appearances in 47 fixtures, all this
  message, all v5 files.** The TV reference covers v6 fixtures only, so 18 of
  the 47 were sent to `--tv` directly (`scripts/lint-batch.mjs --diff`),
  2026-09-07:
  - 6 files: TV's single error is CE10156 at EXACTLY our first appearance
    (`0b45d086`, `396a411f` both 2:67; `442a9d64` 153:34; `bc0f16ff` 116:34;
    `cc2536d8` 300:59; `35b1f993`/`a7e4bc81` see next point).
  - 2 files (`35b1f993`, `a7e4bc81`): TV anchors one line EARLIER at a
    farther column (95:114 vs our 96:89). The violation is the one we flag;
    TV reports it in joined-line coordinates - the statement's first line,
    columns accumulated over the trimmed wrapped lines plus one joining space
    each (39 + 1 + 73 + 1 = 114). Our anchor is the offending line's own EOL,
    which coincides with TV's whenever the violation is on a statement's
    first line (every other case above).
  - 2 files (`0bfce987`, `434cc3c0`): TV reports only a LEXER error (`{`, a
    broken string) which pre-empts its parse stage, so its silence on the
    wraps is not a verdict.
  - 8 files: TV returns an empty error list on a file our lexer finds
    riddled with broken strings, uncommented prose and column-80 breaks -
    the string-lexer-abort mangles INV042 and INV047 triaged, where TV's
    parse stage never runs. Not verdicts either.
  Zero TV-clean files among the 18. The baseline was re-snapshotted after
  this triage.
- Full suite green (482).

## The anchor residual - CLOSED 2026-09-09

TV reports in joined-line coordinates: the statement's first line, columns
accumulated over each line from there with leading whitespace stripped and one
joining space added per line. We anchored at the offending line's own EOL,
which is the same point whenever the statement is one line long - hence every
probe above agreeing and only two corpus files not.

The original entry said matching it "would need the lexer to know where a
statement starts, which only the parser knows". That was the right diagnosis of
the obstacle and the wrong conclusion about the remedy: a NEWLINE *is* emitted
after a trailing operator at depth 0 (verified with `debug:tokens`), so the
lexer's newline bookkeeping genuinely cannot say where the statement began -
but it does not have to track it forward. `joinedWrapAnchor` walks BACK from the
offending line while the previous line's trimmed text ends in an operator, comma
or opener, which is a purely textual test needing no token state at all.

Adjudicated over the whole affected population, not just the two known files.
`check-joined-anchor.mjs` (in this directory) re-runs it:

| | files |
|---|--:|
| **AGREE** with TV | 4 |
| **DISAGREE** | 0 |
| TV pre-empted by a lexer error - no verdict | 35 |

The 35 are the same population this investigation triaged the first time: TV's
parse stage never runs on a file whose lexer aborts on a broken string or a
stray `{`, so its silence is not a verdict. Zero disagreements among the files
that can adjudicate, `35b1f993` and `a7e4bc81` included (95:114 and 102:114,
both exact).

Fixture: `regression/INV176-v5-joined-line-anchor.pine`, with a single-line
statement as the control that must not move.

**Still v5-gated.** The anchor is computed inside `pendingParenWrap`'s only
consumer, which `handleLineBreak` sets only when `detectedVersion === "5"`, so
none of this is reachable from v6. Confirmed empirically too: all 39 corpus
files whose anchors moved are v5, none v6.

## Residual
- **A closer alone on a multiple-of-4 line** (p08/p09) draws
  `Mismatched input 'end of line without line continuation' expecting ')'`
  at a joined-line anchor. Deliberately not emitted: the wording and anchor
  both differ from the rule above and the shape is rare.
- v5 wraps inside `[ ]` are already rejected by an older rule (p10) and were
  not swept here.
