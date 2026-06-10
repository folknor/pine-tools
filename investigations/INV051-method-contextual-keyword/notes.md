# INV051 - `method` is a contextual keyword

**Date:** 2026-06-10
**Status:** fixed
**Code:** `packages/core/src/parser/parser.ts` (statement dispatch + `methodDeclaration`)

## Symptom

On `fixtures/076f5b4a...pine` we emitted a phantom

```
59:11  Expected method name after 'method' at line 59
```

anchored on a *comment* line. TV is silent on the file (parses fully, 0
errors). The real trigger was line 30:

```pine
method    = input.string("ADX", options=["ADX", "Volatility"], title=..., group=...)
```

`method` is used as a plain **variable name**. Our parser unconditionally
treated the `method` keyword as the start of a method declaration
(`method <name>(...) => ...`), consumed `=` where it wanted a name, and the
error surfaced on a downstream line during recovery.

## Two facts established with `pine-lint --tv`

### 1. `method` is valid as an identifier

Probe (`probe-method-var.pine`):

```pine
//@version=6
indicator("x")
method = input.string("ADX", options=["ADX","B"])
plot(close, color = method == "ADX" ? color.red : color.blue)
```

`compare-tv.mjs`, 2026-06-10:
- local (before fix): `3:8 Expected method name after 'method' at line 3`
- TV: **0 errors**

### 2. A method NAME may be a reserved word

Probe (`probe-method-typename.pine`):

```pine
//@version=6
indicator("x")
method type(string str) =>
    str
method float(int id) =>
    id
x = "a".type()
plot(close)
```

`compare-tv.mjs`, 2026-06-10:
- local (before fix): 6 errors (`Unexpected token: str`, `... =>`,
  `Could not find function or function reference 'type'`, etc.) - and even
  the original code rejected these with `Expected method name after 'method'`
  because the name token is a KEYWORD, not an IDENTIFIER.
- TV: **0 errors**

So TV accepts method names like `type` / `float` / `label` (all KEYWORD
tokens in our lexer). The corpus uses all three:
`method type(string str)` (982bb01e), `method label(string dir, ...)`
(954272), `method float(int id)` (466c61e9).

### 3. Sanity check that `--tv` reached TV (not an empty/fallback result)

Probe (`probe-input-options.pine`) - `method = input(...)` with `options` on
the *bare* `input()` (which has no `options` param in v6):

```pine
//@version=6
indicator("x")
method = input(defval='BB %B', options=['RSI', 'MACD', 'BB %B'])
plot(close, color = method == 'RSI' ? color.red : color.blue)
```

`compare-tv.mjs`, 2026-06-10:
- local: `3:10 Invalid parameter 'options'. ...`
- TV: `3:32 The "input" function does not have an argument with the name "options"`

TV and local *agree there is an error* (different wording/anchor) - proof the
`--tv` calls above reached TV and a clean 0-error result is a real
acceptance, not a crashed/empty response (per the CLAUDE.md `--tv` rule and
G002's cautionary tale).

## Fix

`method` is a declaration only in the shape `method <name> (` - a name token
(IDENTIFIER or KEYWORD) immediately followed by `(`. Otherwise it is an
ordinary identifier (assignment `=`, reassignment `:=`, comparison `==`,
indexing `[`, member access `.`, etc.). This mirrors the existing
`switch`/`type`/`enum` contextual-keyword guards in the same dispatch.

- statement dispatch: gate `methodDeclaration` on
  `(peekNext is IDENTIFIER or KEYWORD) AND tokens[current+2] is LPAREN`. The
  LPAREN check is what keeps `method + (x)` an expression.
- `methodDeclaration`: accept an IDENTIFIER **or** KEYWORD name token
  (falling back to `consume(IDENTIFIER)` only to raise the standard
  "Expected method name" error when neither follows, e.g. `method => ...`).

The `export method ...` path (parser.ts ~1676) is unchanged: after `export`
the keyword is unambiguously a declaration (`export method = ...` is not
legal), and it routes through the same now-keyword-tolerant
`methodDeclaration`.

## Regression check (2026-06-10)

`regression-check.mjs`: confirmable wins -

- 076f5b4a (target FP) -> gone, TV silent.
- 954272 -> **0 local / 0 TV** (was the `method label(...)` FP).
- 982bb01e -> method-decl FP gone (4 residual bool-inference FPs are
  pre-existing, #9 category, unrelated).
- 466c61e9, c8281fa6 -> method FP gone.

The 9 "new error appearances" the local-vs-local check flags are all
**non-confirmable**:

- 89e60793 (TV stops at 13:66 multiline-string error) and 07af1375 (TV stops
  at 7:74) - the new lines are post-TV-stop cascade on multiline-string-broken
  files (INV025/G001 bucketing). My guard correctly declines to treat
  `method when a low ...` (string content) as a declaration; the expression
  parser then emits more undefined-variable noise than the single
  `Expected "(" after method name` it emitted before. Churn after TV's stop,
  not a real disagreement.
- 1df8ae62 is `//@version=3`; `input(options=...)` was valid in v3, so the
  unmasked `Invalid parameter 'options'` is the documented legacy-version FP
  class (CLAUDE.md "Argument type-checking is v6-only") - same class as the
  ~30 other v3 FPs already on that file. Previously masked by the method-decl
  parse error.

Fixtures: `regression/INV051-method-as-variable.pine`,
`regression/INV051-method-name-keyword.pine`.
