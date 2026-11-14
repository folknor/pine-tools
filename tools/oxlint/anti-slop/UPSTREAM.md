# anti-slop (vendored)

Vendored from https://github.com/dmmulroy/anti-slop at commit
`13909c9e07590f5a85d93c62712259fe14a883f7`, following the README's
"Manual local installation". This copy is ours to change.

Copied: `src/index.ts`, `src/rules/`, `src/shared/`, `src/vendor/`, and
`LICENSE`. Left out: `src/effect/`, since pine-tools does not use Effect.

Upstream targets a specific Oxlint release; this repository pins `oxlint` and
`@oxlint/plugins` to the same exact version in the root `package.json`, and
the two must move together.

Run every rule test with `node tools/oxlint/anti-slop/run-tests.ts`, or one
with `node tools/oxlint/anti-slop/rules/<rule>.test.ts`. `run-tests.ts` is
local; upstream lists each test in its package.json instead.
