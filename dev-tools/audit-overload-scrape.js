#!/usr/bin/env node --experimental-strip-types
// Audit the offline overload-param union (see packages/pipeline/src/union-types.ts).
// Reads the per-overload `overloadArgs` dump from the raw scrape and reports, per
// multi-overload function: which params unioned to a concrete/union type, and
// which collapsed to "unknown" because their overloads reveal a broad/universal
// or heterogeneous type (e.g. na.x). The "unknown" list is the direct answer to
// "which functions accept this kind of varied input?".
// Usage: node --experimental-strip-types dev-tools/audit-overload-scrape.js [--verbose]

import { readFileSync } from "node:fs";
import { unionOverloadParams } from "../packages/pipeline/src/union-types.ts";

const verbose = process.argv.includes("--verbose");
const data = JSON.parse(
	readFileSync(
		new URL("../pine-data/raw/v6/complete-v6-details.json", import.meta.url),
	),
);

const fns = data.functions;
const names = Object.keys(fns);
const overloaded = names.filter((n) => (fns[n].overloads?.length ?? 0) > 1);

const universal = []; // present-in-all params that unioned to "unknown"
const unioned = []; // present-in-all params with a concrete union type
let withDump = 0;

for (const n of overloaded) {
	const f = fns[n];
	if (!f.overloadArgs) continue;
	withDump++;
	const map = unionOverloadParams(f);
	for (const [param, type] of map) {
		const rec = `${n}.${param} = ${type}`;
		if (type === "unknown") universal.push(`${n}.${param}`);
		else unioned.push(rec);
	}
}

console.log(`Total functions:            ${names.length}`);
console.log(`Multi-overload functions:   ${overloaded.length}`);
console.log(`  ...with overloadArgs dump: ${withDump}`);
console.log(`Params unioned to a type:   ${unioned.length}`);
console.log(`Params → "unknown" (varied/universal input): ${universal.length}`);
console.log("");
console.log('=== Universal params (accept varied input → "unknown") ===');
for (const u of universal) console.log(`  ${u}`);

if (verbose) {
	console.log("");
	console.log("=== Concrete unions ===");
	for (const u of unioned) console.log(`  ${u}`);
}
