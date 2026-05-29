import { describe, expect, it } from "vitest";
import { parseDefault } from "../src/parse-default.ts";

describe("parseDefault", () => {
	it("captures namespaced constants", () => {
		expect(parseDefault("Frequency. The default is alert.freq_once_per_bar.")).toBe(
			"alert.freq_once_per_bar",
		);
	});

	it("captures booleans (the default value is …)", () => {
		expect(parseDefault("Biased flag. The default value is false.")).toBe("false");
	});

	it("captures numbers", () => {
		expect(parseDefault("Index. The default is 0.")).toBe("0");
	});

	it("strips quotes and tolerates embedded quotes", () => {
		expect(parseDefault("Initial value. The default is 'na'.")).toBe("na");
		expect(
			parseDefault(`Format. The default is "yyyy-MM-dd'T'HH:mm:ssZ", which …`),
		).toBe("yyyy-MM-dd'T'HH:mm:ssZ");
	});

	it("maps word-numbers", () => {
		expect(parseDefault("The default is zero.")).toBe("0");
	});

	it("normalizes empty-string phrasings to \"\"", () => {
		expect(parseDefault("Title. The default is an empty string.")).toBe("");
		expect(parseDefault("Sep. The default is empty string.")).toBe("");
	});

	it("maps \"no color\" to na", () => {
		expect(parseDefault("Background. The default is no color.")).toBe("na");
	});

	it("captures a lone value token terminated by a period (e.g. close)", () => {
		expect(parseDefault("Source. The default is close.")).toBe("close");
	});

	it("returns undefined for referential / approximate defaults (no literal)", () => {
		expect(
			parseDefault("The default is the format value used by the indicator()."),
		).toBeUndefined();
		expect(parseDefault("The default is ~50 lines.")).toBeUndefined();
		expect(
			parseDefault("The default is the same as the number of chart bars."),
		).toBeUndefined();
		expect(
			parseDefault("The default is inherited from the chart's symbol."),
		).toBeUndefined();
	});

	it("returns undefined when no default is documented", () => {
		expect(parseDefault("An array object to operate on.")).toBeUndefined();
	});
});
