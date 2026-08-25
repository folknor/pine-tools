#!/usr/bin/env node
/**
 * INV168 - does UNUSED_VARIABLE ever fire on a BUILT-IN?
 *
 * AGENTS.md records a known limitation: "The core validator
 * (UnifiedPineValidator) incorrectly reports built-in variables/keywords as
 * 'declared but never used'". The claim has never been reproduced in an
 * investigation - it is inherited prose. This sweep answers it empirically:
 * run the SemanticAnalyzer (which owns UNUSED_VARIABLE) over every corpus
 * fixture and every test fixture, and report each warned name that is a
 * built-in variable, function, constant, namespace, or reserved keyword.
 *
 * Offline. Needs a prior `pnpm run build:tsc`.
 *
 *   node investigations/INV168-unused-variable-builtins/sweep.mjs [--all]
 *
 * --all also prints the top warned names overall (context for the noise
 * level of the rule), not just the built-in hits.
 */

import { readdirSync, readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const showAll = process.argv.includes("--all");
// Temporary measurement switch for the isCommonlyUsedVariable whitelist.
if (process.argv.includes("--no-whitelist")) process.env.INV168_NO_WHITELIST = "1";

const DIST = resolve("dist/packages/core/src");
for (const f of ["parser/parser.js", "parser/semanticAnalyzer.js"]) {
	if (!existsSync(join(DIST, f))) {
		console.error(`No compiled ${f} under ${DIST}. Run \`pnpm run build:tsc\` first.`);
		process.exit(2);
	}
}
const { Parser } = await import(`file://${join(DIST, "parser/parser.js")}`);
const { SemanticAnalyzer } = await import(
	`file://${join(DIST, "parser/semanticAnalyzer.js")}`
);

// --- the built-in name set -------------------------------------------------

const catalog = (name) =>
	JSON.parse(readFileSync(resolve(`pine-data/v6/${name}.json`), "utf8"));

const builtins = new Map(); // name -> kind
const add = (name, kind) => {
	// Only BARE names can collide with a user declaration; a dotted catalog
	// entry is reachable only through its namespace.
	const bare = name.replace(/<.*>$/, "");
	if (bare.includes(".")) {
		builtins.set(bare.split(".")[0], "namespace");
		return;
	}
	if (!builtins.has(bare)) builtins.set(bare, kind);
};

for (const v of catalog("variables")) add(v.name, "variable");
for (const f of catalog("functions")) add(f.name, "function");
for (const c of catalog("constants")) add(c.name, "constant");
for (const k of catalog("keywords")) add(k.name, "keyword");
for (const t of catalog("types")) add(t.name, "type");
for (const a of catalog("annotations")) add(a.name, "annotation");

// --- fixtures --------------------------------------------------------------

function pineFiles(dir) {
	const out = [];
	if (!existsSync(dir)) return out;
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const p = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...pineFiles(p));
		else if (entry.name.endsWith(".pine")) out.push(p);
	}
	return out;
}

const files = [
	...pineFiles(resolve("fixtures")),
	...pineFiles(resolve("packages/core/test/fixtures")),
	...pineFiles(resolve("vendor")),
];

// --- sweep -----------------------------------------------------------------

const hits = []; // built-in names warned as unused
const nameCounts = new Map();
const byCode = new Map(); // every SemanticAnalyzer warning, by CW code / rule
// --dump <path> writes every non-UNUSED_VARIABLE warning as one sorted line, so
// two builds can be diffed to isolate an analysis-channel delta.
const dumpFlag = process.argv.indexOf("--dump");
const dumpPath = dumpFlag === -1 ? null : process.argv[dumpFlag + 1];
const dump = [];
let analyzed = 0;
let failed = 0;

for (const file of files) {
	let source = readFileSync(file, "utf8");
	// Test fixtures carry leading `// @...` directive lines; they are comments
	// to the parser, so they need no stripping - positions are all we would
	// lose, and this sweep reports names, not positions.
	let warnings;
	try {
		const ast = new Parser(source).parse();
		warnings = new SemanticAnalyzer().analyze(ast);
	} catch {
		failed++;
		continue;
	}
	analyzed++;
	for (const w of warnings) {
		const key = w.code ?? w.rule ?? "(none)";
		byCode.set(key, (byCode.get(key) ?? 0) + 1);
		if (dumpPath && key !== "UNUSED_VARIABLE") {
			dump.push(`${file}\t${w.line}:${w.column}\t${key}\t${w.message}`);
		}
		if (w.rule !== "UNUSED_VARIABLE" && w.code !== "UNUSED_VARIABLE") continue;
		const m = /^Variable '(.+)' is declared but never used$/.exec(w.message);
		if (!m) continue;
		const name = m[1];
		nameCounts.set(name, (nameCounts.get(name) ?? 0) + 1);
		if (builtins.has(name)) {
			hits.push({ file, name, kind: builtins.get(name), line: w.line });
		}
	}
}

// --- report ----------------------------------------------------------------

console.log(`files analyzed: ${analyzed} (parser threw on ${failed})`);
console.log(`built-in names in the catalog set: ${builtins.size}`);
console.log(
	`UNUSED_VARIABLE warnings: ${[...nameCounts.values()].reduce((a, b) => a + b, 0)} over ${nameCounts.size} distinct names`,
);
if (dumpPath) {
	writeFileSync(dumpPath, `${dump.sort().join("\n")}\n`);
	console.log(`\ndumped ${dump.length} non-UNUSED_VARIABLE warnings to ${dumpPath}`);
}

console.log("\nall SemanticAnalyzer warnings by code/rule:");
for (const [code, n] of [...byCode.entries()].sort((a, b) => b[1] - a[1])) {
	console.log(`  ${String(n).padStart(6)}  ${code}`);
}

console.log(`\nBUILT-IN HITS: ${hits.length}`);
for (const h of hits.slice(0, 50)) {
	console.log(`  ${h.name} (${h.kind})  ${h.file}:${h.line}`);
}
if (hits.length > 50) console.log(`  ... and ${hits.length - 50} more`);

if (showAll) {
	console.log("\ntop warned names:");
	const top = [...nameCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 30);
	for (const [name, n] of top) console.log(`  ${String(n).padStart(5)}  ${name}`);
}
