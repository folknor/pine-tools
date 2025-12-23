#!/usr/bin/env node

/**
 * Pine Script v6 Documentation Crawler (Dynamic Discovery Version)
 *
 * This script crawls official TradingView Pine Script v6 reference
 * and dynamically extracts all language constructs from the webpage content.
 *
 * Uses Puppeteer for lightweight browser automation.
 *
 * Usage: node scripts/crawl.js [output-file]
 * Default output: v6/raw/v6-language-constructs.json
 */

const puppeteer = require("puppeteer");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "https://www.tradingview.com/pine-script-reference/v6/";
const OUTPUT_FILE =
	process.argv[2] ||
	path.join(__dirname, "../v6/raw/v6-language-constructs.json");

async function crawlPineScriptReference() {
	console.log(
		"🚀 Starting Pine Script v6 documentation crawl (Dynamic Discovery)...",
	);
	console.log(`📍 Source: ${BASE_URL}`);
	console.log(`📁 Output: ${OUTPUT_FILE}`);

	let browser;
	try {
		// Launch Puppeteer with optimized settings
		browser = await puppeteer.launch({
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-web-security",
				"--disable-features=IsolateOrigins,site-per-process",
			],
		});

		const page = await browser.newPage();

		// Optimize page loading
		await page.setRequestInterception(true);
		page.on("request", (request) => {
			const resourceType = request.resourceType();
			if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
				request.abort();
			} else {
				request.continue();
			}
		});

		// Navigate to main reference page
		console.log("📖 Loading main reference page...");
		await page.goto(BASE_URL, {
			waitUntil: "networkidle2",
			timeout: 30000,
		});

		await page.waitForNetworkIdle();

		// Wait for dynamic content to load
		await new Promise((resolve) => setTimeout(resolve, 8000));

		// Extract all language constructs using dynamic discovery
		console.log("🔍 Extracting language constructs...");

		const constructs = await page.evaluate(() => {
			const result = {
				metadata: {
					extractedAt: new Date().toISOString(),
					source: window.location.href,
					totalItems: 0,
					extractionMethod: "dynamic_discovery",
				},
				keywords: { count: 0, items: [] },
				operators: { count: 0, items: [] },
				builtInVariables: {
					standalone: { count: 0, items: [] },
					namespaces: { count: 0, items: [] },
				},
				constants: {
					namespaces: { count: 0, items: [] },
					byNamespace: {},
				},
				functions: {
					namespaces: { count: 0, items: [] },
					byNamespace: {},
				},
				types: { count: 0, items: [] },
			};

			// Extract all TOC items (this is where all language constructs are listed)
			const tocLinks = document.querySelectorAll(".tv-pine-reference-toc-item");
			const allDiscoveredItems = {
				variables: [],
				functions: [],
				constants: [],
				types: [],
				keywords: new Set(),
				operators: new Set(),
			};

			// Categorize TOC items by their URL patterns
			tocLinks.forEach((link) => {
				const href = link.href;
				const text = link.textContent.trim();

				if (href && text) {
					if (href.includes("#var_")) {
						allDiscoveredItems.variables.push(text);
					} else if (href.includes("#fun_")) {
						allDiscoveredItems.functions.push(text);
					} else if (href.includes("#const_")) {
						allDiscoveredItems.constants.push(text);
					} else if (href.includes("#type_")) {
						allDiscoveredItems.types.push(text);
					}
				}
			});

			// Extract keywords and operators from code blocks throughout the page
			const codeBlocks = document.querySelectorAll("code, pre");

			// Pine Script keywords pattern
			const keywordRegex =
				/\b(and|or|not|if|else|for|while|do|switch|case|default|break|continue|return|var|let|const|import|export|true|false|na|null|enum|method|type|varip)\b/g;

			// Operators pattern
			const operatorRegex = /[+\-*/%=<>!&|^?:]+|[=!]=|[<>]=|\[\]/g;

			codeBlocks.forEach((block) => {
				const text = block.textContent;

				// Extract keywords
				keywordRegex.lastIndex = 0; // Reset regex
				do {
					match = keywordRegex.exec(text);
					if (match) {
						const keyword = match[1];
						allDiscoveredItems.keywords.add(keyword);
					}
				} while (match !== null);

				// Extract operators
				const operatorMatches = text.match(operatorRegex);
				if (operatorMatches) {
					operatorMatches.forEach((op) => {
						allDiscoveredItems.operators.add(op);
					});
				}
			});

			// Separate variables into standalone and namespaced
			const standaloneVariables = [];
			const variableNamespaces = new Set();

			allDiscoveredItems.variables.forEach((variable) => {
				if (variable.includes(".")) {
					const namespace = variable.split(".")[0];
					variableNamespaces.add(namespace);
				} else {
					standaloneVariables.push(variable);
				}
			});

			// Organize functions by namespace
			const functionNamespaces = new Set();
			const functionsByNamespace = {};

			allDiscoveredItems.functions.forEach((func) => {
				if (func.includes(".")) {
					const parts = func.split(".");
					const namespace = parts[0];
					const funcName = parts.slice(1).join(".");

					functionNamespaces.add(namespace);
					if (!functionsByNamespace[namespace]) {
						functionsByNamespace[namespace] = [];
					}
					functionsByNamespace[namespace].push(funcName);
				} else {
					// Standalone function (no namespace)
					functionNamespaces.add("global");
					if (!functionsByNamespace.global) {
						functionsByNamespace.global = [];
					}
					functionsByNamespace.global.push(func);
				}
			});

			// Organize constants by namespace
			const constantNamespaces = new Set();
			const constantsByNamespace = {};

			allDiscoveredItems.constants.forEach((constant) => {
				if (constant.includes(".")) {
					const parts = constant.split(".");
					const namespace = parts[0];
					const constantName = parts.slice(1).join(".");

					constantNamespaces.add(namespace);
					if (!constantsByNamespace[namespace]) {
						constantsByNamespace[namespace] = [];
					}
					constantsByNamespace[namespace].push(constantName);
				}
			});

			// Populate result object
			result.keywords.items = Array.from(allDiscoveredItems.keywords).sort();
			result.operators.items = Array.from(allDiscoveredItems.operators).sort();
			result.types.items = allDiscoveredItems.types.sort();

			// Variables
			result.builtInVariables.standalone.items = standaloneVariables.sort();
			result.builtInVariables.namespaces.items =
				Array.from(variableNamespaces).sort();

			// Functions
			result.functions.namespaces.items = Array.from(functionNamespaces).sort();
			result.functions.byNamespace = functionsByNamespace;

			// Constants
			result.constants.namespaces.items = Array.from(constantNamespaces).sort();
			result.constants.byNamespace = constantsByNamespace;

			// Set counts
			result.keywords.count = result.keywords.items.length;
			result.operators.count = result.operators.items.length;
			result.types.count = result.types.items.length;
			result.builtInVariables.standalone.count = standaloneVariables.length;
			result.builtInVariables.namespaces.count = variableNamespaces.size;
			result.functions.namespaces.count = functionNamespaces.size;
			result.constants.namespaces.count = constantNamespaces.size;

			// Calculate total items
			const keywordCount = result.keywords.count;
			const operatorCount = result.operators.count;
			const variableStandaloneCount = result.builtInVariables.standalone.count;
			const variableNamespaceCount = result.builtInVariables.namespaces.count;
			const constantNamespaceCount = result.constants.namespaces.count;
			const constantItemCount =
				Object.values(constantsByNamespace).flat().length;
			const functionNamespaceCount = result.functions.namespaces.count;
			const functionItemCount = allDiscoveredItems.functions.length;
			const typeCount = result.types.count;

			result.metadata.totalItems =
				keywordCount +
				operatorCount +
				variableStandaloneCount +
				variableNamespaceCount +
				constantNamespaceCount +
				constantItemCount +
				functionNamespaceCount +
				functionItemCount +
				typeCount;

			// Add discovery statistics
			result.metadata.discoveryStats = {
				tocItemsFound: tocLinks.length,
				codeBlocksAnalyzed: codeBlocks.length,
				variablesDiscovered: allDiscoveredItems.variables.length,
				functionsDiscovered: allDiscoveredItems.functions.length,
				constantsDiscovered: allDiscoveredItems.constants.length,
				typesDiscovered: allDiscoveredItems.types.length,
				keywordsDiscovered: result.keywords.count,
				operatorsDiscovered: result.operators.count,
			};

			return result;
		});

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
		console.log(
			`   Variables - Standalone: ${constructs.builtInVariables.standalone.count}`,
		);
		console.log(
			`   Variables - Namespaces: ${constructs.builtInVariables.namespaces.count}`,
		);
		console.log(
			`   Constants - Namespaces: ${constructs.constants.namespaces.count}`,
		);
		console.log(
			`   Constants - Items: ${Object.values(constructs.constants.byNamespace).flat().length}`,
		);
		console.log(
			`   Functions - Namespaces: ${constructs.functions.namespaces.count}`,
		);
		console.log(`   Types: ${constructs.types.count}`);
		console.log(`   Total: ${constructs.metadata.totalItems}`);
		console.log(`🔍 Discovery Stats:`);
		console.log(
			`   TOC items found: ${constructs.metadata.discoveryStats.tocItemsFound}`,
		);
		console.log(
			`   Code blocks analyzed: ${constructs.metadata.discoveryStats.codeBlocksAnalyzed}`,
		);
		console.log(
			`   Variables discovered: ${constructs.metadata.discoveryStats.variablesDiscovered}`,
		);
		console.log(
			`   Functions discovered: ${constructs.metadata.discoveryStats.functionsDiscovered}`,
		);
		console.log(
			`   Constants discovered: ${constructs.metadata.discoveryStats.constantsDiscovered}`,
		);
		console.log(
			`   Types discovered: ${constructs.metadata.discoveryStats.typesDiscovered}`,
		);
		console.log(
			`   Keywords discovered: ${constructs.metadata.discoveryStats.keywordsDiscovered}`,
		);
		console.log(
			`   Operators discovered: ${constructs.metadata.discoveryStats.operatorsDiscovered}`,
		);
		console.log(`💾 Saved to: ${OUTPUT_FILE}`);
	} catch (error) {
		console.error("❌ Crawl failed:", error.message);
		process.exit(1);
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

// Run if called directly
if (require.main === module) {
	crawlPineScriptReference().catch(console.error);
}

module.exports = { crawlPineScriptReference };
