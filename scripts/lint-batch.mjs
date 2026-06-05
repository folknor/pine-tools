#!/usr/bin/env node
// Batch-runs pine-lint over many files and prints one compact block per
// file - the everyday tool for probe directories and fixture subsets,
// replacing ad-hoc `for f in ...; do pine-lint $f; done` shell loops.
//
// Inputs may be files, directories (recursively walked for .pine), or
// glob patterns (quoted, so the shell doesn't have to expand them):
//
//   node scripts/lint-batch.mjs investigations/INV032-*/probes
//   node scripts/lint-batch.mjs 'fixtures/35*.pine' --errors-only
//   node scripts/lint-batch.mjs probes --tv            # TV verdicts instead
//   node scripts/lint-batch.mjs probes --diff          # local vs TV per file
//
// Options:
//   --tv                TV verdicts instead of the local validator (network;
//                       concurrency capped at 4 - be sparing, see CLAUDE.md)
//   --diff              run BOTH sides and print the per-file position diff
//                       (small-scale compare-tv; same no-verdict semantics)
//   --errors-only       hide warnings
//   --warnings-only     hide errors
//   --filter <text>     only diagnostics whose message contains <text>
//                       (case-insensitive)
//   --quiet             skip clean files (default prints them as "(clean)")
//   --json              machine-readable output (one object, keyed by file)
//   --concurrency <N>   parallel lint processes (default 8 local, 4 TV)
//   --fail-on-error     exit 1 if any error (or any diff in --diff mode)
//
// A file whose lint output can't be parsed is reported as "(no verdict)",
// never as clean - an unparseable side is not an empty error list (G002).

import { readdir, readFile, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join, resolve, sep } from "node:path";
import { remapTvDiagnostics } from "./lib/tv-positions.mjs";

const args = process.argv.slice(2);
const flags = new Set();
const inputs = [];
let filter = null;
let concurrency = null;
for (let i = 0; i < args.length; i++) {
	const a = args[i];
	if (a === "--filter") filter = (args[++i] ?? "").toLowerCase();
	else if (a === "--concurrency") concurrency = Number(args[++i]);
	else if (a.startsWith("--")) flags.add(a);
	else inputs.push(a);
}

const tvMode = flags.has("--tv");
const diffMode = flags.has("--diff");
const jsonMode = flags.has("--json");
const quiet = flags.has("--quiet");
const errorsOnly = flags.has("--errors-only");
const warningsOnly = flags.has("--warnings-only");

if (inputs.length === 0) {
	console.error(
		"usage: lint-batch.mjs <file|dir|glob>... [--tv|--diff] [--errors-only] " +
			"[--warnings-only] [--filter <text>] [--quiet] [--json] " +
			"[--concurrency N] [--fail-on-error]",
	);
	process.exit(2);
}
if (tvMode && diffMode) {
	console.error("--tv and --diff are mutually exclusive (--diff runs both sides)");
	process.exit(2);
}

// TV etiquette: never hammer translate_light. Local lint is cheap.
const hitsTv = tvMode || diffMode;
if (concurrency == null) concurrency = hitsTv ? 4 : 8;
if (hitsTv) concurrency = Math.min(concurrency, 4);

// --- input expansion: files, directories, globs ------------------------

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

// Minimal glob: * matches within a path segment, ** crosses segments,
// ? matches one char, [...] is a character class (passed through as-is,
// so ranges like [5-8] work). The pattern is rooted at its longest
// literal directory prefix, which is then walked recursively.
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
		if (!s) {
			console.error(`no such file or directory: ${arg}`);
			process.exit(2);
		}
		return s.isDirectory() ? walkPine(arg) : [arg];
	}
	// Rooted walk from the literal prefix, regex-match the remainder.
	const segments = arg.split(sep);
	const firstWild = segments.findIndex((s) => /[*?]/.test(s));
	const baseDir = firstWild === 0 ? "." : segments.slice(0, firstWild).join(sep);
	const re = globToRegex(arg);
	const s = await stat(baseDir).catch(() => null);
	if (!s?.isDirectory()) {
		console.error(`glob base is not a directory: ${baseDir}`);
		process.exit(2);
	}
	const entries = await readdir(baseDir, {
		withFileTypes: true,
		recursive: true,
	});
	return entries
		.filter((e) => e.isFile())
		.map((e) => join(e.parentPath ?? e.path, e.name))
		.filter((p) => re.test(p));
}

const files = [...new Set((await Promise.all(inputs.map(expandInput))).flat())]
	.sort();
if (files.length === 0) {
	console.error("no files matched");
	process.exit(2);
}

// --- lint runners -------------------------------------------------------

function run(spawnArgs) {
	return new Promise((res) => {
		const c = spawn("pine-lint", spawnArgs, {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let out = "";
		c.stdout.on("data", (d) => (out += d));
		const t = setTimeout(() => c.kill("SIGKILL"), 60_000);
		c.on("close", (code) => {
			clearTimeout(t);
			res({ out, code });
		});
		c.on("error", () => {
			clearTimeout(t);
			res({ out: "", code: -1 });
		});
	});
}

// Fill TV's message templates ("... {variableName} ..." + ctx).
function fillTemplate(message, ctx) {
	if (!ctx) return message;
	return message.replace(/\{(\w+)\}/g, (m, key) => ctx[key] ?? m);
}

// Unparseable output is "no verdict", never an empty diagnostic list (G002).
function pickDiagnostics(raw) {
	try {
		const j = JSON.parse(raw);
		const mapDiag = (e) => ({
			line: e.start?.line ?? 0,
			col: e.start?.column ?? 0,
			message: fillTemplate(e.message ?? "", e.ctx),
		});
		const sortPos = (a, b) =>
			a.line - b.line || a.col - b.col || a.message.localeCompare(b.message);
		return {
			ok: true,
			errors: (j.result?.errors ?? j.errors ?? []).map(mapDiag).sort(sortPos),
			warnings: (j.result?.warnings ?? j.warnings ?? [])
				.map(mapDiag)
				.sort(sortPos),
		};
	} catch (e) {
		return { ok: false, errors: [], warnings: [], detail: e.message };
	}
}

function diffByPosition(localList, tvList) {
	const key = (e) => `${e.line}:${e.col}`;
	const localPos = new Set(localList.map(key));
	const tvPos = new Set(tvList.map(key));
	const localOnly = localList.filter((e) => !tvPos.has(key(e)));
	const tvOnly = tvList.filter((e) => !localPos.has(key(e)));
	const tvByPos = new Map(tvList.map((e) => [key(e), e]));
	const samePositionDifferentMessage = localList
		.filter((e) => tvByPos.has(key(e)) && tvByPos.get(key(e)).message !== e.message)
		.map((e) => ({
			line: e.line,
			col: e.col,
			localMessage: e.message,
			tvMessage: tvByPos.get(key(e)).message,
		}));
	return { localOnly, tvOnly, samePositionDifferentMessage };
}

const matchesFilter = (d) =>
	!filter || d.message.toLowerCase().includes(filter);

async function lintOne(file) {
	if (diffMode) {
		const [localRes, tvRes, source] = await Promise.all([
			run([file]),
			run(["--tv", file]),
			readFile(file, "utf8"),
		]);
		const local = pickDiagnostics(localRes.out);
		const tv = pickDiagnostics(tvRes.out);
		if (!local.ok || !tv.ok) {
			const side = !tv.ok ? "tv" : "local";
			return { file, noVerdict: side, detail: (!tv.ok ? tv : local).detail };
		}
		tv.errors = remapTvDiagnostics(source, tv.errors);
		tv.warnings = remapTvDiagnostics(source, tv.warnings);
		return {
			file,
			errors: diffByPosition(local.errors, tv.errors),
			warnings: diffByPosition(local.warnings, tv.warnings),
		};
	}

	const res = await run(tvMode ? ["--tv", file] : [file]);
	const d = pickDiagnostics(res.out);
	if (!d.ok) return { file, noVerdict: tvMode ? "tv" : "local", detail: d.detail };
	if (tvMode) {
		const source = await readFile(file, "utf8");
		d.errors = remapTvDiagnostics(source, d.errors);
		d.warnings = remapTvDiagnostics(source, d.warnings);
	}
	return {
		file,
		errors: warningsOnly ? [] : d.errors.filter(matchesFilter),
		warnings: errorsOnly ? [] : d.warnings.filter(matchesFilter),
	};
}

// --- run pool, ordered output -------------------------------------------

const results = new Array(files.length);
let next = 0;
async function worker() {
	while (true) {
		const i = next++;
		if (i >= files.length) return;
		results[i] = await lintOne(files[i]);
	}
}
await Promise.all(
	Array.from({ length: Math.min(concurrency, files.length) }, worker),
);

// --- output ---------------------------------------------------------------

if (jsonMode) {
	const out = {};
	for (const r of results) {
		const { file, ...rest } = r;
		out[file] = rest;
	}
	console.log(JSON.stringify(out, null, 2));
} else if (diffMode) {
	let printed = 0;
	for (const r of results) {
		const counts = r.noVerdict
			? null
			: {
					lo: r.errors.localOnly.length,
					to: r.errors.tvOnly.length,
					sp: r.errors.samePositionDifferentMessage.length,
					wlo: r.warnings.localOnly.length,
					wto: r.warnings.tvOnly.length,
				};
		const clean = counts && Object.values(counts).every((c) => c === 0);
		if (quiet && clean) continue;
		printed++;
		if (r.noVerdict) {
			console.log(`== ${r.file}  (no verdict: ${r.noVerdict} side - ${r.detail})`);
			continue;
		}
		if (clean) {
			console.log(`== ${r.file}  (no disagreement)`);
			continue;
		}
		console.log(
			`== ${r.file}  local-only ${counts.lo} / tv-only ${counts.to} / same-pos ${counts.sp}` +
				(counts.wlo || counts.wto
					? `  [warnings ${counts.wlo}/${counts.wto}]`
					: ""),
		);
		for (const e of r.errors.localOnly)
			console.log(`  local-only ${e.line}:${e.col}  ${e.message}`);
		for (const e of r.errors.tvOnly)
			console.log(`  tv-only    ${e.line}:${e.col}  ${e.message}`);
		for (const p of r.errors.samePositionDifferentMessage) {
			console.log(`  same-pos   ${p.line}:${p.col}`);
			console.log(`    local: ${p.localMessage}`);
			console.log(`    tv:    ${p.tvMessage}`);
		}
	}
	const noVerdict = results.filter((r) => r.noVerdict).length;
	const disagree = results.filter(
		(r) =>
			!r.noVerdict &&
			(r.errors.localOnly.length ||
				r.errors.tvOnly.length ||
				r.errors.samePositionDifferentMessage.length),
	).length;
	console.log(
		`\n${files.length} files: ${disagree} with error disagreements, ${noVerdict} no-verdict` +
			(quiet ? ` (${files.length - printed - noVerdict} clean hidden)` : ""),
	);
} else {
	for (const r of results) {
		if (r.noVerdict) {
			console.log(`== ${r.file}  (no verdict - ${r.detail})`);
			continue;
		}
		const clean = r.errors.length === 0 && r.warnings.length === 0;
		if (quiet && clean) continue;
		console.log(`== ${r.file}${clean ? "  (clean)" : ""}`);
		for (const e of r.errors) console.log(`  ${e.line}:${e.col}  E  ${e.message}`);
		for (const w of r.warnings) console.log(`  ${w.line}:${w.col}  W  ${w.message}`);
	}
	const withErrors = results.filter((r) => r.errors?.length > 0).length;
	const totalE = results.reduce((s, r) => s + (r.errors?.length ?? 0), 0);
	const totalW = results.reduce((s, r) => s + (r.warnings?.length ?? 0), 0);
	const noVerdict = results.filter((r) => r.noVerdict).length;
	console.log(
		`\n${files.length} files: ${withErrors} with errors (${totalE} errors, ${totalW} warnings, ${noVerdict} no-verdict)`,
	);
}

if (flags.has("--fail-on-error")) {
	const bad = results.some(
		(r) =>
			r.noVerdict ||
			(diffMode
				? r.errors.localOnly.length ||
					r.errors.tvOnly.length ||
					r.errors.samePositionDifferentMessage.length
				: r.errors.length > 0),
	);
	if (bad) process.exit(1);
}
