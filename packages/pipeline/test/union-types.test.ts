import { describe, expect, it } from "vitest";
import { parseArgTypeText } from "../src/arg-parse.ts";
import { unionOverloadParams, unionTypes } from "../src/union-types.ts";

describe("parseArgTypeText", () => {
	it("parses a standard single-arg row", () => {
		expect(parseArgTypeText("id (array<int/float>) An array object.")).toEqual([
			{ name: "id", type: "array<int/float>" },
		]);
	});

	it("expands a variadic row into one entry per name, dropping the ellipsis", () => {
		// math.max renders all args in one node: "number0, number1, ... (type)".
		expect(
			parseArgTypeText("number0, number1, ... (const int) A sequence."),
		).toEqual([
			{ name: "number0", type: "const int" },
			{ name: "number1", type: "const int" },
		]);
	});

	it("returns nothing when there is no parenthesised type", () => {
		expect(parseArgTypeText("just some prose")).toEqual([]);
	});
});

describe("unionTypes", () => {
	it("widens the qualifier and merges the primitive set (math.max)", () => {
		expect(
			unionTypes([
				"const int",
				"const int/float",
				"series int",
				"series int/float",
			]),
		).toBe("series int/float");
	});

	it("falls back to unknown for genuinely mixed types (array.from element)", () => {
		expect(unionTypes(["series int", "series label", "<arg..._type>"])).toBe(
			"unknown",
		);
	});
});

describe("unionOverloadParams", () => {
	it("unions a trailing optional param in NESTED overloads (math.round.precision)", () => {
		const result = unionOverloadParams({
			overloadArgs: [
				[{ name: "number", type: "series int/float" }],
				[
					{ name: "number", type: "series int/float" },
					{ name: "precision", type: "series int" },
				],
			],
		});
		expect(result.get("number")).toBe("series int/float");
		expect(result.get("precision")).toBe("series int");
	});

	it("leaves subset params out for DIVERGENT overloads (box.new point-vs-scalar)", () => {
		// Position 0 differs by name across overloads -> positional calls are
		// ambiguous, so the subset params must stay unresolved (bypass preserved).
		const result = unionOverloadParams({
			overloadArgs: [
				[
					{ name: "top_left", type: "chart.point" },
					{ name: "bottom_right", type: "chart.point" },
				],
				[
					{ name: "left", type: "series int" },
					{ name: "top", type: "series int/float" },
				],
			],
		});
		expect(result.has("top_left")).toBe(false);
		expect(result.has("left")).toBe(false);
	});

	it("resolves variadic same-named args across overloads (math.max)", () => {
		const result = unionOverloadParams({
			overloadArgs: [
				[
					{ name: "number0", type: "const int" },
					{ name: "number1", type: "const int" },
				],
				[
					{ name: "number0", type: "series int/float" },
					{ name: "number1", type: "series int/float" },
				],
			],
		});
		expect(result.get("number0")).toBe("series int/float");
		expect(result.get("number1")).toBe("series int/float");
	});
});
