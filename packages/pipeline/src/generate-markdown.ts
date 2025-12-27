#!/usr/bin/env -S node --experimental-strip-types

/**
 * Pine Script Markdown Reference Generator
 *
 * Generates a comprehensive markdown reference file from scraped Pine Script documentation.
 * Outputs a single structured markdown file with all functions, variables, constants, and keywords.
 *
 * Usage: node --experimental-strip-types packages/pipeline/src/generate-markdown.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve paths relative to project root
const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../..")
	: path.resolve(__dirname, "../../..");

const VERSION = "v6";
const OUTPUT_FILE = path.join(PROJECT_ROOT, "PINE_REFERENCE.md");

// Import generated data
const functionsModule = await import(
	path.join(PROJECT_ROOT, "pine-data/v6/functions.ts"),
	{ with: { type: "module" } }
);
const variablesModule = await import(
	path.join(PROJECT_ROOT, "pine-data/v6/variables.ts"),
	{ with: { type: "module" } }
);
const constantsModule = await import(
	path.join(PROJECT_ROOT, "pine-data/v6/constants.ts"),
	{ with: { type: "module" } }
);
const keywordsModule = await import(
	path.join(PROJECT_ROOT, "pine-data/v6/keywords.ts"),
	{ with: { type: "module" } }
);

type PineFunction = {
	name: string;
	namespace?: string;
	syntax: string;
	description: string;
	parameters: Array<{
		name: string;
		type: string;
		description: string;
		required: boolean;
		default?: string;
	}>;
	returns: string;
	example?: string;
	flags?: Record<string, unknown>;
};

type PineVariable = {
	name: string;
	namespace?: string;
	type: string;
	qualifier: string;
	description: string;
};

type PineConstant = {
	name: string;
	namespace: string;
	shortName: string;
	type: string;
};

const FUNCTIONS: PineFunction[] = functionsModule.FUNCTIONS;
const VARIABLES: PineVariable[] = variablesModule.VARIABLES;
const CONSTANTS: PineConstant[] = constantsModule.CONSTANTS;
const KEYWORDS: Set<string> = keywordsModule.KEYWORDS;

// =============================================================================
// MARKDOWN GENERATION
// =============================================================================

function escapeMarkdown(text: string): string {
	return text
		.replace(/\\/g, "\\\\")
		.replace(/\|/g, "\\|")
		.replace(/`/g, "\\`");
}

function generateTableOfContents(): string {
	const functionNamespaces = new Set(FUNCTIONS.map((f) => f.namespace).filter(Boolean));
	const variableNamespaces = new Set(VARIABLES.map((v) => v.namespace).filter(Boolean));
	const constantNamespaces = new Set(CONSTANTS.map((c) => c.namespace));

	let toc = "## Table of Contents\n\n";
	toc += "### Functions by Namespace\n";
	[...functionNamespaces].sort().forEach((ns) => {
		toc += `- [${ns}](#${ns})\n`;
	});

	toc += "\n### Built-in Variables\n";
	toc += "- [Global Variables](#global-variables)\n";
	[...variableNamespaces].sort().forEach((ns) => {
		toc += `- [${ns}](#${ns})\n`;
	});

	toc += "\n### Constants\n";
	[...constantNamespaces].sort().forEach((ns) => {
		toc += `- [${ns}](#${ns}-constants)\n`;
	});

	toc += "\n### Keywords\n";
	toc += "- [Language Keywords](#keywords)\n\n";

	return toc;
}

function generateFunctionsSection(): string {
	let content = "## Functions\n\n";

	const functionsByNamespace = new Map<string, PineFunction[]>();
	for (const fn of FUNCTIONS) {
		const ns = fn.namespace || "_global";
		if (!functionsByNamespace.has(ns)) {
			functionsByNamespace.set(ns, []);
		}
		functionsByNamespace.get(ns)!.push(fn);
	}

	const namespaces = [...functionsByNamespace.keys()].sort();

	for (const ns of namespaces) {
		const functions = functionsByNamespace.get(ns)!.sort((a, b) =>
			a.name.localeCompare(b.name),
		);
		const heading = ns === "_global" ? "Global Functions" : ns;
		content += `### ${heading}\n\n`;

		for (const fn of functions) {
			content += `#### \`${fn.name}\`\n\n`;
			content += `**Syntax:** \`${escapeMarkdown(fn.syntax)}\`\n\n`;

			if (fn.description) {
				content += `${fn.description}\n\n`;
			}

			if (fn.parameters && fn.parameters.length > 0) {
				content += "**Parameters:**\n\n";
				content += "| Name | Type | Required | Description |\n";
				content += "|------|------|----------|-------------|\n";

				for (const param of fn.parameters) {
					const required = param.required ? "Yes" : "No";
					let description = escapeMarkdown(param.description || "");
					if (param.default) {
						description += ` (default: \`${param.default}\`)`;
					}
					content += `| \`${param.name}\` | \`${param.type}\` | ${required} | ${description} |\n`;
				}
				content += "\n";
			}

			if (fn.returns && fn.returns !== "void") {
				content += `**Returns:** \`${fn.returns}\`\n\n`;
			}

			if (fn.example) {
				content += "**Example:**\n\n";
				content += "```pine\n";
				content += fn.example + "\n";
				content += "```\n\n";
			}
		}
	}

	return content;
}

function generateVariablesSection(): string {
	let content = "## Built-in Variables\n\n";

	// Global variables
	const globalVars = VARIABLES.filter((v) => !v.namespace).sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	if (globalVars.length > 0) {
		content += "### Global Variables\n\n";
		content += "| Name | Type | Description |\n";
		content += "|------|------|-------------|\n";

		for (const v of globalVars) {
			content += `| \`${v.name}\` | \`${v.type}\` | ${escapeMarkdown(v.description || "")} |\n`;
		}
		content += "\n";
	}

	// Namespaced variables
	const variablesByNamespace = new Map<string, PineVariable[]>();
	for (const v of VARIABLES) {
		if (v.namespace) {
			if (!variablesByNamespace.has(v.namespace)) {
				variablesByNamespace.set(v.namespace, []);
			}
			variablesByNamespace.get(v.namespace)!.push(v);
		}
	}

	const namespaces = [...variablesByNamespace.keys()].sort();
	for (const ns of namespaces) {
		const vars = variablesByNamespace.get(ns)!.sort((a, b) =>
			a.name.localeCompare(b.name),
		);
		content += `### ${ns}\n\n`;
		content += "| Name | Type | Description |\n";
		content += "|------|------|-------------|\n";

		for (const v of vars) {
			content += `| \`${v.name}\` | \`${v.type}\` | ${escapeMarkdown(v.description || "")} |\n`;
		}
		content += "\n";
	}

	return content;
}

function generateConstantsSection(): string {
	let content = "## Constants\n\n";

	const constantsByNamespace = new Map<string, PineConstant[]>();
	for (const c of CONSTANTS) {
		if (!constantsByNamespace.has(c.namespace)) {
			constantsByNamespace.set(c.namespace, []);
		}
		constantsByNamespace.get(c.namespace)!.push(c);
	}

	const namespaces = [...constantsByNamespace.keys()].sort();
	for (const ns of namespaces) {
		const consts = constantsByNamespace.get(ns)!.sort((a, b) =>
			a.name.localeCompare(b.name),
		);
		content += `### ${ns} Constants\n\n`;
		content += "| Name | Type |\n";
		content += "|------|------|\n";

		for (const c of consts) {
			content += `| \`${c.name}\` | \`${c.type}\` |\n`;
		}
		content += "\n";
	}

	return content;
}

function generateKeywordsSection(): string {
	let content = "## Keywords\n\n";

	const keywordArray = Array.from(KEYWORDS).sort();

	content += "| Keyword |\n";
	content += "|----------|\n";
	for (const kw of keywordArray) {
		content += `| \`${kw}\` |\n`;
	}
	content += "\n";

	return content;
}

function generateMarkdown(): string {
	let markdown = "";

	markdown += "# Pine Script v6 Reference\n\n";
	markdown += `> **Auto-generated from TradingView documentation**  \n`;
	markdown += `> Generated: ${new Date().toISOString()}\n\n`;

	markdown += generateTableOfContents();

	markdown += generateFunctionsSection();
	markdown += generateVariablesSection();
	markdown += generateConstantsSection();
	markdown += generateKeywordsSection();

	return markdown;
}

// =============================================================================
// MAIN
// =============================================================================

function main(): void {
	console.log(`\nGenerating Pine Script v6 markdown reference...\n`);
	console.log(`Output: ${OUTPUT_FILE}\n`);

	const markdown = generateMarkdown();

	fs.writeFileSync(OUTPUT_FILE, markdown, "utf8");

	const lines = markdown.split("\n").length;
	console.log(`✓ Reference generated successfully!`);
	console.log(`  ${FUNCTIONS.length} functions`);
	console.log(`  ${VARIABLES.length} variables`);
	console.log(`  ${CONSTANTS.length} constants`);
	console.log(`  ${KEYWORDS.size} keywords`);
	console.log(`  ${lines} lines of markdown\n`);
}

main();
