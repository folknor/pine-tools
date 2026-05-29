/**
 * Extract a parameter's default VALUE from its TradingView description prose.
 *
 * TV documents defaults inline, e.g. "The default is alert.freq_once_per_bar.",
 * "The default value is false.", "The default is 'na'.". There is no structured
 * default field, so we parse the value token that follows the "the default
 * (value) is" phrase. The returned string is the Pine default EXPRESSION as
 * written (e.g. "0", "true", "na", "alert.freq_once_per_bar", "" for an empty
 * string) — not a typed value.
 *
 * Dynamic / inherited defaults that have no literal value are represented by a
 * MAGIC SENTINEL. A default is a sentinel iff it is in MAGIC_DEFAULTS or starts
 * with "ARG:" — NOT merely by being uppercase, since some literal Pine values
 * are uppercase too (e.g. strategy.close_entries_rule defaults to the literal
 * "FIFO"). Everything else is a literal Pine expression (`na`, `true`, `0`,
 * `alert.freq_once_per_bar`, `"FIFO"`, `""`). See MAGIC_DEFAULTS / TODO #25:
 *   CHART_SYMBOL    inherited from the chart symbol (e.g. its precision)
 *   CHART_BARS      the number of chart bars available
 *   SCRIPT_FORMAT   the format declared on indicator()/strategy()
 *   SCRIPT_PRECISION the precision declared on indicator()/strategy()
 *   SOURCE_LENGTH   the length of the source string
 *   ARG:<name>      the value of a sibling argument (e.g. ARG:start_column)
 *
 * The "X by default" phrasing is intentionally NOT handled — its few literal
 * cases (ta.pivothigh's "'High'") are ambiguous (the `high` built-in vs the
 * label "High"). Anything still unrecognized returns undefined.
 */

/** Magic sentinels for dynamic/inherited defaults (no literal value). */
export const MAGIC_DEFAULTS = [
	"CHART_SYMBOL",
	"CHART_BARS",
	"SCRIPT_FORMAT",
	"SCRIPT_PRECISION",
	"SOURCE_LENGTH",
] as const;

const WORDNUM: Record<string, string> = {
	zero: "0",
	one: "1",
	two: "2",
	three: "3",
	four: "4",
	five: "5",
};

// English words that, taken as the token after "the default is", signal prose
// rather than a literal value ("the argument used for…", "same as…").
const STOP = new Set([
	"the",
	"an",
	"a",
	"same",
	"equivalent",
	"inherited",
	"approximately",
	"about",
	"set",
	"based",
	"derived",
	"calculated",
	"that",
	"this",
	"value",
	"it",
]);

export function parseDefault(description: string): string | undefined {
	const m = description.match(/the default(?:\s+value)?\s+is\s+(.+)/is);
	if (!m) return undefined;
	const rest = m[1].trimStart();

	// Quoted literal — match up to the SAME closing quote so embedded other
	// quotes survive (e.g. "yyyy-MM-dd'T'HH:mm:ssZ").
	const q = rest.match(/^(['"`])(.*?)\1/);
	if (q) return q[2];

	// Namespaced constant / dotted identifier (alert.freq_once_per_bar).
	const id = rest.match(/^([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)+)/);
	if (id) return id[1];

	// Numeric literal (tolerate a leading "~", e.g. "~50 lines" -> "50").
	const num = rest.match(/^~?\s*(-?\d+(?:\.\d+)?)/);
	if (num) return num[1];

	// Empty-string phrasings ("an empty string", "empty string").
	if (/^an?\s+empty\s+string/i.test(rest) || /^empty\s+string/i.test(rest)) {
		return "";
	}

	// "no color" is Pine's unset-color default, i.e. na.
	if (/^no\s+color/i.test(rest)) return "na";

	const w = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
	if (w) {
		const lw = w[1].toLowerCase();
		if (lw === "true" || lw === "false" || lw === "na") return lw;
		if (WORDNUM[lw] !== undefined) return WORDNUM[lw];
		// A lone value token terminated by "." or ")" (e.g. "close.") — but not an
		// English stopword that begins a referential phrase.
		const after = rest.slice(w[1].length).trimStart();
		if (!STOP.has(lw) && /^[.)]/.test(after)) return w[1];
	}

	// Dynamic / inherited default -> magic sentinel (see TODO #25).
	return parseDynamicDefault(rest);
}

// Map the recognized referential phrasings to their magic sentinel. Returns
// undefined for anything still unrecognized (genuinely free prose).
function parseDynamicDefault(rest: string): string | undefined {
	if (/the chart'?s symbol/i.test(rest)) return "CHART_SYMBOL";
	if (/number of chart bars/i.test(rest)) return "CHART_BARS";
	if (/the format value used by the (?:indicator|strategy)/i.test(rest)) {
		return "SCRIPT_FORMAT";
	}
	if (/the precision value used by the (?:indicator|strategy)/i.test(rest)) {
		return "SCRIPT_PRECISION";
	}
	const arg = rest.match(/the argument used for (\w+)/i);
	if (arg) return `ARG:${arg[1]}`;
	if (/the length of the source string/i.test(rest)) return "SOURCE_LENGTH";
	// Anything else (e.g. ta.vwap.anchor's "equivalent to passing
	// timeframe.change() with \"1D\" as its argument" — too awkward to
	// reconstruct faithfully) is left undefined rather than captured wrong.
	return undefined;
}
