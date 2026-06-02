// Offline enumeration of every reference parameter typed `const ...`.
//
// This is step 1 of the const-arg-enforcement work (INV014): the reference's
// `const` qualifier is a LOWER BOUND on what TV accepts (see gotchas/G002 -
// plot(title) is documented `const string` but TV accepts non-const), so we
// can't trust it blindly. This script lists the candidate set so we know the
// scale before probing TV (`pine-lint --tv`) to learn which params actually
// ENFORCE const at compile time.
//
// Usage: node scripts/audit-const-params.mjs [--json]
// Reads pine-data/v6/functions.json; no network, no build.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataPath = path.join(here, "..", "pine-data", "v6", "functions.json");
const functions = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

const CONST_RE = /^const\b/;

// A param's base type(s), stripped of the leading `const ` qualifier. Handles
// unions ("const int/float") and the generic-input blob
// ("const int/float/bool/string/color or source-type built-ins").
function baseOf(type) {
	return type.replace(CONST_RE, "").trim();
}

const rows = [];
for (const fn of functions) {
	const overloaded = (fn.parameters ?? []).some((p) => p.type === "unknown");
	for (const p of fn.parameters ?? []) {
		if (typeof p.type === "string" && CONST_RE.test(p.type)) {
			rows.push({
				fn: fn.name,
				param: p.name,
				type: p.type,
				base: baseOf(p.type),
				required: p.required === true,
				overloaded,
			});
		}
	}
}

if (process.argv.includes("--json")) {
	process.stdout.write(`${JSON.stringify(rows, null, 2)}\n`);
} else {
	const byBase = new Map();
	for (const r of rows) byBase.set(r.base, (byBase.get(r.base) ?? 0) + 1);

	console.log(`Total const-typed params: ${rows.length}`);
	console.log(
		`Across functions: ${new Set(rows.map((r) => r.fn)).size}`,
	);
	console.log(
		`On overloaded fns (merged param may be ambiguous): ${rows.filter((r) => r.overloaded).length}`,
	);
	console.log("\nBy base type:");
	for (const [base, n] of [...byBase.entries()].sort((a, b) => b[1] - a[1])) {
		console.log(`  ${String(n).padStart(4)}  ${base}`);
	}
	console.log("\nAll (fn :: param :: type):");
	for (const r of rows.sort((a, b) => a.fn.localeCompare(b.fn))) {
		const tag = r.overloaded ? " [overloaded]" : "";
		console.log(`  ${r.fn} :: ${r.param} :: ${r.type}${tag}`);
	}
}
