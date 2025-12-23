#!/usr/bin/env node

/**
 * Pine Script v6 Documentation Scraper (Puppeteer Version)
 *
 * This script scrapes detailed information for each Pine Script v6 function,
 * including parameters, return types, descriptions, and examples.
 *
 * Uses Puppeteer for lightweight browser automation.
 *
 * Usage: node scripts/scrape.js [input-file] [output-file]
 * Default input: v6/raw/v6-language-constructs.json
 * Default output: v6/raw/complete-v6-details.json
 */

const puppeteer = require("puppeteer");
const fs = require("node:fs");
const path = require("node:path");

const BASE_URL = "https://www.tradingview.com/pine-script-reference/v6/";

// Parse arguments, filtering out flags
const positionalArgs = process.argv.slice(2).filter(arg => !arg.startsWith('-'));
const INPUT_FILE =
	positionalArgs[0] ||
	path.join(__dirname, "../v6/raw/v6-language-constructs.json");
const OUTPUT_FILE =
	positionalArgs[1] || path.join(__dirname, "../v6/raw/complete-v6-details.json");
const CACHE_DIR = path.join(__dirname, "../.cache/function-details");
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

function getCacheFilePath(functionName) {
	const safeName = functionName.replace(/[^a-zA-Z0-9]/g, "_");
	return path.join(CACHE_DIR, `${safeName}.json`);
}

function isCacheValid(cacheFilePath) {
	if (!fs.existsSync(cacheFilePath)) {
		return false;
	}

	const stats = fs.statSync(cacheFilePath);
	const age = Date.now() - stats.mtime.getTime();
	return age < CACHE_TTL;
}

function getCachedData(functionName) {
	const cacheFilePath = getCacheFilePath(functionName);

	if (!isCacheValid(cacheFilePath)) {
		return null;
	}

	try {
		const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
		console.log(`📋 Using cached data for: ${functionName}`);
		return cachedData;
	} catch (_error) {
		console.log(`⚠️  Invalid cache for ${functionName}, will re-scrape`);
		return null;
	}
}

function saveToCache(functionName, data) {
	const cacheFilePath = getCacheFilePath(functionName);

	// Ensure cache directory exists
	if (!fs.existsSync(CACHE_DIR)) {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
	}

	try {
		fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2), "utf8");
	} catch (error) {
		console.log(`⚠️  Failed to cache ${functionName}: ${error.message}`);
	}
}

// Shared browser instance for optimized scraping
let sharedBrowser = null;
let sharedPage = null;

async function getSharedBrowser() {
	if (!sharedBrowser) {
		sharedBrowser = await puppeteer.launch({
			headless: true,
			args: [
				"--no-sandbox",
				"--disable-setuid-sandbox",
				"--disable-dev-shm-usage",
				"--disable-web-security",
				"--disable-features=IsolateOrigins,site-per-process",
			],
		});
	}
	return sharedBrowser;
}

async function getSharedPage() {
	if (!sharedPage) {
		const browser = await getSharedBrowser();
		sharedPage = await browser.newPage();

		// Optimize page for speed - block images, fonts, etc.
		await sharedPage.setRequestInterception(true);
		sharedPage.on("request", (request) => {
			const resourceType = request.resourceType();
			if (["image", "stylesheet", "font", "media"].includes(resourceType)) {
				request.abort();
			} else {
				request.continue();
			}
		});

		// Initial navigation to load the SPA
		console.log("🌐 Loading TradingView reference page...");
		await sharedPage.goto(BASE_URL, {
			waitUntil: "networkidle2",
			timeout: 60000,
		});

		// Wait for initial content
		await sharedPage.waitForFunction(() => {
			const content = document.body.innerText;
			return content.length > 1000 && !content.includes("Loading");
		}, { timeout: 15000 }).catch(() => {
			console.log("⏳ Initial page load timeout, continuing...");
		});

		console.log("✅ SPA loaded, ready for hash navigation");
	}
	return sharedPage;
}

async function closeSharedBrowser() {
	if (sharedPage) {
		sharedPage = null;
	}
	if (sharedBrowser) {
		await sharedBrowser.close();
		sharedBrowser = null;
	}
}

async function scrapeFunctionDetails(functionName, useCache = true) {
	// Check cache first
	if (useCache) {
		const cachedData = getCachedData(functionName);
		if (cachedData) {
			return cachedData;
		}
	}

	try {
		const page = await getSharedPage();

		// Navigate via hash change (much faster than full page load)
		const funcNameClean = functionName.replace(/[()]/g, "");
		const hashTarget = `fun_${funcNameClean}`;

		// Use hash navigation for speed
		await page.evaluate((hash) => {
			window.location.hash = hash;
		}, hashTarget);

		// Brief wait for hash navigation and content update
		await new Promise(resolve => setTimeout(resolve, 300));

		// Wait for the specific element to be present
		await page.waitForFunction((funcName) => {
			const el = document.getElementById(`fun_${funcName}`) ||
				document.getElementById(`var_${funcName}`) ||
				document.getElementById(`type_${funcName}`);
			return el !== null;
		}, { timeout: 5000 }, funcNameClean).catch(() => {
			// Element not found via ID, will try fallback
		});

		const details = await page.evaluate((funcName) => {
			const result = {
				name: "",
				syntax: "",
				description: "",
				parameters: [],
				returns: "",
				example: "",
				namespace: "",
				category: "",
			};

			// Find the specific function element by ID
			// TradingView uses IDs like "fun_ta.sma", "var_close", "type_array"
			const funcElement = document.getElementById(`fun_${funcName}`) ||
				document.getElementById(`var_${funcName}`) ||
				document.getElementById(`type_${funcName}`) ||
				document.getElementById(`kw_${funcName}`) ||
				document.getElementById(`op_${funcName}`);

			if (!funcElement) {
				// Try to find by searching all items
				const items = document.querySelectorAll('.tv-pine-reference-item');
				for (const item of items) {
					const header = item.querySelector('.tv-pine-reference-item__header');
					if (header && header.textContent.replace(/[()]/g, '').trim() === funcName) {
						return extractFromElement(item);
					}
				}
				return result;
			}

			function extractFromElement(element) {
				const res = {
					name: "",
					syntax: "",
					description: "",
					parameters: [],
					returns: "",
					example: "",
					namespace: "",
					category: "",
				};

				// Extract name from header
				const headerEl = element.querySelector('.tv-pine-reference-item__header');
				if (headerEl) {
					res.name = headerEl.textContent?.trim() || "";
				}

				// Extract syntax (contains signature like "ta.sma(source, length) → series float")
				const syntaxEl = element.querySelector('.tv-pine-reference-item__syntax');
				if (syntaxEl) {
					res.syntax = syntaxEl.textContent?.trim() || "";
					// Extract return type from syntax
					const returnMatch = res.syntax.match(/→\s*(.+)$/);
					if (returnMatch) {
						res.returns = returnMatch[1].trim();
					}
				}

				// Extract description (first .tv-text that's not an argument)
				const textElements = element.querySelectorAll('.tv-pine-reference-item__text.tv-text');
				if (textElements.length > 0) {
					// First text element (before Arguments) is the description
					const firstText = textElements[0];
					if (!firstText.querySelector('.tv-pine-reference-item__arg-type')) {
						res.description = firstText.textContent?.trim() || "";
					}
				}

				// Extract parameters from argument descriptions
				// Format: <span class="tv-pine-reference-item__arg-type">source (series int/float) </span>Series of values...
				const argElements = element.querySelectorAll('.tv-pine-reference-item__arg-type');
				argElements.forEach((argEl) => {
					const argText = argEl.textContent?.trim() || "";
					// Parse "source (series int/float)" format
					const match = argText.match(/^(\w+)\s*\(([^)]+)\)/);
					if (match) {
						const paramName = match[1];
						const paramType = match[2];
						// Get description from parent element (rest of text after the span)
						const parentText = argEl.parentElement?.textContent?.trim() || "";
						const descText = parentText.replace(argText, '').trim();

						const param = {
							name: paramName,
							type: paramType,
							description: descText,
							optional: argText.toLowerCase().includes('optional') || paramName.startsWith('['),
							required: !argText.toLowerCase().includes('optional') && !paramName.startsWith('['),
						};
						res.parameters.push(param);
					}
				});

				// If no parameters found from arg-type elements, try to extract from syntax
				// This handles variadic functions like math.max(number0, number1, ...) → const int
				if (res.parameters.length === 0 && res.syntax) {
					const syntaxMatch = res.syntax.match(/^[^(]+\(([^)]+)\)/);
					if (syntaxMatch) {
						const paramsStr = syntaxMatch[1];
						// Parse comma-separated params, handling variadic "..."
						const parts = paramsStr.split(/,\s*/);
						parts.forEach((part) => {
							const trimmed = part.trim();
							if (trimmed === '...') {
								// Mark as variadic in metadata
								res.variadic = true;
							} else if (trimmed) {
								res.parameters.push({
									name: trimmed,
									type: 'unknown',
									description: '',
									optional: trimmed.startsWith('[') || trimmed.endsWith('?'),
									required: !trimmed.startsWith('[') && !trimmed.endsWith('?'),
								});
							}
						});
					}
				}

				// Extract example
				const exampleEl = element.querySelector('.tv-pine-reference-item__example code');
				if (exampleEl) {
					res.example = exampleEl.textContent?.trim() || "";
				}

				// Extract namespace from function name
				if (res.name.includes('.')) {
					res.namespace = res.name.split('.')[0];
				}

				return res;
			}

			return extractFromElement(funcElement);
		}, funcNameClean);

		// Save to cache if successful
		if (details) {
			saveToCache(functionName, details);
		}

		return details;
	} catch (error) {
		console.log(`⚠️  Failed to scrape ${functionName}: ${error.message}`);
		return null;
	}
}

async function scrapeAllFunctions(forceRefresh = false) {
	console.log(
		"🚀 Starting Pine Script v6 function details scrape (Puppeteer)...",
	);
	console.log(`📁 Input: ${INPUT_FILE}`);
	console.log(`📁 Output: ${OUTPUT_FILE}`);
	console.log(`📁 Cache: ${CACHE_DIR}`);
	console.log(`⏰ Cache TTL: ${CACHE_TTL / (60 * 60 * 1000)} hours`);
	console.log(`🔄 Force refresh: ${forceRefresh}`);

	// Read input file
	if (!fs.existsSync(INPUT_FILE)) {
		console.error(`❌ Input file not found: ${INPUT_FILE}`);
		process.exit(1);
	}

	const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));
	const functionNames = inputData.functions?.items || [];

	if (functionNames.length === 0) {
		console.error(
			"❌ No functions found in input file. Run crawl script first.",
		);
		process.exit(1);
	}

	console.log(`📋 Found ${functionNames.length} functions to process`);

	// Analyze cache status
	const functionsToScrape = [];
	const functionsFromCache = [];

	if (!forceRefresh) {
		for (const funcName of functionNames) {
			const cacheFilePath = getCacheFilePath(funcName);
			if (isCacheValid(cacheFilePath)) {
				functionsFromCache.push(funcName);
			} else {
				functionsToScrape.push(funcName);
			}
		}
	} else {
		functionsToScrape.push(...functionNames);
	}

	console.log(`📊 Cache analysis:`);
	console.log(`   From cache: ${functionsFromCache.length}`);
	console.log(`   To scrape: ${functionsToScrape.length}`);

	const allDetails = {
		metadata: {
			extractedAt: new Date().toISOString(),
			source: BASE_URL,
			totalFunctions: functionNames.length,
			successfulScrapes: 0,
			failedScrapes: 0,
			cachedResults: functionsFromCache.length,
			forceRefresh,
			method: "Puppeteer",
		},
		functions: {},
	};

	// Load cached data first
	console.log("📋 Loading cached data...");
	for (const funcName of functionsFromCache) {
		const cachedData = getCachedData(funcName);
		if (cachedData) {
			allDetails.functions[funcName] = cachedData;
			allDetails.metadata.successfulScrapes++;
		}
	}

	// Scrape new/updated functions
	if (functionsToScrape.length > 0) {
		console.log("🔍 Scraping new/updated functions (optimized with shared browser)...");

		// Use larger batches since we're using shared browser with hash navigation
		const batchSize = 20;
		const startTime = Date.now();

		for (let i = 0; i < functionsToScrape.length; i += batchSize) {
			const batch = functionsToScrape.slice(i, i + batchSize);
			const batchNum = Math.floor(i / batchSize) + 1;
			const totalBatches = Math.ceil(functionsToScrape.length / batchSize);
			console.log(`📦 Processing batch ${batchNum}/${totalBatches} (${batch.length} functions)`);

			// Process batch sequentially (hash navigation is already fast)
			for (const funcName of batch) {
				const details = await scrapeFunctionDetails(funcName, !forceRefresh);
				if (details) {
					allDetails.functions[funcName] = details;
					allDetails.metadata.successfulScrapes++;
				} else {
					allDetails.metadata.failedScrapes++;
				}
				// Minimal delay - hash navigation is very fast
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			// Progress update
			const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
			const completed = Math.min(i + batchSize, functionsToScrape.length);
			const rate = (completed / elapsed * 60).toFixed(1);
			console.log(`  ✓ Progress: ${completed}/${functionsToScrape.length} (${elapsed}s elapsed, ~${rate} funcs/min)`);

			// Small delay between batches to be nice to the server
			if (i + batchSize < functionsToScrape.length) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}

		// Close shared browser when done
		await closeSharedBrowser();
	}

	// Ensure output directory exists
	const outputDir = path.dirname(OUTPUT_FILE);
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Save results
	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allDetails, null, 2), "utf8");

	console.log("✅ Scrape completed successfully!");
	console.log(`📊 Results:`);
	console.log(`   Total functions: ${allDetails.metadata.totalFunctions}`);
	console.log(`   From cache: ${allDetails.metadata.cachedResults}`);
	console.log(
		`   Freshly scraped: ${allDetails.metadata.successfulScrapes - allDetails.metadata.cachedResults}`,
	);
	console.log(`   Successful: ${allDetails.metadata.successfulScrapes}`);
	console.log(`   Failed: ${allDetails.metadata.failedScrapes}`);
	console.log(`   Method: ${allDetails.metadata.method}`);
	console.log(`💾 Saved to: ${OUTPUT_FILE}`);
}

// Run if called directly
if (require.main === module) {
	const forceRefresh =
		process.argv.includes("--force") || process.argv.includes("-f");
	scrapeAllFunctions(forceRefresh).catch(console.error);
}

module.exports = { scrapeFunctionDetails, scrapeAllFunctions };
