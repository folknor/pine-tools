# INV011 — bundled CLI couldn't load `function-behavior.json`

**Status:** Fixed. `function-behavior.json` is now imported as an ES
module so it's inlined by both TSC (via `resolveJsonModule`) and
esbuild (via the built-in JSON loader).

**Regression fixture:**
`packages/core/test/fixtures/regression/INV011-input-polymorphism.pine`

## Summary

`pine-lint` installed at `~/.local/bin/pine-lint` (the esbuild
bundle) was silently failing to load `function-behavior.json`. The
loader tried `fs.readFileSync(__dirname + "/function-behavior.json")`;
after bundling, `__dirname` resolved to `~/.local/bin/`, which has no
such file. The `try { … } catch { return empty }` block returned an
empty behavior map, so every polymorphic-function lookup got `behavior
?.polymorphic = undefined` and the data-driven resolution path was
skipped.

The visible symptom was `input(false, …)` returning `color` instead of
`bool`:

```pine
x = input(false, "test")
plot(x ? 1 : 0)
// → Ternary condition must be bool, got color
```

Variable type display: `x type: input int` (the legacy "first arg
type" fallback returned whatever it landed on, which mapped to int).
Across the corpus, 723 FPs disappear when this is fixed — almost
entirely `Ternary condition must be bool, got color`, `Operator 'and'
requires bool operands, but … operand is color`, etc., all rooted in
`input(<X>, …)` returning the wrong type.

Running the same code through the *un-bundled* compiled dist (via
`require("./dist/packages/core/src/analyzer/checker.js")`) produced
zero errors — the bug was bundle-only. Same source, different
deployment.

## Root cause

`pine-data/v6/function-behavior.ts:loadBehaviorData()` did a runtime
`fs.readFileSync(__dirname + "/function-behavior.json", "utf-8")`. The
TSC build output for `pine-data/v6/function-behavior.js` and the
sibling `function-behavior.json` end up in the same directory in
`dist/`, so this works for TSC. But esbuild bundles every `.ts` import
into a single `cli.js`; the `__dirname` reference at runtime points
to wherever that bundle lives. After `install:cli` copies the bundle
to `~/.local/bin/pine-lint`, the path becomes
`~/.local/bin/function-behavior.json` — a file that doesn't exist —
and the `try/catch` silently returns an empty behavior table.

## Fix

Replaced the runtime `fs.readFileSync` with a direct module-level
import:

```ts
import behaviorJson from "./function-behavior.json";

const _behaviorData = behaviorJson as BehaviorMetadata;

function loadBehaviorData(): BehaviorMetadata {
    return _behaviorData;
}
```

The TSC compilation already has `resolveJsonModule: true`, so the
import resolves at compile time. esbuild's default JSON loader inlines
the file at bundle time. Same source works in both modes.

Inline `// see INV011` reference at the change site.

## Verification

- Minimal repro: `x = input(false, …); plot(x ? 1 : 0)` — 1 error → 0
  errors. Variable type now reads `input const bool`.
- Corpus regression check: **723 TV-silent disappearances** (correct
  FP removals), 0 TV-also-flagged disappearances, 88 message-changes
  at same position (suggestion shifts), 139 new appearances —
  predominantly `Ternary branches must have compatible types. Got
  'color' and 'string'` from a related but distinct bug (see Adjacent
  finding below).
- 157/157 tests pass. New regression fixture
  `packages/core/test/fixtures/regression/INV011-input-polymorphism.pine`
  asserts that `input(<bool>)`, `input(<int>)`, `input(<float>)`,
  `input(<string>)` all type correctly.

## Adjacent finding (not fixed here)

`color.silver`, `color.red`, etc. — the built-in color constants —
infer as `undetermined type` rather than `const color`. That breaks
the polymorphic resolution for `input(color.silver, …)` (defval type
unknown, return type stays `undetermined type`) and is the source of
~117 of the 139 newly-visible appearances. Tracked as a follow-up.

## Methodology notes captured

- "Different result from TSC compile vs esbuild bundle" is a
  characteristic class of bug. When a behaviour change is local to
  the installed CLI but absent from a direct dist invocation, suspect
  bundling — `__dirname`, dynamic `require()`, runtime file reads,
  and side-effectful module evaluation are the usual culprits.
- A `try { … } catch { return empty }` over a file read silently
  converts a deployment bug into a correctness bug. Prefer explicit
  module imports for static data files whenever the file is part of
  the build artefact.
