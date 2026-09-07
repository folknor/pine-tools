// INV178 probe grid: what may a UDT FIELD default be?
//
// The sibling of INV172's grid (UDF parameter defaults). INV172 established
// that fields share the rule but anchor CE10134 differently, so this grid
// measures every cell on the field shape rather than inheriting the answers.
// One shape per script, because TV truncates multi-violation scripts.
//
//   node investigations/INV178-udt-field-defaults/probes/grid.mjs
//   node investigations/INV178-udt-field-defaults/probes/grid.mjs --local
//
// --local runs our own validator, so the grid doubles as the after-the-fix
// check.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const local = process.argv.includes("--local");

const PREAMBLE = [
	"//@version=6",
	'indicator("INV178")',
	"userVar = 42",
	"userFn(int a) => a + 1",
];

// Each cell: [field type, default expression]. The field is the SECOND field
// so the anchor of a field-level code can be told apart from the type line.
const CELLS = {
	// --- literals: expected clean ---
	"int literal": ["int", "5"],
	"float literal": ["float", "5.5"],
	"negative int literal": ["int", "-5"],
	"string literal": ["string", '"a"'],
	"bool literal": ["bool", "true"],
	"color literal": ["color", "#FF0000"],
	"na literal typed": ["float", "na"],

	// --- builtin references ---
	"builtin variable": ["float", "close"],
	"builtin constant": ["color", "color.red"],
	"builtin namespaced const": ["string", "text.align_right"],
	"builtin call no args": ["int", "timenow"],

	// --- user references ---
	"user variable": ["int", "userVar"],
	"negated user variable": ["int", "-userVar"],

	// --- calls ---
	"builtin function call": ["int", "math.max(1, 2)"],
	"user function call": ["int", "userFn(1)"],
	"cast call": ["int", "int(na)"],

	// --- calculations ---
	"binary arithmetic": ["float", "1 + 2"],
	"unary minus on expr": ["int", "-(1)"],
	"parenthesised literal": ["int", "(5)"],
	"ternary": ["int", "true ? 1 : 2"],
	"comparison": ["bool", "1 > 2"],
	"builtin var arithmetic": ["float", "close + 1"],
	"string concat": ["string", '"a" + "b"'],
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
for (const [name, [ftype, expr]] of Object.entries(CELLS)) {
	const script = `${PREAMBLE.join("\n")}\ntype T\n    int a = 1\n    ${ftype} b = ${expr}\nt = T.new()\nplot(t.a)\n`;
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
for (const [name, expr, codes, msg] of rows) {
	console.log(`${pad(name, 26)} ${pad(expr, 22)} ${codes}${msg ? `  ${msg}` : ""}`);
}
