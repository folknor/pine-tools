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
// is evidence — not authority. A `localOnly` finding may be us being
// over-strict OR us correctly catching what TV missed. See gotcha G001.
//
// Usage: node scripts/find-real-failures.mjs [--limit N] [--concurrency K]

import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawn } from "node:child_process";

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

function pickErrors(raw) {
	try {
		const j = JSON.parse(raw);
		const errs = j.result?.errors ?? j.errors ?? [];
		return { ok: true, errors: errs.map((e) => ({ line: e.start?.line ?? 0, col: e.start?.column ?? 0, message: e.message ?? "" })) };
	} catch (e) {
		return { ok: false, errors: [], parseError: e.message };
	}
}

async function isV6(file) {
	const src = await readFile(file, "utf8");
	return /\/\/\s*@version\s*=\s*6/.test(src);
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
			const [local, tv] = await Promise.all([run([file]), run(["--tv", file])]);
			const localE = pickErrors(local.out);
			const tvE = pickErrors(tv.out);

			const tvByPos = new Map();
			for (const e of tvE.errors) {
				const k = `${e.line}:${e.col}`;
				if (!tvByPos.has(k)) tvByPos.set(k, []);
				tvByPos.get(k).push(e);
			}
			const localByPos = new Map();
			for (const e of localE.errors) {
				const k = `${e.line}:${e.col}`;
				if (!localByPos.has(k)) localByPos.set(k, []);
				localByPos.get(k).push(e);
			}

			const localOnly = localE.errors.filter((e) => !tvByPos.has(`${e.line}:${e.col}`));
			const tvOnly = tvE.errors.filter((e) => !localByPos.has(`${e.line}:${e.col}`));

			// Same position, different message — both linters caught
			// something at (line, col) but worded it differently. Usually
			// this is just two correct linters with different wording; we
			// surface it so reviewers can spot the rare case where it's
			// actually two genuinely different bugs at the same column.
			const samePositionDifferentMessage = [];
			for (const [k, locals] of localByPos.entries()) {
				const tvs = tvByPos.get(k);
				if (!tvs) continue;
				for (const local of locals) {
					for (const tv of tvs) {
						if (local.message !== tv.message) {
							samePositionDifferentMessage.push({
								line: local.line,
								col: local.col,
								localMessage: local.message,
								tvMessage: tv.message,
							});
						}
					}
				}
			}

			fileReports[i] = {
				file,
				localOk: localE.ok,
				tvOk: tvE.ok,
				localErrorCount: localE.errors.length,
				tvErrorCount: tvE.errors.length,
				localOnly,
				tvOnly,
				samePositionDifferentMessage,
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

	// Aggregate
	const summary = {
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
	};
	const localOnlyByMessage = new Map();
	const tvOnlyByMessage = new Map();
	const localOnlyExamples = new Map();
	const tvOnlyExamples = new Map();
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
	}

	await mkdir(OUT_DIR, { recursive: true });
	const reportPath = join(OUT_DIR, "real-failures.json");
	await writeFile(reportPath, JSON.stringify({
		summary,
		topLocalOnly: [...localOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([m, c]) => ({ message: m, count: c, example: localOnlyExamples.get(m) })),
		topTvOnly: [...tvOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 50).map(([m, c]) => ({ message: m, count: c, example: tvOnlyExamples.get(m) })),
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

	console.log(`\ntop 15 local-only messages (we flag, TV silent — investigate per category):`);
	for (const [m, c] of [...localOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
		console.log(`  ${String(c).padStart(5)}  ${m}`);
	}
	console.log(`\ntop 15 tv-only messages (TV flags, we silent — investigate per category):`);
	for (const [m, c] of [...tvOnlyByMessage.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
		console.log(`  ${String(c).padStart(5)}  ${m}`);
	}
	console.log(`\nfull report: ${reportPath}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
