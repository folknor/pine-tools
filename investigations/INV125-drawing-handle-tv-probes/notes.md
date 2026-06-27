# INV125 - drawing-handle annotation typing TV probes (Item 4 / TODO #9 INV063)

Date: 2026-06-27

## Source

TODO #9 (INV063 drawing-type / UDT annotation typing - the "Item 4" follow-on),
built on the landed #9 inference foundation (Loop 2 grounding, commit 2e34e94).
The originating orchestration plan (`reference/spec-loop-plan-followon.md` Item 4)
was deleted once landed; its durable record is TODO #9, INV063, and git history.
The Item 4 spec requires an orchestrator `--tv` probe
side-step (codex is network-isolated) to confirm, per handle, that TV rejects
an obviously-wrong assignment into the handle-typed variable BEFORE the code
brick - so that typing the annotation in `mapToPineType` matches TV and is not
an FP. INV063 only ever `--tv`-probed `line` (its p05); this round covers the
remaining handles.

## Method

One probe per handle (one-error-per-file, because TV stops at the first error -
G001 - so a combined multi-error file is not a clean parity gate). Each probe
assigns a `const int` literal into a handle-annotated variable:

```pine
//@version=6
indicator("probe <handle>")
<handle> v = 5
plot(close)
```

Verdicts via `pnpm run debug:compare`, 2026-06-27. `tv-only` = TV flags, we are
silent = the false negative Item 4 closes.

## Results - all seven handles: TV REJECTS, we are silent (tv-only FN)

| handle | TV verdict (CE10173 class, at 3:1) | local |
|---|---|---|
| `line` | `Cannot assign a value of the "const int" type to the "v" variable. The variable is declared with the "series line" type.` | 0 errors |
| `label` | same, expected `"series label"` | 0 errors |
| `box` | same, expected `"series box"` | 0 errors |
| `table` | same, expected `"series table"` | 0 errors |
| `linefill` | same, expected `"series linefill"` | 0 errors |
| `polyline` | same, expected `"series polyline"` | 0 errors |
| `chart.point` | same, expected **`"chart.point"`** (bare, no `series` prefix) | 0 errors |

All seven are genuine `tv-only` disagreements (we accept, TV rejects), which
also proves TV genuinely answered (it returned a specific typed error per file,
not an empty/fallback result). So all seven handles should be typed; none is
TV-accepted, so no methodology "investigate TV silence" branch is triggered.

## Load-bearing rendering nuance for the implementer

TV renders the EXPECTED type as `series <handle>` for the six render-set
handles (line/label/box/table/linefill/polyline) but as bare `chart.point`
(NO `series` prefix) for `chart.point`. Our `renderAssignDiagnosticType`
prefixes `series ` for every `DRAWING_TYPES` member, so `chart.point` must be
rendered WITHOUT the `series` prefix to byte-match TV (the Item 4 spec's
Brick 3.0 gate; chart.point should not simply join the series-prefixed
`DRAWING_TYPES` render path). The value side renders `const int` for the `5`
literal in all seven.

Incidental: each probe also shows a local-only `Variable 'v' is declared but
never used` warning - an unrelated unused-variable behavior on the throwaway
probe var, not part of the type check and not relevant to Item 4.

## Conclusion for Item 4

- Type all seven handle annotations in `mapToPineType` (the int-into-handle
  assignment then fires the existing lenient CE10173 declaration check).
- Render `chart.point`'s expected type as bare `chart.point`, the other six as
  `series <handle>`, to match TV.
- The 58 prior INV063 FPs (line-returning UDFs once mis-typed `series<float>`)
  do not recur: Loop 2 now grounds those UDF returns to `unknown` / their real
  base, so `lineN := new_level(...)` is value-`unknown` and the lenient check
  short-circuits (verified separately in the Item 4 canary fixture).
