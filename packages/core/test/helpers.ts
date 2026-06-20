/**
 * Test helpers for packages/core
 *
 * Provides utilities for parsing .pine test fixtures and running assertions.
 */

import { Parser } from "../src/parser/parser";
import { UnifiedPineValidator } from "../src/analyzer/checker";
import { renderMessage } from "../src/common/errors";
import { SemanticAnalyzer } from "../src/parser/semanticAnalyzer";
import type { Program } from "../src/parser/ast";

/**
 * Expected error in a test
 */
export interface ExpectedError {
	line?: number;
	column?: number;
	message?: string | RegExp;
}

export interface ExpectedAstShape {
	path: string;
	value?: string | number | boolean | null;
	matches?: RegExp;
	exists?: boolean;
}

/**
 * Test expectations parsed from @expects directives
 */
export interface TestExpectations {
	parse: "success" | "fail";
	noErrors?: boolean;
	errors?: ExpectedError[];
	warnings?: ExpectedError[];
	ast?: ExpectedAstShape[];
	errorCount?: number;
	warningCount?: number;
	directiveErrors?: string[]; // malformed/unknown directives - fail the test
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
 *   // @expects errors: N - assert exactly N errors total
 *   // @expects warnings: N - assert exactly N warnings total
 *   // @expects error: line=N, message="text"
 *   // @expects error: message=/regex/
 *   // @expects warning: line=N, message="text"
 *   // @expects ast: body.0.type = "ExpressionStatement"
 *   // @expects ast: body.0.expression.type ~= /CallExpression/
 *   // @expects ast: body.0.expression exists
 *
 * Unknown directives fail the test rather than being silently ignored,
 * to surface typos like `errros: 4` or `expect error: ...`.
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
 * Parse an @expects directive value. Unknown forms are recorded on
 * expectations.directiveErrors so the test fails loudly rather than
 * silently ignoring typos (e.g. `errros: 4`, `expect error: ...`).
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
		} else {
			recordDirectiveError(
				expectations,
				`Unknown parse: value '${parseValue}' (expected 'success' or 'fail')`,
			);
		}
		return;
	}

	// `errors: N` / `warnings: N` - total-count assertions
	const countMatch = value.match(/^(errors|warnings):\s*(\d+)\s*$/);
	if (countMatch) {
		const [, kind, n] = countMatch;
		if (kind === "errors") expectations.errorCount = parseInt(n, 10);
		else expectations.warningCount = parseInt(n, 10);
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

	if (value.startsWith("ast:")) {
		const astShape = parseAstDirective(value.slice(4).trim(), expectations);
		if (astShape) {
			if (!expectations.ast) expectations.ast = [];
			expectations.ast.push(astShape);
		}
		return;
	}

	recordDirectiveError(expectations, `Unknown @expects directive: '${value}'`);
}

function recordDirectiveError(
	expectations: TestExpectations,
	message: string,
): void {
	if (!expectations.directiveErrors) expectations.directiveErrors = [];
	expectations.directiveErrors.push(message);
}

function parseAstDirective(
	value: string,
	expectations: TestExpectations,
): ExpectedAstShape | null {
	const existsMatch = value.match(/^([A-Za-z0-9_.]+)\s+exists$/);
	if (existsMatch) return { path: existsMatch[1], exists: true };

	const regexMatch = value.match(/^([A-Za-z0-9_.]+)\s*~=\s*\/(.*)\/$/);
	if (regexMatch) return { path: regexMatch[1], matches: new RegExp(regexMatch[2]) };

	const valueMatch = value.match(/^([A-Za-z0-9_.]+)\s*=\s*(.+)$/);
	if (valueMatch) {
		return { path: valueMatch[1], value: parseAstExpectedValue(valueMatch[2]) };
	}

	recordDirectiveError(expectations, `Unknown ast directive: '${value}'`);
	return null;
}

function parseAstExpectedValue(value: string): string | number | boolean | null {
	const trimmed = value.trim();
	if (trimmed === "true") return true;
	if (trimmed === "false") return false;
	if (trimmed === "null") return null;
	if (/^-?\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
	if (
		(trimmed.startsWith('"') && trimmed.endsWith('"')) ||
		(trimmed.startsWith("'") && trimmed.endsWith("'"))
	) {
		return trimmed.slice(1, -1);
	}
	return trimmed;
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

function getAstPathValue(root: unknown, path: string): unknown {
	let current = root;
	for (const segment of path.split(".")) {
		if (current === null || current === undefined) return undefined;
		if (/^\d+$/.test(segment)) {
			if (!Array.isArray(current)) return undefined;
			current = current[Number(segment)];
		} else if (typeof current === "object") {
			current = (current as Record<string, unknown>)[segment];
		} else {
			return undefined;
		}
	}
	return current;
}

function formatAstValue(value: unknown): string {
	if (value === undefined) return "<missing>";
	if (typeof value === "string") return JSON.stringify(value);
	if (typeof value === "number" || typeof value === "boolean" || value === null)
		return String(value);
	if (Array.isArray(value)) return `[array length=${value.length}]`;
	if (typeof value === "object") {
		const type = (value as { type?: string }).type;
		return type ? `{type=${type}}` : "{object}";
	}
	return String(value);
}

function checkAstShapes(
	ast: Program,
	expectations: ExpectedAstShape[],
	failures: string[],
): void {
	for (const expected of expectations) {
		const actual = getAstPathValue(ast, expected.path);
		if (expected.exists) {
			if (actual === undefined) {
				failures.push(`Expected AST path to exist: ${expected.path}`);
			}
			continue;
		}
		if (expected.matches) {
			if (!expected.matches.test(String(actual))) {
				failures.push(
					`Expected AST ${expected.path} to match ${expected.matches}, got ${formatAstValue(actual)}`,
				);
			}
			continue;
		}
		if (actual !== expected.value) {
			failures.push(
				`Expected AST ${expected.path} = ${formatAstValue(expected.value)}, got ${formatAstValue(actual)}`,
			);
		}
	}
}

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

	// Surface any directive-level errors before doing anything else - 
	// silently swallowing typos is what made several existing fixtures
	// no-ops for years.
	if (expectations.directiveErrors && expectations.directiveErrors.length > 0) {
		result.success = false;
		for (const msg of expectations.directiveErrors) {
			result.failures.push(`Bad @expects directive: ${msg}`);
		}
	}

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

	if (result.parseErrors.length === 0 && expectations.ast) {
		const astFailures: string[] = [];
		checkAstShapes(ast, expectations.ast, astFailures);
		if (astFailures.length > 0) {
			result.success = false;
			result.failures.push(...astFailures);
		}
	}

	// Run validation if parsing succeeded and we need to check for errors
	if (result.parseErrors.length === 0) {
		const validator = new UnifiedPineValidator();
		const version = parser.getDetectedVersion() || "6";
		const validationResult = validator.validate(ast, version);
		// Match the CLI's channels (cli.ts): errors come from the validator,
		// warnings from the SemanticAnalyzer (v6 only) - validator warnings
		// are stripped. Fixtures thereby assert the same warning channel the
		// CLI emits. see plan/31. Template messages (code + ctx, the
		// pine-lint-structured form) are rendered like the CLI renders them,
		// so fixtures can pin TV's exact wording. see INV061
		result.validationErrors = validationResult
			.filter((e) => e.severity === 0)
			.map((e) => ({
				line: e.line,
				column: e.column,
				message: renderMessage(e),
				severity: e.severity,
			}));
		if (version === "6") {
			const semanticAnalyzer = new SemanticAnalyzer();
			result.validationErrors.push(
				...semanticAnalyzer.analyze(ast).map((w) => ({
					line: w.line,
					column: w.column,
					message: w.message,
					severity: w.severity,
				})),
			);
		}

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

		// Check total-count assertions
		if (expectations.errorCount !== undefined) {
			const errors = result.validationErrors.filter((e) => e.severity === 0);
			if (errors.length !== expectations.errorCount) {
				result.success = false;
				result.failures.push(
					`Expected exactly ${expectations.errorCount} error(s), got ${errors.length}: ${errors.map((e) => `[${e.line}:${e.column}] ${e.message}`).join(", ")}`,
				);
			}
		}
		if (expectations.warningCount !== undefined) {
			const warnings = result.validationErrors.filter((e) => e.severity === 1);
			if (warnings.length !== expectations.warningCount) {
				result.success = false;
				result.failures.push(
					`Expected exactly ${expectations.warningCount} warning(s), got ${warnings.length}: ${warnings.map((e) => `[${e.line}:${e.column}] ${e.message}`).join(", ")}`,
				);
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

	// Check expected errors. Matched against parse (lexer + parser) errors
	// as well as validation errors, and checked even when parsing failed,
	// so parse-error fixtures can pin a line + message instead of only
	// asserting `parse: fail`. see INV025
	if (expectations.errors) {
		const allErrors = [
			...result.parseErrors,
			...result.validationErrors.filter((e) => e.severity === 0),
		];
		for (const expected of expectations.errors) {
			const found = allErrors.find((e) => {
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

	return result;
}

/**
 * Load and run a test from a .pine file
 */
export function runTestFile(filePath: string, content: string): TestResult {
	const parsed = parseTestFile(content);
	return runTest(parsed.code, parsed.expectations);
}
