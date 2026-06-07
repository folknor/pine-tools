// Probe TV for the ground-truth REQUIRED params of every catalog function
// (INV050 / TODO #21). A zero-arg call makes TV enumerate every missing
// required param as CE10165 (`No value assigned to the "<name>" parameter in
// <fn>()`, one record per param, ctx carries the param name), so one probe
// per function yields its full required set; a clean verdict means all params
// are optional. The reference prose under-documents optionality (plot.title
// et al carry no "optional" marker), so this probe is the only reliable
// source - see INV050.
//
// Wrinkles found while piloting (all INV050-documented):
// - TV's translator CRASHES (`TypeError: a.pinePos is not a function` inside
//   a success:true envelope - the G002 trap shape) when a collection fn's
//   `id` (or max_bars_back's `var`) is missing. Crash records carry no
//   `code`; the fn is retried with the first param supplied (a fresh typed
//   collection / `close`), which makes TV enumerate the REST. The first
//   param itself is recorded in `requiredAssumed`: no direct CE10165
//   verdict exists for it, but TV demonstrably never compiles the call
//   without it (every zero-arg variant crashes).
// - Catalog template names (`array.new<type>`) are called instantiated
//   (`array.new<float>`).
// - Void fns reject the `x = fn()` wrapper (CE10098); the bare-statement
//   variant follows.
// - Variadic fns answer CE10118 `Wrong number of args` + a CE10165 whose
//   ctx.name is the GROUP ("arg0, arg1, ..."); they get status "variadic" -
//   arity stays governed by the authoritative `variadic` minArgs map
//   (TODO #21), not this probe.
//
// Writes pine-data/raw/v6/required-params-probe.json: per function the exact
// probe script, TV's raw errors, the derived required list, and a status:
//   ok           every error is CE10165 (or ignorable noise, or none)
//   id-supplied  first param assumed required (see above), rest enumerated
//   variadic     variadic arity - excluded from requiredness application
//   ambiguous    TV returned other coded errors - needs manual follow-up
//   crash        every variant crashed TV's translator
//   no-verdict   TV call failed (transient - retry)
//
// Usage:
//   node scripts/probe-required-params.mjs --limit 10      # pilot
//   node scripts/probe-required-params.mjs                 # full catalog
//   node scripts/probe-required-params.mjs --retry         # re-probe only not-yet-ok entries
// Concurrency 4 (same etiquette as find-real-failures.mjs).

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const execFileP = promisify(execFile);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(root, "pine-data/raw/v6/required-params-probe.json");

const functions = JSON.parse(
	readFileSync(join(root, "pine-data/v6/functions.json"), "utf8"),
);
const byName = new Map(functions.map((f) => [f.name, f]));

const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit = limitIdx !== -1 ? Number(args[limitIdx + 1]) : Infinity;
const retryOnly = args.includes("--retry");

const SETTLED = new Set(["ok", "id-supplied", "variadic"]);
const prior =
	existsSync(OUT) ? JSON.parse(readFileSync(OUT, "utf8")) : { results: {} };

// Catalog names can be templates - call them instantiated.
function callName(name) {
	return name
		.replace("<type,type>", "<string, float>")
		.replace("<type>", "<float>");
}

// Fixture for the first param of crash-prone fns: a fresh collection of the
// matching kind, or `close` for series params (max_bars_back).
function firstArgFixture(fn) {
	const t = fn?.parameters?.[0]?.type ?? "";
	const ns = fn?.name ?? "";
	if (/array/.test(t) || /^array\./.test(ns))
		return { decl: "a0 = array.new<float>(3)", arg: "a0" };
	if (/map/.test(t) || /^map\./.test(ns))
		return { decl: "m0 = map.new<string, float>()", arg: "m0" };
	if (/matrix/.test(t) || /^matrix\./.test(ns))
		return { decl: "mx0 = matrix.new<float>(2, 2)", arg: "mx0" };
	if (/series/.test(t)) return { decl: null, arg: "close" };
	return null;
}

function probeVariants(name) {
	const fn = byName.get(name);
	const call = callName(name);
	const header = name.startsWith("strategy")
		? 'strategy("probe")'
		: 'indicator("probe")';
	const variants = [
		{
			kind: "zero-arg",
			script: `//@version=6\n${header}\nx = ${call}()\nplot(close)\n`,
		},
		{
			kind: "zero-arg",
			script: `//@version=6\n${header}\n${call}()\nplot(close)\n`,
		},
		{
			kind: "zero-arg",
			script: `//@version=6\n${header}\nplot(${call}())\n`,
		},
	];
	const fixture = firstArgFixture(fn);
	if (fixture) {
		const decl = fixture.decl ? `${fixture.decl}\n` : "";
		variants.push({
			kind: "id-supplied",
			firstParam: fn?.parameters?.[0]?.name,
			script: `//@version=6\n${header}\n${decl}${call}(${fixture.arg})\nplot(close)\n`,
		});
	}
	return variants;
}

async function tvVerdict(source) {
	try {
		const { stdout } = await execFileP(
			"pine-lint",
			["--tv", "-c", source],
			{ timeout: 60000 },
		);
		return JSON.parse(stdout);
	} catch {
		return null;
	}
}

// Noise that says nothing about the call's own params.
const IGNORABLE_RE =
	/should be assigned to a variable|unused|Script .* output/i;

function classify(verdict) {
	if (!verdict || verdict.success === false) return { status: "no-verdict" };
	const errors = (verdict.result?.errors ?? verdict.errors ?? []).map(
		(e) => ({ code: e.code, ctx: e.ctx, message: e.message }),
	);
	const required = [];
	let variadicGroup = false;
	let foreign = false;
	let crashed = false;
	for (const e of errors) {
		if (e.code === "CE10165" && e.ctx?.name) {
			// A comma/ellipsis "name" is the variadic group, not a param.
			if (/,|\.\.\./.test(e.ctx.name)) variadicGroup = true;
			else required.push(e.ctx.name);
		} else if (!e.code) crashed = true; // TV-internal exception record
		else if (e.code === "CE10118") variadicGroup = true; // wrong number of args
		else if (!IGNORABLE_RE.test(e.message ?? "")) foreign = true;
	}
	if (crashed) return { status: "crash", errors };
	if (variadicGroup && !foreign) return { status: "variadic", required, errors };
	return { status: foreign ? "ambiguous" : "ok", required, errors };
}

const RANK = { ok: 0, "id-supplied": 1, variadic: 2, ambiguous: 3, crash: 4, "no-verdict": 5 };

const targets = functions
	.map((f) => f.name)
	.filter((name) => !retryOnly || !SETTLED.has(prior.results[name]?.status))
	.slice(0, limit);

console.log(`probing ${targets.length} functions (concurrency 4)…`);

const results = retryOnly ? prior.results : {};
let done = 0;

async function worker(queue) {
	for (;;) {
		const name = queue.shift();
		if (!name) return;
		let best = null;
		for (const variant of probeVariants(name)) {
			const c = classify(await tvVerdict(variant.script));
			let entry;
			if (variant.kind === "id-supplied" && (c.status === "ok" || c.status === "variadic")) {
				entry = {
					probe: variant.script,
					status: "id-supplied",
					requiredAssumed: [variant.firstParam],
					required: c.required,
					errors: c.errors,
				};
			} else {
				entry = { probe: variant.script, ...c };
			}
			if (!best || RANK[entry.status] < RANK[best.status]) best = entry;
			if (entry.status === "ok" || entry.status === "variadic") break;
		}
		results[name] = best;
		done++;
		if (done % 25 === 0) console.log(`  ${done}/${targets.length}`);
	}
}

const queue = [...targets];
await Promise.all([1, 2, 3, 4].map(() => worker(queue)));

const summary = {};
for (const r of Object.values(results))
	summary[r.status] = (summary[r.status] ?? 0) + 1;

writeFileSync(
	OUT,
	JSON.stringify(
		{
			description:
				"TV-probed required params per function: zero-arg call, required set = TV's CE10165 enumeration. See INV050.",
			probedAt: new Date().toISOString(),
			tool: "scripts/probe-required-params.mjs",
			results,
		},
		null,
		"\t",
	),
);

console.log(`done: ${JSON.stringify(summary)}`);
console.log(`written: ${OUT}`);
for (const [name, r] of Object.entries(results)) {
	if (!SETTLED.has(r.status))
		console.log(
			`  ${r.status.padEnd(10)} ${name}: ${(r.errors ?? [])
				.map((e) => e.code ?? e.message)
				.join(" | ")
				.slice(0, 110)}`,
		);
}
