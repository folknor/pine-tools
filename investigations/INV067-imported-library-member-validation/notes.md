# INV067 - imported-library member calls validated against vendored exports (CE10271 FN)

**Date:** 2026-06-19
**Status:** fixed (data-backed import slice of #41)
**Code:** `packages/pipeline/src/generate-libraries.ts` (new generator),
`pine-data/v6/libraries.{ts,json}` (generated), `pine-data/v6/index.ts`
(re-export), `packages/core/src/analyzer/checker.ts` (validateCallExpression
MemberExpression block + import pre-scan), `vendor/TradingView/**` (sources).

## Symptom (false negative)

INV053 skipped the member-call check whenever the namespace name was an
imported library (`importedNamespaces`), because we had no way to know a
library's export set. So a typo'd library member passed silently:

```pine
//@version=6
import TradingView/ta/9 as ta
x = ta.emax(close, 10)   // we were silent; TV: CE10271
```

This was the #41 "import-shadow residual" - the dominant remaining
typo-member survivor class from the #48 mutation runs.

## What changed the calculus

The official TradingView libraries are vendored as Pine SOURCE under
`vendor/TradingView/<lib>/<version>.pine` (synced from the piners project).
A library's public surface is exactly its `export`-keyword functions/methods,
which our own parser reads cleanly (0 parse errors on all 8 vendored files;
private helpers like ta's `ewma` correctly excluded). So the export set is
derivable offline - it is data we generate, not data we lack.

## Pipeline

`pnpm run generate:libraries` (`generate-libraries.ts`) walks `vendor/
<Author>/<Lib>/<Version>.pine`, parses each with the COMPILED core parser
(via createRequire on dist - the parser source uses extensionless imports
that don't run under raw --experimental-strip-types), collects the
`export` function/method names, and writes `pine-data/v6/libraries.{ts,json}`
keyed by `"Author/Lib/Version"`. Re-run after vendoring/updating a library;
run `pnpm run build` first (it needs the compiled parser). A parse error on a
vendored file is logged loudly because it would yield an INCOMPLETE export set
-> false positives.

Vendored now: TradingView/ta v7-12 (45-57 exports each), TradingView/
RelativeValue v2-3.

## TV's model (probes, `pine-lint --tv`, 2026-06-19)

| probe | call (with `import TradingView/ta/9 as ta`) | TV |
|---|---|---|
| p01 | `ta.emax(close, 10)` (not an export) | CE10271 "function or function reference" @ call start |
| p02 | `ta.dema(close, 10)` (real export) | clean |
| p03 | `ta.sma(close, 10)` (builtin ta fn) | clean - builtin + library COEXIST under the `ta` name |
| p04 | `import TradingView/ta/7` + `ta.requestVolumeDelta(...)` | CE10271 - the export was ADDED in v9; v7 lacks it |

p03 is why the check lives in the `!signature` branch only: a valid builtin
`ta.sma` resolves via the signature lookup and never reaches here, so we never
second-guess builtins. p04 shows version matters - we key by exact
`Author/Lib/Version`, so the right per-version export set is used.

All probes reached TV (it disagreed with our pre-fix silence on p01/p04), so
the silence was a real FN.

## Fix (checker)

Import pre-scan records `namespace -> "Author/Lib/Version"` for every import
whose path we vendor (`importedLibraryPaths`). In the member-call `!signature`
MemberExpression branch, after the builtin-namespace check, a new branch: if
the root is a vendored imported library and the callee is single-dot
(`lib.member`, library exports are flat) and `member` is not in the export set
(nor a builtin const/var via `NAMESPACE_PROPERTIES`, nor a generic
constructor base), emit CE10271 "function or function reference" at the call
start - matching TV's position and wording. NOT gated on user-shadow: for an
imported library the binding IS the shadow symbol. Libraries we don't vendor
have no entry, so they stay lenient (the remaining #41 residual: author
libraries like `HeWhoMustNotBeNamed/ta`, `jason5480/*`).

## Verification

- 4 probe files under `probes/`.
- 2 regression fixtures: `regression/INV067-imported-library-unknown-export`
  (ta.emax flagged), `regression/INV067-imported-library-no-false-positive`
  (ta.dema export + ta.sma builtin, local == TV clean).
- Fixed `regression/INV053-member-call-no-false-positive`: it imported ta/7
  and called `ta.requestVolumeDelta` - an export that did NOT exist until v9,
  so the old fixture asserted no-errors on a call TV actually rejects
  (CE10271, p04). The pre-INV067 blanket import-skip masked it - an
  INV001-class catch. Bumped to a real export (`ta.dema`).
- Corpus survivors now caught, position + message EXACT vs TV: `40d4dc00`
  (`ta.emax` 86:30), `f57565a9` (`ta.lowestx` 83:5).
- `regression-check.mjs`: 0 changes over 1879 fixtures. Full suite: 328 pass.

## Residual (still #41)

Author/community libraries the corpus imports are not vendored
(`HeWhoMustNotBeNamed/ta/1`, `jason5480/*`, `loxx/*`), so their members stay
unvalidated. Vendoring more sources (or wiring the language-service's
`/// @source` local resolver into the checker) extends the same mechanism.
