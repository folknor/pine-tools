#!/usr/bin/env node
// Reads lint-reports/real-failures.json, normalizes each error message into a
// template (variable parts → "*"), groups every local-only / tv-only
// negative by that template, and writes a comprehensive index so each TODO
// category can be cross-referenced to every fixture:line that hits it.

import { readFile, writeFile } from "node:fs/promises";

const report = JSON.parse(await readFile("lint-reports/real-failures.json", "utf8"));

// Strip trailing/embedded line numbers so messages with identical structure
// collapse to one category instead of fragmenting per occurrence.
function stripLineRefs(msg) {
	return msg
		.replace(/\s+[Aa]t line \d+/g, "")
		.replace(/\s+at line \d+(?=[^\d])/g, "");
}

// Each rule: regex → template string. First match wins. Use specific patterns
// first; the fallback returns the message unchanged so nothing is lost.
const RULES = [
	[/^Undefined variable '[^']+'\. Did you mean '[^']+'\?$/, "Undefined variable '*'. Did you mean '*'?"],
	[/^Undefined variable '[^']+'$/, "Undefined variable '*'"],
	[/^Unexpected token: \n$/, "Unexpected token: \\n"],
	[/^Unexpected token: .+$/s, (m) => `Unexpected token: ${m.replace(/^Unexpected token: /, "").slice(0, 20)}`],
	[/^Expected "[^"]+" after .+ at line \d+$/, "Expected '*' after * at line *"],
	[/^Type mismatch for argument \d+: expected .+, got .+$/, "Type mismatch for argument *: expected *, got *"],
	[/^Type mismatch for parameter '[^']+': expected .+, got .+$/, "Type mismatch for parameter '*': expected *, got *"],
	[/^Type mismatch: cannot apply '.+' to .+ and .+$/, "Type mismatch: cannot apply '*' to * and *"],
	[/^Type mismatch: '[^']+' operator requires bool, got .+$/, (m) => {
		const op = m.match(/'([^']+)'/)[1];
		return `Type mismatch: '${op}' operator requires bool, got *`;
	}],
	[/^Operator '(and|or)' requires bool operands, but (left|right) operand is .+$/, (m) => {
		const [, op, side] = m.match(/Operator '(and|or)' requires bool operands, but (left|right) operand is /);
		return `Operator '${op}' requires bool operands, but ${side} operand is *`;
	}],
	[/^Ternary condition must be bool, got .+$/, "Ternary condition must be bool, got *"],
	[/^Condition must be boolean, got .+$/, "Condition must be boolean, got *"],
	[/^Cannot assign array<[A-Za-z_][\w]*> to array<[A-Za-z_][\w]*>$/, "Cannot assign array<X> to array<x> (type-name case mismatch)"],
	[/^Cannot assign .+ to .+$/, "Cannot assign * to *"],
	[/^Unknown property '[^']+' on namespace '[^']+'$/, (m) => {
		const ns = m.match(/namespace '([^']+)'/)[1];
		return `Unknown property '*' on namespace '${ns}'`;
	}],
	[/^Function '[^']+' cannot be called from a local scope\. It must be called from the global scope\.$/, "Function '*' cannot be called from a local scope"],
	[/^Too many arguments for '[^']+'\. Expected \d+, got \d+$/, (m) => {
		const fn = m.match(/'([^']+)'/)[1];
		return `Too many arguments for '${fn}'`;
	}],
	[/^Expected variable name$/, "Expected variable name"],
	[/^Expected iterator variable$/, "Expected iterator variable"],
	[/^Expected type name$/, "Expected type name"],
	[/^Expected function name after 'export'$/, "Expected function name after 'export'"],
	[/^Expected method name after 'method'$/, "Expected method name after 'method'"],
	[/^Expected "\]"$/, "Expected ']'"],
	[/^Unexpected identifier '[^']+' - did you mean '[^']+'\?$/, "Unexpected identifier '*' - did you mean '*'?"],
	[/^Missing comma before '[^']+' argument$/, "Missing comma before '*' argument"],
	[/^Ternary branches must have compatible types\. Got '[^']+' and '[^']+'$/, "Ternary branches must have compatible types. Got '*' and '*'"],
];

function normalize(msg) {
	const stripped = stripLineRefs(msg);
	for (const [re, rep] of RULES) {
		if (re.test(stripped)) return typeof rep === "function" ? rep(stripped) : rep;
	}
	return stripped;
}

function group(errors) {
	const buckets = new Map();
	for (const e of errors) {
		const key = normalize(e.message);
		if (!buckets.has(key)) buckets.set(key, []);
		buckets.get(key).push(e);
	}
	return buckets;
}

const localOnly = [];
const tvOnly = [];
for (const f of report.files) {
	for (const e of f.localOnly) localOnly.push({ ...e, file: f.file });
	for (const e of f.tvOnly) tvOnly.push({ ...e, file: f.file });
}

const localOnlyBuckets = group(localOnly);
const tvOnlyBuckets = group(tvOnly);

function bucketsToOutput(buckets) {
	return [...buckets.entries()]
		.sort((a, b) => b[1].length - a[1].length)
		.map(([template, items]) => ({
			template,
			count: items.length,
			distinctFiles: new Set(items.map((i) => i.file)).size,
			occurrences: items.map((i) => ({
				file: i.file.replace(/^.*\/fixtures\//, "fixtures/"),
				line: i.line,
				col: i.col,
				message: i.message,
			})),
		}));
}

const output = {
	generatedFrom: "lint-reports/real-failures.json",
	scanned: report.summary.scanned,
	totals: {
		localOnly: localOnly.length,
		tvOnly: tvOnly.length,
		localOnlyCategories: localOnlyBuckets.size,
		tvOnlyCategories: tvOnlyBuckets.size,
	},
	localOnly: bucketsToOutput(localOnlyBuckets),
	tvOnly: bucketsToOutput(tvOnlyBuckets),
};

await writeFile("lint-reports/failures-by-category.json", JSON.stringify(output, null, 2));

console.log(`scanned ${output.scanned} v6 files`);
console.log(`local-only: ${output.totals.localOnly} hits in ${output.totals.localOnlyCategories} categories  (we flag, TV silent — investigate)`);
console.log(`tv-only:    ${output.totals.tvOnly} hits in ${output.totals.tvOnlyCategories} categories  (TV flags, we silent — investigate)`);
console.log(`\nlocal-only categories (all ${output.totals.localOnlyCategories}):`);
for (const c of output.localOnly) {
	console.log(`  ${String(c.count).padStart(5)}  in ${String(c.distinctFiles).padStart(3)} files  |  ${c.template}`);
}
console.log(`\ntv-only categories (all ${output.totals.tvOnlyCategories}):`);
for (const c of output.tvOnly) {
	console.log(`  ${String(c.count).padStart(5)}  in ${String(c.distinctFiles).padStart(3)} files  |  ${c.template}`);
}
console.log(`\nwrote lint-reports/failures-by-category.json`);
