# INV152 - REPAINTING_SECURITY exempted a no-op, so the same call warned or not by spelling

Status: fixed. Reverses the exemption INV146 introduced.

Our own `lint` stage, not a TV disagreement (INV144).

## The disagreement

`lookahead` defaults to `barmerge.lookahead_off`. These two lines are the same
call:

```pine
A  request.security(syminfo.tickerid, "D", close)
B  request.security(syminfo.tickerid, "D", close, lookahead = barmerge.lookahead_off)
```

The rule fired on A and not on B. Whichever verdict is right, they must agree,
because writing the default out produces the identical program. B is the one
that let a repainting read through unnoticed - and it is the form a careful
author is MORE likely to write, which inverts the rule's intent.

Reported from downstream use (`../strategies/PINE-LINT-BUGS.md` item 2), where
two higher-timeframe reads in `indicators/composite/wave-scout.pine` went
unflagged for exactly this reason while comparable calls in the same file were
flagged.

## Why the previous reasoning did not hold

INV146 exempted `lookahead_off` on the grounds that it is the Manual's
prescribed idiom for LOWER-timeframe requests (which need no offset), that HTF
vs LTF is not statically decidable, and that a false positive on the corpus's
many legitimate LTF requests costs more than the miss.

The first two clauses are true; the conclusion does not follow from them. The
exemption's real subject is "this is an LTF request", but `lookahead_off` is not
evidence of that - it is the default, so an un-annotated call is exactly as
likely to be an LTF request as an annotated one. Keying on it suppressed the LTF
false positives only for the subset of authors who happened to write a no-op
out, and suppressed the HTF true positives of that same subset. It sorted calls
by spelling, not by anything about the program.

INV146 had already fixed one layer of this - the version before it went silent
on any NAMED `lookahead=`, and INV146 narrowed that to `lookahead_off` resolved
positionally too. It did not confront that the value it kept exempting was
itself the default.

## What the exemption was actually suppressing

`investigations/INV152-repainting-lookahead-off/sample-lookahead-off.mjs`
lists every corpus call passing an explicit `barmerge.lookahead_off`, with its
`timeframe` argument as written. 97 such calls across the v6 corpus:

```
  22  tf              11  "15"        6  "D"          2  htf
  21  "60"            11  "5"         4  "240"        2  selectedHTF
                       8  "1"         4  i_htf        2  timef
                                      3  "30"         1  ""
```

Not an LTF population. `"60"`, `"240"`, `"D"` are higher than most charts these
scripts run on, and `i_htf` / `htf` / `selectedHTF` are variables the authors
named for the higher timeframe themselves. The exemption was hiding the rule's
core case.

## Resolution

Drop the exemption: `checkRepaintingSecurity` no longer reads the `lookahead`
argument at all, and `isLookaheadOff` is deleted. The remaining exemptions are
all about the expression rather than about an annotation - a history offset in
it (now including one inside a helper it calls, INV151), a history offset on the
call, and a `timeframe` provably equal to the chart's.

A naming heuristic (`/htf/i` on the timeframe variable) would recover the LTF
distinction on most of the table above. It is exactly the guessing at intent
this module refuses, so it is not used.

## Corpus sweep

1879 fixtures, 723 parse clean as v6.

| | REPAINTING_SECURITY | files |
|---|---|---|
| before INV151 and INV152 | 134 | 18.5% |
| after INV151 (helper offsets) | 124 | 17.2% |
| after INV152 (this change) | 193 | 26.7% |

26.7% is a high rate, and it is the reason to record the judgement rather than
just the number: an un-offset `request.security` is the Manual's headline
repainting bug, this corpus is scraped public scripts, and the rule's other
exemptions are unchanged. A believable rate for that population, not a
false-positive signature. Re-measure if the corpus is replaced.
