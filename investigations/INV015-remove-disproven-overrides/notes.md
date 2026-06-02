# INV015 - remove the superseded `FUNCTION_PARAM_TYPE_OVERRIDES` (G002 fallout)

<!-- dir slug says "disproven"; "superseded" is the accurate word - the
2026-05-28 "TV accepts" verdict was a --tv measurement error (see G002),
contradicted by 2026-06-02 --tv. -->


**Status:** Done (overrides removed; `plot.title` const-enforcement now fires).
Spawned a follow-up: union-typed argument validation (see below + TODO).

**Regression fixture:**
`packages/core/test/fixtures/regression/INV015-plot-title-const.pine`

## Background

INV014's isolated `pine-lint --tv` probes (2026-06-02) flag every "TV accepts"
case `gotchas/G002` recorded (verified `--tv` 2026-05-28) - they now return
CE10123. The five `FUNCTION_PARAM_TYPE_OVERRIDES` entries in
`packages/pipeline/src/generate.ts` existed *only* on G002's authority, so as of
2026-06-02 they contradict TV and are a source of real false negatives. (Why the
two dated `--tv` measurements differ: the 2026-05-28 one was a measurement error
 - most likely a swallowed `--tv` network failure read as empty errors; see G002.)

## Change

Emptied `FUNCTION_PARAM_TYPE_OVERRIDES` (was 5 entries) and regenerated pine-data
offline (`pnpm run generate` - no scrape). The five params reverted to their
scraped reference types:

| param | was (override) | now (reference) |
|---|---|---|
| `nz.source` | `series int/float/bool/string/color` | `series int/float/color` |
| `nz.replacement` | `series int/float/bool/string/color` | `series int/float/color` |
| `fixnan.source` | `series int/float/bool/string/color` | `series int/float/color` |
| `int.x` | `series int/float/bool` | `series int/float` |
| `plot.title` | `series string` | `const string` |

These match TV (verified, isolated `--tv`): TV rejects `nz(<bool>/<string>)`,
`int(true)`, and `plot(title=<non-const>)`.

## Result - partial, and why

- **`plot.title`: fixed.** `const string` is a clean scalar type, so INV014's
  const-arg check now fires on a non-const title, byte-identical to TV's CE10123.
  Locked by the fixture.
- **`nz`/`fixnan`/`int`: still NOT caught - and removing the override is
  necessary but not sufficient.** Their reference types are *unions*
  (`series int/float/color`, `series int/float`). The checker's argument-type
  pass deliberately **skips union-typed params**: `mapToPineType` collapses a
  union to `"unknown"`, and `validateFunctionArguments` only checks params whose
  type `!== "unknown"` (the INV013/#17 safety net that avoided false positives
  when overload unions landed). So `nz(<bool>)` / `int(true)` map their param to
  `"unknown"` and are passed over.

So catching the `nz`/`fixnan`/`int` base-type FNs needs a distinct capability:
**validate a non-const-qualified union param against its member set** (arg base
∈ {int,float,color} for `nz`, with numeric coercion), instead of skipping it.
`types.ts` already has `isUnionTypeMatch` - the gap is that the checker never
reaches it for these params because the mapped type is `"unknown"`. That is its
own change with corpus-wide FP risk (many functions take union params), so it
gets its own investigation + regression pass. Tracked in `TODO.md`.

## Verification

- `plot(close, title = syminfo.tickerid)` → CE10123 (`const string` expected),
  matching TV. Fixture locks it.
- Corpus regression: **0 changed fixtures** - removing the widenings changed no
  existing lint output (the corpus contains no `nz(bool)`/`int(true)`/non-const
  `plot(title)` calls), so the data correction is safe. The value is correctness
  for user code that does hit these, confirmed by the isolated `--tv` probes.
- `pnpm test`: 207 pass (the new fixture rides the existing INV014 count; the
  plot.title fixture is additive - see test output at commit time).
- Only the five intended param types changed in `functions.{json,ts}`; the
  generation-timestamp churn in the other catalog files was reverted to keep the
  diff to the real change.

## See also

- `investigations/INV014-const-arg-enforcement/notes.md` - the const-arg check
  and the G002 disproof that motivated this.
- `gotchas/G002` - retracted.
