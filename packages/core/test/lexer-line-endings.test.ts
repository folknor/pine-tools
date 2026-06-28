/**
 * Lexer line-terminator conventions (#38, G005).
 *
 * TV, VS Code, and LSP all split lines on \r\n | \r | \n. The lexer
 * used to skip \r entirely, which (a) turned CR-only files into one
 * giant comment line (zero diagnostics) and (b) halved line numbers
 * against TV's on \r\r\n files (522 of 1879 corpus fixtures). These
 * tests pin the convention; the fixture runner can't, because its
 * directive parser splits on \n.
 */

import { describe, expect, it } from "vitest";
import { createSourcePositionMapper } from "../src/common/sourcePositions";
import { Lexer, TokenType } from "../src/parser/lexer";

function tokenAt(code: string, value: string) {
	const tokens = new Lexer(code).tokenize();
	const t = tokens.find((tok) => tok.value === value);
	expect(t, `token ${JSON.stringify(value)} in ${JSON.stringify(code)}`).toBeDefined();
	return t!;
}

function newlineCount(code: string): number {
	return new Lexer(code).tokenize().filter((t) => t.type === TokenType.NEWLINE).length;
}

describe("lexer line terminators (G005)", () => {
	it("\\n breaks once", () => {
		expect(tokenAt("a = 1\nb = 2", "b").line).toBe(2);
		expect(newlineCount("a = 1\nb = 2")).toBe(1);
	});

	it("\\r\\n breaks once, at the \\n", () => {
		expect(tokenAt("a = 1\r\nb = 2", "b").line).toBe(2);
		expect(newlineCount("a = 1\r\nb = 2")).toBe(1);
	});

	it("a lone \\r is a line terminator (CR-only files)", () => {
		expect(tokenAt("a = 1\rb = 2", "b").line).toBe(2);
		expect(newlineCount("a = 1\rb = 2")).toBe(1);
	});

	it("\\r\\r\\n is TWO breaks (matches TV's numbering)", () => {
		// Probed 2026-06-04: TV reports line 2n-1 for content line n of a
		// \r\r\n file - i.e. it counts \r and \r\n as separate breaks.
		expect(tokenAt("a = 1\r\r\nb = 2", "b").line).toBe(3);
		expect(newlineCount("a = 1\r\r\nb = 2")).toBe(2);
	});

	it("a lone \\r terminates a line comment", () => {
		// Previously the comment scan only stopped at \n, so a CR-only
		// file's first comment swallowed the entire source.
		expect(tokenAt("// comment\rb = 2", "b").line).toBe(2);
	});

	it("a lone \\r terminates an annotation", () => {
		const lexer = new Lexer("//@version=6\rb = 2");
		const tokens = lexer.tokenize();
		expect(lexer.getDetectedVersion()).toBe("6");
		expect(tokens.find((t) => t.value === "b")?.line).toBe(2);
	});

	it("multiline strings count \\r\\r\\n as two lines", () => {
		const code = '//@version=6\r\r\ns = "one\r\r\ntwo"\r\r\nb = 2';
		// s on line 3, string spans 3-5, b on line 7.
		expect(tokenAt(code, "b").line).toBe(7);
	});

	it("maps CRCRLF diagnostics back to displayed source lines", () => {
		const map = createSourcePositionMapper(
			"a = 1\r\r\nb = 2\r\r\nc = 3\r\r\n",
		);
		expect(map({ line: 1, column: 1 })).toEqual({ line: 1, column: 1 });
		expect(map({ line: 3, column: 1 })).toEqual({ line: 2, column: 1 });
		expect(map({ line: 5, column: 1 })).toEqual({ line: 3, column: 1 });
	});

	it("leaves ordinary line-ending diagnostics on the same lines", () => {
		for (const code of ["a = 1\nb = 2", "a = 1\r\nb = 2", "a = 1\rb = 2"]) {
			const map = createSourcePositionMapper(code);
			expect(map({ line: 2, column: 1 })).toEqual({ line: 2, column: 1 });
		}
	});
});
