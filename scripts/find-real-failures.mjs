#!/usr/bin/env node
// For every v6 fixture, runs both pine-lint (local) and pine-lint --tv
// (TradingView) and records errors where the two disagree on whether
// there is a problem at a given (line, column).
//
// - localOnly: error we report at (line,col) that TV does not.
// - tvOnly:    error TV reports at (line,col) that we do not.
// Wording differences at the same position do NOT count as disagreement.
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

			const tvKeys = new Set(tvE.errors.map((e) => `${e.line}:${e.col}`));
			const localKeys = new Set(localE.errors.map((e) => `${e.line}:${e.col}`));
			const localOnly = localE.errors.filter((e) => !tvKeys.has(`${e.line}:${e.col}`));
			const tvOnly = tvE.errors.filter((e) => !localKeys.has(`${e.line}:${e.col}`));

			fileReports[i] = {
				file,
				localOk: localE.ok,
				tvOk: tvE.ok,
				localErrorCount: localE.errors.length,
				tvErrorCount: tvE.errors.length,
				localOnly,
				tvOnly,
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
		totalLocalOnly: 0,
		totalTvOnly: 0,
		tvUnparseable: 0,
		localUnparseable: 0,
	};
	const localOnlyByMessage = new Map();
	const tvOnlyByMessage = new Map();
	const localOnlyExamples = new Map();
	const tvOnlyExamples = new Map();
	for (const r of fileReports) {
		if (!r.localOk) summary.localUnparseable++;
		if (!r.tvOk) summary.tvUnparseable++;
		if (r.localOnly.length > 0) summary.filesWithLocalOnly++;
		if (r.tvOnly.length > 0) summary.filesWithTvOnly++;
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
	console.log(`v6 scanned:                 ${summary.scanned}`);
	console.log(`files with local-only errs: ${summary.filesWithLocalOnly}`);
	console.log(`files with tv-only errs:    ${summary.filesWithTvOnly}`);
	console.log(`total local-only:           ${summary.totalLocalOnly}`);
	console.log(`total tv-only:              ${summary.totalTvOnly}`);
	console.log(`TV response unparseable:    ${summary.tvUnparseable}`);
	console.log(`local response unparseable: ${summary.localUnparseable}`);

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
