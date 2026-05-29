import { describe, expect, it } from "vitest";
import annotations from "../../../pine-data/v6/annotations.json" with {
	type: "json",
};

type Annotation = {
	name: string;
	description: string;
	syntax?: string;
	examples?: string[];
};

const byName = new Map((annotations as Annotation[]).map((a) => [a.name, a]));

describe("generated annotations.json (#25)", () => {
	it("catalogs the compiler/doc annotations", () => {
		// The Annotations reference section: @version=, @param, @type, etc.
		expect((annotations as Annotation[]).length).toBeGreaterThanOrEqual(10);
		for (const name of ["@version=", "@param", "@type", "@function", "@enum"]) {
			expect(byName.has(name), `missing annotation ${name}`).toBe(true);
		}
	});

	it("every annotation has a non-empty description", () => {
		for (const a of annotations as Annotation[]) {
			expect(a.description, `${a.name} missing description`).toBeTruthy();
		}
	});

	it("annotation names keep their leading @", () => {
		for (const a of annotations as Annotation[]) {
			expect(a.name.startsWith("@"), `${a.name} should start with @`).toBe(true);
		}
	});
});
