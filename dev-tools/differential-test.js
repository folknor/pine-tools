#!/usr/bin/env node
/**
 * Differential Testing: Compare TradingView's pine-lint vs internal validator
 *
 * Usage:
 *   node dev-tools/differential-test.js [--count N] [--seed S] [--verbose]
 *
 * Options:
 *   --count N    Number of scripts to generate (default: 10)
 *   --seed S     Random seed for reproducibility
 *   --verbose    Show generated scripts and full diagnostics
 *   --save       Save discrepancies to dev-tools/differential-results/
 *
 * Note: Run `pnpm run build:tsc` first to compile.
 */

import fc from "fast-check";
import { Parser } from "../dist/packages/core/src/parser/parser.js";
import { UnifiedPineValidator } from "../dist/packages/core/src/analyzer/checker.js";

// TradingView linter - inline implementation to avoid pipeline dependency
const TV_API_URL = "https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=admin&v=3";
const TV_HEADERS = {
	Referer: "https://www.tradingview.com/",
	"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
	DNT: "1",
};

async function checkPineScript(code, options = {}) {
	const timeout = options.timeout || 15000;
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), timeout);

	try {
		const formData = new FormData();
		formData.append("source", code);

		const response = await fetch(TV_API_URL, {
			method: "POST",
			headers: TV_HEADERS,
			body: formData,
			signal: controller.signal,
		});

		return await response.json();
	} catch (error) {
		if (error.name === "AbortError") {
			return { success: false, error: `Request timed out after ${timeout}ms` };
		}
		return { success: false, error: error.message };
	} finally {
		clearTimeout(timeoutId);
	}
}

// === Script Generator ===

const identifier = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{1,8}$/);
const intLiteral = fc.integer({ min: 0, max: 1000 }).map(String);
const floatLiteral = fc.integer({ min: 0, max: 1000 }).map(n => `${n}.0`);
const boolLiteral = fc.constantFrom("true", "false");
const stringLiteral = fc.stringMatching(/^[a-zA-Z0-9 ]{0,20}$/).map(s => `"${s}"`);

const builtinVar = fc.constantFrom(
	"close", "open", "high", "low", "volume", "time", "bar_index",
	"na", "true", "false"
);

const builtinFunc = fc.constantFrom(
	"ta.sma", "ta.ema", "ta.rsi", "ta.macd",
	"math.abs", "math.max", "math.min", "math.round",
	"str.tostring", "nz", "fixnan",
	"plot", "plotshape", "bgcolor", "barcolor",
	"input.int", "input.float", "input.bool", "input.string",
);

const colorConst = fc.constantFrom(
	"color.red", "color.green", "color.blue", "color.white",
	"color.black", "color.yellow", "color.purple", "color.orange"
);

// Simple expressions (no recursion to keep scripts parseable)
const simpleExpr = fc.oneof(
	{ weight: 3, arbitrary: builtinVar },
	{ weight: 2, arbitrary: intLiteral },
	{ weight: 2, arbitrary: floatLiteral },
	{ weight: 1, arbitrary: boolLiteral },
	{ weight: 1, arbitrary: stringLiteral },
	{ weight: 1, arbitrary: colorConst },
);

const binaryOp = fc.constantFrom("+", "-", "*", "/", ">", "<", ">=", "<=", "==", "!=", "and", "or");

const binaryExpr = fc.tuple(simpleExpr, binaryOp, simpleExpr)
	.map(([l, op, r]) => `${l} ${op} ${r}`);

const funcCall = fc.tuple(
	builtinFunc,
	fc.array(simpleExpr, { minLength: 1, maxLength: 3 })
).map(([fn, args]) => `${fn}(${args.join(", ")})`);

const expression = fc.oneof(
	{ weight: 3, arbitrary: simpleExpr },
	{ weight: 2, arbitrary: binaryExpr },
	{ weight: 2, arbitrary: funcCall },
);

// Statements
const varDecl = fc.tuple(
	fc.constantFrom("", "var "),
	identifier,
	expression
).map(([kw, name, expr]) => `${kw}${name} = ${expr}`);

const plotStmt = fc.tuple(
	fc.constantFrom("plot", "plotshape", "bgcolor"),
	expression,
	fc.option(stringLiteral)
).map(([fn, expr, title]) =>
	title ? `${fn}(${expr}, title=${title})` : `${fn}(${expr})`
);

const ifStmt = fc.tuple(
	simpleExpr,
	varDecl
).map(([cond, body]) => `if ${cond}\n    ${body}`);

const statement = fc.oneof(
	{ weight: 4, arbitrary: varDecl },
	{ weight: 2, arbitrary: plotStmt },
	{ weight: 1, arbitrary: ifStmt },
);

// Full script with valid header
const indicatorName = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,15}$/).map(s => `"${s}"`);

const scriptHeader = indicatorName.map(name =>
	`//@version=6\nindicator(${name}, overlay=false)`
);

const fullScript = fc.tuple(
	scriptHeader,
	fc.array(statement, { minLength: 2, maxLength: 8 })
).map(([header, stmts]) => `${header}\n\n${stmts.join("\n")}`);

// === Validators ===

async function validateWithTradingView(script) {
	const result = await checkPineScript(script, { timeout: 15000 });

	const errors = [];
	const warnings = [];

	if (result.result?.errors) {
		for (const err of result.result.errors) {
			errors.push({
				line: err.start.line,
				column: err.start.column,
				message: err.message,
				source: "tv",
				severity: "error"
			});
		}
	}

	if (result.result?.warnings) {
		for (const warn of result.result.warnings) {
			warnings.push({
				line: warn.start.line,
				column: warn.start.column,
				message: warn.message,
				source: "tv",
				severity: "warning"
			});
		}
	}

	return { errors, warnings };
}

function validateWithInternal(script) {
	const errors = [];
	const warnings = [];

	try {
		const parser = new Parser(script);
		const ast = parser.parse();

		// Collect parser errors
		for (const err of parser.getLexerErrors()) {
			errors.push({
				line: err.line,
				column: err.column,
				message: err.message,
				source: "internal",
				severity: "error"
			});
		}

		for (const err of parser.getParserErrors()) {
			errors.push({
				line: err.line,
				column: err.column,
				message: err.message,
				source: "internal",
				severity: "error"
			});
		}

		// Run validator
		const validator = new UnifiedPineValidator();
		const validatorErrors = validator.validate(ast);

		for (const err of validatorErrors) {
			const diagnostic = {
				line: err.line,
				column: err.column,
				message: err.message,
				source: "internal",
				severity: err.severity === "warning" ? "warning" : "error"
			};

			if (err.severity === "warning") {
				warnings.push(diagnostic);
			} else {
				errors.push(diagnostic);
			}
		}
	} catch (e) {
		errors.push({
			line: 1,
			column: 1,
			message: e instanceof Error ? e.message : "Unknown error",
			source: "internal",
			severity: "error"
		});
	}

	return { errors, warnings };
}

// === Comparison ===

function compareDiagnostics(tv, internal) {
	const onlyInTv = [];
	const onlyInInternal = [];
	const messageDiffs = [];

	// Index by line for matching
	const internalByLine = new Map();
	for (const d of internal) {
		const list = internalByLine.get(d.line) || [];
		list.push(d);
		internalByLine.set(d.line, list);
	}

	const matchedInternal = new Set();

	for (const tvDiag of tv) {
		const candidates = internalByLine.get(tvDiag.line) || [];
		const match = candidates.find(c => !matchedInternal.has(c));

		if (match) {
			matchedInternal.add(match);
			// Check if messages are similar
			const tvMsg = tvDiag.message.toLowerCase();
			const intMsg = match.message.toLowerCase();
			if (!tvMsg.includes(intMsg.slice(0, 20)) && !intMsg.includes(tvMsg.slice(0, 20))) {
				messageDiffs.push({ tv: tvDiag, internal: match });
			}
		} else {
			onlyInTv.push(tvDiag);
		}
	}

	for (const d of internal) {
		if (!matchedInternal.has(d)) {
			onlyInInternal.push(d);
		}
	}

	return { onlyInTv, onlyInInternal, messageDiffs };
}

async function compareScript(script) {
	const [tv, internal] = await Promise.all([
		validateWithTradingView(script),
		Promise.resolve(validateWithInternal(script))
	]);

	const discrepancies = compareDiagnostics(
		[...tv.errors, ...tv.warnings],
		[...internal.errors, ...internal.warnings]
	);

	return {
		script,
		tvErrors: tv.errors,
		tvWarnings: tv.warnings,
		internalErrors: internal.errors,
		internalWarnings: internal.warnings,
		discrepancies
	};
}

// === CLI ===

async function main() {
	const args = process.argv.slice(2);
	const count = parseInt(args.find((_, i, a) => a[i - 1] === "--count") || "10");
	const seed = args.find((_, i, a) => a[i - 1] === "--seed");
	const verbose = args.includes("--verbose");
	const save = args.includes("--save");

	console.log(`\n🧪 Differential Testing: TradingView vs Internal Validator\n`);
	console.log(`   Scripts: ${count}`);
	if (seed) console.log(`   Seed: ${seed}`);
	console.log("");

	// Generate scripts
	const scripts = [];
	const arb = fullScript;

	for (let i = 0; i < count; i++) {
		const sample = fc.sample(arb, { numRuns: 1, seed: seed ? parseInt(seed) + i : undefined })[0];
		scripts.push(sample);
	}

	// Rate limiting: 500ms between requests
	const results = [];
	let discrepancyCount = 0;

	for (let i = 0; i < scripts.length; i++) {
		const script = scripts[i];
		process.stdout.write(`\r   Testing script ${i + 1}/${scripts.length}...`);

		const result = await compareScript(script);
		results.push(result);

		const hasDiscrepancy =
			result.discrepancies.onlyInTv.length > 0 ||
			result.discrepancies.onlyInInternal.length > 0 ||
			result.discrepancies.messageDiffs.length > 0;

		if (hasDiscrepancy) {
			discrepancyCount++;
		}

		// Rate limit
		if (i < scripts.length - 1) {
			await new Promise(r => setTimeout(r, 500));
		}
	}

	console.log(`\r   Testing complete.                    \n`);

	// Summary
	console.log("📊 Summary:");
	console.log(`   Total scripts: ${scripts.length}`);
	console.log(`   Discrepancies: ${discrepancyCount}`);
	console.log("");

	// Details
	if (discrepancyCount > 0) {
		console.log("🔍 Discrepancies:\n");

		for (let i = 0; i < results.length; i++) {
			const r = results[i];
			const hasDiscrepancy =
				r.discrepancies.onlyInTv.length > 0 ||
				r.discrepancies.onlyInInternal.length > 0 ||
				r.discrepancies.messageDiffs.length > 0;

			if (!hasDiscrepancy) continue;

			console.log(`── Script ${i + 1} ──`);

			if (verbose) {
				console.log("```pine");
				console.log(r.script);
				console.log("```\n");
			}

			if (r.discrepancies.onlyInTv.length > 0) {
				console.log("  ❌ Only in TradingView (we're missing these):");
				for (const d of r.discrepancies.onlyInTv) {
					console.log(`     L${d.line}: ${d.message}`);
				}
			}

			if (r.discrepancies.onlyInInternal.length > 0) {
				console.log("  ⚠️  Only in Internal (false positives):");
				for (const d of r.discrepancies.onlyInInternal) {
					console.log(`     L${d.line}: ${d.message}`);
				}
			}

			if (r.discrepancies.messageDiffs.length > 0) {
				console.log("  📝 Different messages:");
				for (const { tv, internal } of r.discrepancies.messageDiffs) {
					console.log(`     L${tv.line}:`);
					console.log(`       TV: ${tv.message}`);
					console.log(`       Us: ${internal.message}`);
				}
			}

			console.log("");
		}
	}

	// Save results
	if (save && discrepancyCount > 0) {
		const fs = await import("node:fs/promises");
		const path = await import("node:path");

		const dir = "dev-tools/differential-results";
		await fs.mkdir(dir, { recursive: true });

		const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
		const filename = path.join(dir, `results-${timestamp}.json`);

		const output = results.filter(r =>
			r.discrepancies.onlyInTv.length > 0 ||
			r.discrepancies.onlyInInternal.length > 0 ||
			r.discrepancies.messageDiffs.length > 0
		);

		await fs.writeFile(filename, JSON.stringify(output, null, 2));
		console.log(`💾 Saved to ${filename}\n`);
	}

	// Exit code
	process.exit(discrepancyCount > 0 ? 1 : 0);
}

main().catch(console.error);
