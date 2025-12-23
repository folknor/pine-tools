#!/usr/bin/env node

/**
 * Convert hierarchical language constructs to details format for generate.js
 *
 * This converts:
 * - v6-language-constructs.json (hierarchical)
 * TO: complete-v6-details.json (flat details for generate.js)
 */

const fs = require("node:fs");
const path = require("node:path");

const INPUT_FILE = path.join(
	__dirname,
	"../v6/raw/v6-language-constructs.json",
);
const OUTPUT_FILE = path.join(__dirname, "../v6/raw/complete-v6-details.json");

function convertToDetails() {
	console.log("🔄 Converting hierarchical constructs to details format...");
	console.log(`📁 Input: ${INPUT_FILE}`);
	console.log(`📁 Output: ${OUTPUT_FILE}`);

	// Read hierarchical data
	const hierarchical = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

	// Convert to details format that generate.js expects
	const details = {
		metadata: {
			convertedAt: new Date().toISOString(),
			source: "Converted from hierarchical constructs",
		},
		functions: {},
		variables: {
			items: [],
		},
		constants: {
			items: [],
		},
		keywords: {
			items: [],
		},
		operators: {
			items: [],
		},
	};

	// ===== FUNCTIONS =====
	// Extract all functions from byNamespace
	const functionsByNamespace = hierarchical.functions.byNamespace || {};
	Object.entries(functionsByNamespace).forEach(([namespace, functionNames]) => {
		functionNames.forEach((functionName) => {
			const fullName = `${namespace}.${functionName}`;
			details.functions[fullName] = {
				name: fullName,
				syntax: `${fullName}()`,
				description: `Pine Script v6 function: ${fullName}`,
				category: namespace,
				parameters: [],
				returns: "unknown",
			};
		});
	});

	// Add core functions (standalone)
	const coreFunctions = [
		"alert",
		"alertcondition",
		"barcolor",
		"bgcolor",
		"bool",
		"box",
		"color",
		"fill",
		"fixnan",
		"float",
		"hline",
		"hour",
		"indicator",
		"input",
		"int",
		"label",
		"library",
		"line",
		"linefill",
		"max_bars_back",
		"minute",
		"month",
		"na",
		"nz",
		"plot",
		"plotarrow",
		"plotbar",
		"plotcandle",
		"plotchar",
		"plotshape",
		"polyline",
		"string",
		"dayofmonth",
		"dayofweek",
		"second",
		"strategy",
		"weekofyear",
		"year",
		"time",
		"time_close",
		"timestamp",
	];

	coreFunctions.forEach((functionName) => {
		details.functions[functionName] = {
			name: functionName,
			syntax: `${functionName}()`,
			description: `Core Pine Script v6 function: ${functionName}`,
			category: "core",
			parameters: [],
			returns: "unknown",
		};
	});

	// ===== VARIABLES =====
	// Standalone variables
	const standaloneVariables =
		hierarchical.builtInVariables.standalone.items || [];
	details.variables.items.push(...standaloneVariables);

	// Namespaced variables
	const variablesByNamespace = hierarchical.builtInVariables.byNamespace || {};
	Object.entries(variablesByNamespace).forEach(([namespace, variableNames]) => {
		variableNames.forEach((variableName) => {
			const fullName = `${namespace}.${variableName}`;
			details.variables.items.push(fullName);
		});
	});

	// ===== CONSTANTS =====
	// Extract all constants from byNamespace
	const constantsByNamespace = hierarchical.constants.byNamespace || {};
	Object.entries(constantsByNamespace).forEach(([namespace, constantNames]) => {
		constantNames.forEach((constantName) => {
			const fullName = `${namespace}.${constantName}`;
			details.constants.items.push(fullName);
		});
	});

	// Add standalone constants (true, false)
	details.constants.items.push("true", "false");

	// ===== KEYWORDS & OPERATORS =====
	details.keywords.items = hierarchical.keywords.items || [];
	details.operators.items = hierarchical.operators.items || [];

	// Save details file
	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(details, null, 2), "utf8");

	console.log("✅ Conversion completed successfully!");
	console.log(`📊 Results:`);
	console.log(`   Functions: ${Object.keys(details.functions).length}`);
	console.log(`   Variables: ${details.variables.items.length}`);
	console.log(`   Constants: ${details.constants.items.length}`);
	console.log(`   Keywords: ${details.keywords.items.length}`);
	console.log(`   Operators: ${details.operators.items.length}`);
	console.log(`💾 Saved to: ${OUTPUT_FILE}`);

	return details;
}

// Run if called directly
if (require.main === module) {
	convertToDetails();
}

module.exports = { convertToDetails };
