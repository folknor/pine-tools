#!/usr/bin/env -S node --experimental-strip-types

/**
 * Pine Script Data Generator
 *
 * Generates TypeScript data files from scraped Pine Script documentation.
 * Produces a clean, LSP-optimized data structure.
 *
 * Usage: node --experimental-strip-types packages/pipeline/src/generate.ts [version]
 * Default version: v6
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { detectReturnTypeParam, unionOverloadParams } from "./union-types.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve paths relative to project root
const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../..")
	: path.resolve(__dirname, "../../..");

const VERSION = process.argv[2] || "v6";
const RAW_DIR = path.join(PROJECT_ROOT, `pine-data/raw/${VERSION}`);
const OUTPUT_DIR = path.join(PROJECT_ROOT, `pine-data/${VERSION}`);

// Input files
const DETAILS_FILE = path.join(RAW_DIR, "complete-v6-details.json");
const CONSTRUCTS_FILE = path.join(RAW_DIR, "v6-language-constructs.json");

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

interface Parameter {
	name: string;
	type: string;
	description: string;
	optional?: boolean;
	required?: boolean;
	default?: string;
}

interface FunctionDetail {
	name: string;
	syntax: string;
	description: string;
	parameters: Parameter[];
	returns: string;
	examples?: string[];
	namespace?: string;
	category?: string;
	overloads?: string[];
	variadic?: boolean;
	overloadArgs?: Array<Array<{ name: string; type: string }>>;
}

interface GeneratedFunction {
	name: string;
	namespace?: string;
	syntax: string;
	description: string;
	parameters: Array<{
		name: string;
		type: string;
		description: string;
		required: boolean;
		default?: string;
	}>;
	returns: string;
	flags?: Record<string, unknown>;
	overloads?: Array<{
		parameters: Array<{
			name: string;
			type: string;
			description: string;
			required: boolean;
		}>;
		returns: string;
	}>;
	examples?: string[];
}

interface GeneratedVariable {
	name: string;
	namespace?: string;
	type: string;
	qualifier: string;
	description: string;
}

interface GeneratedConstant {
	name: string;
	namespace: string;
	shortName: string;
	type: string;
}

interface ScrapedMember {
	name: string;
	type: string;
	description: string;
	namespace: string;
}

interface DetailsData {
	functions: Record<string, FunctionDetail>;
	variables?: Record<string, ScrapedMember>;
	constants?: Record<string, ScrapedMember>;
}

interface ConstructsData {
	keywords?: { items?: string[] };
	builtInVariables?: {
		standalone?: { items?: string[] };
		byNamespace?: Record<string, string[]>;
	};
	constants?: { byNamespace?: Record<string, string[]> };
}

// =============================================================================
// TYPE INFERENCE HELPERS
// =============================================================================

// Parse TV's qualified type string (e.g. "series float", "simple string",
// "array<line>") into our { type, qualifier } shape. Scalars become
// `qualifier<base>` (e.g. series<float>); collections keep their literal form
// and are treated as series.
function parseQualifiedType(raw: string): { type: string; qualifier: string } {
	const s = (raw || "").trim();
	const m = s.match(/^(series|simple|input|const)\s+(.+)$/);
	if (m) {
		const qualifier = m[1];
		const base = m[2].trim();
		return { qualifier, type: `${qualifier}<${base}>` };
	}
	// Collection (array<…>/matrix<…>/map<…>) or otherwise unqualified.
	return { qualifier: "series", type: s };
}

// Variables whose TV detail page exposes no machine-readable "Type" field.
// Empty by design — populate only if the scrape surfaces such cases.
const VARIABLE_TYPE_OVERRIDES: Record<
	string,
	{ type: string; qualifier: string }
> = {};

// Strip TV's leading qualifier ("const color" -> "color", "const
// plot_simple_display" -> "plot_simple_display") to the bare base type used by
// the constants table. Replaces the old inferConstantType namespace-guess.
function constantBaseType(raw: string): string {
	return (raw || "").trim().replace(/^(const|input|simple|series)\s+/, "");
}

// Constants whose TV detail page exposes no machine-readable "Type" field.
// Empty by design — populate only if the scrape surfaces such cases.
const CONSTANT_TYPE_OVERRIDES: Record<string, string> = {};

// Function params (`<fn>.<param>`) that TV's LINTER accepts more broadly than
// its REFERENCE documents. These can't be scraped (the extra types aren't in the
// reference at all), so we bake the TV-verified set into the generated JSON here.
// All entries verified with `pine-lint --tv` on 2026-05-28 (see gotchas/G001 and
// INV009): every "FN" INV009 attributed to these calls is actually TV-accepted,
// so the values below are the true accepted sets, not guesses.
//   - na-handling family: `nz`/`fixnan` reference only int/float/color, but the
//     linter also accepts bool and string. (`na` is universal → "unknown" via
//     the overload-union rule already.)
//   - `int(<bool>)` is accepted (bool->int); `plot(title=<series string>)` is
//     accepted (title need not be const).
const FUNCTION_PARAM_TYPE_OVERRIDES: Record<string, string> = {
	"nz.source": "series int/float/bool/string/color",
	"nz.replacement": "series int/float/bool/string/color",
	"fixnan.source": "series int/float/bool/string/color",
	"int.x": "series int/float/bool",
	"plot.title": "series string",
};

function getFunctionFlags(name: string): Record<string, unknown> | undefined {
	const flags: Record<string, unknown> = {};

	// Top-level only functions
	const topLevelOnly = [
		"indicator",
		"strategy",
		"library",
		"plot",
		"plotshape",
		"plotchar",
		"plotcandle",
		"plotbar",
		"plotarrow",
		"bgcolor",
		"barcolor",
		"fill",
		"hline",
		"alertcondition",
	];
	if (topLevelOnly.includes(name)) {
		flags.topLevelOnly = true;
	}

	// Variadic functions
	const variadic: Record<string, { minArgs: number }> = {
		"math.max": { minArgs: 2 },
		"math.min": { minArgs: 2 },
		"math.avg": { minArgs: 2 },
		"math.sum": { minArgs: 1 },
		"array.from": { minArgs: 1 },
		"str.format": { minArgs: 1 },
	};
	if (variadic[name]) {
		flags.variadic = true;
		flags.minArgs = variadic[name].minArgs;
	}

	// Polymorphic functions
	const polymorphic: Record<string, string> = {
		nz: "input",
		fixnan: "input",
		"array.get": "element",
		"array.first": "element",
		"array.last": "element",
		"array.pop": "element",
		"array.remove": "element",
		"array.shift": "element",
		"array.max": "element",
		"array.min": "element",
		"array.avg": "element",
		"array.sum": "element",
		"array.median": "element",
		"array.mode": "element",
		"array.stdev": "element",
		"array.variance": "element",
		"math.abs": "numeric",
		"math.sign": "numeric",
		"math.max": "numeric",
		"math.min": "numeric",
		"math.avg": "numeric",
		"math.sum": "numeric",
		"math.round": "numeric",
		"math.floor": "numeric",
		"math.ceil": "numeric",
	};
	if (polymorphic[name]) {
		flags.polymorphic = polymorphic[name];
	}

	return Object.keys(flags).length > 0 ? flags : undefined;
}

// =============================================================================
// GENERATORS
// =============================================================================

function isParameterOptional(param: Parameter): boolean {
	if (param.optional === true) return true;

	const desc = (param.description || "").toLowerCase();
	if (desc.includes("optional")) return true;
	if (desc.includes("if not specified")) return true;
	if (desc.includes("default value is")) return true;
	if (desc.includes("default is")) return true;
	if (desc.includes("the default is")) return true;
	if (desc.includes("defaults to")) return true;
	if (desc.includes("if omitted")) return true;
	if (desc.includes("not required")) return true;

	if (param.default !== undefined) return true;

	const commonOptionalParams = [
		"text",
		"textcolor",
		"color",
		"bgcolor",
		"bordercolor",
		"offset",
		"show_last",
		"editable",
		"display",
		"format",
		"precision",
		"size",
		"location",
		"style",
		"force_overlay",
		"tooltip",
		"inline",
		"group",
		"confirm",
		"options",
		"minval",
		"maxval",
		"step",
		"xloc",
		"yloc",
		"overlay",
		"format",
		"scale",
		"max_bars_back",
		"max_lines_count",
		"max_labels_count",
		"max_boxes_count",
		"max_polylines_count",
		"timeframe",
		"timeframe_gaps",
		"explicit_plot_zorder",
		"precision",
		"shorttitle",
		"trackprice",
		"histbase",
		"join",
		"linewidth",
		"linestyle",
		"transp",
		"show_last",
	];
	if (commonOptionalParams.includes(param.name)) {
		if (desc.includes("required argument") || desc.includes("is required")) {
			return false;
		}
		return true;
	}

	if (param.required === false) return true;

	return false;
}

// Parse the return type out of an overload signature string, e.g.
// "math.round(number, precision) → series float" -> "series float".
function parseReturnFromSignature(sig: string): string {
	const m = sig.match(/→\s*(.+)$/);
	return m ? m[1].trim() : "";
}

// Parse the parameter names out of a signature, e.g.
// "ta.sma(source, length) → ..." -> ["source", "length"]. Drops the "..."
// variadic marker. Used only as a fallback when overloadArgs is empty.
function parseParamNamesFromSignature(sig: string): string[] {
	const m = sig.match(/^[^(]+\(([^)]*)\)/);
	if (!m) return [];
	return m[1]
		.split(",")
		.map((s) => s.trim())
		.filter((s) => s && s !== "...");
}

// Build the per-overload signature list for an overloaded function from the
// scraped dump. Each overload carries its EXACT (non-unioned) param types from
// `overloadArgs` and its own return type from the overload signature string —
// detail the merged top-level fields flatten away. Returns undefined for
// non-overloaded functions (the merged view fully describes them).
//
// description/required are looked up from the merged param list by name, so
// params that appear only in a later overload currently get an empty
// description (recovering those from the DOM mirror is a follow-up; see TODO
// #25). Per-overload types are kept RAW (no FUNCTION_PARAM_TYPE_OVERRIDES) so
// each overload faithfully reflects what TV's reference documents for it.
function buildOverloads(
	detail: FunctionDetail,
): GeneratedFunction["overloads"] {
	const sigs = detail.overloads;
	if (!sigs || sigs.length < 2) return undefined;

	const merged = new Map((detail.parameters || []).map((p) => [p.name, p]));
	const overloadArgs = detail.overloadArgs || [];

	return sigs.map((sig, i) => {
		const args =
			overloadArgs[i] && overloadArgs[i].length > 0
				? overloadArgs[i]
				: parseParamNamesFromSignature(sig).map((name) => ({
						name,
						type: "unknown",
					}));
		return {
			parameters: args.map(({ name, type }) => {
				const m = merged.get(name);
				return {
					name,
					type,
					description: m?.description || "",
					required: m ? !isParameterOptional(m) : true,
				};
			}),
			returns: parseReturnFromSignature(sig),
		};
	});
}

function generateFunctions(
	details: DetailsData,
	_constructs: ConstructsData,
): GeneratedFunction[] {
	console.log("Generating functions.ts...");

	const functions: GeneratedFunction[] = [];

	for (const [name, detail] of Object.entries(details.functions || {})) {
		if (!detail) continue;

		const namespace = name.includes(".") ? name.split(".")[0] : undefined;
		const flags = getFunctionFlags(name) ?? {};

		// Propagate the scraped variadic flag. TV signatures like
		// `log.info(formatString, arg0, arg1, ...)` are variadic but aren't in
		// getFunctionFlags's hardcoded list; honor the flag the scrape detected
		// from the "..." overload so the checker doesn't cap their arity.
		if (detail.variadic && !flags.variadic) {
			flags.variadic = true;
			const requiredCount = (detail.parameters || []).filter(
				(p) => !isParameterOptional(p),
			).length;
			flags.minArgs = Math.max(1, requiredCount);
		}

		// Detect return-follows-source functions from the overload dump (offline)
		// so the checker infers their return from the actual argument instead of
		// the static return frozen to overload #0 (e.g. ta.valuewhen, which is
		// otherwise stuck at "series color"). See union-types.ts / TODO #17.
		const returnTypeParam = detectReturnTypeParam(detail);
		if (returnTypeParam) {
			flags.returnTypeParam = returnTypeParam;
		}

		// Union per-param types across overloads from the captured overloadArgs
		// dump (offline; see union-types.ts). Only params present in every
		// overload are unioned — others keep their scraped type.
		const unionedParams = unionOverloadParams(detail);
		const parameters = (detail.parameters || []).map((p) => ({
			name: p.name,
			type:
				FUNCTION_PARAM_TYPE_OVERRIDES[`${name}.${p.name}`] ??
				unionedParams.get(p.name) ??
				p.type ??
				"unknown",
			description: p.description || "",
			required: !isParameterOptional(p),
			default: p.default,
		}));

		const func: GeneratedFunction = {
			name,
			namespace,
			syntax: detail.syntax || `${name}()`,
			description: detail.description || "",
			parameters,
			returns: detail.returns || "void",
			flags: Object.keys(flags).length > 0 ? flags : undefined,
			overloads: buildOverloads(detail),
			examples: detail.examples,
		};

		functions.push(func);
	}

	const content = `/**
 * Pine Script ${VERSION.toUpperCase()} Functions
 * Auto-generated from TradingView documentation
 * Generated: ${new Date().toISOString()}
 * Total: ${functions.length} functions
 */

import type { PineFunction } from "../schema/types";

/**
 * All ${VERSION} functions as an array
 */
export const FUNCTIONS: PineFunction[] = ${JSON.stringify(functions, null, 2)};

/**
 * Functions indexed by name for O(1) lookup
 */
export const FUNCTIONS_BY_NAME: Map<string, PineFunction> = new Map(
	FUNCTIONS.map(f => [f.name, f])
);

/**
 * Functions grouped by namespace
 */
export const FUNCTIONS_BY_NAMESPACE: Map<string, PineFunction[]> = (() => {
	const map = new Map<string, PineFunction[]>();
	for (const f of FUNCTIONS) {
		const ns = f.namespace || "_global";
		if (!map.has(ns)) map.set(ns, []);
		map.get(ns)!.push(f);
	}
	return map;
})();

/**
 * All function names as a Set for fast membership check
 */
export const FUNCTION_NAMES: Set<string> = new Set(FUNCTIONS.map(f => f.name));

/**
 * All namespace names that have functions
 */
export const FUNCTION_NAMESPACES: Set<string> = new Set(
	FUNCTIONS.filter(f => f.namespace).map(f => f.namespace!)
);
`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "functions.ts"), content);
	console.log(`   ${functions.length} functions`);
	return functions;
}

function generateVariables(
	details: DetailsData,
	constructs: ConstructsData,
): GeneratedVariable[] {
	console.log("Generating variables.ts...");

	const variables: GeneratedVariable[] = [];

	// Build the authoritative name list from the crawl (standalone + namespaced
	// members), then resolve each variable's type from the scrape. The old
	// hand-maintained `namespaceVars` array and `inferVariableType()` heuristics
	// are retired — TV's "Type" field is the source of truth now.
	const names: string[] = [
		...(constructs.builtInVariables?.standalone?.items || []),
	];
	const byNamespace = constructs.builtInVariables?.byNamespace || {};
	for (const [namespace, members] of Object.entries(byNamespace)) {
		for (const member of members) {
			names.push(`${namespace}.${member}`);
		}
	}

	const scraped = details.variables || {};
	const missingType: string[] = [];

	for (const name of [...new Set(names)].sort()) {
		const sv = scraped[name];
		let typeInfo: { type: string; qualifier: string };
		if (sv?.type) {
			typeInfo = parseQualifiedType(sv.type);
		} else if (VARIABLE_TYPE_OVERRIDES[name]) {
			typeInfo = VARIABLE_TYPE_OVERRIDES[name];
		} else {
			missingType.push(name);
			typeInfo = { type: "series<float>", qualifier: "series" };
		}
		variables.push({
			name,
			namespace: name.includes(".") ? name.split(".")[0] : undefined,
			type: typeInfo.type,
			qualifier: typeInfo.qualifier,
			description: sv?.description || `Built-in variable: ${name}`,
		});
	}

	if (missingType.length > 0) {
		console.warn(
			`   ⚠ ${missingType.length} variable(s) lacked a scraped Type; defaulted to series<float>: ${missingType.join(", ")}`,
		);
	}

	const content = `/**
 * Pine Script ${VERSION.toUpperCase()} Built-in Variables
 * Auto-generated from TradingView documentation
 * Generated: ${new Date().toISOString()}
 * Total: ${variables.length} variables
 */

import type { PineVariable } from "../schema/types";

/**
 * All ${VERSION} built-in variables
 */
export const VARIABLES: PineVariable[] = ${JSON.stringify(variables, null, 2)};

/**
 * Variables indexed by name for O(1) lookup
 */
export const VARIABLES_BY_NAME: Map<string, PineVariable> = new Map(
	VARIABLES.map(v => [v.name, v])
);

/**
 * Variables grouped by namespace
 */
export const VARIABLES_BY_NAMESPACE: Map<string, PineVariable[]> = (() => {
	const map = new Map<string, PineVariable[]>();
	for (const v of VARIABLES) {
		const ns = v.namespace || "_standalone";
		if (!map.has(ns)) map.set(ns, []);
		map.get(ns)!.push(v);
	}
	return map;
})();

/**
 * All variable names as a Set for fast membership check
 */
export const VARIABLE_NAMES: Set<string> = new Set(VARIABLES.map(v => v.name));

/**
 * Standalone variables (no namespace)
 */
export const STANDALONE_VARIABLES: Set<string> = new Set(
	VARIABLES.filter(v => !v.namespace).map(v => v.name)
);

/**
 * All namespace names that have variables
 */
export const VARIABLE_NAMESPACES: Set<string> = new Set(
	VARIABLES.filter(v => v.namespace).map(v => v.namespace!)
);
`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "variables.ts"), content);
	console.log(`   ${variables.length} variables`);
	return variables;
}

function generateConstants(
	details: DetailsData,
	constructs: ConstructsData,
): GeneratedConstant[] {
	console.log("Generating constants.ts...");

	const constants: GeneratedConstant[] = [];
	const scraped = details.constants || {};
	const missingType: string[] = [];

	const byNamespace = constructs.constants?.byNamespace || {};
	for (const [namespace, items] of Object.entries(byNamespace)) {
		for (const shortName of items) {
			const name = `${namespace}.${shortName}`;
			const sc = scraped[name];
			let type: string;
			if (sc?.type) {
				type = constantBaseType(sc.type);
			} else if (CONSTANT_TYPE_OVERRIDES[name]) {
				type = CONSTANT_TYPE_OVERRIDES[name];
			} else {
				missingType.push(name);
				type = "string";
			}
			constants.push({ name, namespace, shortName, type });
		}
	}

	if (missingType.length > 0) {
		console.warn(
			`   ⚠ ${missingType.length} constant(s) lacked a scraped Type; defaulted to string: ${missingType.join(", ")}`,
		);
	}

	const content = `/**
 * Pine Script ${VERSION.toUpperCase()} Constants
 * Auto-generated from TradingView documentation
 * Generated: ${new Date().toISOString()}
 * Total: ${constants.length} constants
 */

import type { PineConstant } from "../schema/types";

/**
 * All ${VERSION} constants
 */
export const CONSTANTS: PineConstant[] = ${JSON.stringify(constants, null, 2)};

/**
 * Constants indexed by full name for O(1) lookup
 */
export const CONSTANTS_BY_NAME: Map<string, PineConstant> = new Map(
	CONSTANTS.map(c => [c.name, c])
);

/**
 * Constants grouped by namespace
 */
export const CONSTANTS_BY_NAMESPACE: Map<string, PineConstant[]> = (() => {
	const map = new Map<string, PineConstant[]>();
	for (const c of CONSTANTS) {
		if (!map.has(c.namespace)) map.set(c.namespace, []);
		map.get(c.namespace)!.push(c);
	}
	return map;
})();

/**
 * All constant names as a Set for fast membership check
 */
export const CONSTANT_NAMES: Set<string> = new Set(CONSTANTS.map(c => c.name));

/**
 * All namespace names that have constants
 */
export const CONSTANT_NAMESPACES: Set<string> = new Set(CONSTANTS.map(c => c.namespace));
`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "constants.ts"), content);
	console.log(`   ${constants.length} constants`);
	return constants;
}

function generateKeywords(constructs: ConstructsData): string[] {
	console.log("Generating keywords.ts...");

	const keywords = constructs.keywords?.items || [];

	const allKeywords = new Set([
		...keywords,
		"if",
		"else",
		"for",
		"while",
		"switch",
		"case",
		"default",
		"break",
		"continue",
		"return",
		"var",
		"varip",
		"const",
		"type",
		"enum",
		"export",
		"import",
		"method",
		"library",
		"indicator",
		"strategy",
		"and",
		"or",
		"not",
		"true",
		"false",
		"na",
	]);

	const keywordList = [...allKeywords].sort();

	const content = `/**
 * Pine Script ${VERSION.toUpperCase()} Keywords
 * Auto-generated from TradingView documentation
 * Generated: ${new Date().toISOString()}
 * Total: ${keywordList.length} keywords
 */

/**
 * All ${VERSION} language keywords
 */
export const KEYWORDS: Set<string> = new Set(${JSON.stringify(keywordList, null, 2)});

/**
 * Control flow keywords
 */
export const CONTROL_KEYWORDS: Set<string> = new Set([
	"if", "else", "for", "while", "switch", "case", "default",
	"break", "continue", "return",
]);

/**
 * Declaration keywords
 */
export const DECLARATION_KEYWORDS: Set<string> = new Set([
	"var", "varip", "const", "type", "enum", "export", "import",
	"method", "library", "indicator", "strategy",
]);

/**
 * Operator keywords
 */
export const OPERATOR_KEYWORDS: Set<string> = new Set([
	"and", "or", "not",
]);

/**
 * Literal keywords
 */
export const LITERAL_KEYWORDS: Set<string> = new Set([
	"true", "false", "na",
]);

/**
 * Type keywords (basic types)
 */
export const TYPE_KEYWORDS: Set<string> = new Set([
	"int", "float", "bool", "string", "color",
	"array", "matrix", "map",
	"line", "label", "box", "table", "polyline", "linefill",
]);
`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "keywords.ts"), content);
	console.log(`   ${keywordList.length} keywords`);
	return keywordList;
}

function generateVersionIndex(
	_functions: GeneratedFunction[],
	_variables: GeneratedVariable[],
	_constants: GeneratedConstant[],
	_keywords: string[],
): void {
	console.log("Generating index.ts...");

	const content = `/**
 * Pine Script ${VERSION.toUpperCase()} Language Data
 * Auto-generated - single entry point for all ${VERSION} data
 * Generated: ${new Date().toISOString()}
 */

// Re-export everything
export * from "./functions";
export * from "./variables";
export * from "./constants";
export * from "./keywords";
export * from "./function-behavior";

// Re-export types
export type {
	PineFunction,
	PineVariable,
	PineConstant,
	PineParameter,
	PineType,
	FunctionFlags,
} from "../schema/types";

// Import for convenience object
import { FUNCTIONS_BY_NAME, FUNCTION_NAMES, FUNCTIONS_BY_NAMESPACE } from "./functions";
import { VARIABLES_BY_NAME, VARIABLE_NAMES, VARIABLES_BY_NAMESPACE, STANDALONE_VARIABLES } from "./variables";
import { CONSTANTS_BY_NAME, CONSTANT_NAMES, CONSTANTS_BY_NAMESPACE } from "./constants";
import { KEYWORDS } from "./keywords";

/**
 * Convenience namespace for ${VERSION} language data
 * Provides unified access to all language constructs
 */
export const Pine${VERSION.toUpperCase()} = {
	version: "${VERSION}" as const,

	// Data stores
	functions: FUNCTIONS_BY_NAME,
	variables: VARIABLES_BY_NAME,
	constants: CONSTANTS_BY_NAME,
	keywords: KEYWORDS,

	// Namespace groupings
	functionsByNamespace: FUNCTIONS_BY_NAMESPACE,
	variablesByNamespace: VARIABLES_BY_NAMESPACE,
	constantsByNamespace: CONSTANTS_BY_NAMESPACE,

	// Fast lookups
	getFunction: (name: string) => FUNCTIONS_BY_NAME.get(name),
	getVariable: (name: string) => VARIABLES_BY_NAME.get(name),
	getConstant: (name: string) => CONSTANTS_BY_NAME.get(name),

	// Membership checks
	isFunction: (name: string) => FUNCTION_NAMES.has(name),
	isVariable: (name: string) => VARIABLE_NAMES.has(name),
	isConstant: (name: string) => CONSTANT_NAMES.has(name),
	isKeyword: (name: string) => KEYWORDS.has(name),
	isStandaloneVariable: (name: string) => STANDALONE_VARIABLES.has(name),

	// Completion helpers
	getNamespaceMembers: (namespace: string) => {
		const funcs = FUNCTIONS_BY_NAMESPACE.get(namespace) || [];
		const vars = VARIABLES_BY_NAMESPACE.get(namespace) || [];
		const consts = CONSTANTS_BY_NAMESPACE.get(namespace) || [];
		return { functions: funcs, variables: vars, constants: consts };
	},

	// All namespaces
	getAllNamespaces: () => {
		const namespaces = new Set<string>();
		for (const ns of FUNCTIONS_BY_NAMESPACE.keys()) {
			if (ns !== "_global") namespaces.add(ns);
		}
		for (const ns of VARIABLES_BY_NAMESPACE.keys()) {
			if (ns !== "_standalone") namespaces.add(ns);
		}
		for (const ns of CONSTANTS_BY_NAMESPACE.keys()) {
			namespaces.add(ns);
		}
		return namespaces;
	},
};

// Default export
export default Pine${VERSION.toUpperCase()};
`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "index.ts"), content);
	console.log("   index.ts");
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
	console.log(`\nGenerating Pine Script ${VERSION} data...\n`);
	console.log(`Raw data: ${RAW_DIR}`);
	console.log(`Output: ${OUTPUT_DIR}\n`);

	// Ensure output directory exists
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Load raw data
	if (!fs.existsSync(DETAILS_FILE)) {
		console.error(`Details file not found: ${DETAILS_FILE}`);
		process.exit(1);
	}
	if (!fs.existsSync(CONSTRUCTS_FILE)) {
		console.error(`Constructs file not found: ${CONSTRUCTS_FILE}`);
		process.exit(1);
	}

	const details: DetailsData = JSON.parse(
		fs.readFileSync(DETAILS_FILE, "utf8"),
	);
	const constructs: ConstructsData = JSON.parse(
		fs.readFileSync(CONSTRUCTS_FILE, "utf8"),
	);

	// Generate all files
	const functions = generateFunctions(details, constructs);
	const variables = generateVariables(details, constructs);
	const constants = generateConstants(details, constructs);
	const keywords = generateKeywords(constructs);
	generateVersionIndex(functions, variables, constants, keywords);

	// Emit JSON snapshots for downstream consumers (e.g. pine-oracle)
	// that vendor pine-data without a node toolchain.
	const writeJson = (name: string, data: unknown): void => {
		const file = path.join(OUTPUT_DIR, `${name}.json`);
		fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
		console.log(`Wrote ${file}`);
	};
	writeJson("functions", functions);
	writeJson("variables", variables);
	writeJson("constants", constants);
	writeJson("keywords", keywords);

	console.log(`\nPine Script ${VERSION} data generated successfully!`);
	console.log(`   ${functions.length} functions`);
	console.log(`   ${variables.length} variables`);
	console.log(`   ${constants.length} constants`);
	console.log(`   ${keywords.length} keywords\n`);
}

main();
