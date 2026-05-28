#!/usr/bin/env node
// One-off (read-only): sample TV constant detail pages and dump each one's
// "Type" field, to compare against generate.ts's inferConstantType guess.
// Usage: node scripts/probe-tv-constants.mjs

import * as path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const BASE_URL = "https://www.tradingview.com/pine-script-reference/v6/";
const SAMPLE = [
	"color.red",
	"shape.circle",
	"math.pi",
	"math.e",
	"display.all",
	"display.none",
	"dayofweek.monday",
	"format.price",
	"currency.USD",
	"location.top",
	"size.large",
	"dividends.gross",
	"earnings.actual",
	"session.regular",
	"scale.right",
];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await puppeteer.launch({
	headless: true,
	args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
});
try {
	const page = await browser.newPage();
	await page.setRequestInterception(true);
	page.on("request", (r) => {
		const t = r.resourceType();
		if (["image", "stylesheet", "font", "media"].includes(t)) r.abort();
		else r.continue();
	});
	await page.goto(BASE_URL, { waitUntil: "networkidle2", timeout: 45000 });
	await sleep(6000);

	for (const name of SAMPLE) {
		const id = `const_${name}`;
		await page.evaluate((h) => {
			window.location.hash = h;
		}, id);
		await sleep(300);
		const type = await page.evaluate((elId) => {
			const el = document.getElementById(elId);
			if (!el) return "(no element)";
			const subs = el.querySelectorAll(".tv-pine-reference-item__sub-header");
			for (const sh of subs) {
				if ((sh.textContent || "").trim() === "Type") {
					let n = sh.nextElementSibling;
					while (n && !n.classList.contains("tv-pine-reference-item__text"))
						n = n.nextElementSibling;
					return n ? (n.textContent || "").replace(/\s+/g, " ").trim() : "(no type node)";
				}
			}
			return "(no Type field)";
		}, id);
		console.log(name.padEnd(22), "TV:", type);
	}
} finally {
	await browser.close();
}
