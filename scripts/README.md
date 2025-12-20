# Pine Script v6 Data Generation Pipeline

This directory contains the scripts for crawling, scraping, and generating TypeScript definitions from the official TradingView Pine Script v6 documentation.

## Scripts Overview

### 1. `crawl.js` - Documentation Crawler
**Purpose**: Extracts the list of all language constructs from the main reference page.

**Source**: `https://www.tradingview.com/pine-script-reference/v6/`

**Output**: `v6/raw/v6-language-constructs.json`

**Usage**:
```bash
# Default output location
pnpm run crawl

# Custom output location
node scripts/crawl.js custom-output.json
```

**Extracts**:
- Keywords (15 total): `and`, `for`, `if`, `switch`, `var`, etc.
- Operators (21 total): `+`, `-`, `*`, `/`, `==`, `!=`, etc.
- Functions (~457 total): `ta.sma`, `strategy.entry`, `plot`, etc.
- Constants (~2,226 total): `color.red`, `plot.style_line`, etc.
- Variables (~48 total): `close`, `high`, `bar_index`, etc.
- Types: User-defined types and built-in type constructors

### 2. `scrape.js` - Function Details Scraper
**Purpose**: Scrape detailed information for each function including parameters, return types, descriptions, and examples.

**Input**: `v6/raw/v6-language-constructs.json`

**Output**: `v6/raw/complete-v6-details.json`

**Cache**: `.cache/function-details/` (individual function JSON files, 24-hour TTL)

**Usage**:
```bash
# Default files (uses cache)
pnpm run scrape

# Force refresh all functions (ignore cache)
pnpm run scrape --force

# Custom files
node scripts/scrape.js input.json output.json
```

**Extracts for each function**:
- Function signature and syntax
- Parameter names, types, and descriptions
- Whether parameters are optional or required
- Return type information
- Function description
- Code examples (when available)
- Namespace categorization (ta.*, strategy.*, plot.*, etc.)

**Features**:
- **Smart Caching**: Stores results for 24 hours to avoid re-scraping
- **Incremental Updates**: Only scrapes functions missing from cache or older than TTL
- **Force Refresh**: `--force` flag to bypass cache completely
- **Resumable**: Can resume interrupted scrapes by using cached results
- Batch processing to avoid overwhelming TradingView servers
- Error handling for failed requests
- Progress reporting with cache statistics
- Rate limiting (500ms between requests, 2s between batches)

### 3. `generate.js` - TypeScript Generator
**Purpose**: Generates TypeScript definition files from scraped data for use in the VS Code extension.

**Input**: `v6/raw/complete-v6-details.json`

**Outputs**:
- `v6/generated.ts` - Built-in variables dictionary
- `v6/parameter-requirements-generated.ts` - Function parameter specifications
- `v6/pine-constants-complete.ts` - All constants grouped by namespace
- `v6/pine-builtins-complete.ts` - Built-in variables grouped by namespace
- `v6/v6-manual.ts` - Complete API reference for hover tooltips

**Usage**:
```bash
# Default files
pnpm run generate

# Custom files
node scripts/generate.js details.json output-dir/
```

**Generated Files Description**:

#### `generated.ts`
```typescript
export const GEN_V6_BUILTIN_VARS: Record<string, string> = {
    close: "",
    high: "",
    bar_index: "",
    // ... more variables
};
```

#### `parameter-requirements-generated.ts`
```typescript
export const PINE_FUNCTIONS: Record<string, FunctionSignatureSpec> = {
    "ta.sma": {
        name: "ta.sma",
        syntax: "ta.sma(source, length) → series float",
        requiredParams: ["source", "length"],
        optionalParams: [],
        parameters: [...],
        returns: "series float"
    },
    // ... more functions
};
```

#### `pine-constants-complete.ts`
```typescript
export const COLOR_CONSTANTS = new Set([
    "red", "blue", "green", // ... more
]);

export const PLOT_STYLE_CONSTANTS = new Set([
    "plot.style_line", "plot.style_histogram", // ... more
]);
```

#### `pine-builtins-complete.ts`
```typescript
export const STANDALONE_BUILTINS = new Set([
    "close", "high", "low", "open", // ... more
]);

export const BARSTATE_BUILTINS = new Set([
    "isconfirmed", "isfirst", "ishistory", // ... more
]);
```

#### `v6-manual.ts`
```typescript
export const V6_FUNCTIONS: Record<string, PineItem> = {
    "ta.sma": {
        description: "Simple Moving Average",
        syntax: "ta.sma(source, length) → series float",
        returns: "series float",
        example: "// Example usage\\nta.sma(close, 20)"
    },
    // ... more functions
};
```

## Complete Workflow

### 1. Full Data Refresh
```bash
# Clean existing generated files
rm -f v6/generated.ts v6/parameter-requirements-generated.ts v6/pine-constants-complete.ts v6/pine-builtins-complete.ts v6/v6-manual.ts

# Run complete pipeline (uses cache where possible)
pnpm run crawl && pnpm run scrape && pnpm run generate
```

### 2. Force Complete Refresh (bypass cache)
```bash
# Force re-scraping all functions
pnpm run crawl && pnpm run scrape --force && pnpm run generate
```

### 3. Update Existing Data
```bash
# If only function details have changed (e.g., new documentation)
pnpm run scrape && pnpm run generate

# Force update if cache issues
pnpm run scrape --force && pnpm run generate
```

### 4. Development Mode
```bash
# Watch for changes and regenerate automatically (requires additional setup)
pnpm run crawl && pnpm run scrape && pnpm run generate
```

## Technical Implementation Details

### Web Scraping Strategy
- **Playwright**: Headless browser automation for JavaScript-heavy pages
- **Fallback Selectors**: Multiple CSS selectors to handle page layout changes
- **Rate Limiting**: Respectful scraping to avoid IP blocking
- **Error Recovery**: Graceful handling of network failures and page changes

### Data Extraction Process
1. **Initial Crawl**: Extract list of all language constructs from main page
2. **Detailed Scraping**: Visit each function's individual page for full details
3. **Data Validation**: Cross-reference with existing manual data
4. **TypeScript Generation**: Convert JSON data to typed TypeScript definitions

### File Dependencies
```
crawl.js → v6/raw/v6-language-constructs.json
scrape.js → v6/raw/complete-v6-details.json (depends on crawl output, uses .cache/)
generate.js → v6/*.ts files (depends on scrape output)
```

## Caching System

### Cache Structure
```
.cache/function-details/
├── ta_sma.json
├── strategy_entry.json
├── plot.json
└── ...
```

### Cache Behavior
- **TTL**: 24 hours (configurable via `CACHE_TTL` constant)
- **Storage**: Individual JSON files per function
- **Naming**: Safe filenames (special chars replaced with underscores)
- **Validation**: Checks file modification time and JSON validity
- **Fallback**: Graceful degradation if cache is corrupted

### Cache Commands
```bash
# Use cache (default)
pnpm run scrape

# Force refresh all
pnpm run scrape --force

# Clear cache manually
rm -rf .cache/function-details/
```

### Cache Metadata
Each cache file contains the complete function details:
```json
{
  "name": "ta.sma",
  "syntax": "ta.sma(source, length) → series float",
  "description": "Simple Moving Average...",
  "parameters": [...],
  "returns": "series float",
  "example": "// Example..."
}
```

## Configuration

### Environment Variables
- `NODE_ENV`: Set to `development` for verbose logging
- `PINE_BASE_URL`: Override base URL (default: https://www.tradingview.com/pine-script-reference/v6/)

### Customization
- **Rate Limits**: Adjust delays in `scrape.js` batch processing
- **Selectors**: Update CSS selectors if TradingView changes their page structure
- **Output Formats**: Modify `generate.js` to create different output formats

## Troubleshooting

### Common Issues

1. **"No functions found" Error**
   - Cause: TradingView page structure changed
   - Fix: Update CSS selectors in `crawl.js`

2. **Rate Limiting/Banning**
   - Cause: Too many requests too quickly
   - Fix: Increase delays in `scrape.js`

3. **Incomplete Function Details**
   - Cause: Individual function pages have different layouts
   - Fix: Add fallback selectors for specific function types

### Debug Mode
```bash
# Enable verbose logging
NODE_ENV=development pnpm run crawl

# Test single function
node -e "require('./scripts/scrape').scrapeFunctionDetails('ta.sma').then(console.log)"
```

## Contributing

When updating the scraping logic:
1. Test with a small subset first
2. Preserve backward compatibility
3. Update this documentation
4. Verify generated TypeScript files compile correctly
5. Run the test suite: `pnpm test`

## Legal Notice

This software scrapes publicly available documentation from TradingView. Please use responsibly:
- Respect robots.txt and rate limits
- Don't use for commercial purposes without permission
- Consider caching results to minimize server load