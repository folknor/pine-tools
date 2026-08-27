// INV173 probe grid: when a user variable SHADOWS a builtin name, does TV
// still check member calls on it?
//
// INV170's leftover probe found `color.pushx(2.0)` clean at TV while
// `math.pushx(2.0)` is CE10271, on identical receivers. Six cells killed the
// two obvious single-property hypotheses ("shadows a namespace", "is a type
// name") and left the INTERSECTION as the surviving candidate, unpinned. This
// grid probes every name in that class plus controls on each side.
//
//   node investigations/INV173-namespace-shadow-method-calls/probes/grid.mjs
//   node .../grid.mjs --local        # our side, same grid
//
// Each cell declares `<name> = <receiver>` and then calls `<name>.<member>()`.
// The member is always absent from every catalog namespace, so a checking TV
// must reject it; a clean verdict means TV stopped checking.

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileP = promisify(execFile);
const local = process.argv.includes("--local");

// classification of each receiver NAME, from the catalog's own point of view
const NAMES = [
	// both a TYPE and a NAMESPACE - the candidate lenient class
	["color", "type+namespace"],
	["label", "type+namespace"],
	["line", "type+namespace"],
	["box", "type+namespace"],
	["table", "type+namespace"],
	["linefill", "type+namespace"],
	["polyline", "type+namespace"],
	// NAMESPACE only
	["math", "namespace"],
	["ta", "namespace"],
	["str", "namespace"],
	["syminfo", "namespace"],
	["request", "namespace"],
	// TYPE only
	["string", "type"],
	["int", "type"],
	["float", "type"],
	["bool", "type"],
	// neither - the baseline
	["arr", "plain"],
	["myVar", "plain"],
];

const RECEIVERS = {
	collection: "array.new<float>(3, 1.0)",
	scalar: '"abc"',
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

function summarise(v) {
	if (!v || v.success === false) return "NO-VERDICT";
	const errors = (v.result?.errors ?? v.errors ?? []).filter(
		(e) => e.severity !== 2,
	);
	if (errors.length === 0) return "clean";
	return errors
		.map((e) => `${e.code ?? "-"}@${e.start?.line}:${e.start?.column}`)
		.join(" | ");
}

console.log(local ? "=== LOCAL ===" : "=== TRADINGVIEW ===");
console.log(
	`${"name".padEnd(10)} ${"class".padEnd(15)} ${"collection".padEnd(22)} scalar`,
);

for (const [name, cls] of NAMES) {
	const cells = [];
	for (const recv of ["collection", "scalar"]) {
		const src = [
			"//@version=6",
			'indicator("INV173")',
			`${name} = ${RECEIVERS[recv]}`,
			`${name}.zzNotAMember(1)`,
			"plot(close)",
		].join("\n");
		cells.push(summarise(await verdict(`${src}\n`)));
	}
	console.log(
		`${name.padEnd(10)} ${cls.padEnd(15)} ${cells[0].padEnd(22)} ${cells[1]}`,
	);
}
