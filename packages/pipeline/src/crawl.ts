#!/usr/bin/env -S node --experimental-strip-types

/**
 * Pine Script v6 Documentation Crawler (Dynamic Discovery Version)
 *
 * This script crawls official TradingView Pine Script v6 reference
 * and dynamically extracts all language constructs from the webpage content.
 *
 * Uses Puppeteer for lightweight browser automation.
 *
 * Usage: node --experimental-strip-types packages/pipeline/src/crawl.ts [output-file]
 * Default output: pine-data/raw/v6/v6-language-constructs.json
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import puppeteer from "puppeteer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = "https://www.tradingview.com/pine-script-reference/v6/";

// Resolve paths relative to project root
const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../..")
	: path.resolve(__dirname, "../../..");

const DRY_RUN =
	process.argv.includes("--dry-run") || process.argv.includes("-n");

const positionalArgs = process.argv
	.slice(2)
	.filter((arg) => !arg.startsWith("-"));

const OUTPUT_FILE =
	positionalArgs[0] ||
	path.join(PROJECT_ROOT, "pine-data/raw/v6/v6-language-constructs.json");

interface DiscoveryStats {
	tocItemsFound: number;
	codeBlocksAnalyzed: number;
	variablesDiscovered: number;
	functionsDiscovered: number;
	constantsDiscovered: number;
	typesDiscovered: number;
	keywordsDiscovered: number;
	operatorsDiscovered: number;
}

interface CrawlResult {
	metadata: {
		extractedAt: string;
		source: string;
		totalItems: number;
		extractionMethod: string;
		discoveryStats: DiscoveryStats;
		unclassifiedPrefixes?: Record<string, number>;
	};
	keywords: { count: number; items: string[] };
	operators: { count: number; items: string[] };
	builtInVariables: {
		standalone: { count: number; items: string[] };
		namespaces: { count: number; items: string[] };
		byNamespace: Record<string, string[]>;
	};
	constants: {
		namespaces: { count: number; items: string[] };
		byNamespace: Record<string, string[]>;
	};
	functions: {
		namespaces: { count: number; items: string[] };
		byNamespace: Record<string, string[]>;
	};
	types: { count: number; items: string[] };
	annotations: { count: number; items: string[] };
}

export async function crawlPineScriptReference(): Promise<CrawlResult> {
	console.log(
		"Starting Pine Script v6 documentation crawl (Dynamic Discovery)...",
	);
	console.log(`Source: ${BASE_URL}`);
	console.log(`Output: ${OUTPUT_FILE}`);

	let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;

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
		console.log("Loading main reference page...");
		await page.goto(BASE_URL, {
			waitUntil: "networkidle2",
			timeout: 30000,
		});

		await page.waitForNetworkIdle();

		// Wait for dynamic content to load
		await new Promise((resolve) => setTimeout(resolve, 8000));

		// Extract all language constructs using dynamic discovery
		console.log("Extracting language constructs...");

		const constructs = await page.evaluate(() => {
			const result = {
				metadata: {
					extractedAt: new Date().toISOString(),
					source: window.location.href,
					totalItems: 0,
					extractionMethod: "dynamic_discovery",
					discoveryStats: {
						tocItemsFound: 0,
						codeBlocksAnalyzed: 0,
						variablesDiscovered: 0,
						functionsDiscovered: 0,
						constantsDiscovered: 0,
						typesDiscovered: 0,
						keywordsDiscovered: 0,
						operatorsDiscovered: 0,
					},
				},
				keywords: { count: 0, items: [] as string[] },
				operators: { count: 0, items: [] as string[] },
				builtInVariables: {
					standalone: { count: 0, items: [] as string[] },
					namespaces: { count: 0, items: [] as string[] },
					byNamespace: {} as Record<string, string[]>,
				},
				constants: {
					namespaces: { count: 0, items: [] as string[] },
					byNamespace: {} as Record<string, string[]>,
				},
				functions: {
					namespaces: { count: 0, items: [] as string[] },
					byNamespace: {} as Record<string, string[]>,
				},
				types: { count: 0, items: [] as string[] },
				annotations: { count: 0, items: [] as string[] },
			};

			// Extract all TOC items (this is where all language constructs are listed)
			const tocLinks = document.querySelectorAll(".tv-pine-reference-toc-item");
			const allDiscoveredItems = {
				variables: [] as string[],
				functions: [] as string[],
				constants: [] as string[],
				types: [] as string[],
				annotations: [] as string[],
				keywords: new Set<string>(),
				operators: new Set<string>(),
			};
			// One-run safety net: tally TOC href prefixes (#<prefix>_) we DON'T
			// classify, so a single crawl reveals the real annotation anchor prefix
			// if it isn't `an_`.
			const unclassifiedPrefixes: Record<string, number> = {};

			// Categorize TOC items by their URL patterns
			tocLinks.forEach((link) => {
				const href = (link as HTMLAnchorElement).href;
				const text = link.textContent?.trim() || "";

				if (href && text) {
					if (href.includes("#var_")) {
						allDiscoveredItems.variables.push(text);
					} else if (href.includes("#fun_")) {
						allDiscoveredItems.functions.push(text);
					} else if (href.includes("#const_")) {
						allDiscoveredItems.constants.push(text);
					} else if (href.includes("#type_")) {
						allDiscoveredItems.types.push(text);
					} else if (href.includes("#an_")) {
						allDiscoveredItems.annotations.push(text);
					} else if (href.includes("#op_")) {
						// Operators are grammar the parser hardcodes (we don't emit an
						// operators.json), but discover them from the TOC so the raw
						// constructs hold the accurate documented set rather than the
						// garbage a code-block regex produced (`=-`, `><`, `=|:=`, …).
						allDiscoveredItems.operators.add(text);
					} else {
						const m = href.match(/#([a-z]+)_/i);
						if (m) {
							unclassifiedPrefixes[m[1]] =
								(unclassifiedPrefixes[m[1]] || 0) + 1;
						}
					}
				}
			});

			// Extract keywords from code blocks throughout the page. (Operators are
			// discovered from the #op_ TOC links above, not here - a char-class
			// regex over code produced garbage like `=-`, `><`, `=|:=`.)
			const codeBlocks = document.querySelectorAll("code, pre");

			// Pine Script keywords pattern
			const keywordRegex =
				/\b(and|or|not|if|else|for|while|do|switch|case|default|break|continue|return|var|let|const|import|export|true|false|na|null|enum|method|type|varip)\b/g;

			codeBlocks.forEach((block) => {
				const text = block.textContent || "";

				// Extract keywords
				keywordRegex.lastIndex = 0;
				let match: RegExpExecArray | null;
				for (;;) {
					match = keywordRegex.exec(text);
					if (match === null) break;
					allDiscoveredItems.keywords.add(match[1]);
				}
			});

			// Separate variables into standalone and namespaced. Keep the full
			// member name per namespace (not just the prefix) so scrape + generate
			// can resolve each variable's detail page - mirrors how functions and
			// constants are captured below.
			const standaloneVariables: string[] = [];
			const variableNamespaces = new Set<string>();
			const variablesByNamespace: Record<string, string[]> = {};

			allDiscoveredItems.variables.forEach((variable) => {
				if (variable.includes(".")) {
					const parts = variable.split(".");
					const namespace = parts[0];
					const member = parts.slice(1).join(".");
					variableNamespaces.add(namespace);
					if (!variablesByNamespace[namespace]) {
						variablesByNamespace[namespace] = [];
					}
					variablesByNamespace[namespace].push(member);
				} else {
					standaloneVariables.push(variable);
				}
			});

			// Organize functions by namespace
			const functionNamespaces = new Set<string>();
			const functionsByNamespace: Record<string, string[]> = {};

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
			const constantNamespaces = new Set<string>();
			const constantsByNamespace: Record<string, string[]> = {};

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
			result.annotations.items = allDiscoveredItems.annotations.sort();
			result.annotations.count = result.annotations.items.length;
			(result.metadata as Record<string, unknown>).unclassifiedPrefixes =
				unclassifiedPrefixes;

			// Variables
			result.builtInVariables.standalone.items = standaloneVariables.sort();
			result.builtInVariables.namespaces.items =
				Array.from(variableNamespaces).sort();
			result.builtInVariables.byNamespace = variablesByNamespace;

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

		const serialized = JSON.stringify(constructs, null, 2);

		if (DRY_RUN) {
			console.log(
				`[dry-run] Skipping write to ${OUTPUT_FILE} (${serialized.length} bytes)`,
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

		console.log("Crawl completed successfully!");
		console.log(`Results:`);
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
		console.log(`   Annotations: ${constructs.annotations.count}`);
		console.log(
			`   Unclassified TOC prefixes: ${JSON.stringify(constructs.metadata.unclassifiedPrefixes)}`,
		);
		console.log(`   Total: ${constructs.metadata.totalItems}`);
		console.log(`Discovery Stats:`);
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
		console.log(
			DRY_RUN
				? `[dry-run] Would save to: ${OUTPUT_FILE}`
				: `Saved to: ${OUTPUT_FILE}`,
		);

		return constructs;
	} catch (error) {
		console.error("Crawl failed:", (error as Error).message);
		process.exit(1);
	} finally {
		if (browser) {
			await browser.close();
		}
	}
}

// Run if executed directly
crawlPineScriptReference().catch(console.error);
