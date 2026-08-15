# Changelog

## Unreleased

- Semantic lints: five checks for Pine that compiles cleanly and is still
  wrong. TradingView accepts all five, so they are warnings on a new `lint`
  stage in the CLI's `result.warnings`, separate from the TV-mirroring
  diagnostics, and they surface as editor warnings too. See INV144.
  - `REPAINTING_SECURITY` - a `request.security()` reading the current,
    still-forming bar of a higher timeframe. Silent on an explicit
    `lookahead=`, a history offset in the expression or on the call, and
    same-timeframe requests.
  - `ACCUMULATOR_LIFETIME` - a `var` accumulator a loop unconditionally re-adds
    to on every bar with no reset, so it grows for the life of the chart (or,
    for `while`, never runs again after the first bar).
  - `PLOT_BUDGET` / `REQUEST_BUDGET` - more than 64 plot-budget calls, or more
    than 40 UNIQUE `request.*()` calls (identical calls are free, per the
    Manual). Also the one-call `request.footprint()` cap.
  - `ENTRY_WITHOUT_EXIT` - a strategy that opens positions with no
    `strategy.exit`/`close`/`close_all` and no opposing entry to reverse into.
    `strategy.cancel` withdraws a pending order and does not count.

## 0.5.0 - 2026-06-25

First release as pine-tools.

- Pine Script v6 language support
- IntelliSense with 475 functions, 162 variables, 237 constants
- Real-time diagnostics and validation
- Go-to-definition and find references
- Hover documentation
- Code formatting
- Symbol outline and folding
- Semantic token highlighting
- Rename support
- Inlay hints for function parameters
- Library import resolution via `/// @source` directive
- LSP server for editor integration
- MCP server for AI assistants
- CLI linter tool
