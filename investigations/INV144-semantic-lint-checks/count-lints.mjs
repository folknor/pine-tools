// Corpus sweep for the INV144 semantic lints: how often does each rule fire,
// and on which files? A semantic lint that fires on a large fraction of real
// scripts is almost certainly wrong, so this is the false-positive smoke test.
//
// Usage: node investigations/INV144-semantic-lint-checks/count-lints.mjs [limit]
// Needs a prior `pnpm run build` (reads the compiled dist/).

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "../..");
const FIXTURES = join(ROOT, "fixtures");
const DIST = join(ROOT, "dist/packages/core/src");

const { Parser } = await import(
	pathToFileURL(join(DIST, "parser/parser.js")).href
);
const { runSemanticLints } = await import(
	pathToFileURL(join(DIST, "analyzer/lint-semantic.js")).href
);

const limit = Number(process.argv[2]) || Infinity;
const files = readdirSync(FIXTURES)
	.filter((f) => f.endsWith(".pine"))
	.slice(0, limit);

const byRule = new Map();
let scanned = 0;
let v6 = 0;

for (const file of files) {
	scanned++;
	const source = readFileSync(join(FIXTURES, file), "utf-8");
	let ast;
	const parser = new Parser(source);
	try {
		ast = parser.parse();
	} catch {
		continue;
	}
	if ((parser.getDetectedVersion() || "1") !== "6") continue;
	if (parser.getLexerErrors().length || parser.getParserErrors().length) continue;
	v6++;

	let lints;
	try {
		lints = runSemanticLints(ast);
	} catch (e) {
		console.error(`THREW on ${file}: ${e.message}`);
		continue;
	}
	for (const lint of lints) {
		if (!byRule.has(lint.rule)) byRule.set(lint.rule, []);
		byRule.get(lint.rule).push(`${file}:${lint.line}:${lint.column}`);
	}
}

console.log(`scanned ${scanned} fixtures, ${v6} parsed clean as v6\n`);
for (const [rule, hits] of [...byRule].sort((a, b) => b[1].length - a[1].length)) {
	const pct = ((hits.length / v6) * 100).toFixed(1);
	console.log(`${rule.padEnd(24)} ${String(hits.length).padStart(5)}  (${pct}% of files, at most)`);
	const shown = Number(process.argv[3]) || 5;
	for (const hit of hits.slice(0, shown)) console.log(`    ${hit}`);
	if (hits.length > shown)
		console.log(`    ... ${hits.length - shown} more`);
}
