#!/usr/bin/env node
// INV013 probe (read-only). Loads TV's live v6 reference and dumps:
//   1. the full TOC catalog: every toc item's {text, category, href}
//   2. for a representative variable sample, the detail-element DOM
//      structure (per-descendant class + text) + full innerText,
//      so we can see exactly how a variable's TYPE and QUALIFIER render.
// Output: lint-reports/tv-probe.json (gitignored). No writes to pine-data.
//
// Usage: node scripts/probe-tv-variables.mjs

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(__dirname, "..");
const BASE_URL = "https://www.tradingview.com/pine-script-reference/v6/";
const OUT = path.join(REPO, "lint-reports", "tv-probe.json");

// Representative sample spanning the qualifier spectrum, the missing
// built-ins, and array-typed ones (line.all / box.all).
const SAMPLE = [
	"close",
	"volume",
	"time",
	"bar_index",
	"barstate.isfirst",
	"syminfo.ticker",
	"syminfo.mintick",
	"syminfo.pointvalue",
	"syminfo.target_price_average",
	"syminfo.sector",
	"syminfo.shares_outstanding_float",
	"ta.accdist",
	"session.islastbar",
	"line.all",
	"box.all",
	"timeframe.period",
	"timeframe.multiplier",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
	const browser = await puppeteer.launch({
		headless: true,
		args: [
			"--no-sandbox",
			"--disable-setuid-sandbox",
			"--disable-dev-shm-usage",
		],
	});
	try {
		const page = await browser.newPage();
		await page.setRequestInterception(true);
		page.on("request", (req) => {
			const t = req.resourceType();
			if (["image", "stylesheet", "font", "media"].includes(t)) req.abort();
			else req.continue();
		});

		console.log("Loading reference page...");
		await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 45000 });
		await page.waitForNetworkIdle().catch(() => {});
		await sleep(6000);

		console.log("Extracting full TOC catalog...");
		const catalog = await page.evaluate(() => {
			const out = [];
			document
				.querySelectorAll(".tv-pine-reference-toc-item")
				.forEach((link) => {
					const href = link.href || "";
					const text = (link.textContent || "").trim();
					let category = "other";
					if (href.includes("#var_")) category = "var";
					else if (href.includes("#fun_")) category = "fun";
					else if (href.includes("#const_")) category = "const";
					else if (href.includes("#type_")) category = "type";
					else if (href.includes("#kw_")) category = "kw";
					else if (href.includes("#op_")) category = "op";
					if (text) out.push({ text, category, href });
				});
			return out;
		});
		console.log(`  TOC items: ${catalog.length}`);

		console.log(`Probing ${SAMPLE.length} variable detail pages...`);
		const details = [];
		for (const name of SAMPLE) {
			const id = `var_${name}`;
			await page.evaluate((h) => {
				window.location.hash = h;
			}, id);
			await sleep(350);
			const found = await page
				.waitForFunction(
					(elId) => document.getElementById(elId) !== null,
					{ timeout: 4000 },
					id,
				)
				.then(() => true)
				.catch(() => false);

			const dump = await page.evaluate((elId) => {
				const el = document.getElementById(elId);
				if (!el) return { found: false };
				// Per-descendant breakdown: class + own short text.
				const nodes = [];
				el.querySelectorAll("*").forEach((c) => {
					const cls = c.getAttribute("class") || "";
					// Own text only (exclude nested element text) to localize fields.
					let own = "";
					c.childNodes.forEach((n) => {
						if (n.nodeType === 3) own += n.textContent;
					});
					own = own.replace(/\s+/g, " ").trim();
					if (cls || own) {
						nodes.push({ class: cls, text: own.slice(0, 140) });
					}
				});
				const syntaxes = [];
				el.querySelectorAll(".tv-pine-reference-item__syntax").forEach((s) =>
					syntaxes.push((s.textContent || "").replace(/\s+/g, " ").trim()),
				);
				return {
					found: true,
					innerText: (el.innerText || "").replace(/\n{2,}/g, "\n").trim(),
					syntaxes,
					nodes,
				};
			}, id);

			details.push({ name, id, found, ...dump });
			console.log(`  ${found ? "ok " : "MISS"} ${name}`);
		}

		fs.writeFileSync(
			OUT,
			JSON.stringify(
				{ source: BASE_URL, scrapedAt: new Date().toISOString(), catalog, details },
				null,
				2,
			),
		);
		console.log(`\nWrote ${OUT}`);
		const counts = {};
		for (const c of catalog) counts[c.category] = (counts[c.category] || 0) + 1;
		console.log("Catalog by category:", counts);
	} finally {
		await browser.close();
	}
}

main().catch((e) => {
	console.error(e);
	process.exit(1);
});
