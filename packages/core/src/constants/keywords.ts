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
 * Names TradingView refuses in a BINDING position - a parameter name, a UDT
 * field, a variable, a function name, a loop counter. Answered with
 * `""<name>"" cannot be used as a variable or function name.`
 *
 * MEASURED, not reasoned about: a 343-probe `pine-lint --tv` sweep over 49
 * candidate words across seven binding positions (INV179, 2026-09-09). The set
 * is not any list we already held, in either direction:
 *
 *  - `do` is in it and is not a Pine v6 construct at all, so it is not a lexer
 *    keyword here and never was - which is exactly why it was accepted
 *    everywhere.
 *  - `to`, `by`, `in` and `as` are in it. They are contextual loop/import
 *    words, so the parser reads them as names outside their clause.
 *  - `const`, `na`, `type`, `enum`, `method`, `once`, `case` and `default` are
 *    NOT in it - TV accepts all of them as names - even though several sit in
 *    RESERVED_KEYWORDS below. The two lists answer different questions and
 *    must not be merged.
 *  - `from` is NOT in it. The report this came from named `from` alongside
 *    `to`, but TV accepts `f(float from)` and even echoes the parameter back in
 *    the signature. The `span(float from, float to)` rejection it was inferred
 *    from is TV blaming `from`'s column for `to`'s offence, which is the
 *    position-blaming G001 warns about.
 */
export const TV_RESERVED_BINDING_NAMES = new Set([
	"and",
	"as",
	"break",
	"by",
	"continue",
	"do",
	"else",
	"export",
	"false",
	"for",
	"if",
	"import",
	"in",
	"not",
	"or",
	"return",
	"switch",
	"to",
	"true",
	"var",
	"varip",
	"while",
]);

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
