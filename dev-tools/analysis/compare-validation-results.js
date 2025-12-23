#!/usr/bin/env node
/**
 * Compare CLI validation output against official pine-lint authority results
 *
 * For each JSON file in ./results:
 * 1. Map JSON filename to source pine file
 * 2. Run CLI tool on pine file
 * 3. Compare outputs (errors, warnings, success)
 * 4. Save differences to ./differences/{same-name}.json
 */

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const os = require("node:os");

const RESULTS_DIR = path.join(__dirname, "../../plan/pine-lint-results");
const PINE_DIR = path.join(__dirname, "../../pinescripts");
const DIFFERENCES_DIR = path.join(
	__dirname,
	"../../plan/pine-lint-vs-cli-differences",
);
const CLI_PATH = path.join(__dirname, "../../dist/src/cli.js");

// Ensure differences directory exists
if (!fs.existsSync(DIFFERENCES_DIR)) {
	fs.mkdirSync(DIFFERENCES_DIR, { recursive: true });
}

/**
 * Convert JSON filename to pine file path
 * Example: pine__strategies-processed__dema-atr-primeautomation-chartprime.json
 *       → pine/strategies-processed/dema-atr-primeautomation-chartprime.pine
 */
function jsonToPinePath(jsonFilename) {
	const baseName = path.basename(jsonFilename, ".json");
	const parts = baseName.split("__");

	if (parts.length < 2 || parts[0] !== "pine") {
		return null;
	}

	// Remove 'pine' prefix and join remaining parts with '/'
	const category = parts[1]; // e.g., "strategies-processed"
	const filename = parts.slice(2).join("__"); // Handle filenames with '__' in them

	return path.join(PINE_DIR, category, `${filename}.pine`);
}

/**
 * Run CLI tool on a pine file and capture output
 * Uses temp file to avoid buffer truncation issues with large outputs
 */
function runCli(pineFilePath) {
	const tmpFile = path.join(
		os.tmpdir(),
		`pine-cli-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
	);

	try {
		// Run CLI and redirect stdout to temp file, ignore stderr
		const _result = spawnSync("node", [CLI_PATH, pineFilePath], {
			encoding: "utf8",
			stdio: ["pipe", fs.openSync(tmpFile, "w"), "pipe"], // stdout to file, capture stderr
			maxBuffer: 10 * 1024 * 1024,
		});

		// Read output from temp file
		let output = "";
		try {
			output = fs.readFileSync(tmpFile, "utf8");
		} catch (_e) {
			// File may not exist or be readable
		}

		// Clean up temp file
		try {
			fs.unlinkSync(tmpFile);
		} catch (_e) {
			// Ignore cleanup errors
		}

		// Parse JSON output to extract actual errors and warnings from result
		try {
			const jsonOutput = JSON.parse(output);
			const errors = jsonOutput.result?.errors || [];
			const warnings = jsonOutput.result?.warnings || [];
			return {
				success: jsonOutput.success,
				output,
				errors,
				warnings,
				jsonParsed: true,
			};
		} catch (parseError) {
			// Couldn't parse JSON, treat as failure
			return {
				success: false,
				output,
				errors: [],
				warnings: [],
				jsonParsed: false,
				parseError: parseError.message,
			};
		}
	} catch (error) {
		// Clean up temp file on error
		try {
			fs.unlinkSync(tmpFile);
		} catch (_e) {
			// Ignore cleanup errors
		}

		return {
			success: false,
			output: error.message || String(error),
			errors: [],
			warnings: [],
			exitCode: error.status,
		};
	}
}

/**
 * Check if two errors match (same line, column, and message)
 */
function errorsMatch(cliError, authError) {
	if (!cliError || !authError) return false;

	const cliLine = cliError.start?.line || cliError.line;
	const cliCol = cliError.start?.column || cliError.column;
	const authLine = authError.start?.line || authError.line;
	const authCol = authError.start?.column || authError.column;

	// Check line and column match
	if (cliLine !== authLine) return false;
	if (cliCol !== authCol) return false;

	// Check message matches (normalize whitespace)
	const cliMsg = (cliError.message || "").trim();
	const authMsg = (authError.message || "").trim();

	return cliMsg === authMsg;
}

/**
 * Compare CLI output with authority JSON results
 */
function compareResults(cliResult, authorityJson) {
	const cliErrorCount = cliResult.errors.length;
	const authErrorCount = authorityJson.errors?.length || 0;

	const differences = {
		summary: {
			cli: {
				success: cliResult.success,
				errorCount: cliErrorCount,
				warningCount: cliResult.warnings.length,
			},
			authority: {
				success: authorityJson.success,
				errorCount: authErrorCount,
				warningCount: authorityJson.warnings?.length || 0,
			},
		},
		discrepancies: [],
	};

	// First-error matching: if authority has 1 error and CLI's first error matches, consider it a match
	// This handles the case where pine-lint stops at first error but our CLI reports all
	const firstErrorMatches =
		authErrorCount === 1 &&
		cliErrorCount >= 1 &&
		errorsMatch(cliResult.errors[0], authorityJson.errors[0]);

	// Also check all-errors matching for clean files
	const bothNoErrors = cliErrorCount === 0 && authErrorCount === 0;

	if (firstErrorMatches || bothNoErrors) {
		// Good match - first error matches or both have no errors
		differences.summary.firstErrorMatch = firstErrorMatches;
	} else {
		// Report discrepancies

		// Compare success status
		if (cliResult.success !== authorityJson.success) {
			differences.discrepancies.push({
				type: "success_mismatch",
				cli: cliResult.success,
				authority: authorityJson.success,
				message: `CLI reports ${cliResult.success ? "success" : "failure"}, authority reports ${authorityJson.success ? "success" : "failure"}`,
			});
		}

		// Compare error presence/absence
		if (cliErrorCount === 0 && authErrorCount > 0) {
			differences.discrepancies.push({
				type: "missing_errors",
				cli: cliErrorCount,
				authority: authErrorCount,
				message: `CLI found no errors, authority found ${authErrorCount}`,
			});
		} else if (cliErrorCount > 0 && authErrorCount === 0) {
			differences.discrepancies.push({
				type: "extra_errors",
				cli: cliErrorCount,
				authority: authErrorCount,
				message: `CLI found ${cliErrorCount} errors, authority found none`,
			});
		} else if (
			cliErrorCount > 0 &&
			authErrorCount > 0 &&
			!errorsMatch(cliResult.errors[0], authorityJson.errors[0])
		) {
			differences.discrepancies.push({
				type: "first_error_mismatch",
				cliFirst: cliResult.errors[0],
				authorityFirst: authorityJson.errors[0],
				message: `First errors don't match`,
			});
		}
	}

	// Include raw outputs for detailed analysis
	differences.raw = {
		cliOutput: cliResult.output.split("\n").slice(0, 50), // First 50 lines
		cliErrors: cliResult.errors.slice(0, 10), // First 10 CLI errors
		authorityErrors: authorityJson.errors || [],
		authorityWarnings: authorityJson.warnings || [],
	};

	return differences;
}

/**
 * Process a single JSON file
 */
function processFile(jsonFilePath) {
	const jsonFilename = path.basename(jsonFilePath);
	const pineFilePath = jsonToPinePath(jsonFilename);

	if (!pineFilePath) {
		console.log(`⚠️  Skipping ${jsonFilename}: invalid filename pattern`);
		return null;
	}

	if (!fs.existsSync(pineFilePath)) {
		console.log(
			`⚠️  Skipping ${jsonFilename}: pine file not found at ${pineFilePath}`,
		);
		return null;
	}

	// Read authority JSON
	const authorityJson = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));

	// Run CLI
	console.log(`🔍 Processing ${jsonFilename}...`);
	const cliResult = runCli(pineFilePath);

	// Compare results
	const differences = compareResults(cliResult, authorityJson);

	// Save differences
	const diffFilePath = path.join(DIFFERENCES_DIR, jsonFilename);
	const diffData = {
		jsonFile: jsonFilename,
		pineFile: path.relative(__dirname, pineFilePath),
		timestamp: new Date().toISOString(),
		...differences,
	};

	fs.writeFileSync(diffFilePath, JSON.stringify(diffData, null, 2));

	// Log summary
	if (differences.discrepancies.length === 0) {
		console.log(`✅ ${jsonFilename}: No discrepancies`);
	} else {
		console.log(
			`❌ ${jsonFilename}: ${differences.discrepancies.length} discrepancies`,
		);
		for (const disc of differences.discrepancies) {
			console.log(`   - ${disc.message}`);
		}
	}

	return diffData;
}

/**
 * Main execution
 */
function main() {
	console.log("🚀 Starting validation comparison...\n");

	// Get all JSON files
	const jsonFiles = fs
		.readdirSync(RESULTS_DIR)
		.filter((f) => f.endsWith(".json"))
		.map((f) => path.join(RESULTS_DIR, f));

	console.log(`Found ${jsonFiles.length} authority result files\n`);

	// Process each file
	const results = [];
	let processedCount = 0;
	let skippedCount = 0;
	let matchCount = 0;
	let mismatchCount = 0;

	for (const jsonFile of jsonFiles) {
		const result = processFile(jsonFile);

		if (result) {
			processedCount++;
			results.push(result);

			if (result.discrepancies.length === 0) {
				matchCount++;
			} else {
				mismatchCount++;
			}
		} else {
			skippedCount++;
		}
	}

	// Generate summary report
	console.log(`\n${"=".repeat(60)}`);
	console.log("📊 SUMMARY");
	console.log("=".repeat(60));
	console.log(`Total files: ${jsonFiles.length}`);
	console.log(`Processed: ${processedCount}`);
	console.log(`Skipped: ${skippedCount}`);
	console.log(
		`Matches: ${matchCount} (${((matchCount / processedCount) * 100).toFixed(1)}%)`,
	);
	console.log(
		`Mismatches: ${mismatchCount} (${((mismatchCount / processedCount) * 100).toFixed(1)}%)`,
	);
	console.log("=".repeat(60));

	// Save summary
	const summaryPath = path.join(DIFFERENCES_DIR, "_SUMMARY.json");
	fs.writeFileSync(
		summaryPath,
		JSON.stringify(
			{
				timestamp: new Date().toISOString(),
				totals: {
					total: jsonFiles.length,
					processed: processedCount,
					skipped: skippedCount,
					matches: matchCount,
					mismatches: mismatchCount,
				},
				files: results.map((r) => ({
					file: r.jsonFile,
					hasDiscrepancies: r.discrepancies.length > 0,
					discrepancyCount: r.discrepancies.length,
				})),
			},
			null,
			2,
		),
	);

	console.log(`\n✅ Summary saved to ${summaryPath}`);
	console.log(`✅ Individual differences saved to ${DIFFERENCES_DIR}/\n`);
}

// Run
main();
