/**
 * Parser block-structure tests (#31, INV008).
 *
 * The fixture runner can only assert "parses without errors", which a
 * structurally mis-parsed block also satisfies (leaked statements are
 * valid top-level code). These tests assert AST SHAPE: statement counts
 * inside if/else/for/while bodies and the placement of siblings.
 */

import { describe, expect, it } from "vitest";
import type * as AST from "../src/parser/ast";
import { Parser } from "../src/parser/parser";

function parse(code: string): AST.Program {
	const parser = new Parser(code);
	const ast = parser.parse();
	expect(parser.getParserErrors()).toEqual([]);
	return ast;
}

function types(statements: AST.Statement[]): string[] {
	return statements.map((s) => s.type);
}

describe("if statement blocks", () => {
	it("keeps statements 2..n inside the consequent (#31 Finding 1)", () => {
		const ast = parse(
			[
				"if close > open",
				"    x = 1",
				"    y = 2",
				"    z = 3",
				"plot(close)",
			].join("\n"),
		);

		expect(types(ast.body)).toEqual(["IfStatement", "ExpressionStatement"]);
		const ifStmt = ast.body[0] as AST.IfStatement;
		expect(ifStmt.consequent).toHaveLength(3);
		expect(types(ifStmt.consequent)).toEqual([
			"VariableDeclaration",
			"VariableDeclaration",
			"VariableDeclaration",
		]);
	});

	it("attaches else as the alternate (#31 Finding 1)", () => {
		const ast = parse(
			[
				"if close > open",
				"    x = 1",
				"    y = 2",
				"else",
				"    z = 3",
				"    w = 4",
				"plot(close)",
			].join("\n"),
		);

		expect(types(ast.body)).toEqual(["IfStatement", "ExpressionStatement"]);
		const ifStmt = ast.body[0] as AST.IfStatement;
		expect(ifStmt.consequent).toHaveLength(2);
		expect(ifStmt.alternate).toBeDefined();
		expect(ifStmt.alternate).toHaveLength(2);
	});

	it("nests else if chains without swallowing following statements (#31 Finding 6)", () => {
		const ast = parse(
			[
				"if close > open",
				"    x = 1",
				"else if close < open",
				"    y = 2",
				"else",
				"    z = 3",
				"plot(close)",
			].join("\n"),
		);

		expect(types(ast.body)).toEqual(["IfStatement", "ExpressionStatement"]);
		const outer = ast.body[0] as AST.IfStatement;
		expect(outer.consequent).toHaveLength(1);
		expect(outer.alternate).toHaveLength(1);

		const inner = outer.alternate?.[0] as AST.IfStatement;
		expect(inner.type).toBe("IfStatement");
		expect(inner.consequent).toHaveLength(1);
		expect(inner.alternate).toHaveLength(1);
	});

	it("attaches a dedented else to the outer if, not the inner", () => {
		const ast = parse(
			[
				"if close > open",
				"    if close > high",
				"        x = 1",
				"else",
				"    y = 2",
				"plot(close)",
			].join("\n"),
		);

		expect(types(ast.body)).toEqual(["IfStatement", "ExpressionStatement"]);
		const outer = ast.body[0] as AST.IfStatement;
		expect(outer.alternate).toHaveLength(1);

		const inner = outer.consequent[0] as AST.IfStatement;
		expect(inner.type).toBe("IfStatement");
		expect(inner.consequent).toHaveLength(1);
		expect(inner.alternate).toBeUndefined();
	});

	it("does not swallow same-column siblings after a bodyless if (INV008)", () => {
		const ast = parse(["if close > open", "plot(close)"].join("\n"));

		expect(types(ast.body)).toEqual(["IfStatement", "ExpressionStatement"]);
		const ifStmt = ast.body[0] as AST.IfStatement;
		expect(ifStmt.consequent).toHaveLength(0);
	});

	it("does not swallow same-column siblings after a bodyless else (#31 Finding 6)", () => {
		const ast = parse(
			["if close > open", "    x = 1", "else", "plot(close)"].join("\n"),
		);

		expect(types(ast.body)).toEqual(["IfStatement", "ExpressionStatement"]);
		const ifStmt = ast.body[0] as AST.IfStatement;
		expect(ifStmt.alternate).toHaveLength(0);
	});

	it("keeps indented statements after a nested if inside the outer body", () => {
		const ast = parse(
			[
				"if close > open",
				"    if close > high",
				"        x = 1",
				"    y = 2",
				"plot(close)",
			].join("\n"),
		);

		expect(types(ast.body)).toEqual(["IfStatement", "ExpressionStatement"]);
		const outer = ast.body[0] as AST.IfStatement;
		expect(types(outer.consequent)).toEqual([
			"IfStatement",
			"VariableDeclaration",
		]);
	});
});

describe("while statement blocks", () => {
	it("keeps statements 2..n inside the body (#31 Finding 2)", () => {
		const ast = parse(
			[
				"i = 0",
				"while i < 10",
				"    x = i * 2",
				"    i := i + 1",
				"plot(close)",
			].join("\n"),
		);

		expect(types(ast.body)).toEqual([
			"VariableDeclaration",
			"WhileStatement",
			"ExpressionStatement",
		]);
		const whileStmt = ast.body[1] as AST.WhileStatement;
		expect(whileStmt.body).toHaveLength(2);
	});

	it("does not swallow same-column siblings after a bodyless while (#31 Finding 6)", () => {
		const ast = parse(["while close > open", "plot(close)"].join("\n"));

		expect(types(ast.body)).toEqual(["WhileStatement", "ExpressionStatement"]);
		const whileStmt = ast.body[0] as AST.WhileStatement;
		expect(whileStmt.body).toHaveLength(0);
	});
});

describe("for statement blocks", () => {
	it("keeps multi-statement for bodies intact", () => {
		const ast = parse(
			["for i = 0 to 10", "    x = i", "    y = i * 2", "plot(close)"].join(
				"\n",
			),
		);

		expect(types(ast.body)).toEqual(["ForStatement", "ExpressionStatement"]);
		const forStmt = ast.body[0] as AST.ForStatement;
		expect(forStmt.body).toHaveLength(2);
	});

	it("parses a typed iterator (for int i = ...)", () => {
		const ast = parse(
			["for int i = 0 to 10", "    x = i", "plot(close)"].join("\n"),
		);

		expect(types(ast.body)).toEqual(["ForStatement", "ExpressionStatement"]);
		const forStmt = ast.body[0] as AST.ForStatement;
		expect(forStmt.iterator).toBe("i");
		expect(forStmt.body).toHaveLength(1);
	});

	it("does not swallow same-column siblings after a bodyless for (#31 Finding 6)", () => {
		const ast = parse(["for i = 0 to 10", "plot(close)"].join("\n"));

		expect(types(ast.body)).toEqual(["ForStatement", "ExpressionStatement"]);
		const forStmt = ast.body[0] as AST.ForStatement;
		expect(forStmt.body).toHaveLength(0);
	});

	it("keeps multi-statement for-in bodies intact", () => {
		const ast = parse(
			[
				"arr = array.from(1, 2, 3)",
				"for item in arr",
				"    x = item",
				"    y = item * 2",
				"plot(close)",
			].join("\n"),
		);

		expect(types(ast.body)).toEqual([
			"VariableDeclaration",
			"ForInStatement",
			"ExpressionStatement",
		]);
		const forStmt = ast.body[1] as AST.ForInStatement;
		expect(forStmt.body).toHaveLength(2);
	});

	it("parses the tuple iterator form, including type-keyword names", () => {
		const ast = parse(
			[
				"arr = array.from(1, 2, 3)",
				"for [index, line] in arr",
				"    x = index",
				"    y = line",
				"plot(close)",
			].join("\n"),
		);

		expect(types(ast.body)).toEqual([
			"VariableDeclaration",
			"ForInStatement",
			"ExpressionStatement",
		]);
		const forStmt = ast.body[1] as AST.ForInStatement;
		expect(forStmt.iterator).toBe("index");
		expect(forStmt.iterator2).toBe("line");
		expect(forStmt.body).toHaveLength(2);
	});

	it("does not swallow same-column siblings after a bodyless for-in (#31 Finding 6)", () => {
		const ast = parse(
			["arr = array.from(1, 2, 3)", "for item in arr", "plot(close)"].join(
				"\n",
			),
		);

		expect(types(ast.body)).toEqual([
			"VariableDeclaration",
			"ForInStatement",
			"ExpressionStatement",
		]);
		const forStmt = ast.body[1] as AST.ForInStatement;
		expect(forStmt.body).toHaveLength(0);
	});
});
