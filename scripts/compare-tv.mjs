#!/usr/bin/env node
// Runs pine-lint locally and pine-lint --tv on a file, prints the errors
// from each side and the per-position diff.
//
// Usage:
//   node scripts/compare-tv.mjs <file.pine>           # human-readable
//   node scripts/compare-tv.mjs <file.pine> --json    # machine-readable
//
// `--json` emits a single JSON object so other scripts can consume the
// result. Keying is by (line, col); same-position-different-message
// pairs are surfaced in their own field rather than counted as
// disagreement (see find-real-failures.mjs for the rationale).

import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const jsonMode = args.includes("--json");
const file = args.find((a) => !a.startsWith("--"));
if (!file) {
	console.error("usage: compare-tv.mjs <file.pine> [--json]");
	process.exit(1);
}

function run(spawnArgs) {
	return new Promise((res) => {
		const c = spawn("pine-lint", spawnArgs, { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		c.stdout.on("data", (d) => (out += d));
		c.on("close", (code) => res({ out, code }));
	});
}

// An unparseable response means "no verdict", NOT "no errors" - diffing
// against it would dump the entire other side into localOnly/tvOnly (the
// swallowed-failure bug behind G002). see TODO #29.
function pickErrors(raw) {
	try {
		const j = JSON.parse(raw);
		const errs = j.result?.errors ?? j.errors ?? [];
		return {
			ok: true,
			errors: errs.map((e) => ({
				line: e.start?.line,
				col: e.start?.column,
				message: e.message,
			})),
		};
	} catch (e) {
		return { ok: false, errors: [], parseError: `${e.message}; raw: ${raw.slice(0, 200)}` };
	}
}

const [localRes, tvRes] = await Promise.all([run([file]), run(["--tv", file])]);
const localE = pickErrors(localRes.out);
const tvE = pickErrors(tvRes.out);

if (!localE.ok || !tvE.ok) {
	const side = !tvE.ok ? "tv" : "local";
	const detail = (!tvE.ok ? tvE : localE).parseError;
	const exitCode = !tvE.ok ? tvRes.code : localRes.code;
	if (jsonMode) {
		console.log(JSON.stringify({ file, unavailable: side, exitCode, detail }, null, 2));
	} else {
		console.error(`${side} side unavailable (exit ${exitCode}) - no verdict, skipping diff`);
		console.error(`  ${detail}`);
	}
	process.exit(2);
}

const local = localE.errors;
const tv = tvE.errors;

// Diff by (line, col). Same-position-different-message pairs are surfaced
// separately rather than counted as agreement (so a reviewer can confirm
// the overlap is the same bug under two vocabularies).
const localByPos = new Map();
for (const e of local) {
	const k = `${e.line}:${e.col}`;
	if (!localByPos.has(k)) localByPos.set(k, []);
	localByPos.get(k).push(e);
}
const tvByPos = new Map();
for (const e of tv) {
	const k = `${e.line}:${e.col}`;
	if (!tvByPos.has(k)) tvByPos.set(k, []);
	tvByPos.get(k).push(e);
}

const localOnly = local.filter((e) => !tvByPos.has(`${e.line}:${e.col}`));
const tvOnly = tv.filter((e) => !localByPos.has(`${e.line}:${e.col}`));

const samePositionDifferentMessage = [];
for (const [k, locals] of localByPos.entries()) {
	const tvs = tvByPos.get(k);
	if (!tvs) continue;
	for (const local of locals) {
		for (const tv of tvs) {
			if (local.message !== tv.message) {
				samePositionDifferentMessage.push({
					line: local.line,
					col: local.col,
					localMessage: local.message,
					tvMessage: tv.message,
				});
			}
		}
	}
}

if (jsonMode) {
	console.log(JSON.stringify({
		file,
		local,
		tv,
		localOnly,
		tvOnly,
		samePositionDifferentMessage,
	}, null, 2));
	process.exit(0);
}

console.log(`=== local (${local.length} errors) ===`);
for (const e of local.slice(0, 30)) {
	console.log(`  ${e.line}:${e.col}  ${e.message}`);
}
if (local.length > 30) console.log(`  … +${local.length - 30} more`);

console.log(`\n=== tradingview (${tv.length} errors) ===`);
for (const e of tv.slice(0, 30)) {
	console.log(`  ${e.line}:${e.col}  ${e.message}`);
}
if (tv.length > 30) console.log(`  … +${tv.length - 30} more`);

console.log(`\n=== local-only (we flag, TV silent - ${localOnly.length}) ===`);
const localByMsg = new Map();
for (const e of localOnly) localByMsg.set(e.message, (localByMsg.get(e.message) ?? 0) + 1);
for (const [m, c] of [...localByMsg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
	console.log(`  ${String(c).padStart(4)}  ${m}`);
}

console.log(`\n=== tv-only (TV flags, we silent - ${tvOnly.length}) ===`);
const tvByMsg = new Map();
for (const e of tvOnly) tvByMsg.set(e.message, (tvByMsg.get(e.message) ?? 0) + 1);
for (const [m, c] of [...tvByMsg.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15)) {
	console.log(`  ${String(c).padStart(4)}  ${m}`);
}

if (samePositionDifferentMessage.length > 0) {
	console.log(`\n=== same-position different-message (${samePositionDifferentMessage.length}) ===`);
	console.log("  (both linters flagged this position; usually same bug, different wording)");
	for (const p of samePositionDifferentMessage.slice(0, 10)) {
		console.log(`  ${p.line}:${p.col}`);
		console.log(`    local: ${p.localMessage.slice(0, 90)}`);
		console.log(`    tv:    ${p.tvMessage.slice(0, 90)}`);
	}
	if (samePositionDifferentMessage.length > 10) {
		console.log(`  … +${samePositionDifferentMessage.length - 10} more`);
	}
}
