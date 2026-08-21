# INV146 - lookahead exemption, version directive precedence, pre-v5 cascade

Three findings from an external audit of a ~285-file Pine corpus, all
reproduced locally. Unrelated in mechanism, filed together because they
arrived together.

## 1. REPAINTING_SECURITY exempted the future leak it exists to catch

`checkRepaintingSecurity` opened with:

```ts
if (hasNamedArgument(call, "lookahead")) continue;
```

Rationale at the time: passing `lookahead` explicitly records the author's
intent, so stay quiet. Two problems.

**The premise is wrong.** The Manual (`po show 94e3ac62`, the
`request.security` repainting FAQ) is explicit:

> Neglecting to offset the `expression` argument in an HTF request causes
> **lookahead bias** on historical bars.

Its prescribed idiom is offset *and* `lookahead_on` together - the offset is
what does the work. `lookahead = barmerge.lookahead_on` on an un-offset
expression is therefore the textbook future leak, not evidence of an
informed author.

**The check was named-only.** Every other argument in the rule resolves
positionally via `argumentAt`. So two semantically identical calls got
opposite verdicts:

```pine
//@version=6
indicator("t")
x = request.security(syminfo.tickerid, "D", close, lookahead = barmerge.lookahead_on)
plot(x)
// before: clean
```

```pine
//@version=6
indicator("t")
x = request.security(syminfo.tickerid, "D", high, barmerge.gaps_off, barmerge.lookahead_on)
plot(x)
// before: warning REPAINTING_SECURITY
```

### Why the exemption was narrowed rather than deleted

The first fix deleted the exemption outright: warn whenever `expression`
carries no history offset, whatever `lookahead` says. The corpus sweep
(`count-lints.mjs`) moved REPAINTING_SECURITY from 119 sites to 203, and the
new sites included this class:

```pine
[ltf15mClose, ltf15mHigh, ltf15mLow] = request.security(syminfo.tickerid, "15", [close, high, low], lookahead = barmerge.lookahead_off)
```

(`fixtures/00a1c14fe6...pine:118`, and 121/124 alongside it.)

Those are LOWER-timeframe requests, and the same Manual section says the
opposite for LTF:

> `barmerge.lookahead_off` always returns the last intrabar for both
> historical and realtime data. To prevent repainting [...] use
> `barmerge.lookahead_off` for lower timeframe data requests.

So for LTF, explicit `lookahead_off` with no offset is the *correct*
non-repainting idiom. HTF vs LTF is not statically decidable when the
timeframe is a variable (`res`, `tf`), so flagging that class is a false
positive - and in this channel a false positive costs more than a miss.

Final rule: `lookahead` is resolved positionally as well as by name, and
**only `barmerge.lookahead_off` exempts**. `lookahead_on` gets no exemption -
it repaints on both sides (future leak on HTF; first-vs-last intrabar on
LTF, per the same section).

Deliberate miss accepted: an un-offset HTF request with explicit
`lookahead_off` stays silent, because it is indistinguishable from the
legitimate LTF form above.

Sweep after the narrowed fix: **134 sites (18.5%)**, up from 119 (16.5%) -
+15, all `lookahead_on` without an offset. Spot-check of a new site,
`fixtures/7587a4c902...pine:565`:

```pine
bull := higher_tf(res) ? request.security(sym, res, src, barmerge.gaps_off,
barmerge.lookahead_on) : bull
```

Explicitly guarded on `higher_tf(res)`, un-offset `src`, lookahead passed
positionally. Genuine lookahead bias, and exactly the shape the old
named-only exemption let through.

The message also changed: it used to advise "or pass 'lookahead' explicitly
to record the intent," which taught the wrong fix. It now advises the offset.

## 2. A `//@version=N` anywhere in the file overrode the line-1 declaration

`extractVersionFromAnnotation` did a bare assignment on every comment it
scanned, so the LAST directive in the file won.

Probe, sent to `pine-lint --tv` 2026-08-21:

```pine
//@version=6
study("C")
//@version=4
plot(close, transp=50)
```

TV's response (`success: true`, and it disagreed with our local result at the
time, confirming it reached TV rather than falling back):

```json
{"success":true,"result":{"errors":[
 {"code":"CE10271","ctx":{"fullName":"study","kind":"function or function reference"},
  "start":{"column":1,"line":2},"end":{"column":5,"line":2},
  "message":"Could not find {kind} '{fullName}'"},
 {"code":"CE10120","ctx":{"name":"transp","signature":"plot"},
  "start":{"column":13,"line":4},"end":{"column":18,"line":4},
  "message":"The \"{signature}\" function does not have an argument with the name \"{name}\""}
]}}
```

TV reports both errors - it ignores the trailing `//@version=4`. We reported
only the `transp` error: `study()` had been accepted under v4 rules while
`transp` was still judged by v6 rules, so the file was validated against no
coherent version at all. The hybrid is a second-order effect of the same
line, since the detected version is consumed at different points (the
lexer's multiline-string rule reads it mid-lex, the checker reads it after).

Fix: first wins. Regression fixture
`regression/version-directive-first-wins.pine`.

## 3. Declared-v4 scripts drowned in v6 argument errors

```pine
//@version=4
study("v4")
src = input(close, type=input.source)
plot(sma(src, 14), transp=50)
```

We reported `"input" has no argument "type"` and `"plot" has no argument
"transp"`. Both are correct v4 - `input(type = ...)` is the v4 form, and
`transp` was a valid `plot` argument until v5 removed it. `pine-data` ships
only v6 signatures, and while arg-*type* checking was already gated to v6
(G004), the unknown-arg-*name* error (CE10120, `checker-calls.ts`) was not.

There is no authority to match here. `pine-lint --tv` on the script above,
2026-08-21:

```json
{"success":false,"reason":"Supported versions are >= 5","result":null}
```

TV refuses pre-v5 outright. So `validate()` now mirrors that: for a detected
version `< 5` it emits one diagnostic and returns, rather than cascading. Parse
diagnostics are unaffected - those come from the syntax stage.

Note this also covers the no-directive case, which the CLI already maps to
version `"1"` (TV's rule, INV029/INV032) - such files now get the same single
refusal.

## Files touched

- `packages/core/src/analyzer/lint-semantic.ts` - narrowed lookahead
  exemption, positional resolution, new `isLookaheadOff`, reworded message,
  dead `hasNamedArgument` removed
- `packages/core/src/parser/lexer.ts` - first-wins version directive
- `packages/core/src/analyzer/checker.ts` - pre-v5 refusal in `validate()`
- `packages/core/test/fixtures/regression/lint-repainting-security.pine` -
  rewritten; the old fixture locked the exemption as intended behaviour
- `packages/core/test/fixtures/regression/version-directive-first-wins.pine` -
  new
