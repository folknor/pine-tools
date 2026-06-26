# G007 - TV enforces the `simple` qualifier on args but NOT the `input` qualifier

**Date:** 2026-06-26
**Probe tool:** `pine-lint --tv` (translate_light).

## The asymmetry

Pine's argument-qualifier lattice is `const < input < simple < series`. A
parameter typed `simple int` should reject `series`; a parameter typed
`input string` should reject `simple` and `series`. TradingView's checker
enforces the `simple` requirement but is **silent** on the `input`
requirement: a series value flows into an `input`-qualified parameter with no
error.

This is the opposite of what the lattice implies (the `input` slot is the
*stricter* requirement, yet it is the one TV does not police). Treat it as a
TV linter wart, not a spec - it is exactly the kind of inconsistency
[G001](G001-tv-pine-lint-not-spec.md) warns about.

## The decisive probe (one script, one value)

```pine
//@version=6
indicator("s")
plotshape(close, offset = bar_index, show_last = bar_index)
```

`bar_index` is `series int`. `offset` is `simple int`; `show_last` is
`input int`. TV's result (2026-06-26, `success:true`):

| arg | param type | TV verdict |
|---|---|---|
| `offset = bar_index` | `simple int` | **CE10123** - "series int used but simple int is expected" @ 3:27 |
| `show_last = bar_index` | `input int` | accepted (no error) |

The single error on `offset` proves TV reached the type checker; the silence
on `show_last` proves it does not enforce the input qualifier.

Confirming string-side probes (same date), each `success:true`:

```pine
//@version=6
indicator("s")
sstr = close > 0 ? "a" : "b"          // TV's internal type: series string
plotshape(close, style = sstr)        // style is `input string`  -> ACCEPTED
plotshape(close, text  = sstr)        // text  is `const string`  -> CE10123 (series string vs const string)
```

`style` (input) accepts the very same `sstr` that `text` (const) rejects - and
the `text` rejection's `ctx.argumentType` is `"series string"`, so TV itself
labels `sstr` series while still accepting it into `style`.

## Lesson / why this is a gotcha

The const-required arg check (`checkConstArgs`, INV014/INV112) and the
simple-qualifier check (INV088) are both correct and TV-matched. Do **not**
add a parallel *input*-qualifier check on input-typed params (e.g.
`plotshape(style=)`, `location`, `format`, `show_last`): TV accepts series
there, so such a check would be a pure false-positive generator. Our checker
already matches TV on this - it rejects `offset = bar_index` (INV088) and
accepts `show_last`/`style` series values.

This closes the deferred sub-case of TODO #60 / the INV112 residual, whose
premise ("`style` needs an input-qualifier check analogous to INV088's simple
one") rested on the untested assumption that `style` is policed like the
const-required `title`/`overlay`/`message`. It is not.
