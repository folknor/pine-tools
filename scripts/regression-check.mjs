#!/usr/bin/env node
// Compares the current local pine-lint output against
// lint-reports/local-baseline.json without hitting TradingView.
//
// For every fixture, diffs the current per-file error set against the
// baseline. Errors are keyed by (line, col, message):
//
//   appeared    — in current, not in baseline. Regression candidates.
//   disappeared — in baseline, not in current. Cross-referenced against
//                 lint-reports/real-failures.json (if present) to mark:
//                   tvSilent: true  → TV is silent at this position
//                                     (could be us correctly stopping
//                                     over-strict flagging OR us
//                                     incorrectly stopping a finding TV
//                                     missed — investigate)
//                   tvSilent: false → TV also flags this position; us
//                                     going silent is suspicious and
//                                     warrants a --tv recheck
//                   tvSilent: null  → no TV reference for this file
//                                     (e.g. v4/v5 fixture, or v6 added
//                                     since last find-real-failures run)
//
// Writes lint-reports/regression-report.json. Exits non-zero if any new
// errors appeared. Per CLAUDE.md, neither label is a verdict — both are
// navigation aids for human investigation. See G001.
//
// Usage: node scripts/regression-check.mjs [--concurrency N]

import { readdir, readFile, writeFile, mkdir, access } from "node:fs/promises";
import { spawn } from "node:child_process";
import { resolve, join, basename } from "node:path";

const args = process.argv.slice(2);
let concurrency = 8;
for (let i = 0; i < args.length; i++) {
	if (args[i] === "--concurrency") concurrency = Number(args[++i]);
}

const FIXTURES = resolve("fixtures");
const BASELINE = resolve("lint-reports/local-baseline.json");
const TV_REF = resolve("lint-reports/real-failures.json");
const OUT = resolve("lint-reports/regression-report.json");

try {
	await access(FIXTURES);
} catch {
	console.error(`No ${FIXTURES} — run scripts/collect-pine-fixtures.mjs first.`);
	process.exit(2);
}

let baseline;
try {
	baseline = JSON.parse(await readFile(BASELINE, "utf8"));
} catch {
	console.error(`No baseline at ${BASELINE}. Run scripts/snapshot-local-lint.mjs first.`);
	process.exit(2);
}

// Build the per-fixture set of positions where TV is silent and we
// previously flagged, from the TV-diff report. If the report is missing
// the script still works — disappearances simply can't be annotated.
const tvSilentPositions = new Map();
let tvAvailable = false;
try {
	const tv = JSON.parse(await readFile(TV_REF, "utf8"));
	for (const f of tv.files) {
		const set = new Set();
		for (const e of f.localOnly) set.add(`${e.line}:${e.col}:${e.message}`);
		tvSilentPositions.set(basename(f.file), set);
	}
	tvAvailable = true;
} catch {
	console.warn(`No TV reference at ${TV_REF} — disappearance annotations disabled.`);
}

function run(file) {
	return new Promise((res) => {
		const c = spawn("pine-lint", [file], { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		c.stdout.on("data", (d) => (out += d));
		const t = setTimeout(() => c.kill("SIGKILL"), 30_000);
		c.on("close", () => {
			clearTimeout(t);
			res(out);
		});
		c.on("error", () => {
			clearTimeout(t);
			res("");
		});
	});
}

function pickErrors(raw) {
	try {
		const j = JSON.parse(raw);
		const errs = j.result?.errors ?? j.errors ?? [];
		return errs.map((e) => ({ line: e.start?.line ?? 0, col: e.start?.column ?? 0, message: e.message ?? "" }));
	} catch {
		return null;
	}
}

const entries = (await readdir(FIXTURES)).filter((n) => n.endsWith(".pine")).sort();
const current = {};
let next = 0;
let done = 0;
const startedAt = Date.now();

async function worker() {
	while (true) {
		const i = next++;
		if (i >= entries.length) return;
		const name = entries[i];
		const errs = pickErrors(await run(join(FIXTURES, name)));
		current[name] = { errors: errs ?? [], parseFailed: errs === null };
		done++;
		if (done % 200 === 0 || done === entries.length) {
			process.stderr.write(`  ${done}/${entries.length} (${((Date.now() - startedAt) / 1000).toFixed(1)}s)\n`);
		}
	}
}

console.log(`linting ${entries.length} fixtures locally (concurrency ${concurrency})…`);
await Promise.all(Array.from({ length: concurrency }, worker));

const report = {
	baselineGeneratedAt: baseline.generatedAt,
	checkedAt: new Date().toISOString(),
	tvReferenceAvailable: tvAvailable,
	filesAdded: [],
	filesRemoved: [],
	filesChanged: [],
	parseFailureDelta: { newlyFailing: [], newlySucceeding: [] },
};

for (const name of Object.keys(baseline.files)) {
	if (!(name in current)) report.filesRemoved.push(name);
}

for (const name of entries) {
	if (!(name in baseline.files)) {
		report.filesAdded.push({ file: name, errorCount: current[name].errors.length });
		continue;
	}
	const base = baseline.files[name];
	const cur = current[name];

	if (base.parseFailed !== cur.parseFailed) {
		(cur.parseFailed ? report.parseFailureDelta.newlyFailing : report.parseFailureDelta.newlySucceeding).push(name);
	}

	const oldKeys = new Set(base.errors.map((e) => `${e.line}:${e.col}:${e.message}`));
	const newKeys = new Set(cur.errors.map((e) => `${e.line}:${e.col}:${e.message}`));
	const appeared = cur.errors.filter((e) => !oldKeys.has(`${e.line}:${e.col}:${e.message}`));
	const disappeared = base.errors.filter((e) => !newKeys.has(`${e.line}:${e.col}:${e.message}`));
	if (appeared.length === 0 && disappeared.length === 0) continue;

	const tvSilentSet = tvSilentPositions.get(name);
	// tvSilent is meaningful only for files that appeared in the TV
	// reference. For files outside it (non-v6 fixtures, or v6 files added
	// since the last find-real-failures.mjs run), there's no per-error TV
	// data, so mark disappearances as unverifiable.
	const annotatedDisappeared = disappeared.map((e) => ({
		...e,
		tvSilent: tvAvailable && tvSilentSet ? tvSilentSet.has(`${e.line}:${e.col}:${e.message}`) : null,
	}));

	report.filesChanged.push({ file: name, appeared, disappeared: annotatedDisappeared });
}

const totals = {
	filesChanged: report.filesChanged.length,
	newAppearances: 0,
	disappearedTvSilent: 0,
	disappearedTvFlagged: 0,
	disappearedUnverifiable: 0,
};
const tvFlaggedDisappearanceFiles = [];
for (const f of report.filesChanged) {
	totals.newAppearances += f.appeared.length;
	const tvFlagged = f.disappeared.filter((e) => e.tvSilent === false);
	if (tvFlagged.length) tvFlaggedDisappearanceFiles.push(f.file);
	for (const e of f.disappeared) {
		if (e.tvSilent === true) totals.disappearedTvSilent++;
		else if (e.tvSilent === false) totals.disappearedTvFlagged++;
		else totals.disappearedUnverifiable++;
	}
}
report.totals = totals;
report.tvFlaggedDisappearanceFiles = tvFlaggedDisappearanceFiles;

await mkdir(resolve("lint-reports"), { recursive: true });
await writeFile(OUT, JSON.stringify(report, null, 2));

console.log(`\n=== regression check ===`);
console.log(`baseline taken:               ${report.baselineGeneratedAt}`);
console.log(`fixtures checked:             ${entries.length}`);
console.log(`fixtures changed:             ${totals.filesChanged}`);
console.log(`fixtures added (no baseline): ${report.filesAdded.length}`);
console.log(`fixtures removed:             ${report.filesRemoved.length}`);
console.log(`new error appearances:        ${totals.newAppearances}${totals.newAppearances ? "  ← REGRESSION CANDIDATES" : ""}`);
console.log(`disappeared, TV-silent here:  ${totals.disappearedTvSilent}  (we used to flag where TV is silent — investigate per category, not auto-good)`);
console.log(`disappeared, TV-also-flagged: ${totals.disappearedTvFlagged}${totals.disappearedTvFlagged ? "  ← we stopped flagging something TV catches; verify with --tv" : ""}`);
console.log(`disappeared, unverifiable:    ${totals.disappearedUnverifiable}  (file outside TV reference; v4/v5/non-v6 or added since last find-real-failures run)`);

if (tvFlaggedDisappearanceFiles.length) {
	console.log(`\nfiles where TV-also-flagged disappearances need recheck (${tvFlaggedDisappearanceFiles.length}):`);
	for (const f of tvFlaggedDisappearanceFiles.slice(0, 15)) console.log(`  node scripts/compare-tv.mjs fixtures/${f}`);
	if (tvFlaggedDisappearanceFiles.length > 15) console.log(`  … +${tvFlaggedDisappearanceFiles.length - 15} more (see ${OUT})`);
}

console.log(`\nfull report: ${OUT}`);
if (totals.newAppearances > 0) process.exit(1);
