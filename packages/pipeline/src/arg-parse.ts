/**
 * Parse a TradingView "Arguments" row into per-parameter
 * {name, type, description} entries.
 *
 * A row's full text (the `__text tv-text` element's textContent) is rendered as
 * `name (type) description`. Most functions list one argument per row, but
 * VARIADIC functions pack several same-typed args into a single row with an
 * ellipsis, e.g.:
 *
 *   "number0, number1, ... (const int) A sequence of numbers..."   (math.max)
 *   "arg0, arg1, ... (series int) ..."                             (array.from)
 *
 * The single parenthesised type (and description) applies to every listed name.
 * We capture the name list before that first type, the description after it, and
 * emit one entry per name, dropping the "..." ellipsis. This is the only place
 * the variadic arg types are exposed — TV does not render per-arg type rows for
 * them, so without this they stay "unknown". see TODO #22 / #25
 *
 * Whitespace is collapsed first so the live scrape (parentElement.textContent)
 * and the offline mirror re-extraction (tag-stripped HTML) produce byte-
 * identical results regardless of source-HTML formatting.
 */
export function parseArgTypeText(
	text: string,
): Array<{ name: string; type: string; description: string }> {
	const collapsed = text.replace(/\s+/g, " ").trim();
	const match = collapsed.match(/^(.+?)\s*\(([^)]+)\)\s*(.*)$/);
	if (!match) return [];
	const type = match[2].trim();
	const description = match[3].trim();
	const out: Array<{ name: string; type: string; description: string }> = [];
	for (const raw of match[1].split(",")) {
		const name = raw.trim();
		if (name && name !== "...") out.push({ name, type, description });
	}
	return out;
}
