# INV009 — most "Cannot call …" FNs are column shifts, not missed bugs

**Status:** ⚠️ **RE-MEASURED 2026-06-02 — the 2026-05-28 "TV-accepts"
correction no longer holds; today's TV matches the ORIGINAL "these ARE real
FNs" reading.** Isolated, single-construct `pine-lint --tv` probes on
2026-06-02 show TV flags all three with CE10123:

| call                                   | `--tv` verdict (2026-06-02, isolated) |
|----------------------------------------|---------------------------------------|
| `nz(close > open)` — `nz(series<bool>)`| **CE10123** — `simple int` expected   |
| `int(true)` — `int(bool)`              | **CE10123** — `simple int` expected   |
| `plot(close, title=<series string>)`   | **CE10123** — `const string` expected |

So these are **real false negatives** we still miss (the
`FUNCTION_PARAM_TYPE_OVERRIDES` widening masked them — removed in INV015). The
`plot.title` const case is now structurally handled by INV014; the
`nz`/`int` base-type cases are tracked as a follow-up in `TODO.md`.

**Validation (2026-06-02, isolated `--tv`):**

```pine
//@version=6
indicator("x")
plot(nz(close > open))               // -> CE10123: series bool, simple int expected
y = int(true)                        // -> CE10123: literal bool, simple int expected
plot(close, title = syminfo.tickerid)// -> CE10123: simple string, const string expected
```

All three flag, stable across re-runs and in full-file context (the original
fixtures `440b10c3…`, `b4b219dd…`, `5291ac4…`).

Why this contradicts the 2026-05-28 "TV-accepts" correction: **a `--tv`
measurement error then, not a TV change.** A mature linter doesn't flip basic
rules in two days, so it's (a) the 2026-05-28 measurement was wrong or (b)
mine is. **(b) is ruled out:** `--tv` flags `nz(close > open)` while our local
validator does not (we skip union params), and `--tv` accepts the valid
`nz(close)` — so `--tv` is genuinely TV, not a local echo. That leaves (a),
with a concrete mechanism: on a network failure `pine-lint --tv` used to print
`{success:false, errors:[]}`, which the diff tooling reads as "no TV errors" =
"TV accepts" (a single transient failure on 2026-05-28 would do it). Now fixed
— a failed `--tv` probe emits no stdout and exits non-zero. See `gotchas/G002`.

---

**Status (2026-05-28 correction — contradicted by 2026-06-02 `--tv`, kept for
the record):** ⚠️ The original analysis below was unverified; this block
"corrected" it to say all three are TV-ACCEPTED, verified with `--tv` on
2026-05-28. That verdict was a measurement error (most likely a swallowed
`--tv` network failure read as empty errors — see the top block and
`gotchas/G002`), contradicted by the 2026-06-02 measurement above. Original
2026-05-28 table claimed:

| call                                   | claimed 2026-05-28 | 2026-06-02      |
|----------------------------------------|--------------------|-----------------|
| `nz(close > open)` — `nz(series<bool>)`| "TV accepts"       | CE10123 (flags) |
| `int(true)` — `int(bool)`              | "TV accepts"       | CE10123 (flags) |
| `plot(close, title=trend)` series str  | "TV accepts"       | CE10123 (flags) |

Consequences (as written 2026-05-28, now superseded):
- `nz`/`fixnan` accept all primitives (bool/string beyond the documented
  int/float/color); `int` accepts bool; `plot.title` accepts series
  string. The reference UNDER-documents these — see
  [G002](../../gotchas/G002-reference-underdocuments-accepted-types.md).
  Baked into pine-data via `FUNCTION_PARAM_TYPE_OVERRIDES` (generate.ts).
- **Task #8 is closed** (no real FNs). The polymorphic bypass in
  `validateFunctionArguments` was CORRECT (TV accepts these broad calls);
  the "tighten the bypass" plan (#17 Phase 2) is abandoned — it would
  only add false positives.
- **Lesson:** an INV that asserts FNs without `--tv` verification can
  manufacture phantom work. Verify every disagreement before recording it.

The original analysis (disowned by the 2026-05-28 correction, but whose "3 real
FNs" reading matches the 2026-06-02 measurement) follows for the record.

---

**Status (original):** Analysis only. No code change. Reframed task #8 and
created a follow-up tooling task.

## Summary

The TV-only "Cannot call '{funId}' with argument …" category — 16
hits across 8 files — looked like 16 real argument-type-mismatches
our linter misses. Classifying each one against our actual output
shows:

- **13 column shifts.** TV reports the error at the *bad operand*'s
  column; our linter reports the same error at the *operator*'s
  column (or the call-site's column). Same line, different column,
  same underlying finding. `find-real-failures.mjs` keys disagreements
  by `(line, col)` so these counted as TV-only.
- **3 true FNs.** All three are argument-type-mismatches we don't
  catch because the function is on the polymorphic-skip path in
  `validateFunctionArguments`, and our pine-data signatures list only
  one of several accepted types per parameter:

| file:line:col | call | type our linter accepts (silently) |
|---|---|---|
| `440b10c3…pine:9:14` | `boolVal = nz(close > open)` | `nz(series<bool>)` |
| `5291ac4…pine:29:19` | `plot(close, title=trend)` (trend is series<string>) | `plot(title=series<string>)` |
| `b4b219dd…pine:8:16` | `fromBool = int(true)` | `int(bool)` |

## Why this isn't a quick fix

The `validateFunctionArguments` code has:

```ts
if (functionIsPolymorphic) continue;            // for named args
if (functionHasOverloads || functionIsPolymorphic) continue; // for positional
```

The bypass exists because pine-data's signatures for polymorphic /
overloaded functions list only the first overload's types. Removing
the bypass without first widening the data would convert these 3 FNs
into many FPs on valid calls (`nz(close)`, `plot(close)`, etc.) — net
loss in correctness.

The proper fix lives upstream: regenerate pine-data so polymorphic
functions list all accepted parameter type unions (not just the first
overload), then tighten the bypass to "only skip when the union
includes the actual arg type or `unknown`". Tracked as a follow-up
under task #3 (pine-data) — the scraper needs to emit unions for
overloaded params, not pick one.

## Methodology notes captured

- A "missed FN" count from `find-real-failures.mjs` overstates real
  bugs whenever the two linters report the same finding at slightly
  different columns. Position-based matching is correct as a default
  (a column mismatch *could* be unrelated bugs), but anything
  surfacing as TV-only on these category templates deserves a quick
  per-line check before treating it as a missed bug.
- Two truly separate concerns landed under the original task #8
  framing: (a) the column-shift artifact (now resolved as
  not-a-bug), and (b) the polymorphic-bypass weakening real
  argument-type checks. Re-pointing #8 to the latter and capturing
  the data-side dependency.

## Aftermath

- Task #8 updated: from "24 missed FNs" to "3 true FNs gated by
  polymorphic bypass + incomplete pine-data; needs upstream data
  widening before code-side bypass can be tightened".
- Task #3 (pine-data scraper) gets an additional bullet: when a
  function has overloads, emit each parameter as the *union* of
  types it accepts across overloads, not just the first one's.
