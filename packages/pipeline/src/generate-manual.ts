#!/usr/bin/env -S node --experimental-strip-types

/**
 * Pine Script Manual Markdown generator (offline step).
 *
 * Reads the page inventory (`pine-data/raw/v6/manual-pages.json`) and the raw
 * HTML mirror (`.cache/manual/v6`) produced by `scrape-manual.ts`, converts each
 * page with `manual-to-markdown.ts`, and writes a per-page Markdown tree under
 * `pine-manual/v6/` plus a `README.md` index that mirrors the sidebar order.
 *
 * Fully offline and deterministic - re-run freely while iterating the converter.
 *
 * Usage: node --experimental-strip-types packages/pipeline/src/generate-manual.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { convertManualPage } from "./manual-to-markdown.ts";
import type { ManualPage } from "./scrape-manual.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../..")
	: path.resolve(__dirname, "../../..");

const PAGES_JSON = path.join(
	PROJECT_ROOT,
	"pine-data/raw/v6/manual-pages.json",
);
const CACHE_DIR = path.join(PROJECT_ROOT, ".cache/manual/v6");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "pine-manual/v6");

const DRY_RUN =
	process.argv.includes("--dry-run") || process.argv.includes("-n");

interface PagesFile {
	metadata: { source: string; scrapedAt: string; pageCount: number };
	pages: ManualPage[];
}

function sectionLabel(section: string): string {
	if (section === "(root)") return "General";
	return section.charAt(0).toUpperCase() + section.slice(1).replace(/-/g, " ");
}

function generateIndex(pages: ManualPage[], scrapedAt: string): string {
	let md = "# Pine Script v6 Manual\n\n";
	md += "> Auto-generated from the TradingView Pine Script Manual.  \n";
	md += `> Source: <https://www.tradingview.com/pine-script-docs/>  \n`;
	md += `> Scraped: ${scrapedAt}\n\n`;

	// Preserve sidebar order: sections appear in first-seen order.
	const order: string[] = [];
	const bySection = new Map<string, ManualPage[]>();
	for (const page of pages) {
		const list = bySection.get(page.section);
		if (list) {
			list.push(page);
		} else {
			order.push(page.section);
			bySection.set(page.section, [page]);
		}
	}

	for (const section of order) {
		md += `## ${sectionLabel(section)}\n\n`;
		for (const page of bySection.get(section) ?? []) {
			md += `- [${page.title}](${page.path}.md)\n`;
		}
		md += "\n";
	}

	return md;
}

function main(): void {
	if (!fs.existsSync(PAGES_JSON)) {
		throw new Error(
			`Missing ${path.relative(PROJECT_ROOT, PAGES_JSON)} - run \`pnpm run scrape:manual\` first.`,
		);
	}

	const { metadata, pages } = JSON.parse(
		fs.readFileSync(PAGES_JSON, "utf8"),
	) as PagesFile;

	console.log(`Generating Manual Markdown for ${pages.length} pages...`);
	console.log(`Output: ${path.relative(PROJECT_ROOT, OUTPUT_DIR)}`);

	let written = 0;
	let missing = 0;
	for (const page of pages) {
		const cached = path.join(CACHE_DIR, page.cacheFile);
		if (!fs.existsSync(cached)) {
			console.warn(`  ! no cache for ${page.path} (skipping)`);
			missing++;
			continue;
		}

		const html = fs.readFileSync(cached, "utf8");
		const markdown = convertManualPage(html, {
			title: page.title,
			url: page.url,
			section: page.section,
		});

		const dest = path.join(OUTPUT_DIR, `${page.path}.md`);
		if (!DRY_RUN) {
			fs.mkdirSync(path.dirname(dest), { recursive: true });
			fs.writeFileSync(dest, markdown, "utf8");
		}
		written++;
	}

	const index = generateIndex(pages, metadata.scrapedAt);
	if (!DRY_RUN) {
		fs.writeFileSync(path.join(OUTPUT_DIR, "README.md"), index, "utf8");
	}

	console.log(
		DRY_RUN
			? `[dry-run] Would write ${written} page(s) + README.md`
			: `Wrote ${written} page(s) + README.md`,
	);
	if (missing > 0) {
		console.warn(
			`${missing} page(s) had no cached HTML - re-run scrape:manual.`,
		);
	}
}

main();
