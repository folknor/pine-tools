# INV047 - per-record triage of the string-lexer-abort mangle files

**Date:** 2026-06-07
**Status:** Triage RESOLVED; the dominant FP shape (declaration
evaporation) is FIXED - see the addendum at the bottom for the two root
causes, which are NOT what the initial triage guessed. The remaining
recovery shapes are tracked as TODO #46.
**Category:** TODO #44's question - what to do with the local-only records
on files where TV's only verdict is a string-lexing abort (`13a745…` 158
records vs TV's 1, `8439b236…` 170 vs 1). The proposal on the table was
blanket no-verdict bucketing; it was REJECTED in favor of grading each
record ourselves. TV's parse stage never ran on these files, but "TV
didn't grade this homework" doesn't make the homework ungradeable - and
the LSP user with a big broken script wants every problem we can honestly
name, not an abort at the first sign of trouble.

## Method

Cluster the local-only records per file (`compare-tv.mjs`,
`lint-batch.mjs --filter`), read the source behind every cluster, and for
each cluster decide: true positive (the flagged line is genuinely broken
and our claim matches a probed language rule), or recovery artifact (the
flagged line is CORRECT code and the message is shrapnel from an earlier
error). Probe TV directly where no existing INV covered the shape.

## Probes (`probes/`, `pine-lint --tv` 2026-06-07)

| probe | shape | TV verdict |
|---|---|---|
| p01 | call argument wrap, continuation at column 1, inside open `(` | clean - `{"success":true,"result":{"functions":[],"types":[],"enums":[]}}` |
| p02 | p01 with `color.badname` on the continuation line (control) | CE10272 `Undeclared identifier "color.badname"` at 4:7-19 - proves TV PARSED the joined call (the empty p01 result is real acceptance, not a refusal; the G002 trap) |
| p03 | same wrap with continuation indent 4 | clean |
| p04 | `label.new(bar index, high, ...` with column-1 arg continuation | CE10156 `Syntax error at input "index"` at 4:19 - one error, anchored at `index`; TV joins the wrap and keeps parsing |

**Language fact (p01-p03): continuation inside an open call paren is
INDENT-FREE.** The statement-level wrap-indent rule (INV017/INV042 -
indent must not be a multiple of 4) does NOT apply at paren/bracket
depth > 0; column-1 and indent-4 continuations are both accepted. Our
`skipWrapNewlines` join inside parens is therefore correct as-is; INV042's
depth-0 gate on the CE10156 emission is also confirmed from this side.

## Triage - `13a745…` (158 local records, TV: 1 string abort at 372:1)

| cluster | records | verdict |
|---|---|---|
| `Missing enclosing character in the literal string` | 18 | TP - TV confirms the class at the file's first one (372:1, its entire verdict); every flagged line genuinely holds an unterminated string |
| `Syntax error at input "end of line without line continuation"` | 10 | TP - trailing-operator wraps with column-1 continuation at depth 0; INV042 p04/p05 |
| `Unexpected identifier 'index' - did you mean 'bar_index'?` | 6 | TP - p04: TV CE10156 at the same anchor (ours adds the did-you-mean) |
| `Undefined variable 'filt'/'filtx1'/'filtx15'` | 26 | RECOVERY FP - `filt = rngfilt(close, smrng)` (line 1046) is a legitimate column-1 declaration; the body wrap error at 1043-1044 makes sync swallow it, so every later use reads undefined. #46(a) |
| `Could not find function 'lineTpSl'` (def line + 5 calls) | 6 | RECOVERY FP - the UDF definition at 340 is eaten after the PRECEDING function's body shreds (335-337). #46(a) |
| `Undefined variable 'box_type'/'box_array'` | 8 | RECOVERY FP - they are PARAMETERS of `SupplyDemandF` (773); after the `bar index` error at 776 the rest of the body spills out of the param scope (the spilled `var float box_top` declarations still resolve, which is the tell). #46(c) |
| `"textcolor"/"style"/"size" is already defined` (15), stray `.` `)` `:` `\n` tokens (~17) | ~32 | RECOVERY FP on broken lines - the lines are continuation fragments of genuinely-mangled calls, but the messages are shrapnel: after the in-call error our parser bails at the newline and re-parses continuation lines as comma declarations. TV joins the wrap (p01-p04) and anchors ONE error at the mangle. #46(b) |

## Triage - `8439b236…` (170 local records, TV: 1 string abort at 242:1)

Same fingerprint, no new shapes:

| cluster | records | verdict |
|---|---|---|
| unterminated strings | 16 | TP (TV confirms the class at 242:1) |
| `end of line without line continuation` wraps | 2 | TP (INV042) |
| `Undefined variable 'src'/'filt'/'metric'/'length'/'ReversalCloud'/ 'ReversalBands'/'signalLogic'/'KA_D1'/'KA_D2'/'dir'/'loww'` | ~60 | RECOVERY FP - definition/declaration swallow and body spill, same as above. #46(a)/(c) |
| `Unexpected token: =>` | 7 | RECOVERY FP - one switch arm wrap-breaks at column 1 (316-317); every LATER arm's `=>` becomes an orphan token. The arms themselves are fine. #46(d) |
| `Expected "]"` / `Expected ")"` / stray `=` `)` | ~13 | mixed shrapnel on genuinely-broken string-mangled lines; rendered moot by the same #46(b) recovery work |

(`6080cf…`, the v5 monster with the same abort shape, is not in the v6
inventory; it gets the same treatment for free since the fixes are
file-agnostic.)

## Conclusion

- **No bucketing change.** The TP clusters stay counted - they are us
  being more correct than TV's aborted lexer, which is the point of the
  project. The FP clusters are not measurement noise but concrete,
  reproducible parser-recovery bugs, queued as TODO #46 with this file
  as their repro source.
- The dominant lever was the declaration-evaporation shape (~66 records
  across the two files) - fixed same day, see the addendum.

## Addendum 2026-06-07 - declaration evaporation root-caused and fixed

The initial triage attributed the `filt`/`lineTpSl`/`src` clusters to
the INV012 sync over-skip (TODO #20). Bisecting the carrier file
(`scripts/slice-lines.mjs`, written for this) disproved that: the
trigger was the broken-string statement HUNDREDS of lines earlier, via
two separate pieces of poisoned state:

1. **Lexer bracket depth (lexer.ts `scanString`).** A string broken at
   EOL inside an open call leaves the openers' closers swallowed by the
   shifted string lexing that follows (`"],` lexes as ONE string token,
   so the `]` never pops). `bracketDepth` stayed > 0 forever, which
   suppressed NEWLINE emission for the REST of the file - every later
   statement was parsed out of a newline-less token soup. In the
   minimal repro, the body return `q` and the next line's
   `filt = f(close, 2.0)` merged into one bogus typed declaration
   (`q filt = ...`, `q` taken as a UDT annotation), trapping `filt`
   inside the function scope. Fix: the broken-string error path now
   resets `bracketDepth`/`openBrackets` - the statement is
   unsalvageable, treat the break as a hard statement boundary. (Side
   effect: the INV046 EOF opener report no longer double-fires at the
   broken string's position, so our CE10017 line pairs with TV's
   exactly instead of via different wording.)
2. **Parser parenDepth (parser.ts `synchronize`).** A statement that
   throws mid-group left `Parser.parenDepth` where the throw happened;
   sync never reset it. With parenDepth stuck > 0 the between-statements
   NEWLINE skip in `statement()` was disabled for the rest of the file,
   re-routing later `name = expr` declarations through the assignment
   path (`b = 0.0` became AssignmentStatement "=", i.e. assignment to an
   undeclared name). Fix: synchronize() zeroes parenDepth/bracketDepth -
   it lands at a top-level statement boundary, where depth is 0 by
   construction.

Fixture: `packages/core/test/fixtures/regression/INV047-broken-string-recovery.pine`.

Corpus effect (regression-check vs the pre-fix baseline): 53 files
changed, -3233 / +1197 records (baseline 20328 -> 18292). Disappeared:
the phantom undefined-variable cascades (1125 + 987), "Unexpected
token: \n" (749), and 35 per-file "Missing closing parenthesis" EOF
echoes. Appeared: 808 INV042-shape wrap errors the newline suppression
had been masking (honest per the probed rule), plus parse/type noise on
genuinely-broken mangled lines now actually parsed. Verified: all 5
files the check flagged for TV recheck diff tv-only 0; 9 files changed
via the parenDepth fix alone (no broken string) - the 3 with new
records all match TV at TV's stop position, the 6 disappear-only ones
lost FPs on TV-clean files. `scripts/check-changed-files-broken-string.mjs`
holds the carrier check.

Still open (TODO #46): the in-call post-error shredding ("already
defined" / stray-token shrapnel, ~30 records), the `box_type`/`src`
param-scope spill, and the switch-arm `=>` cascade.
