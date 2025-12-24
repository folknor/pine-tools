# Pine Script MCP Server

Model Context Protocol server for Pine Script v6. Enables AI assistants to validate Pine Script code and access language documentation.

## Installation

The server is built as part of the main project:

```bash
pnpm run build
```

The compiled server will be at: `/dist/packages/mcp/bin/pine-mcp.js`

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
**Linux**: `~/.config/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "pine-script": {
      "command": "node",
      "args": [
        "/absolute/path/to/pinescript-vscode-extension/dist/packages/mcp/bin/pine-mcp.js"
      ]
    }
  }
}
```

**Important**: Use absolute paths in the configuration.

### Manual Testing

```bash
# Start the server
node dist/packages/mcp/bin/pine-mcp.js

# The server communicates via stdio using JSON-RPC
```

## Available Tools

### pine_validate

Validate Pine Script code and return errors/warnings.

**Input:**
```json
{
  "code": "x = 1\ny = close + open"
}
```

**Output:**
```json
{
  "success": true,
  "errors": [],
  "warnings": []
}
```

### pine_lookup

Look up documentation for a symbol.

**Input:**
```json
{
  "symbol": "ta.sma"
}
```

**Output:**
```json
{
  "found": true,
  "name": "ta.sma",
  "kind": "function",
  "syntax": "ta.sma(source, length) → series float",
  "description": "...",
  "returns": "series float",
  "parameters": [...]
}
```

### pine_list_functions

List available functions, optionally by namespace.

**Input:**
```json
{
  "namespace": "ta"
}
```

**Output:**
```json
{
  "count": 120,
  "namespace": "ta",
  "functions": ["ta.sma", "ta.ema", ...]
}
```

### pine_format

Format Pine Script code.

**Input:**
```json
{
  "code": "x=1\ny=2"
}
```

**Output:**
```json
{
  "formatted": "x = 1\ny = 2"
}
```

## Available Resources

### pine://reference/functions

List of all Pine Script functions with brief descriptions.

### pine://reference/variables

List of all built-in variables (close, high, volume, etc.).

### pine://reference/namespaces

List of all namespaces (ta, math, str, etc.).

## Architecture

The MCP server is a thin wrapper around the language-service package:

```
packages/mcp/
├── src/
│   ├── server.ts    # Main MCP server with all tools and resources
│   └── index.ts     # Re-exports
├── bin/
│   └── pine-mcp.ts  # CLI entry point
└── package.json
```

All language intelligence is delegated to `@pinescript/language-service`, which provides:
- Code validation
- Symbol lookup
- Completions
- Formatting

## Development

```bash
# Build
pnpm run build

# Test server startup
node dist/packages/mcp/bin/pine-mcp.js

# Use MCP Inspector for interactive testing
npx @modelcontextprotocol/inspector node dist/packages/mcp/bin/pine-mcp.js
```

## Dependencies

- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Schema validation
- `@pinescript/language-service` - Pine Script language intelligence
- `@pinescript/pine-data` - Language data (functions, variables, etc.)

## See Also

- [CLAUDE.md](./CLAUDE.md) - Detailed implementation guide and architecture
- [packages/language-service](../language-service) - Core language intelligence
- [Model Context Protocol](https://modelcontextprotocol.io) - Official MCP documentation
