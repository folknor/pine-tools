// Built-in function and constant data for Pine Script validation
// This module contains data about built-in functions, namespace properties, and validation rules

import {
	CONSTANTS_BY_NAME,
	FUNCTIONS_BY_NAME,
	type PineFunction,
	VARIABLES_BY_NAME,
} from "../../../../pine-data/v6";
import type { PineType } from "./types";

/**
 * Check if a function can only be called at the top level (not in local scopes).
 * Uses flags.topLevelOnly from pine-data.
 */
export function isTopLevelOnly(functionName: string): boolean {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	return func?.flags?.topLevelOnly === true;
}

// Build namespace properties from pine-data
function buildNamespaceProperties(): Record<string, PineType> {
	const props: Record<string, PineType> = {};

	// Import from CONSTANTS_BY_NAME
	for (const [name, constant] of CONSTANTS_BY_NAME) {
		props[name] = constant.type as PineType;
	}

	// Import from VARIABLES_BY_NAME (namespaced ones)
	for (const [name, variable] of VARIABLES_BY_NAME) {
		if (name.includes(".")) {
			props[name] = variable.type as PineType;
		}
	}

	return props;
}

// Namespace properties for property access type inference, built entirely
// from scraped pine-data. The former hand-coded additions (v4/v5 `input.*`
// type constants, `color.grey`, `color.transparent`) were removed: in v6 the
// `input.*` are functions (functions.json) and TV rejects the rest as
// undeclared identifiers, so every addition only suppressed a real v6 error.
// Pre-v6 leniency now comes from correct version detection + the existing
// `version === "6"` gates in the checker, not from masking these for all
// versions. see G004
export const NAMESPACE_PROPERTIES: Record<string, PineType> =
	buildNamespaceProperties();

// Build known namespaces from pine-data
function buildKnownNamespaces(): string[] {
	const namespaces = new Set<string>();

	// Extract namespace prefixes from functions, variables, and constants
	for (const name of FUNCTIONS_BY_NAME.keys()) {
		if (name.includes(".")) {
			namespaces.add(name.split(".")[0]);
		}
	}
	for (const name of VARIABLES_BY_NAME.keys()) {
		if (name.includes(".")) {
			namespaces.add(name.split(".")[0]);
		}
	}
	for (const name of CONSTANTS_BY_NAME.keys()) {
		if (name.includes(".")) {
			namespaces.add(name.split(".")[0]);
		}
	}

	return [...namespaces].sort();
}

// Known namespaces for property validation (derived from pine-data)
export const KNOWN_NAMESPACES = buildKnownNamespaces();

// Base names of generic builtin functions - the catalog keys carry the
// template suffix (`array.new<type>`, `map.new<type,type>`), but a call's
// callee is the bare `array.new` / `map.new`, so a plain
// functionSignatures.get(callee) misses. This set lets the checker
// recognise `array.new<float>()` etc. as real builtins. see INV053
function buildGenericFunctionBases(): Set<string> {
	const bases = new Set<string>();
	for (const name of FUNCTIONS_BY_NAME.keys()) {
		const lt = name.indexOf("<");
		if (lt > 0) bases.add(name.slice(0, lt));
	}
	return bases;
}
export const GENERIC_FUNCTION_BASES = buildGenericFunctionBases();

// Function signature interface
export interface FunctionSignature {
	name: string;
	parameters: ParameterInfo[];
	returns?: string;
}

export interface ParameterInfo {
	name: string;
	type?: PineType;
	optional?: boolean;
	defaultValue?: string;
}

/**
 * Map type string from pine-data to internal PineType.
 *
 * NOTE: This typeMap is intentionally separate from TypeChecker.normalizeType() because:
 * 1. This handles scraped API data normalization (e.g., "simple int" → "int")
 * 2. TypeChecker.normalizeType() handles runtime type comparison
 * 3. This strips qualifiers (const, input) that aren't tracked internally
 *
 * The typeMap normalizes various formats from TradingView's documentation:
 * - "series int" → "series<int>"
 * - "simple float" → "float" (simple qualifier stripped)
 * - "const bool" → "bool" (const qualifier stripped)
 * - "input int" → "int" (input qualifier stripped)
 */
const BUILTIN_SCALAR_TYPES = new Set([
	"int",
	"float",
	"bool",
	"string",
	"color",
	"line",
	"label",
	"box",
	"table",
	"void",
	"na",
]);

// Lowercase the inner type if it matches a built-in scalar; otherwise
// preserve the original casing so user-defined types like `POI` survive.
function normalizeInnerType(inner: string): string {
	const trimmed = inner.trim();
	const lower = trimmed.toLowerCase();
	if (BUILTIN_SCALAR_TYPES.has(lower)) return lower;
	return trimmed;
}

export function mapToPineType(typeStr?: string): PineType {
	if (!typeStr) return "unknown";

	const trimmed = typeStr.trim();
	const normalized = trimmed.toLowerCase();

	const typeMap: Record<string, PineType> = {
		int: "int",
		float: "float",
		bool: "bool",
		string: "string",
		color: "color",
		"series int": "series<int>",
		"series float": "series<float>",
		"series bool": "series<bool>",
		"series string": "series<string>",
		"series color": "series<color>",
		// Simple qualifier variants (simple means value doesn't change per bar)
		"simple int": "int",
		"simple float": "float",
		"simple bool": "bool",
		"simple string": "string",
		"simple color": "color",
		// Combined qualifiers
		"simple series int": "series<int>",
		"simple series float": "series<float>",
		"simple series bool": "series<bool>",
		"simple series string": "series<string>",
		"simple series color": "series<color>",
		// Input qualifier variants
		"input int": "int",
		"input float": "float",
		"input bool": "bool",
		"input string": "string",
		"input color": "color",
		// Const qualifier variants
		"const int": "int",
		"const float": "float",
		"const bool": "bool",
		"const string": "string",
		"const color": "color",
	};

	if (typeMap[normalized]) {
		return typeMap[normalized];
	}

	// For generic container types we match case-insensitively against the
	// original (case-preserved) string and normalize only the inner type
	// when it's a known built-in. This keeps user-defined type names like
	// `POI` from being silently lowercased to `poi`.

	const arrayMatch = trimmed.match(/^(?:simple\s+)?array<(\w+)>$/i);
	if (arrayMatch) {
		return `array<${normalizeInnerType(arrayMatch[1])}>` as PineType;
	}

	// `T[]` short form for `array<T>` (e.g. `float[]`, `int[]`). see INV004.
	const arraySuffixMatch = trimmed.match(/^(?:simple\s+)?(\w+)\[\]$/i);
	if (arraySuffixMatch) {
		return `array<${normalizeInnerType(arraySuffixMatch[1])}>` as PineType;
	}

	const matrixMatch = trimmed.match(/^(?:simple\s+)?matrix<(\w+)>$/i);
	if (matrixMatch) {
		return `matrix<${normalizeInnerType(matrixMatch[1])}>` as PineType;
	}

	const mapMatch = trimmed.match(/^(?:simple\s+)?map<(\w+),\s*(\w+)>$/i);
	if (mapMatch) {
		return `map<${normalizeInnerType(mapMatch[1])}, ${normalizeInnerType(mapMatch[2])}>` as PineType;
	}

	return "unknown";
}

// Map return type string to PineType
// Uses mapToPineType internally - this function exists for API clarity
export function mapReturnTypeToPineType(returnTypeStr: string): PineType {
	return mapToPineType(returnTypeStr);
}

// Build function signature from PineFunction
// Returns null on failure - caller should skip invalid entries.
// NOTE: Silent failure is intentional here. If pine-data contains malformed
// entries (e.g., from scraping errors), we skip them rather than crashing.
// The buildFunctionSignatures() caller handles null by not adding to the map.
export function buildSignatureFromPineFunction(
	name: string,
	func: PineFunction,
): FunctionSignature | null {
	try {
		const parameters: ParameterInfo[] = [];

		// Use the parameters array from PineFunction
		for (const param of func.parameters) {
			parameters.push({
				name: param.name,
				type: mapToPineType(param.type),
				optional: !param.required,
				defaultValue: param.default,
			});
		}

		return {
			name,
			parameters,
			returns: func.returns || undefined,
		};
	} catch (_e) {
		return null;
	}
}

// Build all function signatures from pine-data
export function buildFunctionSignatures(): Map<string, FunctionSignature> {
	const signatures = new Map<string, FunctionSignature>();

	for (const [name, func] of FUNCTIONS_BY_NAME) {
		const sig = buildSignatureFromPineFunction(name, func);
		if (sig) {
			signatures.set(name, sig);
		}
	}

	return signatures;
}

// Check if a function is variadic (accepts variable number of arguments)
export function isVariadicFunction(functionName: string): boolean {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	return func?.flags?.variadic === true;
}

// Get minimum required arguments for variadic functions
export function getMinArgsForVariadic(functionName: string): number {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	if (func?.flags?.minArgs !== undefined) {
		return func.flags.minArgs;
	}
	// Default: require at least the number of required parameters
	if (func) {
		return func.parameters.filter((p) => p.required).length;
	}
	return 1;
}

// Check if a function is polymorphic (return type depends on input)
export function getPolymorphicType(functionName: string): string | undefined {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	return func?.flags?.polymorphic;
}

// Check if a function's return type follows one of its parameters
// (flags.returnTypeParam, e.g. ta.valuewhen -> source). Such a function's
// static `returns` is frozen to overload #0 and must not be used as a
// fallback when the determining argument can't be typed. see #18
export function hasReturnTypeParam(functionName: string): boolean {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	return func?.flags?.returnTypeParam !== undefined;
}

// Check if a function has overloads (detected by having parameters with unknown type)
// Functions with overloads have merged parameters from all overloads, some with type "unknown"
export function hasOverloads(functionName: string): boolean {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	if (!func) return false;
	return func.parameters.some((p) => p.type === "unknown");
}

// Whether the function ships per-overload signatures (the overloads[] field -
// distinct from hasOverloads' unknown-typed-param heuristic). Used to gate
// checks that are only sound against a single signature, e.g. missing-arg
// enforcement: the INV050 probe enumerates TV's preferred overload only
// (label.new -> point), and a call may satisfy a different overload (x/y).
export function hasOverloadSignatures(functionName: string): boolean {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	return (func?.overloads?.length ?? 0) > 1;
}

// The required-param NAME list of the overload with the FEWEST required
// params (ties -> first). This is the arity floor: a call providing fewer
// args than this list's length can satisfy NO overload, so it is a sound
// CE10165 even though the blanket missing-arg check skips overloaded
// functions. Measuring against the minimal overload's OWN param order (not
// the merged order) is what keeps it correct across overloads of different
// arity: ta.highest(10) reads as the 1-arg `ta.highest(length)` form and is
// NOT flagged, while matrix.sum(m) (both overloads need id1+id2) flags the
// missing id2. label.new stays safe too - its point overload needs only
// `point`, so the floor is 1 and the x/y form is never under-supplied.
// see INV056
export function getMinimalRequiredParams(functionName: string): string[] {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	const overloads = func?.overloads;
	if (!overloads || overloads.length === 0) return [];
	let best: string[] | null = null;
	for (const ov of overloads) {
		const required = ov.parameters.filter((p) => p.required).map((p) => p.name);
		if (best === null || required.length < best.length) best = required;
	}
	return best ?? [];
}

// Argument info for polymorphic return type inference
export interface ArgumentInfo {
	name?: string; // Named argument name (undefined for positional)
	type: PineType;
}

// Get the return type for a polymorphic function based on argument types.
// Supports both positional and named arguments.
export function getPolymorphicReturnType(
	functionName: string,
	argTypes: PineType[],
	argInfos?: ArgumentInfo[],
): PineType | null {
	// Resolve a return-follows-source param from the generated
	// flags.returnTypeParam (the single source - detected offline from the
	// overload dump, with a small override map; see union-types.ts / generate.ts
	// RETURN_TYPE_PARAM_OVERRIDES; e.g. ta.valuewhen -> source, input -> defval).
	// Without this, such functions fall back to the static return frozen to
	// overload #0 (color). see TODO #17.
	const returnTypeParam = FUNCTIONS_BY_NAME.get(functionName)?.flags
		?.returnTypeParam as string | undefined;

	if (returnTypeParam) {
		// Find the argument that determines return type
		let determiningType: PineType | null = null;

		if (argInfos && argInfos.length > 0) {
			// First, check for named argument matching returnTypeParam
			const namedArg = argInfos.find((arg) => arg.name === returnTypeParam);
			if (namedArg) {
				determiningType = namedArg.type;
			} else {
				// Fall back to positional: find position of returnTypeParam in function signature
				const func = FUNCTIONS_BY_NAME.get(functionName);
				if (func) {
					const paramIndex = func.parameters.findIndex(
						(p) => p.name === returnTypeParam,
					);
					if (paramIndex >= 0 && paramIndex < argInfos.length) {
						// Only use positional if no named args before this position
						const positionalArgs = argInfos.filter((a) => !a.name);
						if (paramIndex < positionalArgs.length) {
							determiningType = positionalArgs[paramIndex].type;
						}
					}
				}
			}
		} else if (argTypes.length > 0) {
			// Legacy: use first argument if no argInfos provided
			// This maintains backward compatibility
			const func = FUNCTIONS_BY_NAME.get(functionName);
			if (func) {
				const paramIndex = func.parameters.findIndex(
					(p) => p.name === returnTypeParam,
				);
				if (paramIndex >= 0 && paramIndex < argTypes.length) {
					determiningType = argTypes[paramIndex];
				} else {
					// Default to first argument
					determiningType = argTypes[0];
				}
			} else {
				determiningType = argTypes[0];
			}
		}

		// "type" is our placeholder for an unresolved / user-defined-type arg -
		// treat it like "unknown" and fall through to the static return rather
		// than propagating "type" into downstream arithmetic (avoids FPs like
		// `math.abs(<unresolved>) % 2`).
		if (
			determiningType &&
			determiningType !== "unknown" &&
			(determiningType as string) !== "type"
		) {
			return determiningType;
		}
	}

	// Fall back to flags-based polymorphic handling from pine-data
	const polyType = getPolymorphicType(functionName);
	if (!polyType || argTypes.length === 0) {
		return null;
	}

	const firstArgType = argTypes[0];

	switch (polyType) {
		case "input":
			// Returns the same type as the first argument
			// e.g., nz(float) -> float, nz(int) -> int
			return firstArgType !== "unknown" ? firstArgType : null;

		case "element": {
			// Returns the element type of an array
			// e.g., array.get(array<float>) -> float
			if (firstArgType === "unknown") return null;
			// If it's an array type like "array<float>", extract the element type
			const arrayMatch = firstArgType.match(/array<(.+)>/);
			if (arrayMatch) {
				return arrayMatch[1] as PineType;
			}
			// For series types, return the base type
			const seriesMatch = firstArgType.match(/series<(.+)>/);
			if (seriesMatch) {
				return `series<${seriesMatch[1]}>` as PineType;
			}
			return firstArgType;
		}

		case "numeric":
			// Returns the same numeric type (int stays int, float stays float)
			// If any arg is float, result is float; otherwise int. Compare
			// BASES so qualifier-wrapped numerics (input<int> from input.*
			// calls) keep their int-ness instead of hitting the float
			// fallback. see INV040
			if (firstArgType === "unknown") return null;
			for (const argType of argTypes) {
				if (baseOfRawType(String(argType)) === "float") {
					return String(argType).includes("series<")
						? "series<float>"
						: "float";
				}
			}
			if (baseOfRawType(String(firstArgType)) === "int") {
				return firstArgType;
			}
			// For other numeric types, return float as safe default
			return String(firstArgType).includes("series<")
				? "series<float>"
				: "float";

		default:
			return null;
	}
}

// ===========================================================================
// const-argument enforcement (INV014)
//
// Some built-in params require a COMPILE-TIME CONSTANT argument: TV rejects a
// non-const value with CE10123 ("a const X is expected"). Our internal type
// model strips the const/simple/input qualifier (mapToPineType collapses them
// all to the base type), so the ordinary assignability check can't see the
// violation. These helpers read the RAW qualifier straight from pine-data so
// the checker can enforce it. Verified against `pine-lint --tv` - see
// investigations/INV014 (and the G002 correction: TV does enforce plot(title)).
// ===========================================================================

const CONST_SCALAR_BASES = new Set(["int", "float", "bool", "string", "color"]);
const QUALIFIER_RANK: Record<string, number> = {
	const: 0,
	input: 1,
	simple: 2,
	series: 3,
};

// Leading qualifier of a raw pine-data OR internal type string. "const int" ->
// "const", "series<int>" -> "series", "int" -> undefined.
function leadingQualifier(type: string): string | undefined {
	const m = type.trim().match(/^(const|input|simple|series)\b/);
	return m ? m[1] : undefined;
}

function qrank(q: string | undefined): number {
	return q ? (QUALIFIER_RANK[q] ?? 0) : 0;
}

// Base type with any qualifier stripped. Handles space form ("const int" ->
// "int"), bracket form ("series<int>" -> "int"), unions ("const int/float" ->
// "int/float"), and the bare scalar ("int" -> "int").
function baseOfRawType(type: string): string {
	const s = type.trim();
	const bracket = s.match(/^(?:const|input|simple|series)<(.+)>$/);
	if (bracket) return bracket[1].trim();
	return s.replace(/^(const|input|simple|series)\s+/, "").trim();
}

// Does a param of this raw type STRICTLY require a const argument? Structural,
// data-derived:
//  - must be `const` qualified,
//  - base must be a plain scalar or a union of scalars (int/float, int/string),
//  - enumerated bases (plot_display, scale_type, enum) are excluded - those are
//    governed by allowedValues, not const-ness,
//  - blobs that also accept non-const forms are excluded (input()'s
//    "const ... or source-type built-ins").
export function typeRequiresConst(rawType: string): boolean {
	const t = rawType.trim();
	if (!/^const\b/.test(t)) return false;
	if (/\bor\b/.test(t) || /source/i.test(t)) return false;
	return baseOfRawType(t)
		.split("/")
		.every((b) => CONST_SCALAR_BASES.has(b.trim()));
}

interface OverloadView {
	parameters: Array<{ name: string; type: string }>;
	returns: string;
}

function overloadViews(func: PineFunction): OverloadView[] {
	if (func.overloads && func.overloads.length > 0) {
		return func.overloads as OverloadView[];
	}
	return [{ parameters: func.parameters, returns: func.returns }];
}

// Tuple-return shapes for a builtin call: every overload whose `returns` is a
// bracketed tuple ("[series float, series float]"), parsed into element type
// strings. The merged top-level `returns` is frozen to overload #0, so
// ta.vwap's tuple form lives only in its second overload - consulting the
// merged view alone reads it as scalar. All current catalog tuples are flat
// comma-separated scalars (ta.bb/dmi/kc/macd/supertrend/vwap), so a plain
// comma split is sound. see TODO #51.
export function builtinTupleReturns(functionName: string): string[][] {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	if (!func) return [];
	const shapes: string[][] = [];
	for (const ov of overloadViews(func)) {
		const r = (ov.returns || "").trim();
		if (!r.startsWith("[") || !r.endsWith("]")) continue;
		const elems = r
			.slice(1, -1)
			.split(",")
			.map((s) => s.trim())
			.filter(Boolean);
		if (elems.length > 1) shapes.push(elems);
	}
	return shapes;
}

// A param requires const iff it appears in >=1 overload and EVERY overload that
// contains it types it const-required. If any overload accepts it non-const
// (e.g. timestamp's series-string dateString overload), TV can resolve to that
// overload, so we must not flag. Param-name based, so no full call resolution
// is needed - sound for the qualifier question.
export function paramRequiresConst(
	functionName: string,
	paramName: string,
): boolean {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	if (!func) return false;
	let seen = false;
	for (const ov of overloadViews(func)) {
		const p = ov.parameters.find((x) => x.name === paramName);
		if (!p) continue;
		seen = true;
		if (!typeRequiresConst(p.type)) return false;
	}
	return seen;
}

// Positional counterpart of paramRequiresConst. A POSITIONAL argument's param
// is ambiguous across overloads with different shapes (e.g. fill's color-form vs
// value-form), so map by INDEX only among overloads whose arity could match the
// call (>= positionalCount params), and require unanimous agreement: every such
// overload must have a const-required param with the SAME name at that index.
// Otherwise TV could resolve to a lenient overload, so we must not flag.
// Returns the param name + raw const type to quote, or null to skip.
export function positionalConstParam(
	functionName: string,
	index: number,
	positionalCount: number,
): { name: string; docType: string } | null {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	if (!func) return null;
	const views = overloadViews(func);
	const candidates = views.filter(
		(ov) => ov.parameters.length >= positionalCount,
	);
	const pool = candidates.length > 0 ? candidates : views;
	let name: string | undefined;
	let docType: string | undefined;
	for (const ov of pool) {
		const p = ov.parameters[index];
		if (!p || !typeRequiresConst(p.type)) return null;
		if (name === undefined) {
			name = p.name;
			docType = p.type;
		} else if (name !== p.name) {
			return null;
		}
	}
	return name !== undefined && docType !== undefined ? { name, docType } : null;
}

// The raw const type to quote in the CE10123 message (e.g. "const int"), taken
// from the first overload that documents the param. Assumes paramRequiresConst
// already returned true.
export function getConstParamDocType(
	functionName: string,
	paramName: string,
): string | undefined {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	if (!func) return undefined;
	for (const ov of overloadViews(func)) {
		const p = ov.parameters.find((x) => x.name === paramName);
		if (p) return p.type;
	}
	return undefined;
}

// Scalar base members of a union param type ("series int/float/color" ->
// ["int","float","color"]). null unless it's a union (contains "/") of plain
// scalars - we only validate clean scalar unions, never containers/objects/
// genuine "unknown". The merged param type is already the union across overloads
// (union-types.ts), so this set is exactly what TV accepts at that param. INV016.
export function getScalarUnionMembers(rawType: string): string[] | null {
	const base = baseOfRawType(rawType);
	if (!base.includes("/")) return null;
	const members = base.split("/").map((s) => s.trim());
	return members.every((m) => CONST_SCALAR_BASES.has(m)) ? members : null;
}

export function namedParamUnionMembers(
	functionName: string,
	paramName: string,
): string[] | null {
	const p = FUNCTIONS_BY_NAME.get(functionName)?.parameters.find(
		(x) => x.name === paramName,
	);
	return p ? getScalarUnionMembers(p.type) : null;
}

export function positionalParamUnionMembers(
	functionName: string,
	index: number,
): string[] | null {
	const p = FUNCTIONS_BY_NAME.get(functionName)?.parameters[index];
	return p ? getScalarUnionMembers(p.type) : null;
}

// Qualifier + base of a built-in VARIABLE (close -> series/float,
// syminfo.tickerid -> simple/string). Used to decide whether a bare/member
// reference is a non-const argument. Undefined for non-builtins.
export function getBuiltinVarInfo(
	name: string,
): { qualifier: string; base: string } | undefined {
	const v = VARIABLES_BY_NAME.get(name);
	if (!v) return undefined;
	return { qualifier: v.qualifier, base: baseOfRawType(String(v.type)) };
}

// A built-in CONSTANT (color.red, display.none, barmerge.gaps_off) - these are
// const-qualified by definition.
export function isBuiltinConstant(name: string): boolean {
	return CONSTANTS_BY_NAME.has(name);
}

function baseCompatible(argBase: string, paramBase: string): boolean {
	if (!paramBase || /unknown|\bany\b/.test(paramBase)) return true;
	if (argBase === "unknown" || argBase === "na") return true;
	const numeric = (x: string) => x === "int" || x === "float";
	for (const pb of paramBase.split("/").map((s) => s.trim())) {
		if (pb === argBase) return true;
		if (numeric(argBase) && numeric(pb)) return true;
	}
	return false;
}

// Resolve the RAW return type (with qualifier, e.g. "simple int") of a built-in
// call, accounting for overloads - the merged top-level `returns` is frozen to
// overload #0 and loses this. Used to decide whether a call ARGUMENT is const:
// timestamp("UTC", y, m, d, ...) resolves to the timezone overload -> simple int
// (not the const-int dateString overload). Positional matching only; returns
// undefined for unknown/user functions.
export function resolveCallReturnRaw(
	functionName: string,
	argTypes: PineType[],
): string | undefined {
	const func = FUNCTIONS_BY_NAME.get(functionName);
	if (!func) return undefined;
	const views = overloadViews(func);
	const argBases = argTypes.map((t) => baseOfRawType(String(t)));
	const anySeriesArg = argTypes.some(
		(t) => leadingQualifier(String(t)) === "series",
	);

	const candidates = views.filter((ov) => {
		if (argBases.length > ov.parameters.length) return false;
		for (let i = 0; i < argBases.length; i++) {
			if (!baseCompatible(argBases[i], baseOfRawType(ov.parameters[i].type))) {
				return false;
			}
		}
		return true;
	});
	const pool = candidates.length > 0 ? candidates : views;

	// With const/simple args, TV picks the lowest-qualifier matching overload.
	let best = pool[0].returns;
	for (const ov of pool) {
		if (qrank(leadingQualifier(ov.returns)) < qrank(leadingQualifier(best))) {
			best = ov.returns;
		}
	}
	// A series argument forces at least a series result.
	if (anySeriesArg && qrank(leadingQualifier(best)) < qrank("series")) {
		const ser = pool.find((ov) => leadingQualifier(ov.returns) === "series");
		best = ser
			? ser.returns
			: best.replace(/^(const|input|simple)\b/, "series");
	}
	return best;
}
