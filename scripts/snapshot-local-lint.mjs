#!/usr/bin/env node
// Captures the current local pine-lint output across every fixture into a
// stable baseline file. The baseline is the regression contract used by
// scripts/regression-check.mjs to detect parser/lexer/type regressions
// without hitting TradingView.
//
// Errors are sorted per file (line, col, message) so the file is stable
// across runs. Overwrites lint-reports/local-baseline.json. Re-run after
// every intentional change.
//
// Usage: node scripts/snapshot-local-lint.mjs [--concurrency N]

import { readdir, writeFile, mkdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, join } from "node:path";

const args = process.argv.slice(2);
let concurrency = 8;
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--concurrency") concurrency = Number(args[++i]);
}

const FIXTURES = resolve("fixtures");
const OUT = resolve("lint-reports/local-baseline.json");

try {
	await access(FIXTURES);
} catch {
	console.error(`No ${FIXTURES} - run scripts/collect-pine-fixtures.mjs first.`);
	process.exit(2);
}

function run(file) {
	return new Promise((res) => {
		const c = spawn("pine-lint", [file], { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		c.stdout.on("data", (d) => (out += d));
		const t = setTimeout(() => c.kill("SIGKILL"), 30_000);
		c.on("close", () => {
			clearTimeout(t);
			res(out);
		});
		c.on("error", () => {
			clearTimeout(t);
			res("");
		});
	});
}

function pickErrors(raw) {
	try {
		const j = JSON.parse(raw);
		const errs = j.result?.errors ?? j.errors ?? [];
		return errs
			.map((e) => ({ line: e.start?.line ?? 0, col: e.start?.column ?? 0, message: e.message ?? "" }))
			.sort((a, b) => a.line - b.line || a.col - b.col || a.message.localeCompare(b.message));
	} catch {
		return null;
	}
}

const entries = (await readdir(FIXTURES)).filter((n) => n.endsWith(".pine")).sort();
const baseline = {
	generatedAt: new Date().toISOString(),
	fixtureCount: entries.length,
	files: {},
};

let next = 0;
let done = 0;
const startedAt = Date.now();

async function worker() {
	while (true) {
		const i = next++;
		if (i >= entries.length) return;
		const name = entries[i];
		const errs = pickErrors(await run(join(FIXTURES, name)));
		baseline.files[name] = { errors: errs ?? [], parseFailed: errs === null };
		done++;
		if (done % 200 === 0 || done === entries.length) {
			process.stderr.write(`  ${done}/${entries.length} (${((Date.now() - startedAt) / 1000).toFixed(1)}s)\n`);
		}
	}
}

console.log(`snapshotting local pine-lint over ${entries.length} fixtures (concurrency ${concurrency})…`);
await Promise.all(Array.from({ length: concurrency }, worker));

await mkdir(resolve("lint-reports"), { recursive: true });
await writeFile(OUT, JSON.stringify(baseline, null, 2));

const filesWithErrors = Object.values(baseline.files).filter((f) => f.errors.length > 0).length;
const totalErrors = Object.values(baseline.files).reduce((s, f) => s + f.errors.length, 0);
const parseFailed = Object.values(baseline.files).filter((f) => f.parseFailed).length;

console.log(`\nbaseline written: ${OUT}`);
console.log(`fixtures snapshotted:  ${entries.length}`);
console.log(`fixtures with errors:  ${filesWithErrors}`);
console.log(`total error records:   ${totalErrors}`);
console.log(`pine-lint parse fails: ${parseFailed}`);
