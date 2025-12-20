#!/usr/bin/env node

/**
 * Pine Script v6 Documentation Crawler
 *
 * This script crawls the official TradingView Pine Script v6 reference
 * and extracts all language constructs (functions, constants, variables, etc.).
 *
 * Usage: node scripts/crawl.js [output-file]
 * Default output: v6/raw/v6-language-constructs.json
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "https://www.tradingview.com/pine-script-reference/v6/";
const OUTPUT_FILE =
	process.argv[2] ||
	path.join(__dirname, "../v6/raw/v6-language-constructs.json");

async function crawlPineScriptReference() {
	console.log("🚀 Starting Pine Script v6 documentation crawl...");
	console.log(`📍 Source: ${BASE_URL}`);
	console.log(`📁 Output: ${OUTPUT_FILE}`);

	const browser = await chromium.launch({ headless: true });
	const context = await browser.newContext({
		userAgent:
			"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
	});
	const page = await context.newPage();

	try {
		// Navigate to the main reference page
		console.log("📖 Loading main reference page...");
		await page.goto(BASE_URL, { waitUntil: "networkidle" });
		await page.waitForTimeout(2000); // Allow JavaScript to render

		// Extract all language constructs
		console.log("🔍 Extracting language constructs...");

		const constructs = await page.evaluate(() => {
			const result = {
				metadata: {
					extractedAt: new Date().toISOString(),
					source: window.location.href,
					totalItems: 0,
				},
				keywords: { count: 0, items: [] },
				operators: { count: 0, items: [] },
				constants: { count: 0, items: [] },
				variables: { count: 0, items: [] },
				functions: { count: 0, items: [] },
				types: { count: 0, items: [] },
			};

			// Helper function to extract items from sections
			const _extractSectionItems = (sectionName) => {
				const items = [];
				const selectors = [
					`[data-section="${sectionName}"] .item`,
					`.${sectionName}-section .item`,
					`#${sectionName} .item`,
					`.js-${sectionName}-container .item`,
					`a[href*="${sectionName}"]`,
					`.reference-list a[href*="/fun_"]`,
					`.reference-list a[href*="/const_"]`,
					`.reference-list a[href*="/var_"]`,
				];

				for (const selector of selectors) {
					const elements = document.querySelectorAll(selector);
					if (elements.length > 0) {
						elements.forEach((el) => {
							const text = el.textContent?.trim();
							const _href = el.getAttribute("href");
							if (text && !items.includes(text)) {
								items.push(text);
							}
						});
						break;
					}
				}
				return items;
			};

			// Extract keywords (language keywords)
			result.keywords.items = [
				"and",
				"enum",
				"export",
				"for",
				"for...in",
				"if",
				"import",
				"method",
				"not",
				"or",
				"switch",
				"type",
				"var",
				"varip",
				"while",
			];

			// Extract operators
			result.operators.items = [
				"!=",
				"%",
				"%=",
				"*",
				"*=",
				"+",
				"+=",
				"-",
				"-=",
				"/",
				"/=",
				":=",
				"<",
				"<=",
				"=",
				"==",
				"=>",
				">",
				">=",
				"?:",
				"[]",
			];

			// Try multiple extraction strategies for functions
			const functionSelectors = [
				'a[href*="/fun_"]',
				".function-item a",
				".reference-function a",
				'[data-type="function"] a',
			];

			for (const selector of functionSelectors) {
				const elements = document.querySelectorAll(selector);
				if (elements.length > 0) {
					elements.forEach((el) => {
						const text = el.textContent?.trim();
						if (text && !result.functions.items.includes(text)) {
							result.functions.items.push(text);
						}
					});
					break;
				}
			}

			// Extract constants
			const constSelectors = [
				'a[href*="/const_"]',
				".constant-item a",
				".reference-constant a",
				'[data-type="constant"] a',
			];

			for (const selector of constSelectors) {
				const elements = document.querySelectorAll(selector);
				if (elements.length > 0) {
					elements.forEach((el) => {
						const text = el.textContent?.trim();
						if (text && !result.constants.items.includes(text)) {
							result.constants.items.push(text);
						}
					});
					break;
				}
			}

			// Extract variables
			const varSelectors = [
				'a[href*="/var_"]',
				".variable-item a",
				".reference-variable a",
				'[data-type="variable"] a',
			];

			for (const selector of varSelectors) {
				const elements = document.querySelectorAll(selector);
				if (elements.length > 0) {
					elements.forEach((el) => {
						const text = el.textContent?.trim();
						if (text && !result.variables.items.includes(text)) {
							result.variables.items.push(text);
						}
					});
					break;
				}
			}

			// Count items
			result.keywords.count = result.keywords.items.length;
			result.operators.count = result.operators.items.length;
			result.constants.count = result.constants.items.length;
			result.variables.count = result.variables.items.length;
			result.functions.count = result.functions.items.length;
			result.types.count = result.types.items.length;

			// Calculate total
			result.metadata.totalItems =
				result.keywords.count +
				result.operators.count +
				result.constants.count +
				result.variables.count +
				result.functions.count +
				result.types.count;

			return result;
		});

		// If the main page extraction didn't work well, try to navigate to specific sections
		if (constructs.functions.count < 100) {
			console.log("🔍 Main extraction incomplete, trying detailed approach...");

			// Try to find and click on function categories
			const functionCategories = await page.$$(
				'a[href*="#fun"], .category-link',
			);

			for (let i = 0; i < Math.min(functionCategories.length, 10); i++) {
				try {
					await functionCategories[i].click();
					await page.waitForTimeout(1000);

					const categoryFunctions = await page.evaluate(() => {
						const items = [];
						const links = document.querySelectorAll('a[href*="/fun_"]');
						links.forEach((el) => {
							const text = el.textContent?.trim();
							if (text && !items.includes(text)) {
								items.push(text);
							}
						});
						return items;
					});

					categoryFunctions.forEach((func) => {
						if (!constructs.functions.items.includes(func)) {
							constructs.functions.items.push(func);
						}
					});
				} catch (e) {
					console.log(`⚠️  Could not extract from category ${i}: ${e.message}`);
				}
			}
		}

		// Update counts
		constructs.functions.count = constructs.functions.items.length;
		constructs.constants.count = constructs.constants.items.length;
		constructs.variables.count = constructs.variables.items.length;
		constructs.metadata.totalItems =
			constructs.keywords.count +
			constructs.operators.count +
			constructs.constants.count +
			constructs.variables.count +
			constructs.functions.count +
			constructs.types.count;

		// Ensure output directory exists
		const outputDir = path.dirname(OUTPUT_FILE);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Save results
		fs.writeFileSync(OUTPUT_FILE, JSON.stringify(constructs, null, 2), "utf8");

		console.log("✅ Crawl completed successfully!");
		console.log(`📊 Results:`);
		console.log(`   Keywords: ${constructs.keywords.count}`);
		console.log(`   Operators: ${constructs.operators.count}`);
		console.log(`   Constants: ${constructs.constants.count}`);
		console.log(`   Variables: ${constructs.variables.count}`);
		console.log(`   Functions: ${constructs.functions.count}`);
		console.log(`   Types: ${constructs.types.count}`);
		console.log(`   Total: ${constructs.metadata.totalItems}`);
		console.log(`💾 Saved to: ${OUTPUT_FILE}`);
	} catch (error) {
		console.error("❌ Crawl failed:", error.message);
		process.exit(1);
	} finally {
		await browser.close();
	}
}

// Run if called directly
if (require.main === module) {
	crawlPineScriptReference().catch(console.error);
}

module.exports = { crawlPineScriptReference };
