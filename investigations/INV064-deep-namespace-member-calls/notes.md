# INV064 - undefined members of MULTI-LEVEL builtin namespaces were unvalidated

**Status: fixed 2026-06-11.** A CE10271 false negative: calling an unknown
member of a deep builtin namespace path (`chart.point.newx`,
`strategy.risk.bogusxyz`) was accepted by us but rejected by TV. INV053
caught the single-level shape (`ta.bogus`); the deep shape slipped a too-narrow
guard. Surfaced by the #48 mutation harness.

## How it surfaced

The `typo-member` operator (mutate.mjs) typo'd `chart.point.new` ->
`chart.point.newx` in a both-clean corpus fixture (`b2fea9d351d7...`, seed 6).
The mutation-run classified it a SURVIVOR (TV rejects, we accept) - the exact
FN signal #48 hunts for. Two harness bugs had to be fixed first before this
seed even reached the site cleanly (see "Harness fixes" below).

## Root cause

`validateCallExpression`'s `!signature` branch handled MemberExpression
callees only when `call.callee.object.type === "Identifier"` - i.e. exactly
one namespace segment (`ns.member`). For `chart.point.newx` the callee object
is itself a MemberExpression (`chart.point`), so the branch was skipped and no
CE10271 fired. The same blind spot the valid-code corpus can never reveal:
published scripts don't contain typo'd members.

## Fix

Generalized the branch to any depth. `functionName` is already the flattened
dotted callee (`memberChainName`, "" when any link is not a plain property
access), so the new guard keys off it:

- root identifier (`chart`) not user-shadowed and not an import alias
  (same guard as INV053, now anchored on the leftmost segment);
- the member's namespace PATH (everything up to the last dot, `chart.point`)
  is a real catalog namespace - new `KNOWN_NAMESPACE_PREFIXES` set in
  builtins.ts, every proper dotted prefix of every catalog name, so
  `chart.point` / `strategy.risk` are recognised, not just `chart` /
  `strategy`;
- the full name is not a known function (the signature lookup already failed),
  not a NAMESPACE_PROPERTIES const/variable, not a GENERIC_FUNCTION_BASES key.

A valid deep call (`chart.point.new`) resolves a signature and never reaches
this branch; an unknown deep member on a real namespace path flags; anything
whose path is not a catalog namespace (UDT constructors `Foo.new()`, user
chains `Foo.bar.baz()`, import-alias members) is conservatively left alone -
we never want a false positive on a member we cannot resolve.

## Probes (2026-06-11, `pine-lint --tv`, scripts in `probes/`)

- **p01** `chart.point.newx(time, bar_index, close)` (the mutation site,
  minimal) -> `success:true`, CE10271 `Could not find function or function
  reference 'chart.point.newx'`, anchored 3:5-20. We were silent before.
- **p02** `strategy.risk.bogusxyz(50)` -> `success:true`, CE10271
  `... 'strategy.risk.bogusxyz'`, anchored 3:1-22. We were silent before.

Both `success:true` with a non-empty error list - TV genuinely reached the
check (not an empty/fallback response, per the methodology's confirm-TV-answered
rule). The local validator now matches both.

## Corpus effect

`regression-check.mjs`: 0 fixtures changed, 0 new error appearances. The
widening is purely additive on a pattern absent from the valid corpus - the
whole reason it needed a mutation to surface. 324 unit tests green (the two
INV064 fixtures: the positive pins both probes, the no-FP pins
`chart.point.new` + `strategy.risk.max_drawdown` clean).

## Harness fixes that unblocked this (TODO #48, mutate.mjs)

Two silent under-testing bugs in the mutator had to be fixed first; both made
real breakages look like harmless "accepts" and discarded the site:

1. **`delete-decl` matched `:=` reassignments.** `=` and `:=` both lex as
   `ASSIGN` (distinguished only by `.value`); the declaration gate checked the
   type only, so `x := 10` reassignments were "deleted" - harmless (the
   variable stays declared), TV accepts. Gate now requires `.value === "="`,
   matching the operator's own documented intent.

2. **Offset reconstruction broke on `\r`-ending files.** The lexer is
   G005-aware (a lone `\r` and a `\n` are separate breaks, so a `\r\r\n`
   corpus file doubles its line numbers), but `mutate.mjs` reconstructed char
   offsets with `\n`-only counting (`lineStarts`, `split("\n")`). On such a
   file the doubled `token.line` indexed past the end of `starts` and the
   splice landed at NaN/the wrong place - a no-op mutant TV then "accepts".
   Every `\r`-ending corpus fixture was silently under-tested in seeds 1-2.
   Fixed by normalizing line endings to `\n` in `makeCtx`; both local and TV
   receive the same normalized mutant, so the comparison stays valid.

## Scope / residual

This closes the deep-builtin-namespace slice of #41. Still open in #41:
members of import *aliases* (`myLib.fn()`) and UDT method calls - both need
data we do not have (the imported library's export set; UDT method
namespaces). The conservative skips here preserve those as no-ops.
