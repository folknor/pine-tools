import { describe, expect, it } from "vitest";
import types from "../../../pine-data/v6/types.json" with { type: "json" };

type Field = { name: string; type: string; description: string };
type BuiltinType = {
	name: string;
	namespace?: string;
	kind: string;
	description?: string;
	examples?: string[];
	fields?: Field[];
};

const byName = new Map((types as BuiltinType[]).map((t) => [t.name, t]));

describe("generated types.json (#25)", () => {
	it("catalogs the built-in types with a kind each", () => {
		expect((types as BuiltinType[]).length).toBeGreaterThanOrEqual(20);
		for (const t of types as BuiltinType[]) {
			expect(
				["primitive", "qualifier", "container", "object"],
				`${t.name} has unexpected kind ${t.kind}`,
			).toContain(t.kind);
		}
	});

	it("classifies primitives, qualifiers, and containers", () => {
		expect(byName.get("int")?.kind).toBe("primitive");
		expect(byName.get("series")?.kind).toBe("qualifier");
		expect(byName.get("array")?.kind).toBe("container");
		expect(byName.get("chart.point")?.kind).toBe("object");
	});

	it("exposes chart.point's fields with types", () => {
		const cp = byName.get("chart.point");
		expect(cp?.namespace).toBe("chart");
		expect(cp?.fields?.map((f) => `${f.name}:${f.type}`)).toEqual([
			"index:series int",
			"time:series int",
			"price:series float",
		]);
	});

	it("leaves opaque ID types without fields", () => {
		// line/label/box/table are manipulated via .*() functions, not fields.
		for (const name of ["line", "label", "box", "table"]) {
			expect(byName.get(name)?.fields, `${name} should have no fields`).toBeUndefined();
		}
	});
});
