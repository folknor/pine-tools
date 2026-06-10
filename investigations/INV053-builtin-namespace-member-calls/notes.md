# INV053 - undefined member calls on builtin namespaces (CE10271)

**Date:** 2026-06-10
**Status:** fixed
**Code:** `packages/core/src/analyzer/checker.ts` (validateCallExpression
`!signature` block + import pre-scan), `packages/core/src/analyzer/builtins.ts`
(`GENERIC_FUNCTION_BASES`)

## Symptom (false negative)

INV036 implemented TV's CE10271 "Could not find function or function
reference 'X'" for Identifier callees only. MemberExpression callees were
left unvalidated (the #41 residual). So undefined members of a built-in
namespace passed silently:

```pine
//@version=6
indicator("x")
z = ta.bogus(close, 5)     // TV: 3:5 Could not find function or function reference 'ta.bogus'
w = math.notreal(1.0)      // TV: 4:5 Could not find function or function reference 'math.notreal'
```

`compare-tv` (2026-06-10): TV flags both, local silent.

## Scope - the data-backed subset of #41

#41 is broad (lib.fn / UDT methods / alias members all unvalidated). The
tractable, FP-safe slice is **undefined members of a known built-in
namespace**, because we ship the full member catalog for those. Import-alias
members and UDT methods stay out of scope (we cannot resolve their member
sets).

The check fires only when ALL hold:
- callee is `ns.member(...)` with `ns` an Identifier,
- `ns` is in `KNOWN_NAMESPACES` (derived from pine-data),
- `ns` is NOT user-shadowed (`symbolTable.lookup(ns)` has `line !== 0`),
- `ns` is NOT an imported namespace (see below),
- `ns.member` is not a builtin function (signature lookup) nor a builtin
  const/variable (`NAMESPACE_PROPERTIES`) nor a generic constructor base
  (`GENERIC_FUNCTION_BASES`).

## Edge probes (`pine-lint --tv`, 2026-06-10)

`probe-member-edges.pine`:

```pine
a = ta.tr(true)     // TV SILENT - a builtin VARIABLE called as a function is accepted
b = color.red(1)    // TV: 4:5 Could not find function or function reference 'color.red'
```

So TV distinguishes calling a built-in *variable* (`ta.tr`, accepted) from a
*constant* (`color.red`, rejected). That split is murky, so we
**conservatively skip every known member** (both are in `NAMESPACE_PROPERTIES`):
we catch only the entirely-unknown member. `color.red(...)` is therefore a
deliberately-missed FN, never a false positive. `ta.tr(...)` matches TV
silence.

`probe-shadow-noflag.pine` (UDT constructor `point.new`, UDT method
`p.dist()`, valid `math.max`): all clean, local == TV.

`--tv`-reached-TV sanity: in `probe-undefined-member` TV *disagrees* with our
pre-fix silence (it flags ta.bogus / math.notreal), proving the calls reached
TV and the silence was a real FN, not an empty/crashed `--tv` result.

## The two false-positive sources found in the corpus run

First corpus regression after the naive check: **457 new "errors" across 107
files** - all false positives:

1. **Generic constructors (447).** `array.new<float>()`, `matrix.new<...>()`,
   `map.new<...>()` - the callee is `array.new` but the catalog key carries
   the template (`array.new<type>`, `map.new<type,type>`), so
   `functionSignatures.get("array.new")` misses. Fixed with
   `GENERIC_FUNCTION_BASES` (every catalog name's prefix before `<`).
2. **Unaliased library imports whose name is a builtin namespace (~10).**
   `import TradingView/ta/7` (no `as`) binds the namespace `ta` to the
   library, so `ta.dema(...)` / `ta.requestVolumeDelta(...)` / `ta.ma(...)`
   are LIBRARY calls, not builtins. The checker only registered *aliased*
   imports as symbols, so the shadow gate missed these. Fixed by pre-scanning
   `ast.body` for every ImportStatement and recording its namespace
   (`alias ?? libraryPath.split("/")[1]`) in `importedNamespaces`, which the
   check now excludes. (There were NO genuine catalog gaps - every flagged
   `ta.*` traced to an unaliased ta-library import.)

After both gates: corpus regression is **0 changes** - no FPs, and no
undefined-member FNs exist in the valid-code corpus to catch. The check earns
its keep on invalid/edited code (the #48 mutation-testing blind spot), not on
the published corpus.

## Verification

- 3 probe files + 2 regression fixtures
  (`regression/INV053-undefined-builtin-member`,
  `regression/INV053-member-call-no-false-positive`).
- `compare-tv`/`lint-batch --diff`: ta.bogus / math.notreal caught matching
  TV; UDT / generic / import / ta.tr all clean; only the intentional
  color.red conservative-skip remains.
- Regression check: 0 changes. Full suite: 292 pass.

## Residual (still #41)

Member calls on import *aliases* (`myLib.foo()`) and UDT method calls are
still unvalidated - resolving those needs the imported library's export set
and UDT method namespaces, which we do not have. This INV closed only the
builtin-namespace slice.
