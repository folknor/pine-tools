#!/usr/bin/env node
/**
 * Triage helper for lint-reports/regression-report.json: groups appeared /
 * disappeared error messages into normalized categories with counts and a
 * couple of example sites, so a corpus-wide diff (e.g. plan/31's parser
 * fix) can be reviewed per category instead of per record.
 *
 * Usage:
 *   node scripts/triage-regression.mjs               # category summary
 *   node scripts/triage-regression.mjs --examples N  # N example sites per category (default 2)
 *   node scripts/triage-regression.mjs --category "<normalized message>"  # list every site
 */

import { readFileSync } from "node:fs";

const REPORT = new URL("../lint-reports/regression-report.json", import.meta.url);

const argv = process.argv.slice(2);
let exampleCount = 2;
let onlyCategory = null;
for (let i = 0; i < argv.length; i++) {
	if (argv[i] === "--examples") exampleCount = parseInt(argv[++i], 10);
	else if (argv[i] === "--category") onlyCategory = argv[++i];
}

const report = JSON.parse(readFileSync(REPORT, "utf-8"));

/** Collapse identifiers/literals so messages group into categories. */
function normalize(message) {
	return message
		.replace(/'[^']*'/g, "'_'")
		.replace(/"[^"]*"/g, '"_"')
		.replace(/\b\d+\b/g, "N");
}

function collect(kind) {
	const groups = new Map();
	for (const fc of report.filesChanged) {
		for (const rec of fc[kind] ?? []) {
			const key = normalize(rec.message);
			if (!groups.has(key)) groups.set(key, []);
			groups.get(key).push({ file: fc.file, line: rec.line, col: rec.col, message: rec.message });
		}
	}
	return [...groups.entries()].sort((a, b) => b[1].length - a[1].length);
}

for (const kind of ["appeared", "disappeared"]) {
	const groups = collect(kind);
	if (onlyCategory) {
		const hit = groups.find(([key]) => key === onlyCategory);
		if (hit) {
			console.log(`=== ${kind}: ${onlyCategory} (${hit[1].length}) ===`);
			for (const site of hit[1]) {
				console.log(`  ${site.file}:${site.line}:${site.col}  ${site.message}`);
			}
		}
		continue;
	}

	const total = groups.reduce((n, [, sites]) => n + sites.length, 0);
	console.log(`\n=== ${kind} (${total} records, ${groups.length} categories) ===`);
	for (const [key, sites] of groups) {
		console.log(`\n[${sites.length}] ${key}`);
		for (const site of sites.slice(0, exampleCount)) {
			console.log(`    ${site.file}:${site.line}:${site.col}`);
		}
	}
}
