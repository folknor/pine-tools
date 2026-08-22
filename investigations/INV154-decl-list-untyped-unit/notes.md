# INV154 - a `var`-led declaration list only declared its first name

Status: fixed.

Reported from downstream use (`../strategies/PINE-LINT-BUGS.md` item 5).

## The disagreement

Pine allows several declarations in one comma-separated statement. We registered
only units carrying a declaration keyword or a type annotation; a bare
`name = value` unit after a `var`-led first unit became an `AssignmentStatement`,
so the name was never declared - reported as undeclared at its own declaration
site and again at every use.

```pine
//@version=6
indicator("t")
f() =>
    var a = 0, isNew = false
    isNew ? a : 1
plot(f())
```

| | Result |
|---|---|
| `pine-lint -H` (0.5.0, 082f33c) | `4:16: error: Undeclared identifier "isNew"`, `5:5: error: Undeclared identifier "isNew"` |
| `pine-lint -H --tv`, 2026-08-23 | clean |

**TV reachability control** - the same script with the ternary's alternate
replaced by an undeclared name, so an empty TV result cannot be mistaken for a
crash:

```pine
//@version=6
indicator("t")
f() =>
    var a = 0, isNew = false
    isNew ? a : undefinedThing
plot(f())
```

`pine-lint -H --tv`, 2026-08-23:
`5:17: error: Undeclared identifier "undefinedThing"` - one error, and `isNew`
is not among them. TV answered, and it considers `isNew` declared.

Wrapped across lines with trailing commas, which is how it appears in real code:

```pine
//@version=6
indicator("t")
f() =>
    var a = 0,
      isNew = false,
      scale = 2.0
    isNew ? a * scale : 1.0
plot(f())
```

`--tv` clean (2026-08-23); local clean both before and after this change - the
wrap path was never the trigger, the unit form was.

## Cause

`parser.ts` has two comma loops. The TYPE-annotated one
(`int x = 0, y = 1`) already had an untyped-unit case, added by INV027 - which
also settled that such a unit is typed from its own initializer and never
inherits the previous unit's annotation. The `var`/`varip`/`const`-led loop had
no such case, so the unit fell through to the generic expression branch, which
built an `AssignmentStatement` from `isNew = false`.

Per the Manual (`language/script-structure#line-wrapping`) a wrapped statement is
still one line of code, and `=` is Pine's declaration operator (`:=` reassigns),
so every `name = value` unit in the list declares.

## Resolution

The `var`-led loop gets the same untyped-unit case, guarded on the token VALUE
being `=`: `ASSIGN` covers `:=` too, and a `:=` unit must keep falling through to
the expression branch, since it reassigns rather than declares. The unit is
declared with no annotation and no `var`, so it is an ordinary per-bar local -
which matters, because the "fix" this false positive invited downstream was to
prefix `var`, turning a per-bar local into a persistent one and changing the
reset semantics of the code that used it.

Regression fixture: `regression/decl-list-untyped-unit-after-var.pine`, with AST
directives locking the second unit's node type and name (diagnostics alone would
pass on the wrong parse shape).

Corpus: `node scripts/regression-check.mjs` reports the same totals as HEAD
before the change (698 changed files / 666 new error appearances are pre-existing
baseline drift from INV148's version gate, identical with the change stashed).
