/**
 * Extract a parameter's value CONSTRAINTS from its TradingView description.
 *
 * Many params accept only a fixed set of values, documented in prose as
 * "Possible values are: …" / "Possible values: …" / "The options are …". The
 * set is either namespaced constants (alert.freq_all, display.none), quoted
 * string literals ("TTM", 'open'), or a numeric range ("from 0 to 255",
 * "1-500"). We surface the first two as `allowedValues: string[]` and the range
 * as `{ min, max }`, so a consumer gets autocomplete / validation without
 * re-parsing prose. See TODO #25.
 *
 * Best-effort: free-prose value descriptions ("a string representing a valid
 * currency code") yield nothing rather than a bogus enum.
 */

// Phrases that introduce the value list.
const INTRO =
	/(?:possible values(?:\s+are|\s+include)?|the options are|available values(?:\s+are)?|allowed values(?:\s+is|\s+are)?)\s*[:.]?\s*/i;

// Where the value list ends (defaults, notes, conditional prose, examples).
const TERMINATOR =
	/\b(optional|the default|default is|default:|default value|note that|if the value|or any user|in the iso|representing a valid)\b|\(e\./i;

// The text span holding the value list: from after the intro phrase to the
// first terminator. Returns undefined if there is no intro phrase.
function valueSpan(description: string): string | undefined {
	const m = description.match(INTRO);
	if (!m) return undefined;
	let span = description.slice((m.index ?? 0) + m[0].length);
	const cut = span.search(TERMINATOR);
	if (cut >= 0) span = span.slice(0, cut);
	return span;
}

/**
 * The fixed set of values a parameter accepts, as written (namespaced constants
 * like "display.all", or quoted-string literals like "TTM"). Returns undefined
 * when no enumerated set is documented (free prose, or only a numeric range -
 * use parseNumericRange for that).
 */
export function parseAllowedValues(description: string): string[] | undefined {
	const span = valueSpan(description);
	if (span === undefined) return undefined;
	// A span that opens with an article describes a value in prose ("a string
	// representing …"), not an enumerated set.
	if (/^an?\s/i.test(span.trim())) return undefined;

	const consts = span.match(/[a-z_][a-z0-9_]*\.[a-z0-9_]+/gi);
	if (consts) return [...new Set(consts)];

	const quoted = [...span.matchAll(/(['"])([^'"]+)\1/g)].map((m) => m[2]);
	if (quoted.length) return [...new Set(quoted)];

	return undefined;
}

/**
 * The inclusive numeric range a parameter accepts ("from 0 to 255", "1-500",
 * "from 0 (opaque) to 100"). Returns undefined when no numeric range is
 * documented.
 */
export function parseNumericRange(
	description: string,
): { min: number; max: number } | undefined {
	const span = valueSpan(description);
	if (span === undefined) return undefined;
	const m =
		span.match(
			/from\s+(-?\d+(?:\.\d+)?)\s*(?:\([^)]*\)\s*)?to\s+(-?\d+(?:\.\d+)?)/i,
		) ||
		span.match(/(-?\d+(?:\.\d+)?)\s*[-–]\s*(-?\d+(?:\.\d+)?)/) ||
		span.match(/(-?\d+(?:\.\d+)?)\s+to\s+(-?\d+(?:\.\d+)?)/i);
	if (m) return { min: Number(m[1]), max: Number(m[2]) };
	return undefined;
}
