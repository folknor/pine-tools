/**
 * Pine Script Language Data Schema
 *
 * Unified type definitions for all Pine Script language constructs.
 * Version-agnostic - used by v4, v5, and v6 data.
 *
 * Design Principles:
 * - Single source of truth for each construct type
 * - Optimized for LSP operations (completion, hover, validation)
 * - Strong typing throughout
 */

// =============================================================================
// PRIMITIVE TYPES
// =============================================================================

/**
 * Pine Script type qualifiers
 * - const: Compile-time constant, never changes
 * - input: User input, constant after script start
 * - simple: Calculated once, doesn't change per bar
 * - series: Can change on every bar
 */
export type TypeQualifier = "const" | "input" | "simple" | "series";

/**
 * Pine Script base types
 */
export type BaseType =
	| "int"
	| "float"
	| "bool"
	| "string"
	| "color"
	| "line"
	| "label"
	| "box"
	| "table"
	| "polyline"
	| "chart.point"
	| "linefill"
	| "void"
	| "na"
	| "unknown";

/**
 * Pine Script qualified types (qualifier + base type)
 * Examples: "series<float>", "simple<string>", "const<int>"
 */
export type QualifiedType =
	| `${TypeQualifier}<${BaseType}>`
	| `array<${BaseType}>`
	| `matrix<${BaseType}>`
	| `map<${BaseType},${BaseType}>`;

/**
 * Full Pine Script type - can be base type, qualified type, or special
 */
export type PineType = BaseType | QualifiedType;

// =============================================================================
// FUNCTION SCHEMA
// =============================================================================

/**
 * Function parameter definition
 */
export interface PineParameter {
	/** Parameter name */
	name: string;
	/** Parameter type */
	type: string; // Using string to allow complex types like "series int/float"
	/** Parameter description */
	description: string;
	/** Whether this parameter is required */
	required: boolean;
	/**
	 * Default value if optional, as the Pine expression written in the docs
	 * (e.g. "0", "true", "na", "alert.freq_once_per_bar", "\"FIFO\"" -> "FIFO",
	 * "" for an empty string). DYNAMIC/inherited defaults that have no literal
	 * value use a MAGIC SENTINEL instead — recognized iff the value is one of
	 * CHART_SYMBOL | CHART_BARS | SCRIPT_FORMAT | SCRIPT_PRECISION |
	 * SOURCE_LENGTH, or starts with "ARG:" (the value of a sibling argument,
	 * e.g. "ARG:start_column"). Distinguish by that set/prefix, NOT by casing
	 * (some literals are uppercase, e.g. "FIFO"). Absent when no default is
	 * documented or it could not be parsed.
	 */
	default?: string;
	/**
	 * The fixed set of values this parameter accepts, when documented as an
	 * enumeration — namespaced constants ("display.none", "display.all") or
	 * quoted-string literals ("TTM", "FY"). Absent when the parameter is not
	 * enumerated. See TODO #25.
	 */
	allowedValues?: string[];
	/** Inclusive lower bound of an accepted numeric range, when documented. */
	min?: number;
	/** Inclusive upper bound of an accepted numeric range, when documented. */
	max?: number;
}

/**
 * Function behavior flags
 */
export interface FunctionFlags {
	/** Can only be called at script top-level (indicator, plot, etc.) */
	topLevelOnly?: boolean;
	/** Returns a series type */
	seriesReturning?: boolean;
	/** Accepts variable number of arguments (math.max, str.format, etc.) */
	variadic?: boolean;
	/** Minimum arguments for variadic functions */
	minArgs?: number;
	/** Maximum arguments for variadic functions (undefined = unlimited) */
	maxArgs?: number;
	/**
	 * Polymorphic return type - function returns type based on input:
	 * - "input": returns same type as first argument (nz, fixnan)
	 * - "element": returns element type of array argument (array.get, array.first)
	 * - "numeric": returns same numeric type as arguments (math.abs, math.max)
	 */
	polymorphic?: "input" | "element" | "numeric";
	/**
	 * Name of the parameter whose type the return type follows, for
	 * return-follows-source functions detected from the overload dump (e.g.
	 * ta.valuewhen -> "source"). The checker resolves the return from that
	 * argument's actual type instead of the static return. See union-types.ts.
	 */
	returnTypeParam?: string;
}

/**
 * A single overload of an overloaded function. The top-level PineFunction
 * fields (parameters/syntax/returns) are a MERGED view across all overloads
 * (param types unioned, syntax/returns frozen to the first form); this preserves
 * each overload's exact, non-unioned parameter types and its own return type so
 * a consumer can resolve overloads precisely.
 */
export interface PineOverload {
	/** This overload's parameters, with their exact per-overload types. */
	parameters: PineParameter[];
	/** This overload's return type (e.g. "series float"). */
	returns: string;
}

/**
 * Complete function definition
 */
export interface PineFunction {
	/** Full function name (e.g., "ta.sma", "plot") */
	name: string;
	/** Namespace if applicable (e.g., "ta", "math") */
	namespace?: string;
	/** Function syntax/signature (e.g., "ta.sma(source, length) → series float") */
	syntax: string;
	/** Function description */
	description: string;
	/** Function parameters */
	parameters: PineParameter[];
	/**
	 * Return type. For OVERLOADED functions this is the first (primary) overload
	 * form only — see `overloads[].returns` for the accurate per-overload return
	 * types, which are authoritative when `overloads` is present.
	 */
	returns: string;
	/** Behavior flags */
	flags?: FunctionFlags;
	/**
	 * Per-overload signatures, present only for overloaded functions (>1 form).
	 * Each entry has that overload's exact parameter types and return type,
	 * preserving detail the merged top-level fields above flatten away.
	 */
	overloads?: PineOverload[];
	/**
	 * Deprecation note, when the reference flags the function as deprecated
	 * (rare in v6 — e.g. request.quandl). Parsed from the description; absent
	 * otherwise. (There is no `since`/version field: TV's v6 reference does not
	 * document when a symbol was introduced.)
	 */
	deprecated?: string;
	/** Example code snippets (TradingView lists one or more per function) */
	examples?: string[];
}

// =============================================================================
// BUILT-IN TYPE SCHEMA
// =============================================================================

/**
 * A built-in Pine type name, classified so consumers can recognize it without
 * a hardcoded list. Covers primitives, type qualifiers, generic containers, and
 * composite object types.
 */
export interface PineBuiltinType {
	/** Type name (e.g. "int", "array", "chart.point", "line"). */
	name: string;
	/** Namespace if the name is qualified (e.g. "chart" for "chart.point"). */
	namespace?: string;
	/**
	 * Classification:
	 * - "primitive": int, float, bool, string, color
	 * - "qualifier": const, simple, series (type-qualifier keywords)
	 * - "container": array, matrix, map (generic collection types)
	 * - "object": composite reference types (chart.point, line, label, box,
	 *   table, linefill, polyline, …)
	 */
	kind: "primitive" | "qualifier" | "container" | "object";
	/** Description from the type's reference page. */
	description?: string;
	/** Example snippets from the type's reference page. */
	examples?: string[];
	/**
	 * Accessible fields, present only for non-opaque object types (e.g.
	 * chart.point's index/time/price). The opaque ID types (line, label, box,
	 * table, footprint, …) expose no fields — they are manipulated via their
	 * `.*()` functions — so this is absent for them.
	 */
	fields?: Array<{ name: string; type: string; description: string }>;
}

// =============================================================================
// ANNOTATION SCHEMA
// =============================================================================

/**
 * A Pine compiler/doc annotation (`//@version`, `//@param`, `//@type`, …) — its
 * own reference entry. These direct the compiler or document library code; they
 * are not callable, so there are no parameters/return.
 */
export interface PineAnnotation {
	/** Name including the leading "@" (e.g. "@param", "@version="). */
	name: string;
	/** Description from the annotation's reference page. */
	description: string;
	/** Syntax line, if the page documents one. */
	syntax?: string;
	/** Example snippets from the reference page. */
	examples?: string[];
}

// =============================================================================
// VARIABLE SCHEMA
// =============================================================================

/**
 * Built-in variable definition
 */
export interface PineVariable {
	/** Variable name (e.g., "close", "syminfo.ticker") */
	name: string;
	/** Namespace if applicable (e.g., "syminfo", "barstate") */
	namespace?: string;
	/** Variable type */
	type: PineType;
	/** Type qualifier (series, simple, const) */
	qualifier: TypeQualifier;
	/** Variable description */
	description: string;
}

// =============================================================================
// CONSTANT SCHEMA
// =============================================================================

/**
 * Constant definition (e.g., color.red, shape.circle)
 */
export interface PineConstant {
	/** Full constant name (e.g., "color.red", "shape.circle") */
	name: string;
	/** Namespace (e.g., "color", "shape") */
	namespace: string;
	/** Short name without namespace (e.g., "red", "circle") */
	shortName: string;
	/** Constant type — string, since constants carry scraped enum type names
	 * (e.g. "scale_type", "text_format") that aren't in the PineType union. */
	type: string;
	/** Description */
	description?: string;
}

// =============================================================================
// KEYWORD SCHEMA
// =============================================================================

/**
 * Language keyword definition
 */
export interface PineKeyword {
	/** Keyword name */
	name: string;
	/** Keyword category */
	category: "control" | "declaration" | "operator" | "literal" | "type";
	/** Description */
	description?: string;
}

// =============================================================================
// NAMESPACE SCHEMA
// =============================================================================

/**
 * Namespace definition with all members
 */
export interface PineNamespace {
	/** Namespace name (e.g., "ta", "math", "color") */
	name: string;
	/** Functions in this namespace */
	functions: string[];
	/** Variables in this namespace */
	variables: string[];
	/** Constants in this namespace */
	constants: string[];
	/** Description */
	description?: string;
}

// =============================================================================
// VERSION DATA SCHEMA
// =============================================================================

/**
 * Complete language data for a Pine Script version
 */
export interface PineVersionData {
	/** Version identifier */
	version: "v4" | "v5" | "v6";
	/** All functions indexed by name */
	functions: Map<string, PineFunction>;
	/** All variables indexed by name */
	variables: Map<string, PineVariable>;
	/** All constants indexed by name */
	constants: Map<string, PineConstant>;
	/** All keywords */
	keywords: Set<string>;
	/** All namespaces indexed by name */
	namespaces: Map<string, PineNamespace>;
}

// =============================================================================
// LSP HELPER TYPES
// =============================================================================

/**
 * Completion item for LSP
 */
export interface CompletionItem {
	label: string;
	kind: "function" | "variable" | "constant" | "keyword" | "namespace";
	detail?: string;
	documentation?: string;
	insertText?: string;
	sortText?: string;
}

/**
 * Hover information for LSP
 */
export interface HoverInfo {
	name: string;
	type: string;
	description: string;
	syntax?: string;
	example?: string;
}

/**
 * Signature help for LSP
 */
export interface SignatureInfo {
	label: string;
	documentation?: string;
	parameters: {
		label: string;
		documentation?: string;
	}[];
	activeParameter?: number;
}
