// Probe TV for the EXPECTED-TYPE NOUN it quotes when a union-typed parameter
// is given an argument of the wrong base (TODO #74 / INV159).
//
// The problem. Our CE10123 on a union parameter fabricates the expected type
// as `simple ${members[0]}` - the first member of the scraped union, with the
// qualifier hardcoded. TV's own noun is neither: for the SAME `int/float`
// union it answers `series float` on ta.sma, `const int` on math.max and
// `simple int` on nz. INV159 re-measured it and killed every structural
// hypothesis - math.abs and math.max have identical overload sets up to arity
// and answer `simple int` vs `const int` - so the value is a per-function,
// per-parameter CONSTANT that nothing in the catalog derives. It can only be
// measured, which is what this does, exactly as INV050's
// probe-required-params.mjs measured requiredness.
//
// The probe. One call per union parameter carrying exactly ONE deliberately
// wrong argument (a base outside the union) with valid values everywhere else;
// TV answers CE10123 whose ctx.currentTypeDocStr is the noun. Unlike the parse
// channel, TV reports EVERY type error in a script, so probes batch: one
// script per function, one line per union parameter, attributed back by the
// error's own line number.
//
// Wrinkles, and why the design is shaped this way:
// - The target argument is passed NAMED so TV's ctx.argDisplayName confirms
//   which parameter answered. Everything else the call needs is passed
//   positionally BEFORE it, never after (a positional argument after a named
//   one is itself a syntax error - INV169 - and would kill the whole script).
// - A PARSE error kills every probe in the script, so a script that fails to
//   parse is re-run one line at a time rather than discarded.
// - A union covering every scalar base has no wrong argument to give and is
//   recorded `unprobeable` rather than guessed at.
//
// Writes pine-data/raw/v6/union-type-nouns-probe.json: per function+parameter
// the exact probe line, TV's raw error, the extracted noun, and a status:
//   ok             CE10123 for THIS parameter (ctx.argDisplayName matches),
//                  noun extracted
//   mismatched-arg CE10123 on the line, but about a different parameter - the
//                  wrong argument provoked someone else's error. Never
//                  recorded as a noun; needs a hand-built probe.
//   no-error       TV accepted the wrong argument - the union is wider than
//                  scraped, or the argument was not wrong. A finding, not noise.
//   other-error    TV answered a different code for this line - needs a look
//   unprobeable   the union admits every scalar base
//   no-verdict    TV call failed (transient - retry)
//
// Usage:
//   node scripts/probe-union-type-nouns.mjs --census        # offline, no TV
//   node scripts/probe-union-type-nouns.mjs --limit 10      # pilot
//   node scripts/probe-union-type-nouns.mjs                 # full sweep
//   node scripts/probe-union-type-nouns.mjs --retry         # unsettled only
// Concurrency 4 (same etiquette as find-real-failures.mjs).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const execFileP = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "pine-data/raw/v6/union-type-nouns-probe.json");

const functions = JSON.parse(
	readFileSync(join(root, "pine-data/v6/functions.json"), "utf8"),
);

const args = process.argv.slice(2);
const censusOnly = args.includes("--census");
const retryOnly = args.includes("--retry");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;

// ---------------------------------------------------------------------------
// Union detection - mirrors getScalarUnionMembers in analyzer/builtins.ts.
// Kept as its own copy deliberately: this script probes what the CHECKER
// treats as a union, so it must ask the same question of the same data, and
// importing the compiled analyzer would make the probe depend on a build.
// ---------------------------------------------------------------------------
const SCALAR_BASES = new Set(["int", "float", "bool", "string", "color"]);
const QUALIFIERS = new Set(["const", "input", "simple", "series"]);

function baseOfRawType(raw) {
	const parts = String(raw ?? "").trim().split(/\s+/);
	while (parts.length > 1 && QUALIFIERS.has(parts[0])) parts.shift();
	return parts.join(" ");
}

function scalarUnionMembers(raw) {
	const base = baseOfRawType(raw);
	if (!base.includes("/")) return null;
	const members = base.split("/").map((s) => s.trim());
	return members.every((m) => SCALAR_BASES.has(m)) ? members : null;
}

// ---------------------------------------------------------------------------
// Argument construction.
// ---------------------------------------------------------------------------

// A literal whose base is NOT in the union, so the call is guaranteed wrong at
// exactly this parameter. Order matters only in that a string is the least
// likely to be coerced anywhere; int/float are tried last because they are
// interchangeable in Pine and a union holding either accepts both.
function wrongArgFor(members) {
	const has = (m) => members.includes(m);
	if (!has("string")) return '"probe"';
	if (!has("bool")) return "true";
	if (!has("color")) return "color.red";
	if (!has("int") && !has("float")) return "1";
	return null; // every scalar base admitted - nothing is wrong here
}

// Fixtures for the non-scalar leading arguments - collections and drawing IDs.
// A third of the union parameters live on `line.set_y1`, `table.cell`,
// `array.binary_search` and friends, whose first argument is an ID no literal
// can express, so without these the sweep would silently skip them.
const FIXTURES = {
	"array<float>": { name: "fx_af", decl: "fx_af = array.new<float>(3, 1.0)" },
	// The percentile pair declares its id as a UNION-element array; a float
	// array satisfies it and nothing about the element type is under test here.
	"array<int/float>": { name: "fx_af", decl: "fx_af = array.new<float>(3, 1.0)" },
	"array<int>": { name: "fx_ai", decl: "fx_ai = array.new<int>(3, 1)" },
	"array<string>": { name: "fx_as", decl: 'fx_as = array.new<string>(3, "x")' },
	"matrix<float>": { name: "fx_mx", decl: "fx_mx = matrix.new<float>(2, 2, 1.0)" },
	box: { name: "fx_box", decl: "fx_box = box.new(0, 1.0, 1, 0.0)" },
	label: { name: "fx_lbl", decl: "fx_lbl = label.new(0, 0.0)" },
	line: { name: "fx_line", decl: "fx_line = line.new(0, 0.0, 1, 1.0)" },
	table: {
		name: "fx_tbl",
		decl: "fx_tbl = table.new(position.top_left, 2, 2)",
	},
	"chart.point": {
		name: "fx_pt",
		decl: "fx_pt = chart.point.from_index(0, 0.0)",
	},
};

// A collection function's `id` is typed "unknown" in the catalog (it is the
// overload marker - see hasOverloads), so the fixture has to come from the
// function's own namespace instead of from the parameter type.
function fixtureForUnknownId(fnName) {
	if (fnName.startsWith("array.")) return FIXTURES["array<float>"];
	if (fnName.startsWith("matrix.")) return FIXTURES["matrix<float>"];
	return null;
}

// A valid argument for a parameter we are NOT targeting. Returns { arg, decl }
// or null; null drops the whole probe rather than sending a second wrong
// argument and confusing the attribution.
function validArgFor(param, fnName) {
	if (Array.isArray(param.allowedValues) && param.allowedValues.length > 0) {
		return { arg: String(param.allowedValues[0]) };
	}
	const base = baseOfRawType(param.type);
	if (base === "unknown") {
		const fx = fixtureForUnknownId(fnName);
		return fx ? { arg: fx.name, decl: fx.decl } : null;
	}
	const members = scalarUnionMembers(param.type);
	const pick = members ? members[0] : base;
	switch (pick) {
		case "int":
			return { arg: "1" };
		case "float":
			return { arg: "1.0" };
		case "bool":
			return { arg: "true" };
		case "string":
			return { arg: '"x"' };
		case "color":
			return { arg: "color.red" };
		default: {
			const fx = FIXTURES[base];
			return fx ? { arg: fx.name, decl: fx.decl } : null;
		}
	}
}

// Every parameter the call must supply to reach the target: the required ones
// before it, in declaration order, plus any fixture declarations they need.
function leadingArgs(fn, targetIndex) {
	const out = [];
	const decls = [];
	for (let i = 0; i < targetIndex; i++) {
		const p = fn.parameters[i];
		if (!p.required) continue;
		const v = validArgFor(p, fn.name);
		if (v === null) return null;
		out.push(v.arg);
		if (v.decl) decls.push(v.decl);
	}
	out.decls = decls;
	return out;
}

// The required parameters AFTER the target. They have to be supplied too - a
// call missing one answers CE10165 and TV may never reach the type check that
// this probe exists to read. They are passed NAMED, which is legal after the
// named target (only a POSITIONAL argument may not follow a named one), so
// argument order stays valid whatever the declaration order is.
function trailingArgs(fn, targetIndex) {
	const out = [];
	const decls = [];
	for (let i = targetIndex + 1; i < fn.parameters.length; i++) {
		const p = fn.parameters[i];
		if (!p.required) continue;
		const v = validArgFor(p, fn.name);
		if (v === null) return null;
		out.push(`${p.name} = ${v.arg}`);
		if (v.decl) decls.push(v.decl);
	}
	out.decls = decls;
	return out;
}

function header(name) {
	return name.startsWith("strategy") ? 'strategy("probe")' : 'indicator("probe")';
}

function callName(name) {
	return name
		.replace("<type,type>", "<string, float>")
		.replace("<type>", "<float>");
}

// ---------------------------------------------------------------------------
// Census
// ---------------------------------------------------------------------------
const targets = [];
for (const fn of functions) {
	if (!Array.isArray(fn.parameters)) continue;
	fn.parameters.forEach((p, index) => {
		const members = scalarUnionMembers(p.type);
		if (!members) return;
		const wrong = wrongArgFor(members);
		const lead = leadingArgs(fn, index);
		const trail = trailingArgs(fn, index);
		targets.push({
			fn: fn.name,
			param: p.name,
			index,
			docType: p.type,
			members,
			wrong,
			lead,
			trail,
			ourNoun: `simple ${members[0]}`,
			blocked:
				wrong === null
					? "unprobeable"
					: lead === null || trail === null
						? "unbuildable-lead"
						: null,
		});
	});
}

if (censusOnly) {
	const fns = new Set(targets.map((t) => t.fn));
	const byUnion = {};
	const byBlocked = {};
	for (const t of targets) {
		const key = t.members.join("/");
		byUnion[key] = (byUnion[key] ?? 0) + 1;
		const b = t.blocked ?? "probeable";
		byBlocked[b] = (byBlocked[b] ?? 0) + 1;
	}
	console.log(`union parameters: ${targets.length} across ${fns.size} functions`);
	console.log(`\nby status:`);
	for (const [k, n] of Object.entries(byBlocked).sort((a, b) => b[1] - a[1]))
		console.log(`  ${String(n).padStart(4)}  ${k}`);
	console.log(`\nby union shape:`);
	for (const [k, n] of Object.entries(byUnion).sort((a, b) => b[1] - a[1]))
		console.log(`  ${String(n).padStart(4)}  ${k}`);
	const blocked = targets.filter((t) => t.blocked === "unbuildable-lead");
	if (blocked.length) {
		console.log(`\nunbuildable leading args (${blocked.length}):`);
		for (const t of blocked.slice(0, 40))
			console.log(`  ${t.fn}(${t.param}) : ${t.docType}`);
	}
	process.exit(0);
}

// ---------------------------------------------------------------------------
// Probe
// ---------------------------------------------------------------------------

// One script per function, one probe line per union parameter, so a whole
// function's parameters cost one TV call. Attribution is by line number.
function buildScript(fnName, group) {
	const lines = ["//@version=6", header(fnName)];
	// Fixture declarations first, deduplicated, so every probe line below can
	// reference them and the line numbering stays stable per script.
	const decls = new Set();
	for (const t of group) {
		for (const d of t.lead.decls ?? []) decls.add(d);
		for (const d of t.trail.decls ?? []) decls.add(d);
	}
	for (const d of decls) lines.push(d);
	const lineOf = new Map();
	for (const t of group) {
		// A variadic function refuses keyword arguments outright (CE10119), so
		// its probe has to be positional: the wrong value sits at the target's
		// own index with valid values before it and nothing after. That costs
		// the ctx.argDisplayName cross-check, so attribution falls back to
		// comparing names loosely - TV spells the variadic parameters
		// `number_0` where the catalog says `number0`.
		const call = t.positional
			? `${callName(fnName)}(${[...t.lead, t.wrong].join(", ")})`
			: `${callName(fnName)}(${[...t.lead, `${t.param} = ${t.wrong}`, ...t.trail].join(", ")})`;
		lines.push(`probe_${lines.length} = ${call}`);
		lineOf.set(lines.length, t);
	}
	lines.push("plot(close)");
	return { script: `${lines.join("\n")}\n`, lineOf };
}

async function tvVerdict(source) {
	try {
		const { stdout } = await execFileP("pine-lint", ["--tv", "-c", source], {
			timeout: 60000,
		});
		return JSON.parse(stdout);
	} catch {
		return null;
	}
}

function errorsOf(verdict) {
	return verdict?.result?.errors ?? verdict?.errors ?? [];
}

const probeable = targets.filter((t) => !t.blocked);
const groups = new Map();
for (const t of probeable) {
	if (!groups.has(t.fn)) groups.set(t.fn, []);
	groups.get(t.fn).push(t);
}

// --dry <fn> prints the generated script for one function and exits. The
// probes are machine-built, so being able to read one before spending a sweep
// on 141 of them is the difference between a bad fixture costing one look and
// costing the whole capture.
const dryIdx = args.indexOf("--dry");
if (dryIdx !== -1) {
	const want = args[dryIdx + 1];
	const group = probeable.filter((t) => t.fn === want);
	if (group.length === 0) {
		console.log(`no probeable union parameters on '${want}'`);
		process.exit(1);
	}
	process.stdout.write(buildScript(want, group).script);
	process.exit(0);
}

const prior = existsSync(OUT)
	? JSON.parse(readFileSync(OUT, "utf8"))
	: { results: {} };
const SETTLED = new Set(["ok", "unprobeable", "no-error"]);
const results = retryOnly ? prior.results : {};

const queue = [...groups.keys()]
	.filter((fn) => !retryOnly || groups.get(fn).some((t) => !SETTLED.has(results[`${t.fn}.${t.param}`]?.status)))
	.slice(0, limit);

for (const t of targets) {
	if (t.blocked) {
		results[`${t.fn}.${t.param}`] = {
			fn: t.fn,
			param: t.param,
			docType: t.docType,
			ourNoun: t.ourNoun,
			status: t.blocked === "unprobeable" ? "unprobeable" : "unbuildable-lead",
		};
	}
}

console.log(`probing ${queue.length} functions (${probeable.length} union params, concurrency 4)…`);

let done = 0;

// Record one parameter's verdict from the errors that landed on its line.
function record(t, probeLine, lineErrors) {
	// The CE10123 on this line must be about the parameter we targeted. It is
	// not always: `array.binary_search(sort_field = true)` makes TV complain
	// about `id` instead, because sort_field only applies to an array of user
	// types - so the wrong argument provoked a different parameter's error.
	// Recording that noun would bake `user_type` in as sort_field's expected
	// type, and nothing downstream could catch it. Attribution by
	// ctx.argDisplayName is the control that makes this sweep trustworthy.
	const loose = (s) => String(s ?? "").replace(/_/g, "");
	const all123 = lineErrors.filter((e) => e.code === "CE10123");
	const hit = all123.find(
		(e) => loose(e.ctx?.argDisplayName) === loose(t.param),
	);
	const key = `${t.fn}.${t.param}`;
	if (!hit && all123.length > 0) {
		results[key] = {
			fn: t.fn,
			param: t.param,
			docType: t.docType,
			members: t.members,
			ourNoun: t.ourNoun,
			probe: probeLine,
			answeredFor: all123.map((e) => e.ctx?.argDisplayName ?? null),
			errors: all123.map((e) => ({ code: e.code, message: e.message })),
			status: "mismatched-arg",
		};
		return;
	}
	if (hit) {
		results[key] = {
			fn: t.fn,
			param: t.param,
			docType: t.docType,
			members: t.members,
			ourNoun: t.ourNoun,
			tvNoun: hit.ctx?.currentTypeDocStr ?? null,
			tvArgName: hit.ctx?.argDisplayName ?? null,
			agrees: (hit.ctx?.currentTypeDocStr ?? null) === t.ourNoun,
			probe: probeLine,
			status: "ok",
		};
	} else if (lineErrors.length === 0) {
		results[key] = {
			fn: t.fn,
			param: t.param,
			docType: t.docType,
			members: t.members,
			ourNoun: t.ourNoun,
			probe: probeLine,
			status: "no-error",
		};
	} else {
		results[key] = {
			fn: t.fn,
			param: t.param,
			docType: t.docType,
			members: t.members,
			ourNoun: t.ourNoun,
			probe: probeLine,
			errors: lineErrors.map((e) => ({ code: e.code, message: e.message })),
			status: "other-error",
		};
	}
}

async function runGroup(fnName, group) {
	const { script, lineOf } = buildScript(fnName, group);
	const verdict = await tvVerdict(script);
	if (!verdict || verdict.success === false) {
		for (const t of group)
			results[`${t.fn}.${t.param}`] = {
				fn: t.fn,
				param: t.param,
				docType: t.docType,
				ourNoun: t.ourNoun,
				status: "no-verdict",
			};
		return;
	}
	const errors = errorsOf(verdict);
	// A variadic function refuses keyword arguments; retry the group
	// positionally. Guarded by the flag so the retry cannot loop.
	if (errors.some((e) => e.code === "CE10119") && !group[0].positional) {
		for (const t of group) t.positional = true;
		await runGroup(fnName, group);
		return;
	}
	// A parse error poisons every line - fall back to one probe per script.
	const parseBroken = errors.some((e) => !e.code);
	if (parseBroken && group.length > 1) {
		for (const t of group) await runGroup(fnName, [t]);
		return;
	}
	const scriptLines = script.split("\n");
	for (const [lineNo, t] of lineOf) {
		const lineErrors = errors.filter((e) => (e.start?.line ?? e.line) === lineNo);
		record(t, scriptLines[lineNo - 1], lineErrors);
	}
}

async function worker(q) {
	for (;;) {
		const fnName = q.shift();
		if (!fnName) return;
		await runGroup(fnName, groups.get(fnName));
		done++;
		if (done % 25 === 0) console.log(`  ${done}/${queue.length}`);
	}
}

const q = [...queue];
await Promise.all([1, 2, 3, 4].map(() => worker(q)));

const summary = {};
let agree = 0;
let disagree = 0;
for (const r of Object.values(results)) {
	summary[r.status] = (summary[r.status] ?? 0) + 1;
	if (r.status === "ok") r.agrees ? agree++ : disagree++;
}

writeFileSync(
	OUT,
	JSON.stringify(
		{
			description:
				"TV-probed expected-type noun (CE10123 currentTypeDocStr) per union-typed parameter. One deliberately-wrong argument per parameter; the noun cannot be derived from the catalog. See INV171, TODO #74.",
			probedAt: new Date().toISOString(),
			tool: "scripts/probe-union-type-nouns.mjs",
			results,
		},
		null,
		"\t",
	),
);

console.log(`done: ${JSON.stringify(summary)}`);
console.log(`nouns: ${agree} agree with ours, ${disagree} disagree`);
console.log(`written: ${OUT}`);
