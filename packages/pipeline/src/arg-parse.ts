/**
 * Parse a TradingView "Arguments" row into per-parameter {name, type} entries.
 *
 * A row's text is rendered as `name (type) description`. Most functions list one
 * argument per row, but VARIADIC functions pack several same-typed args into a
 * single row with an ellipsis, e.g.:
 *
 *   "number0, number1, ... (const int) A sequence of numbers..."   (math.max)
 *   "arg0, arg1, ... (series int) ..."                             (array.from)
 *
 * The single parenthesised type applies to every listed name. We capture the
 * name list before that first type, emit one entry per name, and drop the "..."
 * ellipsis. This is the only place the variadic arg types are exposed — TV does
 * not render per-arg type rows for them, so without this they stay "unknown".
 * see TODO #22
 */
export function parseArgTypeText(
	text: string,
): Array<{ name: string; type: string }> {
	const match = text.match(/^(.+?)\s*\(([^)]+)\)/);
	if (!match) return [];
	const type = match[2].trim();
	const out: Array<{ name: string; type: string }> = [];
	for (const raw of match[1].split(",")) {
		const name = raw.trim();
		if (name && name !== "...") out.push({ name, type });
	}
	return out;
}
