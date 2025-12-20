// Simple test script for type inference fixes
const fs = require("node:fs");
const path = require("node:path");

// Import the compiled modules (if they exist)
try {
	const {
		ComprehensiveValidator,
	} = require("../../dist/srcparser/comprehensiveValidator");
	const { Parser } = require("../../dist/srcparser/parser");

	// Test the dominant-v1.pine file
	const filePath = "pinescripts/indicators-processed/dominant-v1.pine";
	const absolutePath = path.resolve(filePath);

	if (!fs.existsSync(absolutePath)) {
		console.error(`File not found: ${filePath}`);
		process.exit(1);
	}

	const code = fs.readFileSync(absolutePath, "utf-8");
	const parser = new Parser(code);
	const ast = parser.parse();

	const validator = new ComprehensiveValidator();
	const validationErrors = validator.validate(ast);

	console.log(`Validation errors: ${validationErrors.length}`);

	// Filter for type mismatch errors
	const typeErrors = validationErrors.filter(
		(e) =>
			e.message.includes("Type mismatch") ||
			e.message.includes("Cannot assign"),
	);
	console.log(`Type errors: ${typeErrors.length}`);

	if (typeErrors.length > 0) {
		console.log("\nType errors found:");
		typeErrors.forEach((error) => {
			console.log(`  Line ${error.line}: ${error.message}`);
		});
	} else {
		console.log("No type errors found - type inference fix successful!");
	}
} catch (e) {
	console.error("Error running test:", e.message);
	console.log('Make sure to run "npm run build" first');
}
