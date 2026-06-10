#!/usr/bin/env node
// Fixture-coverage census - the no-TV slice of the gap-finder (#48).
//
// Cross-references the generated JSON catalog (pine-data/v6) against the
// fixture sets by PARSING each .pine with our own parser and walking the AST.
// It finds BLIND SPOTS - catalog entries and grammar shapes that no fixture
// exercises - which is exactly the class of gap INV054 was (two-level member
// calls like strategy.risk.max_drawdown resolved nowhere and no fixture
// covered the shape). It does NOT judge whether the checker is correct about
// a shape - that needs the --tv mutation half. This half is deterministic and
// offline.
//
// Two fixture sets are scanned separately:
//   corpus = fixtures/                          (real-world scripts, no assertions)
//   tests  = packages/core/test/fixtures/       (curated, @expects assertions)
// A shape present in corpus but absent from tests is a real-world pattern we
// do not test - the strongest signal here.
//
// Three dimensions:
//   1. Catalog coverage   - functions/variables/constants referenced in zero fixtures
//   2. Flag coverage      - per behavioral flag, is the rule exercised (and, for
//                           topLevelOnly, exercised in the VIOLATING local scope)?
//   3. Structural census  - distribution of grammar shapes (member-chain depth,
//                           switch/forIn/tuple/enum/...) per set
//
// Usage: node scripts/fixture-coverage.mjs [--json]

import { readdir, readFile, access } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const asJson = process.argv.includes("--json");

const PARSER = resolve("dist/packages/core/src/parser/parser.js");
try {
	await access(PARSER);
} catch {
	console.error(`No compiled parser at ${PARSER}. Run \`pnpm run build:tsc\` first.`);
	process.exit(2);
}
const { Parser } = await import(`file://${PARSER}`);

// --- catalog ---------------------------------------------------------------

function loadCatalog(name) {
	return JSON.parse(readFileSync(resolve(`pine-data/v6/${name}.json`), "utf8"));
}

const functions = loadCatalog("functions");
const variables = loadCatalog("variables");
const constants = loadCatalog("constants");

// Strip the generic template suffix: array.new<type> -> array.new (the call
// site writes the bare name).
const stripTemplate = (n) => n.replace(/<.*>$/, "");

const fnNames = new Set(functions.map((f) => stripTemplate(f.name)));
const varNames = new Set(variables.map((v) => v.name));
const constNames = new Set(constants.map((c) => c.name));

const FLAG_FNS = {
	topLevelOnly: functions.filter((f) => f.flags?.topLevelOnly).map((f) => f.name),
	variadic: functions.filter((f) => f.flags?.variadic).map((f) => f.name),
	polymorphic: functions.filter((f) => f.flags?.polymorphic).map((f) => f.name),
	returnTypeParam: functions.filter((f) => f.flags?.returnTypeParam).map((f) => f.name),
	historyDependent: functions.filter((f) => f.flags?.historyDependent).map((f) => f.name),
};

// --- AST helpers -----------------------------------------------------------

// Flatten a pure identifier-property member chain to its dotted name.
// Returns "" if any link is not a plain identifier property access
// (e.g. foo().bar, arr[0].baz).
function chainName(node) {
	if (!node) return "";
	if (node.type === "Identifier") return node.name;
	if (node.type === "MemberExpression") {
		const base = chainName(node.object);
		if (!base) return "";
		return `${base}.${node.property.name}`;
	}
	return "";
}

const BLOCK_BODY_FIELDS = {
	IfStatement: ["consequent", "alternate"],
	IfExpression: ["consequent", "alternate"],
	ForStatement: ["body"],
	ForInStatement: ["body"],
	WhileStatement: ["body"],
	FunctionDeclaration: ["body"],
	MethodDeclaration: ["body"],
};

function newStats() {
	return {
		files: 0,
		parseErrors: 0,
		refs: new Set(), // every catalog-eligible dotted name seen anywhere
		callsAtDepth: new Map(), // name -> {top:n, local:n} (depth 0 vs >0)
		nodeCounts: {}, // type -> count
		callChainDepth: {}, // 1/2/3+ -> count (callee chains)
		readChainDepth: {}, // 1/2/3+ -> count (value-position chains)
		switchWithDisc: 0,
		switchNoDisc: 0,
		forInTuple: 0,
		forInSingle: 0,
		maxBlockDepth: 0,
	};
}

function bump(obj, key) {
	obj[key] = (obj[key] || 0) + 1;
}
function depthBucket(d) {
	return d >= 3 ? "3+" : String(d);
}

function recordCall(stats, name, depth) {
	const e = stats.callsAtDepth.get(name) || { top: 0, local: 0 };
	if (depth > 0) e.local++;
	else e.top++;
	stats.callsAtDepth.set(name, e);
}

function visit(node, depth, stats, inValuePos) {
	if (!node || typeof node !== "object") return;
	if (Array.isArray(node)) {
		for (const c of node) visit(c, depth, stats, inValuePos);
		return;
	}
	const t = node.type;
	if (!t) return;
	bump(stats.nodeCounts, t);
	if (depth > stats.maxBlockDepth) stats.maxBlockDepth = depth;

	switch (t) {
		case "CallExpression": {
			const name = chainName(node.callee);
			if (name) {
				stats.refs.add(name);
				recordCall(stats, name, depth);
				const cd = (name.match(/\./g) || []).length + 1;
				bump(stats.callChainDepth, depthBucket(cd));
			} else {
				visit(node.callee, depth, stats, true);
			}
			for (const arg of node.arguments || []) visit(arg.value, depth, stats, true);
			return;
		}
		case "MemberExpression": {
			const name = chainName(node);
			if (name) {
				stats.refs.add(name);
				const cd = (name.match(/\./g) || []).length + 1;
				bump(stats.readChainDepth, depthBucket(cd));
			} else {
				visit(node.object, depth, stats, true);
			}
			return;
		}
		case "Identifier":
			stats.refs.add(node.name);
			return;
		case "SwitchExpression":
			if (node.discriminant) {
				stats.switchWithDisc++;
				visit(node.discriminant, depth, stats, true);
			} else {
				stats.switchNoDisc++;
			}
			for (const c of node.cases || []) {
				if (c.condition) visit(c.condition, depth, stats, true);
				if (c.result) visit(c.result, depth + 1, stats, true);
				if (c.statements) visit(c.statements, depth + 1, stats, false);
			}
			return;
		case "ForInStatement":
			if (node.iterator2) stats.forInTuple++;
			else stats.forInSingle++;
			break;
	}

	const blockFields = BLOCK_BODY_FIELDS[t] || [];
	for (const [key, val] of Object.entries(node)) {
		if (key === "type" || key === "line" || key === "column") continue;
		const childDepth = blockFields.includes(key) ? depth + 1 : depth;
		visit(val, childDepth, stats, false);
	}
}

// --- fixture collection ----------------------------------------------------

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

async function scanSet(dir) {
	const stats = newStats();
	const files = await findPine(dir);
	for (const file of files) {
		stats.files++;
		let src;
		try {
			src = await readFile(file, "utf8");
		} catch {
			stats.parseErrors++;
			continue;
		}
		let ast;
		try {
			ast = new Parser(src).parse();
		} catch {
			stats.parseErrors++;
			continue;
		}
		try {
			visit(ast, 0, stats, false);
		} catch {
			stats.parseErrors++;
		}
	}
	return stats;
}

const corpus = await scanSet(resolve("fixtures"));
const tests = await scanSet(resolve("packages/core/test/fixtures"));

// --- reporting -------------------------------------------------------------

const allRefs = new Set([...corpus.refs, ...tests.refs]);

function uncovered(catalog, setRefs) {
	return [...catalog].filter((n) => !setRefs.has(n)).sort();
}

function groupByNamespace(names) {
	const g = {};
	for (const n of names) {
		const ns = n.includes(".") ? n.split(".").slice(0, -1).join(".") : "(top-level)";
		(g[ns] ||= []).push(n);
	}
	return g;
}

const report = {
	corpus: { files: corpus.files, parseErrors: corpus.parseErrors },
	tests: { files: tests.files, parseErrors: tests.parseErrors },
	catalog: {
		functions: {
			total: fnNames.size,
			uncoveredEverywhere: uncovered(fnNames, allRefs),
			uncoveredInTests: uncovered(fnNames, tests.refs),
		},
		variables: {
			total: varNames.size,
			uncoveredEverywhere: uncovered(varNames, allRefs),
		},
		constants: {
			total: constNames.size,
			uncoveredEverywhere: uncovered(constNames, allRefs),
		},
	},
	flags: {},
	structure: { corpus: structSummary(corpus), tests: structSummary(tests) },
};

function structSummary(s) {
	return {
		callChainDepth: s.callChainDepth,
		readChainDepth: s.readChainDepth,
		switchWithDisc: s.switchWithDisc,
		switchNoDisc: s.switchNoDisc,
		forInTuple: s.forInTuple,
		forInSingle: s.forInSingle,
		maxBlockDepth: s.maxBlockDepth,
		enums: s.nodeCounts.EnumDeclaration || 0,
		types: s.nodeCounts.TypeDeclaration || 0,
		methods: s.nodeCounts.MethodDeclaration || 0,
		tuples: s.nodeCounts.TupleDeclaration || 0,
		ternary: s.nodeCounts.TernaryExpression || 0,
		ifExpr: s.nodeCounts.IfExpression || 0,
	};
}

// Flag coverage: for each flag, how many flagged fns are referenced at all,
// and (topLevelOnly only) how many are ever called in a local scope.
for (const [flag, names] of Object.entries(FLAG_FNS)) {
	const seen = names.filter((n) => allRefs.has(stripTemplate(n)));
	const entry = { total: names.length, referenced: seen.length };
	if (flag === "topLevelOnly") {
		const localCalls = (name) => {
			const c = corpus.callsAtDepth.get(name);
			const t = tests.callsAtDepth.get(name);
			return (c?.local || 0) + (t?.local || 0) > 0;
		};
		entry.exercisedInLocalScope = names.filter(localCalls);
		entry.neverInLocalScope = names.filter((n) => !localCalls(n));
	}
	report.flags[flag] = entry;
}

if (asJson) {
	console.log(JSON.stringify(report, null, 2));
	process.exit(0);
}

// --- text output -----------------------------------------------------------

const line = (s = "") => console.log(s);
line(`Fixture coverage census`);
line(`  corpus: ${corpus.files} files (${corpus.parseErrors} parse-skipped)`);
line(`  tests:  ${tests.files} files (${tests.parseErrors} parse-skipped)`);
line();

line(`=== 1. Catalog coverage ===`);
for (const [kind, info] of Object.entries(report.catalog)) {
	const u = info.uncoveredEverywhere;
	line(`\n  ${kind}: ${info.total} in catalog, ${u.length} referenced in NO fixture`);
	if (u.length) {
		const g = groupByNamespace(u);
		for (const ns of Object.keys(g).sort()) {
			line(`    ${ns}: ${g[ns].join(", ")}`);
		}
	}
	if (kind === "functions" && info.uncoveredInTests.length) {
		const onlyCorpus = info.uncoveredInTests.filter(
			(n) => !u.includes(n),
		);
		line(
			`    [${onlyCorpus.length} functions appear in the corpus but have NO regression/test fixture]`,
		);
	}
}

line(`\n=== 2. Flag coverage ===`);
for (const [flag, info] of Object.entries(report.flags)) {
	line(`\n  ${flag}: ${info.total} flagged, ${info.referenced} referenced anywhere`);
	if (flag === "topLevelOnly") {
		line(`    exercised in a local scope (the violating case): ${info.exercisedInLocalScope.length}`);
		if (info.exercisedInLocalScope.length)
			line(`      ${info.exercisedInLocalScope.join(", ")}`);
		line(`    NEVER tested in a local scope: ${info.neverInLocalScope.length}`);
		if (info.neverInLocalScope.length)
			line(`      ${info.neverInLocalScope.join(", ")}`);
	}
}

line(`\n=== 3. Structural census (corpus | tests) ===`);
const ks = Object.keys(report.structure.corpus);
for (const k of ks) {
	const c = report.structure.corpus[k];
	const t = report.structure.tests[k];
	const fmt = (v) => (typeof v === "object" ? JSON.stringify(v) : String(v));
	line(`  ${k.padEnd(16)} ${fmt(c).padEnd(28)} | ${fmt(t)}`);
}
line();
line(`(Shapes present in corpus but 0 in tests are real-world patterns we do not assert.)`);
