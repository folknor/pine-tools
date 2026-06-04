#!/usr/bin/env node
// Characterize the wrapped-line warning-position artifacts (TODO #38).
//
// Reads lint-reports/real-failures.json and, for every file, pairs
// warning records that appear BOTH local-only and tv-only with the same
// message - the signature of a position-keyed split where both linters
// actually agree. For each pair it prints local vs TV (line, col)
// alongside the physical line lengths from the fixture, to establish
// exactly how TV's logical-line columns map onto physical positions.
//
// Exploratory tool for the #38 fix; not part of the report pipeline.
//
// Usage: node scripts/analyze-warning-artifacts.mjs [--limit N]

import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
let limit = 20;
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--limit") limit = Number(args[++i]);
}

const report = JSON.parse(
	await readFile(resolve("lint-reports/real-failures.json"), "utf8"),
);

let pairsShown = 0;
let filesWithPairs = 0;
let totalPairable = 0;
let unpairedTvOnly = 0;
const unpairedMessages = new Map();

for (const f of report.files ?? []) {
	const w = f.warnings;
	if (!w || (!w.localOnly.length && !w.tvOnly.length)) continue;

	// Pair by identical message within the same file. Local templates quote
	// symbols with ' while TV uses " - normalize before comparing.
	const norm = (m) => m.replace(/"/g, "'");
	const localByMsg = new Map();
	for (const e of w.localOnly) {
		const k = norm(e.message);
		if (!localByMsg.has(k)) localByMsg.set(k, []);
		localByMsg.get(k).push(e);
	}

	const pairs = [];
	const leftoverTv = [];
	for (const t of w.tvOnly) {
		const candidates = localByMsg.get(norm(t.message));
		if (candidates && candidates.length) {
			pairs.push({ local: candidates.shift(), tv: t });
		} else {
			leftoverTv.push(t);
		}
	}
	for (const t of leftoverTv) {
		unpairedTvOnly++;
		const m = t.message.slice(0, 90);
		unpairedMessages.set(m, (unpairedMessages.get(m) ?? 0) + 1);
	}
	if (!pairs.length) continue;
	filesWithPairs++;
	totalPairable += pairs.length;

	if (pairsShown >= limit) continue;
	const src = await readFile(f.file, "utf8");
	const lines = src.split("\n");
	console.log(`\n=== ${f.file} ===`);
	for (const p of pairs) {
		if (pairsShown++ >= limit) break;
		console.log(`  msg: ${p.tv.message.slice(0, 100)}`);
		console.log(`  local ${p.local.line}:${p.local.col}   tv ${p.tv.line}:${p.tv.col}`);
		for (const [tag, pos] of [["local", p.local], ["tv", p.tv]]) {
			const physical = lines[pos.line - 1] ?? "<out of range>";
			console.log(
				`    ${tag} line ${pos.line} len=${physical.length}${pos.col > physical.length ? "  COL PAST EOL" : ""}: ${physical.trimEnd().slice(0, 80)}`,
			);
		}
	}
}

console.log(`\n=== totals ===`);
console.log(`files with same-message local/tv pairs: ${filesWithPairs}`);
console.log(`pairable warning records:               ${totalPairable}`);
console.log(`tv-only with NO same-message local:     ${unpairedTvOnly}`);
console.log(`\nunpaired tv-only by message:`);
for (const [m, c] of [...unpairedMessages.entries()].sort((a, b) => b[1] - a[1])) {
	console.log(`  ${String(c).padStart(4)}  ${m}`);
}
