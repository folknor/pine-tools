#!/usr/bin/env -S node --experimental-strip-types

/**
 * Pine Script v6 Documentation Scraper (Puppeteer Version)
 *
 * This script scrapes detailed information for each Pine Script v6 function,
 * including parameters, return types, descriptions, and examples.
 *
 * Uses Puppeteer for lightweight browser automation.
 *
 * Usage: node --experimental-strip-types packages/pipeline/src/scrape.ts [input-file] [output-file]
 * Default input: pine-data/raw/v6/v6-language-constructs.json
 * Default output: pine-data/raw/v6/complete-v6-details.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer, { type Browser, type Page } from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://www.tradingview.com/pine-script-reference/v6/";

// Resolve paths relative to project root
const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../..")
	: path.resolve(__dirname, "../../..");

// Parse arguments, filtering out flags
const positionalArgs = process.argv
	.slice(2)
	.filter((arg) => !arg.startsWith("-"));

const DRY_RUN =
	process.argv.includes("--dry-run") || process.argv.includes("-n");
const DRY_RUN_LIMIT = 5;

const INPUT_FILE =
	positionalArgs[0] ||
	path.join(PROJECT_ROOT, "pine-data/raw/v6/v6-language-constructs.json");
const OUTPUT_FILE =
	positionalArgs[1] ||
	path.join(PROJECT_ROOT, "pine-data/raw/v6/complete-v6-details.json");
const CACHE_DIR = path.join(PROJECT_ROOT, ".cache/function-details");
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface FunctionDetails {
	name: string;
	syntax: string;
	description: string;
	parameters: Array<{
		name: string;
		type: string;
		description: string;
		optional: boolean;
		required: boolean;
	}>;
	returns: string;
	examples: string[];
	namespace: string;
	category: string;
	overloads?: string[];
	variadic?: boolean;
}

interface VariableDetails {
	name: string;
	// Full qualified type string exactly as TV renders it in the "Type"
	// field, e.g. "series float", "simple string", "array<line>".
	// generate.ts parses the qualifier + base type out of this.
	type: string;
	description: string;
	namespace: string;
}

interface ScrapeResult {
	metadata: {
		extractedAt: string;
		source: string;
		totalFunctions: number;
		successfulScrapes: number;
		failedScrapes: number;
		cachedResults: number;
		forceRefresh: boolean;
		method: string;
		totalVariables?: number;
	};
	functions: Record<string, FunctionDetails>;
	variables: Record<string, VariableDetails>;
}

// `prefix` namespaces the cache key so e.g. the `time()` function and the
// `time` variable (which share a name) don't collide on disk.
function getCacheFilePath(name: string, prefix = ""): string {
	const safeName = name.replace(/[^a-zA-Z0-9]/g, "_");
	return path.join(CACHE_DIR, `${prefix}${safeName}.json`);
}

function isCacheValid(cacheFilePath: string): boolean {
	if (!fs.existsSync(cacheFilePath)) {
		return false;
	}

	const stats = fs.statSync(cacheFilePath);
	const age = Date.now() - stats.mtime.getTime();
	return age < CACHE_TTL;
}

function getCachedData<T = FunctionDetails>(
	name: string,
	prefix = "",
): T | null {
	const cacheFilePath = getCacheFilePath(name, prefix);

	if (!isCacheValid(cacheFilePath)) {
		return null;
	}

	try {
		const cachedData = JSON.parse(fs.readFileSync(cacheFilePath, "utf8"));
		console.log(`Using cached data for: ${prefix}${name}`);
		return cachedData;
	} catch {
		console.log(`Invalid cache for ${prefix}${name}, will re-scrape`);
		return null;
	}
}

function saveToCache<T>(name: string, data: T, prefix = ""): void {
	if (DRY_RUN) {
		return;
	}

	const cacheFilePath = getCacheFilePath(name, prefix);

	// Ensure cache directory exists
	if (!fs.existsSync(CACHE_DIR)) {
		fs.mkdirSync(CACHE_DIR, { recursive: true });
	}

	try {
		fs.writeFileSync(cacheFilePath, JSON.stringify(data, null, 2), "utf8");
	} catch (error) {
		console.log(
			`Failed to cache ${prefix}${name}: ${(error as Error).message}`,
		);
	}
}

// Shared browser instance for optimized scraping
let sharedBrowser: Browser | null = null;
let sharedPage: Page | null = null;

async function getSharedBrowser(): Promise<Browser> {
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

async function getSharedPage(): Promise<Page> {
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
		console.log("Loading TradingView reference page...");
		await sharedPage.goto(BASE_URL, {
			waitUntil: "networkidle2",
			timeout: 60000,
		});

		// Wait for initial content
		await sharedPage
			.waitForFunction(
				() => {
					const content = document.body.innerText;
					return content.length > 1000 && !content.includes("Loading");
				},
				{ timeout: 15000 },
			)
			.catch(() => {
				console.log("Initial page load timeout, continuing...");
			});

		console.log("SPA loaded, ready for hash navigation");
	}
	return sharedPage;
}

async function closeSharedBrowser(): Promise<void> {
	if (sharedPage) {
		sharedPage = null;
	}
	if (sharedBrowser) {
		await sharedBrowser.close();
		sharedBrowser = null;
	}
}

export async function scrapeFunctionDetails(
	functionName: string,
	useCache = true,
): Promise<FunctionDetails | null> {
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
		await page.evaluate((hash: string) => {
			window.location.hash = hash;
		}, hashTarget);

		// Brief wait for hash navigation and content update
		await new Promise((resolve) => setTimeout(resolve, 300));

		// Wait for the specific element to be present
		await page
			.waitForFunction(
				(funcName: string) => {
					const el =
						document.getElementById(`fun_${funcName}`) ||
						document.getElementById(`var_${funcName}`) ||
						document.getElementById(`type_${funcName}`);
					return el !== null;
				},
				{ timeout: 5000 },
				funcNameClean,
			)
			.catch(() => {
				// Element not found via ID, will try fallback
			});

		const details = await page.evaluate((funcName: string) => {
			const result: FunctionDetails = {
				name: "",
				syntax: "",
				description: "",
				parameters: [],
				returns: "",
				examples: [],
				namespace: "",
				category: "",
			};

			// Find the specific function element by ID
			const funcElement =
				document.getElementById(`fun_${funcName}`) ||
				document.getElementById(`var_${funcName}`) ||
				document.getElementById(`type_${funcName}`) ||
				document.getElementById(`kw_${funcName}`) ||
				document.getElementById(`op_${funcName}`);

			if (!funcElement) {
				// Try to find by searching all items
				const items = document.querySelectorAll(".tv-pine-reference-item");
				for (const item of items) {
					const header = item.querySelector(".tv-pine-reference-item__header");
					if (
						header &&
						header.textContent?.replace(/[()]/g, "").trim() === funcName
					) {
						return extractFromElement(item as HTMLElement);
					}
				}
				return result;
			}

			function extractFromElement(element: HTMLElement): FunctionDetails {
				const res: FunctionDetails & {
					overloads?: string[];
					variadic?: boolean;
				} = {
					name: "",
					syntax: "",
					description: "",
					parameters: [],
					returns: "",
					examples: [],
					namespace: "",
					category: "",
				};

				// Extract name from header
				const headerEl = element.querySelector(
					".tv-pine-reference-item__header",
				);
				if (headerEl) {
					res.name = headerEl.textContent?.trim() || "";
				}

				// Extract ALL syntaxes (there may be multiple overloads)
				const syntaxEls = element.querySelectorAll(
					".tv-pine-reference-item__syntax",
				);
				const allSyntaxes: string[] = [];
				syntaxEls.forEach((syntaxEl) => {
					const syntaxText = syntaxEl.textContent?.trim() || "";
					if (syntaxText) {
						allSyntaxes.push(syntaxText);
					}
				});

				// Use the first syntax as the primary one
				if (allSyntaxes.length > 0) {
					res.syntax = allSyntaxes[0];
					// Extract return type from syntax
					const returnMatch = res.syntax.match(/→\s*(.+)$/);
					if (returnMatch) {
						res.returns = returnMatch[1].trim();
					}
					// Store all syntaxes for overload analysis
					if (allSyntaxes.length > 1) {
						res.overloads = allSyntaxes;
					}
				}

				// Extract description
				const textElements = element.querySelectorAll(
					".tv-pine-reference-item__text.tv-text",
				);
				if (textElements.length > 0) {
					const firstText = textElements[0];
					if (!firstText.querySelector(".tv-pine-reference-item__arg-type")) {
						res.description = firstText.textContent?.trim() || "";
					}
				}

				// Extract parameters from argument descriptions
				const argElements = element.querySelectorAll(
					".tv-pine-reference-item__arg-type",
				);
				argElements.forEach((argEl) => {
					const argText = argEl.textContent?.trim() || "";
					const match = argText.match(/^(\w+)\s*\(([^)]+)\)/);
					if (match) {
						const paramName = match[1];
						const paramType = match[2];
						const parentText = argEl.parentElement?.textContent?.trim() || "";
						const descText = parentText.replace(argText, "").trim();

						const descLower = descText.toLowerCase();
						const hasDefault =
							descLower.includes("the default is") ||
							descLower.includes("defaults to") ||
							descLower.includes("default value is") ||
							descLower.includes("default is ");
						const isExplicitlyOptional =
							argText.toLowerCase().includes("optional") ||
							paramName.startsWith("[") ||
							descLower.includes("optional argument") ||
							descLower.includes("optional.");
						const isExplicitlyRequired =
							descLower.includes("required argument");
						const isOptional =
							isExplicitlyOptional || hasDefault || !isExplicitlyRequired;

						res.parameters.push({
							name: paramName,
							type: paramType,
							description: descText,
							optional: isOptional,
							required: !isOptional,
						});
					}
				});

				// Extract parameters from ALL overloads
				const paramsByName = new Map<
					string,
					{
						name: string;
						type: string;
						description: string;
						optional: boolean;
						required: boolean;
					}
				>();

				const parseParamsFromSyntax = (
					syntaxStr: string,
					isFirstOverload = false,
				) => {
					const syntaxMatch = syntaxStr.match(/^[^(]+\(([^)]+)\)/);
					if (syntaxMatch) {
						const paramsStr = syntaxMatch[1];
						const parts = paramsStr.split(/,\s*/);
						parts.forEach((part) => {
							const trimmed = part.trim();
							if (trimmed === "...") {
								res.variadic = true;
							} else if (trimmed) {
								const existingParam = paramsByName.get(trimmed);
								if (!existingParam) {
									paramsByName.set(trimmed, {
										name: trimmed,
										type: "unknown",
										description: "",
										optional:
											!isFirstOverload ||
											trimmed.startsWith("[") ||
											trimmed.endsWith("?"),
										required:
											isFirstOverload &&
											!trimmed.startsWith("[") &&
											!trimmed.endsWith("?"),
									});
								}
							}
						});
					}
				};

				if (res.syntax) {
					parseParamsFromSyntax(res.syntax, true);
				}

				if (res.overloads) {
					res.overloads.slice(1).forEach((overload) => {
						parseParamsFromSyntax(overload, false);
					});
				}

				if (paramsByName.size > res.parameters.length) {
					const mergedParams: typeof res.parameters = [];
					for (const [name, syntaxParam] of paramsByName) {
						const argTypeParam = res.parameters.find((p) => p.name === name);
						if (argTypeParam) {
							mergedParams.push(argTypeParam);
						} else {
							mergedParams.push(syntaxParam);
						}
					}
					res.parameters = mergedParams;
				}

				if (res.parameters.length === 0 && res.syntax) {
					const syntaxMatch = res.syntax.match(/^[^(]+\(([^)]+)\)/);
					if (syntaxMatch) {
						const paramsStr = syntaxMatch[1];
						const parts = paramsStr.split(/,\s*/);
						parts.forEach((part) => {
							const trimmed = part.trim();
							if (trimmed === "...") {
								res.variadic = true;
							} else if (trimmed) {
								res.parameters.push({
									name: trimmed,
									type: "unknown",
									description: "",
									optional: trimmed.startsWith("[") || trimmed.endsWith("?"),
									required: !trimmed.startsWith("[") && !trimmed.endsWith("?"),
								});
							}
						});
					}
				}

				// Extract examples. Functions can have multiple example snippets,
				// rendered as separate sibling .tv-pine-reference-item__example
				// blocks — querySelectorAll captures all of them.
				// Use innerText (not textContent) so <br> and block-element boundaries
				// produce real newlines instead of being silently collapsed.
				// TradingView emits &nbsp; for every space inside code blocks, so
				// normalize U+00A0 back to regular spaces — otherwise pasted examples
				// fail to parse as Pine Script.
				const exampleEls = element.querySelectorAll(
					".tv-pine-reference-item__example code",
				);
				for (const exampleEl of exampleEls) {
					const text = ((exampleEl as HTMLElement).innerText || "")
						.replace(/\u00a0/g, " ")
						.trim();
					if (text) res.examples.push(text);
				}

				// Extract namespace from function name
				if (res.name.includes(".")) {
					res.namespace = res.name.split(".")[0];
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
		console.log(
			`Failed to scrape ${functionName}: ${(error as Error).message}`,
		);
		return null;
	}
}

// Scrape a built-in variable's detail page. Unlike functions, variables have
// no syntax/params; their type lives in a dedicated "Type" sub-header whose
// next sibling text node holds the full qualified type (e.g. "series float").
export async function scrapeVariableDetails(
	variableName: string,
	useCache = true,
): Promise<VariableDetails | null> {
	if (useCache) {
		const cached = getCachedData<VariableDetails>(variableName, "var__");
		if (cached) {
			return cached;
		}
	}

	try {
		const page = await getSharedPage();
		const hashTarget = `var_${variableName}`;

		await page.evaluate((hash: string) => {
			window.location.hash = hash;
		}, hashTarget);

		await new Promise((resolve) => setTimeout(resolve, 300));

		await page
			.waitForFunction(
				(name: string) => document.getElementById(`var_${name}`) !== null,
				{ timeout: 5000 },
				variableName,
			)
			.catch(() => {
				// Element not found; extraction below returns null.
			});

		const details = await page.evaluate((name: string) => {
			const el = document.getElementById(`var_${name}`);
			if (!el) return null;

			const headerEl = el.querySelector(".tv-pine-reference-item__header");
			const resolvedName = headerEl?.textContent?.trim() || name;

			// Type: the __text sibling that follows the "Type" sub-header.
			let type = "";
			const subHeaders = el.querySelectorAll(
				".tv-pine-reference-item__sub-header",
			);
			for (const sh of subHeaders) {
				if ((sh.textContent || "").trim() === "Type") {
					let sibling = sh.nextElementSibling;
					while (
						sibling &&
						!sibling.classList.contains("tv-pine-reference-item__text")
					) {
						sibling = sibling.nextElementSibling;
					}
					if (sibling) {
						type = (sibling.textContent || "").replace(/\s+/g, " ").trim();
					}
					break;
				}
			}

			// Description: the first __text.tv-text block that is neither an
			// argument-type entry nor the Type value itself (it precedes Type
			// in document order, so this resolves to the prose description).
			let description = "";
			const texts = el.querySelectorAll(
				".tv-pine-reference-item__text.tv-text",
			);
			for (const t of texts) {
				if (t.querySelector(".tv-pine-reference-item__arg-type")) continue;
				const txt = (t.textContent || "").trim();
				if (!txt || txt === type) continue;
				description = txt;
				break;
			}

			return {
				name: resolvedName,
				type,
				description,
				namespace: resolvedName.includes(".") ? resolvedName.split(".")[0] : "",
			};
		}, variableName);

		if (details) {
			saveToCache(variableName, details, "var__");
		}

		return details;
	} catch (error) {
		console.log(
			`Failed to scrape variable ${variableName}: ${(error as Error).message}`,
		);
		return null;
	}
}

export async function scrapeAllFunctions(
	forceRefresh = false,
): Promise<ScrapeResult> {
	console.log("Starting Pine Script v6 function details scrape (Puppeteer)...");
	console.log(`Input: ${INPUT_FILE}`);
	console.log(`Output: ${OUTPUT_FILE}`);
	console.log(`Cache: ${CACHE_DIR}`);
	console.log(`Cache TTL: ${CACHE_TTL / (60 * 60 * 1000)} hours`);
	console.log(`Force refresh: ${forceRefresh}`);

	// Read input file
	if (!fs.existsSync(INPUT_FILE)) {
		console.error(`Input file not found: ${INPUT_FILE}`);
		process.exit(1);
	}

	const inputData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf8"));

	// Build function list from byNamespace structure
	let functionNames: string[] = [];

	if (inputData.functions?.byNamespace) {
		for (const [namespace, funcs] of Object.entries(
			inputData.functions.byNamespace,
		)) {
			for (const func of funcs as string[]) {
				const baseName = func.replace(/\(\)$/, "");
				const fullName =
					namespace === "global" ? baseName : `${namespace}.${baseName}`;
				functionNames.push(fullName);
			}
		}
	} else if (inputData.functions?.items) {
		functionNames = inputData.functions.items;
	}

	if (functionNames.length === 0) {
		console.error("No functions found in input file. Run crawl script first.");
		process.exit(1);
	}

	functionNames.sort();

	console.log(`Found ${functionNames.length} functions to process`);

	// Analyze cache status
	const functionsToScrape: string[] = [];
	const functionsFromCache: string[] = [];

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

	if (DRY_RUN && functionsToScrape.length > DRY_RUN_LIMIT) {
		console.log(
			`[dry-run] Limiting fresh scrapes from ${functionsToScrape.length} to ${DRY_RUN_LIMIT}`,
		);
		functionsToScrape.splice(DRY_RUN_LIMIT);
	}

	console.log(`Cache analysis:`);
	console.log(`   From cache: ${functionsFromCache.length}`);
	console.log(`   To scrape: ${functionsToScrape.length}`);

	// Build variable list (namespaced members + standalone) from the crawl.
	const variableNames: string[] = [];
	const varByNamespace = inputData.builtInVariables?.byNamespace as
		| Record<string, string[]>
		| undefined;
	if (varByNamespace) {
		for (const [namespace, members] of Object.entries(varByNamespace)) {
			for (const member of members) {
				variableNames.push(`${namespace}.${member}`);
			}
		}
	}
	for (const name of inputData.builtInVariables?.standalone?.items || []) {
		variableNames.push(name);
	}
	variableNames.sort();
	console.log(`Found ${variableNames.length} variables to process`);

	const variablesToScrape: string[] = [];
	const variablesFromCache: string[] = [];
	if (!forceRefresh) {
		for (const name of variableNames) {
			if (isCacheValid(getCacheFilePath(name, "var__"))) {
				variablesFromCache.push(name);
			} else {
				variablesToScrape.push(name);
			}
		}
	} else {
		variablesToScrape.push(...variableNames);
	}
	if (DRY_RUN && variablesToScrape.length > DRY_RUN_LIMIT) {
		variablesToScrape.splice(DRY_RUN_LIMIT);
	}
	console.log(`   Variables from cache: ${variablesFromCache.length}`);
	console.log(`   Variables to scrape: ${variablesToScrape.length}`);

	const allDetails: ScrapeResult = {
		metadata: {
			extractedAt: new Date().toISOString(),
			source: BASE_URL,
			totalFunctions: functionNames.length,
			successfulScrapes: 0,
			failedScrapes: 0,
			cachedResults: functionsFromCache.length,
			forceRefresh,
			method: "Puppeteer",
			totalVariables: variableNames.length,
		},
		functions: {},
		variables: {},
	};

	// Load cached data first
	console.log("Loading cached data...");
	for (const funcName of functionsFromCache) {
		const cachedData = getCachedData(funcName);
		if (cachedData) {
			allDetails.functions[funcName] = cachedData;
			allDetails.metadata.successfulScrapes++;
		}
	}
	for (const name of variablesFromCache) {
		const cached = getCachedData<VariableDetails>(name, "var__");
		if (cached) {
			allDetails.variables[name] = cached;
		}
	}

	// Scrape new/updated functions
	if (functionsToScrape.length > 0) {
		console.log(
			"Scraping new/updated functions (optimized with shared browser)...",
		);

		const batchSize = 20;
		const startTime = Date.now();

		for (let i = 0; i < functionsToScrape.length; i += batchSize) {
			const batch = functionsToScrape.slice(i, i + batchSize);
			const batchNum = Math.floor(i / batchSize) + 1;
			const totalBatches = Math.ceil(functionsToScrape.length / batchSize);
			console.log(
				`Processing batch ${batchNum}/${totalBatches} (${batch.length} functions)`,
			);

			for (const funcName of batch) {
				const details = await scrapeFunctionDetails(funcName, !forceRefresh);
				if (details) {
					allDetails.functions[funcName] = details;
					allDetails.metadata.successfulScrapes++;
				} else {
					allDetails.metadata.failedScrapes++;
				}
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
			const completed = Math.min(i + batchSize, functionsToScrape.length);
			const rate = ((completed / Number(elapsed)) * 60).toFixed(1);
			console.log(
				`  Progress: ${completed}/${functionsToScrape.length} (${elapsed}s elapsed, ~${rate} funcs/min)`,
			);

			if (i + batchSize < functionsToScrape.length) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}
	}

	// Scrape variables (shares the browser opened above, if any).
	if (variablesToScrape.length > 0) {
		console.log("Scraping variable details...");
		const batchSize = 20;
		const startTime = Date.now();

		for (let i = 0; i < variablesToScrape.length; i += batchSize) {
			const batch = variablesToScrape.slice(i, i + batchSize);
			for (const name of batch) {
				const details = await scrapeVariableDetails(name, !forceRefresh);
				if (details) {
					allDetails.variables[name] = details;
				} else {
					allDetails.metadata.failedScrapes++;
				}
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
			const completed = Math.min(i + batchSize, variablesToScrape.length);
			console.log(
				`  Variables: ${completed}/${variablesToScrape.length} (${elapsed}s elapsed)`,
			);

			if (i + batchSize < variablesToScrape.length) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}
	}

	if (functionsToScrape.length > 0 || variablesToScrape.length > 0) {
		await closeSharedBrowser();
	}

	const serialized = JSON.stringify(allDetails, null, 2);

	if (DRY_RUN) {
		const dryRunFile = OUTPUT_FILE.replace(/\.json$/, ".dryrun.json");
		const outputDir = path.dirname(dryRunFile);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}
		fs.writeFileSync(dryRunFile, serialized, "utf8");
		console.log(
			`[dry-run] Wrote sample to ${dryRunFile} (${serialized.length} bytes); real output ${OUTPUT_FILE} untouched`,
		);
	} else {
		// Ensure output directory exists
		const outputDir = path.dirname(OUTPUT_FILE);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Save results
		fs.writeFileSync(OUTPUT_FILE, serialized, "utf8");
	}

	console.log("Scrape completed successfully!");
	console.log(`Results:`);
	console.log(`   Total functions: ${allDetails.metadata.totalFunctions}`);
	console.log(`   From cache: ${allDetails.metadata.cachedResults}`);
	console.log(
		`   Freshly scraped: ${allDetails.metadata.successfulScrapes - allDetails.metadata.cachedResults}`,
	);
	console.log(`   Successful: ${allDetails.metadata.successfulScrapes}`);
	console.log(`   Failed: ${allDetails.metadata.failedScrapes}`);
	console.log(`   Total variables: ${allDetails.metadata.totalVariables}`);
	console.log(
		`   Variables captured: ${Object.keys(allDetails.variables).length}`,
	);
	console.log(`   Method: ${allDetails.metadata.method}`);
	console.log(
		DRY_RUN
			? `[dry-run] Would save to: ${OUTPUT_FILE}`
			: `Saved to: ${OUTPUT_FILE}`,
	);

	return allDetails;
}

// Run if executed directly
const forceRefresh =
	process.argv.includes("--force") || process.argv.includes("-f");
scrapeAllFunctions(forceRefresh).catch(console.error);
