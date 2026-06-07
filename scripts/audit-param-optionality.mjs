// Audit of param-optionality provenance (TODO #21 first step).
//
// Diffs the OPTIONAL/REQUIRED verdicts that ship in pine-data/v6/functions.json
// against the actual evidence in the raw scrape dump, classifying every param
// by WHICH rule produced its verdict:
//
//   raw-default-optional  scrape.ts marked it optional only because the prose
//                         does not say "required argument" (the
//                         `!isExplicitlyRequired` fallthrough) - NO positive
//                         evidence of optionality
//   raw-prose-optional    the scrape found "optional"/bracketed name in the
//                         arg text or description
//   raw-default-prose     the scrape found default-value prose
//   gen-prose             generate.ts's isParameterOptional prose match fired
//                         (only reachable when the raw flag is absent)
//   gen-default-field     param.default is set
//   gen-common-list       commonOptionalParams membership fired
//   required              the final verdict is required
//
// Offline - reads the raw dump + generated JSON only.
//
// Usage: node scripts/audit-param-optionality.mjs [--list <class>]
//   --list <class>  print every fn.param in that evidence class

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(
	readFileSync(join(root, "pine-data/raw/v6/complete-v6-details.json"), "utf8"),
);
const generated = JSON.parse(
	readFileSync(join(root, "pine-data/v6/functions.json"), "utf8"),
);

// Mirror scrape.ts's per-param classification (lines ~533-547) so we can
// tell positive evidence apart from the default-optional fallthrough.
function rawEvidence(p) {
	const descLower = (p.description || "").toLowerCase();
	const hasDefault =
		descLower.includes("the default is") ||
		descLower.includes("defaults to") ||
		descLower.includes("default value is") ||
		descLower.includes("default is ");
	const proseOptional =
		descLower.includes("optional argument") ||
		descLower.includes("optional.") ||
		p.name.startsWith("[");
	const proseRequired = descLower.includes("required argument");
	return { hasDefault, proseOptional, proseRequired };
}

// Mirror generate.ts isParameterOptional's prose rules (the part that runs
// when the raw flag did not already decide).
function genProse(p) {
	const desc = (p.description || "").toLowerCase();
	return (
		desc.includes("optional") ||
		desc.includes("if not specified") ||
		desc.includes("default value is") ||
		desc.includes("default is") ||
		desc.includes("the default is") ||
		desc.includes("defaults to") ||
		desc.includes("if omitted") ||
		desc.includes("not required")
	);
}

const COMMON = new Set([
	"text", "textcolor", "color", "bgcolor", "bordercolor", "offset",
	"show_last", "editable", "display", "format", "precision", "size",
	"location", "style", "force_overlay", "tooltip", "inline", "group",
	"confirm", "options", "minval", "maxval", "step", "xloc", "yloc",
	"overlay", "scale", "max_bars_back", "max_lines_count",
	"max_labels_count", "max_boxes_count", "max_polylines_count",
	"timeframe", "timeframe_gaps", "explicit_plot_zorder", "shorttitle",
	"trackprice", "histbase", "join", "linewidth", "linestyle", "transp",
]);

const byClass = new Map();
const add = (cls, fn, p) => {
	if (!byClass.has(cls)) byClass.set(cls, []);
	byClass.get(cls).push(`${fn}.${p}`);
};

let totalParams = 0;
let shippedOptional = 0;

for (const genFn of generated) {
	const rawFn = raw.functions[genFn.name];
	const rawParams = new Map(
		(rawFn?.parameters ?? []).map((p) => [p.name, p]),
	);
	for (const gp of genFn.parameters ?? []) {
		totalParams++;
		if (gp.required) {
			add("required", genFn.name, gp.name);
			continue;
		}
		shippedOptional++;
		const rp = rawParams.get(gp.name);
		if (rp?.optional === true) {
			const ev = rawEvidence(rp);
			if (ev.proseOptional) add("raw-prose-optional", genFn.name, gp.name);
			else if (ev.hasDefault) add("raw-default-prose", genFn.name, gp.name);
			else add("raw-default-optional", genFn.name, gp.name);
			continue;
		}
		// Raw flag absent/false - generate.ts's own rules decided.
		const base = rp ?? gp;
		if (genProse(base)) add("gen-prose", genFn.name, gp.name);
		else if (base.default !== undefined || gp.default !== undefined)
			add("gen-default-field", genFn.name, gp.name);
		else if (COMMON.has(gp.name)) add("gen-common-list", genFn.name, gp.name);
		else add("gen-other", genFn.name, gp.name);
	}
}

console.log(`functions: ${generated.length}`);
console.log(`params:    ${totalParams}  (shipped optional: ${shippedOptional}, required: ${totalParams - shippedOptional})`);
console.log();
console.log("evidence class                     count");
for (const [cls, items] of [...byClass.entries()].sort((a, b) => b[1].length - a[1].length)) {
	console.log(`${cls.padEnd(34)} ${String(items.length).padStart(5)}`);
}

const listArg = process.argv.indexOf("--list");
if (listArg !== -1) {
	const cls = process.argv[listArg + 1];
	const items = byClass.get(cls) ?? [];
	console.log(`\n=== ${cls} (${items.length}) ===`);
	for (const it of items) console.log(it);
}
