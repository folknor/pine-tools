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

Vendored now: TradingView/ta v7-12 + RelativeValue v2-3, plus ~75 community
libraries the corpus imports (25 authors), fetched with the new `fetch:library`
step (`fetch-library.ts`) - a node port of piners' `pine_facade.rs`: resolve
`lib_list/?lib_id_prefix=...` to the `PUB;<hash>` id, `get/<id>/<major>` for the
source, normalize CRLF->LF, write `vendor/<Author>/<Lib>/<Major>.pine`. Only
`open_no_auth` (public open-source) libraries resolve. Validated by round-trip:
re-fetching TradingView/ta/12 reproduced the committed copy byte-for-byte.

84 libraries have export sets after two filters:
- **License**: only MPL-2.0 sources are vendored. Of the corpus's 93 author
  imports, 7 (all Trendoscope) are CC BY-NC-SA 4.0 (non-commercial + ShareAlike)
  and 3 (Steversteves, TradersReality x2) declare no license - all 10 excluded
  (left lenient), see README Acknowledgements.
- **Parse**: `generate-libraries.ts` SKIPS any library our parser cannot parse
  cleanly (an incomplete export set would cause false positives) - 5 quarantined
  (HeWhoMustNotBeNamed/arrays/1 & arrayutils/10,21; RicardoSantos/
  FunctionZigZagMultipleMethods/1; TFlab/FVGDetectorLibrary/1). These are real
  parser gaps on valid published libraries - candidate future investigations.

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
  (`ta.emax` 86:30), `f57565a9` (`ta.lowestx` 83:5), and `90decddb`
  (`ta.highestx` 65:14, via the now-vendored `HeWhoMustNotBeNamed/ta/1`).
- `regression-check.mjs`: 0 changes over 1879 fixtures, even with all 84
  community+official export sets active (extraction is correct everywhere the
  corpus uses real members). Full suite: 328 pass.

## Residual (still #41)

Imports we still can't validate, all left lenient: the 10 license-excluded
libraries (7 CC BY-NC-SA Trendoscope + 3 unlicensed), the 5 parse-quarantined
ones, any published library the corpus doesn't import (so isn't vendored), and
UDT method calls. The quarantined 5 are the most actionable - fixing those
parser gaps would both vendor them and likely fix real FNs on user scripts using
the same constructs. Wiring the language-service's `/// @source` local resolver
into the checker would also let local-file libraries validate.
