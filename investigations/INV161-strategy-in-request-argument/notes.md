# INV161 - CE10059: `strategy.*` in a `request.*()` argument

Landed 2026-08-25, closing TODO #67. This is the first check in the repo
whose oracle is **not** `pine-lint --tv`, so most of these notes are
about the evidence rather than the code.

## The rule

TradingView's Pine editor rejects the entire `strategy.*` namespace
anywhere inside a `request.*()` argument:

```
"strategy.X" cannot be used with any parameter of the "request.*()" functions.
```

Mutating commands and plain variable READS alike - `strategy.entry`,
`strategy.close`, and a bare `strategy.position_size` read each return
it, pointing at the expression argument.

## The oracle, and why it is unusual

**A hand-run Pine editor session, 2026-08-25, three successive probe
variants.** Recorded in the runtime-oracles fieldwork at
`../../../piners/reference/fieldwork/runtime-oracles/README.md`; the
probe file was deleted upstream once it adjudicated, so the probe here is
a reconstruction of all three variants.

This check therefore **cannot be regression-tested against `--tv`**, and
that is not a defect in the capture - it is a property of the rule. See
[G009](../../gotchas/G009-tv-endpoint-misses-editor-only-gates.md).

An earlier draft of TODO #67 argued the evidence was weak for want of a
screenshot. That reasoning was wrong twice over and is corrected here so
it is not repeated:

- **A CE10059 capture cannot exist in the form I was asking for.** CE is a
  COMPILE class: the script never runs, so there is no runtime banner
  (those are RE-class, chart-legend only) and no log output. The editor's
  own error display is the only surface, which is exactly what was read.
  The runtime-oracles protocol has no slot for a CE artifact by
  construction - its two artifact classes are logs for probes that
  survived and banners for probes that died.
- **The capture is first-hand.** It was run by this repository's owner,
  not by an unreachable third party, which is a materially different
  evidentiary standing from how the earlier draft framed it.

## What `--tv` actually says, which is more interesting than "nothing"

Measured on the fixture, 2026-08-25. `--tv` does not treat the four cells
alike:

| cell | `--tv` |
|---|---|
| `strategy.entry(...)` in a request argument | REJECTS - but for an unrelated reason: `void` into a `series float` parameter |
| `strategy.close(...)` | same |
| `strategy.position_size` (a read) | **clean** |
| `close + strategy.equity` (a read) | **clean** |

The two mutating commands return `void`, so `translate_light` rejects
them on ordinary type grounds at the same positions we anchor at, with a
different message. The two READS typecheck perfectly well, and there
`--tv` is genuinely silent.

So the editor-only surface is narrower than "the whole rule": it is the
READ cells. Those are where this check catches something no other tool
available to us can, and they are also the shape a real script is most
likely to contain by accident - reading `strategy.position_size` inside a
request expression looks entirely reasonable.

## Implementation

`rejectStrategyInRequestArgument` in `checker-calls.ts`, on any call whose
resolved name starts with `request.`. It walks each argument's expression
tree for the first `strategy.*` member reference and anchors there.

The walk includes a call's **callee**, which the first version omitted -
so `strategy.entry("L", strategy.long)` reported the inner
`strategy.long` argument instead of the command itself, and
`strategy.close("L")` was missed entirely. Both mutating-command variants,
the two the capture cared most about, were invisible until the callee was
added and ordered first.

**Anchor caveat.** The capture says TV points at the expression argument.
In all three probed variants the argument WAS the strategy reference, so
the capture cannot distinguish "at the argument" from "at the reference" -
they coincide. They diverge only for a nested use like
`close + strategy.equity`, which is unprobed; we anchor at the reference
there, which is the more useful of the two.

## Coverage

Corpus: `regression-check` 0 changed fixtures, and that is expected rather
than reassuring - **zero carriers**. Measured before building: 244 corpus
files use `request.*` and 416 use `strategy.*`, but none combines them
this way, and neither does the external `strategies/` collection. The
fixture is the only coverage, which is the same standing as INV141/142/143.

Pinned by
`packages/core/test/fixtures/regression/INV161-strategy-in-request-argument.pine`,
whose description carries the do-not-align-to-`--tv` warning at the site.
