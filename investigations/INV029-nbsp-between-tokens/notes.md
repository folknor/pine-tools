# INV029 - mid-line NBSP at bracket depth 0 is CE10005

**Status:** resolved 2026-06-04. The 6-file tv-only category
`no viable alternative at character " "` (the quoted character is
U+00A0) is fixed; all six corpus positions now match TV exactly.

## The rule (probed + decoded against corpus anchors)

U+00A0 (non-breaking space) in Pine source:

- **As leading indentation**: TV does NOT treat it as block
  indentation - an NBSP-indented line is wrap-joined into the previous
  logical line (probe b: CE10156 "Syntax error at input \"label\"" at
  the G005 joined-line position). Our lexer reads it as 1 column of
  block indent instead - deliberately lenient; treating it TV's way
  would re-open the plan/31 body-swallowing failure mode for the
  many published scripts that indent with NBSP. Divergence noted, kept.
- **Mid-line at bracket depth 0**: lexical error CE10005, anchored at
  the NBSP itself (probe a).
- **Mid-line inside ( ) / [ ]**: accepted as plain whitespace
  (probe c). This is what distinguishes TV's anchor from "first NBSP
  in the file" - the six corpus files are NBSP-obfuscated wholesale,
  and every NBSP before TV's anchor sits inside a parameter list or
  call argument list.

## Probes (`pine-lint --tv`, 2026-06-04, files in this directory)

- `probe-a-nbsp-midline.pine` - `x =<NBSP>close` (depth 0). TV:
  CE10005 at **3:4** (the NBSP's column), ctx.unexpectedToken `" "`
  with the NBSP inside the quotes:
  `{"code":"CE10005","ctx":{"unexpectedToken":"\" \""},"start":{"column":4,"line":3},...}`
- `probe-b-nbsp-indent.pine` - if-body indented with four NBSPs. TV:
  CE10156 `Syntax error at input "label"` at 3:17 - the line is
  wrap-joined, NOT read as block indentation.
- `probe-c-nbsp-in-parens.pine` - `plot(close,<NBSP>color = color.red)`.
  TV: **accepted**, zero errors.

Probes a and c disagree with our pre-fix validator (which accepted a
and, mid-fix, flagged c), confirming they reached TV.

## Fix (lexer.ts)

The whitespace case in `scanToken` now pushes the CE10005 message
verbatim for an NBSP that is (1) not at line start, (2) at
`bracketDepth === 0`, and (3) the first such NBSP in the file - the
once-per-file cap matches TV's observable output (TV stops at its
single CE10005) and keeps NBSP-obfuscated scripts (one corpus file
carries 41,749 NBSPs; an uncapped version produced 13,645 new corpus
records in 9 files) from drowning their own diagnostics. The NBSP is
then consumed as a plain space so the rest of the file still parses.

## Verification

- All six corpus tv-only positions match exactly: `0c053259…` 61:75,
  `476033c5…` 15:7, `77e42444…` 27:7, `8fd27c91…` 15:7, `b9a7b4c5…`
  92:37, `c8a040ee…` 29:7.
- Regression fixture:
  `packages/core/test/fixtures/regression/INV029-nbsp-between-tokens.pine`
  (real NBSP byte in the source, pins line+column+message).
- Corpus diff: exactly 9 appearances - the 6 inventory files plus 3
  more NBSP-obfuscated files (`93662e2b…`, `d78a494f…`, `d9054937…`).

## Side finding - TV refuses NBSP-mangled version annotations

The 3 extra files first showed up as "TV reports 0 errors", which
would have made our CE10005 on them look like FPs. Manual probes
(2026-06-04) revealed TV's translate_light actually REFUSES all three:

```json
{"success":false,"reason":"Supported versions are >= 5","result":null}
```

Their `// @version=6` annotations carry an NBSP between `//` and `@`
(raw bytes `2f 2f a0 40 76 ...`), which breaks TV's version detection
entirely. A refusal is NO verdict - but `find-real-failures`'
`pickDiagnostics` read the null result's empty error list as "TV
reports no errors" (the G002 swallowed-failure shape, one layer up
from the #29 fix). It now treats a null/undefined `result` without a
top-level errors array as unparseable; the three files are bucketed
as no-verdict instead of polluting localOnly. (`success:false` WITH a
result payload remains a valid errors-found verdict - that is our own
CLI's error shape.)
