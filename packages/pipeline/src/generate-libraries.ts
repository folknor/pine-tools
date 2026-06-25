#!/usr/bin/env -S node --experimental-strip-types

/**
 * Pine Script Library Export Generator
 *
 * Parses the vendored Pine library sources under `vendor/<Author>/<Lib>/
 * <Version>.pine` and emits their PUBLIC export sets (the `export`-keyword
 * surface) to `pine-data/v6/libraries.{ts,json}`. The checker reads these to
 * validate member calls on imported libraries (`import TradingView/ta/9 as
 * ta` -> `ta.dema(...)` valid, `ta.emax(...)` CE10271). See INV067.
 *
 * Offline + deterministic: it only reads the vendored sources, never the
 * network. Re-run after adding/updating a vendored library.
 *
 * Usage: node --experimental-strip-types packages/pipeline/src/generate-libraries.ts
 */

import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../..")
	: path.resolve(__dirname, "../../..");

// The core parser source uses extensionless imports (resolved by tsc/the
// bundler), so it cannot run under raw --experimental-strip-types ESM. Use
// the COMPILED parser from dist/ instead - run `pnpm run build` first.
const require = createRequire(import.meta.url);
const parserModule = path.join(
	PROJECT_ROOT,
	"dist/packages/core/src/parser/parser.js",
);
if (!fs.existsSync(parserModule)) {
	console.error(
		`compiled parser not found at ${parserModule} - run 'pnpm run build' first`,
	);
	process.exit(1);
}
const { Parser } = require(parserModule);
const semanticModule = path.join(
	PROJECT_ROOT,
	"dist/packages/core/src/parser/semanticAnalyzer.js",
);
const { SemanticAnalyzer } = require(semanticModule);

const VENDOR_DIR = path.join(PROJECT_ROOT, "vendor");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "pine-data/v6");

const isDir = (p: string): boolean => fs.statSync(p).isDirectory();

/** Walk vendor/<Author>/<Lib>/<Version>.pine -> { "Author/Lib/Version": file }. */
function collectLibraryFiles(): { libPath: string; file: string }[] {
	if (!fs.existsSync(VENDOR_DIR)) return [];
	const out: { libPath: string; file: string }[] = [];
	for (const author of fs.readdirSync(VENDOR_DIR)) {
		const authorDir = path.join(VENDOR_DIR, author);
		if (!isDir(authorDir)) continue;
		for (const lib of fs.readdirSync(authorDir)) {
			const libDir = path.join(authorDir, lib);
			if (!isDir(libDir)) continue;
			for (const f of fs.readdirSync(libDir)) {
				if (!f.endsWith(".pine")) continue;
				out.push({
					libPath: `${author}/${lib}/${f.replace(/\.pine$/, "")}`,
					file: path.join(libDir, f),
				});
			}
		}
	}
	return out;
}

const libraries: Record<string, string[]> = {};
// "Author/Lib/Version" -> exported names whose bodies are HISTORY-DEPENDENT
// (call ta.* / index own scope), so the checker can flag a conditional
// `lib.export()` call (CW10003). Derived offline by running the SemanticAnalyzer
// on the library body - a FACT about the public API, not the source. see INV118
const historyDependent: Record<string, string[]> = {};
const quarantined: string[] = [];

for (const { libPath, file } of collectLibraryFiles().sort((a, b) =>
	a.libPath.localeCompare(b.libPath),
)) {
	const src = fs.readFileSync(file, "utf8");
	const parser = new Parser(src);
	const ast = parser.parse();
	const errs = [...parser.getLexerErrors(), ...parser.getParserErrors()];
	if (errs.length > 0) {
		// A parse error means the export surface is INCOMPLETE - some `export`
		// would be missed, and the checker would then flag a real member as a
		// CE10271 false positive. So SKIP the library entirely (no entry ->
		// checker stays lenient on it, the #41 residual) rather than ship a
		// partial export set. Author libraries reach parser constructs the
		// official ones don't, so this is the common case for them.
		console.warn(
			`SKIP ${libPath}: ${errs.length} parse error(s), export set would be incomplete (${errs[0]})`,
		);
		quarantined.push(libPath);
		continue;
	}
	const exports = [
		...new Set(
			ast.body
				.filter(
					(s: { type: string; isExport?: boolean }) =>
						(s.type === "FunctionDeclaration" ||
							s.type === "MethodDeclaration") &&
						!!s.isExport,
				)
				.map((s: { name: string }) => s.name),
		),
	].sort();
	libraries[libPath] = exports;

	// Which exports are history-dependent: run the analyzer on the library body
	// and intersect its history-dependent UDF set with the export surface.
	try {
		const analyzer = new SemanticAnalyzer();
		analyzer.analyze(ast);
		const hist: Set<string> = analyzer.getHistoryDependentNames();
		const series: Set<string> = analyzer.getSeriesReturningNames();
		// Flag only history-dependent exports that RETURN A SERIES. Side-effect
		// builders (`StatsData.update` returns `this`, draws a table) are
		// history-dependent internally but TV exempts them from CW10003. INV118
		const histExports = exports.filter(
			(n: string) => hist.has(n) && series.has(n),
		);
		if (histExports.length > 0) historyDependent[libPath] = histExports;
		console.log(
			`${libPath}: ${exports.length} exports (${histExports.length} history-dependent)`,
		);
	} catch (e) {
		console.warn(`${libPath}: history-dependence scan failed (${e})`);
	}
}

// Merge in history-dependence facts for libraries whose SOURCE cannot be
// vendored (CC-BY-NC / unlicensed). These are derived once from a live fetch and
// committed as a fact (no source) - see the override file's _comment. INV118
const OVERRIDE_FILE = path.join(
	PROJECT_ROOT,
	"pine-data/raw/v6/library-history-overrides.json",
);
if (fs.existsSync(OVERRIDE_FILE)) {
	const overrides = JSON.parse(fs.readFileSync(OVERRIDE_FILE, "utf8"));
	for (const [libPath, names] of Object.entries(overrides)) {
		if (libPath.startsWith("_") || !Array.isArray(names)) continue;
		const merged = new Set([...(historyDependent[libPath] ?? []), ...names]);
		historyDependent[libPath] = [...merged].sort();
		console.log(`${libPath}: +${names.length} history-dependent (override)`);
	}
}

const header = `/**
 * Pine Script V6 vendored-library export sets
 * Auto-generated by packages/pipeline/src/generate-libraries.ts from vendor/**.pine
 * The PUBLIC surface (export-keyword functions/methods) of each vendored
 * library, keyed by "Author/Lib/Version". The checker validates imported
 * library member calls against these (CE10271 on unknown members). See INV067.
 */
`;

const ts = `${header}
export const LIBRARY_EXPORTS: Record<string, string[]> = ${JSON.stringify(libraries, null, 2)};

/** "Author/Lib/Version" -> Set of exported member names, for O(1) membership. */
export const LIBRARY_EXPORTS_BY_PATH: Map<string, Set<string>> = new Map(
	Object.entries(LIBRARY_EXPORTS).map(([k, v]) => [k, new Set(v)]),
);

/**
 * "Author/Lib/Version" -> exported names whose bodies are HISTORY-DEPENDENT
 * (call ta.* or index their own scope). The checker reads this so a conditional
 * \`lib.export()\` call draws TV's CW10003 ("should be called on each
 * calculation"). A derived fact about the public API, not the source. See INV118.
 */
export const LIBRARY_HISTORY_DEPENDENT: Record<string, string[]> = ${JSON.stringify(historyDependent, null, 2)};

export const LIBRARY_HISTORY_DEPENDENT_BY_PATH: Map<string, Set<string>> =
	new Map(
		Object.entries(LIBRARY_HISTORY_DEPENDENT).map(([k, v]) => [k, new Set(v)]),
	);
`;

fs.writeFileSync(path.join(OUTPUT_DIR, "libraries.ts"), ts);
fs.writeFileSync(
	path.join(OUTPUT_DIR, "libraries.json"),
	`${JSON.stringify(libraries, null, 2)}\n`,
);
fs.writeFileSync(
	path.join(OUTPUT_DIR, "libraries-history-dependent.json"),
	`${JSON.stringify(historyDependent, null, 2)}\n`,
);

console.log(
	`\nWrote ${Object.keys(libraries).length} libraries to pine-data/v6/libraries.{ts,json}`,
);
if (quarantined.length > 0) {
	console.log(
		`Quarantined ${quarantined.length} (parse errors, left lenient): ${quarantined.join(", ")}`,
	);
}
