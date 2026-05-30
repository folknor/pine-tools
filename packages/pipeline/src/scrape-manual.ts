#!/usr/bin/env -S node --experimental-strip-types

/**
 * Pine Script Manual scraper (network step).
 *
 * The Manual is a static Astro site whose every page server-renders the full
 * navigation sidebar. We fetch one page (welcome), read the sidebar to discover
 * the complete page inventory, then mirror each page's raw HTML into the
 * `.cache/manual/v6` directory (gitignored). The offline `generate-manual.ts`
 * step turns that mirror into Markdown - so iterating on the converter never
 * needs to re-hit TradingView.
 *
 * Unlike the reference crawler this needs no browser: the content is in the
 * server-rendered HTML, reachable with a plain `fetch`.
 *
 * Usage:
 *   node --experimental-strip-types packages/pipeline/src/scrape-manual.ts
 *   node --experimental-strip-types packages/pipeline/src/scrape-manual.ts --force
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../..")
	: path.resolve(__dirname, "../../..");

const SITE_ORIGIN = "https://www.tradingview.com";
const ENTRY_URL = `${SITE_ORIGIN}/pine-script-docs/welcome/`;
const PAGES_JSON = path.join(
	PROJECT_ROOT,
	"pine-data/raw/v6/manual-pages.json",
);
const CACHE_DIR = path.join(PROJECT_ROOT, ".cache/manual/v6");

const FORCE = process.argv.includes("--force");
const REQUEST_DELAY_MS = 300;

export interface ManualPage {
	/** Path under the docs root, e.g. "language/operators" or "welcome". */
	path: string;
	/** Sidebar title, e.g. "Operators". */
	title: string;
	/** Top-level group, e.g. "language", or "(root)" for un-grouped pages. */
	section: string;
	/** Absolute, fetchable URL (trailing slash). */
	url: string;
	/** Flat cache filename, e.g. "language__operators.html". */
	cacheFile: string;
}

function decodeEntities(text: string): string {
	return text
		.replace(/&amp;/g, "&")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'");
}

/** Parse the sidebar of a Manual page into the ordered, de-duplicated page list. */
export function parseSidebar(html: string): ManualPage[] {
	const linkRe =
		/class="page-link"\s+href="(\/pine-script-docs\/[^"#]+)"[^>]*>([^<]+)<\/a>/g;
	const seen = new Set<string>();
	const pages: ManualPage[] = [];

	for (;;) {
		const m = linkRe.exec(html);
		if (m === null) break;

		const href = m[1].replace(/\/$/, "");
		const relPath = href.replace("/pine-script-docs/", "");
		if (relPath === "" || seen.has(relPath)) continue;
		seen.add(relPath);

		const title = decodeEntities(m[2].trim());
		const section = relPath.includes("/") ? relPath.split("/")[0] : "(root)";
		pages.push({
			path: relPath,
			title,
			section,
			url: `${SITE_ORIGIN}${href}/`,
			cacheFile: `${relPath.replace(/\//g, "__")}.html`,
		});
	}

	return pages;
}

async function fetchText(url: string): Promise<string> {
	const res = await fetch(url, {
		headers: {
			"User-Agent":
				"pine-tools manual scraper (https://github.com/folknor/pinescript-vscode-extension)",
			Accept: "text/html",
		},
	});
	if (!res.ok) {
		throw new Error(`HTTP ${res.status} for ${url}`);
	}
	return res.text();
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
	console.log("Scraping Pine Script Manual (v6)...");
	console.log(`Entry: ${ENTRY_URL}`);

	fs.mkdirSync(CACHE_DIR, { recursive: true });
	fs.mkdirSync(path.dirname(PAGES_JSON), { recursive: true });

	const entryHtml = await fetchText(ENTRY_URL);
	const pages = parseSidebar(entryHtml);
	console.log(`Discovered ${pages.length} pages from the sidebar.`);

	fs.writeFileSync(
		PAGES_JSON,
		`${JSON.stringify(
			{
				metadata: {
					source: ENTRY_URL,
					scrapedAt: new Date().toISOString(),
					pageCount: pages.length,
				},
				pages,
			},
			null,
			2,
		)}\n`,
		"utf8",
	);
	console.log(
		`Wrote page inventory: ${path.relative(PROJECT_ROOT, PAGES_JSON)}`,
	);

	let fetched = 0;
	let skipped = 0;
	for (const page of pages) {
		const dest = path.join(CACHE_DIR, page.cacheFile);
		if (!FORCE && fs.existsSync(dest)) {
			skipped++;
			continue;
		}

		// The welcome page is already in hand from discovery.
		const html =
			page.path === "welcome" ? entryHtml : await fetchText(page.url);
		fs.writeFileSync(dest, html, "utf8");
		fetched++;
		console.log(`  [${fetched + skipped}/${pages.length}] ${page.path}`);

		if (page.path !== "welcome") await delay(REQUEST_DELAY_MS);
	}

	console.log(
		`Done. Mirrored ${fetched} page(s), skipped ${skipped} cached (use --force to refetch).`,
	);
	console.log(`Cache: ${path.relative(PROJECT_ROOT, CACHE_DIR)}`);
}

main().catch((error) => {
	console.error("Manual scrape failed:", (error as Error).message);
	process.exit(1);
});
