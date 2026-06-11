# INV061 - arg-diagnostic wording/anchor alignment with TV's templates (TODO #53)

**Status: implemented 2026-06-11.** The three argument-diagnostic categories
queued in TODO #53 now emit TV's exact templates (code + ctx, rendered by the
CLI's fillTemplate) at TV's exact anchors:

1. **Arg-type mismatch (named AND positional) -> CE10123**, anchored at the
   argument VALUE. Replaces `Type mismatch for parameter '...'` /
   `Type mismatch for argument N` (both anchored at the call).
2. **Unknown named parameter -> CE10120**
   (`The "f" function does not have an argument with the name "x"`), anchored
   at the argument NAME. Replaces `Invalid parameter '...'. Valid parameters:
   ...` at the call - 5738 corpus records, the largest single rewording.
3. **Too many arguments -> CE10115**
   (`Too many arguments passed into the "f()" function call. Passed N
   arguments but expected M.`), anchored at the first argument. Replaces
   `Too many arguments for '...'` at the callee - 33 corpus records.

## Probes (2026-06-11, `pine-lint --tv`, scripts in `probes/`)

All probes returned `success:true` with a non-empty error list (TV answered;
not an empty-response fallback).

| probe | script (line 3 unless noted) | TV verdict |
|---|---|---|
| p01 | `plot(ta.sma(close, 14, 99))` | CE10115 at 3:13-25 (the argument list, starting at the FIRST arg). ctx: `funName="ta.sma"`, `passedArgsCount=3`, `expectMsg=" but expected "`, `expectArgsCount=2`. |
| p02 | `plot(close, 42)` | CE10123 at 3:13-14 (the VALUE). Positional args use the same template as named - TV resolves the param name: `argDisplayName="title"`, repr `42`, `argumentType="literal int"`, `currentTypeDocStr="const string"`. |
| p03 | `plot(close, color = close)` | CE10123 at 3:21-25. repr `close`, type `series float`. |
| p04 | `plot(close, color = close + 1)` | CE10123 at 3:21-29. repr `call "operator +" (series float)`. |
| p05 | `plot(close, color = "red")` | CE10123 at 3:21-25. repr `red` - the string CONTENT, unquoted. (Re-run of INV059 p01.) |
| p06 | `plotshape(close > open, shape = shape.triangleup)` | CE10120 at 3:25-29 (the argument NAME). ctx: `name="shape"`, `signature="plotshape"`. (Re-run of INV059 p05.) |
| p07 | `plot(close, title = color.red)` | CE10123 at 3:21-29. repr `color.red`, type `const color` - members render as source text with the catalog qualifier. |
| p08 | `plot(close, color = ta.sma(close, 14))` | CE10123 at 3:21-37. repr `call "ta.sma" (series float)`. |
| p09 | `s = "abc"` + `plot(close, color = s)` (line 4) | CE10123 at 4:21. repr `s`, type `const string` - TV tracks const-ness through user declarations. |

Template facts the probes settled:

- The CE10123 template has an empty `{typePostfix}` slot in every probe,
  which is why TV's rendered message carries a DOUBLE SPACE before
  "is expected". We replicate it exactly.
- `currentTypeDocStr` is the catalog's qualified display form
  ("series color", "const string") - exactly what `functions.json` param
  `type` strings hold, so the checker passes them through (`rawType` on
  `ParameterInfo`).
- Value reprs: literals bare (`red`, `42`); identifiers/member chains as
  source text; operator and call expressions as
  `call "operator +" (series float)` / `call "ta.sma" (series float)`.

## Implementation

- `ast.ts` / `expressions.ts`: `CallArgument` records `nameLine`/`nameColumn`
  (the argument-name token) - the CE10120 anchor the AST previously lacked.
- `builtins.ts`: `ParameterInfo.rawType` (catalog display type passthrough)
  and `getBuiltinQualifiedType` (qualified display type of a built-in
  variable/constant, for the `argumentType` slot).
- `checker.ts`: shared `CE10123_TEMPLATE` constant (the two pre-existing
  template sites - str.tostring(map), checkConstArgs - now reference it);
  `describeArgForTemplate` renders any argument expression to TV's
  repr/type pair (best-effort where our collapsed qualifier lattice can't
  recover TV's qualifier: bare user-variable types render as "const X" per
  p09, fallbacks as "series X"); the four emit sites reworked as above.
- `addTemplateError`: structured errors previously went through bare
  `this.errors.push(...)`, INVISIBLE to `audit-error-reachability` (it
  enumerates/instruments named methods). All six template sites now route
  through this named method and the audit enumerates it. **Its first run
  with the widened lens found one dead-in-appearance site**: the
  str.tostring(map) CE10123 (commit cf9d29a, 2026-05-27, pre-methodology) had
  zero fixture coverage; verified live and pinned with
  `regression/str-tostring-map.pine`.
- Rendering sweep: with CE10120 now templated and high-frequency, every
  human-facing consumer must substitute ctx or it leaks `{placeholders}`.
  Added `renderMessage` to `core/common/errors.ts` as the canonical
  renderer; the CLI's fillTemplate delegates to it, `test/helpers.ts` and
  the language-service diagnostics use it, `dev-tools/test-snippet.js`
  renders inline. `snapshot-local-lint.mjs` / `regression-check.mjs` now
  also render (previously raw templates - two different findings at one
  position would have collapsed into one baseline record); the baseline was
  re-snapshotted, record count unchanged (15236).

## Lateral finding: editor diagnostics dropped ALL semantic errors

`language-service/features/diagnostics.ts` filtered validator results with
`error.severity === 1` intending "errors only" - but the validator emits
CORE severities (Error = 0, Warning = 1), while the file's own enum uses the
LSP convention (Error = 1). Net effect in the editor (LSP + VS Code + MCP all
route through `getDiagnostics`): every semantic ERROR was dropped and
validator WARNINGS surfaced as errors. Fixed to `=== 0` alongside the
renderMessage change (both lines touched the same loop).

## Results

- All 9 probes reproduced byte-for-byte locally (message AND anchor).
- Corpus: the regression diff is exactly the intended swap - 5771 records
  (5738 CE10120 + 33 CE10115) changed wording/anchor, zero other changes.
  Baseline stays at 15236 records.
- TV re-baseline after the change (find-real-failures, 2026-06-11):
  **46 local-only / 3 tv-only / 32 same-pos-different-message** - identical
  to the 2026-06-10 measurement. The rewording introduced zero new
  disagreements (the reworded records all sit past TV's stop point or on
  non-v6 files, so the confirmable window was never exposed to the old
  wording).
- Fixtures: `INV061-arg-diagnostic-templates.pine` (CE10115 + four CE10123
  repr shapes), `str-tostring-map.pine` (the audit catch), INV013/INV059
  fixtures updated to the new wording. 312 tests green.
- Audit: 0 dead sites; corpus-but-never-in-tests down 5 -> 3.

## Residual

- TV renders `argUserFriendlyRepresentation` for shapes we haven't probed
  (ternaries, array literals, index expressions); `describeArgForTemplate`
  falls back to the rendered type there. Probe-and-extend if a corpus
  disagreement ever lands on one.
- Our collapsed qualifier lattice (const/input/simple -> bare) means the
  `argumentType` qualifier is a best guess for user variables ("const X",
  p09-backed) and unresolvable calls ("series X"). Exact parity needs
  qualifier tracking through declarations - out of scope here.
