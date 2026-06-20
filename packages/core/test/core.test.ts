/**
 * Core Package Test Runner
 *
 * Discovers and runs all .pine test fixtures in the fixtures/ directory.
 * Each .pine file contains @expects directives that define test expectations.
 */

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { DiagnosticSeverity, UnifiedPineValidator } from "../src/analyzer/checker";
import { Parser } from "../src/parser/parser";
import { parseTestFile, runTest } from "./helpers";

const FIXTURES_DIR = join(__dirname, "fixtures");

/**
 * Recursively find all .pine files in a directory
 */
function findPineFiles(dir: string): string[] {
	const files: string[] = [];

	for (const entry of readdirSync(dir)) {
		const fullPath = join(dir, entry);
		const stat = statSync(fullPath);

		if (stat.isDirectory()) {
			files.push(...findPineFiles(fullPath));
		} else if (entry.endsWith(".pine")) {
			files.push(fullPath);
		}
	}

	return files;
}

/**
 * Get a human-readable test name from a file path
 */
function getTestName(filePath: string): string {
	return relative(FIXTURES_DIR, filePath).replace(/\.pine$/, "");
}

// Discover all .pine fixtures
const fixtures = findPineFiles(FIXTURES_DIR);

describe("Pine Script Core", () => {
	for (const fixturePath of fixtures) {
		const testName = getTestName(fixturePath);

		it(testName, () => {
			const content = readFileSync(fixturePath, "utf-8");
			const parsed = parseTestFile(content);
			const result = runTest(parsed.code, parsed.expectations);

			if (!result.success) {
				// Build detailed failure message
				const details = [
					`Test: ${testName}`,
					parsed.description ? `Description: ${parsed.description}` : null,
					`Failures:`,
					...result.failures.map((f) => `  - ${f}`),
				]
					.filter(Boolean)
					.join("\n");

				expect.fail(details);
			}
		});
	}
});

describe("Local @source library exports", () => {
	it("validates imported members from local export sets", () => {
		const code = `//@version=6
/// @source ./lib.pine
import User/MyLib/1 as myLib

ok = myLib.good(close)
bad = myLib.missing(close)
`;
		const parser = new Parser(code, (importLine) =>
			importLine === 3 ? "./lib.pine" : undefined,
		);
		const ast = parser.parse();
		const validator = new UnifiedPineValidator(
			new Map([["./lib.pine", new Set(["good"])]])
		);
		const errors = validator
			.validate(ast, parser.getDetectedVersion() || "6")
			.filter((e) => e.severity === DiagnosticSeverity.Error);

		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe(
			"Could not find function or function reference 'myLib.missing'",
		);
	});
});

// Also export for programmatic use
export { fixtures, findPineFiles, getTestName };
