#!/usr/bin/env node

/**
 * Debug multi-line indicator() function call parsing
 * Test case: Lines 13-16 of valid.pine
 */

import { ASTExtractor } from "../../src/parser/astExtractor.js";
import { Parser } from "../../src/parser/parser.js";

const code = `//@version=6
indicator("Valid Indicator - Multiple Params",
     shorttitle="VI",
     overlay=true,
     max_labels_count=500)
`;

console.log("===== INPUT CODE =====");
console.log(code);
console.log("\n===== PARSING =====");

const parser = new Parser(code);
const ast = parser.parse();

console.log("\n===== AST (body statements) =====");
console.log(JSON.stringify(ast.body, null, 2));

const extractor = new ASTExtractor();
const result = extractor.extract(ast);

console.log("\n===== EXTRACTED VARIABLES =====");
console.log(JSON.stringify(result.variables, null, 2));

console.log("\n===== ANALYSIS =====");
console.log(`Number of statements parsed: ${ast.body.length}`);
console.log(`Number of variables extracted: ${result.variables.length}`);

// Check if shorttitle, overlay, max_labels_count appear as variables (WRONG!)
const wrongVars = result.variables.filter((v) =>
	["shorttitle", "overlay", "max_labels_count"].includes(v.name),
);

if (wrongVars.length > 0) {
	console.log(
		"\n⚠️  ERROR: These named parameters were incorrectly identified as variables:",
	);
	for (const v of wrongVars) {
		console.log(`  - ${v.name} (line ${v.definition.start.line})`);
	}
} else {
	console.log("\n✅ No false variable declarations found");
}
