// Pine Script Type System
// Defines type representations and type checking utilities

export type PineType =
	| "int"
	| "float"
	| "bool"
	| "string"
	| "color"
	| "series<int>"
	| "series<float>"
	| "series<bool>"
	| "series<string>"
	| "series<color>"
	| "simple<int>"
	| "simple<float>"
	| "simple<bool>"
	| "simple<string>"
	| "simple<color>"
	| "array<int>"
	| "array<float>"
	| "array<bool>"
	| "array<string>"
	| "array<color>"
	| "matrix<int>"
	| "matrix<float>"
	| "line"
	| "label"
	| "box"
	| "table"
	| "void"
	| "na"
	| "unknown";

export interface TypeInfo {
	type: PineType;
	isOptional?: boolean;
	defaultValue?: unknown;
}

export namespace TypeChecker {
	// Pine's qualifier lattice is const ≤ input ≤ simple ≤ series. For
	// type-compatibility purposes `const<T>` and `input<T>` behave exactly like
	// `simple<T>` - they coerce up to simple/series and down to the base type the
	// same way - so collapse those bracket forms to `simple<T>`. Without this the
	// explicit coercion pairs and is*Type predicates below (which enumerate only
	// series/simple/base) reject input-qualified built-ins such as
	// `chart.bg_color` (input<color>) and `chart.left_visible_bar_time` (input<int>).
	function canonicalizeQualifier(type: PineType): PineType {
		const m = (type as string).match(/^(input|const)<(\w+)>$/);
		return m ? (`simple<${m[2]}>` as PineType) : type;
	}

	// Display-flag enums (plot_display / plot_simple_display) are int-backed
	// bitmask types. TV lets them combine with + / - (e.g.
	// `display.all - display.status_line`) and treats the two as mutually
	// assignable. Strip any leading qualifier so both the bare constant form and
	// the "input plot_display" param form are recognised.
	export function isDisplayFlag(type: PineType): boolean {
		const base = (type as string)
			.replace(/^(series|simple|input|const)\s+/, "")
			.replace(/^(series|simple|input|const)<(.+)>$/, "$2");
		return base === "plot_display" || base === "plot_simple_display";
	}

	// Normalize type format: "series int" -> "series<int>", "simple float" -> "simple<float>"
	function normalizeType(type: string): PineType {
		// Handle union types by taking the first option (e.g., "int/float" -> "int")
		if (type.includes("/")) {
			const _parts = type.split("/");
			// For "series int/float", we want "series int" (first variant)
			type = type.replace(/\/\w+/, "");
		}

		// Handle space-separated qualifier types: "series int" -> "series<int>"
		const match = type.match(/^(series|simple|const|input)\s+(\w+)$/);
		if (match) {
			const [, qualifier, baseType] = match;
			if (qualifier === "series") {
				return `series<${baseType}>` as PineType;
			} else if (qualifier === "simple") {
				return `simple<${baseType}>` as PineType;
			}
			// const and input types are treated as the base type
			return baseType as PineType;
		}

		return type as PineType;
	}

	// Check if a "to" type is a union type that accepts either variant
	function isUnionTypeMatch(from: string, to: string): boolean {
		if (!to.includes("/")) return false;

		// Extract qualifier and union: "series int/float" -> ["series", "int/float"]
		const qualifierMatch = to.match(/^(series|simple|const|input)\s+(.+)$/);
		const fromQualifierMatch = from.match(
			/^(series|simple|const|input)\s+(.+)$/,
		);

		if (qualifierMatch) {
			const [, toQualifier, toUnion] = qualifierMatch;
			const toTypes = toUnion.split("/");

			// Get base type from 'from'
			let fromBase = from;
			let fromQualifier = "";
			if (fromQualifierMatch) {
				fromQualifier = fromQualifierMatch[1];
				fromBase = fromQualifierMatch[2];
			} else if (from.includes("<")) {
				// Handle our format: "series<int>" -> qualifier="series", base="int"
				const bracketMatch = from.match(/^(\w+)<(\w+)>$/);
				if (bracketMatch) {
					fromQualifier = bracketMatch[1];
					fromBase = bracketMatch[2];
				}
			}

			// Check if fromBase matches any of the union types
			if (toTypes.includes(fromBase)) {
				// Qualifiers must be compatible (series accepts simple, simple accepts const, etc.)
				if (toQualifier === "series") return true; // series accepts everything
				if (
					toQualifier === "simple" &&
					(fromQualifier === "simple" ||
						fromQualifier === "const" ||
						fromQualifier === "")
				)
					return true;
				if (
					toQualifier === "const" &&
					(fromQualifier === "const" || fromQualifier === "")
				)
					return true;
				if (
					toQualifier === "input" &&
					(fromQualifier === "input" ||
						fromQualifier === "const" ||
						fromQualifier === "")
				)
					return true;
			}
		} else {
			// No qualifier, just union type like "int/float"
			const toTypes = to.split("/");
			const fromBase = from
				.replace(/^(series|simple|const|input)\s+/, "")
				.replace(/^(\w+)<(\w+)>$/, "$2");
			if (toTypes.includes(fromBase)) return true;
		}

		return false;
	}

	// Check if type is an na variant (na, const<na>, series<na>)
	export function isNaType(type: PineType): boolean {
		const t = type as string;
		return (
			t === "na" ||
			t === "const<na>" ||
			t === "series<na>" ||
			t.endsWith("<na>")
		);
	}

	// Check if type1 is assignable to type2
	export function isAssignable(from: PineType, to: PineType): boolean {
		from = canonicalizeQualifier(from);
		to = canonicalizeQualifier(to);
		if (from === to) return true;
		if (to === "unknown" || from === "unknown") return true;
		if (isNaType(from)) return true; // na is assignable to any type (const<na>, series<na>, etc.)

		// Qualifiers never block assignability on their own (Pine's `:=`
		// freely upgrades const/input/simple/series): equal base types are
		// assignable under any qualifier mix (`false` into an input<bool>
		// variable, input<plot_style> into plot_style), and int/float keep
		// their bidirectional coercion across qualifiers. Bracketed
		// collection types fall through to the structural rules below.
		// see INV040
		{
			const fromBase = baseTypeName(from as string);
			const toBase = baseTypeName(to as string);
			if (!fromBase.includes("<") && !toBase.includes("<")) {
				if (fromBase === toBase && fromBase !== "na") return true;
				const numeric = (x: string) => x === "int" || x === "float";
				if (numeric(fromBase) && numeric(toBase)) return true;
			}
		}

		// Array type coercion: array<type> or array<unknown> (unresolved element
		// type) is assignable to any array. This handles cases where type
		// inference couldn't determine the element type - we can't prove the
		// assignment is wrong, so accept it rather than emit a false positive.
		const fromStr = from as string;
		const toStr = to as string;
		if (fromStr.startsWith("array<") && toStr.startsWith("array<")) {
			const fromElement = fromStr.slice(6, -1);
			const toElement = toStr.slice(6, -1);
			if (fromElement === "type" || fromElement === "unknown") return true;
			if (toElement === "type" || toElement === "unknown") return true;
		}

		// Handle union types in target (e.g., "series int/float" accepts both int and float)
		if ((to as string).includes("/")) {
			if (isUnionTypeMatch(from as string, to as string)) return true;
		}

		// Normalize types for comparison (handles "series int" vs "series<int>")
		const normalizedFrom = normalizeType(from as string);
		const normalizedTo = normalizeType(to as string);
		if (normalizedFrom === normalizedTo) return true;

		// Display-flag enums are mutually assignable (plot_simple_display <->
		// plot_display) and accept the result of flag arithmetic.
		if (isDisplayFlag(from) && isDisplayFlag(to)) return true;

		// int <-> float coercion (Pine Script allows bidirectional numeric coercion)
		if (from === "int" && to === "float") return true;
		if (from === "float" && to === "int") return true;
		if (from === "series<int>" && to === "series<float>") return true;
		if (from === "series<float>" && to === "series<int>") return true;
		if (from === "simple<int>" && to === "simple<float>") return true;
		if (from === "simple<float>" && to === "simple<int>") return true;

		// Simple -> series coercion (base types to series)
		if (from === "int" && to === "series<int>") return true;
		if (from === "float" && to === "series<float>") return true;
		if (from === "bool" && to === "series<bool>") return true;
		if (from === "string" && to === "series<string>") return true;
		if (from === "color" && to === "series<color>") return true;

		// Cross-type numeric coercion to series
		if (from === "int" && to === "series<float>") return true;
		if (from === "float" && to === "series<int>") return true;

		// simple<T> -> series<T> coercion
		if (from === "simple<int>" && to === "series<int>") return true;
		if (from === "simple<float>" && to === "series<float>") return true;
		if (from === "simple<bool>" && to === "series<bool>") return true;
		if (from === "simple<string>" && to === "series<string>") return true;
		if (from === "simple<color>" && to === "series<color>") return true;

		// simple<T> -> base type T coercion (simple is compatible with const)
		if (from === "simple<int>" && to === "int") return true;
		if (from === "simple<float>" && to === "float") return true;
		if (from === "simple<bool>" && to === "bool") return true;
		if (from === "simple<string>" && to === "string") return true;
		if (from === "simple<color>" && to === "color") return true;

		// Numeric coercion with simple types
		if (from === "simple<int>" && to === "float") return true;
		if (from === "simple<float>" && to === "int") return true;
		if (from === "simple<int>" && to === "simple<float>") return true;
		if (from === "simple<int>" && to === "series<float>") return true;
		if (from === "simple<float>" && to === "series<int>") return true;

		// series<T> -> T coercion (Pine Script allows series values in simple contexts)
		// This is common when passing series values to functions expecting simple types
		if (from === "series<int>" && to === "int") return true;
		if (from === "series<float>" && to === "float") return true;
		if (from === "series<bool>" && to === "bool") return true;
		if (from === "series<string>" && to === "string") return true;
		if (from === "series<color>" && to === "color") return true;

		// Cross-type series to simple coercion
		if (from === "series<float>" && to === "int") return true;
		if (from === "series<int>" && to === "float") return true;

		// String -> color coercion (Pine Script allows color names and hex as strings)
		// e.g., "red", "blue", "#FF0000", "#00FF00FF"
		if (from === "string" && (to === "color" || to === "series<color>"))
			return true;
		if (from === "series<string>" && to === "series<color>") return true;

		// Numeric -> color coercion (colors can be specified as ARGB integers)
		if (from === "int" && (to === "color" || to === "series<color>"))
			return true;
		if (from === "float" && (to === "color" || to === "series<color>"))
			return true;
		if (from === "series<int>" && (to === "series<color>" || to === "color"))
			return true;
		if (from === "series<float>" && (to === "series<color>" || to === "color"))
			return true;
		if (from === "simple<int>" && (to === "color" || to === "series<color>"))
			return true;
		if (from === "simple<float>" && (to === "color" || to === "series<color>"))
			return true;

		// Color -> numeric coercion (color can be converted to its integer representation)
		if (from === "color" && (to === "int" || to === "float")) return true;
		if (
			from === "series<color>" &&
			(to === "series<int>" || to === "series<float>")
		)
			return true;

		// Numeric -> string coercion (str.tostring is often implicit)
		if (from === "int" && (to === "string" || to === "series<string>"))
			return true;
		if (from === "float" && (to === "string" || to === "series<string>"))
			return true;
		if (from === "series<int>" && to === "series<string>") return true;
		if (from === "series<float>" && to === "series<string>") return true;

		return false;
	}

	// --- Strict declaration/assignment compatibility (CE10173/CE10097) ---
	// TV applies a much stricter rule to `T name = expr` declarations and
	// `name := expr` reassignments than to function arguments: base types
	// must match exactly, except int widens to float, and na assigns to any
	// base except bool. Qualifiers are free in both directions
	// (`int x = bar_index` is legal - x just becomes series int). Probed
	// 2026-06-05, 20 probes - see INV032. The lenient isAssignable above
	// keeps serving arguments/ternaries; UDTs, collections, void, and
	// unknown stay on it too (strictAssignApplies returns false for them).

	const STRICT_ASSIGN_BASES = new Set([
		"int",
		"float",
		"bool",
		"string",
		"color",
	]);

	// Strip the qualifier from either type format ("series<int>",
	// "series int", bare "int") and return the base type name.
	export function baseTypeName(type: string): string {
		return type
			.replace(/^(series|simple|const|input)\s+/, "")
			.replace(/^(series|simple|const|input)<(.+)>$/, "$2");
	}

	// True when the strict rule covers this pair: declared base is one of
	// the five primitives and the value side resolves to a primitive or na.
	export function strictAssignApplies(
		valueType: PineType,
		declaredBase: string,
	): boolean {
		if (!STRICT_ASSIGN_BASES.has(declaredBase)) return false;
		if (isNaType(valueType)) return true;
		return STRICT_ASSIGN_BASES.has(baseTypeName(valueType as string));
	}

	export function strictAssignOk(
		valueType: PineType,
		declaredBase: string,
	): boolean {
		if (isNaType(valueType)) return declaredBase !== "bool";
		const fromBase = baseTypeName(valueType as string);
		if (fromBase === declaredBase) return true;
		return fromBase === "int" && declaredBase === "float";
	}

	// Render an internal type for diagnostic messages: bracket-qualified
	// forms take TV's space form ("input<int>" -> "input int"), everything
	// else is unchanged. see INV040
	export function displayType(type: PineType | string): string {
		return String(type).replace(
			/^(series|simple|input|const)<(.+)>$/,
			"$1 $2",
		);
	}

	// Render a type the way TV's CE10173 declaration message does:
	// "series<float>" -> "series float"; a bare base (literal/const
	// expression) -> "const float"; na -> "simple na". see INV032
	export function renderQualifiedType(type: PineType): string {
		const t = type as string;
		if (isNaType(t as PineType)) return "simple na";
		const m = t.match(/^(series|simple|const|input)<(.+)>$/);
		if (m) return `${m[1]} ${m[2]}`;
		if (/^(series|simple|const|input)\s/.test(t)) return t;
		return `const ${t}`;
	}

	// Infer type from literal value. `raw` is the source lexeme: a JS
	// number can't distinguish `0.0`/`2e3` from `0`/`2000`, so whole-valued
	// float literals need the raw text to type as float. Typing `0.0` as
	// int was masked for years by the bidirectional int<->float coercion
	// above; the strict declaration rule exposed it. see INV032
	export function inferLiteralType(value: unknown, raw?: string): PineType {
		// Check for na first (it's stored as string "na" in the AST)
		if (value === "na") return "na";
		if (typeof value === "number") {
			if (raw && !/^0[xX]/.test(raw) && /[.eE]/.test(raw)) return "float";
			return Number.isInteger(value) ? "int" : "float";
		}
		if (typeof value === "boolean") return "bool";
		if (typeof value === "string") {
			// Hex color literals reach the AST as the bare lexeme (#RRGGBB /
			// #RRGGBBAA - the lexer admits exactly 6 or 8 hex digits), while
			// string literals keep their surrounding quotes in `value`, so the
			// `#` prefix is unambiguous here. Typing these as 'string' was the
			// root of the string-vs-color ternary FP cluster. see #18
			if (/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(value)) return "color";
			return "string";
		}
		return "unknown";
	}

	// Get result type of binary operation
	export function getBinaryOpType(
		left: PineType,
		right: PineType,
		operator: string,
	): PineType {
		left = canonicalizeQualifier(left);
		right = canonicalizeQualifier(right);
		// String concatenation with +
		if (operator === "+" && (isStringType(left) || isStringType(right))) {
			// String concatenation returns string (or series<string> if either is series)
			if (left.startsWith("series") || right.startsWith("series")) {
				return "series<string>";
			}
			return "string";
		}

		// Display-flag arithmetic (+ / -) yields a display value, e.g.
		// `display.all - display.status_line` is assignable to a `display` param.
		if (
			(operator === "+" || operator === "-") &&
			(isDisplayFlag(left) || isDisplayFlag(right))
		) {
			return "plot_display" as PineType;
		}

		// Arithmetic operators
		if (["+", "-", "*", "/", "%"].includes(operator)) {
			// If either is series, result is series
			if (left.startsWith("series") || right.startsWith("series")) {
				// If either is float, result is series<float>
				if (left.includes("float") || right.includes("float")) {
					return "series<float>";
				}
				return "series<int>";
			}
			// Non-series operands: preserve a simple qualifier when present so e.g.
			// simple<float> / int stays simple<float> instead of collapsing to bare
			// int. Float dominates int (mirrors the series branch above).
			if (left.startsWith("simple") || right.startsWith("simple")) {
				if (left.includes("float") || right.includes("float")) {
					return "simple<float>";
				}
				return "simple<int>";
			}
			if (left === "float" || right === "float") return "float";
			return "int";
		}

		// Comparison operators
		if (["<", ">", "<=", ">=", "==", "!="].includes(operator)) {
			if (left.startsWith("series") || right.startsWith("series")) {
				return "series<bool>";
			}
			return "bool";
		}

		// Logical operators
		if (["and", "or"].includes(operator)) {
			if (left.startsWith("series") || right.startsWith("series")) {
				return "series<bool>";
			}
			return "bool";
		}

		return "unknown";
	}

	// Check if types are compatible for operation
	export function areTypesCompatible(
		left: PineType,
		right: PineType,
		operator: string,
	): boolean {
		left = canonicalizeQualifier(left);
		right = canonicalizeQualifier(right);
		// If either type is unknown, we can't verify compatibility - assume OK
		// This prevents cascading false positives from user-defined functions
		// and other cases where type inference fails
		if (left === "unknown" || right === "unknown") {
			return true;
		}

		// Display-flag enums combine with + / - (and with int, being int-backed
		// bitmask values), e.g. `display.all - display.status_line`.
		if (
			(operator === "+" || operator === "-") &&
			(isDisplayFlag(left) || isDisplayFlag(right))
		) {
			const ok = (t: PineType) => isDisplayFlag(t) || isNumericType(t);
			if (ok(left) && ok(right)) return true;
		}

		// na can be compared/operated with any type
		if (isNaType(left) || isNaType(right)) {
			return true;
		}

		// String concatenation with +
		if (operator === "+" && (isStringType(left) || isStringType(right))) {
			// Both must be strings for string concatenation
			return isStringType(left) && isStringType(right);
		}

		// Arithmetic operators require numeric types
		if (["+", "-", "*", "/", "%"].includes(operator)) {
			const leftNumeric = isNumericType(left);
			const rightNumeric = isNumericType(right);
			return leftNumeric && rightNumeric;
		}

		// Comparison operators
		if (["<", ">", "<=", ">="].includes(operator)) {
			const leftNumeric = isNumericType(left);
			const rightNumeric = isNumericType(right);
			return leftNumeric && rightNumeric;
		}

		// Equality operators work on same types OR series<T> with T
		if (["==", "!="].includes(operator)) {
			// Allow exact type match
			if (left === right) return true;

			// Allow series<T> == T (Pine Script auto-promotes T to series<T>)
			if (areCompatibleForComparison(left, right)) return true;
			if (areCompatibleForComparison(right, left)) return true;

			// Allow assignability in either direction
			return isAssignable(left, right) || isAssignable(right, left);
		}

		// Logical operators require bool types only
		if (["and", "or"].includes(operator)) {
			return isBoolType(left) && isBoolType(right);
		}

		return false;
	}

	// Helper to check if series<T> and T are compatible for comparison
	function areCompatibleForComparison(
		seriesType: PineType,
		simpleType: PineType,
	): boolean {
		// series<int> comparisons
		if (seriesType === "series<int>" && simpleType === "int") return true;
		if (seriesType === "series<int>" && simpleType === "float") return true; // int can compare with float
		if (seriesType === "series<int>" && simpleType === "simple<int>")
			return true;
		if (seriesType === "series<int>" && simpleType === "simple<float>")
			return true;

		// series<float> comparisons
		if (seriesType === "series<float>" && simpleType === "float") return true;
		if (seriesType === "series<float>" && simpleType === "int") return true; // int coerces to float
		if (seriesType === "series<float>" && simpleType === "simple<int>")
			return true;
		if (seriesType === "series<float>" && simpleType === "simple<float>")
			return true;

		// series<bool> comparisons
		if (seriesType === "series<bool>" && simpleType === "bool") return true;
		if (seriesType === "series<bool>" && simpleType === "simple<bool>")
			return true;

		// series<string> comparisons
		if (seriesType === "series<string>" && simpleType === "string") return true;
		if (seriesType === "series<string>" && simpleType === "simple<string>")
			return true;

		// series<color> comparisons
		if (seriesType === "series<color>" && simpleType === "color") return true;
		if (seriesType === "series<color>" && simpleType === "simple<color>")
			return true;

		return false;
	}

	export function isNumericType(type: PineType): boolean {
		type = canonicalizeQualifier(type);
		return (
			type === "int" ||
			type === "float" ||
			type === "series<int>" ||
			type === "series<float>" ||
			type === "simple<int>" ||
			type === "simple<float>"
		);
	}

	export function isColorType(type: PineType): boolean {
		type = canonicalizeQualifier(type);
		return (
			type === "color" || type === "series<color>" || type === "simple<color>"
		);
	}

	export function isBoolType(type: PineType): boolean {
		type = canonicalizeQualifier(type);
		return (
			type === "bool" || type === "series<bool>" || type === "simple<bool>"
		);
	}

	export function isStringType(type: PineType): boolean {
		type = canonicalizeQualifier(type);
		return (
			type === "string" ||
			type === "series<string>" ||
			type === "simple<string>"
		);
	}

	// Legacy fallback for function return types
	// All data is now in pine-data/v6 - this should rarely be called
	export function getBuiltinReturnType(
		_functionName: string,
		_args: PineType[],
	): PineType {
		// Return unknown - the caller should use function signatures from pine-data
		// If we hit this, it means the function isn't in pine-data and should be added there
		return "unknown";
	}

	// Validate literal values
	export function validateLiteral(
		type: PineType,
		value: unknown,
	): { valid: boolean; message?: string } {
		switch (type) {
			case "int":
			case "series<int>":
				if (typeof value === "number" && Number.isInteger(value)) {
					return { valid: true };
				}
				return {
					valid: false,
					message: `Expected integer, got ${typeof value}`,
				};

			case "float":
			case "series<float>":
				if (typeof value === "number") {
					return { valid: true };
				}
				return {
					valid: false,
					message: `Expected number, got ${typeof value}`,
				};

			case "bool":
			case "series<bool>":
				if (typeof value === "boolean") {
					return { valid: true };
				}
				return {
					valid: false,
					message: `Expected boolean, got ${typeof value}`,
				};

			case "string":
			case "series<string>":
				if (typeof value === "string") {
					return { valid: true };
				}
				return {
					valid: false,
					message: `Expected string, got ${typeof value}`,
				};

			default:
				return { valid: true };
		}
	}
}
