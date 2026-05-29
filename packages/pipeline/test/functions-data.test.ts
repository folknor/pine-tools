import { describe, expect, it } from "vitest";
import functions from "../../../pine-data/v6/functions.json" with {
	type: "json",
};

type Overload = { parameters: { name: string; type: string }[]; returns: string };
type Fn = {
	name: string;
	parameters: { name: string; type: string }[];
	returns: string;
	overloads?: Overload[];
};

const byName = new Map((functions as Fn[]).map((f) => [f.name, f]));

describe("generated functions.json — overload exposure (TODO #25)", () => {
	it("exposes per-overload structure for an overloaded function", () => {
		const round = byName.get("math.round");
		expect(round?.overloads, "math.round should expose overloads").toBeDefined();
		// All 8 qualifier/arity forms are present.
		expect(round?.overloads?.length).toBe(8);
		// The two-arg (number, precision) form must be visible — it is flattened
		// out of the merged top-level syntax/returns.
		const twoArg = round?.overloads?.find((o) => o.parameters.length === 2);
		expect(twoArg?.parameters.map((p) => p.name)).toEqual(["number", "precision"]);
		// Per-overload returns are exact, not frozen to overload #0.
		const returns = new Set(round?.overloads?.map((o) => o.returns));
		expect(returns.has("series int")).toBe(true);
		expect(returns.has("series float")).toBe(true);
	});

	it("keeps per-overload param types exact (non-unioned)", () => {
		const round = byName.get("math.round");
		const seriesForm = round?.overloads?.find(
			(o) => o.returns === "series float",
		);
		// Exact type for this overload, not the merged union "series int/float".
		expect(seriesForm?.parameters[0]).toMatchObject({
			name: "number",
			type: "series int/float",
		});
	});

	it("omits the overloads field for non-overloaded functions", () => {
		// `alert` has a single signature — fully described by the merged fields.
		expect(byName.get("alert")?.overloads).toBeUndefined();
	});

	it("every overloaded function's overload entries carry a return type", () => {
		for (const fn of functions as Fn[]) {
			if (!fn.overloads) continue;
			for (const o of fn.overloads) {
				expect(o.returns, `${fn.name} overload missing return`).toBeTruthy();
			}
		}
	});

	it("no parameter has an empty description (recovered from the mirror, #25)", () => {
		const blank: string[] = [];
		for (const fn of functions as Fn[]) {
			for (const p of fn.parameters as { name: string; description?: string }[]) {
				if (!p.description) blank.push(`${fn.name}.${p.name}`);
			}
		}
		expect(blank, `params missing description: ${blank.join(", ")}`).toEqual([]);
	});
});
