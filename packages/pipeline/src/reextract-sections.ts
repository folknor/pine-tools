#!/usr/bin/env -S node --experimental-strip-types

/**
 * Re-derive each reference item's prose sub-sections — `returnsDescription`,
 * `remarks`, `seeAlso` — from the local DOM mirror (.cache/dom/<name>/base.html),
 * OFFLINE — no network. Sibling of reextract-overload-args.ts: same idea, same
 * source-of-truth (TV's rendered HTML captured by `scrape`), different fields.
 *
 * It rewrites those three fields in place on every catalog entry of
 * pine-data/raw/v6/complete-v6-details.json whose base.html is mirrored, then
 * generate.ts emits them into the per-catalog JSON. Always run after `scrape`
 * (alongside reextract:dom) and before `generate`.
 *
 * Mirror coverage note: `scrape` snapshots every catalog — functions, types,
 * annotations, variables, constants, operators, and keywords. An entry with no
 * `base.html` yet (e.g. a member scraped before mirroring existed) is skipped
 * here and reported as "missing mirror" until a re-scrape backfills it.
 *
 * Usage: node --experimental-strip-types packages/pipeline/src/reextract-sections.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { extractSections, operatorSlug } from "./section-parse.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../../..")
	: path.resolve(__dirname, "../../..");

const MIRROR_DIR = path.join(PROJECT_ROOT, ".cache/dom");
const DETAILS_FILE = path.join(
	PROJECT_ROOT,
	"pine-data/raw/v6/complete-v6-details.json",
);

function safeName(name: string): string {
	return name.replace(/[^a-zA-Z0-9_.-]/g, "_");
}

// Each catalog stores entries keyed by name; the mirror dir is derived from a
// per-catalog prefix matching scrape.ts saveDomSnapshot calls: functions are
// bare, types `type__<name>`, annotations `an__<name>`, variables `var__<name>`,
// constants `const__<name>`, operators `op__<symbol>`.
const CATALOGS: Array<{ key: string; dir: (name: string) => string }> = [
	{ key: "functions", dir: (n) => safeName(n) },
	{ key: "types", dir: (n) => safeName(`type__${n}`) },
	{ key: "annotations", dir: (n) => safeName(`an__${n}`) },
	{ key: "variables", dir: (n) => safeName(`var__${n}`) },
	{ key: "constants", dir: (n) => safeName(`const__${n}`) },
	{ key: "operators", dir: (n) => safeName(`op__${operatorSlug(n)}`) },
	{ key: "keywords", dir: (n) => safeName(`kw__${n}`) },
];

function applySections(
	name: string,
	detail: Record<string, unknown>,
	html: string,
): boolean {
	const sections = extractSections(html);

	// Drop a self-reference in See-also: a symbol linking to its own name is
	// useless to a lookup consumer (and where a keyword/variable shares a name
	// with a function, e.g. `na`, TV's page links the function back to itself).
	if (sections.seeAlso) {
		sections.seeAlso = sections.seeAlso.filter((s) => s !== name);
		if (sections.seeAlso.length === 0) sections.seeAlso = undefined;
	}
	const before = JSON.stringify([
		detail.returnsDescription,
		detail.remarks,
		detail.seeAlso,
	]);

	// Idempotent: set when present, delete when absent, so re-running converges.
	if (sections.returnsDescription)
		detail.returnsDescription = sections.returnsDescription;
	else delete detail.returnsDescription;
	if (sections.remarks) detail.remarks = sections.remarks;
	else delete detail.remarks;
	if (sections.seeAlso) detail.seeAlso = sections.seeAlso;
	else delete detail.seeAlso;

	const after = JSON.stringify([
		detail.returnsDescription,
		detail.remarks,
		detail.seeAlso,
	]);
	return before !== after;
}

function main(): void {
	if (!fs.existsSync(MIRROR_DIR)) {
		console.error(
			`No DOM mirror at ${MIRROR_DIR}. Run \`scrape\` first to build it.`,
		);
		process.exit(1);
	}

	const details = JSON.parse(fs.readFileSync(DETAILS_FILE, "utf8"));

	for (const { key, dir } of CATALOGS) {
		const catalog = details[key] as
			| Record<string, Record<string, unknown>>
			| undefined;
		if (!catalog) continue;

		let changed = 0;
		let missing = 0;
		for (const [name, detail] of Object.entries(catalog)) {
			const file = path.join(MIRROR_DIR, dir(name), "base.html");
			if (!fs.existsSync(file)) {
				missing++;
				continue;
			}
			if (applySections(name, detail, fs.readFileSync(file, "utf8"))) changed++;
		}
		console.log(
			`${key}: ${changed} changed, ${missing} missing mirror (of ${Object.keys(catalog).length}).`,
		);
	}

	// Match scrape.ts/reextract serialization (2-space, no trailing newline).
	fs.writeFileSync(DETAILS_FILE, JSON.stringify(details, null, 2), "utf8");
}

main();
