#!/usr/bin/env node

/**
 * Simple JavaScript to TypeScript converter for test files
 */

import * as fs from "node:fs";

const filesToConvert = ["test/benchmark.test.js", "test/validation.test.js"];

function convertFile(filePath: string) {
	if (!fs.existsSync(filePath)) {
		console.log(`File not found: ${filePath}`);
		return;
	}

	console.log(`Converting: ${filePath}`);
	let content = fs.readFileSync(filePath, "utf-8");

	// Basic conversions
	content = content.replace(
		/const { describe, it, expect, beforeAll, afterAll } = require\("vitest"\);/g,
		'import { describe, it, expect, beforeAll, afterAll } from "vitest";',
	);

	content = content.replace(
		/const assert = require\("node:assert"\);/g,
		'import assert from "node:assert";',
	);

	content = content.replace(
		/const execSync = require\("node:child_process"\);/g,
		'import { execSync } from "node:child_process";',
	);

	content = content.replace(
		/const fs = require\("node:fs"\);/g,
		'import * as fs from "node:fs";',
	);

	content = content.replace(
		/const path = require\("node:path"\);/g,
		'import * as path from "node:path";',
	);

	content = content.replace(
		/const os = require\("node:os"\);/g,
		'import * as os from "node:os";',
	);

	// Convert problematic arrow functions
	content = content.replace(
		/const runCLI = \((\w+): string\) => \{/g,
		"const runCLI = function($1: string) {",
	);

	// Write TypeScript file
	const tsPath = filePath.replace(".js", ".ts");
	fs.writeFileSync(tsPath, content);
	console.log(`Created: ${tsPath}`);

	// Remove original JS file
	fs.unlinkSync(filePath);
	console.log(`Removed: ${filePath}`);
}

// Convert each file
filesToConvert.forEach(convertFile);

console.log("Conversion complete!");
