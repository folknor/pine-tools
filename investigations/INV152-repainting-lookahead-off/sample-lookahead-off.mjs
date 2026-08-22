// Which `request.security()` calls does the explicit-`lookahead_off` exemption
// actually suppress, and are they lower-timeframe requests (where the exemption
// was justified) or higher-timeframe ones (where it hides a real repaint)?
//
// Prints one line per suppressed call with its timeframe argument as written,
// then a tally by timeframe text. Needs a prior `pnpm run build:tsc`.
//
// Usage: node investigations/INV152-repainting-lookahead-off/sample-lookahead-off.mjs

import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = resolve(import.meta.dirname, "../..");
const FIXTURES = join(ROOT, "fixtures");
const DIST = join(ROOT, "dist/packages/core/src");

const { Parser } = await import(
	pathToFileURL(join(DIST, "parser/parser.js")).href
);

function calleeName(callee) {
	if (callee.type === "Identifier") return callee.name;
	if (callee.type === "MemberExpression") {
		const object = calleeName(callee.object);
		return object ? `${object}.${callee.property.name}` : "";
	}
	return "";
}

// Every CallExpression in the tree, found by brute-force structural recursion -
// this is a throwaway probe, so it does not need the linter's typed walkers.
function allCalls(node, out = []) {
	if (!node || typeof node !== "object") return out;
	if (Array.isArray(node)) {
		for (const item of node) allCalls(item, out);
		return out;
	}
	if (node.type === "CallExpression") out.push(node);
	for (const key of Object.keys(node)) {
		if (key === "type") continue;
		allCalls(node[key], out);
	}
	return out;
}

function argumentAt(call, name, index) {
	for (const arg of call.arguments) if (arg.name === name) return arg.value;
	return call.arguments.filter((a) => a.name === undefined)[index]?.value;
}

function text(expr) {
	if (!expr) return "<omitted>";
	if (expr.type === "Literal") return String(expr.value);
	if (expr.type === "Identifier") return expr.name;
	if (expr.type === "MemberExpression")
		return `${text(expr.object)}.${expr.property.name}`;
	return `<${expr.type}>`;
}

const byTimeframe = new Map();
let total = 0;

for (const file of readdirSync(FIXTURES).filter((f) => f.endsWith(".pine"))) {
	const parser = new Parser(readFileSync(join(FIXTURES, file), "utf-8"));
	let ast;
	try {
		ast = parser.parse();
	} catch {
		continue;
	}
	if ((parser.getDetectedVersion() || "1") !== "6") continue;
	if (parser.getLexerErrors().length || parser.getParserErrors().length) continue;

	for (const call of allCalls(ast.body)) {
		if (calleeName(call.callee) !== "request.security") continue;
		const lookahead = argumentAt(call, "lookahead", 4);
		if (!lookahead || text(lookahead) !== "barmerge.lookahead_off") continue;
		const tf = text(argumentAt(call, "timeframe", 1));
		total++;
		byTimeframe.set(tf, (byTimeframe.get(tf) || 0) + 1);
		console.log(`${file}:${call.callee.line}  timeframe=${tf}`);
	}
}

console.log(`\n${total} calls pass an explicit barmerge.lookahead_off\n`);
for (const [tf, n] of [...byTimeframe].sort((a, b) => b[1] - a[1]))
	console.log(`${String(n).padStart(4)}  ${tf}`);
