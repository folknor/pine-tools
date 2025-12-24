import type { Program } from "../../../core/src/parser/ast";
import { Parser } from "../../../core/src/parser/parser";
import type { Position, Range } from "../types";

interface ParseError {
	line: number;
	column: number;
	message: string;
}

/**
 * Represents a parsed Pine Script document with cached parse results.
 */
export class ParsedDocument {
	readonly uri: string;
	readonly version: number;
	readonly content: string;
	readonly ast: Program;
	readonly parseErrors: ParseError[];
	readonly lines: string[];
	readonly detectedVersion: string;

	constructor(uri: string, content: string, version: number) {
		this.uri = uri;
		this.version = version;
		this.content = content;
		this.lines = content.split("\n");

		const parser = new Parser(content);
		this.ast = parser.parse();
		this.detectedVersion = parser.getDetectedVersion() || "6";

		// Collect lexer and parser errors
		this.parseErrors = [
			...parser.getLexerErrors().map((e) => ({
				line: e.line,
				column: e.column,
				message: e.message,
			})),
			...parser.getParserErrors().map((e) => ({
				line: e.line,
				column: e.column,
				message: e.message,
			})),
		];
	}

	/**
	 * Convert a Position to a character offset in the document.
	 */
	offsetAt(position: Position): number {
		let offset = 0;
		for (let i = 0; i < position.line && i < this.lines.length; i++) {
			offset += this.lines[i].length + 1; // +1 for newline
		}
		offset += Math.min(
			position.character,
			this.lines[position.line]?.length ?? 0,
		);
		return offset;
	}

	/**
	 * Convert a character offset to a Position.
	 */
	positionAt(offset: number): Position {
		let remaining = offset;
		for (let line = 0; line < this.lines.length; line++) {
			const lineLength = this.lines[line].length + 1; // +1 for newline
			if (remaining < lineLength) {
				return { line, character: remaining };
			}
			remaining -= lineLength;
		}
		// Past end of document
		return {
			line: this.lines.length - 1,
			character: this.lines[this.lines.length - 1]?.length ?? 0,
		};
	}

	/**
	 * Get text within a range, or the entire document if no range specified.
	 */
	getText(range?: Range): string {
		if (!range) {
			return this.content;
		}
		const startOffset = this.offsetAt(range.start);
		const endOffset = this.offsetAt(range.end);
		return this.content.substring(startOffset, endOffset);
	}

	/**
	 * Get the line at a given line number (0-indexed).
	 */
	getLine(lineNumber: number): string {
		return this.lines[lineNumber] ?? "";
	}

	/**
	 * Get the word at a position. Returns null if no word found.
	 * Matches identifiers including dots for namespaced names (e.g., "ta.sma").
	 */
	getWordAtPosition(position: Position): string | null {
		const line = this.getLine(position.line);
		if (!line) return null;

		// Find word boundaries - include dots for namespace.member patterns
		const wordPattern = /[A-Za-z_][A-Za-z0-9_.]*/g;
		let match: RegExpExecArray | null;

		match = wordPattern.exec(line);
		while (match !== null) {
			const start = match.index;
			const end = start + match[0].length;
			if (position.character >= start && position.character <= end) {
				return match[0];
			}
			match = wordPattern.exec(line);
		}

		return null;
	}

	/**
	 * Get the text before the cursor on the current line.
	 */
	getTextBeforeCursor(position: Position): string {
		const line = this.getLine(position.line);
		return line.substring(0, position.character);
	}
}
