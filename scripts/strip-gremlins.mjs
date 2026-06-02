// Replace typographic "gremlins" (em-dash, en-dash) with plain ASCII in
// hand-authored docs and source comments. The gremlins rule (CLAUDE.md) bans
// them; this sweeps the ones that accumulated.
//
// Scope is an explicit allowlist of hand-authored roots. GENERATED / VENDORED
// trees are excluded on purpose (pine-data, pine-manual, dist, node_modules,
// .cache): em-dashes there are TradingView's own scraped text, not ours, and
// those files are regenerated anyway.
//
// Replacements: em-dash (U+2014) -> " - " (collapsing surrounding spaces/tabs,
// never newlines); en-dash (U+2013) -> "-" (it's almost always a range).
//
// Usage:
//   node scripts/strip-gremlins.mjs           # dry run: report only
//   node scripts/strip-gremlins.mjs --write    # apply

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const WRITE = process.argv.includes("--write");

const ROOTS = [
	"CLAUDE.md",
	"TODO.md",
	"README.md",
	"CHANGELOG.md",
	"LLM.md",
	"gotchas",
	"investigations",
	"scripts",
	"dev-tools",
	"packages",
];
const EXT = new Set([".md", ".ts", ".mjs", ".js"]);
const SKIP = ["node_modules", "dist", ".cache", "pine-data", "pine-manual", ".git"];

function walk(rel, out) {
	const abs = path.join(root, rel);
	if (SKIP.some((s) => rel.split(path.sep).includes(s))) return;
	let st;
	try {
		st = fs.statSync(abs);
	} catch {
		return;
	}
	if (st.isDirectory()) {
		for (const e of fs.readdirSync(abs)) walk(path.join(rel, e), out);
	} else if (EXT.has(path.extname(rel))) {
		out.push(rel);
	}
}

const files = [];
for (const r of ROOTS) walk(r, files);

const EM = /[ \t]*—[ \t]*/g;
const EN = /–/g;

let totalFiles = 0;
let totalSubs = 0;
for (const rel of files) {
	const abs = path.join(root, rel);
	const src = fs.readFileSync(abs, "utf-8");
	const em = (src.match(/—/g) || []).length;
	const en = (src.match(EN) || []).length;
	if (em + en === 0) continue;
	// This script itself uses em/en-dashes FUNCTIONALLY (its detection regexes),
	// so never rewrite it.
	if (rel === path.join("scripts", "strip-gremlins.mjs")) continue;
	// Em-dashes are always prose here (comments, console-output strings) -> replace
	// everywhere. En-dashes appear ONLY in functional code (a range-regex char
	// class `[-–]` in parse-constraints.ts); no .md has one, so only replace
	// en-dashes in markdown, never in code.
	const isMd = path.extname(rel) === ".md";
	const fixed = isMd
		? src.replace(EM, " - ").replace(EN, "-")
		: src.replace(EM, " - ");
	const remaining =
		(fixed.match(/—/g) || []).length + (isMd ? (fixed.match(EN) || []).length : 0);
	const applied = (isMd ? em + en : em) - remaining;
	if (applied === 0) continue;
	totalFiles++;
	totalSubs += applied;
	const skipped = remaining > 0 ? ` (${remaining} left in code)` : "";
	console.log(`${String(applied).padStart(4)}  ${rel}${skipped}`);
	// For non-markdown (code), show the changed lines so they can be eyeballed
	// (we only ever expect comments to change, never meaningful string literals).
	if (path.extname(rel) !== ".md") {
		const a = src.split("\n");
		const b = fixed.split("\n");
		for (let i = 0; i < a.length; i++) {
			if (a[i] !== b[i]) console.log(`        L${i + 1}: ${b[i].trim()}`);
		}
	}
	if (WRITE) fs.writeFileSync(abs, fixed);
}

console.log(
	`\n${WRITE ? "Rewrote" : "Would rewrite"} ${totalFiles} files, ${totalSubs} substitutions.`,
);
