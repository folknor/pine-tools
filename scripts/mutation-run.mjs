#!/usr/bin/env node
// Orchestrator - the (c) piece of TODO #48's mutation-testing harness.
//
// Picks BOTH-CLEAN fixtures (local AND TV report 0 errors, per the latest
// find-real-failures run), generates single-site mutants via mutate.mjs,
// runs each mutant through compare-tv.mjs --json (one local + one TV call
// per mutant), and classifies:
//
//   tv-accepts  TV also accepts the mutant - the breakage was not actually
//               invalid Pine; discard the operator/site as a signal source.
//   killed      TV rejects and so do we - the check works.
//   SURVIVOR    TV rejects, we accept - a false-negative gap: either a dead
//               check (should fire, doesn't - the INV050 failure mode) or a
//               check we don't have at all. The signal that matters.
//
// Starting from both-clean fixtures isolates the mutation's effect: any
// error on either side is mutation-induced, no pre-existing cascade to
// subtract (and no G001 post-stop ambiguity).
//
// The run is bounded and deliberate (TV budget): fixtures x operators x
// sites-per TV calls, picked deterministically by --seed so successive
// runs can rotate through the corpus.
//
// Usage:
//   node scripts/mutation-run.mjs [--fixtures N] [--operators a,b,c]
//        [--sites-per N] [--seed N] [--concurrency N] [--dry-run]
//
//   --dry-run generates and writes the mutants, runs the LOCAL side only
//   (no TV calls), and reports which mutants our linter already kills -
//   for sanity-checking an operator before spending TV budget.
//
// Output: mutation-reports/run-<utc>.json + a console summary grouped by
// (operator, TV error code). Mutants live in mutation-reports/mutants/
// (gitignored, never /tmp).

import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve, basename } from "node:path";
import { generateMutants, OPERATORS } from "./mutate.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_DIR = resolve(ROOT, "mutation-reports");
const MUTANT_DIR = resolve(REPORT_DIR, "mutants");
const REAL_FAILURES = resolve(ROOT, "lint-reports/real-failures.json");

const args = process.argv.slice(2);
const opt = (name, dflt) => {
	const i = args.indexOf(`--${name}`);
	return i !== -1 ? args[i + 1] : dflt;
};
const FIXTURE_COUNT = Number(opt("fixtures", "10"));
const OPS = opt("operators", Object.keys(OPERATORS).join(",")).split(",");
const SITES_PER = Number(opt("sites-per", "1"));
const SEED = Number(opt("seed", "1"));
const CONCURRENCY = Number(opt("concurrency", "4"));
const DRY_RUN = args.includes("--dry-run");

for (const op of OPS) {
	if (!OPERATORS[op]) {
		console.error(`unknown operator: ${op} (have: ${Object.keys(OPERATORS).join(", ")})`);
		process.exit(1);
	}
}

function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// --- pick both-clean fixtures --------------------------------------------------

let realFailures;
try {
	realFailures = JSON.parse(await readFile(REAL_FAILURES, "utf8"));
} catch {
	console.error(
		`cannot read ${REAL_FAILURES} - run find-real-failures.mjs first (the both-clean set comes from it)`,
	);
	process.exit(1);
}

const bothClean = Object.values(realFailures.files)
	.filter(
		(f) =>
			f.localOk &&
			f.tvOk &&
			f.localErrorCount === 0 &&
			f.tvErrorCount === 0,
	)
	.map((f) => f.file)
	.sort();

if (bothClean.length === 0) {
	console.error("no both-clean fixtures in real-failures.json");
	process.exit(1);
}

// Seeded shuffle, take N - successive seeds rotate through the corpus.
const rng = mulberry32(SEED);
const shuffled = [...bothClean];
for (let i = shuffled.length - 1; i > 0; i--) {
	const j = Math.floor(rng() * (i + 1));
	[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
}
const picked = shuffled.slice(0, FIXTURE_COUNT);

// --- generate mutants -----------------------------------------------------------

await mkdir(MUTANT_DIR, { recursive: true });
const mutants = [];
for (const file of picked) {
	const source = await readFile(file, "utf8");
	let generated;
	try {
		generated = generateMutants(source, {
			operators: OPS,
			sitesPer: SITES_PER,
			seed: SEED,
		});
	} catch (e) {
		console.error(`  mutate failed on ${basename(file)}: ${e.message}`);
		continue;
	}
	for (const m of generated) {
		const hash = basename(file, ".pine").slice(0, 12);
		const name = `${hash}--${m.operator}--L${m.site.line}C${m.site.col}.pine`;
		const path = resolve(MUTANT_DIR, name);
		await writeFile(path, m.mutant);
		mutants.push({ ...m, fixture: file, path, mutant: undefined });
	}
}

console.log(
	`both-clean pool: ${bothClean.length} fixtures; picked ${picked.length} (seed ${SEED})`,
);
console.log(
	`mutants: ${mutants.length} (${OPS.join(", ")} x sites-per ${SITES_PER})` +
		(DRY_RUN ? "  [dry-run: local side only, no TV calls]" : `  -> ~${mutants.length} TV calls`),
);

// --- run each mutant through compare-tv (or local-only in dry-run) -------------

function run(cmd, runArgs) {
	return new Promise((res) => {
		const c = spawn(cmd, runArgs, { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		let err = "";
		c.stdout.on("data", (d) => (out += d));
		c.stderr.on("data", (d) => (err += d));
		c.on("close", (code) => res({ out, err, code }));
	});
}

async function judgeMutant(m) {
	if (DRY_RUN) {
		const r = await run("pine-lint", [m.path]);
		try {
			const j = JSON.parse(r.out);
			const local = j.result?.errors ?? [];
			return { ...m, verdict: local.length > 0 ? "killed-local" : "local-accepts", local };
		} catch {
			return { ...m, verdict: "no-verdict", detail: r.err.slice(0, 200) };
		}
	}
	// compare-tv exits 2 on no-verdict (transient empty TV response) - retry once.
	for (let attempt = 0; attempt < 2; attempt++) {
		const r = await run("node", [resolve(ROOT, "scripts/compare-tv.mjs"), m.path, "--json"]);
		let j;
		try {
			j = JSON.parse(r.out);
		} catch {
			continue;
		}
		if (j.unavailable) continue;
		const tvErrs = j.tv ?? [];
		const localErrs = j.local ?? [];
		const verdict =
			tvErrs.length === 0
				? "tv-accepts"
				: localErrs.length > 0
					? "killed"
					: "SURVIVOR";
		return { ...m, verdict, tv: tvErrs, local: localErrs };
	}
	return { ...m, verdict: "no-verdict" };
}

const results = [];
let next = 0;
async function worker() {
	while (next < mutants.length) {
		const m = mutants[next++];
		const r = await judgeMutant(m);
		results.push(r);
		const tag = r.verdict === "SURVIVOR" ? " <-- FN GAP" : "";
		console.log(
			`  [${results.length}/${mutants.length}] ${r.verdict.padEnd(12)} ${basename(r.path)}${tag}`,
		);
	}
}
await Promise.all(Array.from({ length: CONCURRENCY }, worker));

// --- triage: group by (operator, TV code) --------------------------------------

const byVerdict = {};
for (const r of results) byVerdict[r.verdict] = (byVerdict[r.verdict] ?? 0) + 1;

const survivorGroups = new Map();
for (const r of results) {
	if (r.verdict !== "SURVIVOR") continue;
	const code = r.tv[0]?.code ?? "(no code)";
	const k = `${r.operator} / ${code}`;
	if (!survivorGroups.has(k)) survivorGroups.set(k, []);
	survivorGroups.get(k).push(r);
}

// Expectation check: a killed/SURVIVOR mutant whose TV code differs from the
// operator's expectedClass is informational (TV saw a DIFFERENT breakage
// than designed - the operator may need tightening).
let expectationDiverged = 0;
for (const r of results) {
	if (!r.tv?.length) continue;
	if (!r.tv.some((e) => e.code === r.expectedClass)) expectationDiverged++;
}

console.log("\n=== verdicts ===");
for (const [v, n] of Object.entries(byVerdict)) console.log(`  ${v.padEnd(14)} ${n}`);
if (!DRY_RUN) {
	console.log(
		`  (expectation diverged on ${expectationDiverged} TV-rejected mutants - TV used a different code than the operator targets)`,
	);
}

if (survivorGroups.size > 0) {
	console.log("\n=== SURVIVORS by (operator, TV code) - candidate FN gaps ===");
	for (const [k, list] of survivorGroups.entries()) {
		console.log(`  ${k}: ${list.length}`);
		for (const r of list.slice(0, 3)) {
			console.log(`      ${basename(r.path)}  tv: ${r.tv[0]?.message?.slice(0, 90)}`);
		}
	}
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reportPath = resolve(REPORT_DIR, `run-${stamp}.json`);
await writeFile(
	reportPath,
	JSON.stringify(
		{
			generatedAt: new Date().toISOString(),
			seed: SEED,
			fixtures: picked,
			operators: OPS,
			sitesPer: SITES_PER,
			dryRun: DRY_RUN,
			verdicts: byVerdict,
			results,
		},
		null,
		2,
	),
);
console.log(`\nreport: ${reportPath}`);
