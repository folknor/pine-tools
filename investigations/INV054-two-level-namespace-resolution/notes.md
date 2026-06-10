# INV054 - two-level builtin namespace calls bypass all validation (CE10188)

**Date:** 2026-06-10
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (`memberChainName` +
callee-name extraction in `validateCallExpression`),
`packages/pipeline/src/generate.ts` (`topLevelOnly` list)

## Symptom (false negative)

A `strategy.risk.*` rule called inside a local scope passed silently in our
linter, while TV rejects it with CE10188 "Cannot use ... in local scope":

```pine
//@version=6
strategy("t")
if close > open
    strategy.risk.max_drawdown(90, strategy.percent_of_equity)
plot(close)
```

`compare-tv` (2026-06-10): TV flags 4:5 CE10188, local silent.

## Root cause - single-level member-chain resolution

`validateCallExpression` built the callee name with only:

```ts
if (member.object.type === "Identifier")
    functionName = `${member.object.name}.${member.property.name}`;
```

For `strategy.risk.max_drawdown` the callee's `object` is itself a
`MemberExpression` (`strategy.risk`), so the `=== "Identifier"` guard failed,
`functionName` stayed `""`, and the `if (!functionName) return;` bailed before
ANY check ran - not just the `topLevelOnly` scope check but also argument
validation and CE10271. Every two-level builtin name was unvalidated:
`strategy.risk.*`, `strategy.opentrades.*`, `strategy.closedtrades.*`,
`chart.point.*` (42 functions total).

Fix: `memberChainName()` flattens the whole chain recursively (returns `""`
only if a link isn't a plain identifier property access, e.g. `foo().bar`).
Valid two-level calls now resolve a real signature, so the `!signature`
CE10271 branch does not misfire on them.

## The missing flag

Even with the name resolved, the scope check reads `flags.topLevelOnly` from
pine-data, and the `topLevelOnly` list in `generate.ts` had only the
plot/declaration set. Added all six `strategy.risk.*`. The Manual's
user-defined-functions "No global-only built-in function calls" section
(`language/user-defined-functions#no-global-only-built-in-function-calls`)
documents ONLY the plot/declaration set, NOT `strategy.risk.*` - so this is a
case of TV's linter being stricter than its own prose. `--tv` is the authority.

## TV probes (`pine-lint --tv`, 2026-06-10)

Each probe wraps one rule in an `if` body; all six return CE10188:

```pine
//@version=6
strategy("t")
if close > open
    strategy.risk.<FN>(...)
plot(close)
```

| FN | start:end | code |
|----|-----------|------|
| `strategy.risk.max_drawdown(90, strategy.percent_of_equity)` | 4:5..4:62 | CE10188 |
| `strategy.risk.allow_entry_in(strategy.direction.long)` | 4:5..4:57 | CE10188 |
| `strategy.risk.max_cons_loss_days(5)` | 4:5..4:39 | CE10188 |
| `strategy.risk.max_intraday_filled_orders(10)` | 4:5..4:48 | CE10188 |
| `strategy.risk.max_intraday_loss(5, strategy.percent_of_equity)` | 4:5..4:66 | CE10188 |
| `strategy.risk.max_position_size(100)` | 4:5..4:40 | CE10188 |

Message verbatim: `Cannot use "{functionName}" in local scope`.

UDF-body variant also rejected (function-wrapped conditional call), confirming
the restriction is "any local scope," not just `if`:

```pine
//@version=6
strategy("t")
f() =>
    if close > open
        strategy.risk.max_drawdown(90, strategy.percent_of_equity)
f()
plot(close)
=> CE10188
```

`--tv`-reached-TV sanity: TV *disagrees* with our pre-fix silence on every
probe (it flags, we did not), proving the calls reached TV - not an
empty/crashed result.

The non-risk two-level families (`strategy.opentrades.*`,
`strategy.closedtrades.*`, `chart.point.*`) are NOT top-level-only - they
return values and are read inside local scopes routinely; they stay
unflagged, and `strategy.opentrades.profit(0)` inside `plot(...)` confirms
local accepts them.

## Verification

- Regression fixture `regression/INV054-two-level-namespace-local-scope`.
- `compare-tv`: if-body and UDF-body cases caught matching TV; top-level
  call and `strategy.opentrades.profit` read both clean.
- Regression check: 0 changes across 1879 fixtures.

## Note on the error message

We keep our existing wording (`Function 'X' cannot be called from a local
scope...`) rather than TV's CE10188 string - same as the pre-existing plot/
hline check. Message wording differences are acceptable per the methodology;
the detection is what was wrong.
