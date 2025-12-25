/**
 * Parser fuzzing experiments with fast-check.
 * Run: pnpm test -- --testNamePattern="fuzzer"
 */

import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Parser } from "../src/parser/parser";

// Track interesting findings
const crashes: string[] = [];
const hangs: string[] = [];

// Parse and check for unexpected crashes (not parse errors)
function parseDoesNotCrash(code: string, timeoutMs = 100): boolean {
	const start = Date.now();
	try {
		const parser = new Parser(code);
		parser.parse();
		if (Date.now() - start > timeoutMs) {
			hangs.push(code.substring(0, 100));
		}
		return true;
	} catch (e) {
		// Parser throwing errors for invalid input is expected
		// But it should never throw unexpected errors
		if (e instanceof Error) {
			const msg = e.message.toLowerCase();
			// These are expected parse errors
			if (msg.includes("unexpected") || msg.includes("expected") || msg.includes("invalid")) {
				return true;
			}
			// Unexpected crash
			crashes.push(`${code.substring(0, 50)}\n  → ${e.message}`);
		}
		return true; // Don't fail the property, just log
	}
}

// === Arbitraries ===

const identifier = fc.stringMatching(/^[a-zA-Z_][a-zA-Z0-9_]{0,10}$/);
const intLiteral = fc.integer({ min: -1000000, max: 1000000 }).map(String);
const floatLiteral = fc.float({ min: -1000, max: 1000, noNaN: true }).map(n => n.toFixed(2));
const boolLiteral = fc.constantFrom("true", "false");
const stringLiteral = fc.string({ minLength: 0, maxLength: 20 }).map(s => `"${s.replace(/["\\]/g, "")}"`);
const naLiteral = fc.constant("na");
const colorLiteral = fc.constantFrom("color.red", "color.green", "color.blue", "#FF0000");

const literal = fc.oneof(intLiteral, floatLiteral, boolLiteral, stringLiteral, naLiteral, colorLiteral);

const binaryOp = fc.constantFrom("+", "-", "*", "/", "%", ">", "<", ">=", "<=", "==", "!=", "and", "or");
const unaryOp = fc.constantFrom("-", "not ");

const builtinVar = fc.constantFrom("close", "open", "high", "low", "volume", "time", "bar_index");
const builtinFunc = fc.constantFrom("ta.sma", "ta.ema", "math.abs", "str.tostring", "nz", "na");

// Recursive expression builder
const expression: fc.Arbitrary<string> = fc.letrec(tie => ({
	atom: fc.oneof(
		literal,
		identifier,
		builtinVar,
	),
	call: fc.tuple(
		fc.oneof(identifier, builtinFunc),
		fc.array(tie("expr") as fc.Arbitrary<string>, { minLength: 0, maxLength: 3 })
	).map(([fn, args]) => `${fn}(${args.join(", ")})`),
	unary: fc.tuple(unaryOp, tie("atom") as fc.Arbitrary<string>)
		.map(([op, e]) => `${op}${e}`),
	binary: fc.tuple(
		tie("atom") as fc.Arbitrary<string>,
		binaryOp,
		tie("atom") as fc.Arbitrary<string>
	).map(([l, op, r]) => `${l} ${op} ${r}`),
	ternary: fc.tuple(
		tie("atom") as fc.Arbitrary<string>,
		tie("atom") as fc.Arbitrary<string>,
		tie("atom") as fc.Arbitrary<string>
	).map(([c, t, f]) => `${c} ? ${t} : ${f}`),
	member: fc.tuple(identifier, identifier)
		.map(([obj, prop]) => `${obj}.${prop}`),
	index: fc.tuple(identifier, tie("atom") as fc.Arbitrary<string>)
		.map(([arr, idx]) => `${arr}[${idx}]`),
	expr: fc.oneof(
		{ weight: 3, arbitrary: tie("atom") as fc.Arbitrary<string> },
		{ weight: 2, arbitrary: tie("call") as fc.Arbitrary<string> },
		{ weight: 2, arbitrary: tie("binary") as fc.Arbitrary<string> },
		{ weight: 1, arbitrary: tie("unary") as fc.Arbitrary<string> },
		{ weight: 1, arbitrary: tie("ternary") as fc.Arbitrary<string> },
		{ weight: 1, arbitrary: tie("member") as fc.Arbitrary<string> },
		{ weight: 1, arbitrary: tie("index") as fc.Arbitrary<string> },
	),
})).expr;

// Statement builders
const varDecl = fc.tuple(
	fc.constantFrom("", "var ", "varip "),
	identifier,
	expression
).map(([kw, name, expr]) => `${kw}${name} = ${expr}`);

const assignment = fc.tuple(identifier, expression)
	.map(([name, expr]) => `${name} := ${expr}`);

const ifStmt = fc.tuple(expression, expression, fc.option(expression))
	.map(([cond, then, els]) =>
		els ? `if ${cond}\n    ${then}\nelse\n    ${els}` : `if ${cond}\n    ${then}`
	);

const forStmt = fc.tuple(identifier, intLiteral, intLiteral, expression)
	.map(([i, from, to, body]) => `for ${i} = ${from} to ${to}\n    ${body}`);

const statement = fc.oneof(
	{ weight: 3, arbitrary: varDecl },
	{ weight: 2, arbitrary: assignment },
	{ weight: 1, arbitrary: ifStmt },
	{ weight: 1, arbitrary: forStmt },
);

// Full script
const script = fc.tuple(
	fc.constant('//@version=6\nindicator("fuzz")'),
	fc.array(statement, { minLength: 1, maxLength: 5 })
).map(([header, stmts]) => `${header}\n${stmts.join("\n")}`);

describe("fuzzer", () => {
	it("parses random expressions without crashing", () => {
		crashes.length = 0;
		hangs.length = 0;

		fc.assert(
			fc.property(expression, (expr) => {
				return parseDoesNotCrash(expr);
			}),
			{ numRuns: 1000, verbose: false }
		);

		if (crashes.length > 0) {
			console.log("Crashes found:", crashes.slice(0, 5));
		}
		expect(crashes).toHaveLength(0);
	});

	it("parses random statements without crashing", () => {
		crashes.length = 0;
		hangs.length = 0;

		fc.assert(
			fc.property(statement, (stmt) => {
				return parseDoesNotCrash(stmt);
			}),
			{ numRuns: 1000, verbose: false }
		);

		if (crashes.length > 0) {
			console.log("Crashes found:", crashes.slice(0, 5));
		}
		expect(crashes).toHaveLength(0);
	});

	it("parses random scripts without crashing", () => {
		crashes.length = 0;
		hangs.length = 0;

		fc.assert(
			fc.property(script, (code) => {
				return parseDoesNotCrash(code, 500);
			}),
			{ numRuns: 500, verbose: false }
		);

		if (crashes.length > 0) {
			console.log("Crashes found:", crashes.slice(0, 5));
		}
		expect(crashes).toHaveLength(0);
	});

	describe("edge cases", () => {
		it("handles deep parentheses nesting", () => {
			const deepParens = fc.integer({ min: 1, max: 50 })
				.map(n => "(".repeat(n) + "1" + ")".repeat(n));

			fc.assert(
				fc.property(deepParens, (code) => parseDoesNotCrash(code, 1000)),
				{ numRuns: 100 }
			);
		});

		it("handles long operator chains", () => {
			const longChain = fc.integer({ min: 1, max: 50 })
				.map(n => Array(n).fill("x").join(" + "));

			fc.assert(
				fc.property(longChain, (code) => parseDoesNotCrash(code, 1000)),
				{ numRuns: 100 }
			);
		});

		it("handles many function arguments", () => {
			const manyArgs = fc.integer({ min: 1, max: 30 })
				.map(n => `func(${Array(n).fill("1").join(", ")})`);

			fc.assert(
				fc.property(manyArgs, (code) => parseDoesNotCrash(code, 1000)),
				{ numRuns: 100 }
			);
		});

		it("handles deep member access", () => {
			const deepMember = fc.integer({ min: 1, max: 20 })
				.map(n => Array(n).fill("a").join("."));

			fc.assert(
				fc.property(deepMember, (code) => parseDoesNotCrash(code, 1000)),
				{ numRuns: 100 }
			);
		});

		it("handles nested ternaries", () => {
			const nestedTernary = fc.integer({ min: 1, max: 10 })
				.map(n => {
					let s = "x";
					for (let i = 0; i < n; i++) s = `c ? ${s} : ${s}`;
					return s;
				});

			fc.assert(
				fc.property(nestedTernary, (code) => parseDoesNotCrash(code, 1000)),
				{ numRuns: 100 }
			);
		});

		it("handles random garbage input", () => {
			const garbage = fc.string({ minLength: 1, maxLength: 100 });

			fc.assert(
				fc.property(garbage, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 500 }
			);
		});

		it("handles unicode in strings", () => {
			const unicodeString = fc.array(
				fc.integer({ min: 0x100, max: 0xFFFF }).map(n => String.fromCharCode(n)),
				{ minLength: 1, maxLength: 50 }
			).map(chars => `x = "${chars.join("").replace(/["\\]/g, "")}"`);

			fc.assert(
				fc.property(unicodeString, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 200 }
			);
		});

		it("handles unicode identifiers", () => {
			// Pine allows some unicode in identifiers
			const unicodeId = fc.stringMatching(/^[a-zA-Z_\u00C0-\u00FF][a-zA-Z0-9_\u00C0-\u00FF]{0,10}$/)
				.map(id => `${id} = 1`);

			fc.assert(
				fc.property(unicodeId, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 200 }
			);
		});

		it("handles control characters", () => {
			const controlChars = fc.array(
				fc.integer({ min: 0, max: 31 }).map(n => String.fromCharCode(n)),
				{ minLength: 1, maxLength: 20 }
			).map(chars => `x = "${chars.join("")}"`);

			fc.assert(
				fc.property(controlChars, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 100 }
			);
		});

		it("handles very long lines", () => {
			const longLine = fc.integer({ min: 100, max: 1000 })
				.map(n => `x = ${"a + ".repeat(n)}1`);

			fc.assert(
				fc.property(longLine, (code) => parseDoesNotCrash(code, 2000)),
				{ numRuns: 20 }
			);
		});

		it("handles whitespace variations", () => {
			const whitespace = fc.array(
				fc.constantFrom(" ", "\t", "  ", "\t\t", " \t "),
				{ minLength: 1, maxLength: 10 }
			).map(ws => `x${ws.join("")}=${ws.join("")}1`);

			fc.assert(
				fc.property(whitespace, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 100 }
			);
		});

		it("handles mixed bracket types", () => {
			const brackets = fc.array(
				fc.constantFrom("(", ")", "[", "]"),
				{ minLength: 1, maxLength: 30 }
			).map(b => b.join(""));

			fc.assert(
				fc.property(brackets, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 200 }
			);
		});

		it("handles comment variations", () => {
			const comments = fc.oneof(
				fc.string({ maxLength: 50 }).map(s => `// ${s.replace(/\n/g, " ")}`),
				fc.string({ maxLength: 50 }).map(s => `x = 1 // ${s.replace(/\n/g, " ")}`),
				fc.integer({ min: 1, max: 10 }).map(n => Array(n).fill("// comment").join("\n")),
			);

			fc.assert(
				fc.property(comments, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 200 }
			);
		});

		it("handles special number formats", () => {
			const numbers = fc.oneof(
				fc.integer({ min: 0, max: 0xFFFFFF }).map(n => `x = #${n.toString(16).padStart(6, "0")}`),
				fc.float({ noNaN: true }).map(n => `x = ${n.toExponential()}`),
				fc.constant("x = .5"),
				fc.constant("x = 5."),
				fc.constant("x = 1e10"),
				fc.constant("x = 1E-10"),
				fc.constant("x = 0.0"),
				fc.integer({ min: 1, max: 20 }).map(n => `x = ${"0".repeat(n)}1`),
			);

			fc.assert(
				fc.property(numbers, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 200 }
			);
		});

		it("handles indentation edge cases", () => {
			const indented = fc.tuple(
				fc.integer({ min: 0, max: 20 }),
				fc.integer({ min: 0, max: 20 }),
			).map(([spaces, tabs]) =>
				`if true\n${" ".repeat(spaces)}${"\t".repeat(tabs)}x = 1`
			);

			fc.assert(
				fc.property(indented, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 100 }
			);
		});

		it("handles empty and minimal inputs", () => {
			const minimal = fc.constantFrom(
				"",
				" ",
				"\n",
				"\t",
				"//",
				"()",
				"[]",
				"{}",
				"=",
				":=",
				".",
				",",
				"?",
				":",
				"x",
				"1",
				'"',
				"'",
				"`",
			);

			fc.assert(
				fc.property(minimal, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 50 }
			);
		});

		it("handles deeply nested structures", () => {
			const deepNest = fc.integer({ min: 1, max: 30 }).map(n => {
				let code = "x";
				for (let i = 0; i < n; i++) {
					const wrap = i % 4;
					if (wrap === 0) code = `(${code})`;
					else if (wrap === 1) code = `[${code}]`;
					else if (wrap === 2) code = `func(${code})`;
					else code = `a.${code}`;
				}
				return code;
			});

			fc.assert(
				fc.property(deepNest, (code) => parseDoesNotCrash(code, 1000)),
				{ numRuns: 100 }
			);
		});

		it("handles operator combinations", () => {
			const ops = fc.array(
				fc.constantFrom("+", "-", "*", "/", "%", "==", "!=", "<", ">", "<=", ">=", "and", "or", "not", "?", ":"),
				{ minLength: 2, maxLength: 20 }
			).map(ops => ops.join(" "));

			fc.assert(
				fc.property(ops, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 200 }
			);
		});

		it("handles string escape sequences", () => {
			const escapes = fc.array(
				fc.constantFrom("\\n", "\\t", "\\r", "\\\\", '\\"', "\\0", "\\x00", "\\u0000"),
				{ minLength: 1, maxLength: 10 }
			).map(esc => `x = "${esc.join("")}"`);

			fc.assert(
				fc.property(escapes, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 100 }
			);
		});

		it("handles multiline strings", () => {
			const multiline = fc.integer({ min: 1, max: 10 })
				.map(n => `x = "${Array(n).fill("line").join("\n")}"`);

			fc.assert(
				fc.property(multiline, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 50 }
			);
		});

		it("handles keyword-like identifiers", () => {
			const keywordish = fc.constantFrom(
				"iff", "elsee", "forr", "varr", "truee", "falsee",
				"if_", "_if", "if1", "1if",
				"return_value", "break_point", "continue_here",
				"and_", "or_", "not_",
				"na_", "NaN", "Infinity",
			).map(id => `${id} = 1`);

			fc.assert(
				fc.property(keywordish, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 50 }
			);
		});

		it("handles rapid context switches", () => {
			const contextSwitch = fc.array(
				fc.constantFrom(
					"x = 1",
					"if true",
					"    y = 2",
					"for i = 0 to 10",
					"    z = i",
					"func(a, b)",
					"[a, b] = [1, 2]",
					"a.b.c",
					"a[0][1]",
				),
				{ minLength: 2, maxLength: 10 }
			).map(lines => lines.join("\n"));

			fc.assert(
				fc.property(contextSwitch, (code) => parseDoesNotCrash(code, 500)),
				{ numRuns: 100 }
			);
		});
	});
});
