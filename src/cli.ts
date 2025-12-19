#!/usr/bin/env node

import * as fs from "node:fs";
import * as path from "node:path";
import {
	ASTExtractor,
	type PineLintError,
	type PineLintOutput,
} from "./parser/astExtractor";
import {
	ComprehensiveValidator,
	DiagnosticSeverity,
} from "./parser/comprehensiveValidator";
import { Parser } from "./parser/parser";

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		console.error("Usage: pine-validate <file.pine>");
		process.exit(1);
	}

	// Match pine-lint behavior: single file
	const filePath = args[0];
	const absolutePath = path.resolve(filePath);

	if (!fs.existsSync(absolutePath)) {
		const output: PineLintOutput = {
			success: false,
			error: `File not found: ${filePath}`,
		};
		console.log(JSON.stringify(output, null, 2));
		process.exit(1);
	}

	try {
		const code = fs.readFileSync(absolutePath, "utf-8");
		const parser = new Parser(code);
		const ast = parser.parse();

		const extractor = new ASTExtractor();
		const result = extractor.extract(ast);

		// Run validation to get errors
		const validator = new ComprehensiveValidator();
		const validationErrors = validator.validate(ast);

		// Convert validation errors to pine-lint format (only errors, not warnings)
		const errors: PineLintError[] = validationErrors
			.filter((e) => e.severity === DiagnosticSeverity.Error)
			.map((e) => ({
				start: { line: e.line, column: e.column },
				end: { line: e.line, column: e.column + e.length },
				message: e.message,
			}));

		if (errors.length > 0) {
			result.errors = errors;
		}

		const output: PineLintOutput = {
			success: true,
			result,
		};
		console.log(JSON.stringify(output, null, 2));
		process.exit(0);
	} catch (e: unknown) {
		const error = e as { message?: string };
		const output: PineLintOutput = {
			success: false,
			error: error.message || String(e),
		};
		console.log(JSON.stringify(output, null, 2));
		process.exit(1);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
