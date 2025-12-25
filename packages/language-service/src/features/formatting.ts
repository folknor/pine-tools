import type { ParsedDocument } from "../documents/ParsedDocument";
import type { FormattingOptions, TextEdit } from "../types";

/**
 * Format a document.
 * - Trims trailing whitespace
 * - Normalizes consecutive blank lines (max 1)
 * - Adds spacing around operators
 * - Ensures space after commas
 * - Ensures final newline
 */
export function format(
	doc: ParsedDocument,
	_options?: FormattingOptions,
): TextEdit[] {
	const edits: TextEdit[] = [];
	const lines = doc.lines;

	let lastWasEmpty = false;
	const resultLines: string[] = [];

	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		line = line.replace(/[\t ]+$/g, ""); // Trim trailing whitespace
		line = formatLine(line);
		const isEmpty = line.length === 0;

		if (isEmpty && lastWasEmpty) {
			// Skip extra blank lines
			continue;
		}

		resultLines.push(line);
		lastWasEmpty = isEmpty;
	}

	// Build the formatted content
	let formatted = resultLines.join("\n");

	// Ensure final newline
	if (!formatted.endsWith("\n")) {
		formatted += "\n";
	}

	// If there are changes, return a single edit replacing the entire document
	if (formatted !== doc.content) {
		edits.push({
			range: {
				start: { line: 0, character: 0 },
				end: {
					line: lines.length - 1,
					character: lines[lines.length - 1]?.length ?? 0,
				},
			},
			newText: formatted,
		});
	}

	return edits;
}

/**
 * Format a single line with operator and comma spacing.
 */
function formatLine(line: string): string {
	// Skip comments
	const commentIdx = line.indexOf("//");
	if (commentIdx === 0) return line;

	// Split into code and comment parts
	let code = commentIdx > 0 ? line.substring(0, commentIdx) : line;
	const comment = commentIdx > 0 ? line.substring(commentIdx) : "";

	// Skip if inside string - simple heuristic: count quotes
	// This is imperfect but avoids complex parsing
	if ((code.match(/"/g) || []).length % 2 !== 0) {
		return line;
	}

	// Protect strings by replacing them temporarily
	const strings: string[] = [];
	code = code.replace(/"([^"\\]|\\.)*"/g, (match) => {
		strings.push(match);
		return `__STR${strings.length - 1}__`;
	});

	// Add spacing around binary operators (but not in ==, !=, <=, >=, :=, +=, etc.)
	// First, normalize operators that might have extra/missing spaces
	code = code.replace(/\s*(==|!=|<=|>=|:=|\+=|-=|\*=|\/=|%=)\s*/g, " $1 ");

	// Add spacing around single-char operators (but not in ++, --, etc.)
	// Be careful with - as it's also unary and in negative numbers
	code = code.replace(/([^+\-*/<>=!:])([+\-*/%<>])([^=+-])/g, "$1 $2 $3");

	// Fix doubled spaces
	code = code.replace(/ {2,}/g, " ");

	// Ensure space after commas
	code = code.replace(/,([^\s])/g, ", $1");

	// Restore strings
	code = code.replace(
		/__STR(\d+)__/g,
		(_, idx) => strings[Number.parseInt(idx, 10)],
	);

	// Combine code and comment, preserving a single space before comment
	code = code.trimEnd();
	if (comment && code.length > 0) {
		return `${code} ${comment}`.trimEnd();
	}
	return (code + comment).trimEnd();
}

/**
 * Format and return the formatted string directly.
 * Useful for MCP and CLI tools that just want the result.
 */
export function formatToString(code: string): string {
	const lines = code.split("\n");
	const resultLines: string[] = [];
	let lastWasEmpty = false;

	for (const line of lines) {
		let formatted = line.replace(/[\t ]+$/g, "");
		formatted = formatLine(formatted);
		const isEmpty = formatted.length === 0;

		if (isEmpty && lastWasEmpty) {
			// Skip extra blank lines
			continue;
		}

		resultLines.push(formatted);
		lastWasEmpty = isEmpty;
	}

	let result = resultLines.join("\n");

	// Ensure final newline
	if (!result.endsWith("\n")) {
		result += "\n";
	}

	return result;
}
