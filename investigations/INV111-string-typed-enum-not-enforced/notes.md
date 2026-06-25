# INV111 - string-typed "enum" params are NOT value-checked by TV (no defect)

**Date:** 2026-06-25
**Status:** closed - not a defect (TV accepts; matching it is correct)
**Code:** none (the INV100 `param.type === "unknown"` gate stays as-is).
**Source:** INV100 residual / TODO #59 - a speculative follow-up to extend
CE10068 to genuine string-typed enum params (`box.new(xloc=)`,
`plotshape(style=)`, `indicator(format=)`). The speculation is refuted below.

## The question

INV100 emits CE10068 only when `param.type === "unknown"` - the special
enum-TYPED params (`strategy_direction`, `plot_display`, ...). It deliberately
skips modeled `string`-typed params, partly to dodge the scrape-corrupted
`strategy().close_entries_rule` (a `const string` whose `allowedValues` wrongly
holds a stray `strategy.exit`). #59 asked whether the genuine string enums
(`xloc`/`style`/`format`, all `*string` with all-dotted `allowedValues`) should
be value-checked, with a candidate discriminator (dotted default vs plain
string) to separate them from the corrupted one.

## TV's verdict (probes, `pine-lint --tv`, 2026-06-25)

TV ACCEPTS arbitrary strings in these params - it does not enforce the
documented "Possible values" for plain `string`-typed params.

| probe | TV |
|---|---|
| `indicator("s", format = "bad")` | `success`, 0 errors |
| `plotshape(close > open, style = "bad")` | `success`, 0 errors |
| `box.new(bar_index, high, bar_index+1, low, xloc = "bad")` | `success`, 0 errors |
| `label.new(bar_index, high, "t", style = "bad")` | `success`, 0 errors |
| `indicator("s", format = format.price)` (control) | `success`, 0 errors |
| `plotshape(close > open, style = shape.circle)` (control) | `success`, 0 errors |

Contrast the special enum-TYPED case that INV100 DOES catch and TV DOES flag:
`strategy.entry("L", 5)` -> CE10068 (direction is `series strategy_direction`,
not a plain string).

## Conclusion

The distinction is intentional in TV: a param TYPED as a special enum
(`strategy_direction` etc., which our catalog maps to `unknown`) enforces
membership; a param typed plain `string` does not, even when its reference page
documents "Possible values" as dotted constants. `format.price` / `shape.circle`
are just `string` constants, so any string is type-compatible and TV compiles
it.

Therefore adding CE10068 to string-typed params would produce FALSE POSITIVES
against TV (the authority on validity). Our checker is already silent here
(`param.type === "unknown"` gate), matching TV. No change. #59 is closed as
not-a-defect; the INV100 gate is confirmed correct, not merely conservative.

(The genuinely-corrupted `close_entries_rule` allowedValues remains a data-scrape
quirk, harmless because we don't read it - see INV100.)
