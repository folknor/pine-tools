import { describe, expect, it } from "vitest";
import { DiagnosticSeverity, UnifiedPineValidator } from "../src/analyzer/checker";
import { qualifierProvenance } from "../src/analyzer/checker-provenance";
import type {
	CallExpression,
	Expression,
	FunctionDeclaration,
	Statement,
	VariableDeclaration,
} from "../src/parser/ast";
import { Parser } from "../src/parser/parser";

function validatedAst(code: string): {
	validator: UnifiedPineValidator;
	body: Statement[];
} {
	const parser = new Parser(code);
	const ast = parser.parse();
	const validator = new UnifiedPineValidator();
	const errors = validator
		.validate(ast, parser.getDetectedVersion() || "6")
		.filter((e) => e.severity === DiagnosticSeverity.Error);
	expect(errors).toEqual([]);
	return { validator, body: ast.body };
}

function initExpr(body: Statement[], name: string): Expression {
	const stmt = body.find(
		(s): s is VariableDeclaration =>
			s.type === "VariableDeclaration" && s.name === name,
	);
	if (!stmt?.init) throw new Error(`missing init for ${name}`);
	return stmt.init;
}

function functionCall(body: Statement[], name: string): CallExpression {
	const expr = initExpr(body, name);
	if (expr.type !== "CallExpression") {
		throw new Error(`${name} is not initialized from a call`);
	}
	return expr;
}

describe("qualifierProvenance", () => {
	it.each([
		["literal const", "x = 5", "x", { base: "int", qualifier: "const" }],
		["builtin variable", "x = close", "x", { base: "float", qualifier: "series" }],
		["builtin constant", "x = color.red", "x", { base: "color", qualifier: "const" }],
		[
			"input call",
			"x = input.int(2)",
			"x",
			{ base: "int", qualifier: "input" },
		],
		[
			"series builtin call",
			"x = ta.sma(close, 5)",
			"x",
			{ base: "float", qualifier: "series" },
		],
		[
			"series operator result",
			"x = close > open",
			"x",
			{ base: "bool", qualifier: "series" },
		],
		[
			"const composite result",
			"x = true ? 1 : 2",
			"x",
			{ base: "int", qualifier: "const" },
		],
	])("%s", (_label, fragment, name, expected) => {
		const { validator, body } = validatedAst(`//@version=6
indicator("x")
${fragment}
`);
		expect(
			qualifierProvenance(validator, initExpr(body, name), "6", {
				trustUdfAndUserVars: true,
			}),
		).toEqual(expected);
	});

	it("preserves const through a UDF returning a literal", () => {
		const { validator, body } = validatedAst(`//@version=6
indicator("x")
f() => 5
x = f()
`);
		expect(
			qualifierProvenance(validator, functionCall(body, "x"), "6", {
				trustUdfAndUserVars: true,
			}),
		).toEqual({ base: "int", qualifier: "const" });
	});

	it("resolves a series UDF return structurally", () => {
		const { validator, body } = validatedAst(`//@version=6
indicator("x")
g() => close > open
x = g()
`);
		expect(
			qualifierProvenance(validator, functionCall(body, "x"), "6", {
				trustUdfAndUserVars: true,
			}),
		).toEqual({ base: "bool", qualifier: "series" });
	});

	it("leaves an untyped parameter return undetermined", () => {
		const { validator, body } = validatedAst(`//@version=6
indicator("x")
f(p) => p
x = f("hello")
`);
		expect(
			qualifierProvenance(validator, functionCall(body, "x"), "6", {
				trustUdfAndUserVars: true,
			}),
		).toBeNull();
	});

	it("keeps the conservative policy neutral for UDF calls and bare user vars", () => {
		const { validator, body } = validatedAst(`//@version=6
indicator("x")
f() => 5
g() => close > open
a = 5
x = f()
y = g()
z = a
`);
		expect(
			qualifierProvenance(validator, functionCall(body, "x"), "6", {
				trustUdfAndUserVars: false,
			}),
		).toBeNull();
		expect(
			qualifierProvenance(validator, functionCall(body, "y"), "6", {
				trustUdfAndUserVars: false,
			}),
		).toBeNull();
		expect(
			qualifierProvenance(validator, initExpr(body, "z"), "6", {
				trustUdfAndUserVars: false,
			}),
		).toBeNull();
	});

	it("records a single function body for the resolver registry", () => {
		const { validator, body } = validatedAst(`//@version=6
indicator("x")
f() => 5
x = f()
`);
		const decl = body.find(
			(s): s is FunctionDeclaration =>
				s.type === "FunctionDeclaration" && s.name === "f",
		);
		expect(validator.udfBodyRecords.get("f")?.[0]?.declaration).toBe(decl);
	});
});
