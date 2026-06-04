#!/usr/bin/env node
// Probe how TradingView's reference page renders argument types for a function,
// especially overloaded ones. Dumps every .tv-pine-reference-item__arg-type node
// and every __syntax node so we can see whether the Arguments section shows a
// union (e.g. "series int/float") or a single overload's concrete type.
// Usage: node dev-tools/probe-arg-types.js <funcName>   e.g. node dev-tools/probe-arg-types.js nz

import puppeteer from "puppeteer";

const REFERENCE_URL = "https://www.tradingview.com/pine-script-reference/v6/";
const target = process.argv[2] || "nz";

const browser = await puppeteer.launch({ headless: "new" });
try {
	const page = await browser.newPage();
	await page.goto(REFERENCE_URL, { waitUntil: "networkidle2" });

	const sample = (t) =>
		page.evaluate((t) => {
			const el = document.getElementById(`fun_${t}`);
			if (!el) return { found: false };
			const argTypes = Array.from(
				el.querySelectorAll(".tv-pine-reference-item__arg-type"),
			).map((n) => n.textContent?.trim());
			return { found: true, argTypes };
		}, t);

	// Navigate via hash like the real scraper does.
	await page.evaluate((t) => {
		window.location.hash = `#fun_${t}`;
	}, target);
	await new Promise((r) => setTimeout(r, 800));

	const defaultState = await sample(target);

	// Each overload is an anchor #fun_<name>-<index>. Navigate to each and read args.
	const overloadCount = await page.evaluate((t) => {
		const el = document.getElementById(`fun_${t}`);
		return el.querySelectorAll(".tv-pine-reference-item__syntax").length;
	}, target);

	const perOverload = [];
	for (let i = 0; i < overloadCount; i++) {
		await page.evaluate(
			(t, idx) => {
				window.location.hash = `#fun_${t}-${idx}`;
			},
			target,
			i,
		);
		await new Promise((r) => setTimeout(r, 250));
		const argTypes = await page.evaluate((t) => {
			const el = document.getElementById(`fun_${t}`);
			const selected = el
				.querySelector(".tv-pine-reference-item__syntax.selected")
				?.textContent?.trim();
			const argTypes = Array.from(
				el.querySelectorAll(".tv-pine-reference-item__arg-type"),
			).map((n) => n.textContent?.trim());
			return { selected, argTypes };
		}, target);
		perOverload.push({ anchor: `#fun_${target}-${i}`, ...argTypes });
	}

	console.log(JSON.stringify({ target, defaultState, perOverload }, null, 2));
} finally {
	await browser.close();
}
