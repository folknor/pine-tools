# INV023 - CE10190: shadowing a built-in after using it (TODO #40)

**Status:** resolved 2026-06-04. The checker now errors on declaring a
variable named after a built-in VARIABLE when that built-in was
referenced earlier in source. Found while probing CW10011 for INV020.

## The rule (probed)

TV's CE10190, template:
`Cannot shadow the built-in variable "{variableName}" because it has already been used as a built-in.`

"Already been used" means: the built-in name was REFERENCED (resolving
to the built-in) anywhere earlier in source than the shadowing
declaration. Scope is irrelevant - prior use in a different scope
counts (probe 2), same-scope use immediately before counts (probe 4),
and global redeclarations count (probe 3). With no prior use, the
declaration is legal and draws only the CW10011 warning (probe 1, and
INV020 probes 3-5).

Anchored like CW10011: the declaration span.

## Probes (`pine-lint --tv`, 2026-06-04)

Probe 1 - use only AFTER the shadow: CW10011 only, NO error.

```pine
//@version=6
indicator("x")
if close > open
    hl2 = 1.0
    label.new(bar_index, hl2)
y = hl2 + 1
plot(y)
```

Probe 2 - prior use in another (global) scope: CE10190 at 5:5-13
(+ CW10011).

```pine
//@version=6
indicator("x")
y = hl2 + 1
if close > open
    hl2 = 1.0
    label.new(bar_index, hl2)
plot(y)
```

Probe 3 - global redeclaration after use: CE10190 at 4:1-9
(+ CW10011).

```pine
//@version=6
indicator("x")
y = hl2 + 1
hl2 = 2.0
plot(y + hl2)
```

Probe 4 - same-scope use on the line before: CE10190 at 5:5-13
(+ CW10011).

```pine
//@version=6
indicator("x")
if close > open
    t = hl2 + 1
    hl2 = 2.0
    label.new(bar_index, t + hl2)
plot(close)
```

(The INV020 `open` probe also pairs both diagnostics - the prior use
there was the `if close > open` condition.)

## Implementation notes

- `checker.ts`: `usedBuiltins` set filled in `validateIdentifier` when
  a reference resolves to a line-0 (built-in-seeded) symbol that is a
  built-in variable (`getBuiltinVarInfo`); a user shadow resolves to
  the user symbol, so post-shadow references don't count - matching
  TV's "as a built-in" wording. `checkBuiltinShadowDeclaration` fires
  from the VariableDeclaration and TupleDeclaration cases, v6-only
  (legacy scripts stay lenient - G004).
- Loop iterators (`for hl2 = ...`) are not covered - unprobed, and the
  corpus has no instance. Revisit if one appears.
- The check produces ZERO hits on the current 1879-fixture corpus -
  consistent with CE10190 never appearing in the FN inventory; it came
  from probing, not the diff.
- Regression fixture:
  `packages/core/test/fixtures/regression/builtin-shadow-after-use.pine`.
