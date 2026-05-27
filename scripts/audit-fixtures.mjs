#!/usr/bin/env node
// Audits every .pine test fixture under packages/core/test/fixtures/
// without running the full vitest suite. Reports:
//
//   1. fixtures with malformed or unknown `// @expects` directives
//      (would fail when run; surfaces them as a batch).
//   2. fixtures that only assert a total `errors: N` / `warnings: N`
//      count without any per-error `error: line=N, message="..."`
//      assertions — those tests pass even if our linter starts
//      emitting the right count at the wrong lines.
//   3. for category-2 fixtures, prints suggested per-error directives
//      based on what our linter currently emits, ready to paste in.
//
// Run with: node scripts/audit-fixtures.mjs

import { readdir, readFile, access } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const HELPERS = resolve("dist/packages/core/test/helpers.js");
try {
	await access(HELPERS);
} catch {
	console.error(`No compiled helpers at ${HELPERS}. Run \`pnpm run build:tsc\` first.`);
	process.exit(2);
}
const { parseTestFile, runTest } = await import(`file://${HELPERS}`);

const FIXTURE_ROOT = resolve("packages/core/test/fixtures");

async function findPineFiles(dir) {
	const out = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) out.push(...(await findPineFiles(full)));
		else if (entry.isFile() && entry.name.endsWith(".pine")) out.push(full);
	}
	return out;
}

const files = (await findPineFiles(FIXTURE_ROOT)).sort();

const malformed = [];
const countOnly = [];

for (const file of files) {
	const content = await readFile(file, "utf8");
	const parsed = parseTestFile(content);
	const rel = relative(process.cwd(), file);

	if (parsed.expectations.directiveErrors && parsed.expectations.directiveErrors.length > 0) {
		malformed.push({ file: rel, errors: parsed.expectations.directiveErrors });
	}

	const hasCountAssertion =
		parsed.expectations.errorCount !== undefined ||
		parsed.expectations.warningCount !== undefined;
	const hasPerErrorAssertion =
		(parsed.expectations.errors && parsed.expectations.errors.length > 0) ||
		(parsed.expectations.warnings && parsed.expectations.warnings.length > 0);

	if (hasCountAssertion && !hasPerErrorAssertion) {
		// Run the linter on the code to suggest per-error directives.
		const result = runTest(parsed.code, parsed.expectations);
		const errs = result.validationErrors.filter((e) => e.severity === 0);
		const warns = result.validationErrors.filter((e) => e.severity === 1);
		countOnly.push({
			file: rel,
			expectedErrorCount: parsed.expectations.errorCount,
			expectedWarningCount: parsed.expectations.warningCount,
			actualErrors: errs,
			actualWarnings: warns,
		});
	}
}

console.log(`Scanned ${files.length} .pine fixtures.\n`);

if (malformed.length > 0) {
	console.log(`=== Malformed @expects directives (${malformed.length} files) ===`);
	for (const m of malformed) {
		console.log(`\n  ${m.file}:`);
		for (const e of m.errors) console.log(`    ${e}`);
	}
	console.log("");
} else {
	console.log(`No malformed @expects directives.\n`);
}

if (countOnly.length > 0) {
	console.log(`=== Count-only assertions, no per-error coverage (${countOnly.length} files) ===`);
	console.log(`These tests pass even if errors land on the wrong lines.`);
	console.log(`Suggested per-error directives (paste into the fixture):\n`);
	for (const c of countOnly) {
		console.log(`  ${c.file}:`);
		if (c.expectedErrorCount !== undefined) {
			console.log(`    // existing: @expects errors: ${c.expectedErrorCount}  (actual: ${c.actualErrors.length})`);
		}
		if (c.expectedWarningCount !== undefined) {
			console.log(`    // existing: @expects warnings: ${c.expectedWarningCount}  (actual: ${c.actualWarnings.length})`);
		}
		for (const e of c.actualErrors) {
			const msg = e.message.replace(/"/g, '\\"').slice(0, 80);
			console.log(`    // @expects error: line=${e.line}, message="${msg}"`);
		}
		for (const w of c.actualWarnings) {
			const msg = w.message.replace(/"/g, '\\"').slice(0, 80);
			console.log(`    // @expects warning: line=${w.line}, message="${msg}"`);
		}
		console.log("");
	}
} else {
	console.log(`Every fixture with count assertions also has per-error coverage.`);
}

if (malformed.length > 0) process.exit(1);
