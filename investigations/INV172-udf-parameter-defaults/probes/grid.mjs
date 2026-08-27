// INV172 probe grid: what may a UDF parameter DEFAULT be?
//
// TV rejects some default expressions with CE10133 and others with CE10134,
// and its own wording is unreliable (CE10133 says "cannot be a function,
// variable or calculation" while TV plainly ACCEPTS `y = close`). So the codes
// have to be read off the SHAPE, which is what this grid measures.
//
// One shape per script, because a second error in the same script could come
// from the shape rather than the default and the attribution would be a guess.
//
//   node investigations/INV172-udf-parameter-defaults/probes/grid.mjs
//   node investigations/INV172-udf-parameter-defaults/probes/grid.mjs --local
//
// --local runs our own validator instead of TV, so the same grid doubles as
// the after-the-fix check.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const local = process.argv.includes("--local");

// Every cell is a DEFAULT expression for the second parameter. The preamble
// declares a user variable and a user function so the user-vs-builtin
// distinction can be probed on both.
const PREAMBLE = [
	"//@version=6",
	'indicator("INV172")',
	"userVar = 42",
	"userFn(int a) => a + 1",
];

const CELLS = {
	// --- literals: expected clean ---
	"int literal": "5",
	"float literal": "5.5",
	"negative int literal": "-5",
	"string literal": '"a"',
	"bool literal": "true",
	"color literal": "#FF0000",
	"na literal": "na",

	// --- builtin references: the CE10133 wording says "variable" ---
	"builtin variable": "close",
	"builtin constant": "color.red",
	"builtin namespaced const": "text.align_right",

	// --- user references ---
	"user variable": "userVar",

	// --- calls ---
	"builtin function call": "math.max(1, 2)",
	"user function call": "userFn(1)",
	"builtin call no args": "timenow",

	// --- calculations ---
	"binary arithmetic": "1 + 2",
	"unary minus on expr": "-(1)",
	"parenthesised literal": "(5)",
	"ternary": "true ? 1 : 2",
	"comparison": "1 > 2",
	"builtin var arithmetic": "close + 1",
};

async function verdict(source) {
	const args = local ? ["-c", source] : ["--tv", "-c", source];
	try {
		const { stdout } = await execFileP("pine-lint", args, { timeout: 60000 });
		return JSON.parse(stdout);
	} catch (e) {
		if (e.stdout) {
			try {
				return JSON.parse(e.stdout);
			} catch {
				/* fall through */
			}
		}
		return null;
	}
}

const rows = [];
for (const [name, expr] of Object.entries(CELLS)) {
	const script = `${PREAMBLE.join("\n")}\nf(int x, y = ${expr}) => x\nplot(f(1))\n`;
	const v = await verdict(script);
	if (!v || v.success === false) {
		rows.push([name, expr, "NO-VERDICT", ""]);
		continue;
	}
	const errors = v.result?.errors ?? v.errors ?? [];
	const codes = errors
		.map((e) => `${e.code ?? "?"}@${e.start?.line}:${e.start?.column}`)
		.join(" | ");
	rows.push([name, expr, errors.length ? codes : "clean", errors[0]?.message ?? ""]);
}

const pad = (s, n) => String(s).padEnd(n);
console.log(local ? "=== LOCAL ===" : "=== TRADINGVIEW ===");
for (const [name, expr, codes] of rows) {
	console.log(`${pad(name, 26)} ${pad(expr, 22)} ${codes}`);
}
