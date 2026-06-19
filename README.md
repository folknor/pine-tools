# pine-tools

Pine Script v6 support for VS Code. Syntax highlighting, IntelliSense, diagnostics.

Also contains a pinescript LSP, pinescript MCP, CLI pinescript linter, and other tools.

Built with LLMs. See [LLM.md](LLM.md).


## Requirements

- VS Code 1.108+
- Node 22.18+
- pnpm

## Install

```
pnpm install
pnpm run build
```

## Build

```
pnpm run build          # dev build
pnpm run build:prod     # production build
pnpm run package        # create .vsix
```

Output goes to `dist/`.

## Use Locally

Build it first:

```
pnpm install
pnpm run build
```

Then symlink to VS Code extensions dir:

```
ln -s $(pwd) ~/.vscode/extensions/pine-tools
```

Or package and install:

```
pnpm run package
code --install-extension dist/pine-tools-*.vsix
```

Reload VS Code window after install. Use `pnpm run watch` for live development.

## Test

```
pnpm test
```

## CLI

```
node dist/packages/cli/src/cli.js file.pine
```

Or after install:

```
pine-validate file.pine
```

## LSP Server

```
node dist/packages/lsp/bin/pine-lsp.js --stdio
```

For editors that speak Language Server Protocol.

## MCP Server

```
node dist/packages/mcp/bin/pine-mcp.js
```

For AI assistants. See `packages/mcp/README.md`.

## Library Imports

Pine libraries (`import User/Library/Version`) have no discoverable source. Use `/// @source` to enable IntelliSense:

```pine
/// @source ./libs/my-library.pine
import User/MyLibrary/1 as myLib

x = myLib.myFunction(close)  // completions, hover, go-to-definition
```

Place the directive immediately before the import. Path is relative to current file.

## Structure

```
packages/
  core/               parser, analyzer
  language-service/   editor-agnostic API
  cli/                command-line validator
  lsp/                language server
  mcp/                model context protocol server
  vscode/             extension client

pine-data/v6/         function signatures, constants
syntaxes/             TextMate grammar
```

## Data Pipeline

Regenerate language data from crawling and scraping TradingView.com docs:

```
pnpm run crawl
pnpm run scrape
pnpm run generate
pnpm run generate:syntax
```

## License

MIT

## Credits

Original barebones vscode extension by Jaroslav Pantsjoha. Completely rewritten by folknor.

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
