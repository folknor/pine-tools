#!/usr/bin/env node
// Error-reachability audit - the check-site half of the #48 free slice
// (fixture-coverage.mjs covers the catalog/shape half, #52). Enumerates
// every addError/addWarning CALL SITE in the validator and fires the
// whole fixture inventory through it in-process, capturing the call-site
// stack frame of every emitted diagnostic. A site that never fires
// anywhere is either dead code or a check no fixture exercises - the
// INV050 failure mode (live-in-appearance, dead-in-practice). A site
// fired only by investigation probes has no regression fixture pinning
// it; a site fired in corpus but never in tests is untested real-world
// behavior.
//
// Scope: UnifiedPineValidator (analyzer/checker.js) + SemanticAnalyzer
// (parser/semanticAnalyzer.js) - the same two channels the CLI emits.
// Parser/lexer error recording goes through recovery paths with
// different mechanics - future work.
//
// Line numbers refer to the COMPILED dist JS (what actually runs); the
// message snippet is the greppable pointer back to the TS source.
//
// Usage: node scripts/audit-error-reachability.mjs [--json]

import { readdir, readFile } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const asJson = process.argv.includes("--json");

const CHECKER = resolve("dist/packages/core/src/analyzer/checker.js");
const SEMANTIC = resolve("dist/packages/core/src/parser/semanticAnalyzer.js");
const PARSER = resolve("dist/packages/core/src/parser/parser.js");

const { Parser } = await import(`file://${PARSER}`);
const { UnifiedPineValidator } = await import(`file://${CHECKER}`);
const { SemanticAnalyzer } = await import(`file://${SEMANTIC}`);

// --- static enumeration ------------------------------------------------------

// A call site is a line containing `this.addError(` / `this.addWarning(` /
// `this.addTemplateError(` (the structured code+ctx twin - see INV061).
// Method DEFINITIONS don't match (no `this.` prefix). The snippet is the
// first string/template literal within the next few lines - best effort,
// it exists to make the site identifiable, not to reproduce the message.
function enumerateSites(file, label) {
	const lines = readFileSync(file, "utf8").split("\n");
	const sites = [];
	for (let i = 0; i < lines.length; i++) {
		if (!/this\.(addError|addWarning|addTemplateError)\(/.test(lines[i]))
			continue;
		const window = lines.slice(i, i + 8).join(" ");
		const m =
			window.match(/[`]((?:[^`\\]|\\.){8,}?)[`]/) ??
			window.match(/["']((?:[^"'\\]|\\.){8,}?)["']/);
		sites.push({
			file: label,
			line: i + 1,
			kind: window.includes("addWarning(") ? "warning" : "error",
			snippet: (m ? m[1] : lines[i].trim()).slice(0, 100),
			fired: { corpus: 0, tests: 0, probes: 0 },
		});
	}
	return sites;
}

const sites = [
	...enumerateSites(CHECKER, "checker.js"),
	...enumerateSites(SEMANTIC, "semanticAnalyzer.js"),
];
const byKey = new Map(sites.map((s) => [`${s.file}:${s.line}`, s]));

// --- runtime instrumentation -------------------------------------------------

let currentSet = "corpus";
const unmatchedFrames = new Map(); // fired lines with no enumerated site

function callSiteIn(targetSuffix) {
	const orig = Error.prepareStackTrace;
	Error.prepareStackTrace = (_e, frames) => frames;
	const frames = new Error().stack;
	Error.prepareStackTrace = orig;
	for (const cs of frames) {
		const f = cs.getFileName?.();
		if (f && f.endsWith(targetSuffix)) {
			return cs.getLineNumber();
		}
	}
	return undefined;
}

function tally(label, line) {
	if (line === undefined) return;
	const site = byKey.get(`${label}:${line}`);
	if (site) site.fired[currentSet]++;
	else
		unmatchedFrames.set(
			`${label}:${line}`,
			(unmatchedFrames.get(`${label}:${line}`) || 0) + 1,
		);
}

for (const method of ["addError", "addWarning", "addTemplateError"]) {
	const orig = UnifiedPineValidator.prototype[method];
	if (typeof orig !== "function") continue;
	UnifiedPineValidator.prototype[method] = function (...args) {
		tally("checker.js", callSiteIn("checker.js"));
		return orig.apply(this, args);
	};
}
{
	const orig = SemanticAnalyzer.prototype.addWarning;
	if (typeof orig === "function") {
		SemanticAnalyzer.prototype.addWarning = function (...args) {
			tally("semanticAnalyzer.js", callSiteIn("semanticAnalyzer.js"));
			return orig.apply(this, args);
		};
	}
}

// --- drive the fixtures ------------------------------------------------------

async function findPine(dir) {
	const out = [];
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return out;
	}
	for (const e of entries) {
		const full = join(dir, e.name);
		if (e.isDirectory()) out.push(...(await findPine(full)));
		else if (e.isFile() && e.name.endsWith(".pine")) out.push(full);
	}
	return out;
}

const SETS = [
	["corpus", "fixtures"],
	["tests", "packages/core/test/fixtures"],
	["probes", "investigations"],
];

const stats = {};
for (const [set, dir] of SETS) {
	currentSet = set;
	const files = await findPine(resolve(dir));
	const s = { files: files.length, parseSkipped: 0, validatorCrashed: 0 };
	for (const file of files) {
		let src;
		try {
			src = await readFile(file, "utf8");
		} catch {
			s.parseSkipped++;
			continue;
		}
		let ast, version;
		let parser;
		try {
			parser = new Parser(src);
			ast = parser.parse();
			version = parser.getDetectedVersion?.() || "6";
		} catch {
			s.parseSkipped++;
			continue;
		}
		try {
			new UnifiedPineValidator().validate(ast, version);
			if (version === "6") new SemanticAnalyzer().analyze(ast);
		} catch {
			s.validatorCrashed++;
		}
	}
	stats[set] = s;
}

// --- report ------------------------------------------------------------------

const dead = sites.filter(
	(s) => s.fired.corpus + s.fired.tests + s.fired.probes === 0,
);
const probeOnly = sites.filter(
	(s) => s.fired.corpus + s.fired.tests === 0 && s.fired.probes > 0,
);
const untestedRealWorld = sites.filter(
	(s) => s.fired.corpus > 0 && s.fired.tests === 0,
);

if (asJson) {
	console.log(
		JSON.stringify(
			{
				stats,
				totalSites: sites.length,
				dead,
				probeOnly,
				untestedRealWorld,
				unmatchedFrames: Object.fromEntries(unmatchedFrames),
				sites,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

const line = (s = "") => console.log(s);
line("Error-reachability audit");
for (const [set, s] of Object.entries(stats)) {
	line(
		`  ${set.padEnd(7)} ${String(s.files).padStart(5)} files (${s.parseSkipped} parse-skipped, ${s.validatorCrashed} validator-crashed)`,
	);
}
line(
	`  sites: ${sites.filter((s) => s.file === "checker.js").length} checker + ${sites.filter((s) => s.file === "semanticAnalyzer.js").length} semanticAnalyzer = ${sites.length}`,
);

line(`\n=== DEAD sites: ${dead.length} (never fired on any fixture) ===`);
for (const s of dead) line(`  ${s.file}:${s.line}  [${s.kind}]  ${s.snippet}`);

line(
	`\n=== probe-only sites: ${probeOnly.length} (no corpus or regression fixture fires them) ===`,
);
for (const s of probeOnly)
	line(`  ${s.file}:${s.line}  [${s.kind}]  ${s.snippet}`);

line(
	`\n=== fired in corpus but never in tests: ${untestedRealWorld.length} (untested real-world behavior) ===`,
);
for (const s of untestedRealWorld)
	line(
		`  ${s.file}:${s.line}  [${s.kind}]  corpus=${s.fired.corpus}  ${s.snippet}`,
	);

if (unmatchedFrames.size > 0) {
	line(
		`\nNOTE: ${unmatchedFrames.size} fired frame(s) matched no enumerated site (helper indirection?):`,
	);
	for (const [k, v] of unmatchedFrames) line(`  ${k}  x${v}`);
}
line();
line(
	`(DEAD = dead code or a check nothing exercises - the INV050 class. Probe-only = consider promoting the probe to a regression fixture.)`,
);
