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
 * Best-effort by design (see TODO #25): referential / approximate defaults that
 * have no literal value ("the format value used by indicator()", "~50 lines",
 * "inherited from the chart's symbol", "the same as the number of chart bars")
 * return undefined rather than capturing prose. The "X by default" phrasing is
 * intentionally NOT handled — its few literal cases (ta.pivothigh's "'High'")
 * are ambiguous (the `high` built-in vs the label "High").
 */

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

	// Numeric literal.
	const num = rest.match(/^(-?\d+(?:\.\d+)?)/);
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

	return undefined;
}
