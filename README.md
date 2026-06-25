# pine-tools

Unofficial Pine Script v6 tooling: a VS Code extension, a `pine-lint` CLI, an
LSP server, and an MCP server, plus the generated language data behind them.

The linter aims to be MORE correct than TradingView's own pine-lint: it catches
what TV catches and things TV misses (TV stops at the first error, misattributes
some failures, and accepts some nonsense expressions). See [AGENTS.md](AGENTS.md)
for the methodology. Built with LLMs in a clean-room process; see
[LLM.md](LLM.md).

## What you get

- VS Code extension: syntax highlighting, IntelliSense (475 functions, 162
  variables, 237 constants), real-time diagnostics, hover docs, go-to-definition,
  rename, formatting, and inlay hints.
- pine-lint: a self-contained CLI that validates a `.pine` file (or stdin), with
  an optional `--tv` mode that returns TradingView's own verdict.
- LSP server: the same language features for any editor that speaks LSP.
- MCP server: the language service exposed to AI assistants.

## Install

Grab the prebuilt artifacts from the latest
[release](https://github.com/folknor/pine-tools/releases):

- `pine-tools-<version>.vsix` - the VS Code extension. Install with
  `code --install-extension pine-tools-<version>.vsix`, or the Extensions view's
  "Install from VSIX...".
- `pine-lint` - a single executable Node script. Put it on your PATH and run
  `pine-lint file.pine`.

Or build from source (Node 22.18+, pnpm):

```
pnpm install
pnpm run package         # build dist/pine-tools-<version>.vsix
pnpm run install:cli     # build and install pine-lint to ~/.local/bin
```

## License

MIT. See [LICENSE](LICENSE).

## Credits

Original barebones VS Code extension by Jaroslav Pantsjoha. Completely rewritten
by folknor.

## Acknowledgements

`vendor/` contains the source of published Pine Script libraries, used only to
derive each library's exported-symbol set (`pine-data/v6/libraries.json`) so the
linter can validate `import`ed-library member calls (flagging calls to functions
a library does not export). Each file retains its original license header.

All vendored libraries are licensed under the Mozilla Public License 2.0
(<https://mozilla.org/MPL/2.0/>) by their respective authors. Libraries published
under non-redistributable or unstated terms are deliberately not vendored; the
linter stays lenient on those imports.

TradingView's own `ta` and `RelativeValue` libraries are TradingView's
pure-Pine reference implementations. The community libraries are the work of, in
alphabetical order: algotraderdev, andre_007, Bjorgum, boitoki, DevLucem,
HeWhoMustNotBeNamed, HoanGhetti, HPotter, jason5480, jdehorty, jmosullivan,
kaigouthro, LonesomeTheBlue, loxx, LucF, LudoGH68, PineCoders, reees,
RicardoSantos, robbatt, TFlab, toodegrees, Trendoscope, and
ZenAndTheArtOfTrading. Thank you for publishing your work open-source.
