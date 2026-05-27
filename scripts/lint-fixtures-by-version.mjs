#!/usr/bin/env node
// Cross-references the lint report against each fixture's @version directive
// to find errors concentrated in v6 scripts (where they're real bugs vs
// known v4/v5 limitations).

import { readFile } from "node:fs/promises";

const report = JSON.parse(await readFile("lint-reports/fixtures-lint-report.json", "utf8"));

const versions = new Map();      // version -> { total, ok, failed }
const errorByVersion = new Map(); // version -> Map(message -> count)

for (const r of report.results) {
	const src = await readFile(r.file, "utf8");
	const m = src.match(/\/\/\s*@version\s*=\s*(\d+)/);
	const v = m ? `v${m[1]}` : "none";
	const bucket = versions.get(v) ?? { total: 0, ok: 0, failed: 0 };
	bucket.total++;
	if (r.errorCount === 0) bucket.ok++;
	else bucket.failed++;
	versions.set(v, bucket);
}

console.log("Files by version directive:");
for (const [v, b] of [...versions.entries()].sort()) {
	console.log(`  ${v.padEnd(6)}  total=${String(b.total).padStart(5)}  ok=${String(b.ok).padStart(5)}  with-errors=${String(b.failed).padStart(5)}`);
}

// Now re-run per-file to attribute errors to versions
// (cheap because results just hold paths and counts; need raw errors)
import { spawn } from "node:child_process";

function lint(file) {
	return new Promise((res) => {
		const c = spawn("pine-lint", [file], { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		c.stdout.on("data", (d) => (out += d));
		c.on("close", () => {
			try { res(JSON.parse(out)); } catch { res(null); }
		});
	});
}

const v6Files = report.results.filter(async (r) => {
	const src = await readFile(r.file, "utf8");
	return /\/\/\s*@version\s*=\s*6/.test(src);
});

// Filter v6 properly
const v6OnlyResults = [];
for (const r of report.results) {
	if (r.errorCount === 0) continue;
	const src = await readFile(r.file, "utf8");
	if (/\/\/\s*@version\s*=\s*6/.test(src)) v6OnlyResults.push(r);
}

console.log(`\nv6 files with errors: ${v6OnlyResults.length}`);
console.log(`Re-running pine-lint on those to aggregate error messages…`);

const v6Errors = new Map();
const v6ErrorExamples = new Map();
let i = 0;
for (const r of v6OnlyResults) {
	const parsed = await lint(r.file);
	const errs = parsed?.result?.errors ?? [];
	for (const e of errs) {
		const msg = (e.message ?? "").slice(0, 200);
		v6Errors.set(msg, (v6Errors.get(msg) ?? 0) + 1);
		if (!v6ErrorExamples.has(msg)) v6ErrorExamples.set(msg, { file: r.file, line: e.start?.line, col: e.start?.column });
	}
	i++;
	if (i % 50 === 0) process.stderr.write(`  ${i}/${v6OnlyResults.length}\n`);
}

const top = [...v6Errors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
console.log(`\nTop errors in v6 fixtures only:`);
for (const [msg, count] of top) {
	const ex = v6ErrorExamples.get(msg);
	console.log(`  ${String(count).padStart(5)}  ${JSON.stringify(msg)}`);
	console.log(`         e.g. ${ex.file.split("/").pop()}:${ex.line}:${ex.col}`);
}
