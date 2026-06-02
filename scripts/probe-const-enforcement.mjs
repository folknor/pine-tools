// INV014 step 2: probe TradingView to learn which `const`-typed reference
// params actually ENFORCE const at compile time (CE10123) vs. silently accept a
// non-const value.
//
// Why: gotchas/G002 assumed the reference's `const` qualifier was a lower bound
// (it claimed plot(title) accepts non-const) - but direct --tv probing disproves
// that. So we verify every const-typed param empirically and bake the
// verified-enforced set into pine-data (the checker must read facts from data,
// not hardcode them).
//
// Method: for each const-typed param, build a minimal valid call that passes a
// SIMPLE (least-dynamic non-const) value of the right base type, send it through
// `pine-lint --tv`, and read TV's verdict. We pass `simple` (not `series`) on
// purpose: if even `simple` is rejected, const is strictly enforced.
//
// Classification uses TV's structured error: a CE10123 whose ctx.argDisplayName
// is our param and whose ctx.currentTypeDocStr begins with "const" => ENFORCED.
// No errors => LENIENT. Any other error => AMBIGUOUS (scaffold needs fixing).
//
// Usage:
//   node scripts/probe-const-enforcement.mjs                 # full sweep
//   node scripts/probe-const-enforcement.mjs --filter input  # only matching fns
//   node scripts/probe-const-enforcement.mjs --limit 8       # first N probes
//   node scripts/probe-const-enforcement.mjs --dry           # print probes, no network
//   node scripts/probe-const-enforcement.mjs --delay 600     # ms between calls
//   node scripts/probe-const-enforcement.mjs --out path.json

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");
const functions = JSON.parse(
	fs.readFileSync(path.join(root, "pine-data", "v6", "functions.json"), "utf-8"),
);
const byName = new Map(functions.map((f) => [f.name, f]));

const argv = process.argv.slice(2);
const opt = (flag, def) => {
	const i = argv.indexOf(flag);
	return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const FILTER = opt("--filter", null);
const LIMIT = Number(opt("--limit", "0")) || 0;
const DELAY = Number(opt("--delay", "450"));
const DRY = argv.includes("--dry");
const OUT = opt(
	"--out",
	path.join(root, "investigations", "INV014-const-arg-enforcement", "audit.json"),
);

const CONST_RE = /^const\b/;
const baseOf = (t) => t.replace(CONST_RE, "").trim();

// A SIMPLE (non-const, non-series) value of each base type. Confirmed simple:
// syminfo.tickerid (simple string), syminfo.mintick (simple float),
// int(syminfo.mintick) (simple int), timeframe.isdaily (simple bool).
function nonConstValue(base) {
	if (/^int\/string/.test(base)) return "syminfo.tickerid";
	if (/^int\/float/.test(base)) return "syminfo.mintick";
	if (/source-type/.test(base)) return "int(syminfo.mintick)"; // the input() blob
	if (/\bstring\b/.test(base)) return "syminfo.tickerid";
	if (/\bfloat\b/.test(base)) return "syminfo.mintick";
	if (/\bint\b/.test(base)) return "int(syminfo.mintick)";
	if (/\bbool\b/.test(base)) return "timeframe.isdaily";
	if (/\bcolor\b/.test(base)) return "color.new(color.red, int(syminfo.mintick))";
	if (/plot_display/.test(base)) return "int(syminfo.mintick)";
	if (/scale_type/.test(base)) return "int(syminfo.mintick)";
	if (/\benum\b/.test(base)) return null; // needs a user enum; handled manually
	return null;
}

// A valid (often const) value to satisfy a REQUIRED scaffolding arg by its type.
function scaffoldValue(type) {
	const t = type.toLowerCase();
	if (/^series/.test(t) || /open\/high\/low\/close|source/.test(t)) {
		return /string/.test(t) ? '"x"' : "close";
	}
	if (/string/.test(t)) return '"x"';
	if (/bool/.test(t)) return "true";
	if (/color/.test(t)) return "color.red";
	if (/float/.test(t)) return "1.0";
	if (/int/.test(t)) return "1";
	return null; // non-scalar -> needs manual scaffold
}

const DECL_FNS = new Set(["indicator", "strategy", "library"]);

// Manual scaffolds for functions whose required args aren't plain scalars.
// Each returns a full script given the probed (param,value).
const MANUAL = {
	fill: (p, v) => {
		const a = { title: '"t"', color: "color.red" };
		a[p] = v;
		const named = Object.entries(a)
			.map(([k, x]) => `${k}=${x}`)
			.join(", ");
		return `//@version=6\nindicator("x")\np1 = plot(close)\np2 = plot(open)\nfill(p1, p2, ${named})`;
	},
	"polyline.new": (p, v) =>
		`//@version=6\nindicator("x")\nvar pts = array.new<chart.point>()\npolyline.new(pts, ${p}=${v})`,
	"table.new": (p, v) =>
		`//@version=6\nindicator("x")\ntable.new(position.top_left, 1, 1, ${p}=${v})`,
	// box/label/line.new primary overloads take chart.point(s); use the
	// coordinate overloads (series int/float) so the scaffold is valid.
	"box.new": (p, v) =>
		`//@version=6\nindicator("x")\nbox.new(bar_index, close, bar_index, close, ${p}=${v})`,
	"label.new": (p, v) =>
		`//@version=6\nindicator("x")\nlabel.new(bar_index, close, ${p}=${v})`,
	"line.new": (p, v) =>
		`//@version=6\nindicator("x")\nline.new(bar_index, close, bar_index, close, ${p}=${v})`,
	// sort_field only applies to arrays/matrices of a user-defined type.
	"array.sort": (p, v) =>
		`//@version=6\nindicator("x")\ntype T\n    int f\nvar a = array.new<T>()\narray.sort(a, ${p}=${v})\nplot(close)`,
	"array.sort_indices": (p, v) =>
		`//@version=6\nindicator("x")\ntype T\n    int f\nvar a = array.new<T>()\nx = array.sort_indices(a, ${p}=${v})\nplot(close)`,
	"matrix.sort": (p, v) =>
		`//@version=6\nindicator("x")\nvar m = matrix.new<float>(1, 1, 0.0)\nmatrix.sort(m, ${p}=${v})\nplot(close)`,
	// max_bars_back(var, num) takes a series var first; the auto-scaffold's
	// named form trips a parser quirk, so spell out the positional call.
	"max_bars_back": (p, v) =>
		`//@version=6\nindicator("x")\nmax_bars_back(close, ${v})\nplot(close)`,
	"input.enum": (p, v) => {
		// Need a user enum to have any enum value; pass a non-const enum member is
		// impossible (enum members are const), so for non-defval params use a normal
		// value, and for defval pass a series-ish enum via a reassigned var.
		if (p === "defval") {
			return `//@version=6\nindicator("x")\nenum E\n    a\n    b\nvar E e = E.a\ne := bar_index % 2 == 0 ? E.a : E.b\nx = input.enum(e)\nplot(close)`;
		}
		const a = { defval: "E.a" };
		a[p] = v;
		const named = Object.entries(a)
			.map(([k, x]) => `${k}=${x}`)
			.join(", ");
		return `//@version=6\nindicator("x")\nenum E\n    a\n    b\nx = input.enum(${named})\nplot(close)`;
	},
};

// Build the probe script for (fn, param). Returns {src} or {skip}.
function buildProbe(fnName, param, type) {
	const base = baseOf(type);
	const v = nonConstValue(base);
	if (MANUAL[fnName]) {
		// enum value generator differs; nonConstValue may be null but MANUAL handles it.
		return { src: MANUAL[fnName](param, v ?? "E.a"), base };
	}
	if (v == null) return { skip: `no non-const value for base '${base}'` };

	const fn = byName.get(fnName);
	const params = fn.parameters ?? [];
	// Args: every required param (const scaffold value) + the function's first
	// param (so the primary positional is present) + the probed param (=v).
	const args = new Map();
	const firstParam = params[0];
	const ensure = (pp) => {
		if (!pp || pp.name === param) return;
		const sv = scaffoldValue(pp.type);
		if (sv != null) args.set(pp.name, sv);
	};
	for (const pp of params) if (pp.required) ensure(pp);
	ensure(firstParam);
	args.set(param, v);

	// If any required param couldn't be satisfied, bail (needs a manual scaffold).
	const unmet = params.find(
		(pp) => pp.required && pp.name !== param && !args.has(pp.name),
	);
	if (unmet) return { skip: `required '${unmet.name}:${unmet.type}' unscaffoldable` };

	const named = [...args.entries()].map(([k, x]) => `${k}=${x}`).join(", ");
	if (DECL_FNS.has(fnName)) {
		const tail = fnName === "library" ? "" : "\nplot(close)";
		return { src: `//@version=6\n${fnName}(${named})${tail}`, base };
	}
	return { src: `//@version=6\nindicator("x")\n${fnName}(${named})`, base };
}

function runTv(src) {
	return new Promise((res) => {
		const c = spawn("pine-lint", ["--tv", "-c", src], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let out = "";
		let err = "";
		c.stdout.on("data", (d) => (out += d));
		c.stderr.on("data", (d) => (err += d));
		c.on("close", () => res({ out, err }));
		c.on("error", (e) => res({ out: "", err: String(e) }));
	});
}

function classify(raw, param) {
	let j;
	try {
		j = JSON.parse(raw);
	} catch (e) {
		return { verdict: "PARSE_FAIL", detail: raw.slice(0, 160) };
	}
	const errs = j.result?.errors ?? j.errors ?? [];
	const mine = errs.find(
		(e) =>
			e.code === "CE10123" &&
			e.ctx?.argDisplayName === param &&
			/^const/.test(e.ctx?.currentTypeDocStr ?? ""),
	);
	if (mine) {
		return {
			verdict: "ENFORCED",
			expected: mine.ctx.currentTypeDocStr,
			passed: mine.ctx.argumentType,
		};
	}
	if (errs.length === 0) return { verdict: "LENIENT" };
	return {
		verdict: "AMBIGUOUS",
		detail: errs
			.map((e) => `${e.code ?? ""}:${e.ctx?.argDisplayName ?? e.message?.slice(0, 60)}`)
			.join(" | "),
	};
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Collect the work list.
const work = [];
for (const fn of functions) {
	for (const p of fn.parameters ?? []) {
		if (typeof p.type === "string" && CONST_RE.test(p.type)) {
			if (FILTER && !fn.name.includes(FILTER)) continue;
			work.push({ fn: fn.name, param: p.name, type: p.type });
		}
	}
}
const slice = LIMIT > 0 ? work.slice(0, LIMIT) : work;

const results = [];
for (let i = 0; i < slice.length; i++) {
	const { fn, param, type } = slice[i];
	const probe = buildProbe(fn, param, type);
	if (probe.skip) {
		results.push({ fn, param, type, verdict: "SKIP", detail: probe.skip });
		console.log(`[${i + 1}/${slice.length}] ${fn}::${param}  SKIP (${probe.skip})`);
		continue;
	}
	if (DRY) {
		console.log(`--- ${fn}::${param} (${type}) ---\n${probe.src}\n`);
		results.push({ fn, param, type, src: probe.src });
		continue;
	}
	const { out } = await runTv(probe.src);
	const c = classify(out, param);
	results.push({ fn, param, type, ...c, src: probe.src });
	const extra =
		c.verdict === "ENFORCED"
			? `(passed ${c.passed} -> wants ${c.expected})`
			: c.verdict === "AMBIGUOUS"
				? `(${c.detail})`
				: "";
	console.log(`[${i + 1}/${slice.length}] ${fn}::${param}  ${c.verdict} ${extra}`);
	if (i < slice.length - 1) await sleep(DELAY);
}

if (!DRY) {
	const summary = {};
	for (const r of results) summary[r.verdict] = (summary[r.verdict] ?? 0) + 1;
	const stamp = new Date().toISOString().slice(0, 10);
	fs.writeFileSync(
		OUT,
		`${JSON.stringify({ probedOn: stamp, summary, results }, null, 2)}\n`,
	);
	console.log(`\nSummary: ${JSON.stringify(summary)}`);
	console.log(`Wrote ${results.length} results -> ${path.relative(root, OUT)}`);
	const interesting = results.filter(
		(r) => r.verdict === "LENIENT" || r.verdict === "AMBIGUOUS" || r.verdict === "SKIP",
	);
	if (interesting.length) {
		console.log("\nNon-ENFORCED (need attention):");
		for (const r of interesting)
			console.log(`  ${r.fn}::${r.param} (${r.type}) -> ${r.verdict} ${r.detail ?? ""}`);
	}
}
