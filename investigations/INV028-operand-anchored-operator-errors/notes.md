# INV028 - operator operand-type errors anchor at the operand (CE10123)

**Status:** resolved 2026-06-04. The 13-hit tv-only cluster
`Cannot call "operator *" with argument ...` was NOT a detection gap:
we flagged every site already, but anchored the error at the
expression start where TV (CE10123) anchors at the offending operand -
and TV emits one error PER offending operand where we stopped at the
first. The position-keyed diff therefore counted each site twice
(a localOnly + a tvOnly).

## TV's convention (probed)

- One CE10123 per offending operand, with `argDisplayName` expr0/expr1.
- The error spans the operand itself, not the expression or operator.

Decoded against recorded inventory output for the corpus sites
(`07db4539…`, `250b60f3…`, `12f2c9e5…`, `8fcd16c1…`: e.g.
`y = true and "hello"` errors at the string's column; `x6 = 1 - false`
at `false`; `x8 = 2 * color.blue` at the color;
`x9 = color.red > color.blue` gets TWO errors, one per color), then
confirmed with fresh probes.

## Probes (`pine-lint --tv`, 2026-06-04, files in this directory)

- `probe-a-right-operand.pine` - `y = true and "hello"`. TV: one
  CE10123 at **3:14-3:20** (the string literal), ctx expr1 /
  "literal string" / "const bool" expected.
- `probe-b-both-operands.pine` - `if ph or pl` with two series float
  operands. TV: TWO CE10123, **5:4** (ph, expr0) and **5:10**
  (pl, expr1), both "series float" used where "simple bool" expected.

Our pre-fix validator put one error at the expression start in both
cases (disagreeing with the probes' positions, confirming they reached
TV).

## Fix (checker.ts, validateBinaryExpression)

- `and`/`or`: one error per non-bool operand, anchored at that
  operand's (line, column). Previously: single error at the expression
  with an early return that suppressed the right-operand check.
- Arithmetic/comparison fallback (`- * / % < > <= >=`): when the
  pairwise compatibility check fails, anchor at each non-numeric
  operand; mutual incompatibilities between individually-plausible
  operands keep the whole-expression anchor. `+` is excluded from the
  operand-class rule (string concatenation makes non-numeric operands
  legitimate there).
- Wordings unchanged - ours are clearer than TV's template; the diff's
  samePositionDifferentMessage channel absorbs the wording difference
  by design.

## Verification

- All 10 decodable cluster positions now match TV exactly
  (`07db4539…` 13:14/19:15, `12f2c9e5…` 358:40/359:42, `250b60f3…`
  14:14/19:10/23:10/26:18, `8fcd16c1…` 423:10/470:10). The remaining 3
  tv-only in the cluster are `35a58bb9…`'s ternary-branch trio, where
  TV anchors at one branch chosen by type-priority rules we have not
  decoded (flags the non-color/non-bool branch in all three probes
  recorded in the inventory); ours stays at the ternary - true
  positives on both sides, documented in TODO.
- `validation/type-errors-operators.pine` updated: the color-comparison
  line now expects TWO errors (matching TV's per-operand convention,
  which TV's own output for the corpus copy `250b60f3…` shows - 10
  errors total).
- Corpus diff: 674 appearances, 657 on v2/v4/v5/versionless legacy
  scripts where and/or on numerics was idiomatic truthiness - the left
  operand was already flagged there pre-change (the check is
  version-blind, a pre-existing stance); per-operand reporting doubles
  those sites. The 17 v6 appearances: 10 are the cluster fixes at TV's
  exact anchors, 7 land in the post-TV-stop region of the two known
  mangled files (`13a74513…`, `4d78be7e…`).
