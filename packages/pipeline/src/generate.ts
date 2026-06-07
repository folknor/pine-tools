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
import { parseAllowedValues, parseNumericRange } from "./parse-constraints.ts";
import { parseDefault } from "./parse-default.ts";
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
	overloadArgs?: Array<
		Array<{ name: string; type: string; description?: string }>
	>;
	returnsDescription?: string;
	remarks?: string;
	seeAlso?: string[];
}

// Prose sub-sections (Returns sentence, Remarks, See also) captured offline from
// the DOM mirror by reextract-sections.ts. Carried verbatim into the generated
// catalogs for downstream/external consumers of pine-data; our own checker does
// not read them.
interface ReferenceProse {
	returnsDescription?: string;
	remarks?: string;
	seeAlso?: string[];
}

function pickProse(src: {
	returnsDescription?: string;
	remarks?: string;
	seeAlso?: string[];
}): ReferenceProse {
	const out: ReferenceProse = {};
	if (src.returnsDescription) out.returnsDescription = src.returnsDescription;
	if (src.remarks) out.remarks = src.remarks;
	if (src.seeAlso && src.seeAlso.length > 0) out.seeAlso = src.seeAlso;
	return out;
}

interface GeneratedFunction extends ReferenceProse {
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
		allowedValues?: string[];
		min?: number;
		max?: number;
	}>;
	returns: string;
	flags?: Record<string, unknown>;
	overloads?: Array<{
		parameters: Array<{
			name: string;
			type: string;
			description: string;
			required: boolean;
			default?: string;
			allowedValues?: string[];
			min?: number;
			max?: number;
		}>;
		returns: string;
	}>;
	deprecated?: string;
	examples?: string[];
}

interface GeneratedVariable extends ReferenceProse {
	name: string;
	namespace?: string;
	type: string;
	qualifier: string;
	description: string;
}

interface GeneratedConstant extends ReferenceProse {
	name: string;
	namespace: string;
	shortName: string;
	type: string;
}

interface GeneratedType extends ReferenceProse {
	name: string;
	namespace?: string;
	kind: "primitive" | "qualifier" | "container" | "object";
	description?: string;
	examples?: string[];
	fields?: Array<{ name: string; type: string; description: string }>;
}

interface GeneratedAnnotation extends ReferenceProse {
	name: string;
	description: string;
	syntax?: string;
	examples?: string[];
}

interface ScrapedMember extends ReferenceProse {
	name: string;
	type: string;
	description: string;
	namespace: string;
}

interface ScrapedType extends ReferenceProse {
	name: string;
	description?: string;
	examples?: string[];
	fields?: Array<{ name: string; type: string; description: string }>;
	namespace?: string;
}

interface ScrapedAnnotation extends ReferenceProse {
	name: string;
	description?: string;
	syntax?: string;
	examples?: string[];
}

interface ScrapedOperator extends ReferenceProse {
	name: string;
	description?: string;
	syntax?: string;
	examples?: string[];
}

interface GeneratedOperator extends ReferenceProse {
	name: string;
	syntax?: string;
	description: string;
	examples?: string[];
}

interface ScrapedKeyword extends ReferenceProse {
	name: string;
	syntax?: string;
	description?: string;
	examples?: string[];
}

interface GeneratedKeyword extends ReferenceProse {
	name: string;
	description?: string;
}

interface DetailsData {
	functions: Record<string, FunctionDetail>;
	variables?: Record<string, ScrapedMember>;
	constants?: Record<string, ScrapedMember>;
	types?: Record<string, ScrapedType>;
	annotations?: Record<string, ScrapedAnnotation>;
	operators?: Record<string, ScrapedOperator>;
	keywords?: Record<string, ScrapedKeyword>;
}

interface ConstructsData {
	keywords?: { items?: string[] };
	builtInVariables?: {
		standalone?: { items?: string[] };
		byNamespace?: Record<string, string[]>;
	};
	constants?: { byNamespace?: Record<string, string[]> };
	types?: { items?: string[] };
	annotations?: { items?: string[] };
	operators?: { items?: string[] };
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
// Empty by design - populate only if the scrape surfaces such cases.
const VARIABLE_TYPE_OVERRIDES: Record<
	string,
	{ type: string; qualifier: string }
> = {};

// Variables TV's LINTER accepts that the REFERENCE does not document at all
// (absent from the crawl TOC, so neither crawl nor scrape can ever capture
// them). This is the shape G002 warned about, so every entry MUST carry a
// dated, re-runnable isolated `pine-lint --tv` probe - no entry on memory or
// corpus evidence alone. see INV048
const UNDOCUMENTED_VARIABLES: Record<
	string,
	{ type: string; qualifier: string; description: string }
> = {
	// Probe (2026-06-07): //@version=6 / indicator("t") /
	// x = syminfo.cftc_code / plot(close) -> TV accepts and types x
	// "simple string". Reference TOC re-crawled the same day: absent.
	"syminfo.cftc_code": {
		type: "simple<string>",
		qualifier: "simple",
		description:
			"The CFTC code of the symbol's underlying futures market, as a string. Undocumented in the v6 reference; accepted and typed by TV's linter (pine-lint --tv probe, 2026-06-07).",
	},
};

// Strip TV's leading qualifier ("const color" -> "color", "const
// plot_simple_display" -> "plot_simple_display") to the bare base type used by
// the constants table. Replaces the old inferConstantType namespace-guess.
function constantBaseType(raw: string): string {
	return (raw || "").trim().replace(/^(const|input|simple|series)\s+/, "");
}

// Constants whose TV detail page exposes no machine-readable "Type" field.
// Empty by design - populate only if the scrape surfaces such cases.
const CONSTANT_TYPE_OVERRIDES: Record<string, string> = {};

// Function params (`<fn>.<param>`) where TV's LINTER accepts a type the scraped
// REFERENCE doesn't express. Empty by design.
//
// This map formerly widened nz/fixnan/int/plot.title on G002's authority, a
// `--tv`-verified record from 2026-05-28 that TV under-documents acceptance. As
// of 2026-06-02, isolated `pine-lint --tv` probes flag every one of those calls
// with CE10123 (nz(<bool>/<string>), int(true), plot(title=<non-const>)), so the
// widenings now contradict TV and were a false-negative source - removed.
// The 2026-05-28 "TV accepts" verdict was a measurement error, not a TV change
// (see G002): a failed `--tv` probe used to print `{success:false, errors:[]}`,
// which the diff tooling reads as "no TV errors" = "accepts" (now fixed). Baking
// that one-off verdict here, with nothing to re-check it, is why it survived
// silently. Any future entry needs a dated, re-runnable isolated `--tv` probe
// recorded alongside it. See gotchas/G002 (superseded) and INV014 / INV015.
const FUNCTION_PARAM_TYPE_OVERRIDES: Record<string, string> = {};

// Return-follows-param functions that `detectReturnTypeParam` can't auto-derive
// from the overload dump. `input`'s return follows `defval`, but its defval type
// is documented as un-parseable prose ("const int/float/bool/string/color or
// source-type built-ins"), so the structural detector can't match it. This
// override is the single generate-time source for these - it replaces the stale
// discovered `function-behavior.json` (retired). see TODO #17.
const RETURN_TYPE_PARAM_OVERRIDES: Record<string, string> = {
	input: "defval",
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
		// input() returns the type of its first arg (defval); the returnTypeParam
		// override (defval) additionally resolves named calls. see TODO #17.
		input: "input",
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
		// math.round/floor/ceil are NOT input-following: the 1-arg forms
		// return int regardless of the argument's base type (only the
		// qualifier follows; see their per-overload returns in pine-data).
		// Flagging them "numeric" made `int x = math.round(float)` a false
		// "cannot assign float to int". see INV032
	};
	if (polymorphic[name]) {
		flags.polymorphic = polymorphic[name];
	}

	// History-dependent functions: rely on values from PAST executions of
	// their own scope (the `[]` operator or internal state), so calling
	// them conditionally/iteratively builds an inconsistent time series -
	// TV's CW10003 criterion (po: errors/CW10003, "such as those in the
	// `ta` namespace"). The whole ta.* namespace is rolling/stateful by
	// design; `fixnan` (returns the last non-na value) and `math.sum` (a
	// sliding window despite its namespace) were probed 2026-06-04 - TV
	// warns CW10003 on conditional calls to both (see INV018).
	// Deliberately NOT flagged: side-effect functions (label.new etc. -
	// the same page explains forcing them every-bar would be wrong),
	// stateless functions (math.max is the page's named example, `nz`
	// probed clean), and str./request.* (the old namespace heuristic
	// flagged them and produced FP waves - see plan/31 Finding 7;
	// conditional request.security probed clean).
	if (name.startsWith("ta.") || name === "fixnan" || name === "math.sum") {
		flags.historyDependent = true;
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
// `overloadArgs` and its own return type from the overload signature string -
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
						description: "",
					}));
		return {
			parameters: args.map(({ name, type, description }) => {
				const m = merged.get(name);
				// Prefer this overload's own captured description; fall back to the
				// merged param's (overload #0's). see TODO #25
				const desc = description || m?.description || "";
				const allowed = parseAllowedValues(desc);
				const range = allowed ? undefined : parseNumericRange(desc);
				return {
					name,
					type,
					description: desc,
					required: m ? !isParameterOptional(m) : true,
					default: parseDefault(desc),
					allowedValues: allowed,
					min: range?.min,
					max: range?.max,
				};
			}),
			returns: parseReturnFromSignature(sig),
		};
	});
}

// Build a name -> description map from a function's overload dump, so the merged
// parameter list can backfill descriptions for params that appear only in a
// later overload (absent from overload #0, hence blank in the merged view).
// First non-empty description per name wins. see TODO #25
function overloadDescriptions(detail: FunctionDetail): Map<string, string> {
	const out = new Map<string, string>();
	for (const args of detail.overloadArgs || []) {
		for (const { name, description } of args) {
			if (description && !out.get(name)) out.set(name, description);
		}
	}
	return out;
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
		const returnTypeParam =
			RETURN_TYPE_PARAM_OVERRIDES[name] ?? detectReturnTypeParam(detail);
		if (returnTypeParam) {
			flags.returnTypeParam = returnTypeParam;
		}

		// Union per-param types across overloads from the captured overloadArgs
		// dump (offline; see union-types.ts). Only params present in every
		// overload are unioned - others keep their scraped type.
		const unionedParams = unionOverloadParams(detail);
		// Backfill descriptions for params that appear only in a later overload
		// (blank in the merged view scraped from overload #0). see TODO #25
		const descByName = overloadDescriptions(detail);
		const parameters = (detail.parameters || []).map((p) => {
			const description = p.description || descByName.get(p.name) || "";
			const allowed = parseAllowedValues(description);
			// A param is either an enum or a numeric range, never both - skip the
			// range scan when an enum was found (its prose can contain stray digits).
			const range = allowed ? undefined : parseNumericRange(description);
			return {
				name: p.name,
				type:
					FUNCTION_PARAM_TYPE_OVERRIDES[`${name}.${p.name}`] ??
					unionedParams.get(p.name) ??
					p.type ??
					"unknown",
				description,
				required: !isParameterOptional(p),
				// Parsed from the description prose (best-effort). see TODO #25
				default: p.default ?? parseDefault(description),
				allowedValues: allowed,
				min: range?.min,
				max: range?.max,
			};
		});

		// Top-level `returns` stays frozen to overload #0 (TV's primary form): it
		// is the single type the checker consumes, and overload #0's weak
		// qualifier (const) coerces everywhere, so it's the permissive/safe
		// choice. The full, accurate per-overload returns live in `overloads[]`
		// (authoritative for overloaded functions) - unioning them up to the top
		// level instead widens qualifiers (const->series) and regressed 104
		// fixtures / introduced FPs. see TODO #26
		// Deprecation note, when the description flags it (rare in v6 - e.g.
		// request.quandl). Capture the sentence mentioning "deprecated". see #27
		const depMatch = (detail.description || "").match(
			/([^.]*\bdeprecated\b[^.]*\.)/i,
		);
		const deprecated = depMatch ? depMatch[1].trim() : undefined;

		const func: GeneratedFunction = {
			name,
			namespace,
			syntax: detail.syntax || `${name}()`,
			description: detail.description || "",
			parameters,
			returns: detail.returns || "void",
			flags: Object.keys(flags).length > 0 ? flags : undefined,
			overloads: buildOverloads(detail),
			deprecated,
			examples: detail.examples,
			...pickProse(detail),
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
	// are retired - TV's "Type" field is the source of truth now.
	const names: string[] = [
		...(constructs.builtInVariables?.standalone?.items || []),
	];
	const byNamespace = constructs.builtInVariables?.byNamespace || {};
	for (const [namespace, members] of Object.entries(byNamespace)) {
		for (const member of members) {
			names.push(`${namespace}.${member}`);
		}
	}

	// Linter-accepted variables the reference doesn't document (each
	// probe-verified - see UNDOCUMENTED_VARIABLES). The crawl can never
	// surface these, so they're appended to the name list here.
	names.push(...Object.keys(UNDOCUMENTED_VARIABLES));

	const scraped = details.variables || {};
	const missingType: string[] = [];

	for (const name of [...new Set(names)].sort()) {
		const undocumented = UNDOCUMENTED_VARIABLES[name];
		if (undocumented) {
			variables.push({
				name,
				namespace: name.includes(".") ? name.split(".")[0] : undefined,
				type: undocumented.type,
				qualifier: undocumented.qualifier,
				description: undocumented.description,
			});
			continue;
		}
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
			...(sv ? pickProse(sv) : {}),
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
			constants.push({
				name,
				namespace,
				shortName,
				type,
				...(sc ? pickProse(sc) : {}),
			});
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

// Classify a built-in type name by kind. Primitives, type qualifiers, and
// generic containers are fixed sets; everything else the crawl discovers is a
// composite object type (chart.point, line, label, box, table, …).
const TYPE_KINDS: Record<string, GeneratedType["kind"]> = {
	int: "primitive",
	float: "primitive",
	bool: "primitive",
	string: "primitive",
	color: "primitive",
	const: "qualifier",
	simple: "qualifier",
	series: "qualifier",
	array: "container",
	matrix: "container",
	map: "container",
};

function generateTypes(
	details: DetailsData,
	constructs: ConstructsData,
): GeneratedType[] {
	console.log("Generating types.ts...");

	const scraped = details.types || {};
	const names = constructs.types?.items || [];

	const types: GeneratedType[] = names.map((name) => {
		const sc = scraped[name];
		return {
			name,
			namespace: name.includes(".") ? name.split(".")[0] : undefined,
			kind: TYPE_KINDS[name] ?? "object",
			description: sc?.description || undefined,
			examples:
				sc?.examples && sc.examples.length > 0 ? sc.examples : undefined,
			fields: sc?.fields && sc.fields.length > 0 ? sc.fields : undefined,
			...(sc ? pickProse(sc) : {}),
		};
	});

	const content = `/**
 * Pine Script ${VERSION.toUpperCase()} Built-in Types
 * Auto-generated from TradingView documentation
 * Generated: ${new Date().toISOString()}
 * Total: ${types.length} types
 */

import type { PineBuiltinType } from "../schema/types";

/**
 * All ${VERSION} built-in types
 */
export const TYPES: PineBuiltinType[] = ${JSON.stringify(types, null, 2)};

/**
 * Types indexed by name for O(1) lookup
 */
export const TYPES_BY_NAME: Map<string, PineBuiltinType> = new Map(
	TYPES.map(t => [t.name, t])
);

/**
 * All built-in type names as a Set for fast membership check
 */
export const TYPE_NAMES: Set<string> = new Set(TYPES.map(t => t.name));
`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "types.ts"), content);
	console.log(`   ${types.length} types`);
	return types;
}

function generateAnnotations(
	details: DetailsData,
	constructs: ConstructsData,
): GeneratedAnnotation[] {
	console.log("Generating annotations.ts...");

	const scraped = details.annotations || {};
	const names = constructs.annotations?.items || [];

	const annotations: GeneratedAnnotation[] = names.map((name) => {
		const sc = scraped[name];
		return {
			name,
			description: sc?.description || "",
			syntax: sc?.syntax || undefined,
			examples:
				sc?.examples && sc.examples.length > 0 ? sc.examples : undefined,
			...(sc ? pickProse(sc) : {}),
		};
	});

	const content = `/**
 * Pine Script ${VERSION.toUpperCase()} Annotations
 * Auto-generated from TradingView documentation
 * Generated: ${new Date().toISOString()}
 * Total: ${annotations.length} annotations
 */

import type { PineAnnotation } from "../schema/types";

/**
 * All ${VERSION} compiler/doc annotations
 */
export const ANNOTATIONS: PineAnnotation[] = ${JSON.stringify(annotations, null, 2)};

/**
 * Annotations indexed by name for O(1) lookup
 */
export const ANNOTATIONS_BY_NAME: Map<string, PineAnnotation> = new Map(
	ANNOTATIONS.map(a => [a.name, a])
);

/**
 * All annotation names as a Set for fast membership check
 */
export const ANNOTATION_NAMES: Set<string> = new Set(ANNOTATIONS.map(a => a.name));
`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "annotations.ts"), content);
	console.log(`   ${annotations.length} annotations`);
	return annotations;
}

function generateOperators(
	details: DetailsData,
	constructs: ConstructsData,
): GeneratedOperator[] {
	console.log("Generating operators.ts...");

	const scraped = details.operators || {};
	const names = constructs.operators?.items || [];

	const operators: GeneratedOperator[] = names.map((name) => {
		const sc = scraped[name];
		return {
			name,
			syntax: sc?.syntax || undefined,
			description: sc?.description || "",
			examples:
				sc?.examples && sc.examples.length > 0 ? sc.examples : undefined,
			...(sc ? pickProse(sc) : {}),
		};
	});

	const content = `/**
 * Pine Script ${VERSION.toUpperCase()} Operators
 * Auto-generated from TradingView documentation
 * Generated: ${new Date().toISOString()}
 * Total: ${operators.length} operators
 *
 * Reference data only: operators are grammar the parser hardcodes (see the
 * Data-vs-Syntax split in CLAUDE.md), so the checker does not read this catalog.
 * It exists for downstream/external consumers of pine-data.
 */

import type { PineOperator } from "../schema/types";

/**
 * All ${VERSION} operators
 */
export const OPERATORS: PineOperator[] = ${JSON.stringify(operators, null, 2)};

/**
 * Operators indexed by symbol for O(1) lookup
 */
export const OPERATORS_BY_NAME: Map<string, PineOperator> = new Map(
	OPERATORS.map(o => [o.name, o])
);

/**
 * All operator symbols as a Set for fast membership check
 */
export const OPERATOR_NAMES: Set<string> = new Set(OPERATORS.map(o => o.name));
`;

	fs.writeFileSync(path.join(OUTPUT_DIR, "operators.ts"), content);
	console.log(`   ${operators.length} operators`);
	return operators;
}

function generateKeywords(
	details: DetailsData,
	constructs: ConstructsData,
): GeneratedKeyword[] {
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

	// The JSON snapshot carries prose (description/remarks/seeAlso) for external
	// consumers; the .ts KEYWORDS Set above stays a bare name set for the checker.
	// Prose comes from the `kw_`/`const_` reference pages scraped into
	// details.keywords; keywords with no reference page (e.g. the function-style
	// `indicator`/`library`/`strategy`) land as name-only entries.
	const scraped = details.keywords || {};
	const keywordObjects: GeneratedKeyword[] = keywordList.map((name) => {
		const sc = scraped[name];
		const out: GeneratedKeyword = { name };
		if (sc?.description) out.description = sc.description;
		Object.assign(out, sc ? pickProse(sc) : {});
		return out;
	});

	console.log(`   ${keywordList.length} keywords`);
	return keywordObjects;
}

function generateVersionIndex(
	_functions: GeneratedFunction[],
	_variables: GeneratedVariable[],
	_constants: GeneratedConstant[],
	_keywords: GeneratedKeyword[],
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
export * from "./types";
export * from "./annotations";
export * from "./operators";
export * from "./keywords";

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
	const types = generateTypes(details, constructs);
	const annotations = generateAnnotations(details, constructs);
	const operators = generateOperators(details, constructs);
	const keywords = generateKeywords(details, constructs);
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
	writeJson("types", types);
	writeJson("annotations", annotations);
	writeJson("operators", operators);
	writeJson("keywords", keywords);

	console.log(`\nPine Script ${VERSION} data generated successfully!`);
	console.log(`   ${functions.length} functions`);
	console.log(`   ${variables.length} variables`);
	console.log(`   ${constants.length} constants`);
	console.log(`   ${types.length} types`);
	console.log(`   ${annotations.length} annotations`);
	console.log(`   ${operators.length} operators`);
	console.log(`   ${keywords.length} keywords\n`);
}

main();
