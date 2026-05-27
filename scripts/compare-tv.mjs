#!/usr/bin/env node
// Runs pine-lint locally and pine-lint --tv on a file, prints just the errors
// (not the full parsed scope output).
//
// Usage: node scripts/compare-tv.mjs <file.pine>

import { spawn } from "node:child_process";

const file = process.argv[2];
if (!file) {
	console.error("usage: compare-tv.mjs <file.pine>");
	process.exit(1);
}

function run(args) {
	return new Promise((res) => {
		const c = spawn("pine-lint", args, { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		c.stdout.on("data", (d) => (out += d));
		c.on("close", () => res(out));
	});
}

function pickErrors(raw) {
	try {
		const j = JSON.parse(raw);
		const errs = j.result?.errors ?? j.errors ?? [];
		return errs.map((e) => ({
			line: e.start?.line,
			col: e.start?.column,
			message: e.message,
		}));
	} catch (e) {
		return [{ line: 0, col: 0, message: `[parse fail: ${e.message}] ${raw.slice(0, 200)}` }];
	}
}

const [localRaw, tvRaw] = await Promise.all([run([file]), run(["--tv", file])]);
const local = pickErrors(localRaw);
const tv = pickErrors(tvRaw);

console.log(`=== local (${local.length} errors) ===`);
for (const e of local.slice(0, 30)) {
	console.log(`  ${e.line}:${e.col}  ${e.message}`);
}
if (local.length > 30) console.log(`  … +${local.length - 30} more`);

console.log(`\n=== tradingview (${tv.length} errors) ===`);
for (const e of tv.slice(0, 30)) {
	console.log(`  ${e.line}:${e.col}  ${e.message}`);
}
if (tv.length > 30) console.log(`  … +${tv.length - 30} more`);

// Diff: messages only-in-local (false positives) and only-in-tv (false negatives)
const keyOf = (e) => `${e.line}:${e.col}:${e.message}`;
const localKeys = new Set(local.map(keyOf));
const tvKeys = new Set(tv.map(keyOf));
const onlyLocal = local.filter((e) => !tvKeys.has(keyOf(e)));
const onlyTv = tv.filter((e) => !localKeys.has(keyOf(e)));

console.log(`\n=== only-in-local (false positives, ${onlyLocal.length}) ===`);
const localByMsg = new Map();
for (const e of onlyLocal) localByMsg.set(e.message, (localByMsg.get(e.message) ?? 0) + 1);
for (const [m, c] of [...localByMsg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
	console.log(`  ${String(c).padStart(4)}  ${m}`);
}

console.log(`\n=== only-in-tv (false negatives, ${onlyTv.length}) ===`);
const tvByMsg = new Map();
for (const e of onlyTv) tvByMsg.set(e.message, (tvByMsg.get(e.message) ?? 0) + 1);
for (const [m, c] of [...tvByMsg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
	console.log(`  ${String(c).padStart(4)}  ${m}`);
}
