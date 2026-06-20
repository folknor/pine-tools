# INV066 - undefined method-call RECEIVER is unvalidated (CE10272/CE10271 FN)

**Date:** 2026-06-19
**Status:** OPEN (finding confirmed + TV-probed; FP-safe fix deferred - see
"Why deferred")
**Area:** `packages/core/src/analyzer/checker.ts` (validateCallExpression
MemberExpression callee). Sibling of INV062 (call ARGUMENTS) and INV053/64
(namespace MEMBER names).

## Symptom (false negative)

A method call whose receiver is an undefined variable is accepted silently:

```pine
//@version=6
indicator("x")
x = undefinedArr.push(1.0)   // we are silent
```

INV062 closed the call-ARGUMENT gap and INV053/64 the namespace-MEMBER gap,
but the callee's RECEIVER (the `.object` of the MemberExpression callee) is
still never undefined-checked. The plain-use form IS caught
(`undefinedArr + 1` -> "Undefined variable"), so only the method-receiver
position leaks.

## How it surfaced

#48 run-4 full-pool dry-run. The 16 `delete-decl` `local-accepts` mutants
(delete a top-level declaration whose name is used later) were TV-verified:
**14 survivors, 1 tv-accepts, 1 TV crash** (`TypeError: e.equals is not a
function` - a no-verdict, discarded). Re-run 2026-06-20 after the
#41/#53/#45 follow-ups again found only 16 `local-accepts`, all
`delete-decl`; TV triage produced **15 survivors and 1 tv-accepts**, still
this same undefined method-receiver class (the former crash case now returns
TV's internal `TypeError: e.equals is not a function` as an error payload).
Every survivor deletes a declaration later used as a method receiver, so TV
reports CE10271 on the orphaned call:

| mutant | deleted decl | later use | TV |
|---|---|---|---|
| `61a3a7b…L53/54` | `array_vol_upper/lower = array.new<float>()` | `.push` | CE10271 method ref |
| `26b0518…L50/52` | `lt_v/lt_o = request.security_lower_tf(…)` | `.size`/`.get` | CE10271 |
| `c581b8e…L190/191` | `PH/PL = ta.pivothigh/low(…)` | `.draw_trendLine` (UDT method) | CE10271 |
| `f9e633…L123/124`, `f2bd7f…`, `4051ea…` | `…MSG = '{json}'` (string) | `.parseing` | CE10271 |
| `d41ead…L31`, `bd5b27…L58` | `distances/HL = array.new_float()` | `.push` | CE10271 |
| `dbc4c1…L124` | `a_allBoxes = box.all` | `.size` | CE10271 |

## TV's model (probes, `pine-lint --tv`, 2026-06-19)

`probes/p01-undefined-receiver.pine` (`x = undefinedArr.push(1.0)`): TV emits
TWO errors -
- `3:17 CE10271 Could not find method or method reference 'undefinedArr.push'`
- `3:5 CE10272 Undeclared identifier "undefinedArr"`

`probes/p02-defined-receiver-ok.pine` (`definedArr = array.new<float>(0)` /
`definedArr.push(1.0)`): clean both sides. TV reached TV (it disagreed with
our pre-fix silence on p01), so the silence was a real FN.

## Attempted fix and why it was reverted

The natural fix - walk the callee chain to its root Identifier and route it
through `validateIdentifier` (namespace-safe: `array`/`ta`/`chart` are seeded
built-ins, so `array.new(...)` stays clean) - is correct in isolation
(p01 flags "Undefined variable 'undefinedArr'" at 3:5, matching TV's CE10272
position; p02 clean) but produced **247 new errors across 16 corpus files**,
all false positives. It exposed latent RECEIVER-resolution gaps the previous
no-check behavior hid:

- **v6 scope gaps (the majority, ~137 records, mostly one file
  `4d78be7e3f`):** a function PARAMETER used as a method receiver inside a
  nested `switch`/`if` body did not resolve (`overlap(array<ob> bull, …) =>
  … bull.remove(v)` -> "Undefined variable 'bull'"). Root-caused: in that
  file the switch-arm BODIES are dedented to column 1 (the arms sit at 16
  spaces, the `bull.remove(v)` results at 0). The file is LF-only (not a
  G005 `\r` artifact) and our parser accepts it without error - but it
  attributes those column-1 lines to TOP-LEVEL scope, not the `overlap`
  function, so the `bull` PARAMETER is genuinely out of scope per our parse
  tree. TV scopes them inside the function. This is a scope-attribution /
  parser-state issue (#20 territory: which enclosing context a dedented
  continuation belongs to), surfaced only because the receiver check is the
  first thing to read scope at that point. So the "receiver resolution" need
  is really "correct nested-scope attribution," a parser concern.
- **import namespaces/aliases (~part of the v5 + no-version files):**
  `loxxexpandedsourcetypes.fn()`, `lib.fn()`, `setting.fn()` - roots that
  live in `importedNamespaces`, not the symbol table, so `validateIdentifier`
  flags them.
- **v4/v5 + no-version files (~110 records, 13 files):** legacy leniency
  (the check was not version-gated like INV053/64's `version === "6"`).

v6-gating alone would not save it - over half the FPs are on v6 files.

## Why deferred

The receiver check is only as good as receiver resolution, and resolution is
incomplete for: function parameters inside nested scopes, import
namespaces/aliases (the #41 export-set problem), and legacy versions. Same
blocker as TODO #9 (robust UDF/scope inference) and #41 (import/UDT member
resolution). Shipping the check now trades one FN class for a larger FP class.

2026-06-20 re-attempted two narrower gates and reverted both before commit:
(1) skip roots that are declared anywhere in the parsed source, and (2) skip
receiver checks while inside function/method bodies. Both still produced broad
corpus churn because many affected files already have parser recovery damage;
adding even local receiver errors changes downstream recovery and exposes
hundreds of unrelated cascades. A safe fix needs an additional guard that only
runs on parser-clean sources or otherwise proves the receiver site is in a
reliable scope, not just a narrower root-name predicate.

## To resume

Needs (in order): (1) reliable parameter/nested-scope receiver resolution so
in-function method receivers resolve; (2) treat `importedNamespaces` roots as
defined receivers; (3) gate to `version === "6"` (legacy stays lenient, per
G004). Then the dry-run's 14 delete-decl survivors become regression
fixtures. Probes (`probes/p01`, `p02`) and this version breakdown are the
starting evidence.
