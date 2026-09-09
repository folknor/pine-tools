// INV182: measure the QUALIFIER TradingView assigns to a user variable.
//
// Why: our CE10123 renders every bare user variable as `series <base>` (the
// `bareIdentifierQualifier` default in describeArgForTemplate), because symbol
// types are stored unqualified. TV says `const float` for `float len = 14.0`
// and `const bool` for `bool b = true`. The qualifier is the entire subject of
// that class of error - `series` versus `const` is the difference between
// "restructure this" and "it is already constant, the call is simply wrong" -
// so rendering the strongest qualifier every time makes the message useless in
// exactly the cases where it is easiest to act on.
//
// Method: declare the variable, then READ it through `str.length()`, which
// expects a string and so names the argument's own type for any base type
// (verified for float/int/bool). TV reports every such error in one pass - its
// first-error stop is PARSE-only (INV171) - but each case still gets its own
// script, because a reassignment in one case would otherwise change another.
//
// TV's answer is read from `ctx.argumentType`, not from the rendered prose.
//
// Controls: a script TV must accept and one TV must reject, before and after,
// since an empty error list from a throttled --tv call is indistinguishable
// from "TV accepted it" (G002).
//
// Usage:
//   node scripts/probe-variable-qualifiers.mjs --dry
//   node scripts/probe-variable-qualifiers.mjs
//   node scripts/probe-variable-qualifiers.mjs --filter reassign

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const argv = process.argv.slice(2);
const opt = (f, d) => {
	const i = argv.indexOf(f);
	return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const FILTER = opt("--filter", null);
const DELAY = Number(opt("--delay", "400"));
const DRY = argv.includes("--dry");
const OUT = opt(
	"--out",
	path.join(root, "investigations", "INV182-user-variable-qualifier", "probe.json"),
);

const HEAD = '//@version=6\nindicator("x")\n';

// Each case declares `x` and is read through str.length(x). `expect` is what we
// currently render, recorded so the diff is visible in the output rather than
// computed later; it is NOT an assertion.
const CASES = [
	// --- literal initializers, the reported cases -------------------------
	{ name: "literal-float", decl: ["float x = 14.0"] },
	{ name: "literal-int", decl: ["int x = 14"] },
	{ name: "literal-bool", decl: ["bool x = true"] },
	{ name: "literal-float-untyped", decl: ["x = 14.0"] },
	{ name: "literal-arith", decl: ["float x = 14.0 * 2"] },
	{ name: "literal-na", decl: ["float x = na"] },

	// --- explicit qualifier annotations ------------------------------------
	{ name: "annot-const", decl: ["const float x = 14.0"] },
	{ name: "annot-simple", decl: ["simple float x = 14.0"] },
	{ name: "annot-series", decl: ["series float x = 14.0"] },

	// --- persistence keywords ----------------------------------------------
	{ name: "var-literal", decl: ["var float x = 14.0"] },
	{ name: "varip-literal", decl: ["varip float x = 14.0"] },

	// --- builtin-sourced ----------------------------------------------------
	{ name: "from-series-builtin", decl: ["float x = close"] },
	{ name: "from-simple-builtin", decl: ["float x = syminfo.mintick"] },
	{ name: "from-int-builtin", decl: ["int x = bar_index"] },

	// --- input --------------------------------------------------------------
	{ name: "from-input", decl: ["float x = input.float(1.0)"] },
	{ name: "from-input-arith", decl: ["float x = input.float(1.0) * 2"] },
	{
		name: "from-input-annot-simple",
		decl: ["simple float x = input.float(1.0) * 2"],
	},

	// --- calls ---------------------------------------------------------------
	{ name: "from-const-call", decl: ["float x = math.max(1.0, 2.0)"] },
	{ name: "from-series-call", decl: ["float x = ta.sma(close, 5)"] },

	// --- ternary -------------------------------------------------------------
	{ name: "ternary-const", decl: ["float x = true ? 1.0 : 2.0"] },
	{ name: "ternary-series", decl: ["float x = close > open ? 1.0 : 2.0"] },

	// --- comparison (finding 12's shape) -------------------------------------
	{ name: "compare-builtins", decl: ["bool x = close > open"] },
	{ name: "compare-consts", decl: ["bool x = 2.0 > 1.0"] },

	// --- reassignment ---------------------------------------------------------
	// The question these answer: is the qualifier a property of the
	// DECLARATION alone, or of every assignment the variable ever receives?
	{ name: "reassign-const", decl: ["float x = 14.0", "x := 15.0"] },
	{ name: "reassign-series", decl: ["float x = 14.0", "x := close"] },
	{
		name: "reassign-series-conditional",
		decl: ["float x = 14.0", "if bar_index > 5", "    x := close"],
	},
	// Reassignment AFTER the read - does order matter, or is it whole-scope?
	{ name: "reassign-after-read", decl: ["float x = 14.0"], after: ["x := close"] },

	// --- function parameters ----------------------------------------------------
	{ name: "param-typed", fn: "f(float p) =>\n    str.length(p)", call: "f(14.0)" },
	{ name: "param-untyped", fn: "f(p) =>\n    str.length(p)", call: "f(14.0)" },
];

function buildScript(c) {
	if (c.fn) {
		return `${HEAD}${c.fn}\nplot(${c.call})\n`;
	}
	const lines = [...c.decl, "plot(str.length(x))", ...(c.after ?? [])];
	return `${HEAD}${lines.join("\n")}\n`;
}

const CONTROLS = {
	clean: { src: `${HEAD}plot(close)\n`, expect: "clean" },
	dirty: { src: `${HEAD}plot(nosuchvariable)\n`, expect: "errors" },
};

function run(args, src) {
	return new Promise((res) => {
		const c = spawn("pine-lint", [...args, "-c", src], {
			stdio: ["ignore", "pipe", "pipe"],
		});
		let out = "";
		c.stdout.on("data", (d) => (out += d));
		c.on("close", () => res(out));
		c.on("error", () => res(""));
	});
}

function errorsOf(raw) {
	let j;
	try {
		j = JSON.parse(raw);
	} catch {
		return null;
	}
	if (j.success !== true) return null;
	return j.result?.errors ?? j.errors ?? [];
}

// The qualifier TV (or we) attributed to the argument, from the structured ctx
// where there is one and from the prose only as a fallback.
function qualifierOf(errs) {
	if (!errs) return null;
	for (const e of errs) {
		if (e.ctx?.argumentType) return e.ctx.argumentType;
		const m = /An argument of "([^"]+)" type was used/.exec(e.message ?? "");
		if (m) return m[1];
	}
	return null;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function control(name, { src, expect }) {
	const errs = errorsOf(await run(["--tv"], src));
	if (errs === null) throw new Error(`control "${name}": no usable --tv result`);
	const got = errs.length === 0 ? "clean" : "errors";
	if (got !== expect) throw new Error(`control "${name}": expected ${expect}, got ${got}`);
}

async function main() {
	const cases = FILTER ? CASES.filter((c) => c.name.includes(FILTER)) : CASES;

	if (DRY) {
		for (const c of cases) process.stdout.write(`--- ${c.name}\n${buildScript(c)}\n`);
		process.stdout.write(`${cases.length} probes\n`);
		return;
	}

	process.stdout.write("controls... ");
	await control("clean", CONTROLS.clean);
	await sleep(DELAY);
	await control("dirty", CONTROLS.dirty);
	process.stdout.write("ok\n");

	const rows = [];
	let n = 0;
	for (const c of cases) {
		const src = buildScript(c);
		await sleep(DELAY);
		const tvErrs = errorsOf(await run(["--tv"], src));
		const localErrs = errorsOf(await run([], src));
		const tv = qualifierOf(tvErrs);
		const local = qualifierOf(localErrs);
		n += 1;
		rows.push({
			name: c.name,
			src,
			tv,
			local,
			agree: tv !== null && tv === local,
			tvUsable: tvErrs !== null,
		});
		const mark = tv === null ? "TV-SILENT" : tv === local ? "ok" : `${local} -> ${tv}`;
		process.stdout.write(`[${n}/${cases.length}] ${c.name.padEnd(28)} ${mark}\n`);
	}

	process.stdout.write("controls (post)... ");
	await sleep(DELAY);
	await control("clean", CONTROLS.clean);
	await sleep(DELAY);
	await control("dirty", CONTROLS.dirty);
	process.stdout.write("ok\n");

	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, `${JSON.stringify({ date: new Date().toISOString(), rows }, null, 2)}\n`);

	const disagree = rows.filter((r) => r.tv !== null && r.tv !== r.local);
	process.stdout.write(`\n${disagree.length} disagreements of ${rows.length} -> ${OUT}\n`);
	for (const d of disagree)
		process.stdout.write(`  ${d.name.padEnd(28)} we ${d.local} / TV ${d.tv}\n`);
}

main().catch((e) => {
	process.stderr.write(`${e.message}\n`);
	process.exit(1);
});
