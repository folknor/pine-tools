/**
 * Test helpers for packages/core
 *
 * Provides utilities for parsing .pine test fixtures and running assertions.
 */

import { Parser } from "../src/parser/parser";
import { UnifiedPineValidator } from "../src/analyzer/checker";
import type { Program } from "../src/parser/ast";

/**
 * Expected error in a test
 */
export interface ExpectedError {
	line?: number;
	column?: number;
	message?: string | RegExp;
}

/**
 * Test expectations parsed from @expects directives
 */
export interface TestExpectations {
	parse: "success" | "fail";
	noErrors?: boolean;
	errors?: ExpectedError[];
	warnings?: ExpectedError[];
}

/**
 * Parsed test file
 */
export interface ParsedTestFile {
	name: string;
	description: string;
	code: string;
	expectations: TestExpectations;
}

/**
 * Parse a .pine test file and extract expectations from comment directives.
 *
 * Supported directives:
 *   // @test <name>
 *   // @description <text>
 *   // @expects parse: success|fail
 *   // @expects no-errors
 *   // @expects error: line=N, message="text"
 *   // @expects error: message=/regex/
 *   // @expects warning: line=N, message="text"
 */
export function parseTestFile(content: string): ParsedTestFile {
	const lines = content.split("\n");
	let name = "";
	let description = "";
	const expectations: TestExpectations = {
		parse: "success", // Default expectation
	};

	const codeLines: string[] = [];
	let inDirectives = true;

	for (const line of lines) {
		const trimmed = line.trim();

		// Check for directives at the start of file
		if (inDirectives && trimmed.startsWith("// @")) {
			const directive = trimmed.slice(4); // Remove "// @"

			if (directive.startsWith("test ")) {
				name = directive.slice(5).trim();
			} else if (directive.startsWith("description ")) {
				description = directive.slice(12).trim();
			} else if (directive.startsWith("expects ")) {
				parseExpectsDirective(directive.slice(8).trim(), expectations);
			}
		} else {
			// Once we hit non-directive content, stop looking for directives
			if (trimmed && !trimmed.startsWith("//")) {
				inDirectives = false;
			}
			codeLines.push(line);
		}
	}

	return {
		name,
		description,
		code: codeLines.join("\n").trim(),
		expectations,
	};
}

/**
 * Parse an @expects directive value
 */
function parseExpectsDirective(
	value: string,
	expectations: TestExpectations,
): void {
	if (value === "no-errors") {
		expectations.noErrors = true;
		return;
	}

	if (value.startsWith("parse:")) {
		const parseValue = value.slice(6).trim();
		if (parseValue === "success" || parseValue === "fail") {
			expectations.parse = parseValue;
		}
		return;
	}

	if (value.startsWith("error:")) {
		const error = parseErrorDirective(value.slice(6).trim());
		if (!expectations.errors) {
			expectations.errors = [];
		}
		expectations.errors.push(error);
		return;
	}

	if (value.startsWith("warning:")) {
		const warning = parseErrorDirective(value.slice(8).trim());
		if (!expectations.warnings) {
			expectations.warnings = [];
		}
		expectations.warnings.push(warning);
		return;
	}
}

/**
 * Parse an error/warning directive value like: line=5, message="text"
 */
function parseErrorDirective(value: string): ExpectedError {
	const error: ExpectedError = {};

	// Parse line=N
	const lineMatch = value.match(/line=(\d+)/);
	if (lineMatch) {
		error.line = parseInt(lineMatch[1], 10);
	}

	// Parse column=N
	const columnMatch = value.match(/column=(\d+)/);
	if (columnMatch) {
		error.column = parseInt(columnMatch[1], 10);
	}

	// Parse message="text" or message=/regex/
	const messageMatch = value.match(/message=("[^"]+"|\/[^/]+\/)/);
	if (messageMatch) {
		const msg = messageMatch[1];
		if (msg.startsWith("/") && msg.endsWith("/")) {
			// Regex
			error.message = new RegExp(msg.slice(1, -1));
		} else {
			// String (remove quotes)
			error.message = msg.slice(1, -1);
		}
	}

	return error;
}

/**
 * Result of running a test
 */
export interface TestResult {
	success: boolean;
	ast?: Program;
	parseErrors: Array<{ line: number; column: number; message: string }>;
	validationErrors: Array<{
		line: number;
		column: number;
		message: string;
		severity: number;
	}>;
	failures: string[];
}

/**
 * Run a test against parsed code and expectations
 */
export function runTest(
	code: string,
	expectations: TestExpectations,
): TestResult {
	const result: TestResult = {
		success: true,
		parseErrors: [],
		validationErrors: [],
		failures: [],
	};

	// Parse the code
	const parser = new Parser(code);
	const ast = parser.parse();
	result.ast = ast;

	// Combine lexer and parser errors
	const lexerErrors = parser.getLexerErrors().map((e) => ({
		line: e.line,
		column: e.column,
		message: e.message,
	}));
	const parserErrors = parser.getParserErrors().map((e) => ({
		line: e.line,
		column: e.column,
		message: e.message,
	}));
	result.parseErrors = [...lexerErrors, ...parserErrors];

	// Check parse expectation
	if (expectations.parse === "success" && result.parseErrors.length > 0) {
		result.success = false;
		result.failures.push(
			`Expected parse success but got ${result.parseErrors.length} error(s): ${result.parseErrors.map((e) => e.message).join(", ")}`,
		);
	} else if (expectations.parse === "fail" && result.parseErrors.length === 0) {
		result.success = false;
		result.failures.push("Expected parse failure but parsing succeeded");
	}

	// Run validation if parsing succeeded and we need to check for errors
	if (result.parseErrors.length === 0) {
		const validator = new UnifiedPineValidator();
		const version = parser.getDetectedVersion() || "6";
		const validationResult = validator.validate(ast, version);
		result.validationErrors = validationResult.map((e) => ({
			line: e.line,
			column: e.column,
			message: e.message,
			severity: e.severity,
		}));

		// Check no-errors expectation
		if (expectations.noErrors) {
			const errors = result.validationErrors.filter((e) => e.severity === 0);
			if (errors.length > 0) {
				result.success = false;
				result.failures.push(
					`Expected no errors but got ${errors.length}: ${errors.map((e) => `[${e.line}:${e.column}] ${e.message}`).join(", ")}`,
				);
			}
		}

		// Check expected errors
		if (expectations.errors) {
			for (const expected of expectations.errors) {
				const found = result.validationErrors.find((e) => {
					if (expected.line !== undefined && e.line !== expected.line)
						return false;
					if (expected.column !== undefined && e.column !== expected.column)
						return false;
					if (expected.message !== undefined) {
						if (expected.message instanceof RegExp) {
							if (!expected.message.test(e.message)) return false;
						} else {
							if (!e.message.includes(expected.message)) return false;
						}
					}
					return true;
				});

				if (!found) {
					result.success = false;
					const desc = [];
					if (expected.line !== undefined) desc.push(`line=${expected.line}`);
					if (expected.message !== undefined)
						desc.push(`message=${expected.message}`);
					result.failures.push(`Expected error not found: ${desc.join(", ")}`);
				}
			}
		}

		// Check expected warnings
		if (expectations.warnings) {
			for (const expected of expectations.warnings) {
				const found = result.validationErrors.find((e) => {
					if (e.severity !== 1) return false; // Warnings have severity 1
					if (expected.line !== undefined && e.line !== expected.line)
						return false;
					if (expected.message !== undefined) {
						if (expected.message instanceof RegExp) {
							if (!expected.message.test(e.message)) return false;
						} else {
							if (!e.message.includes(expected.message)) return false;
						}
					}
					return true;
				});

				if (!found) {
					result.success = false;
					const desc = [];
					if (expected.line !== undefined) desc.push(`line=${expected.line}`);
					if (expected.message !== undefined)
						desc.push(`message=${expected.message}`);
					result.failures.push(
						`Expected warning not found: ${desc.join(", ")}`,
					);
				}
			}
		}
	}

	return result;
}

/**
 * Load and run a test from a .pine file
 */
export function runTestFile(filePath: string, content: string): TestResult {
	const parsed = parseTestFile(content);
	return runTest(parsed.code, parsed.expectations);
}
