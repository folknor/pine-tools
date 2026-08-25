# G009 - `--tv` cannot see the editor's context-restricted argument gates

`pine-lint --tv` forwards to TradingView's `translate_light` endpoint.
That endpoint is NOT the same validator the Pine editor runs. It
typechecks, but it does not enforce the editor's contextual restrictions
on what may appear inside a `request.*()` argument. So for that class of
rule, **`--tv` acceptance is not evidence of TradingView acceptance.**

This is a third caveat class on the oracle, alongside [G001](G001-tv-pine-lint-not-spec.md)
(TV is an unreliable comparator) and [G002](G002-reference-underdocuments-accepted-types.md)
(a `--tv`-verified widening that silently expired). It cuts the opposite
way from both: those are about trusting a `--tv` *rejection* or a stale
verdict; this is about a `--tv` *acceptance* that the platform does not
honour.

## Symptom

The whole `strategy.*` surface - mutating commands and plain variable
READS alike - is a compile error in the Pine editor when it appears
anywhere inside a `request.*()` argument:

```
CE10059: "strategy.X" cannot be used with any parameter of the
         "request.*()" functions.
```

`translate_light` passes the same source clean, and so do we.

## Probe

```pine
//@version=6
strategy("ce10059 probe")
x = request.security(syminfo.tickerid, "60", strategy.position_size)
plot(x)
```

`pine-lint --tv`, 2026-08-25:

```json
{"success":true,"result":{"variables":[{"definition":{"end":{"column":68,"line":3},
"start":{"column":1,"line":3}},"name":"x","type":"series float"}],
"functions":[],"types":[],"enums":[]}}
```

Zero errors. TV genuinely answered - the populated `variables` block with
a resolved `series float` type for `x` is the proof it reached the
endpoint rather than falling back (the empty-result ambiguity that
manufactured G002).

Our own verdict on the same source, same date: clean on the error
channel, one `lint`-stage REPAINTING_SECURITY warning. We do not
implement CE10059 either.

## Where the editor verdict comes from

We cannot capture it - we have no editor automation. The evidence is
piners' fieldwork, which ran three successive probe variants
(`strategy.entry`, `strategy.close`, and a bare `strategy.position_size`
read) through the real Pine editor on 2026-08-25 and got CE10059 on all
three, pointing at the expression argument. Record:
`../piners/reference/fieldwork/runtime-oracles/README.md`, section
"strategy.* inside a request expression". The probe file itself was
deleted upstream once it adjudicated, which is why the probe above is our
own reconstruction of the third (weakest, read-only) variant.

## The lesson

For anything touching **what may legally appear inside a `request.*()`
argument** - and plausibly other context-restricted argument positions we
have not yet found - neither pine-lint mode adjudicates. Only the editor
does.

Two consequences for the methodology in `AGENTS.md`:

- The standing rule "TV via `--tv` wins when we disagree" does not apply
  here in the accepting direction. `--tv` silence in this class is worth
  no more than TV silence generally: evidence, not authority.
- Any check we add for these shapes (see TODO #67) is **unverifiable by
  our own tooling**. Its only oracle is a hand-captured editor
  screenshot, which is a different evidentiary standard from every other
  check in the repo - closer to a gotcha than to a probe.

The narrower reading is also worth keeping: TradingView has at least two
validation layers, and the one we can reach is the more permissive of
them. Expect other editor-only rules to exist; a clean `--tv` verdict
does not close a question about contextual legality.
