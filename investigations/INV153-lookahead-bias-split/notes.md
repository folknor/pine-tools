# INV153 - one warning covered two different defects, and its wording fitted only one

Status: fixed. Refines INV152 rather than reversing it.

Our own `lint` stage, not a TV disagreement (INV144).

## The complaint

Reported from downstream use (`../strategies/PINE-LINT-BUGS.md` item 4), which
calls it "the most damaging entry in this file, because acting on it changes
what scripts compute."

After INV152 the rule ignored `lookahead` entirely, so all three of these got
the identical message:

```pine
request.security(syminfo.tickerid, "D", close, lookahead = barmerge.lookahead_on)
request.security(syminfo.tickerid, "D", close, lookahead = barmerge.lookahead_off)
request.security(syminfo.tickerid, "D", close)
```

and the message said the call "reads the current, still-forming bar", i.e. that
it returns data that does not exist yet. That is true of the first line only.

## Why the three are not alike

Manual, `concepts/other-timeframes-and-data#lookahead`:

> The series requested using `barmerge.lookahead_off` has a new historical value
> at the *end* of each HTF period, and both series requested using
> `barmerge.lookahead_on` have new historical data at the *start* of each
> period.

| Form | Future leak on history | Repaints realtime vs historical |
|---|---|---|
| `lookahead_on`, no offset | YES | yes |
| `lookahead_off` (or omitted) | no | yes |
| `lookahead_on`, offset | no | no |

So `lookahead_off` without an offset IS a defect - the middle column is why the
rule stays on it, and why INV152's decision not to exempt it stands. But it is a
DIFFERENT defect from the first row, with a different fix, and on a
lower-timeframe request it is not a defect at all.

## The cost of the shared wording

The message reads as a correctness finding, so it invites a fix. Acting on it
for a `lookahead_off` call means adding an offset AND switching to
`lookahead_on`, which shifts every signal by one higher-timeframe bar. Downstream
that happened at scale: roughly sixty calls converted across that repo, with
CHANGELOG entries asserting the calls had "supplied data that had not existed
yet" - untrue for every `lookahead_off` one. Of fifteen files that gained
`lookahead_on`, eleven had none to begin with. All reverted.

A lint whose remedy is worse than the finding is a false positive in effect even
when the finding is real.

## Resolution

`lookahead` still never exempts a call - it selects which rule fires:

- `barmerge.lookahead_on` (named or positional, arg index 4) with no offset ->
  **`LOOKAHEAD_BIAS`**: reads the requested period from its START, so on history
  it returns data that did not exist yet. Fix: add the offset, keep
  `lookahead_on`.
- anything else (`lookahead_off`, omitted, or a non-constant value) ->
  **`REPAINTING_SECURITY`**, reworded to describe realtime-vs-historical
  inconsistency, to say that the HTF fix shifts the value by one period, and to
  say outright that a same- or lower-timeframe request needs no change.

A non-constant `lookahead` lands on the weaker rule by design: the stronger
claim needs `lookahead_on` proven, and the module does not guess.

## Corpus sweep

`node investigations/INV144-semantic-lint-checks/count-lints.mjs`, 1879
fixtures, 723 clean as v6:

| Rule | findings | files (at most) |
|---|---|---|
| REPAINTING_SECURITY | 170 | 23.5% |
| LOOKAHEAD_BIAS | 23 | 3.2% |

193 total, unchanged from INV152 - the split moves findings between rules and
adds none. The 3.2% is the population that actually leaks future data, which is
what a reader can now act on without re-deriving it per call.

Regression fixture: `regression/lint-lookahead-bias.pine`.
