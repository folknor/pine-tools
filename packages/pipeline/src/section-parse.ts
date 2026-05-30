/**
 * Parse the prose sub-sections of a TradingView reference item that the
 * structured catalog otherwise drops: the "Returns" sentence, the "Remarks"
 * caveats, and the "See also" cross-references.
 *
 * A reference item renders as a flat sibling list inside
 * `.tv-pine-reference-item__content`: a sequence of
 * `<div class="...__sub-header">LABEL</div>` markers each followed by the
 * section body (one or more `...__text tv-text` blocks, or a `...__see-also`
 * block for cross-references). We slice the body between a header and the next
 * header, so e.g. the "Returns" prose never bleeds into "Remarks".
 *
 * This runs offline over the `.cache/dom` mirror (see reextract-sections.ts),
 * the same way overloadArgs are re-derived — TV's rendered HTML is the source,
 * never the network. Whitespace is collapsed (spaces/tabs runs → one space)
 * while paragraph and `<br>` breaks become newlines, so the output is stable
 * regardless of source-HTML indentation.
 *
 * Note: `returns` in the catalog already holds the return *type* (parsed from
 * the `→` in the syntax line). The prose sentence captured here is a SEPARATE
 * `returnsDescription` field, so the two never clash.
 */

export interface ReferenceSections {
	returnsDescription?: string;
	remarks?: string;
	seeAlso?: string[];
}

// Operator symbols (?:, [], +=, ==, …) collapse to the same string under the
// generic filesystem-safe regex (every non-alphanumeric char → "_"), so they
// collide on disk for cache keys and mirror dirs. Encode each non-alphanumeric
// char as its hex code instead, giving every symbol a unique, stable slug.
// `?:` → "_3f_3a", `[]` → "_5b_5d", `+=` → "_2b_3d", `+` → "_2b".
export function operatorSlug(symbol: string): string {
	return symbol.replace(
		/[^a-zA-Z0-9]/g,
		(c) => `_${c.charCodeAt(0).toString(16)}`,
	);
}

function decodeEntities(s: string): string {
	return s
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/&nbsp;/g, " ")
		.replace(/&amp;/g, "&");
}

function stripTags(s: string): string {
	return s.replace(/<[^>]+>/g, "");
}

// Collapse runs of spaces/tabs to a single space but preserve paragraph breaks.
// Block-level boundaries (</p>, <br>) are turned into newlines BEFORE tags are
// stripped so multi-paragraph Remarks don't run together.
function normalizeProse(htmlSlice: string): string {
	const withBreaks = htmlSlice
		.replace(/<\/p>/gi, "\n")
		.replace(/<br\s*\/?>/gi, "\n");
	const text = decodeEntities(stripTags(withBreaks));
	return text
		.replace(/[ \t]+/g, " ")
		.replace(/ *\n */g, "\n")
		.replace(/\n{3,}/g, "\n\n")
		.trim();
}

const SUB_HEADER_RE =
	/<div class="tv-pine-reference-item__sub-header[^"]*">([\s\S]*?)<\/div>/g;

// Return the HTML between the sub-header whose label matches `label` and the
// next sub-header (or end of input). null if that section is absent.
function sliceSection(html: string, label: string): string | null {
	SUB_HEADER_RE.lastIndex = 0;
	let m: RegExpExecArray | null;
	const headers: Array<{ label: string; end: number }> = [];
	while ((m = SUB_HEADER_RE.exec(html))) {
		headers.push({
			label: stripTags(m[1]).trim().toLowerCase(),
			end: m.index + m[0].length,
		});
	}
	for (let i = 0; i < headers.length; i++) {
		if (headers[i].label !== label.toLowerCase()) continue;
		const start = headers[i].end;
		const stop = i + 1 < headers.length ? findHeaderStart(html, start) : html.length;
		return html.slice(start, stop);
	}
	return null;
}

// The end offsets in `headers` point past a header div; to bound a section we
// need the START of the following header. Re-find it from `from`.
function findHeaderStart(html: string, from: number): number {
	const idx = html.indexOf(
		'<div class="tv-pine-reference-item__sub-header',
		from,
	);
	return idx === -1 ? html.length : idx;
}

// All `__text tv-text` blocks inside a section slice, joined as paragraphs.
// Arg-type rows (which carry a `__arg-type` span) are never part of Returns /
// Remarks, but we skip them defensively.
function proseFromSlice(slice: string): string {
	const re =
		/<div class="tv-pine-reference-item__text tv-text">([\s\S]*?)<\/div>/g;
	const parts: string[] = [];
	let m: RegExpExecArray | null;
	while ((m = re.exec(slice))) {
		if (m[1].includes("tv-pine-reference-item__arg-type")) continue;
		const prose = normalizeProse(m[1]);
		if (prose) parts.push(prose);
	}
	return parts.join("\n");
}

export function extractSections(html: string): ReferenceSections {
	const out: ReferenceSections = {};

	const returnsSlice = sliceSection(html, "Returns");
	if (returnsSlice) {
		const prose = proseFromSlice(returnsSlice);
		if (prose) out.returnsDescription = prose;
	}

	const remarksSlice = sliceSection(html, "Remarks");
	if (remarksSlice) {
		const prose = proseFromSlice(remarksSlice);
		if (prose) out.remarks = prose;
	}

	const seeAlsoSlice = sliceSection(html, "See also");
	if (seeAlsoSlice) {
		const names: string[] = [];
		const re = /<a [^>]*>([\s\S]*?)<\/a>/g;
		let m: RegExpExecArray | null;
		while ((m = re.exec(seeAlsoSlice))) {
			// Cross-ref labels render as "array.max()" / "na" — drop the trailing
			// "()" so the value is the bare symbol consumers can look up.
			const name = decodeEntities(stripTags(m[1]))
				.trim()
				.replace(/\(\)$/, "");
			if (name) names.push(name);
		}
		if (names.length) out.seeAlso = names;
	}

	return out;
}
