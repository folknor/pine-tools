// INV179: enumerate the words TradingView refuses in a BINDING position.
//
// Why a sweep and not a two-word fix: `pine-lint -H` accepts `f(float to)` and
// `f(float from)` while TV rejects both, but with DIFFERENT messages - `to`
// draws the explicit `""to"" cannot be used as a variable or function name.`
// and `from` draws a bare `Syntax error at input "from"`. Two words diagnosed
// two ways means the rule is not "the lexer's keyword set", so the accepted set
// has to be measured rather than reasoned about.
//
// Method: for each candidate word W and each binding position, build a script
// whose ONLY questionable element is the name W, send it through
// `pine-lint --tv`, and record TV's raw verdict. Positions are probed
// separately because TV need not treat them alike (a word may be legal as a
// variable and illegal as a parameter).
//
// Every run also sends two CONTROLS: a script TV must accept and one TV must
// reject. If either control comes back wrong the sweep aborts - an empty error
// list from a crashed or throttled --tv call is indistinguishable from
// "TV accepted it", and that exact ambiguity manufactured gotcha G002.
//
// Usage:
//   node scripts/probe-reserved-word-bindings.mjs --dry      # print probes, no network
//   node scripts/probe-reserved-word-bindings.mjs            # full sweep
//   node scripts/probe-reserved-word-bindings.mjs --filter to
//   node scripts/probe-reserved-word-bindings.mjs --position param
//   node scripts/probe-reserved-word-bindings.mjs --delay 600
//   node scripts/probe-reserved-word-bindings.mjs --out path.json

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, "..");

const argv = process.argv.slice(2);
const opt = (flag, def) => {
	const i = argv.indexOf(flag);
	return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const FILTER = opt("--filter", null);
const POSITION = opt("--position", null);
const DELAY = Number(opt("--delay", "450"));
const DRY = argv.includes("--dry");
const OUT = opt(
	"--out",
	path.join(root, "investigations", "INV179-reserved-words-binding", "probe.json"),
);

// The candidate set is deliberately WIDER than any list we already hold: the
// lexer's keywords, the words the reference calls keywords, the loop-header
// words the lexer knows (`to`, `by`, `in`) and the one it does not (`from`),
// plus the qualifiers and base types. Words TV turns out to accept are as much
// of a result as words it rejects, so nothing is pre-filtered.
const CANDIDATES = [
	// control flow
	"if",
	"else",
	"for",
	"while",
	"break",
	"continue",
	"return",
	"switch",
	"case",
	"default",
	"do",
	// declarations
	"var",
	"varip",
	"const",
	// special values / literals
	"na",
	"true",
	"false",
	// module system
	"export",
	"import",
	"as",
	// loop header words
	"in",
	"to",
	"by",
	"from",
	// user-defined types
	"type",
	"enum",
	"method",
	// logical operators
	"and",
	"or",
	"not",
	// conditional structure (INV177)
	"once",
	// declaration statements the reference lists as keywords
	"indicator",
	"strategy",
	"library",
	// base types
	"int",
	"float",
	"bool",
	"string",
	"color",
	"line",
	"label",
	"box",
	"table",
	"array",
	"matrix",
	"map",
	// qualifiers
	"series",
	"simple",
	"input",
];

const HEAD = '//@version=6\nindicator("x")\n';

// Each position binds W and then READS it, so a word that survives the binding
// cannot pass merely by being unused.
const POSITIONS = {
	param: (w) => `${HEAD}f(float ${w}) =>\n    ${w} * 2\nplot(f(close))\n`,
	fnName: (w) => `${HEAD}${w}(float x) =>\n    x * 2\nplot(${w}(close))\n`,
	assign: (w) => `${HEAD}${w} = 1.0\nplot(${w})\n`,
	varDecl: (w) => `${HEAD}var float ${w} = 1.0\nplot(${w})\n`,
	forCounter: (w) => `${HEAD}float n = 0.0\nfor ${w} = 0 to 5\n    n += ${w}\nplot(n)\n`,
	forInCounter: (w) =>
		`${HEAD}float n = 0.0\nfor ${w} in array.from(1.0, 2.0)\n    n += ${w}\nplot(n)\n`,
	udtField: (w) => `${HEAD}type T\n    float ${w}\nT t = T.new(1.0)\nplot(t.${w})\n`,
};

const CONTROLS = {
	// TV must accept this one.
	clean: { src: `${HEAD}plot(close)\n`, expect: "clean" },
	// TV must reject this one - proves the call reached TV rather than
	// returning an empty result from a crash or a fallback.
	dirty: { src: `${HEAD}plot(nosuchvariable)\n`, expect: "errors" },
};

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

function runLocal(src) {
	return new Promise((res) => {
		const c = spawn("pine-lint", ["-c", src], { stdio: ["ignore", "pipe", "pipe"] });
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
	// A clean TV response carries NO `errors` key at all, so a missing key is
	// "no errors" rather than "no answer". `success:true` is what separates the
	// two; the dirty control is what proves `success:true` came from TV and not
	// from an empty local fallback.
	return j.result?.errors ?? j.errors ?? [];
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function control(name, { src, expect }) {
	const { out, err } = await runTv(src);
	const errs = errorsOf(out);
	if (errs === null) {
		throw new Error(`control "${name}": --tv returned no usable result (${err || out})`);
	}
	const got = errs.length === 0 ? "clean" : "errors";
	if (got !== expect) {
		throw new Error(`control "${name}": expected TV ${expect}, got ${got}: ${out}`);
	}
}

async function main() {
	const positions = POSITION ? [POSITION] : Object.keys(POSITIONS);
	for (const p of positions) {
		if (!POSITIONS[p]) throw new Error(`unknown position "${p}"`);
	}
	const words = FILTER ? CANDIDATES.filter((w) => w.includes(FILTER)) : CANDIDATES;

	if (DRY) {
		for (const w of words) {
			for (const p of positions) {
				process.stdout.write(`--- ${w} / ${p}\n${POSITIONS[p](w)}\n`);
			}
		}
		process.stdout.write(`${words.length * positions.length} probes\n`);
		return;
	}

	process.stdout.write("controls... ");
	await control("clean", CONTROLS.clean);
	await sleep(DELAY);
	await control("dirty", CONTROLS.dirty);
	process.stdout.write("ok\n");

	const rows = [];
	let n = 0;
	const total = words.length * positions.length;
	for (const w of words) {
		for (const p of positions) {
			const src = POSITIONS[p](w);
			await sleep(DELAY);
			const { out, err } = await runTv(src);
			const tvErrors = errorsOf(out);
			const localRaw = await runLocal(src);
			const localErrors = errorsOf(localRaw);
			n += 1;
			const row = {
				word: w,
				position: p,
				src,
				tv:
					tvErrors === null
						? { usable: false, raw: (err || out).slice(0, 400) }
						: {
								usable: true,
								rejected: tvErrors.length > 0,
								errors: tvErrors.map((e) => ({
									code: e.code ?? null,
									message: e.message,
									line: e.line ?? e.start?.line ?? null,
									column: e.column ?? e.start?.column ?? null,
								})),
							},
				local:
					localErrors === null
						? { usable: false }
						: {
								usable: true,
								rejected: localErrors.length > 0,
								errors: localErrors.map((e) => ({
									code: e.code ?? null,
									message: e.message,
								})),
							},
			};
			row.gap =
				row.tv.usable && row.local.usable && row.tv.rejected && !row.local.rejected;
			rows.push(row);
			const mark = !row.tv.usable ? "?" : row.gap ? "GAP" : row.tv.rejected ? "tv" : "-";
			process.stdout.write(`[${n}/${total}] ${w} / ${p}: ${mark}\n`);
		}
	}

	// Re-run the controls at the END too. A sweep that starts healthy can be
	// throttled into returning empty results halfway through, and every one of
	// those would read as "TV accepts".
	process.stdout.write("controls (post)... ");
	await sleep(DELAY);
	await control("clean", CONTROLS.clean);
	await sleep(DELAY);
	await control("dirty", CONTROLS.dirty);
	process.stdout.write("ok\n");

	fs.mkdirSync(path.dirname(OUT), { recursive: true });
	fs.writeFileSync(OUT, `${JSON.stringify({ date: new Date().toISOString(), rows }, null, 2)}\n`);

	const gaps = rows.filter((r) => r.gap);
	process.stdout.write(`\n${gaps.length} gaps of ${rows.length} probes -> ${OUT}\n`);
	const byWord = new Map();
	for (const g of gaps) {
		if (!byWord.has(g.word)) byWord.set(g.word, []);
		byWord.get(g.word).push(g.position);
	}
	for (const [w, ps] of byWord) process.stdout.write(`  ${w}: ${ps.join(", ")}\n`);
}

main().catch((e) => {
	process.stderr.write(`${e.message}\n`);
	process.exit(1);
});
