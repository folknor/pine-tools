// Which built-ins could have been mis-typed by the pre-INV147 baseCompatible?
//
// The old comparison never split a generic type, so an argument like
// matrix<float> was compared verbatim against a param like matrix<int/float>
// and never matched. When NO overload matched, resolveCallReturnRaw fell back
// to the full view list and returned overload #0's return type. So a function
// is affected when it has generic param types in its overloads AND its
// overload returns are not all identical - the mismatch is only observable
// when overload #0's return differs from the one that should have been picked.
//
// Usage: node investigations/INV147-generic-overload-return-resolution/audit-generic-overloads.mjs

import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const functions = JSON.parse(
	readFileSync(join(ROOT, "pine-data/v6/functions.json"), "utf8"),
);

const list = Array.isArray(functions) ? functions : Object.values(functions);

const affected = [];
for (const fn of list) {
	const overloads = fn.overloads ?? [];
	if (overloads.length < 2) continue;

	const hasGenericParam = overloads.some((ov) =>
		(ov.parameters ?? []).some((p) => String(p.type ?? "").includes("<")),
	);
	if (!hasGenericParam) continue;

	const returns = [...new Set(overloads.map((ov) => String(ov.returns ?? "")))];
	if (returns.length < 2) continue;

	affected.push({
		name: fn.name,
		merged: String(fn.returns ?? ""),
		first: String(overloads[0].returns ?? ""),
		returns,
	});
}

console.log(
	`${list.length} functions scanned, ${affected.length} could resolve to the wrong return type\n`,
);
for (const a of affected) {
	const flag = a.merged === a.first ? "" : "  (merged != overload#0)";
	console.log(`${a.name}`);
	console.log(`   merged return : ${a.merged}${flag}`);
	console.log(`   overload rets : ${a.returns.join(" | ")}`);
}
