#!/usr/bin/env node

/**
 * Convert JavaScript files to TypeScript
 * Converts require() to import, adds type annotations, and fixes syntax
 */

import * as fs from "node:fs";
import * as path from "node:path";

const testFiles = [
	// "test/benchmark.test.js", // Doesn't exist - converted to .ts already
	// "test/validation.test.js", // Doesn't exist - converted to .ts already
];

const devToolFiles = [
	"debug-tokens.js",
	"debug-line-61.js",
	"test-type-inference.js",
	// "debug-validator.js", // Doesn't exist
	"debug-type-inference.js",
	"debug-function-tokens.js",
];

const mcpFiles = ["mcp/validator-server.js", "mcp/pinescript-mcp-server.js"];

const qaFiles = ["compare-validation-results.js", "test-mcp-server.js"];

const selfTestFiles = [
	// "test/v0.4.0-self-test.js", // Doesn't exist
];

const regressionFiles = [
	// "test/regression-extended.test.js", // Doesn't exist - converted to .ts already
	// "test/regression-namespace-functions.test.js", // Doesn't exist - converted to .ts already
];

const comprehensiveFiles = [
	// "test/comprehensive-validation-test.js", // Doesn't exist
];

function convertRequireToImport(content: string): string {
	// Convert require() statements to import
	content = content.replace(
		/const\s+{\s*([^}]+)\s*}\s*=\s*require\("([^"]+)"\);/g,
		(_match, imports, module) => {
			const importList = imports.split(",").map((imp) => imp.trim());
			const importStatements = importList
				.map((imp) => {
					const [name] = imp.split(" as ");
					return `import { ${name.trim()} } from "${module}";`;
				})
				.join("\n");
			return importStatements;
		},
	);

	// Convert simple require()
	content = content.replace(
		/const\s+([^=]+)\s*=\s*require\("([^"]+)"\);/g,
		(_match, varName, module) => {
			return `import ${varName.trim()} from "${module}";`;
		},
	);

	// Convert require() in function calls
	content = content.replace(/require\("([^"]+)"\)/g, 'import("$1")');

	return content;
}

function addTypeAnnotations(content: string): string {
	// Add basic type annotations for common patterns

	// Function parameters
	content = content.replace(
		/function\s+(\w+)\s*\(([^)]*)\)\s*{/g,
		(_match, funcName, params) => {
			return `function ${funcName}(${params}): any {`;
		},
	);

	// Variable declarations with known types
	content = content.replace(
		/const\s+(\w+)\s*=\s*([^;]+);/g,
		(_match, varName, value) => {
			// Try to infer type from value
			if (value.includes("require(") || value.includes("import(")) {
				return `const ${varName}: any = ${value};`;
			}
			if (value.includes("fs.")) {
				return `const ${varName}: typeof fs = ${value};`;
			}
			if (value.includes("path.")) {
				return `const ${varName}: typeof path = ${value};`;
			}
			return `const ${varName}: any = ${value};`;
		},
	);

	return content;
}

function convertArrowFunctions(content: string): string {
	// Convert problematic arrow functions to regular functions
	content = content.replace(
		/const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*{/g,
		(_match, funcName, params) => {
			return `function ${funcName}(${params}) {`;
		},
	);

	return content;
}

function convertFile(filePath: string): void {
	if (!fs.existsSync(filePath)) {
		console.log(`File not found: ${filePath}`);
		return;
	}

	console.log(`Converting: ${filePath}`);
	let content = fs.readFileSync(filePath, "utf-8");

	// Apply conversions
	content = convertRequireToImport(content);
	content = addTypeAnnotations(content);
	content = convertArrowFunctions(content);

	// Write back with .ts extension
	const tsPath = filePath.replace(".js", ".ts");
	fs.writeFileSync(tsPath, content);

	// Optionally remove original .js file
	// fs.unlinkSync(filePath);
}

// Convert test files
console.log("Converting test files...");
testFiles.forEach(convertFile);

// Convert dev tool files
console.log("Converting dev tool files...");
devToolFiles.forEach((file) => {
	convertFile(path.join("dev-tools", file));
});

// Convert MCP files
console.log("Converting MCP files...");
mcpFiles.forEach((file) => {
	convertFile(path.join("mcp", file));
});

// Convert QA files
console.log("Converting QA files...");
qaFiles.forEach(convertFile);

// Convert self-test files
console.log("Converting self-test files...");
selfTestFiles.forEach(convertFile);

// Convert regression files
console.log("Converting regression files...");
regressionFiles.forEach(convertFile);

// Convert comprehensive files
console.log("Converting comprehensive files...");
comprehensiveFiles.forEach(convertFile);

console.log("Conversion complete!");
console.log("\nNext steps:");
console.log("1. Review converted files for any syntax errors");
console.log("2. Update package.json scripts to point to .ts files");
console.log("3. Update tsconfig.json if needed");
console.log("4. Run tests to verify conversion");
