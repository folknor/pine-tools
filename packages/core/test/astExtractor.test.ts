import { describe, expect, it } from "vitest";
import { ASTExtractor } from "../src/parser/astExtractor";
import { Parser } from "../src/parser/parser";

describe("ASTExtractor", () => {
	it("renders namespaced constants with const-qualified types", () => {
		const parser = new Parser(`//@version=6
indicator("constants")
x = color.red
y = color.silver
a = display.none
b = barmerge.gaps_off
plot(close)`);
		const ast = parser.parse();
		expect(parser.getLexerErrors()).toHaveLength(0);
		expect(parser.getParserErrors()).toHaveLength(0);

		const result = new ASTExtractor().extract(ast);
		const types = new Map(result.variables.map((v) => [v.name, v.type]));

		expect(types.get("x")).toBe("const color");
		expect(types.get("y")).toBe("const color");
		expect(types.get("a")).toBe("const plot_simple_display");
		expect(types.get("b")).toBe("const barmerge_gaps");
	});
});
