#!/usr/bin/env node

/**
 * Pine Script v6 TypeScript Generator
 *
 * This script generates TypeScript definition files from scraped Pine Script v6 data.
 * It creates the various .ts files used by the VS Code extension.
 *
 * Usage: node scripts/generate.js [details-file] [output-dir]
 * Default details: v6/raw/complete-v6-details.json
 * Default output: v6/
 */

const fs = require("node:fs");
const path = require("node:path");

const DETAILS_FILE =
	process.argv[2] || path.join(__dirname, "../v6/raw/complete-v6-details.json");
const LANGUAGE_CONSTRUCTS_FILE = path.join(
	__dirname,
	"../v6/raw/v6-language-constructs.json",
);
const OUTPUT_DIR = process.argv[3] || path.join(__dirname, "../v6");

function _escapeString(str) {
	return str
		.replace(/"/g, '\\"')
		.replace(/'/g, "\\'")
		.replace(/\\n/g, "\\n")
		.replace(/\\r/g, "\\r");
}

function generateBuiltInVariables(data) {
	console.log("🔄 Generating built-in variables file...");

	const variables = data.variables?.items || [];
	const builtInVars = variables.reduce((acc, variable) => {
		acc[variable] = '""';
		return acc;
	}, {});

	const content = `// Auto-generated from live v6 reference. Do not edit by hand.
export const GEN_V6_BUILTIN_VARS: Record<string, string> = ${JSON.stringify(builtInVars, null, 1)};
`;

	const outputFile = path.join(OUTPUT_DIR, "generated.ts");
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(`✅ Generated: ${outputFile}`);
}

function generateParameterRequirements(data) {
	console.log("🔄 Generating parameter requirements file...");

	const functions = data.functions || {};
	const functionSpecs = {};

	Object.entries(functions).forEach(([name, details]) => {
		// Skip null or undefined entries (failed scrapes)
		if (!details) {
			return;
		}

		const requiredParams = [];
		const optionalParams = [];
		const parameters = [];

		details.parameters?.forEach((param) => {
			const paramInfo = {
				name: param.name,
				type: param.type || "unknown",
				description: param.description || "",
				optional: param.optional || false,
				required: param.required !== false,
				explicitlyOptional: param.optional,
				explicitlyRequired: param.required !== false,
			};

			parameters.push(paramInfo);

			if (param.optional) {
				optionalParams.push(param.name);
			} else {
				requiredParams.push(param.name);
			}
		});

		functionSpecs[name] = {
			name: name,
			syntax: details.syntax || `${name}()`,
			description: details.description || "",
			requiredParams,
			optionalParams,
			signature: details.syntax || `${name}()`,
			parameters,
			returns: details.returns || "",
		};
	});

	const content = `/**
 * AUTO-GENERATED: Pine Script v6 Parameter Requirements
 * Generated: ${new Date().toISOString()}
 * Source: https://www.tradingview.com/pine-script-reference/v6/
 * Functions: ${Object.keys(functionSpecs).length}
 */

export interface FunctionParameter {
	name: string;
	type: string;
	description?: string;
	optional: boolean;
	required: boolean;
	explicitlyOptional?: boolean;
	explicitlyRequired?: boolean;
}

export interface FunctionSignatureSpec {
	name: string;
	syntax: string;
	description?: string;
	requiredParams: string[];
	optionalParams: string[];
	signature: string;
	parameters: FunctionParameter[];
	returns?: string; // Added in Session 5 for type inference
}

export const PINE_FUNCTIONS: Record<string, FunctionSignatureSpec> = ${JSON.stringify(functionSpecs, null, 1)};
`;

	const outputFile = path.join(
		OUTPUT_DIR,
		"parameter-requirements-generated.ts",
	);
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(`✅ Generated: ${outputFile}`);
}

function generateConstants(data) {
	console.log("🔄 Generating constants file...");

	const constants = data.constants?.items || [];

	// Group constants by namespace (e.g., color.*, plot.style.*, etc.)
	const constantsByNamespace = {};

	constants.forEach((constant) => {
		if (constant.includes(".")) {
			const [namespace, ...rest] = constant.split(".");
			const name = rest.join(".");

			if (!constantsByNamespace[namespace]) {
				constantsByNamespace[namespace] = [];
			}
			constantsByNamespace[namespace].push({ name, fullName: constant });
		} else {
			// Constants without namespace go to 'global'
			if (!constantsByNamespace.global) {
				constantsByNamespace.global = [];
			}
			constantsByNamespace.global.push({ name: constant, fullName: constant });
		}
	});

	// Generate content with namespaces
	let content = `/**
 * Complete Pine Script v6 Constants
 * Auto-generated from official TradingView Pine Script v6 Reference
 * Source: https://www.tradingview.com/pine-script-reference/v6/
 *
 * Total: ${constants.length} constants
 * Generated: ${new Date().toISOString().split("T")[0]}
 */

`;

	Object.entries(constantsByNamespace).forEach(([namespace, items]) => {
		const namespaceName = `${namespace.toUpperCase()}_CONSTANTS`;
		const constantNames = items.map((item) => item.fullName || item.name);

		content += `//──────────────────────────────────────────────────────────
// ${namespaceName} namespace (${items.length} constants)
//──────────────────────────────────────────────────────────
export const ${namespaceName} = new Set([
${constantNames.map((name) => `	"${name}"`).join(",\n")}
]);

`;
	});

	const outputFile = path.join(OUTPUT_DIR, "pine-constants-complete.ts");
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(`✅ Generated: ${outputFile}`);
}

function generateBuiltins(data) {
	console.log("🔄 Generating builtins file...");

	const variables = data.variables?.items || [];

	// Group variables by namespace
	const variablesByNamespace = {};
	const standaloneVars = [];

	variables.forEach((variable) => {
		if (variable.includes(".")) {
			const [namespace, ...rest] = variable.split(".");
			const name = rest.join(".");

			if (!variablesByNamespace[namespace]) {
				variablesByNamespace[namespace] = [];
			}
			variablesByNamespace[namespace].push({ name, fullName: variable });
		} else {
			standaloneVars.push(variable);
		}
	});

	// Generate content
	let content = `/**
 * Complete Pine Script v6 Built-in Variables
 * Auto-generated from official TradingView Pine Script v6 Reference
 * Source: https://www.tradingview.com/pine-script-reference/v6/
 *
 * Total: ${standaloneVars.length} standalone + ${Object.keys(variablesByNamespace).length} variable namespaces
 * Generated: ${new Date().toISOString().split("T")[0]}
 */

`;

	// Standalone built-ins
	if (standaloneVars.length > 0) {
		content += `//──────────────────────────────────────────────────────────
// STANDALONE BUILT-IN VARIABLES (${standaloneVars.length})
//──────────────────────────────────────────────────────────
export const STANDALONE_BUILTINS = new Set([
${standaloneVars.map((name) => `	"${name}"`).join(",\n")}
]);

`;
	}

	// Namespaced built-ins
	Object.entries(variablesByNamespace).forEach(([namespace, items]) => {
		const namespaceName = `${namespace.toUpperCase()}_BUILTINS`;
		const variableNames = items.map((item) => item.name);

		content += `//──────────────────────────────────────────────────────────
// ${namespaceName} namespace (${items.length} variables)
//──────────────────────────────────────────────────────────
export const ${namespaceName} = new Set([
${variableNames.map((name) => `	"${name}"`).join(",\n")}
]);

`;
	});

	const outputFile = path.join(OUTPUT_DIR, "pine-builtins-complete.ts");
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(`✅ Generated: ${outputFile}`);
}

function generateManualReference(data) {
	console.log("🔄 Generating manual reference file...");

	const functions = data.functions || {};
	const variables = data.variables?.items || [];

	const functionSpecs = {};

	Object.entries(functions).forEach(([name, details]) => {
		// Skip null or undefined entries (failed scrapes)
		if (!details) {
			return;
		}
		functionSpecs[name] = {
			description: details.description || "",
			syntax: details.syntax || `${name}()`,
			returns: details.returns || "",
			type: "function",
			category: details.category || "",
			example: details.example || "",
		};
	});

	const variableSpecs = {};
	variables.forEach((variable) => {
		variableSpecs[variable] = {
			description: `Built-in variable: ${variable}`,
			type: "variable",
			category: "built-in",
		};
	});

	const content = `// Pine Script v6 Complete API Reference
// Generated: ${new Date().toISOString()}
// Source: Manual extraction from TradingView documentation

export interface PineItem {
	description: string;
	syntax?: string;
	returns?: string;
	type?: string;
	category?: string;
	example?: string;
}

export const V6_VARIABLES: Record<string, PineItem> = ${JSON.stringify(variableSpecs, null, 1)};

export const V6_FUNCTIONS: Record<string, PineItem> = ${JSON.stringify(functionSpecs, null, 1)};
`;

	const outputFile = path.join(OUTPUT_DIR, "v6-manual.ts");
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(`✅ Generated: ${outputFile}`);
}

function generateNamespaces(data) {
	console.log("🔄 Generating namespaces file...");

	const functions = data.functions || {};
	const variables = data.variables?.items || [];
	const constants = data.constants?.items || [];
	// Variable namespaces from builtInVariables (barstate, syminfo, etc.)
	const variableNamespaces = data.variableNamespaces?.items || [];

	// Build namespaces structure
	const namespaces = {};

	// Pre-create namespaces for variable namespaces (barstate, syminfo, etc.)
	// These are namespaces that contain built-in variables, not functions
	for (const ns of variableNamespaces) {
		if (!namespaces[ns]) {
			namespaces[ns] = { functions: {}, variables: {}, constants: {} };
		}
	}

	// Add functions to namespaces
	Object.entries(functions).forEach(([name, details]) => {
		// Skip null or undefined entries (failed scrapes)
		if (!details) {
			return;
		}
		if (name.includes(".")) {
			const [ns, ...rest] = name.split(".");
			const funcName = rest.join(".");
			if (!namespaces[ns]) {
				namespaces[ns] = { functions: {}, variables: {}, constants: {} };
			}
			namespaces[ns].functions[funcName] = {
				fullName: name,
				syntax: details.syntax || `${name}()`,
				returns: details.returns || "unknown",
				description: details.description || "",
			};
		}
	});

	// Add variables to namespaces
	variables.forEach((variable) => {
		if (variable.includes(".")) {
			const [ns, ...rest] = variable.split(".");
			const varName = rest.join(".");
			if (!namespaces[ns]) {
				namespaces[ns] = { functions: {}, variables: {}, constants: {} };
			}
			namespaces[ns].variables[varName] = {
				fullName: variable,
				type: inferVariableType(variable),
			};
		}
	});

	// Add constants to namespaces
	constants.forEach((constant) => {
		if (constant.includes(".")) {
			const [ns, ...rest] = constant.split(".");
			const constName = rest.join(".");
			if (!namespaces[ns]) {
				namespaces[ns] = { functions: {}, variables: {}, constants: {} };
			}
			namespaces[ns].constants[constName] = {
				fullName: constant,
				type: inferConstantType(ns, constant),
			};
		}
	});

	const content = `/**
 * Pine Script v6 Namespaces
 * Auto-generated - provides organized namespace data for IntelliSense
 * Generated: ${new Date().toISOString()}
 */

export interface NamespaceMember {
	fullName: string;
	syntax?: string;
	returns?: string;
	type?: string;
	description?: string;
}

export interface Namespace {
	functions: Record<string, NamespaceMember>;
	variables: Record<string, NamespaceMember>;
	constants: Record<string, NamespaceMember>;
}

export const V6_NAMESPACES: Record<string, Namespace> = ${JSON.stringify(namespaces, null, 1)};

// Helper to get all namespace names
export const NAMESPACE_NAMES = ${JSON.stringify(Object.keys(namespaces).sort())};
`;

	const outputFile = path.join(OUTPUT_DIR, "v6-namespaces.ts");
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(
		`✅ Generated: ${outputFile} (${Object.keys(namespaces).length} namespaces)`,
	);
}

function generateBuiltinVariablesTyped(data) {
	console.log("🔄 Generating typed built-in variables file...");

	const variables = data.variables?.items || [];

	const typedVars = {};
	variables.forEach((variable) => {
		typedVars[variable] = inferVariableType(variable);
	});

	const content = `/**
 * Pine Script v6 Built-in Variables with Types
 * Auto-generated with inferred types
 * Generated: ${new Date().toISOString()}
 */

export const V6_BUILTIN_VARIABLES: Record<string, string> = ${JSON.stringify(typedVars, null, 1)};

// Categorized for quick lookups
export const SERIES_FLOAT_VARS = new Set(${JSON.stringify(
		variables.filter((v) => inferVariableType(v) === "series<float>"),
	)});

export const SERIES_INT_VARS = new Set(${JSON.stringify(
		variables.filter((v) => inferVariableType(v) === "series<int>"),
	)});

export const SERIES_BOOL_VARS = new Set(${JSON.stringify(
		variables.filter((v) => inferVariableType(v) === "series<bool>"),
	)});

export const SERIES_STRING_VARS = new Set(${JSON.stringify(
		variables.filter((v) => inferVariableType(v) === "series<string>"),
	)});
`;

	const outputFile = path.join(OUTPUT_DIR, "v6-builtin-variables.ts");
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(`✅ Generated: ${outputFile} (${variables.length} variables)`);
}

function generateNamespaceProperties(data) {
	console.log("🔄 Generating namespace properties file...");

	const constants = data.constants?.items || [];
	const variables = data.variables?.items || [];

	const properties = {};

	// Add constants with their types
	constants.forEach((constant) => {
		properties[constant] = inferConstantType(constant.split(".")[0], constant);
	});

	// Add namespaced variables
	variables.forEach((variable) => {
		if (variable.includes(".")) {
			properties[variable] = inferVariableType(variable);
		}
	});

	const content = `/**
 * Pine Script v6 Namespace Properties
 * Maps fully-qualified names to their types
 * Generated: ${new Date().toISOString()}
 */

export const NAMESPACE_PROPERTIES: Record<string, string> = ${JSON.stringify(properties, null, 1)};

// Get type for a property (returns undefined if not found)
export function getPropertyType(name: string): string | undefined {
	return NAMESPACE_PROPERTIES[name];
}
`;

	const outputFile = path.join(OUTPUT_DIR, "v6-namespace-properties.ts");
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(
		`✅ Generated: ${outputFile} (${Object.keys(properties).length} properties)`,
	);
}

function generateFunctionMetadata(data) {
	console.log("🔄 Generating function metadata file...");

	const functions = data.functions || {};

	const metadata = {};

	// Top-level only functions (can only be called at script root)
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

	// Series-returning functions (return series types)
	const seriesReturning = [
		"ta.sma",
		"ta.ema",
		"ta.wma",
		"ta.vwma",
		"ta.rma",
		"ta.swma",
		"ta.rsi",
		"ta.macd",
		"ta.stoch",
		"ta.cci",
		"ta.atr",
		"ta.tr",
		"ta.highest",
		"ta.lowest",
		"ta.highestbars",
		"ta.lowestbars",
		"ta.crossover",
		"ta.crossunder",
		"ta.cross",
		"ta.change",
		"ta.mom",
		"ta.dev",
		"ta.variance",
		"ta.stdev",
		"ta.correlation",
		"ta.linreg",
		"ta.median",
		"ta.mode",
		"ta.percentile_linear_interpolation",
		"ta.percentile_nearest_rank",
		"ta.percentrank",
		"ta.pivothigh",
		"ta.pivotlow",
		"ta.sar",
		"ta.supertrend",
		"ta.vwap",
		"ta.bb",
		"ta.bbw",
		"ta.kc",
		"ta.kcw",
		"ta.dmi",
		"math.abs",
		"math.max",
		"math.min",
		"math.avg",
		"math.sum",
		"math.log",
		"math.log10",
		"math.exp",
		"math.sqrt",
		"math.pow",
		"math.round",
		"math.floor",
		"math.ceil",
		"math.sign",
		"math.sin",
		"math.cos",
		"math.tan",
		"math.asin",
		"math.acos",
		"math.atan",
		"request.security",
		"request.security_lower_tf",
	];

	// Variadic functions (accept variable number of arguments)
	const variadic = [
		"math.max",
		"math.min",
		"math.avg",
		"math.sum",
		"array.from",
		"str.format",
	];

	Object.keys(functions).forEach((name) => {
		const flags = {};

		if (topLevelOnly.includes(name)) flags.topLevelOnly = true;
		if (seriesReturning.includes(name)) flags.seriesReturning = true;
		if (variadic.includes(name)) flags.variadic = true;

		// Only add if has any flags
		if (Object.keys(flags).length > 0) {
			metadata[name] = flags;
		}
	});

	const content = `/**
 * Pine Script v6 Function Metadata
 * Flags for special function behaviors
 * Generated: ${new Date().toISOString()}
 */

export interface FunctionFlags {
	topLevelOnly?: boolean;    // Can only be called at script root
	seriesReturning?: boolean; // Returns a series type
	variadic?: boolean;        // Accepts variable number of arguments
}

export const FUNCTION_METADATA: Record<string, FunctionFlags> = ${JSON.stringify(metadata, null, 1)};

// Quick lookup helpers
export const TOP_LEVEL_ONLY_FUNCTIONS = new Set(${JSON.stringify(topLevelOnly)});
export const SERIES_RETURNING_FUNCTIONS = new Set(${JSON.stringify(seriesReturning)});
export const VARIADIC_FUNCTIONS = new Set(${JSON.stringify(variadic)});
`;

	const outputFile = path.join(OUTPUT_DIR, "v6-function-metadata.ts");
	fs.writeFileSync(outputFile, content, "utf8");
	console.log(`✅ Generated: ${outputFile}`);
}

// Helper function to infer variable types based on name patterns
function inferVariableType(name) {
	// Price data - series<float>
	if (
		["close", "open", "high", "low", "hl2", "hlc3", "ohlc4", "hlcc4"].includes(
			name,
		)
	) {
		return "series<float>";
	}
	if (["volume", "ask", "bid"].includes(name)) {
		return "series<float>";
	}

	// Time data - series<int>
	if (["time", "time_close", "time_tradingday", "timenow"].includes(name)) {
		return "series<int>";
	}
	if (["bar_index", "last_bar_index"].includes(name)) {
		return "series<int>";
	}
	if (
		[
			"dayofweek",
			"dayofmonth",
			"month",
			"year",
			"hour",
			"minute",
			"second",
			"weekofyear",
		].includes(name)
	) {
		return "series<int>";
	}

	// Time-related - int
	if (name === "last_bar_time") return "series<int>";

	// Boolean variables
	if (name === "na") return "na";

	// Namespaced variables
	if (name.startsWith("barstate.")) return "series<bool>";
	if (name.startsWith("chart.")) return "simple<string>";
	if (name.startsWith("session.")) return "simple<bool>";
	if (name.startsWith("syminfo.")) {
		if (name.includes("mintick") || name.includes("pointvalue"))
			return "simple<float>";
		return "simple<string>";
	}
	if (name.startsWith("timeframe.")) return "simple<string>";
	if (name.startsWith("strategy.")) {
		if (
			name.includes("position_size") ||
			name.includes("equity") ||
			name.includes("openprofit")
		) {
			return "series<float>";
		}
		return "series<int>";
	}

	// Default to series<float> for unknown
	return "series<float>";
}

// Helper function to infer constant types based on namespace
function inferConstantType(namespace, fullName) {
	switch (namespace) {
		case "color":
			return "color";
		case "shape":
			return "string"; // shape.* constants are shape strings
		case "plot":
			return "plot_style";
		case "hline":
			return "hline_style";
		case "line":
			return "line_style";
		case "label":
			return "label_style";
		case "size":
			return "string"; // size.* constants
		case "location":
			return "string";
		case "position":
			return "string";
		case "display":
			return "int"; // display flags
		case "extend":
			return "string";
		case "xloc":
		case "yloc":
			return "string";
		case "alert":
			return "string";
		case "adjustment":
			return "adjustment";
		case "barmerge":
			return "barmerge";
		case "currency":
			return "string";
		case "dayofweek":
			return "int";
		case "earnings":
		case "dividends":
		case "splits":
			return "string";
		case "format":
			return "string";
		case "order":
			return "string";
		case "scale":
			return "scale";
		case "session":
			return "string";
		case "strategy":
			return "string";
		case "text":
			return "string";
		case "timezone":
			return "string";
		default:
			return "const";
	}
}

function generateAllFiles() {
	console.log("🚀 Starting Pine Script v6 TypeScript generation...");
	console.log(`📁 Input: ${DETAILS_FILE}`);
	console.log(`📁 Language constructs: ${LANGUAGE_CONSTRUCTS_FILE}`);
	console.log(`📁 Output: ${OUTPUT_DIR}`);

	// Read input file
	if (!fs.existsSync(DETAILS_FILE)) {
		console.error(`❌ Details file not found: ${DETAILS_FILE}`);
		console.error("Run scrape script first to generate the details file.");
		process.exit(1);
	}

	const data = JSON.parse(fs.readFileSync(DETAILS_FILE, "utf8"));

	// Load language constructs file for variables and constants
	if (fs.existsSync(LANGUAGE_CONSTRUCTS_FILE)) {
		const constructs = JSON.parse(
			fs.readFileSync(LANGUAGE_CONSTRUCTS_FILE, "utf8"),
		);

		// Merge standalone built-in variables
		const standaloneVars = constructs.builtInVariables?.standalone?.items || [];
		// Variable namespace names (barstate, syminfo, etc.)
		const variableNamespaces =
			constructs.builtInVariables?.namespaces?.items || [];

		// Add to data object for use by generators
		data.variables = {
			items: standaloneVars,
		};
		// Pass variable namespaces separately for NAMESPACE_NAMES generation
		data.variableNamespaces = {
			items: variableNamespaces,
		};

		console.log(
			`📊 Loaded ${variableNamespaces.length} variable namespaces (${variableNamespaces.slice(0, 5).join(", ")}, ...)`,
		);

		// Also merge constants if not already present
		if (!data.constants && constructs.constants) {
			const allConstants = [];
			const byNs = constructs.constants.byNamespace || {};
			for (const [ns, items] of Object.entries(byNs)) {
				for (const item of items) {
					allConstants.push(`${ns}.${item}`);
				}
			}
			data.constants = { items: allConstants };
		}

		console.log(
			`📊 Loaded ${standaloneVars.length} standalone variables from language constructs`,
		);
	} else {
		console.warn(
			`⚠️  Language constructs file not found: ${LANGUAGE_CONSTRUCTS_FILE}`,
		);
		console.warn("   Variable generation will be limited.");
	}

	// Ensure output directory exists
	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	// Generate all files
	generateBuiltInVariables(data);
	generateParameterRequirements(data);
	generateConstants(data);
	generateBuiltins(data);
	generateManualReference(data);

	// New generators for Phase 1 refactoring
	generateNamespaces(data);
	generateBuiltinVariablesTyped(data);
	generateNamespaceProperties(data);
	generateFunctionMetadata(data);

	console.log("✅ All TypeScript files generated successfully!");
	console.log(`📂 Location: ${OUTPUT_DIR}`);
}

// Run if called directly
if (require.main === module) {
	generateAllFiles();
}

module.exports = {
	generateAllFiles,
	generateBuiltInVariables,
	generateParameterRequirements,
	generateConstants,
	generateBuiltins,
	generateManualReference,
	generateNamespaces,
	generateBuiltinVariablesTyped,
	generateNamespaceProperties,
	generateFunctionMetadata,
};
