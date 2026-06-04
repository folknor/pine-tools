#!/usr/bin/env -S node --experimental-strip-types

/**
 * Re-derive every overloaded function's per-overload `overloadArgs` from the
 * local DOM mirror (.cache/dom/<name>/overload-<i>.html), OFFLINE - no network.
 *
 * The mirror is captured by `scrape` (see saveDomSnapshot / TODO #22). This tool
 * lets DOM-extraction logic (the arg-type parser in arg-parse.ts) be iterated
 * without re-hitting TradingView: edit the parser, re-run this, re-generate.
 * It rewrites only the `overloadArgs` field of pine-data/raw/v6/complete-v6-
 * details.json in place; the offline union (union-types.ts) turns those into
 * per-param types at generate-time.
 *
 * Usage: node --experimental-strip-types packages/pipeline/src/reextract-overload-args.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgTypeText } from "./arg-parse.ts";

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

// textContent decodes HTML entities; the mirror stores raw HTML, so decode the
// entities that actually appear in arg-type spans (&lt; &gt;, plus &amp; for
// safety) to match what the live scrape's node.textContent would have produced.
function decodeEntities(s: string): string {
	return s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
	return s.replace(/<[^>]+>/g, "");
}

function argTypesFromHtml(
	html: string,
): Array<{ name: string; type: string; description: string }> {
	const out: Array<{ name: string; type: string; description: string }> = [];
	// Each arg row is a `__text tv-text` div whose inner content is
	// `<span class="...arg-type">name (type)</span>description`. Match those
	// divs, keep only the ones holding an arg-type span, then strip inline tags
	// (<a>/<code>/<em>/<strong>) and decode entities so the text equals the live
	// scrape's parentElement.textContent. (No arg row nests a <div>, verified.)
	const re =
		/<div class="tv-pine-reference-item__text tv-text">([\s\S]*?)<\/div>/g;
	for (const m of html.matchAll(re)) {
		const inner = m[1];
		if (!inner.includes("tv-pine-reference-item__arg-type")) continue;
		const text = decodeEntities(stripTags(inner));
		for (const entry of parseArgTypeText(text)) out.push(entry);
	}
	return out;
}

function main(): void {
	if (!fs.existsSync(MIRROR_DIR)) {
		console.error(
			`No DOM mirror at ${MIRROR_DIR}. Run \`scrape\` first to build it.`,
		);
		process.exit(1);
	}

	const details = JSON.parse(fs.readFileSync(DETAILS_FILE, "utf8"));
	let changed = 0;
	let missing = 0;

	for (const [name, detail] of Object.entries<Record<string, unknown>>(
		details.functions || {},
	)) {
		const overloads = detail.overloads as string[] | undefined;
		if (!overloads || overloads.length < 2) continue;

		const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
		const dir = path.join(MIRROR_DIR, safeName);
		const next: Array<Array<{ name: string; type: string }>> = [];
		let haveAll = true;

		for (let i = 0; i < overloads.length; i++) {
			const file = path.join(dir, `overload-${i}.html`);
			if (!fs.existsSync(file)) {
				haveAll = false;
				break;
			}
			next.push(argTypesFromHtml(fs.readFileSync(file, "utf8")));
		}

		if (!haveAll) {
			missing++;
			continue;
		}

		const before = JSON.stringify(detail.overloadArgs);
		const after = JSON.stringify(next);
		if (before !== after) {
			detail.overloadArgs = next;
			changed++;
		}
	}

	// Match scrape.ts's serialization exactly (2-space, no trailing newline) so
	// re-running this produces a minimal, consistent diff.
	fs.writeFileSync(DETAILS_FILE, JSON.stringify(details, null, 2), "utf8");
	console.log(
		`Re-extracted overloadArgs from mirror: ${changed} functions changed, ${missing} missing mirror dirs.`,
	);
}

main();
