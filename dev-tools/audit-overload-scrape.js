#!/usr/bin/env node
// Audit: which multi-overload functions have their parameter types frozen to a
// single overload (overload #0)? The scraper only visits the bare #fun_<name>
// anchor, so for every overloaded function parameters[].type reflects overload
// #0's resolved types, not the union across overloads. This counts the blast
// radius and shows, per function, the overload return-type spread vs the frozen
// param types so we can eyeball how wrong each is.
// Usage: node dev-tools/audit-overload-scrape.js [--verbose]

import { readFileSync } from "node:fs";

const verbose = process.argv.includes("--verbose");
const data = JSON.parse(
	readFileSync(
		new URL(
			"../pine-data/raw/v6/complete-v6-details.json",
			import.meta.url,
		),
	),
);

const fns = data.functions;
const names = Object.keys(fns);

const overloaded = names.filter((n) => (fns[n].overloads?.length ?? 0) > 1);

// A function is "suspect" when its overloads disagree on the qualifier/type of
// the return (→ ...), which is a strong signal the per-param types also vary
// across overloads but got frozen to overload #0.
const report = overloaded.map((n) => {
	const f = fns[n];
	const returns = f.overloads.map((o) => o.match(/→\s*(.+)$/)?.[1]?.trim());
	const distinctReturns = [...new Set(returns)];
	return {
		name: n,
		overloadCount: f.overloads.length,
		distinctReturnCount: distinctReturns.length,
		distinctReturns,
		frozenParams: f.parameters.map((p) => `${p.name}: ${p.type}`),
	};
});

// Sort by how many distinct return types — more spread = more likely mis-frozen.
report.sort((a, b) => b.distinctReturnCount - a.distinctReturnCount);

console.log(`Total functions:            ${names.length}`);
console.log(`Multi-overload functions:   ${overloaded.length}`);
console.log(
	`  ...with >1 distinct return: ${report.filter((r) => r.distinctReturnCount > 1).length}`,
);
console.log("");
console.log("Top mis-freeze suspects (most distinct return types):");
for (const r of report.slice(0, verbose ? report.length : 20)) {
	console.log(
		`  ${r.name}  (${r.overloadCount} overloads, ${r.distinctReturnCount} distinct returns)`,
	);
	console.log(`      returns: ${r.distinctReturns.join("  |  ")}`);
	console.log(`      frozen params: ${r.frozenParams.join(", ") || "(none)"}`);
}
