#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const DIST_ROOT = path.join(__dirname, "../dist");

function loadModule(modulePath) {
	try {
		return require(path.join(DIST_ROOT, modulePath));
	} catch (e) {
		console.error(
			`Failed to load ${modulePath}. Did you run 'pnpm run build:tsc'?`,
		);
		console.error(e.message);
		process.exit(1);
	}
}

function usage() {
	console.error(
		"Usage: node dev-tools/debug-repro.js <file.pine> --line <N> [--message <text>] [--source <lexer|parser|validator>] [--context <N>] [--out <file>] [--nearest] [--any-source] [--no-candidate] [--tv]",
	);
	process.exit(2);
}

function parseArgs(argv) {
	const opts = {
		context: 30,
		tv: false,
		message: null,
		source: null,
		out: null,
		nearest: false,
		anySource: false,
		candidate: true,
	};
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg !== "--") {
			if (arg === "--line") {
				opts.line = Number(argv[++i]);
			} else if (arg === "--message") {
				opts.message = argv[++i] ?? null;
			} else if (arg === "--source") {
				opts.source = argv[++i] ?? null;
			} else if (arg === "--context") {
				opts.context = Number(argv[++i]);
			} else if (arg === "--out") {
				opts.out = argv[++i] ?? null;
			} else if (arg === "--tv") {
				opts.tv = true;
			} else if (arg === "--nearest") {
				opts.nearest = true;
			} else if (arg === "--any-source") {
				opts.anySource = true;
			} else if (arg === "--no-candidate") {
				opts.candidate = false;
			} else if (arg === "-h" || arg === "--help") {
				usage();
			} else if (!opts.file) {
				opts.file = arg;
			} else {
				usage();
			}
		}
	}
	if (!opts.file || !Number.isInteger(opts.line) || opts.line < 1) usage();
	if (!Number.isInteger(opts.context) || opts.context < 0) usage();
	if (opts.out === "") usage();
	if (
		opts.source !== null &&
		!["lexer", "parser", "validator"].includes(opts.source)
	) {
		usage();
	}
	return opts;
}

function diagnosticKey(message) {
	const unexpected = message.match(/^Unexpected token: (.+)$/);
	if (unexpected) return `Unexpected token: ${unexpected[1]}`;
	const missing = message.match(
		/^Could not find function or function reference '(.+)'$/,
	);
	if (missing)
		return `Could not find function or function reference '${missing[1]}'`;
	return message.replace(/\d+/g, "N");
}

function formatDiag(diag) {
	return `${diag.line}:${diag.column} ${diag.message}`;
}

function validate(code) {
	const { Parser } = loadModule("packages/core/src/parser/parser.js");
	const { DiagnosticSeverity, UnifiedPineValidator } = loadModule(
		"packages/core/src/analyzer/checker.js",
	);
	const parser = new Parser(code);
	const ast = parser.parse();
	const diagnostics = [];
	for (const e of parser.getLexerErrors()) {
		diagnostics.push({
			source: "lexer",
			line: e.line,
			column: e.column,
			message: e.message,
		});
	}
	for (const e of parser.getParserErrors()) {
		diagnostics.push({
			source: "parser",
			line: e.line,
			column: e.column,
			message: e.message,
		});
	}
	const validator = new UnifiedPineValidator();
	for (const e of validator.validate(ast, parser.getDetectedVersion() || "1")) {
		if (e.severity === DiagnosticSeverity.Error) {
			diagnostics.push({
				source: "validator",
				line: e.line,
				column: e.column,
				message: e.message,
			});
		}
	}
	return { ast, diagnostics };
}

function diagnosticMatches(diag, opts) {
	if (opts.message && !diag.message.includes(opts.message)) return false;
	if (opts.source && diag.source !== opts.source) return false;
	return true;
}

function findTarget(diagnostics, opts) {
	const candidates = diagnostics.filter(
		(d) => d.line === opts.line && diagnosticMatches(d, opts),
	);
	if (candidates.length > 0) return candidates[0];
	if (!opts.nearest) return null;
	return (
		diagnostics
			.filter((d) => diagnosticMatches(d, opts))
			.sort(
				(a, b) => Math.abs(a.line - opts.line) - Math.abs(b.line - opts.line),
			)[0] ?? null
	);
}

function hasTargetClass(code, key, targetSource, anySource) {
	return validate(code).diagnostics.some(
		(d) =>
			diagnosticKey(d.message) === key &&
			(anySource || d.source === targetSource),
	);
}

function sourceLines(code) {
	return code.split(/\r\n|\r|\n/);
}

function lineIndent(line) {
	const match = line.match(/^[ \t]*/);
	return match ? match[0].replace(/\t/g, "    ").length : 0;
}

function findTopLevelRanges(lines) {
	const starts = [];
	for (let i = 0; i < lines.length; i++) {
		const text = lines[i];
		if (lineIndent(text) !== 0) continue;
		if (
			/^(export\s+)?(type|enum|method)\s+\w+\b/.test(text) ||
			/^(export\s+)?\w+(?:\.\w+)?\s*\([^)]*$/.test(text) ||
			/^(export\s+)?\w+\s*\([^)]*\)\s*=>?/.test(text)
		) {
			starts.push(i + 1);
		}
	}
	const ranges = [];
	for (let i = 0; i < starts.length; i++) {
		const start = starts[i];
		const next = starts[i + 1] ?? lines.length + 1;
		let end = next - 1;
		while (end > start && lines[end - 1].trim() === "") end--;
		ranges.push({ start, end });
	}
	return ranges;
}

function buildInitialSelection(lines, targetLine, context) {
	const selected = new Set();
	const mandatory = new Set();
	const addRange = (start, end, isMandatory = false) => {
		for (
			let line = Math.max(1, start);
			line <= Math.min(lines.length, end);
			line++
		) {
			selected.add(line);
			if (isMandatory) mandatory.add(line);
		}
	};

	for (let i = 0; i < lines.length; i++) {
		const text = lines[i];
		if (
			/^\s*\/\/\s*@version=/.test(text) ||
			/^\s*(indicator|strategy|library)\s*\(/.test(text) ||
			/^\s*import\s+/.test(text) ||
			/^\s*\/\/\/\s*@source\b/.test(text)
		) {
			addRange(i + 1, i + 1, true);
		}
	}

	addRange(targetLine - context, targetLine + context, true);

	for (const range of findTopLevelRanges(lines)) {
		if (range.start <= targetLine && targetLine <= range.end) {
			addRange(range.start, range.start, true);
			addRange(range.start, range.end, false);
		} else if (
			/^(export\s+)?(type|enum)\s+\w+\b/.test(lines[range.start - 1])
		) {
			addRange(range.start, range.end, false);
		}
	}

	return { selected, mandatory };
}

function renderSelection(lines, selected) {
	return `${[...selected]
		.sort((a, b) => a - b)
		.map((line) => lines[line - 1])
		.join("\n")}\n`;
}

function removableLines(current, mandatory) {
	return [...current]
		.filter((line) => !mandatory.has(line))
		.sort((a, b) => a - b);
}

function minimize(lines, selected, mandatory, key, targetSource, anySource) {
	let current = new Set(selected);
	let removable = removableLines(current, mandatory);
	let chunk = Math.max(1, Math.floor(removable.length / 2));
	while (chunk >= 1) {
		let changed = false;
		for (let i = 0; i < removable.length; i += chunk) {
			const trialLines = removable.slice(i, i + chunk);
			const trial = new Set(current);
			for (const line of trialLines) trial.delete(line);
			if (
				hasTargetClass(
					renderSelection(lines, trial),
					key,
					targetSource,
					anySource,
				)
			) {
				current = trial;
				changed = true;
			}
		}
		removable = removableLines(current, mandatory);
		if (!changed) chunk = Math.floor(chunk / 2);
	}
	return current;
}

function selectedRanges(selected) {
	const sorted = [...selected].sort((a, b) => a - b);
	const ranges = [];
	for (const line of sorted) {
		const last = ranges[ranges.length - 1];
		if (last && last.end + 1 === line) {
			last.end = line;
		} else {
			ranges.push({ start: line, end: line });
		}
	}
	return ranges
		.map((range) =>
			range.start === range.end
				? String(range.start)
				: `${range.start}-${range.end}`,
		)
		.join(",");
}

function tokenContext(code, targetLine) {
	const { Lexer } = loadModule("packages/core/src/parser/lexer.js");
	const tokens = new Lexer(code).tokenize();
	return tokens
		.filter(
			(t) => t.type !== "WHITESPACE" && Math.abs(t.line - targetLine) <= 2,
		)
		.map((t) => `${t.line}:${t.column} ${t.type} ${JSON.stringify(t.value)}`);
}

function nodeLabel(node) {
	const parts = [node.type];
	if (node.name) parts.push(String(node.name));
	if (node.operator) parts.push(String(node.operator));
	return `${parts.join(" ")} @ ${node.line}:${node.column}`;
}

function childNodes(value) {
	const out = [];
	if (!value || typeof value !== "object") return out;
	for (const [key, child] of Object.entries(value)) {
		if (["line", "column", "endLine", "endColumn", "type"].includes(key))
			continue;
		if (Array.isArray(child)) {
			for (const item of child)
				if (item && typeof item === "object" && item.type) out.push(item);
		} else if (child && typeof child === "object" && child.type) {
			out.push(child);
		}
	}
	return out;
}

function rangeFor(node) {
	let start = Number.isInteger(node.line) ? node.line : Number.MAX_SAFE_INTEGER;
	let end = Number.isInteger(node.endLine) ? node.endLine : start;
	for (const child of childNodes(node)) {
		const range = rangeFor(child);
		start = Math.min(start, range.start);
		end = Math.max(end, range.end);
	}
	return { start, end };
}

function astPath(ast, targetLine) {
	const pathOut = [];
	function visit(node, pathSoFar) {
		const range = rangeFor(node);
		if (targetLine < range.start || targetLine > range.end) return false;
		const nextPath = [...pathSoFar, nodeLabel(node)];
		for (const child of childNodes(node)) {
			if (visit(child, nextPath)) return true;
		}
		pathOut.splice(0, pathOut.length, ...nextPath);
		return true;
	}
	visit(ast, []);
	return pathOut;
}

function runTv(code) {
	const cli = path.join(__dirname, "../dist/packages/cli/src/cli.js");
	try {
		const out = execFileSync(process.execPath, [cli, "--tv", "-"], {
			input: code,
			encoding: "utf8",
			timeout: 20000,
			maxBuffer: 10 * 1024 * 1024,
		});
		const parsed = JSON.parse(out);
		return (parsed.result?.errors ?? parsed.errors ?? []).map(
			(e) => `${e.start?.line ?? "?"}:${e.start?.column ?? "?"} ${e.message}`,
		);
	} catch (e) {
		return [`TV probe failed: ${e.message}`];
	}
}

function main() {
	const opts = parseArgs(process.argv.slice(2));
	const file = path.resolve(opts.file);
	const code = fs.readFileSync(file, "utf8");
	const lines = sourceLines(code);
	const local = validate(code);
	const target = findTarget(local.diagnostics, opts);
	if (!target) {
		const filters = [
			`line ${opts.line}`,
			opts.message
				? `message containing ${JSON.stringify(opts.message)}`
				: null,
			opts.source ? `source ${opts.source}` : null,
		]
			.filter(Boolean)
			.join(", ");
		console.error(`No matching local diagnostic found (${filters}).`);
		console.error(
			"Use --nearest to select the closest matching diagnostic instead.",
		);
		process.exit(1);
	}
	const key = diagnosticKey(target.message);
	let { selected, mandatory } = buildInitialSelection(
		lines,
		target.line,
		opts.context,
	);
	if (
		!hasTargetClass(
			renderSelection(lines, selected),
			key,
			target.source,
			opts.anySource,
		)
	) {
		selected = new Set(lines.map((_, i) => i + 1));
		mandatory = new Set(mandatory);
	}
	const minimizedSelection = minimize(
		lines,
		selected,
		mandatory,
		key,
		target.source,
		opts.anySource,
	);
	const minimized = renderSelection(lines, minimizedSelection);
	if (opts.out) fs.writeFileSync(path.resolve(opts.out), minimized);
	const minimizedDiagnostics = validate(minimized).diagnostics;

	console.log(`# Repro workbench: ${path.relative(process.cwd(), file)}`);
	console.log("");
	console.log(`Target: ${formatDiag(target)} [${target.source}]`);
	console.log(`Class: ${key}`);
	console.log(`Preserved source: ${opts.anySource ? "any" : target.source}`);
	console.log(`Original diagnostics: ${local.diagnostics.length}`);
	console.log(`Selected lines: ${minimizedSelection.size} of ${lines.length}`);
	console.log(`Original ranges: ${selectedRanges(minimizedSelection)}`);
	if (opts.out)
		console.log(
			`Wrote candidate: ${path.relative(process.cwd(), path.resolve(opts.out))}`,
		);
	console.log("");
	console.log("## Local diagnostics in minimized candidate");
	for (const diag of minimizedDiagnostics)
		console.log(`- ${formatDiag(diag)} [${diag.source}]`);
	if (minimizedDiagnostics.length === 0) console.log("- none");
	if (opts.tv) {
		console.log("");
		console.log("## TV diagnostics in minimized candidate");
		for (const diag of runTv(minimized)) console.log(`- ${diag}`);
	}
	console.log("");
	console.log("## Token context around original target");
	const tokens = tokenContext(code, target.line);
	for (const token of tokens) console.log(`- ${token}`);
	if (tokens.length === 0) console.log("- none");
	console.log("");
	console.log("## AST path around original target");
	const pathLines = astPath(local.ast, target.line);
	for (const item of pathLines) console.log(`- ${item}`);
	if (pathLines.length === 0) console.log("- none");
	if (opts.candidate) {
		console.log("");
		console.log("## Minimized candidate");
		console.log("```pine");
		process.stdout.write(minimized);
		console.log("```");
	}
}

main();
