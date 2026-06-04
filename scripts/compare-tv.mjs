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
import { readFile } from "node:fs/promises";
import { remapTvDiagnostics } from "./lib/tv-positions.mjs";

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

// Fill TV's message templates ("The function {functionName} ..." + ctx)
// so the text is human-readable in the diff output.
function fillTemplate(message, ctx) {
	if (!ctx) return message;
	return message.replace(/\{(\w+)\}/g, (m, key) => ctx[key] ?? m);
}

// An unparseable response means "no verdict", NOT "no errors" - diffing
// against it would dump the entire other side into localOnly/tvOnly (the
// swallowed-failure bug behind G002). see TODO #29.
// Picks both diagnostics channels: TV's translate_light returns a
// `warnings` array (CW codes) beside `errors` - see INV018 / TODO #36.
function pickDiagnostics(raw) {
	try {
		const j = JSON.parse(raw);
		const mapDiag = (e) => ({
			line: e.start?.line,
			col: e.start?.column,
			message: fillTemplate(e.message ?? "", e.ctx),
		});
		return {
			ok: true,
			errors: (j.result?.errors ?? j.errors ?? []).map(mapDiag),
			warnings: (j.result?.warnings ?? j.warnings ?? []).map(mapDiag),
		};
	} catch (e) {
		return {
			ok: false,
			errors: [],
			warnings: [],
			parseError: `${e.message}; raw: ${raw.slice(0, 200)}`,
		};
	}
}

const [localRes, tvRes, source] = await Promise.all([
	run([file]),
	run(["--tv", file]),
	readFile(file, "utf8"),
]);
const localE = pickDiagnostics(localRes.out);
const tvE = pickDiagnostics(tvRes.out);
// TV reports wrapped statements at logical-line columns; map them back
// to physical positions before the position-keyed diff. see G005 / #38.
tvE.errors = remapTvDiagnostics(source, tvE.errors);
tvE.warnings = remapTvDiagnostics(source, tvE.warnings);

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
function diffByPosition(localList, tvList) {
	const localByPos = new Map();
	for (const e of localList) {
		const k = `${e.line}:${e.col}`;
		if (!localByPos.has(k)) localByPos.set(k, []);
		localByPos.get(k).push(e);
	}
	const tvByPos = new Map();
	for (const e of tvList) {
		const k = `${e.line}:${e.col}`;
		if (!tvByPos.has(k)) tvByPos.set(k, []);
		tvByPos.get(k).push(e);
	}

	const localOnly = localList.filter((e) => !tvByPos.has(`${e.line}:${e.col}`));
	const tvOnly = tvList.filter((e) => !localByPos.has(`${e.line}:${e.col}`));

	const samePositionDifferentMessage = [];
	for (const [k, locals] of localByPos.entries()) {
		const tvs = tvByPos.get(k);
		if (!tvs) continue;
		for (const l of locals) {
			for (const t of tvs) {
				if (l.message !== t.message) {
					samePositionDifferentMessage.push({
						line: l.line,
						col: l.col,
						localMessage: l.message,
						tvMessage: t.message,
					});
				}
			}
		}
	}
	return { localOnly, tvOnly, samePositionDifferentMessage };
}

const { localOnly, tvOnly, samePositionDifferentMessage } = diffByPosition(
	local,
	tv,
);
const warningDiff = diffByPosition(localE.warnings, tvE.warnings);

if (jsonMode) {
	console.log(JSON.stringify({
		file,
		local,
		tv,
		localOnly,
		tvOnly,
		samePositionDifferentMessage,
		warnings: {
			local: localE.warnings,
			tv: tvE.warnings,
			localOnly: warningDiff.localOnly,
			tvOnly: warningDiff.tvOnly,
			samePositionDifferentMessage: warningDiff.samePositionDifferentMessage,
		},
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

// WARNING channel (CW codes) - see INV018 / TODO #36
console.log(
	`\n=== warnings: local ${localE.warnings.length} / tv ${tvE.warnings.length}, local-only ${warningDiff.localOnly.length} / tv-only ${warningDiff.tvOnly.length} ===`,
);
for (const e of warningDiff.localOnly.slice(0, 15)) {
	console.log(`  local-only ${e.line}:${e.col}  ${e.message.slice(0, 90)}`);
}
for (const e of warningDiff.tvOnly.slice(0, 15)) {
	console.log(`  tv-only    ${e.line}:${e.col}  ${e.message.slice(0, 90)}`);
}
