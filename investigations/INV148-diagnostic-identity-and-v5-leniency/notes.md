# INV148 - analysis-warning identity, version-gate coherence, v5 argument names

Second external audit of a ~285-file corpus (`../strategies`). Three findings
fixed here; four further false positives characterized with probes but NOT
fixed - each needs its own investigation, and they are recorded below so the
next person starts from the probe rather than the symptom.

## 1. analysis-stage warnings carried no code or rule

Errors carry `code` (CE10120) and `lint`-stage warnings carry `rule`
(REPAINTING_SECURITY), but `analysis`-stage warnings had only
start/end/message/stage. 122 of 140 corpus warnings were therefore
unfilterable except by matching prose - while `--help` advertises that stage
as "TradingView's own warnings (CW codes), mirrored".

`SemanticWarning` already had a `rule` field; the CLI simply never emitted it
for this stage. Now it emits `rule` always, plus `code` where the warning
mirrors a TV CW code.

The codes were probed rather than taken from the inline comments:

| rule | TV code | probe result (2026-08-21) |
|---|---|---|
| SHADOW_BUILTIN | CW10011 | `f() => open = 5` -> `"code":"CW10011"` |
| SHADOW_VARIABLE | CW10013 | local `myVar` over global -> `"code":"CW10013"` |
| CONDITIONAL_SERIES (block) | CW10003 | `ta.sma` under `if close > open` |
| CONDITIONAL_SERIES (ternary) | CW10004 | `cond ? ta.sma(...) : 0.0` |
| CONDITIONAL_SERIES (andor) | CW10002 | `cond and ta.sma(...) > 0` |
| MULTILINE_STRING | CW10001 | INV019, dated 2026-06-04 |
| LOCAL_HISTORY | CW10018 | INV021, dated 2026-06-04 |
| UNUSED_VARIABLE | **none** | TV emits NO warning at all |

The scope kind that selects CONDITIONAL_SERIES's wording selects its code too,
so the code is chosen at that emission site.

**UNUSED_VARIABLE deliberately gets no code.** Probe: `unusedVar = 42`
unreferenced returns `{"success":true,...}` with an empty warnings list - TV
says nothing. So the rule mirrors nothing, and inventing a CW for it would
give consumers a code that can never be reconciled against TV. It keeps its
`rule` and no `code`. (It is also the rule AGENTS.md records as buggy - it
reports built-ins as unused.)

## 2. Version gate was incoherent with the parser

Most v4 files got the clean pre-v5 refusal; three got syntax errors as well,
so the same population received two different explanations depending on
whether the file happened to trip the lexer.

INV146 made this call deliberately ("Parse diagnostics still stand - they come
from the syntax stage, not here"). That was wrong, and the corpus is the
evidence. Our lexer and parser implement v6 grammar, so their verdicts on v4
source are not evidence of anything, and TV will not adjudicate them - it
rejects the file before parsing. For a version we refuse outright, the refusal
is now the only thing we say.

The refusal carries a code, `PINE_VERSION_UNSUPPORTED`, so the CLI recognises
it structurally rather than matching its prose. It is deliberately not
CE-shaped: TV has no diagnostic for this at all, answering
`{"success":false,"reason":"Supported versions are >= 5"}` outside the
diagnostic channel entirely.

Note the report described these three files as getting "a syntax error
instead" of the gate. They actually got both; the syntax errors merely sorted
first.

## 3. v5 scripts judged against v6 argument schemas

`plot(..., transp = 100)` in a v5 script drew CE10120 from us. TV, probed
2026-08-21:

```pine
//@version=5
indicator("t", overlay=true)
plot(close, transp=100)
```

```json
{"success":true,"result":{"warnings":[{"end":{"column":23,"line":3},
"message":"The `transp` argument is deprecated. We recommend using color.new()
or color.rgb() functions to specify the transparency of the plots instead...",
"start":{"column":1,"line":3}}],...}}
```

A deprecation WARNING, not an error - while the same call on v6 draws CE10120
(probed in INV146). `transp` was removed in v5 but the platform still accepts
it there.

The unknown-argument-NAME check is now v6-only, matching the argument-TYPE
gating that G004/INV013 already established for exactly this reason: pine-data
ships only v6 signatures, so a v5 call judged against them is flagged for
every parameter v6 removed. We cannot distinguish "removed in v5, still
accepted" from "genuinely invalid" without v5 signatures, and a false error on
a script that runs is worse than a missed one.

Corpus: 445 disappeared errors across 79 fixtures, 0 new appearances - all of
it this class plus the pre-v5 syntax suppression from finding 2 (`plot`
112, `plotchar` 31, `fill` 24, `strategy.entry` 18, `plotshape` 18, the rest
syntax).

## Characterized but NOT fixed

Each is a confirmed local false positive with a dated probe. None is a
one-line fix; they are listed here rather than in TODO.md because each needs a
real investigation.

### (a) Trailing-comma line continuation

`cvd-profiles.pine:576` ends `IBline := na, ` and continues on 577. We report
`Unexpected token: :=` at 577:37. TV accepts (2026-08-21):

```pine
//@version=6
indicator("t")
a = 0.0
b = 0.0
if close > open
    a := na   , b := na, 
    b := na
plot(a + b)
```

### (b) Collection `:=` is not element-type-checked by TV

`cvd-profiles.pine:202`, `TP.cvd := array.from(0, 0, 0)` into an
`array<float>` field. We report `Cannot assign array<int> to array<float>`.
TV, 2026-08-21, is asymmetric and the asymmetry is the finding:

- `array<float> floats = array.from(0, 0, 0)` -> TV **errors**
  (`Cannot assign a value of the "array<int>" type...`)
- `floats := ints` where `ints` is `array<int>` -> TV **clean**

So TV element-type-checks a collection DECLARATION but not a `:=`
reassignment. Before relaxing anything here, note AGENTS.md's rule: never
relax a check because TV is silent. This is not silence - it is an explicit
acceptance in one syntactic position and rejection in another, which may
equally be a TV bug. Worth deciding deliberately, not by default.

### (c) Leading-dot method chain broken by an interleaved comment

`volume-supply-demand.pine:734`. Lines 731-732 chain `.market_profile_data()`
/ `.filter_profile()`, line 733 is a commented-out `// .normalize()`, and 734
resumes `.set_poc()`. We report `Unexpected token: .` at 734. TV accepts the
whole file (2026-08-21: one CW10003 warning, no errors).

A naive minimal repro does NOT reproduce - TV rejects a leading-dot chain
written at top level - so the repro must preserve the file's nesting depth and
indentation. That is exactly why this needs its own investigation.

### (d) Values derived from an UNTYPED parameter must stay undetermined

`htf-support-resistance.pine:106`. Minimized, and the minimization is the
whole point:

```pine
//@version=6
indicator("t")
f(len) =>
    bool ph = ta.pivothigh(len, len)
    ph
plot(f(5) ? 1 : 0)
```

TV: clean. Us: `Cannot assign a value of the "series float" type to the "ph"
variable. The variable is declared with the "const bool" type.`

With `f(int len)` - a TYPED parameter - TV emits that error, character for
character, including the "const bool" wording. So the discriminator is the
untyped parameter: TV treats it as "undetermined type" and does not ground
`ta.pivothigh(len, len)` to `series float`, exactly the model INV114
established for the warning channel. Our INV123 call-graph fixpoint binds
`len` from the call site and grounds the result, and that grounding now
reaches the ERROR channel.

Any fix must not undo INV124's gate drop, which depends on that same grounded
inference. This is the largest of the four.

**Correction to the report on this file.** It was filed as both tools
"independently reaching the same wrong series bool vs series float conclusion"
- shared with a second validator, and by implication a shared misreading of
the types. The types are not the issue: TV agrees with our reading when the
parameter is typed. The issue is undetermined-type propagation from an untyped
parameter. TV reports the full file clean.

## Also corrected

The report attributed `cvd-profiles.pine`'s parse failure to line 100 (method
calls in tuple position). Our only parse error in that file is at 577:37,
finding (a) above. Line 100 parses fine.

## Files touched

- `packages/core/src/parser/semanticAnalyzer.ts` - optional `code` on
  `SemanticWarning`, threaded from each emission site
- `packages/cli/src/cli.ts` - emit `rule`/`code` on analysis warnings; drop
  all other diagnostics when the pre-v5 refusal fires
- `packages/core/src/analyzer/checker.ts` - `UNSUPPORTED_VERSION_CODE` on the
  refusal
- `packages/core/src/analyzer/checker-calls.ts` - CE10120 gated to v6
- `packages/core/test/fixtures/regression/INV148-v5-argument-names-lenient.pine`
