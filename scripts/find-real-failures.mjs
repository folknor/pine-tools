#!/usr/bin/env node
// For every v6 fixture, runs both pine-lint (local) and pine-lint --tv
// (TradingView) and records errors where the two disagree on whether
// there is a problem at a given (line, column).
//
// - localOnly: error we report at (line,col) that TV does not.
// - tvOnly:    error TV reports at (line,col) that we do not.
// - samePositionDifferentMessage: both linters flag the same (line,col)
//   but worded the error differently. In every case observed so far
//   this is the same underlying bug seen through two vocabularies
//   (e.g. our "Operator 'or' requires bool" vs TV's "Cannot call
//   operator with argument…"); it is *not* a disagreement. Kept as a
//   sanity check so reviewers can confirm the position overlap is
//   genuine and not coincidental.
//
// The labels are navigation aids, not verdicts. Per CLAUDE.md, TV silence
// is evidence - not authority. A `localOnly` finding may be us being
// over-strict OR us correctly catching what TV missed. See gotcha G001.
//
// Usage: node scripts/find-real-failures.mjs [--limit N] [--concurrency K]

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { execSync, spawn } from "node:child_process";
import { remapTvDiagnostics } from "./lib/tv-positions.mjs";

const args = process.argv.slice(2);
let limit = Number.POSITIVE_INFINITY;
let concurrency = 4;
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--limit") limit = Number(args[++i]);
	else if (args[i] === "--concurrency") concurrency = Number(args[++i]);
}

const DIR = resolve("fixtures");
const OUT_DIR = resolve("lint-reports");

function run(args) {
	return new Promise((res) => {
		const c = spawn("pine-lint", args, { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		let err = "";
		c.stdout.on("data", (d) => (out += d));
		c.stderr.on("data", (d) => (err += d));
		const t = setTimeout(() => c.kill("SIGKILL"), 60_000);
		c.on("close", (code, signal) => {
			clearTimeout(t);
			res({ out, err, code, signal });
		});
		c.on("error", (e) => {
			clearTimeout(t);
			res({ out: "", err: String(e), code: -1, signal: null });
		});
	});
}

// Fill TV's message templates ("The function {functionName} ..." + ctx)
// so warning/error text is readable in reports.
function fillTemplate(message, ctx) {
	if (!ctx) return message;
	return message.replace(/\{(\w+)\}/g, (m, key) => ctx[key] ?? m);
}

// Picks both diagnostics channels: TV's translate_light returns a
// `warnings` array (CW codes) beside `errors` - see INV018 / TODO #36.
function pickDiagnostics(raw) {
	try {
		const j = JSON.parse(raw);
		const mapDiag = (e) => ({
			line: e.start?.line ?? 0,
			col: e.start?.column ?? 0,
			message: fillTemplate(e.message ?? "", e.ctx),
		});
		return {
			ok: true,
			errors: (j.result?.errors ?? j.errors ?? []).map(mapDiag),
			warnings: (j.result?.warnings ?? j.warnings ?? []).map(mapDiag),
		};
	} catch (e) {
		return { ok: false, errors: [], warnings: [], parseError: e.message };
	}
}

async function isV6(file) {
	const src = await readFile(file, "utf8");
	return /\/\/\s*@version\s*=\s*6/.test(src);
}

function emptyWarningDiff() {
	return { localCount: 0, tvCount: 0, localOnly: [], tvOnly: [] };
}

// Diff two diagnostic lists by (line, col). Same-position-different-
// message pairs are surfaced separately rather than counted as
// disagreement (usually two correct linters with different wording).
function diffByPosition(localList, tvList) {
	const localByPos = new Map();
	for (const e of localList) {
		const k = `${e.line}:${e.col}`;
		if (!localByPos.has(k)) localByPos.set(k, []);
		localByPos.get(k).push(e);
	}
	const tvByPos = new Map();
	for (const e of tvList) {
		const k = `${e.line}:${e.col}`;
		if (!tvByPos.has(k)) tvByPos.set(k, []);
		tvByPos.get(k).push(e);
	}

	const localOnly = localList.filter((e) => !tvByPos.has(`${e.line}:${e.col}`));
	const tvOnly = tvList.filter((e) => !localByPos.has(`${e.line}:${e.col}`));

	const samePositionDifferentMessage = [];
	for (const [k, locals] of localByPos.entries()) {
		const tvs = tvByPos.get(k);
		if (!tvs) continue;
		for (const l of locals) {
			for (const t of tvs) {
				if (l.message !== t.message) {
					samePositionDifferentMessage.push({
						line: l.line,
						col: l.col,
						localMessage: l.message,
						tvMessage: t.message,
					});
				}
			}
		}
	}
	return { localOnly, tvOnly, samePositionDifferentMessage };
}

async function main() {
	const entries = (await readdir(DIR)).filter((n) => n.endsWith(".pine")).sort();
	const allPaths = entries.map((n) => join(DIR, n));
	const v6Paths = [];
	for (const p of allPaths) if (await isV6(p)) v6Paths.push(p);
	const targets = v6Paths.slice(0, Math.min(limit, v6Paths.length));

	console.log(`v6 fixtures: ${v6Paths.length}; running on ${targets.length} with concurrency=${concurrency}`);

	const fileReports = new Array(targets.length);
	let next = 0;
	let done = 0;
	const startAll = Date.now();

	async function worker() {
		while (true) {
			const i = next++;
			if (i >= targets.length) return;
			const file = targets[i];
			const [local, tv, source] = await Promise.all([
				run([file]),
				run(["--tv", file]),
				readFile(file, "utf8"),
			]);
			const localE = pickDiagnostics(local.out);
			const tvE = pickDiagnostics(tv.out);
			// TV reports wrapped statements at logical-line columns; map them
			// back to physical positions before the position-keyed diff.
			// see G005 / #38.
			tvE.errors = remapTvDiagnostics(source, tvE.errors);
			tvE.warnings = remapTvDiagnostics(source, tvE.warnings);

			// An unparseable side means "no verdict", not "no errors" - diffing
			// against its empty error list would dump the entire other side
			// into localOnly/tvOnly (the swallowed-failure bug behind G002).
			// Record the file as unavailable and skip the comparison. see #29.
			if (!localE.ok || !tvE.ok) {
				fileReports[i] = {
					file,
					localOk: localE.ok,
					tvOk: tvE.ok,
					localErrorCount: localE.errors.length,
					tvErrorCount: tvE.errors.length,
					localOnly: [],
					tvOnly: [],
					samePositionDifferentMessage: [],
					warnings: emptyWarningDiff(),
					localParseError: localE.parseError,
					tvParseError: tvE.parseError,
					tvExitCode: tv.code,
				};
				done++;
				if (done % 25 === 0 || done === targets.length) {
					const elapsed = ((Date.now() - startAll) / 1000).toFixed(1);
					process.stderr.write(`  ${done}/${targets.length} (${elapsed}s)\n`);
				}
				continue;
			}

			const errorDiff = diffByPosition(localE.errors, tvE.errors);
			const warningDiff = diffByPosition(localE.warnings, tvE.warnings);

			fileReports[i] = {
				file,
				localOk: localE.ok,
				tvOk: tvE.ok,
				localErrorCount: localE.errors.length,
				tvErrorCount: tvE.errors.length,
				localOnly: errorDiff.localOnly,
				tvOnly: errorDiff.tvOnly,
				samePositionDifferentMessage: errorDiff.samePositionDifferentMessage,
				// WARNING channel (CW codes) - see INV018 / TODO #36
				warnings: {
					localCount: localE.warnings.length,
					tvCount: tvE.warnings.length,
					localOnly: warningDiff.localOnly,
					tvOnly: warningDiff.tvOnly,
				},
				localParseError: localE.parseError,
				tvParseError: tvE.parseError,
				tvExitCode: tv.code,
			};
			done++;
			if (done % 25 === 0 || done === targets.length) {
				const elapsed = ((Date.now() - startAll) / 1000).toFixed(1);
				process.stderr.write(`  ${done}/${targets.length} (${elapsed}s)\n`);
			}
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker));

	// Aggregate. A TV measurement is a point-in-time fact (G001), so the
	// report records WHEN it was taken and against WHICH commit of our
	// validator - without these the FP/FN counts can't be trusted later.
	let gitCommit = "unknown";
	try {
		gitCommit = execSync("git rev-parse HEAD", { encoding: "utf-8" }).trim();
	} catch {
		// not a git checkout - leave "unknown"
	}
	const summary = {
		generatedAt: new Date().toISOString(),
		gitCommit,
		v6Total: v6Paths.length,
		scanned: targets.length,
		filesWithLocalOnly: 0,
		filesWithTvOnly: 0,
		filesWithSamePosDifferentMessage: 0,
		totalLocalOnly: 0,
		totalTvOnly: 0,
		totalSamePosDifferentMessage: 0,
		tvUnparseableFiles: [],
		localUnparseableFiles: [],
		tvUnparseable: 0,
		localUnparseable: 0,
		// WARNING channel (CW codes) - see INV018 / TODO #36
		totalLocalWarnings: 0,
		totalTvWarnings: 0,
		totalWarningLocalOnly: 0,
		totalWarningTvOnly: 0,
	};
	const localOnlyByMessage = new Map();
	const tvOnlyByMessage = new Map();
	const localOnlyExamples = new Map();
	const tvOnlyExamples = new Map();
	const warnLocalOnlyByMessage = new Map();
	const warnTvOnlyByMessage = new Map();
	const warnLocalOnlyExamples = new Map();
	const warnTvOnlyExamples = new Map();
	for (const r of fileReports) {
		if (!r.localOk) {
			summary.localUnparseable++;
			summary.localUnparseableFiles.push(r.file);
		}
		if (!r.tvOk) {
			summary.tvUnparseable++;
			summary.tvUnparseableFiles.push(r.file);
		}
		if (r.localOnly.length > 0) summary.filesWithLocalOnly++;
		if (r.tvOnly.length > 0) summary.filesWithTvOnly++;
		if (r.samePositionDifferentMessage && r.samePositionDifferentMessage.length > 0) {
			summary.filesWithSamePosDifferentMessage++;
			summary.totalSamePosDifferentMessage += r.samePositionDifferentMessage.length;
		}
		summary.totalLocalOnly += r.localOnly.length;
		summary.totalTvOnly += r.tvOnly.length;
		for (const e of r.localOnly) {
			const m = e.message.slice(0, 200);
			localOnlyByMessage.set(m, (localOnlyByMessage.get(m) ?? 0) + 1);
			if (!localOnlyExamples.has(m)) localOnlyExamples.set(m, { file: r.file, line: e.line, col: e.col });
		}
		for (const e of r.tvOnly) {
			const m = e.message.slice(0, 200);
			tvOnlyByMessage.set(m, (tvOnlyByMessage.get(m) ?? 0) + 1);
			if (!tvOnlyExamples.has(m)) tvOnlyExamples.set(m, { file: r.file, line: e.line, col: e.col });
		}
		const w = r.warnings ?? emptyWarningDiff();
		summary.totalLocalWarnings += w.localCount;
		summary.totalTvWarnings += w.tvCount;
		summary.totalWarningLocalOnly += w.localOnly.length;
		summary.totalWarningTvOnly += w.tvOnly.length;
		for (const e of w.localOnly) {
			const m = e.message.slice(0, 200);
			warnLocalOnlyByMessage.set(m, (warnLocalOnlyByMessage.get(m) ?? 0) + 1);
			if (!warnLocalOnlyExamples.has(m)) warnLocalOnlyExamples.set(m, { file: r.file, line: e.line, col: e.col });
		}
		for (const e of w.tvOnly) {
			const m = e.message.slice(0, 200);
			warnTvOnlyByMessage.set(m, (warnTvOnlyByMessage.get(m) ?? 0) + 1);
			if (!warnTvOnlyExamples.has(m)) warnTvOnlyExamples.set(m, { file: r.file, line: e.line, col: e.col });
		}
	}

	await mkdir(OUT_DIR, { recursive: true });
	const reportPath = join(OUT_DIR, "real-failures.json");
	await writeFile(reportPath, JSON.stringify({
		summary,
		topLocalOnly: [...localOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([m, c]) => ({ message: m, count: c, example: localOnlyExamples.get(m) })),
		topTvOnly: [...tvOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([m, c]) => ({ message: m, count: c, example: tvOnlyExamples.get(m) })),
		topWarningLocalOnly: [...warnLocalOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([m, c]) => ({ message: m, count: c, example: warnLocalOnlyExamples.get(m) })),
		topWarningTvOnly: [...warnTvOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([m, c]) => ({ message: m, count: c, example: warnTvOnlyExamples.get(m) })),
		files: fileReports,
	}, null, 2));

	console.log(`\n=== summary ===`);
	console.log(`v6 scanned:                          ${summary.scanned}`);
	console.log(`files with local-only errs:          ${summary.filesWithLocalOnly}`);
	console.log(`files with tv-only errs:             ${summary.filesWithTvOnly}`);
	console.log(`files with same-pos different-msg:   ${summary.filesWithSamePosDifferentMessage}`);
	console.log(`total local-only:                    ${summary.totalLocalOnly}`);
	console.log(`total tv-only:                       ${summary.totalTvOnly}`);
	console.log(`total same-pos different-msg pairs:  ${summary.totalSamePosDifferentMessage}`);
	console.log(`TV response unparseable:             ${summary.tvUnparseable}`);
	if (summary.tvUnparseableFiles.length) {
		for (const f of summary.tvUnparseableFiles) console.log(`  ${f}`);
	}
	console.log(`local response unparseable:          ${summary.localUnparseable}`);
	if (summary.localUnparseableFiles.length) {
		for (const f of summary.localUnparseableFiles) console.log(`  ${f}`);
	}

	console.log(`\ntop 15 local-only messages (we flag, TV silent - investigate per category):`);
	for (const [m, c] of [...localOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
		console.log(`  ${String(c).padStart(5)}  ${m}`);
	}
	console.log(`\ntop 15 tv-only messages (TV flags, we silent - investigate per category):`);
	for (const [m, c] of [...tvOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
		console.log(`  ${String(c).padStart(5)}  ${m}`);
	}

	console.log(`\n=== warnings (CW codes; position-diffed - see TODO #36) ===`);
	console.log(`total local warnings:                ${summary.totalLocalWarnings}`);
	console.log(`total tv warnings:                   ${summary.totalTvWarnings}`);
	console.log(`warning local-only (we warn, TV no): ${summary.totalWarningLocalOnly}`);
	console.log(`warning tv-only (TV warns, we no):   ${summary.totalWarningTvOnly}`);
	console.log(`\ntop 15 warning local-only messages:`);
	for (const [m, c] of [...warnLocalOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
		console.log(`  ${String(c).padStart(5)}  ${m.slice(0, 130)}`);
	}
	console.log(`\ntop 15 warning tv-only messages:`);
	for (const [m, c] of [...warnTvOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
		console.log(`  ${String(c).padStart(5)}  ${m.slice(0, 130)}`);
	}
	console.log(`\nfull report: ${reportPath}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
