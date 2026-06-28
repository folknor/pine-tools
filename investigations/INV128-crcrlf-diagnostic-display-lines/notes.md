# INV128 - CRCRLF diagnostic display lines

Date: 2026-06-28

## Source

TODO #63. G005 deliberately made the lexer count `\r\r\n` the same way TV does:
each visual source line becomes raw line 1, 3, 5, and so on. That is correct for
TV comparison, but local emitted diagnostics used those raw lines directly. A
three-line file could report an error on line 5, which is not useful for CLI or
LSP consumers mapping diagnostics back to the displayed source.

## Probe

```pine
//@version=6
indicator("g005")
plot(zzz)
```

The exact bytes sent to TV used `\r\r\n` after every line:

```text
//@version=6\r\r\nindicator("g005")\r\r\nplot(zzz)\r\r\n
```

TV probe, 2026-06-28:

```bash
pine-lint --tv -c $'//@version=6\r\r\nindicator("g005")\r\r\nplot(zzz)\r\r\n'
```

Raw TV result:

```json
{"success":true,"result":{"errors":[{"code":"CE10272","ctx":{"identifier":"zzz"},"end":{"column":8,"line":5},"message":"Undeclared identifier \"{identifier}\"","start":{"column":6,"line":5}}],"functions":[],"types":[],"enums":[]}}
```

Local pre-fix CLI result on the same bytes
(`pine-lint -c $'//@version=6\r\r\nindicator("g005")\r\r\nplot(zzz)\r\r\n'`):

```text
<stdin>:5:6: error: Undefined variable 'zzz'. Did you mean 'nz'?
<stdin>: 1 error
```

## Decision

Keep the lexer/parser's raw line convention unchanged so G005's TV parity stays
intact. Instead, map raw positions to display positions at diagnostic emission
boundaries:

- `packages/cli/src/cli.ts` maps lexer, parser, validator, and semantic-warning
  diagnostics before producing pine-lint JSON or human output.
- `packages/language-service/src/features/diagnostics.ts` maps parser and
  validator diagnostics before creating LSP ranges.
- `scripts/lib/tv-positions.mjs` maps TV diagnostics to the same display-line
  convention after its existing wrapped-statement remap, so comparison scripts
  still compare like with like.

The mapping collapses a run of one or more `\r` characters immediately followed
by `\n` into one displayed line break. Ordinary `\n`, `\r\n`, and CR-only files
keep their existing line numbers.

Regression coverage:
`packages/core/test/lexer-line-endings.test.ts`.

## Implementation result

Date: 2026-06-28

Implemented in:

- `packages/core/src/common/sourcePositions.ts`: shared raw-line to display-line
  mapper.
- `packages/cli/src/cli.ts`: local pine-lint JSON and human diagnostics use
  display lines.
- `packages/language-service/src/features/diagnostics.ts`: LSP diagnostic ranges
  use display lines.
- `scripts/lib/tv-positions.mjs`: TV diagnostics are remapped to display lines
  after logical wrapped-statement remapping.

Local verification, 2026-06-28:

- `pine-lint --tv` on the CRCRLF probe returned raw TV line 5 with
  `success:true`.
- Pre-fix local CLI on the CRCRLF probe bytes reported line 5; post-fix local
  CLI reports line 3.
- `compare-tv` on the same CRCRLF probe with TV reachable: local and TV both
  map to line 3:6; `localOnly: []`, `tvOnly: []`.
- `node_modules/.bin/vitest run packages/core/test/lexer-line-endings.test.ts`:
  9 tests passed.
- `node_modules/.bin/tsc --noEmit`: pass.
- `node_modules/.bin/tsc -p .`: pass.
- `pnpm run install:cli`: pass; installed rebuilt CLI to `~/.local/bin/pine-lint`.
- `node_modules/.bin/vitest run`: 13 files, 415 tests passed.
- `node scripts/audit-fixtures.mjs`: no malformed `@expects` directives.
- First `node scripts/regression-check.mjs` before re-baseline showed 276 changed
  fixtures, 4936 appeared and 4936 disappeared records, same total count and
  same categories, consistent with coordinate remapping.
- `node scripts/snapshot-local-lint.mjs`: refreshed baseline; 1879 fixtures, 622
  fixtures with errors, 16057 total error records.
- Final `node scripts/regression-check.mjs`: 0 changed fixtures, 0 new error
  appearances, 0 disappeared appearances.
- `node_modules/.bin/biome check --max-diagnostics=none --reporter=github --formatter-enabled=true --linter-enabled=true --assist-enabled=true`: pass.
