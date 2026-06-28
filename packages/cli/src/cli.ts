import * as fs from "node:fs";
import * as path from "node:path";
import {
	DiagnosticSeverity,
	UnifiedPineValidator,
} from "../../core/src/analyzer/checker";
import { renderMessage } from "../../core/src/common/errors";
import { createSourcePositionMapper } from "../../core/src/common/sourcePositions";
import {
	ASTExtractor,
	type PineLintError,
	type PineLintOutput,
} from "../../core/src/parser/astExtractor";
import { Parser } from "../../core/src/parser/parser";
import { SemanticAnalyzer } from "../../core/src/parser/semanticAnalyzer";

// Replaced by esbuild's `define` at build time (see scripts/build-extension.js).
// Falls back to "dev" if the file is run outside the bundle (e.g. via ts-node).
declare const __BUILD_TIME__: string;
declare const __VERSION__: string;
const BUILD_TIME =
	typeof __BUILD_TIME__ !== "undefined" ? __BUILD_TIME__ : "dev";
const VERSION = typeof __VERSION__ !== "undefined" ? __VERSION__ : "dev";

const HELP = `Usage: pine-lint [options] [file.pine]

Validate a Pine Script source. Reads from a file path, an inline string, or stdin.

Options:
  -c, --code <pinescript>   Validate the given Pine Script string instead of a file
      --tv                  Send the source to TradingView's translate_light endpoint
                            and return its response instead of running locally
      --full-response       With --tv, keep the verbose "scopes" block in the result
                            (stripped by default)
  -H, --human               Human-readable output: one "file:line:col: severity: message"
                            line per finding plus a summary, instead of the JSON
                            payload. Exits 1 when there are errors. Works with --tv.
  -V, --version             Print the version and build timestamp and exit
  -h, --help                Show this help and exit

Input sources (pick one):
  pine-lint path/to/script.pine
  pine-lint --code 'indicator("x") plot(close)'
  cat script.pine | pine-lint -

Output: JSON on stdout matching the pine-lint format.`;

interface ParsedArgs {
	help: boolean;
	version: boolean;
	code?: string;
	filePath?: string;
	stdin: boolean;
	tv: boolean;
	fullResponse: boolean;
	human: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
	const parsed: ParsedArgs = {
		help: false,
		version: false,
		stdin: false,
		tv: false,
		fullResponse: false,
		human: false,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "-h" || arg === "--help") {
			parsed.help = true;
		} else if (arg === "-V" || arg === "--version") {
			parsed.version = true;
		} else if (arg === "-c" || arg === "--code") {
			const value = argv[++i];
			if (value === undefined) {
				throw new Error(`Missing value for ${arg}`);
			}
			parsed.code = value;
		} else if (arg === "--tv") {
			parsed.tv = true;
		} else if (arg === "--full-response") {
			parsed.fullResponse = true;
		} else if (arg === "-H" || arg === "--human") {
			parsed.human = true;
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

// Emit a final payload to stdout with a synchronous write to fd 1, then exit.
// process.stdout.write to a PIPE (no tty) is asynchronous, and process.exit()
// races that buffered write - it truncates, or drops, the output entirely.
// That is why a headless caller (spawned piped, e.g. brokkr) previously saw
// nothing and had to wrap us in `script -qfec`. fs.writeSync blocks until the
// kernel has the bytes, so following it with process.exit() is safe and the
// output always lands. Replaces the old write-callback dance.
function emitAndExit(jsonText: string, exitCode: number): never {
	fs.writeSync(1, `${jsonText}\n`);
	process.exit(exitCode);
}

function parseSourceDirective(
	lines: string[],
	importLine: number,
): string | undefined {
	const line = lines[importLine - 2];
	if (!line) return undefined;
	return line.match(/^\s*\/\/\/\s*@source\s+(.+?)\s*$/)?.[1];
}

function collectLocalLibraryExports(
	code: string,
	baseDir: string,
): Map<string, Set<string>> {
	const exportsByPath = new Map<string, Set<string>>();
	const lines = code.split(/\r\n|\r|\n/);
	for (let i = 0; i < lines.length; i++) {
		const sourcePath = parseSourceDirective(lines, i + 1);
		if (!sourcePath || !/^\s*import\s+/.test(lines[i] ?? "")) continue;
		const absolutePath = path.resolve(baseDir, sourcePath);
		if (!fs.existsSync(absolutePath)) continue;
		const libSource = fs.readFileSync(absolutePath, "utf-8");
		const libParser = new Parser(libSource);
		const libAst = libParser.parse();
		if (
			libParser.getLexerErrors().length > 0 ||
			libParser.getParserErrors().length > 0
		) {
			continue;
		}
		const exports = new Set<string>();
		for (const stmt of libAst.body) {
			if (
				(stmt.type === "FunctionDeclaration" ||
					stmt.type === "MethodDeclaration") &&
				stmt.isExport
			) {
				exports.add(stmt.name);
			}
		}
		exportsByPath.set(sourcePath, exports);
	}
	return exportsByPath;
}

// POST the Pine source to TradingView's translate_light endpoint. Mirrors the
// Python pinescript_checker.py: multipart "source" field, the same Referer /
// User-Agent / DNT headers, 10s timeout. Returns the parsed JSON body.
async function checkWithTradingView(code: string): Promise<unknown> {
	const url =
		"https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=admin&v=3";
	const headers: Record<string, string> = {
		Referer: "https://www.tradingview.com/",
		"User-Agent":
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36",
		DNT: "1",
	};
	const form = new FormData();
	form.append("source", code);

	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 10_000);
	try {
		const resp = await fetch(url, {
			method: "POST",
			body: form,
			headers,
			signal: controller.signal,
		});
		return await resp.json();
	} finally {
		clearTimeout(timer);
	}
}

interface HumanPayload {
	success?: boolean;
	error?: string;
	reason?: string; // TV's name for the failure message
	errors?: PineLintError[];
	result?: { errors?: PineLintError[]; warnings?: PineLintError[] };
}

// TV messages are templates ("Undeclared identifier \"{identifier}\"") with the
// values in `ctx`; substitute them. Local messages have no placeholders and
// pass through unchanged. Delegates to core's renderMessage (TV ctx values
// can be numbers; the substitution stringifies either way). see INV061
function fillTemplate(e: PineLintError): string {
	return renderMessage({
		message: e.message,
		ctx: e.ctx as Record<string, string> | undefined,
	});
}

// Render a pine-lint-shaped payload (local or --tv; both share the format) as
// human-readable lines: "file:line:col: severity: message" per finding plus a
// summary. Returns the exit code: 0 clean, 1 when there are errors.
function printHuman(payload: HumanPayload, label: string): number {
	if (payload.success === false) {
		// fd 2: synchronous, never truncated by the following process.exit().
		fs.writeSync(
			2,
			`${label}: ${payload.error ?? payload.reason ?? "validation failed"}\n`,
		);
		return 1;
	}
	// TV has been seen putting errors both under result and at the top level.
	const errors = payload.result?.errors ?? payload.errors ?? [];
	const warnings = payload.result?.warnings ?? [];
	const line = (severity: string, e: PineLintError) =>
		`${label}:${e.start.line}:${e.start.column}: ${severity}: ${fillTemplate(e)}`;
	const out: string[] = [];
	for (const e of errors) out.push(line("error", e));
	for (const w of warnings) out.push(line("warning", w));
	if (errors.length === 0 && warnings.length === 0) {
		out.push(`${label}: clean`);
	} else {
		const counts: string[] = [];
		if (errors.length > 0) {
			counts.push(`${errors.length} error${errors.length === 1 ? "" : "s"}`);
		}
		if (warnings.length > 0) {
			counts.push(
				`${warnings.length} warning${warnings.length === 1 ? "" : "s"}`,
			);
		}
		out.push(`${label}: ${counts.join(", ")}`);
	}
	// fd 1: synchronous flush so a piped (non-tty) caller always gets the lines.
	fs.writeSync(1, `${out.join("\n")}\n`);
	return errors.length > 0 ? 1 : 0;
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

	if (parsed.version) {
		console.log(`pine-lint ${VERSION} (built ${BUILD_TIME})`);
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
	let label = "<code>";
	let baseDir = process.cwd();
	if (parsed.code !== undefined) {
		code = parsed.code;
	} else if (parsed.stdin) {
		label = "<stdin>";
		code = fs.readFileSync(0, "utf-8");
	} else {
		const filePath = parsed.filePath as string;
		const absolutePath = path.resolve(filePath);
		baseDir = path.dirname(absolutePath);
		if (!fs.existsSync(absolutePath)) {
			const output: PineLintOutput = {
				success: false,
				error: `File not found: ${filePath}`,
			};
			emitAndExit(JSON.stringify(output, null, 2), 1);
		}
		label = filePath;
		code = fs.readFileSync(absolutePath, "utf-8");
	}

	if (parsed.tv) {
		try {
			const tvResult = (await checkWithTradingView(code)) as {
				success?: boolean;
				result?: Record<string, unknown>;
			};
			if (!parsed.fullResponse && tvResult.result) {
				delete tvResult.result.scopes;
			}
			if (parsed.human) {
				process.exit(printHuman(tvResult as HumanPayload, label));
			}
			// Synchronous write to fd 1 so the (often large) TV response is never
			// truncated by a racing process.exit() on a pipe - a truncated JSON
			// reads as "no verdict" downstream. see emitAndExit.
			emitAndExit(JSON.stringify(tvResult), tvResult.success === false ? 1 : 0);
		} catch (e) {
			// A failed TV probe must NOT print a result-shaped payload. The old
			// code emitted `{success:false, errors:[]}` on stdout, which is
			// indistinguishable from "TV reported no errors": diff tooling that
			// reads `result?.errors ?? errors ?? []` (find-real-failures,
			// compare-tv) silently treats a network blip as "TV accepts". That is
			// the most plausible cause of the 2026-05-28 mis-verification - see
			// gotchas/G002, INV014. Emit nothing on stdout; report the reason on
			// stderr and signal failure with a distinct non-zero exit code so a
			// failed probe can never be parsed as a clean result.
			console.error(
				`pine-lint --tv: TradingView request failed: ${(e as Error).message}`,
			);
			process.exit(2);
		}
	}

	try {
		const sourceLines = code.split(/\r\n|\r|\n/);
		const parser = new Parser(code, (importLine) =>
			parseSourceDirective(sourceLines, importLine),
		);
		const ast = parser.parse();

		// Get lexer errors first (string validation, etc.)
		const lexerErrors = parser.getLexerErrors();

		// Get parser errors (syntax errors during parsing)
		const parserErrors = parser.getParserErrors();

		// Get detected version for version-aware validation. No annotation
		// means Pine v1 (TV's rule; translate_light refuses anything below
		// v5 - INV029), NOT v6: legacy scripts stay lenient (G004), so the
		// v6-only checks and the semantic-warning pass must not run. see INV032
		const detectedVersion = parser.getDetectedVersion() || "1";

		const extractor = new ASTExtractor();
		const result = extractor.extract(ast);

		// Run validation to get errors (version-aware)
		const localLibraryExports = collectLocalLibraryExports(code, baseDir);
		const validator = new UnifiedPineValidator(
			localLibraryExports,
			lexerErrors.length === 0 && parserErrors.length === 0,
		);
		const validationErrors = validator.validate(ast, detectedVersion);

		// Run semantic analysis to get warnings (only for v6)
		const semanticWarnings = [];
		if (detectedVersion === "6") {
			const semanticAnalyzer = new SemanticAnalyzer();
			semanticWarnings.push(...semanticAnalyzer.analyze(ast));
		}
		const mapSourcePosition = createSourcePositionMapper(code);

		// Convert lexer errors to pine-lint format. Lexer/parser failures are the
		// `syntax` stage - a syntax-only consumer filter keys on this exactly.
		const lexerPineLintErrors: PineLintError[] = lexerErrors.map((e) => {
			const start = mapSourcePosition({ line: e.line, column: e.column });
			const end = mapSourcePosition({ line: e.line, column: e.column + 1 });
			return {
				start,
				end,
				message: e.message,
				stage: "syntax",
			};
		});

		// Convert parser errors to pine-lint format
		const parserPineLintErrors: PineLintError[] = parserErrors.map((e) => {
			const start = mapSourcePosition({ line: e.line, column: e.column });
			const end = mapSourcePosition({ line: e.line, column: e.column + 1 });
			return {
				start,
				end,
				message: e.message,
				stage: "syntax",
			};
		});

		// Convert validation errors to pine-lint format (only errors, not warnings).
		// Preserve optional `code`/`ctx` so structured pine-lint errors round-trip.
		const validationPineLintErrors: PineLintError[] = validationErrors
			.filter((e) => e.severity === DiagnosticSeverity.Error)
			.map((e) => {
				const start = mapSourcePosition({ line: e.line, column: e.column });
				const end = mapSourcePosition({
					line: e.line,
					column: e.column + e.length,
				});
				const out: PineLintError = {
					start,
					end,
					message: e.message,
					stage: "type",
				};
				if (e.code !== undefined) out.code = e.code;
				if (e.ctx !== undefined) out.ctx = e.ctx;
				return out;
			});

		// Convert semantic warnings to pine-lint format (warnings). These come
		// from the SemanticAnalyzer pass - the `analysis` stage.
		const semanticPineLintWarnings: PineLintError[] = semanticWarnings
			.filter((w) => w.severity === DiagnosticSeverity.Warning)
			.map((w) => {
				const start = mapSourcePosition({ line: w.line, column: w.column });
				const end = mapSourcePosition({
					line: w.line,
					column: w.column + w.length,
				});
				return {
					start,
					end,
					message: w.message,
					stage: "analysis",
				};
			});

		// Combine all errors (lexer errors first, then parser, then validation)
		const errors: PineLintError[] = [
			...lexerPineLintErrors,
			...parserPineLintErrors,
			...validationPineLintErrors,
		];

		// Combine all warnings
		const warnings: PineLintError[] = [...semanticPineLintWarnings];

		// One envelope, always: locally-produced diagnostics live under
		// result.errors / result.warnings as arrays that are always present
		// (empty when clean). Consumers key on result.{errors,warnings} with no
		// top-level fallback.
		result.errors = errors;
		result.warnings = warnings;

		const output: PineLintOutput = {
			success: true,
			result,
		};
		if (parsed.human) {
			process.exit(printHuman(output as HumanPayload, label));
		}
		emitAndExit(JSON.stringify(output, null, 2), 0);
	} catch (e: unknown) {
		const error = e as { message?: string };
		const output: PineLintOutput = {
			success: false,
			error: error.message || String(e),
		};
		if (parsed.human) {
			process.exit(printHuman(output as HumanPayload, label));
		}
		emitAndExit(JSON.stringify(output, null, 2), 1);
	}
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
