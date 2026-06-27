import { describe, expect, it } from "vitest";
import { DiagnosticSeverity, UnifiedPineValidator } from "../src/analyzer/checker";
import type {
	CallExpression,
	Expression,
	Identifier,
	Program,
	VariableDeclaration,
} from "../src/parser/ast";
import { Parser } from "../src/parser/parser";

function parseAndValidate(code: string): {
	ast: Program;
	validator: UnifiedPineValidator;
} {
	const parser = new Parser(code);
	const ast = parser.parse();
	const validator = new UnifiedPineValidator();
	const errors = validator
		.validate(ast, parser.getDetectedVersion() || "6")
		.filter((e) => e.severity === DiagnosticSeverity.Error);
	expect(errors).toEqual([]);
	return { ast, validator };
}

function variableInit(ast: Program, name: string): Expression {
	const decl = ast.body.find(
		(stmt): stmt is VariableDeclaration =>
			stmt.type === "VariableDeclaration" && stmt.name === name,
	);
	if (!decl?.init) throw new Error(`missing variable ${name}`);
	return decl.init;
}

function identifier(name: string): Identifier {
	return { type: "Identifier", name, line: 0, column: 0 };
}

describe("UDF call graph fixpoint", () => {
	it("grounds an untyped scalar param from a homogeneous call site", () => {
		const { ast, validator } = parseAndValidate(`//@version=6
indicator("x")
f(p) => p
x = f("hello")
`);
		const call = variableInit(ast, "x") as CallExpression;
		expect(validator.inferExpressionType(call, "6")).toBe("string");
	});

	it("joins nested scalar branch tails and preserves numeric widening", () => {
		const { ast, validator } = parseAndValidate(`//@version=6
indicator("x")
mixed(p) =>
    if close > open
        p
    else
        1
numeric(p) =>
    if close > open
        p
    else
        1.0
a = mixed("hello")
b = numeric(1)
`);
		expect(validator.inferExpressionType(variableInit(ast, "a"), "6")).toBe(
			"unknown",
		);
		expect(validator.inferExpressionType(variableInit(ast, "b"), "6")).toBe(
			"float",
		);
	});

	it("unions trailing switch arms instead of taking the first arm", () => {
		const { ast, validator } = parseAndValidate(`//@version=6
indicator("x")
sw(c) =>
    switch
        c => 1
        => 1.0
b = sw(close > open)
`);
		// First-arm-only inference would yield "int" (the `=> 1` case); the
		// branch-tail union widens int/float to "float".
		expect(validator.inferExpressionType(variableInit(ast, "b"), "6")).toBe(
			"float",
		);
	});

	it("grounds tuple-return UDF elements through the shared param binding", () => {
		const { validator } = parseAndValidate(`//@version=6
indicator("x")
pair(p) => [p, close > open]
[txt, cond] = pair("hello")
plot(cond ? close : open)
`);
		expect(validator.inferExpressionType(identifier("txt"), "6")).toBe("string");
		expect(validator.inferExpressionType(identifier("cond"), "6")).toBe(
			"series<bool>",
		);
	});
});
