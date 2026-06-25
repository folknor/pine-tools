# INV099 - loop variable mutation not flagged (false negative)

**Date:** 2026-06-25
**Status:** fixed
**Code:** `packages/core/src/analyzer/symbols.ts` (`Symbol.loopVar`),
`checker.ts` (set `loopVar` on for/for-in iterators; CE10174 in
AssignmentStatement).
**Source:** `../freedom/FINDINGS.md` F-052 - piners + local pine-lint both
miss it; TV flags it.

## Symptom (false negative)

```pine
//@version=6
indicator("s")
for i = 0 to 5
    i := 10
plot(close)
```

Reassigning a `for` counter (or a `for...in` element) is illegal - loop
variables are immutable. We were silent; TV rejects.

## TV's verdict (probe, `pine-lint --tv`, 2026-06-25)

Script: the snippet above. Raw TV output (first error):

```json
{"code":"CE10174","ctx":{"variableName":"i"},
 "start":{"column":5,"line":4},"end":{"column":5,"line":4},
 "message":"Variable \"{variableName}\" cannot be mutable"}
```

(TV emits a cascade CE10272 "Undeclared identifier i" downstream; we emit only
the CE10174, which is the real defect. `success:true`.)

## Fix

`Symbol` gains an optional `loopVar` flag, set `true` when defining the for
counter / for-in iterator(s). In AssignmentStatement, any mutation operator
(`:=` or compound `+=`/etc.; plain `=` is a redeclaration, a separate error) on
a `loopVar`-flagged target emits CE10174, anchored at the target. v6 only.

## Verification

- Regression fixture `regression/INV099-loop-var-mutation.pine` (counter mut +
  for-in element mut, with the loop var also READ to confirm reads stay clean,
  exactly 2 errors).
- `regression-check.mjs`: 0 new appearances. Full suite green.
