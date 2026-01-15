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
import { UnifiedPineValidator } from "../dist/packages/core/src/analyzer/checker.js";
import { Parser } from "../dist/packages/core/src/parser/parser.js";

// TradingView linter - inline implementation to avoid pipeline dependency
const TV_API_URL =
	"https://pine-facade.tradingview.com/pine-facade/translate_light?user_name=admin&v=3";
const TV_HEADERS = {
	Referer: "https://www.tradingview.com/",
	"User-Agent":
		"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
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

// === Script Generator (Comprehensive) ===

const identifier = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{1,12}$/);
const intLiteral = fc.integer({ min: -10000, max: 10000 }).map(String);
const floatLiteral = fc
	.tuple(fc.integer({ min: -1000, max: 1000 }), fc.integer({ min: 0, max: 99 }))
	.map(([a, b]) => `${a}.${b}`);
const boolLiteral = fc.constantFrom("true", "false");
const stringLiteral = fc
	.stringMatching(/^[a-zA-Z0-9 _-]{0,30}$/)
	.map((s) => `"${s}"`);

// Comprehensive builtin variables
const builtinVar = fc.constantFrom(
	// Price data
	"close",
	"open",
	"high",
	"low",
	"volume",
	"hl2",
	"hlc3",
	"ohlc4",
	"hlcc4",
	// Time
	"time",
	"time_close",
	"timenow",
	"bar_index",
	"last_bar_index",
	// Date parts
	"year",
	"month",
	"weekofyear",
	"dayofmonth",
	"dayofweek",
	"hour",
	"minute",
	"second",
	// Special values
	"na",
	"true",
	"false",
	// Syminfo
	"syminfo.ticker",
	"syminfo.tickerid",
	"syminfo.mintick",
	// Barstate
	"barstate.isfirst",
	"barstate.islast",
	"barstate.ishistory",
	"barstate.isrealtime",
	"barstate.isnew",
	"barstate.isconfirmed",
	// Timeframe
	"timeframe.period",
	"timeframe.multiplier",
	"timeframe.isintraday",
	"timeframe.isdaily",
);

// Comprehensive builtin functions
const builtinFunc = fc.constantFrom(
	// Technical Analysis
	"ta.sma",
	"ta.ema",
	"ta.wma",
	"ta.vwma",
	"ta.rma",
	"ta.hma",
	"ta.rsi",
	"ta.mfi",
	"ta.cci",
	"ta.mom",
	"ta.roc",
	"ta.atr",
	"ta.tr",
	"ta.highest",
	"ta.lowest",
	"ta.change",
	"ta.stdev",
	"ta.variance",
	"ta.median",
	"ta.cross",
	"ta.crossover",
	"ta.crossunder",
	"ta.rising",
	"ta.falling",
	"ta.pivothigh",
	"ta.pivotlow",
	// Math
	"math.abs",
	"math.sign",
	"math.max",
	"math.min",
	"math.avg",
	"math.sum",
	"math.pow",
	"math.sqrt",
	"math.exp",
	"math.log",
	"math.ceil",
	"math.floor",
	"math.round",
	"math.sin",
	"math.cos",
	"math.tan",
	// String
	"str.tostring",
	"str.format",
	"str.length",
	"str.contains",
	"str.substring",
	"str.replace",
	"str.lower",
	"str.upper",
	// Plotting
	"plot",
	"plotshape",
	"plotchar",
	"plotarrow",
	"bgcolor",
	"barcolor",
	"hline",
	// Input
	"input",
	"input.int",
	"input.float",
	"input.bool",
	"input.string",
	"input.color",
	// Other
	"nz",
	"na",
	"fixnan",
	"float",
	"int",
	"bool",
	"string",
	"array.new_float",
	"array.new_int",
	"array.size",
	"array.get",
	"array.push",
);

// Color constants
const colorConst = fc.constantFrom(
	"color.red",
	"color.green",
	"color.blue",
	"color.white",
	"color.black",
	"color.yellow",
	"color.orange",
	"color.purple",
	"color.aqua",
	"color.lime",
	"color.gray",
	"color.silver",
	"color.maroon",
	"color.navy",
	"color.teal",
);

// Shape/style constants
const shapeConst = fc.constantFrom(
	"shape.xcross",
	"shape.cross",
	"shape.circle",
	"shape.triangleup",
	"shape.triangledown",
	"shape.flag",
	"shape.arrowup",
	"shape.arrowdown",
	"shape.square",
	"shape.diamond",
	"location.abovebar",
	"location.belowbar",
	"location.top",
	"location.bottom",
	"size.tiny",
	"size.small",
	"size.normal",
	"size.large",
	"size.huge",
);

// Recursive expression builder
const expression = fc.letrec((tie) => ({
	atom: fc.oneof(
		{ weight: 4, arbitrary: builtinVar },
		{ weight: 3, arbitrary: intLiteral },
		{ weight: 3, arbitrary: floatLiteral },
		{ weight: 2, arbitrary: boolLiteral },
		{ weight: 2, arbitrary: stringLiteral },
		{ weight: 2, arbitrary: colorConst },
		{ weight: 1, arbitrary: shapeConst },
		{ weight: 2, arbitrary: identifier },
	),
	binary: fc
		.tuple(
			tie("atom"),
			fc.constantFrom(
				"+",
				"-",
				"*",
				"/",
				"%",
				">",
				"<",
				">=",
				"<=",
				"==",
				"!=",
				"and",
				"or",
			),
			tie("atom"),
		)
		.map(([l, op, r]) => `${l} ${op} ${r}`),
	unary: fc
		.tuple(fc.constantFrom("-", "not "), tie("atom"))
		.map(([op, e]) => `${op}${e}`),
	ternary: fc
		.tuple(tie("atom"), tie("atom"), tie("atom"))
		.map(([c, t, f]) => `${c} ? ${t} : ${f}`),
	call: fc
		.tuple(builtinFunc, fc.array(tie("simple"), { minLength: 1, maxLength: 4 }))
		.map(([fn, args]) => `${fn}(${args.join(", ")})`),
	index: fc
		.tuple(identifier, tie("atom"))
		.map(([arr, idx]) => `${arr}[${idx}]`),
	simple: fc.oneof(
		{ weight: 5, arbitrary: tie("atom") },
		{ weight: 3, arbitrary: tie("binary") },
		{ weight: 2, arbitrary: tie("call") },
		{ weight: 1, arbitrary: tie("unary") },
		{ weight: 1, arbitrary: tie("ternary") },
	),
	complex: fc.oneof(
		{ weight: 4, arbitrary: tie("simple") },
		{
			weight: 2,
			arbitrary: fc
				.tuple(
					tie("simple"),
					fc.constantFrom("+", "-", "*", "/", "and", "or"),
					tie("simple"),
				)
				.map(([l, op, r]) => `${l} ${op} ${r}`),
		},
		{
			weight: 1,
			arbitrary: fc
				.tuple(tie("simple"), tie("simple"), tie("simple"))
				.map(([c, t, f]) => `${c} ? ${t} : ${f}`),
		},
	),
})).complex;

// Simple expressions for conditions
const simpleExpr = fc.oneof(
	{ weight: 3, arbitrary: builtinVar },
	{ weight: 2, arbitrary: intLiteral },
	{ weight: 2, arbitrary: floatLiteral },
	{ weight: 1, arbitrary: boolLiteral },
	{ weight: 1, arbitrary: identifier },
);

// Comprehensive statement types
const varDecl = fc
	.tuple(fc.constantFrom("", "var ", "varip "), identifier, expression)
	.map(([kw, name, expr]) => `${kw}${name} = ${expr}`);

const assignment = fc
	.tuple(identifier, fc.constantFrom(":=", "+=", "-=", "*=", "/="), expression)
	.map(([name, op, expr]) => `${name} ${op} ${expr}`);

const plotStmt = fc
	.tuple(
		fc.constantFrom(
			"plot",
			"plotshape",
			"plotchar",
			"plotarrow",
			"bgcolor",
			"barcolor",
		),
		expression,
		fc.option(stringLiteral),
	)
	.map(([fn, expr, title]) =>
		title ? `${fn}(${expr}, title=${title})` : `${fn}(${expr})`,
	);

const ifStmt = fc
	.tuple(
		simpleExpr,
		fc.array(varDecl, { minLength: 1, maxLength: 3 }),
		fc.option(fc.array(varDecl, { minLength: 1, maxLength: 2 })),
	)
	.map(([cond, consequent, alternate]) => {
		let code = `if ${cond}\n${consequent.map((s) => `    ${s}`).join("\n")}`;
		if (alternate)
			code += `\nelse\n${alternate.map((s) => `    ${s}`).join("\n")}`;
		return code;
	});

const forStmt = fc
	.tuple(
		identifier,
		fc.integer({ min: 0, max: 10 }).map(String),
		fc.integer({ min: 1, max: 100 }).map(String),
		fc.array(varDecl, { minLength: 1, maxLength: 3 }),
	)
	.map(
		([i, from, to, body]) =>
			`for ${i} = ${from} to ${to}\n${body.map((s) => `    ${s}`).join("\n")}`,
	);

const whileStmt = fc
	.tuple(
		fc
			.tuple(
				identifier,
				fc.constantFrom(">", "<", ">=", "<=", "!="),
				intLiteral,
			)
			.map(([id, op, val]) => `${id} ${op} ${val}`),
		fc.array(varDecl, { minLength: 1, maxLength: 2 }),
	)
	.map(
		([cond, body]) =>
			`while ${cond}\n${body.map((s) => `    ${s}`).join("\n")}`,
	);

const switchStmt = fc
	.tuple(
		simpleExpr,
		fc.array(fc.tuple(simpleExpr, expression), { minLength: 2, maxLength: 4 }),
		fc.option(expression),
	)
	.map(([disc, cases, def]) => {
		let code = `switch ${disc}\n`;
		for (const [cond, result] of cases) code += `    ${cond} => ${result}\n`;
		if (def) code += `    => ${def}\n`;
		return code;
	});

const funcDecl = fc
	.tuple(
		identifier,
		fc.array(identifier, { minLength: 0, maxLength: 3 }),
		fc.array(varDecl, { minLength: 1, maxLength: 4 }),
		expression,
	)
	.map(
		([name, params, body, ret]) =>
			`${name}(${params.join(", ")}) =>\n${body.map((s) => `    ${s}`).join("\n")}\n    ${ret}`,
	);

const alertStmt = fc
	.tuple(simpleExpr, stringLiteral)
	.map(
		([cond, msg]) => `alertcondition(${cond}, title="Alert", message=${msg})`,
	);

const statement = fc.oneof(
	{ weight: 5, arbitrary: varDecl },
	{ weight: 3, arbitrary: assignment },
	{ weight: 3, arbitrary: plotStmt },
	{ weight: 2, arbitrary: ifStmt },
	{ weight: 1, arbitrary: forStmt },
	{ weight: 1, arbitrary: whileStmt },
	{ weight: 1, arbitrary: switchStmt },
	{ weight: 1, arbitrary: funcDecl },
	{ weight: 1, arbitrary: alertStmt },
);

// Full script with valid header (3-20 statements)
const indicatorName = fc
	.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,20}$/)
	.map((s) => `"${s}"`);

const scriptHeader = fc
	.tuple(indicatorName, fc.boolean())
	.map(
		([name, overlay]) => `//@version=6\nindicator(${name}, overlay=${overlay})`,
	);

const fullScript = fc
	.tuple(scriptHeader, fc.array(statement, { minLength: 3, maxLength: 20 }))
	.map(([header, stmts]) => `${header}\n\n${stmts.join("\n")}`);

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
				severity: "error",
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
				severity: "warning",
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
				severity: "error",
			});
		}

		for (const err of parser.getParserErrors()) {
			errors.push({
				line: err.line,
				column: err.column,
				message: err.message,
				source: "internal",
				severity: "error",
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
				severity: err.severity === "warning" ? "warning" : "error",
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
			severity: "error",
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
		const match = candidates.find((c) => !matchedInternal.has(c));

		if (match) {
			matchedInternal.add(match);
			// Check if messages are similar
			const tvMsg = tvDiag.message.toLowerCase();
			const intMsg = match.message.toLowerCase();
			if (
				!tvMsg.includes(intMsg.slice(0, 20)) &&
				!intMsg.includes(tvMsg.slice(0, 20))
			) {
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
		Promise.resolve(validateWithInternal(script)),
	]);

	const discrepancies = compareDiagnostics(
		[...tv.errors, ...tv.warnings],
		[...internal.errors, ...internal.warnings],
	);

	return {
		script,
		tvErrors: tv.errors,
		tvWarnings: tv.warnings,
		internalErrors: internal.errors,
		internalWarnings: internal.warnings,
		discrepancies,
	};
}

// === CLI ===

async function main() {
	const args = process.argv.slice(2);
	const count = parseInt(
		args.find((_, i, a) => a[i - 1] === "--count") || "10",
		10,
	);
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
		const sample = fc.sample(arb, {
			numRuns: 1,
			seed: seed ? parseInt(seed, 10) + i : undefined,
		})[0];
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
			await new Promise((r) => setTimeout(r, 500));
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

		const output = results.filter(
			(r) =>
				r.discrepancies.onlyInTv.length > 0 ||
				r.discrepancies.onlyInInternal.length > 0 ||
				r.discrepancies.messageDiffs.length > 0,
		);

		await fs.writeFile(filename, JSON.stringify(output, null, 2));
		console.log(`💾 Saved to ${filename}\n`);
	}

	// Exit code
	process.exit(discrepancyCount > 0 ? 1 : 0);
}

main().catch(console.error);
