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

	it("maps dynamic/inherited defaults to magic sentinels", () => {
		expect(
			parseDefault("The default is the format value used by the indicator()."),
		).toBe("SCRIPT_FORMAT");
		expect(
			parseDefault("The default is the precision value used by the strategy()."),
		).toBe("SCRIPT_PRECISION");
		expect(
			parseDefault("The default is the same as the number of chart bars."),
		).toBe("CHART_BARS");
		expect(
			parseDefault("The default is inherited from the precision of the chart's symbol."),
		).toBe("CHART_SYMBOL");
		expect(
			parseDefault("The default is the length of the source string."),
		).toBe("SOURCE_LENGTH");
		expect(parseDefault("The default is the argument used for start_column.")).toBe(
			"ARG:start_column",
		);
	});

	it("captures an approximate count as the literal number (drops the ~)", () => {
		expect(parseDefault("The default is ~50 lines.")).toBe("50");
	});

	it("keeps an uppercase literal value as a literal, not a sentinel", () => {
		// strategy.close_entries_rule defaults to the literal string "FIFO".
		expect(parseDefault('The default is "FIFO".')).toBe("FIFO");
	});

	it("returns undefined when no default is documented", () => {
		expect(parseDefault("An array object to operate on.")).toBeUndefined();
	});
});
