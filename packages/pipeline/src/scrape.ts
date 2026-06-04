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
import { parseArgTypeText } from "./arg-parse.ts";
import { operatorSlug } from "./section-parse.ts";

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

// Local raw-DOM mirror. The overloaded-function arg widget is rendered
// dynamically per overload sub-anchor, so a flat page dump can't capture it;
// instead we snapshot the `#fun_<name>` element's HTML at each sub-anchor we
// already visit in collectOverloadArgs. This lets DOM-extraction logic be
// iterated fully offline against the mirror, with no further TradingView hits.
// Kept under .cache/ (gitignored) on purpose: it is a local build artifact,
// not vendor data, and must never be committed to a public repo. See TODO #22.
const MIRROR_DIR = path.join(PROJECT_ROOT, ".cache/dom");

function saveDomSnapshot(name: string, label: string, html: string): void {
	try {
		const safeName = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
		const dir = path.join(MIRROR_DIR, safeName);
		if (!fs.existsSync(dir)) {
			fs.mkdirSync(dir, { recursive: true });
		}
		fs.writeFileSync(path.join(dir, `${label}.html`), html, "utf8");
	} catch (error) {
		console.warn(
			`Failed to mirror DOM for ${name}/${label}: ${(error as Error).message}`,
		);
	}
}

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
	// Complete per-overload argument capture (index = overload index). The
	// offline union step (union-types.ts) turns this into per-param types, so
	// type/union logic can be iterated without re-scraping. See TODO #17.
	// description recovers per-overload arg text the merged param list drops for
	// later-overload-only params. See TODO #25.
	overloadArgs?: Array<
		Array<{ name: string; type: string; description?: string }>
	>;
}

// A built-in variable or constant detail. Both render their type the same way:
// a "Type" sub-header whose sibling holds the full qualified type, e.g.
// "series float", "const color", "const plot_simple_display". generate.ts
// parses the qualifier + base type out of `type`.
interface MemberDetails {
	name: string;
	type: string;
	description: string;
	namespace: string;
}

// A built-in TYPE detail page (its own reference entry, e.g. `chart.point`,
// `line`, `int`). Unlike functions these have no syntax/params; they carry a
// description, examples, and - only for the few non-opaque types like
// chart.point - a Fields list. The opaque ID types (line/label/box/table/…) are
// manipulated via `.*()` functions and expose no fields. See TODO #25.
interface TypeDetails {
	name: string;
	description: string;
	examples: string[];
	fields?: Array<{ name: string; type: string; description: string }>;
	namespace?: string;
}

// A compiler/doc annotation detail page (`//@version`, `//@param`, `//@type`,
// …), reached via the `an_<name>` anchor. Carries a description, an optional
// syntax line, and examples. See TODO #25.
interface AnnotationDetails {
	name: string;
	description: string;
	syntax?: string;
	examples: string[];
}

// A Pine operator detail page (`+`, `?:`, `[]`, …), reached via the `op_<sym>`
// anchor. Rendered like the other reference items: a prose description, a
// Syntax line (`expr1 - expr2`, not a typed `→` signature), and optional
// examples. Returns/Remarks/See-also prose are re-derived offline from the
// mirror by reextract-sections.ts, same as every other catalog.
interface OperatorDetails {
	name: string;
	syntax?: string;
	description: string;
	examples: string[];
}

// A language keyword detail page (`for`, `and`, `import`, …), reached via the
// `kw_<name>` anchor - with a `const_<name>` fallback for the literal keywords
// `true`/`false`, which TV documents under the constants anchor. Carries a
// description and (rarely) a syntax line; Remarks/See-also prose are re-derived
// offline from the mirror by reextract-sections.ts, same as every other catalog.
interface KeywordDetails {
	name: string;
	syntax?: string;
	description: string;
	examples: string[];
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
		totalConstants?: number;
		totalTypes?: number;
		totalAnnotations?: number;
		totalOperators?: number;
		totalKeywords?: number;
	};
	functions: Record<string, FunctionDetails>;
	variables: Record<string, MemberDetails>;
	constants: Record<string, MemberDetails>;
	types?: Record<string, TypeDetails>;
	annotations?: Record<string, AnnotationDetails>;
	operators?: Record<string, OperatorDetails>;
	keywords?: Record<string, KeywordDetails>;
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

// Whether a DOM mirror snapshot exists for an item. The mirror dir uses the
// saveDomSnapshot safeName (keeps dots), distinct from the cache key. Members
// (var/const) were not mirrored historically, so a valid details cache can
// coexist with a missing mirror - the orchestrator re-scrapes those to backfill
// the snapshot the offline reextract passes need.
function hasMirror(name: string, mirrorPrefix = ""): boolean {
	const safeName = `${mirrorPrefix}${name}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
	return fs.existsSync(path.join(MIRROR_DIR, safeName, "base.html"));
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

// TradingView renders an overloaded function's Arguments box as a live widget:
// each overload is an `<a href="#fun_<name>-<i>">` anchor, and the bare
// `#fun_<name>` anchor resolves to overload #0. So the single-pass extract only
// ever sees overload #0's resolved param types. Visit each sub-anchor and
// capture every overload's arg types into `details.overloadArgs` (index =
// overload index). The union into per-param types happens OFFLINE at
// generate-time (union-types.ts) so the rule can be iterated without
// re-scraping. See TODO #17.
async function collectOverloadArgs(
	page: Page,
	funcNameClean: string,
	details: FunctionDetails,
): Promise<void> {
	const overloadCount = details.overloads?.length ?? 0;
	const overloadArgs: Array<Array<{ name: string; type: string }>> = [];

	for (let i = 0; i < overloadCount; i++) {
		await page.evaluate(
			(name: string, idx: number) => {
				window.location.hash = `#fun_${name}-${idx}`;
			},
			funcNameClean,
			i,
		);
		await new Promise((resolve) => setTimeout(resolve, 250));

		const { argTexts, html } = await page.evaluate((name: string) => {
			const el = document.getElementById(`fun_${name}`);
			if (!el) return { argTexts: [] as string[], html: "" };
			const texts: string[] = [];
			for (const node of el.querySelectorAll(
				".tv-pine-reference-item__arg-type",
			)) {
				// The arg-type span holds only "name (type)"; the description is
				// sibling text in the parent __text div. Capture the parent's full
				// textContent ("name (type) description") so parseArgTypeText gets
				// the description too. see TODO #25
				const row = node.parentElement ?? node;
				texts.push(row.textContent?.trim() || "");
			}
			return { argTexts: texts, html: el.outerHTML };
		}, funcNameClean);

		// Snapshot the rendered element for this overload so the arg-type
		// extraction can be re-derived offline. see TODO #22
		if (html) saveDomSnapshot(funcNameClean, `overload-${i}`, html);

		// Parse in Node via the shared parser so the live scrape and the offline
		// mirror re-extractor stay byte-identical. Handles the variadic
		// "name0, name1, ... (type)" rows. see TODO #22
		overloadArgs.push(argTexts.flatMap(parseArgTypeText));
	}

	details.overloadArgs = overloadArgs;
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
				// blocks - querySelectorAll captures all of them.
				// Use innerText (not textContent) so <br> and block-element boundaries
				// produce real newlines instead of being silently collapsed.
				// TradingView emits &nbsp; for every space inside code blocks, so
				// normalize U+00A0 back to regular spaces - otherwise pasted examples
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

		// Snapshot the base (#fun_<name>, overload #0) element so even
		// non-overloaded functions land in the offline mirror. see TODO #22
		const baseHtml = await page.evaluate((name: string) => {
			const el =
				document.getElementById(`fun_${name}`) ||
				document.getElementById(`var_${name}`) ||
				document.getElementById(`type_${name}`);
			return el ? el.outerHTML : "";
		}, funcNameClean);
		if (baseHtml) saveDomSnapshot(funcNameClean, "base", baseHtml);

		// Overloaded functions: the single-pass extract above only saw overload
		// #0's resolved param types (the bare #fun_<name> anchor). Visit each
		// #fun_<name>-<i> sub-anchor and capture every overload's arg types;
		// the per-param union is computed offline at generate-time.
		if (details?.overloads && details.overloads.length > 1) {
			await collectOverloadArgs(page, funcNameClean, details);
		}

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

// Scrape a built-in variable or constant detail page. Unlike functions, these
// have no syntax/params; their type lives in a dedicated "Type" sub-header
// whose next sibling text node holds the full qualified type (e.g. "series
// float", "const plot_simple_display"). `kind` selects the anchor (var_/const_)
// and the cache namespace.
export async function scrapeMemberDetails(
	name: string,
	kind: "var" | "const",
	useCache = true,
): Promise<MemberDetails | null> {
	const cachePrefix = `${kind}__`;
	if (useCache) {
		const cached = getCachedData<MemberDetails>(name, cachePrefix);
		if (cached) {
			return cached;
		}
	}

	try {
		const page = await getSharedPage();
		const elementId = `${kind}_${name}`;

		await page.evaluate((hash: string) => {
			window.location.hash = hash;
		}, elementId);

		await new Promise((resolve) => setTimeout(resolve, 300));

		await page
			.waitForFunction(
				(id: string) => document.getElementById(id) !== null,
				{ timeout: 5000 },
				elementId,
			)
			.catch(() => {
				// Element not found; extraction below returns null.
			});

		const details = await page.evaluate(
			(id: string, fallbackName: string) => {
				const el = document.getElementById(id);
				if (!el) return null;

				const headerEl = el.querySelector(".tv-pine-reference-item__header");
				const resolvedName = headerEl?.textContent?.trim() || fallbackName;

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
					namespace: resolvedName.includes(".")
						? resolvedName.split(".")[0]
						: "",
					html: el.outerHTML,
				};
			},
			elementId,
			name,
		);

		if (details) {
			// Mirror the rendered element so the prose sub-sections (Returns /
			// Remarks / See also) can be re-derived offline by reextract-sections.
			// Namespaced by kind (var__/const__) to avoid colliding with the
			// function mirror of a same-named symbol (e.g. `time`/`time()`).
			if (details.html) {
				saveDomSnapshot(`${cachePrefix}${name}`, "base", details.html);
			}
			const { html: _html, ...member } = details;
			saveToCache(name, member, cachePrefix);
			return member;
		}

		return details;
	} catch (error) {
		console.log(
			`Failed to scrape ${kind} ${name}: ${(error as Error).message}`,
		);
		return null;
	}
}

// Scrape a built-in TYPE detail page via its `type_<name>` anchor. Captures
// description, examples, and any Fields rows (rendered like argument rows;
// present for non-opaque types such as chart.point). Mirrors the DOM so field
// extraction can be iterated offline. See TODO #25.
export async function scrapeTypeDetails(
	name: string,
	useCache = true,
): Promise<TypeDetails | null> {
	if (useCache) {
		const cached = getCachedData<TypeDetails>(name, "type__");
		if (cached) return cached;
	}

	try {
		const page = await getSharedPage();
		const elementId = `type_${name}`;

		await page.evaluate((hash: string) => {
			window.location.hash = hash;
		}, elementId);
		await new Promise((resolve) => setTimeout(resolve, 300));
		await page
			.waitForFunction(
				(id: string) => document.getElementById(id) !== null,
				{ timeout: 5000 },
				elementId,
			)
			.catch(() => {});

		const result = await page.evaluate(
			(id: string, fallbackName: string) => {
				const el = document.getElementById(id);
				if (!el) return null;
				const headerEl = el.querySelector(".tv-pine-reference-item__header");
				const resolvedName = headerEl?.textContent?.trim() || fallbackName;

				let description = "";
				for (const t of el.querySelectorAll(
					".tv-pine-reference-item__text.tv-text",
				)) {
					if (t.querySelector(".tv-pine-reference-item__arg-type")) continue;
					const txt = (t.textContent || "").trim();
					if (txt) {
						description = txt;
						break;
					}
				}

				const examples: string[] = [];
				for (const ex of el.querySelectorAll(
					".tv-pine-reference-item__example code",
				)) {
					const text = ((ex as HTMLElement).innerText || "")
						.replace(/ /g, " ")
						.trim();
					if (text) examples.push(text);
				}

				// Field rows render like argument rows ("name (type) description").
				const fieldTexts: string[] = [];
				for (const node of el.querySelectorAll(
					".tv-pine-reference-item__arg-type",
				)) {
					const row = node.parentElement ?? node;
					fieldTexts.push(row.textContent?.trim() || "");
				}

				return {
					resolvedName,
					description,
					examples,
					fieldTexts,
					html: el.outerHTML,
				};
			},
			elementId,
			name,
		);

		if (!result) return null;
		if (result.html) saveDomSnapshot(`type__${name}`, "base", result.html);

		const fields = result.fieldTexts.flatMap(parseArgTypeText);
		const details: TypeDetails = {
			name: result.resolvedName,
			description: result.description,
			examples: result.examples,
			fields: fields.length > 0 ? fields : undefined,
			namespace: result.resolvedName.includes(".")
				? result.resolvedName.split(".")[0]
				: undefined,
		};
		saveToCache(name, details, "type__");
		return details;
	} catch (error) {
		console.log(`Failed to scrape type ${name}: ${(error as Error).message}`);
		return null;
	}
}

// Scrape a compiler/doc annotation page via its `an_<name>` anchor (name keeps
// its leading "@" and any trailing "=", e.g. "@version="). Captures description,
// an optional syntax line, and examples; mirrors the DOM. See TODO #25.
export async function scrapeAnnotationDetails(
	name: string,
	useCache = true,
): Promise<AnnotationDetails | null> {
	if (useCache) {
		const cached = getCachedData<AnnotationDetails>(name, "an__");
		if (cached) return cached;
	}

	try {
		const page = await getSharedPage();
		const elementId = `an_${name}`;

		await page.evaluate((hash: string) => {
			window.location.hash = hash;
		}, elementId);
		await new Promise((resolve) => setTimeout(resolve, 300));
		await page
			.waitForFunction(
				(id: string) => document.getElementById(id) !== null,
				{ timeout: 5000 },
				elementId,
			)
			.catch(() => {});

		const result = await page.evaluate(
			(id: string, fallbackName: string) => {
				const el = document.getElementById(id);
				if (!el) return null;
				const headerEl = el.querySelector(".tv-pine-reference-item__header");
				const resolvedName = headerEl?.textContent?.trim() || fallbackName;

				const syntaxEl = el.querySelector(".tv-pine-reference-item__syntax");
				const syntax = syntaxEl?.textContent?.trim() || "";

				let description = "";
				for (const t of el.querySelectorAll(
					".tv-pine-reference-item__text.tv-text",
				)) {
					if (t.querySelector(".tv-pine-reference-item__arg-type")) continue;
					const txt = (t.textContent || "").trim();
					if (txt) {
						description = txt;
						break;
					}
				}

				const examples: string[] = [];
				for (const ex of el.querySelectorAll(
					".tv-pine-reference-item__example code",
				)) {
					const text = ((ex as HTMLElement).innerText || "")
						.replace(/ /g, " ")
						.trim();
					if (text) examples.push(text);
				}

				return {
					resolvedName,
					syntax,
					description,
					examples,
					html: el.outerHTML,
				};
			},
			elementId,
			name,
		);

		if (!result) return null;
		if (result.html) saveDomSnapshot(`an__${name}`, "base", result.html);

		const details: AnnotationDetails = {
			name: result.resolvedName,
			description: result.description,
			syntax: result.syntax || undefined,
			examples: result.examples,
		};
		saveToCache(name, details, "an__");
		return details;
	} catch (error) {
		console.log(
			`Failed to scrape annotation ${name}: ${(error as Error).message}`,
		);
		return null;
	}
}

// Scrape an operator detail page via its `op_<symbol>` anchor (the symbol is
// kept verbatim, e.g. "op_?:", "op_[]", "op_+="). Captures the prose
// description, the Syntax line, and any examples; mirrors the DOM so the
// Returns/Remarks/See-also prose is re-derived offline like every other catalog.
export async function scrapeOperatorDetails(
	symbol: string,
	useCache = true,
): Promise<OperatorDetails | null> {
	// Cache/mirror under a hex slug so symbols like `?:`/`+=`/`==` don't collide
	// on disk; the DOM anchor still uses the raw symbol.
	const slug = operatorSlug(symbol);
	if (useCache) {
		const cached = getCachedData<OperatorDetails>(slug, "op__");
		if (cached) return cached;
	}

	try {
		const page = await getSharedPage();
		const elementId = `op_${symbol}`;

		await page.evaluate((hash: string) => {
			window.location.hash = hash;
		}, elementId);
		await new Promise((resolve) => setTimeout(resolve, 300));
		await page
			.waitForFunction(
				(id: string) => document.getElementById(id) !== null,
				{ timeout: 5000 },
				elementId,
			)
			.catch(() => {});

		const result = await page.evaluate(
			(id: string, fallbackName: string) => {
				const el = document.getElementById(id);
				if (!el) return null;
				const headerEl = el.querySelector(".tv-pine-reference-item__header");
				const resolvedName = headerEl?.textContent?.trim() || fallbackName;

				const syntaxEl = el.querySelector(".tv-pine-reference-item__syntax");
				const syntax = syntaxEl?.textContent?.trim() || "";

				let description = "";
				for (const t of el.querySelectorAll(
					".tv-pine-reference-item__text.tv-text",
				)) {
					if (t.querySelector(".tv-pine-reference-item__arg-type")) continue;
					const txt = (t.textContent || "").trim();
					if (txt) {
						description = txt;
						break;
					}
				}

				const examples: string[] = [];
				for (const ex of el.querySelectorAll(
					".tv-pine-reference-item__example code",
				)) {
					const text = ((ex as HTMLElement).innerText || "")
						.replace(/ /g, " ")
						.trim();
					if (text) examples.push(text);
				}

				return {
					resolvedName,
					syntax,
					description,
					examples,
					html: el.outerHTML,
				};
			},
			elementId,
			symbol,
		);

		if (!result) return null;
		if (result.html) saveDomSnapshot(`op__${slug}`, "base", result.html);

		const details: OperatorDetails = {
			name: result.resolvedName,
			syntax: result.syntax || undefined,
			description: result.description,
			examples: result.examples,
		};
		saveToCache(slug, details, "op__");
		return details;
	} catch (error) {
		console.log(
			`Failed to scrape operator ${symbol}: ${(error as Error).message}`,
		);
		return null;
	}
}

export async function scrapeKeywordDetails(
	name: string,
	useCache = true,
): Promise<KeywordDetails | null> {
	if (useCache) {
		const cached = getCachedData<KeywordDetails>(name, "kw__");
		if (cached) return cached;
	}

	try {
		const page = await getSharedPage();
		// `true`/`false` are documented under the constants anchor, not `kw_`.
		const anchorIds = [`kw_${name}`, `const_${name}`];

		let result: {
			resolvedName: string;
			syntax: string;
			description: string;
			examples: string[];
			html: string;
		} | null = null;

		for (const elementId of anchorIds) {
			await page.evaluate((hash: string) => {
				window.location.hash = hash;
			}, elementId);
			await new Promise((resolve) => setTimeout(resolve, 300));
			await page
				.waitForFunction(
					(id: string) => document.getElementById(id) !== null,
					{ timeout: 5000 },
					elementId,
				)
				.catch(() => {});

			result = await page.evaluate(
				(id: string, fallbackName: string) => {
					const el = document.getElementById(id);
					if (!el) return null;
					const headerEl = el.querySelector(".tv-pine-reference-item__header");
					const resolvedName = headerEl?.textContent?.trim() || fallbackName;

					const syntaxEl = el.querySelector(".tv-pine-reference-item__syntax");
					const syntax = syntaxEl?.textContent?.trim() || "";

					let description = "";
					for (const t of el.querySelectorAll(
						".tv-pine-reference-item__text.tv-text",
					)) {
						if (t.querySelector(".tv-pine-reference-item__arg-type")) continue;
						const txt = (t.textContent || "").trim();
						if (txt) {
							description = txt;
							break;
						}
					}

					const examples: string[] = [];
					for (const ex of el.querySelectorAll(
						".tv-pine-reference-item__example code",
					)) {
						const text = ((ex as HTMLElement).innerText || "")
							.replace(/ /g, " ")
							.trim();
						if (text) examples.push(text);
					}

					return {
						resolvedName,
						syntax,
						description,
						examples,
						html: el.outerHTML,
					};
				},
				elementId,
				name,
			);

			if (result) break;
		}

		if (!result) return null;
		if (result.html) saveDomSnapshot(`kw__${name}`, "base", result.html);

		const details: KeywordDetails = {
			name: result.resolvedName,
			syntax: result.syntax || undefined,
			description: result.description,
			examples: result.examples,
		};
		saveToCache(name, details, "kw__");
		return details;
	} catch (error) {
		console.log(
			`Failed to scrape keyword ${name}: ${(error as Error).message}`,
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
			// Re-scrape when the details cache is stale OR the DOM mirror is absent
			// (members were not mirrored before reextract-sections existed).
			if (
				isCacheValid(getCacheFilePath(name, "var__")) &&
				hasMirror(name, "var__")
			) {
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

	// Build constant list (namespaced members) from the crawl.
	const constantNames: string[] = [];
	const constByNamespace = inputData.constants?.byNamespace as
		| Record<string, string[]>
		| undefined;
	if (constByNamespace) {
		for (const [namespace, members] of Object.entries(constByNamespace)) {
			for (const member of members) {
				constantNames.push(`${namespace}.${member}`);
			}
		}
	}
	constantNames.sort();
	console.log(`Found ${constantNames.length} constants to process`);

	const constantsToScrape: string[] = [];
	const constantsFromCache: string[] = [];
	if (!forceRefresh) {
		for (const name of constantNames) {
			if (
				isCacheValid(getCacheFilePath(name, "const__")) &&
				hasMirror(name, "const__")
			) {
				constantsFromCache.push(name);
			} else {
				constantsToScrape.push(name);
			}
		}
	} else {
		constantsToScrape.push(...constantNames);
	}
	if (DRY_RUN && constantsToScrape.length > DRY_RUN_LIMIT) {
		constantsToScrape.splice(DRY_RUN_LIMIT);
	}
	console.log(`   Constants from cache: ${constantsFromCache.length}`);
	console.log(`   Constants to scrape: ${constantsToScrape.length}`);

	// Build built-in type list from the crawl (its own reference section).
	const typeNames: string[] = [...(inputData.types?.items || [])].sort();
	console.log(`Found ${typeNames.length} types to process`);

	const typesToScrape: string[] = [];
	const typesFromCache: string[] = [];
	if (!forceRefresh) {
		for (const name of typeNames) {
			if (isCacheValid(getCacheFilePath(name, "type__"))) {
				typesFromCache.push(name);
			} else {
				typesToScrape.push(name);
			}
		}
	} else {
		typesToScrape.push(...typeNames);
	}
	if (DRY_RUN && typesToScrape.length > DRY_RUN_LIMIT) {
		typesToScrape.splice(DRY_RUN_LIMIT);
	}
	console.log(`   Types from cache: ${typesFromCache.length}`);
	console.log(`   Types to scrape: ${typesToScrape.length}`);

	// Build annotation list from the crawl (its own reference section).
	const annotationNames: string[] = [...(inputData.annotations?.items || [])];
	console.log(`Found ${annotationNames.length} annotations to process`);

	const annotationsToScrape: string[] = [];
	const annotationsFromCache: string[] = [];
	if (!forceRefresh) {
		for (const name of annotationNames) {
			if (isCacheValid(getCacheFilePath(name, "an__"))) {
				annotationsFromCache.push(name);
			} else {
				annotationsToScrape.push(name);
			}
		}
	} else {
		annotationsToScrape.push(...annotationNames);
	}
	if (DRY_RUN && annotationsToScrape.length > DRY_RUN_LIMIT) {
		annotationsToScrape.splice(DRY_RUN_LIMIT);
	}
	console.log(`   Annotations from cache: ${annotationsFromCache.length}`);
	console.log(`   Annotations to scrape: ${annotationsToScrape.length}`);

	// Build operator list from the crawl (its own reference section - the bare
	// symbols documented under `#op_`).
	const operatorNames: string[] = [
		...((inputData.operators?.items as string[] | undefined) || []),
	];
	console.log(`Found ${operatorNames.length} operators to process`);

	const operatorsToScrape: string[] = [];
	const operatorsFromCache: string[] = [];
	if (!forceRefresh) {
		for (const name of operatorNames) {
			const slug = operatorSlug(name);
			if (
				isCacheValid(getCacheFilePath(slug, "op__")) &&
				hasMirror(slug, "op__")
			) {
				operatorsFromCache.push(name);
			} else {
				operatorsToScrape.push(name);
			}
		}
	} else {
		operatorsToScrape.push(...operatorNames);
	}
	if (DRY_RUN && operatorsToScrape.length > DRY_RUN_LIMIT) {
		operatorsToScrape.splice(DRY_RUN_LIMIT);
	}
	console.log(`   Operators from cache: ${operatorsFromCache.length}`);
	console.log(`   Operators to scrape: ${operatorsToScrape.length}`);

	// Build keyword list from the crawl (the bare names documented under `#kw_`).
	const keywordNames: string[] = [
		...((inputData.keywords?.items as string[] | undefined) || []),
	].sort();
	console.log(`Found ${keywordNames.length} keywords to process`);

	const keywordsToScrape: string[] = [];
	const keywordsFromCache: string[] = [];
	if (!forceRefresh) {
		for (const name of keywordNames) {
			if (
				isCacheValid(getCacheFilePath(name, "kw__")) &&
				hasMirror(name, "kw__")
			) {
				keywordsFromCache.push(name);
			} else {
				keywordsToScrape.push(name);
			}
		}
	} else {
		keywordsToScrape.push(...keywordNames);
	}
	if (DRY_RUN && keywordsToScrape.length > DRY_RUN_LIMIT) {
		keywordsToScrape.splice(DRY_RUN_LIMIT);
	}
	console.log(`   Keywords from cache: ${keywordsFromCache.length}`);
	console.log(`   Keywords to scrape: ${keywordsToScrape.length}`);

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
			totalConstants: constantNames.length,
			totalTypes: typeNames.length,
			totalAnnotations: annotationNames.length,
			totalOperators: operatorNames.length,
			totalKeywords: keywordNames.length,
		},
		functions: {},
		variables: {},
		constants: {},
		types: {},
		annotations: {},
		operators: {},
		keywords: {},
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
		const cached = getCachedData<MemberDetails>(name, "var__");
		if (cached) {
			allDetails.variables[name] = cached;
		}
	}
	for (const name of constantsFromCache) {
		const cached = getCachedData<MemberDetails>(name, "const__");
		if (cached) {
			allDetails.constants[name] = cached;
		}
	}
	for (const name of typesFromCache) {
		const cached = getCachedData<TypeDetails>(name, "type__");
		if (cached && allDetails.types) {
			allDetails.types[name] = cached;
		}
	}
	for (const name of annotationsFromCache) {
		const cached = getCachedData<AnnotationDetails>(name, "an__");
		if (cached && allDetails.annotations) {
			allDetails.annotations[name] = cached;
		}
	}
	for (const name of operatorsFromCache) {
		const cached = getCachedData<OperatorDetails>(operatorSlug(name), "op__");
		if (cached && allDetails.operators) {
			allDetails.operators[name] = cached;
		}
	}
	for (const name of keywordsFromCache) {
		const cached = getCachedData<KeywordDetails>(name, "kw__");
		if (cached && allDetails.keywords) {
			allDetails.keywords[name] = cached;
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
				// useCache=false: items reach this loop only when they need a fetch
				// (stale cache OR missing mirror), so always hit the page.
				const details = await scrapeMemberDetails(name, "var", false);
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

	// Scrape constants (shares the browser opened above, if any).
	if (constantsToScrape.length > 0) {
		console.log("Scraping constant details...");
		const batchSize = 20;
		const startTime = Date.now();

		for (let i = 0; i < constantsToScrape.length; i += batchSize) {
			const batch = constantsToScrape.slice(i, i + batchSize);
			for (const name of batch) {
				const details = await scrapeMemberDetails(name, "const", false);
				if (details) {
					allDetails.constants[name] = details;
				} else {
					allDetails.metadata.failedScrapes++;
				}
				await new Promise((resolve) => setTimeout(resolve, 100));
			}

			const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
			const completed = Math.min(i + batchSize, constantsToScrape.length);
			console.log(
				`  Constants: ${completed}/${constantsToScrape.length} (${elapsed}s elapsed)`,
			);

			if (i + batchSize < constantsToScrape.length) {
				await new Promise((resolve) => setTimeout(resolve, 500));
			}
		}
	}

	// Scrape built-in types (shares the browser opened above, if any).
	if (typesToScrape.length > 0 && allDetails.types) {
		console.log("Scraping type details...");
		for (const name of typesToScrape) {
			const details = await scrapeTypeDetails(name, !forceRefresh);
			if (details) {
				allDetails.types[name] = details;
			} else {
				allDetails.metadata.failedScrapes++;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		console.log(`  Types: ${typesToScrape.length}/${typesToScrape.length}`);
	}

	// Scrape annotations (shares the browser opened above, if any).
	if (annotationsToScrape.length > 0 && allDetails.annotations) {
		console.log("Scraping annotation details...");
		for (const name of annotationsToScrape) {
			const details = await scrapeAnnotationDetails(name, !forceRefresh);
			if (details) {
				allDetails.annotations[name] = details;
			} else {
				allDetails.metadata.failedScrapes++;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		console.log(
			`  Annotations: ${annotationsToScrape.length}/${annotationsToScrape.length}`,
		);
	}

	// Scrape operators (shares the browser opened above, if any).
	if (operatorsToScrape.length > 0 && allDetails.operators) {
		console.log("Scraping operator details...");
		for (const name of operatorsToScrape) {
			const details = await scrapeOperatorDetails(name, !forceRefresh);
			if (details) {
				allDetails.operators[name] = details;
			} else {
				allDetails.metadata.failedScrapes++;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		console.log(
			`  Operators: ${operatorsToScrape.length}/${operatorsToScrape.length}`,
		);
	}

	// Scrape keywords (shares the browser opened above, if any).
	if (keywordsToScrape.length > 0 && allDetails.keywords) {
		console.log("Scraping keyword details...");
		for (const name of keywordsToScrape) {
			const details = await scrapeKeywordDetails(name, !forceRefresh);
			if (details) {
				allDetails.keywords[name] = details;
			} else {
				allDetails.metadata.failedScrapes++;
			}
			await new Promise((resolve) => setTimeout(resolve, 100));
		}
		console.log(
			`  Keywords: ${keywordsToScrape.length}/${keywordsToScrape.length}`,
		);
	}

	if (
		functionsToScrape.length > 0 ||
		variablesToScrape.length > 0 ||
		constantsToScrape.length > 0 ||
		typesToScrape.length > 0 ||
		annotationsToScrape.length > 0 ||
		operatorsToScrape.length > 0 ||
		keywordsToScrape.length > 0
	) {
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
	console.log(`   Total constants: ${allDetails.metadata.totalConstants}`);
	console.log(
		`   Constants captured: ${Object.keys(allDetails.constants).length}`,
	);
	console.log(`   Total types: ${allDetails.metadata.totalTypes}`);
	console.log(
		`   Types captured: ${Object.keys(allDetails.types || {}).length}`,
	);
	console.log(`   Total annotations: ${allDetails.metadata.totalAnnotations}`);
	console.log(
		`   Annotations captured: ${Object.keys(allDetails.annotations || {}).length}`,
	);
	console.log(`   Total operators: ${allDetails.metadata.totalOperators}`);
	console.log(
		`   Operators captured: ${Object.keys(allDetails.operators || {}).length}`,
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
