import * as fs from "node:fs";
import * as path from "node:path";
import {
	DiagnosticSeverity,
	UnifiedPineValidator,
} from "../../core/src/analyzer/checker";
import {
	ASTExtractor,
	type PineLintError,
	type PineLintOutput,
} from "../../core/src/parser/astExtractor";
import { Parser } from "../../core/src/parser/parser";
import { SemanticAnalyzer } from "../../core/src/parser/semanticAnalyzer";

const HELP = `Usage: pine-validate [options] [file.pine]

Validate a Pine Script source. Reads from a file path, an inline string, or stdin.

Options:
  -c, --code <pinescript>   Validate the given Pine Script string instead of a file
  -h, --help                Show this help and exit

Input sources (pick one):
  pine-validate path/to/script.pine
  pine-validate --code 'indicator("x") plot(close)'
  cat script.pine | pine-validate -

Output: JSON on stdout matching the pine-lint format.`;

interface ParsedArgs {
	help: boolean;
	code?: string;
	filePath?: string;
	stdin: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
	const parsed: ParsedArgs = { help: false, stdin: false };
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "-h" || arg === "--help") {
			parsed.help = true;
		} else if (arg === "-c" || arg === "--code") {
			const value = argv[++i];
			if (value === undefined) {
				throw new Error(`Missing value for ${arg}`);
			}
			parsed.code = value;
		} else if (arg === "-") {
			parsed.stdin = true;
		} else if (arg.startsWith("-")) {
			throw new Error(`Unknown option: ${arg}`);
		} else if (parsed.filePath === undefined) {
			parsed.filePath = arg;
		} else {
			throw new Error(`Unexpected argument: ${arg}`);
		}
	}
	return parsed;
}

async function main() {
	let parsed: ParsedArgs;
	try {
		parsed = parseArgs(process.argv.slice(2));
	} catch (e) {
		const msg = (e as Error).message;
		console.error(`${msg}\n\n${HELP}`);
		process.exit(2);
	}

	if (parsed.help) {
		console.log(HELP);
		process.exit(0);
	}

	const sourceCount =
		(parsed.code !== undefined ? 1 : 0) +
		(parsed.filePath !== undefined ? 1 : 0) +
		(parsed.stdin ? 1 : 0);

	if (sourceCount === 0) {
		console.error(`No input provided.\n\n${HELP}`);
		process.exit(2);
	}
	if (sourceCount > 1) {
		console.error(
			`Provide only one of: file path, --code, or stdin.\n\n${HELP}`,
		);
		process.exit(2);
	}

	let code: string;
	if (parsed.code !== undefined) {
		code = parsed.code;
	} else if (parsed.stdin) {
		code = fs.readFileSync(0, "utf-8");
	} else {
		const filePath = parsed.filePath as string;
		const absolutePath = path.resolve(filePath);
		if (!fs.existsSync(absolutePath)) {
			const output: PineLintOutput = {
				success: false,
				error: `File not found: ${filePath}`,
			};
			console.log(JSON.stringify(output, null, 2));
			process.exit(1);
		}
		code = fs.readFileSync(absolutePath, "utf-8");
	}

	try {
		const parser = new Parser(code);
		const ast = parser.parse();

		// Get lexer errors first (string validation, etc.)
		const lexerErrors = parser.getLexerErrors();

		// Get parser errors (syntax errors during parsing)
		const parserErrors = parser.getParserErrors();

		// Get detected version for version-aware validation
		const detectedVersion = parser.getDetectedVersion() || "6"; // Default to v6 if not detected

		const extractor = new ASTExtractor();
		const result = extractor.extract(ast);

		// Run validation to get errors (version-aware)
		const validator = new UnifiedPineValidator();
		const validationErrors = validator.validate(ast, detectedVersion);

		// Run semantic analysis to get warnings (only for v6)
		const semanticWarnings = [];
		if (detectedVersion === "6") {
			const semanticAnalyzer = new SemanticAnalyzer();
			semanticWarnings.push(...semanticAnalyzer.analyze(ast));
		}

		// Convert lexer errors to pine-lint format
		const lexerPineLintErrors: PineLintError[] = lexerErrors.map((e) => ({
			start: { line: e.line, column: e.column },
			end: { line: e.line, column: e.column + 1 },
			message: e.message,
		}));

		// Convert parser errors to pine-lint format
		const parserPineLintErrors: PineLintError[] = parserErrors.map((e) => ({
			start: { line: e.line, column: e.column },
			end: { line: e.line, column: e.column + 1 },
			message: e.message,
		}));

		// Convert validation errors to pine-lint format (only errors, not warnings)
		const validationPineLintErrors: PineLintError[] = validationErrors
			.filter((e) => e.severity === DiagnosticSeverity.Error)
			.map((e) => ({
				start: { line: e.line, column: e.column },
				end: { line: e.line, column: e.column + e.length },
				message: e.message,
			}));

		// Convert semantic warnings to pine-lint format (warnings)
		const semanticPineLintWarnings: PineLintError[] = semanticWarnings
			.filter((w) => w.severity === DiagnosticSeverity.Warning)
			.map((w) => ({
				start: { line: w.line, column: w.column },
				end: { line: w.line, column: w.column + w.length },
				message: w.message,
			}));

		// Combine all errors (lexer errors first, then parser, then validation)
		const errors: PineLintError[] = [
			...lexerPineLintErrors,
			...parserPineLintErrors,
			...validationPineLintErrors,
		];

		// Combine all warnings
		const warnings: PineLintError[] = [...semanticPineLintWarnings];

		if (errors.length > 0) {
			result.errors = errors;
		}

		if (warnings.length > 0) {
			result.warnings = warnings;
		}

		const output: PineLintOutput = {
			success: true,
			result,
		};
		// Write to stdout and wait for drain before exiting
		const jsonOutput = JSON.stringify(output, null, 2);
		process.stdout.write(`${jsonOutput}\n`, () => {
			process.exit(0);
		});
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
