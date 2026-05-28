#!/usr/bin/env node
// INV013: diff TV's live reference catalog (from probe) against what we ship.
// Pure node, no network. Reads lint-reports/tv-probe.json + pine-data/v6/*.json.
//
// Usage: node scripts/diff-tv-inventory.mjs

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(fs.readFileSync(path.join(REPO, p), "utf8"));

const probe = read("lint-reports/tv-probe.json");
const names = (file) => new Set(read(file).map((x) => x.name));

// Our shipped names.
const ours = {
	var: names("pine-data/v6/variables.json"),
	const: names("pine-data/v6/constants.json"),
	fun: names("pine-data/v6/functions.json"),
};

// TV catalog names by category. Function TOC text may carry "()" — strip it.
const tv = { var: new Set(), const: new Set(), fun: new Set() };
for (const item of probe.catalog) {
	if (!(item.category in tv)) continue;
	const n = item.text.replace(/\(\)$/, "").trim();
	tv[item.category].add(n);
}

const diff = {};
for (const cat of ["var", "const", "fun"]) {
	const missing = [...tv[cat]].filter((n) => !ours[cat].has(n)).sort();
	const extra = [...ours[cat]].filter((n) => !tv[cat].has(n)).sort();
	diff[cat] = {
		tvCount: tv[cat].size,
		oursCount: ours[cat].size,
		missingCount: missing.length,
		extraCount: extra.length,
		missing,
		extra,
	};
}

const OUT = path.join(REPO, "lint-reports", "tv-inventory-diff.json");
fs.writeFileSync(OUT, JSON.stringify(diff, null, 2));

for (const cat of ["var", "const", "fun"]) {
	const d = diff[cat];
	console.log(
		`\n=== ${cat}: TV ${d.tvCount} / ours ${d.oursCount} — missing ${d.missingCount}, extra ${d.extraCount} ===`,
	);
	console.log("MISSING (in TV, not us):");
	console.log("  " + (d.missing.join(", ") || "(none)"));
}
console.log(`\nFull diff (incl. 'extra') written to ${OUT}`);
