#!/usr/bin/env node
// Probe how TradingView's reference page lays out multi-example entries.
// Usage: node dev-tools/probe-example-structure.js <hash-id>
// e.g.  node dev-tools/probe-example-structure.js type_const

import puppeteer from "puppeteer";

const REFERENCE_URL = "https://www.tradingview.com/pine-script-reference/v6/";

const target = process.argv[2] || "type_const";

const browser = await puppeteer.launch({ headless: "new" });
try {
	const page = await browser.newPage();
	await page.goto(REFERENCE_URL, { waitUntil: "networkidle2" });
	await page.evaluate((t) => {
		window.location.hash = `#${t}`;
	}, target);
	await new Promise((r) => setTimeout(r, 1500));

	const report = await page.evaluate((t) => {
		const items = Array.from(
			document.querySelectorAll(".tv-pine-reference-item"),
		);
		const match = items.find((el) => {
			const header = el.querySelector(".tv-pine-reference-item__header");
			return header?.textContent?.trim() === t.replace(/^type_/, "");
		}) || items.find((el) => el.id === t);

		if (!match) {
			return { found: false, candidateCount: items.length };
		}

		const exampleContainers = match.querySelectorAll(
			".tv-pine-reference-item__example",
		);
		const allCodes = match.querySelectorAll(
			".tv-pine-reference-item__example code",
		);

		return {
			found: true,
			id: match.id,
			header:
				match.querySelector(".tv-pine-reference-item__header")?.textContent || "",
			exampleContainerCount: exampleContainers.length,
			codeBlockCount: allCodes.length,
			containers: Array.from(exampleContainers).map((c, i) => ({
				index: i,
				codesInside: c.querySelectorAll("code").length,
				tagPath: (function () {
					const tags = [];
					let n = c;
					while (n && n !== match) {
						tags.unshift(
							n.tagName.toLowerCase() +
								(n.className ? "." + n.className.split(" ").join(".") : ""),
						);
						n = n.parentElement;
					}
					return tags.join(" > ");
				})(),
				firstCodeSnippet: c
					.querySelector("code")
					?.innerText?.slice(0, 120),
			})),
			outerHtmlLength: match.outerHTML.length,
		};
	}, target);

	console.log(JSON.stringify(report, null, 2));
} finally {
	await browser.close();
}
