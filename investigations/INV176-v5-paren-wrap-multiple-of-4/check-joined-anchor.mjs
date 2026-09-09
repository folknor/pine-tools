// INV176 residual: adjudicate the joined-line anchor against TradingView over
// every corpus file whose anchors moved.
//
// Classifies each file rather than just diffing, because most v5 corpus files
// cannot adjudicate anything: TV's parse stage never runs when a lexer error
// (a broken string, a stray `{`) pre-empts it, and its silence there is not a
// verdict. Only files where TV actually returns this error can confirm or
// refute an anchor. See INV176's own triage of the same population.
//
// Usage: node investigations/INV176-v5-paren-wrap-multiple-of-4/check-joined-anchor.mjs <file>...

import { spawn } from "node:child_process";

const WRAP = /end of line without line continuation/;

function run(args) {
	return new Promise((res) => {
		const c = spawn("pine-lint", args, { stdio: ["ignore", "pipe", "pipe"] });
		let out = "";
		c.stdout.on("data", (d) => (out += d));
		c.on("close", () => res(out));
		c.on("error", () => res(""));
	});
}

function errorsOf(raw) {
	try {
		const j = JSON.parse(raw);
		if (j.success !== true) return null;
		return j.result?.errors ?? j.errors ?? [];
	} catch {
		return null;
	}
}

const pos = (e) => `${e.start?.line ?? e.line}:${e.start?.column ?? e.column}`;

// With no arguments, adjudicate exactly the files whose anchors moved in the
// latest regression run.
let files = process.argv.slice(2);
if (files.length === 0) {
	const { readFileSync } = await import("node:fs");
	const report = JSON.parse(
		readFileSync("lint-reports/regression-report.json", "utf8"),
	);
	files = report.filesChanged.map((f) => `fixtures/${f.file}`);
}
const tally = {};
for (const f of files) {
	const local = errorsOf(await run([f]));
	const tv = errorsOf(await run(["--tv", f]));
	const lw = (local ?? []).filter((e) => WRAP.test(e.message))[0];
	const tvErrs = tv ?? [];
	const tw = tvErrs.filter((e) => WRAP.test(e.message))[0];
	let verdict;
	if (tv === null) verdict = "tv-unusable";
	else if (tw) verdict = pos(tw) === pos(lw ?? {}) ? "AGREE" : `DISAGREE ${pos(lw ?? {})} vs ${pos(tw)}`;
	else if (tvErrs.length === 0) verdict = "tv-empty (no verdict)";
	else verdict = `tv-preempted (${tvErrs[0].message.slice(0, 42)})`;
	const key = verdict.startsWith("DISAGREE") ? "DISAGREE" : verdict.split(" ")[0];
	tally[key] = (tally[key] ?? 0) + 1;
	console.log(`${f.split("/").pop().slice(0, 8)}  ${verdict}`);
}
console.log("\n" + JSON.stringify(tally, null, 1));
