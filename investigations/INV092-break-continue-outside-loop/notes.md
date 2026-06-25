# INV092 - break/continue outside a loop not caught (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` - `loopDepth` field
(incremented in For/ForIn/While), and the break/continue check in the
ExpressionStatement case.
**Source:** `../freedom/FINDINGS.md` F-035 - local `pine-lint` LSP false
negative (piners + `--tv` both flag it; we were clean).

## Symptom (false negative)

```pine
//@version=6
indicator("s")
break        // TV: CE10135. We were silent.
continue     // TV: CE10136.
plot(close)
```

## TV's model (probes, `pine-lint --tv`, 2026-06-25)

| probe | TV |
|---|---|
| `break` at top level | CE10135 @ 3:1 - `"break" is only allowed inside loops.` |
| `continue` at top level | CE10136 @ 3:1 - `"continue" is only allowed inside loops.` |
| `break`/`continue` inside a for/while (even nested in an if) | clean |

## How it parses / why it passed

`break`/`continue` have no dedicated AST node - they parse as an
`ExpressionStatement` whose expression is a bare `Identifier` named
"break"/"continue" (they ARE excluded from the undefined-variable check, so we
were entirely silent). The checker had no loop-nesting tracker.

## Fix (checker)

A `loopDepth` counter (distinct from `blockDepth`, which also counts if-blocks)
is incremented in the For/ForIn/While cases around their body. In the
ExpressionStatement case, a bare `break`/`continue` Identifier with
`loopDepth === 0` emits CE10135/CE10136 at the keyword. v6 only (G004).

## Verification

- 2 error probes (positions + messages exact vs TV) + clean controls (break in
  for-nested-in-if, continue in for, break in while).
- Regression fixture `regression/break-continue-outside-loop.pine`.
- `regression-check.mjs` over 1879 corpus fixtures: **0** new appearances (real
  break/continue all sit inside loops). Full suite: 355 pass.
