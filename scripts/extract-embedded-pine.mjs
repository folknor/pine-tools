// Extract Pine source embedded in another project's Rust tests into .pine
// files, so the ordinary tooling (`lint-batch --diff`) can sweep them.
//
// Why this exists: a second implementation's test suite is a source of Pine
// SHAPES our corpus does not contain - its fixtures are written to exercise
// edge cases rather than to trade. Running them through pine-lint and
// adjudicating every local-vs-TV disagreement finds catalog and parser gaps in
// whichever tool is wrong, and the two catalogs are independently derived (ours
// scraped from the reference, theirs from `po`), so their failure modes differ.
// That is what makes the disagreements worth reading. See INV163.
//
//   node scripts/extract-embedded-pine.mjs <source-dir> [out-dir]
//
// Defaults to the piners crates tree and .cache/embedded-pine (gitignored).
//
// Extraction rules, each of which drops real snippets on purpose:
//   - Rust raw strings only (`r#"..."#` / `r##"..."##`), which is how Pine is
//     embedded there.
//   - Must look like a script: contains `//@version`, `indicator(`, `strategy(`
//     or `library(`. Bare expression fragments are not scripts and would only
//     produce parse noise.
//   - Skipped when the string carries Rust interpolation (`{Name}`), because
//     the placeholder is not Pine. Pine's own `log.info("{0}")` format holes
//     start with a digit and are kept.
//   - A missing `//@version` is synthesized as v6: the host project's
//     `compile_source` supplies one, so its fixtures omit it, and without it
//     our version gate answers v1-unsupported for every file.

import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

const SOURCE = resolve(process.argv[2] ?? "/home/folk/Programs/piners/crates");
const OUT = resolve(process.argv[3] ?? ".cache/embedded-pine");

const RAW_STRING = /r(#+)"([\s\S]*?)"\1/g;
const LOOKS_LIKE_SCRIPT = /\/\/@version|indicator\s*\(|strategy\s*\(|library\s*\(/;
const RUST_INTERPOLATION = /\{[A-Za-z_]/;

function* rustFiles(dir) {
	for (const entry of readdirSync(dir)) {
		const path = join(dir, entry);
		if (statSync(path).isDirectory()) yield* rustFiles(path);
		else if (entry.endsWith(".rs")) yield path;
	}
}

mkdirSync(OUT, { recursive: true });

let scanned = 0;
let written = 0;
let skippedInterpolation = 0;
let skippedNotScript = 0;
const seen = new Set();

for (const file of rustFiles(SOURCE)) {
	const text = readFileSync(file, "utf8");
	let index = 0;
	for (const match of text.matchAll(RAW_STRING)) {
		const body = match[2];
		scanned++;
		if (!LOOKS_LIKE_SCRIPT.test(body)) {
			skippedNotScript++;
			continue;
		}
		if (RUST_INTERPOLATION.test(body)) {
			skippedInterpolation++;
			continue;
		}
		// Identical fixtures recur across files; one copy is enough.
		const key = body.trim();
		if (seen.has(key)) continue;
		seen.add(key);

		const source = /\/\/@version/.test(body) ? body : `//@version=6\n${body}`;
		const stem = basename(file, ".rs");
		writeFileSync(join(OUT, `${stem}-${index++}.pine`), `${source.trimEnd()}\n`);
		written++;
	}
}

console.log(`scanned raw strings:      ${scanned}`);
console.log(`  not script-like:        ${skippedNotScript}`);
console.log(`  rust interpolation:     ${skippedInterpolation}`);
console.log(`  duplicates:             ${scanned - skippedNotScript - skippedInterpolation - written}`);
console.log(`written to ${OUT}: ${written}`);
