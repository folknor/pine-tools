#!/usr/bin/env node
// Compare this repo's pine-lint verdicts with piners' syntax crate through
// `po validate`. This is intentionally local-only: no TradingView calls.
//
// Usage:
//   node scripts/compare-piners.mjs
//   node scripts/compare-piners.mjs packages/core/test/fixtures/regression --details
//   node scripts/compare-piners.mjs fixtures --limit 50
//   node scripts/compare-piners.mjs vendor --json > piners-gaps.json

import { spawn } from "node:child_process";
import { access, readdir, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const DEFAULT_INPUTS = [
	join(REPO_ROOT, "packages/core/test/fixtures"),
	join(REPO_ROOT, "fixtures"),
	join(REPO_ROOT, "pine-data/tests"),
	join(REPO_ROOT, "vendor"),
	join(REPO_ROOT, "adaptive-session-filter.pine"),
];

const args = process.argv.slice(2).filter((a) => a !== "--");
const flags = new Set();
const inputs = [];
let concurrency = 8;
let limit = null;
for (let i = 0; i < args.length; i++) {
	const a = args[i];
	if (a === "--concurrency") concurrency = Number(args[++i]);
	else if (a === "--limit") limit = Number(args[++i]);
	else if (a.startsWith("--")) flags.add(a);
	else inputs.push(a);
}

const jsonMode = flags.has("--json");
const quiet = flags.has("--quiet");
const syntaxOnly = !flags.has("--all-stages");
const includeWarnings = flags.has("--warnings");
const failOnGap = flags.has("--fail-on-gap");
const summaryOnly = !flags.has("--details");

if (flags.has("--help") || flags.has("-h")) {
	console.log(`usage: compare-piners.mjs [file|dir|glob...] [options]

Compares pine-lint with piners through: po validate --format json --file <file>

Options:
  --all-stages        compare type/analysis diagnostics too
  --warnings          include warning diagnostics in the diff
  --details           print every file with a gap, not just grouped summaries
  --quiet             hide files with no gaps
  --json              emit machine-readable JSON
  --concurrency N     parallel file checks, default 8
  --limit N           check only the first N expanded files
  --fail-on-gap       exit 1 when any gap is found

Default inputs:
  ${DEFAULT_INPUTS.map(displayPath).join("\n  ")}`);
	process.exit(0);
}

function displayPath(path) {
	const rel = relative(REPO_ROOT, path);
	return rel && !rel.startsWith("..") && !isAbsolute(rel) ? rel : path;
}

async function exists(path) {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

async function walkPine(dir) {
	const found = [];
	const entries = await readdir(dir, { withFileTypes: true, recursive: true });
	for (const e of entries) {
		if (e.isFile() && e.name.endsWith(".pine")) {
			found.push(join(e.parentPath ?? e.path, e.name));
		}
	}
	return found;
}

function globToRegex(pattern) {
	let re = "";
	for (let i = 0; i < pattern.length; i++) {
		const c = pattern[i];
		if (c === "*") {
			if (pattern[i + 1] === "*") {
				re += ".*";
				i++;
			} else {
				re += "[^/]*";
			}
		} else if (c === "?") {
			re += "[^/]";
		} else if (c === "[") {
			const end = pattern.indexOf("]", i + 1);
			if (end === -1) {
				re += "\\[";
			} else {
				re += pattern.slice(i, end + 1);
				i = end;
			}
		} else {
			re += c.replace(/[.+^${}()|\\\]]/g, "\\$&");
		}
	}
	return new RegExp(`^${re}$`);
}

async function expandInput(arg) {
	if (!/[*?]/.test(arg)) {
		const s = await stat(arg).catch(() => null);
		if (!s) return [];
		const files = s.isDirectory() ? await walkPine(arg) : [arg];
		return files.map((p) => resolve(p));
	}

	const segments = arg.split(sep);
	const firstWild = segments.findIndex((s) => /[*?]/.test(s));
	const baseDir = firstWild === 0 ? "." : segments.slice(0, firstWild).join(sep);
	const s = await stat(baseDir).catch(() => null);
	if (!s?.isDirectory()) return [];
	const re = globToRegex(arg);
	const entries = await readdir(baseDir, { withFileTypes: true, recursive: true });
	return entries
		.filter((e) => e.isFile())
		.map((e) => join(e.parentPath ?? e.path, e.name))
		.filter((p) => re.test(p))
		.map((p) => resolve(p));
}

function run(command, spawnArgs) {
	return new Promise((res) => {
		const c = spawn(command, spawnArgs, {
			cwd: REPO_ROOT,
			stdio: ["ignore", "pipe", "pipe"],
		});
		let out = "";
		let err = "";
		c.stdout.on("data", (d) => (out += d));
		c.stderr.on("data", (d) => (err += d));
		const t = setTimeout(() => c.kill("SIGKILL"), 60_000);
		c.on("close", (code) => {
			clearTimeout(t);
			res({ out, err, code });
		});
		c.on("error", (e) => {
			clearTimeout(t);
			res({ out: "", err: e.message, code: -1 });
		});
	});
}

function shellQuote(value) {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

function runPineLint(file) {
	// In this environment the installed Node wrapper can emit no stdout when
	// spawned without a tty. `script` gives it the same output path as a normal
	// terminal command while still letting us capture JSON.
	return run("script", [
		"-qfec",
		`cd ${shellQuote(REPO_ROOT)} && pine-lint ${shellQuote(file)}`,
		"/dev/null",
	]);
}

function fillTemplate(message, ctx) {
	if (!ctx) return message;
	return message.replace(/\{(\w+)\}/g, (m, key) => ctx[key] ?? m);
}

function isSyntaxMessage(message) {
	return /syntax|unexpected token|mismatched input|missing closing|no viable alternative|extraneous input|end of line without line continuation/i.test(
		message,
	);
}

function sortDiagnostics(list) {
	return list.sort(
		(a, b) =>
			a.line - b.line ||
			a.col - b.col ||
			a.stage.localeCompare(b.stage) ||
			a.message.localeCompare(b.message),
	);
}

function pickPineLint(raw) {
	try {
		const j = JSON.parse(raw);
		const mapDiag = (e, severity) => ({
			line: e.start?.line ?? 1,
			col: e.start?.column ?? 1,
			message: fillTemplate(e.message ?? "", e.ctx),
			severity,
			stage: isSyntaxMessage(fillTemplate(e.message ?? "", e.ctx))
				? "syntax"
				: "analysis",
			...(e.code ? { code: e.code } : {}),
		});
		const errors = (j.result?.errors ?? j.errors ?? []).map((e) =>
			mapDiag(e, "error"),
		);
		const warnings = includeWarnings
			? (j.result?.warnings ?? j.warnings ?? []).map((e) =>
					mapDiag(e, "warning"),
				)
			: [];
		const diagnostics = sortDiagnostics([...errors, ...warnings]).filter(
			(d) => !syntaxOnly || d.stage === "syntax",
		);
		return { ok: true, diagnostics };
	} catch (e) {
		return {
			ok: false,
			diagnostics: [],
			detail: `${e.message}; raw: ${raw.slice(0, 200)}`,
		};
	}
}

function pickPiners(raw) {
	try {
		const j = JSON.parse(raw);
		const diagnostics = sortDiagnostics(
			(j.diagnostics ?? [])
				.filter((d) => includeWarnings || d.severity !== "warning")
				.map((d) => ({
					line: d.line ?? 1,
					col: d.column ?? 1,
					message: d.message ?? "",
					severity: d.severity ?? "error",
					stage: d.stage ?? "unknown",
					...(d.code ? { code: d.code } : {}),
				}))
				.filter((d) => !syntaxOnly || d.stage === "parse" || d.stage === "lex"),
		);
		return { ok: true, diagnostics };
	} catch (e) {
		return {
			ok: false,
			diagnostics: [],
			detail: `${e.message}; raw: ${raw.slice(0, 200)}`,
		};
	}
}

function key(d) {
	return `${d.line}:${d.col}`;
}

function diffByPosition(pineLint, piners) {
	const pineLintPos = new Set(pineLint.map(key));
	const pinersPos = new Set(piners.map(key));
	const pineLintOnly = pineLint.filter((d) => !pinersPos.has(key(d)));
	const pinersOnly = piners.filter((d) => !pineLintPos.has(key(d)));
	const pinersByPos = new Map(piners.map((d) => [key(d), d]));
	const samePositionDifferentStage = pineLint
		.filter((d) => pinersByPos.has(key(d)))
		.map((d) => ({ pineLint: d, piners: pinersByPos.get(key(d)) }))
		.filter((p) => p.pineLint.stage !== p.piners.stage);
	return { pineLintOnly, pinersOnly, samePositionDifferentStage };
}

async function compareOne(file) {
	const [pineLintRes, pinersRes] = await Promise.all([
		runPineLint(file),
		run("po", ["validate", "--format", "json", "--file", file]),
	]);

	const pineLint = pickPineLint(pineLintRes.out);
	const piners = pickPiners(pinersRes.out);
	if (!pineLint.ok || !piners.ok) {
		return {
			file,
			noVerdict: !pineLint.ok ? "pine-lint" : "piners",
			detail: (!pineLint.ok ? pineLint : piners).detail,
		};
	}

	return {
		file,
		pineLint: pineLint.diagnostics,
		piners: piners.diagnostics,
		...diffByPosition(pineLint.diagnostics, piners.diagnostics),
	};
}

const rawInputs = inputs.length
	? inputs
	: (await Promise.all(DEFAULT_INPUTS.map(exists))).flatMap((ok, i) =>
			ok ? [DEFAULT_INPUTS[i]] : [],
		);

const files = [
	...new Set((await Promise.all(rawInputs.map(expandInput))).flat()),
].sort();

if (limit != null) files.splice(limit);

if (files.length === 0) {
	console.error("no .pine files matched");
	process.exit(2);
}

const results = new Array(files.length);
let next = 0;
let done = 0;
const startedAt = Date.now();

async function worker() {
	while (true) {
		const i = next++;
		if (i >= files.length) return;
		results[i] = await compareOne(files[i]);
		done++;
		if (!jsonMode && (done % 200 === 0 || done === files.length)) {
			process.stderr.write(
				`  ${done}/${files.length} (${((Date.now() - startedAt) / 1000).toFixed(1)}s)\n`,
			);
		}
	}
}

await Promise.all(Array.from({ length: Math.min(concurrency, files.length) }, worker));

function hasGap(r) {
	return (
		r.noVerdict ||
		r.pineLintOnly.length ||
		r.pinersOnly.length ||
		r.samePositionDifferentStage.length
	);
}

function firstLine(d) {
	const stage = d.stage ? `${d.stage} ` : "";
	const code = d.code ? `${d.code} ` : "";
	return `${d.line}:${d.col} ${stage}${code}${d.message}`;
}

function bucketKey(d) {
	return `${d.stage}:${normalizeMessage(d.message)}`;
}

function normalizeMessage(message) {
	return message
		.replace(/identifier `[^`]+`/g, "identifier `<id>`")
		.replace(/got string `[^`]*`/g, "got string `<string>`")
		.replace(/got float `[^`]+`/g, "got float `<float>`")
		.replace(/got int `[^`]+`/g, "got int `<int>`")
		.replace(/unexpected character `[^`]+`/g, "unexpected character `<char>`")
		.replace(/candidates: .*/g, "candidates: <omitted>");
}

function summarize(side) {
	const counts = new Map();
	const fileCounts = new Map();
	const examples = new Map();
	for (const r of results) {
		const seenInFile = new Set();
		for (const d of r[side] ?? []) {
			const k = bucketKey(d);
			counts.set(k, (counts.get(k) ?? 0) + 1);
			seenInFile.add(k);
			if (!examples.has(k)) {
				examples.set(k, []);
			}
			const list = examples.get(k);
			if (list.length < 3) {
				list.push(`${displayPath(r.file)}:${d.line}:${d.col}`);
			}
		}
		for (const k of seenInFile) {
			fileCounts.set(k, (fileCounts.get(k) ?? 0) + 1);
		}
	}
	return [...counts.entries()]
		.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
		.slice(0, 20)
		.map(([message, count]) => ({
			count,
			files: fileCounts.get(message) ?? 0,
			message,
			examples: examples.get(message) ?? [],
		}));
}

const summary = {
	files: files.length,
	noVerdict: results.filter((r) => r.noVerdict).length,
	filesWithGaps: results.filter(hasGap).length,
	pineLintOnly: results.reduce((s, r) => s + (r.pineLintOnly?.length ?? 0), 0),
	pinersOnly: results.reduce((s, r) => s + (r.pinersOnly?.length ?? 0), 0),
	samePositionDifferentStage: results.reduce(
		(s, r) => s + (r.samePositionDifferentStage?.length ?? 0),
		0,
	),
	syntaxOnly,
	includeWarnings,
};

if (jsonMode) {
	console.log(
		JSON.stringify(
			{
				summary,
				files: Object.fromEntries(results.map((r) => [r.file, r])),
				topPineLintOnly: summarize("pineLintOnly"),
				topPinersOnly: summarize("pinersOnly"),
			},
			null,
			2,
		),
	);
} else {
	for (const r of results) {
		if (summaryOnly) break;
		if (quiet && !hasGap(r)) continue;
		if (r.noVerdict) {
			console.log(
				`== ${displayPath(r.file)}  (no verdict: ${r.noVerdict} - ${r.detail})`,
			);
			continue;
		}
		const clean = !hasGap(r);
		console.log(
			`== ${displayPath(r.file)}${clean ? "  (no gaps)" : ""}` +
				(clean
					? ""
					: `  pine-lint-only ${r.pineLintOnly.length} / piners-only ${r.pinersOnly.length} / stage-only ${r.samePositionDifferentStage.length}`),
		);
		for (const d of r.pineLintOnly.slice(0, 12)) {
			console.log(`  pine-lint-only ${firstLine(d)}`);
		}
		if (r.pineLintOnly.length > 12) {
			console.log(`  pine-lint-only +${r.pineLintOnly.length - 12} more`);
		}
		for (const d of r.pinersOnly.slice(0, 12)) {
			console.log(`  piners-only    ${firstLine(d)}`);
		}
		if (r.pinersOnly.length > 12) {
			console.log(`  piners-only +${r.pinersOnly.length - 12} more`);
		}
	}

	console.log("\n=== summary ===");
	console.log(`files checked:                 ${summary.files}`);
	console.log(`files with gaps:               ${summary.filesWithGaps}`);
	console.log(`no verdict:                    ${summary.noVerdict}`);
	console.log(`pine-lint-only diagnostics:    ${summary.pineLintOnly}`);
	console.log(`piners-only diagnostics:       ${summary.pinersOnly}`);
	console.log(`same-position stage diffs:     ${summary.samePositionDifferentStage}`);
	console.log(`syntax/parser only:            ${summary.syntaxOnly}`);
	console.log(`warnings included:             ${summary.includeWarnings}`);

	for (const [title, side] of [
		["top pine-lint-only", "pineLintOnly"],
		["top piners-only", "pinersOnly"],
	]) {
		const rows = summarize(side);
		if (!rows.length) continue;
		console.log(`\n=== ${title} ===`);
		for (const r of rows) {
			console.log(`${r.count} diagnostics in ${r.files} files  ${r.message}`);
			for (const example of r.examples) {
				console.log(`    e.g. ${example}`);
			}
		}
	}
}

if (failOnGap && results.some(hasGap)) process.exit(1);
