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

function generateAllFiles() {
	console.log("🚀 Starting Pine Script v6 TypeScript generation...");
	console.log(`📁 Input: ${DETAILS_FILE}`);
	console.log(`📁 Output: ${OUTPUT_DIR}`);

	// Read input file
	if (!fs.existsSync(DETAILS_FILE)) {
		console.error(`❌ Details file not found: ${DETAILS_FILE}`);
		console.error("Run scrape script first to generate the details file.");
		process.exit(1);
	}

	const data = JSON.parse(fs.readFileSync(DETAILS_FILE, "utf8"));

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

	console.log("✅ All TypeScript files generated successfully!");
	console.log(`📂 Location: ${OUTPUT_DIR}`);
}

// Run if called directly
if (require.main === module) {
	generateAllFiles().catch(console.error);
}

module.exports = {
	generateAllFiles,
	generateBuiltInVariables,
	generateParameterRequirements,
	generateConstants,
	generateBuiltins,
	generateManualReference,
};
