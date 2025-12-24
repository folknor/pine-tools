/**
 * Pine Script Keywords and Type Constants
 *
 * This file centralizes all keyword definitions used across the parser,
 * lexer, and analyzer. Per architecture principles, keywords are grammar
 * fundamentals that are intentionally hardcoded (not scraped from pine-data).
 *
 * These define Pine Script v6 language syntax, not API data.
 */

/**
 * All Pine Script keywords recognized by the lexer.
 * These tokens are classified as KEYWORD type during tokenization.
 */
export const LEXER_KEYWORDS = new Set([
	// Control flow
	"if",
	"else",
	"for",
	"while",
	"break",
	"continue",
	"return",
	"switch",
	"case",
	"default",

	// Variable declarations
	"var",
	"varip",
	"const",

	// Special values
	"na",

	// Module system
	"export",
	"import",
	"as",

	// Loop constructs
	"in",
	"to",
	"by",

	// User-defined types
	"type",
	"enum",
	"method",

	// Logical operators
	"and",
	"or",
	"not",

	// Type keywords (base types)
	"int",
	"float",
	"bool",
	"string",
	"color",
	"line",
	"label",
	"box",
	"table",
	"array",
	"matrix",
	"map",

	// Type qualifiers
	"series",
	"simple",
	"input",
]);

/**
 * Type keywords that can appear in type annotations.
 * Includes both base types and qualifiers.
 */
export const TYPE_KEYWORDS = new Set([
	// Base types
	"int",
	"float",
	"bool",
	"string",
	"color",
	"line",
	"label",
	"box",
	"table",
	"array",
	"matrix",
	"map",

	// Qualifiers
	"series",
	"simple",
]);

/**
 * Variable type keywords (base types only, excludes qualifiers).
 * Used for parsing variable declarations like `int x = 1`.
 */
export const VAR_TYPE_KEYWORDS = [
	"int",
	"float",
	"bool",
	"string",
	"color",
	"line",
	"label",
	"box",
	"table",
	"array",
	"matrix",
	"map",
] as const;

/**
 * Reserved keywords for symbol table initialization.
 * These prevent user variables from shadowing language constructs.
 */
export const RESERVED_KEYWORDS = [
	// Control flow
	"break",
	"continue",
	"if",
	"else",
	"for",
	"while",
	"switch",
	"return",

	// Module system
	"import",
	"export",

	// Boolean literals (handled specially by lexer, but reserved)
	"true",
	"false",

	// Logical operators
	"and",
	"or",
	"not",

	// Variable declarations
	"var",
	"varip",

	// User-defined types
	"type",
	"method",
	"enum",

	// Type qualifiers
	"series",
	"simple",
	"const",

	// Special values
	"na",
] as const;
