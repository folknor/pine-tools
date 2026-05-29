import { describe, expect, it } from "vitest";
import {
	parseAllowedValues,
	parseNumericRange,
} from "../src/parse-constraints.ts";

describe("parseAllowedValues", () => {
	it("captures namespaced-constant enums, stopping before the default", () => {
		expect(
			parseAllowedValues(
				"Possible values are: display.none, display.all. The default is display.all.",
			),
		).toEqual(["display.none", "display.all"]);
	});

	it("captures values joined by 'and'", () => {
		expect(
			parseAllowedValues("Possible values: xloc.bar_index and xloc.bar_time."),
		).toEqual(["xloc.bar_index", "xloc.bar_time"]);
	});

	it("ignores parenthetical prose between values", () => {
		expect(
			parseAllowedValues(
				"Possible values are: alert.freq_all (any update), alert.freq_once_per_bar (first only).",
			),
		).toEqual(["alert.freq_all", "alert.freq_once_per_bar"]);
	});

	it("captures quoted-string enums", () => {
		expect(
			parseAllowedValues('Possible values are "TTM", "FY", "FQ", "FH", "D".'),
		).toEqual(["TTM", "FY", "FQ", "FH", "D"]);
	});

	it("returns undefined for free-prose value descriptions", () => {
		expect(
			parseAllowedValues(
				'Possible values: a "string" representing a valid currency code (e.g. "USD").',
			),
		).toBeUndefined();
	});

	it("returns undefined when no value list is documented", () => {
		expect(parseAllowedValues("The source series.")).toBeUndefined();
	});
});

describe("parseNumericRange", () => {
	it('parses "from X to Y"', () => {
		expect(parseNumericRange("Possible values are from 0 to 255.")).toEqual({
			min: 0,
			max: 255,
		});
	});

	it("tolerates a parenthetical between the bound and 'to'", () => {
		expect(
			parseNumericRange("Possible values are from 0 (opaque) to 100 (invisible)."),
		).toEqual({ min: 0, max: 100 });
	});

	it('parses the "N-M" form', () => {
		expect(parseNumericRange("Possible values: 1-500.")).toEqual({
			min: 1,
			max: 500,
		});
	});

	it("returns undefined when no range is documented", () => {
		expect(parseNumericRange("Possible values: display.none, display.all.")).toBeUndefined();
	});
});
