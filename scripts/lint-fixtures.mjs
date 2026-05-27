#!/usr/bin/env node
// Runs pine-lint on every fixture in ./fixtures and summarizes results.
//
// Usage: node scripts/lint-fixtures.mjs [--limit N] [--out path]

import { readdir, writeFile, mkdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { cpus } from "node:os";

const args = process.argv.slice(2);
let limit = Number.POSITIVE_INFINITY;
let outPath = "fixtures-lint-report.json";
let concurrency = Math.max(2, Math.min(8, cpus().length));
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--limit") limit = Number(args[++i]);
	else if (args[i] === "--out") outPath = args[++i];
	else if (args[i] === "--concurrency") concurrency = Number(args[++i]);
}

const DIR = resolve("fixtures");
const REPORT_DIR = resolve("lint-reports");

function runOne(file) {
	return new Promise((res) => {
		const start = Date.now();
		const child = spawn("pine-lint", [file], { stdio: ["ignore", "pipe", "pipe"] });
		let stdout = "";
		let stderr = "";
		child.stdout.on("data", (d) => (stdout += d));
		child.stderr.on("data", (d) => (stderr += d));
		const killTimer = setTimeout(() => {
			child.kill("SIGKILL");
		}, 30_000);
		child.on("close", (code, signal) => {
			clearTimeout(killTimer);
			const ms = Date.now() - start;
			let parsed = null;
			let parseError = null;
			try {
				parsed = JSON.parse(stdout);
			} catch (e) {
				parseError = e.message;
			}
			res({ file, code, signal, ms, parsed, parseError, stderr });
		});
		child.on("error", (err) => {
			clearTimeout(killTimer);
			res({ file, code: -1, signal: null, ms: 0, parsed: null, parseError: err.message, stderr: "" });
		});
	});
}

async function main() {
	const entries = (await readdir(DIR)).filter((n) => n.endsWith(".pine")).sort();
	const files = entries.slice(0, Math.min(limit, entries.length)).map((n) => join(DIR, n));
	console.log(`linting ${files.length} files with concurrency=${concurrency}…`);

	const results = new Array(files.length);
	let next = 0;
	let done = 0;
	const startAll = Date.now();

	async function worker() {
		while (true) {
			const i = next++;
			if (i >= files.length) return;
			results[i] = await runOne(files[i]);
			done++;
			if (done % 50 === 0 || done === files.length) {
				const elapsed = ((Date.now() - startAll) / 1000).toFixed(1);
				process.stderr.write(`  ${done}/${files.length} (${elapsed}s)\n`);
			}
		}
	}
	await Promise.all(Array.from({ length: concurrency }, worker));

	// Aggregate
	const summary = {
		total: results.length,
		ok: 0,
		failed: 0,
		crashed: 0,
		timedOut: 0,
		unparseableOutput: 0,
		slowest: [],
		errorCounts: {},
		errorExamples: {},
		crashedFiles: [],
		unparseableFiles: [],
		failedNoErrors: [],
	};

	for (const r of results) {
		if (r.signal === "SIGKILL") summary.timedOut++;
		if (r.code !== 0 && r.signal !== "SIGKILL") summary.crashed++;
		if (r.parseError) {
			summary.unparseableOutput++;
			summary.unparseableFiles.push({ file: r.file, code: r.code, stderr: r.stderr.slice(0, 500) });
			continue;
		}
		if (r.code !== 0) {
			summary.crashedFiles.push({ file: r.file, code: r.code, signal: r.signal, stderr: r.stderr.slice(0, 500) });
			continue;
		}
		const errors = r.parsed?.result?.errors ?? r.parsed?.errors ?? [];
		if (errors.length === 0) {
			summary.ok++;
		} else {
			summary.failed++;
			for (const e of errors) {
				const msg = (e.message || e.text || JSON.stringify(e)).slice(0, 200);
				summary.errorCounts[msg] = (summary.errorCounts[msg] || 0) + 1;
				if (!summary.errorExamples[msg]) summary.errorExamples[msg] = r.file;
			}
		}
	}

	// Top 20 slowest
	summary.slowest = [...results]
		.sort((a, b) => b.ms - a.ms)
		.slice(0, 20)
		.map((r) => ({ file: r.file, ms: r.ms }));

	// Top 30 errors
	const topErrors = Object.entries(summary.errorCounts)
		.sort((a, b) => b[1] - a[1])
		.slice(0, 30);

	await mkdir(REPORT_DIR, { recursive: true });
	const reportPath = join(REPORT_DIR, outPath);
	await writeFile(reportPath, JSON.stringify({ summary, topErrors, results: results.map((r) => ({
		file: r.file,
		code: r.code,
		signal: r.signal,
		ms: r.ms,
		errorCount: (r.parsed?.result?.errors ?? r.parsed?.errors ?? []).length,
		parseError: r.parseError,
	})) }, null, 2));

	console.log("\n=== summary ===");
	console.log(`total:             ${summary.total}`);
	console.log(`success:           ${summary.ok}`);
	console.log(`failed (errors):   ${summary.failed}`);
	console.log(`crashed (non-0):   ${summary.crashed}`);
	console.log(`timed out (>30s):  ${summary.timedOut}`);
	console.log(`bad JSON output:   ${summary.unparseableOutput}`);
	console.log(`failed w/ 0 errs:  ${summary.failedNoErrors.length}`);
	console.log(`\ntop 10 error messages:`);
	for (const [msg, count] of topErrors.slice(0, 10)) {
		console.log(`  ${String(count).padStart(4)}  ${msg}`);
	}
	console.log(`\nslowest 5:`);
	for (const s of summary.slowest.slice(0, 5)) {
		console.log(`  ${String(s.ms).padStart(6)}ms  ${s.file}`);
	}
	console.log(`\nfull report: ${reportPath}`);
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
