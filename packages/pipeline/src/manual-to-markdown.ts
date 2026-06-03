/**
 * Pine Script Manual HTML -> Markdown converter.
 *
 * The Manual (https://www.tradingview.com/pine-script-docs/) is a static Astro
 * site. Each page is server-rendered, clean semantic HTML, with the body inside
 * `<div id="slot-container">`. The bulk converts trivially with Turndown + the
 * GFM table plugin; only a few TradingView-specific shapes need custom rules:
 *
 *   1. `div.pine-colorizer`  - a Pine snippet whose textContent IS the code.
 *   2. `div.expressive-code` - a non-Pine snippet; language in `pre[data-language]`,
 *      one source line per `.ec-line`.
 *   3. `hN.md-heading`       - the heading text is wrapped in a self-link plus an
 *      anchor-link SVG icon we don't want in the output.
 *   4. `div.tv-informer`     - a Tip/Note/Notice callout box. The label lives in a
 *      `.tv-informer-header` span (TV has no per-type class); re-emitted as a
 *      GitHub-flavored alert (`> [!TIP]` ...) so downstream renderers style it.
 *   5. `<img>`               - manual screenshots (hashed `_astro` build URLs, alt
 *      text is always "image" or a constant name that duplicates adjacent prose);
 *      dropped entirely - zero text value for a Markdown/JSON consumer.
 *
 * This module is offline and deterministic: it takes raw page HTML (from the
 * `.cache/manual` mirror) and returns Markdown. No network, no DOM globals -
 * Turndown v7 bundles its own DOM (domino), so it runs under plain Node.
 */

import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";

const SITE_ORIGIN = "https://www.tradingview.com";

/**
 * Map a manual callout's header label (`.tv-informer-header` text, lowercased)
 * to a GitHub-flavored alert keyword. GFM supports only these five keywords, so
 * TV's "Notice" (an emphatic clarification, distinct from plain "Note") folds
 * into IMPORTANT to keep it visually distinct from NOTE. Warning/Caution/Danger
 * /Important don't occur in the v6 manual today but are mapped for robustness.
 */
const ALERT_BY_LABEL: Record<string, string> = {
	tip: "TIP",
	note: "NOTE",
	notice: "IMPORTANT",
	important: "IMPORTANT",
	warning: "WARNING",
	caution: "CAUTION",
	danger: "CAUTION",
};

/** Extract the inner HTML of the page's content node (`#slot-container`). */
export function extractContentHtml(pageHtml: string): string {
	const startMarker = 'id="slot-container"';
	const startIdx = pageHtml.indexOf(startMarker);
	if (startIdx === -1) {
		throw new Error("Could not find #slot-container in page HTML");
	}
	// Skip to the end of the opening <div ...> tag.
	const contentStart = pageHtml.indexOf(">", startIdx) + 1;

	// The prev/next pagination card is the next sibling after slot-container.
	const endMarker = '<div class="pagination-buttons';
	const endIdx = pageHtml.indexOf(endMarker, contentStart);
	const contentEnd = endIdx === -1 ? pageHtml.length : endIdx;

	// Drop slot-container's own trailing </div>.
	const inner = pageHtml
		.slice(contentStart, contentEnd)
		.trimEnd()
		.replace(/<\/div>\s*$/, "");

	// Pine snippets render as `<div class="pine-colorizer">` with literal
	// newlines in their text. Turndown collapses whitespace in non-<pre>
	// elements before our rule runs, so re-tag them as <pre> (which Turndown
	// treats as preformatted) to preserve the line breaks. These divs never
	// contain nested elements, so the non-greedy match is safe.
	return inner.replace(
		/<div class="pine-colorizer[^"]*">([\s\S]*?)<\/div>/g,
		(_m, code) => `<pre data-pine-colorizer="1">${code}</pre>`,
	);
}

function hasClass(node: unknown, className: string): boolean {
	const el = node as { getAttribute?: (name: string) => string | null };
	if (typeof el.getAttribute !== "function") return false;
	const cls = el.getAttribute("class") ?? "";
	return new RegExp(`(^|\\s)${className}(\\s|$)`).test(cls);
}

function buildTurndown(): TurndownService {
	const td = new TurndownService({
		headingStyle: "atx",
		codeBlockStyle: "fenced",
		bulletListMarker: "-",
		emDelimiter: "_",
		hr: "---",
	});
	td.use(gfm);

	// Anything non-content that can sneak inside slot-container.
	td.remove(["script", "style", "link", "noscript"]);

	// A Pine code snippet: the element's text is the verbatim source.
	// `extractContentHtml` re-tags `div.pine-colorizer` to this <pre> so the
	// line breaks survive Turndown's whitespace collapsing.
	td.addRule("pineColorizer", {
		filter: (node) =>
			node.nodeName === "PRE" &&
			(node as unknown as Element).getAttribute("data-pine-colorizer") === "1",
		replacement: (_content, node) => {
			const code = (node.textContent ?? "").replace(/^\n+|\n+$/g, "");
			return `\n\n\`\`\`pine\n${code}\n\`\`\`\n\n`;
		},
	});

	// An Expressive Code block: language on <pre data-language>, lines in .ec-line.
	td.addRule("expressiveCode", {
		filter: (node) =>
			node.nodeName === "DIV" && hasClass(node, "expressive-code"),
		replacement: (_content, node) => {
			const el = node as unknown as Element;
			const pre = el.querySelector("pre");
			const lang = pre?.getAttribute("data-language") ?? "";
			const fenceLang = lang === "text" || lang === "plaintext" ? "" : lang;
			const lines = Array.from(el.querySelectorAll(".ec-line")).map(
				(line) => line.textContent ?? "",
			);
			const code =
				lines.length > 0
					? lines.join("\n")
					: (pre?.textContent ?? "").replace(/^\n+|\n+$/g, "");
			return `\n\n\`\`\`${fenceLang}\n${code}\n\`\`\`\n\n`;
		},
	});

	// A Tip/Note/Notice callout box -> GitHub-flavored alert. The label is read
	// from the `.tv-informer-header` span (stripped from the body by its own rule
	// below); the converted body is re-indented as a `>`-prefixed blockquote.
	td.addRule("tvInformer", {
		// The wrapper is an `<aside class="tv-informer not-content">` (not a div),
		// so match on the class alone rather than the tag name.
		filter: (node) => hasClass(node, "tv-informer"),
		replacement: (content, node) => {
			const header = (node as unknown as Element).querySelector(
				".tv-informer-header",
			);
			const label = (header?.textContent ?? "").trim().toLowerCase();
			const type = ALERT_BY_LABEL[label] ?? "NOTE";
			const body = content
				.replace(/^\n+|\n+$/g, "")
				// Collapse runs of blank/whitespace-only lines (left by dropped images
				// or `<br>` separators) to a single gap before quoting.
				.replace(/\n[ \t]*(?:\n[ \t]*)+/g, "\n\n")
				.replace(/^/gm, "> ")
				.replace(/^>[ \t]*$/gm, ">"); // tidy blank continuation lines
			return `\n\n> [!${type}]\n${body}\n\n`;
		},
	});

	// The callout's icon SVG and header label carry no body text - the alert rule
	// reads the label off the node directly, so strip both from the content.
	td.addRule("tvInformerChrome", {
		filter: (node) =>
			hasClass(node, "tv-informer-icon") ||
			hasClass(node, "tv-informer-header"),
		replacement: () => "",
	});

	// Drop every image. Manual screenshots use hashed `_astro` build URLs with no
	// stable identity and useless alt text; they're pure noise for a text/JSON
	// consumer. No image is link-wrapped, so this leaves no empty `[](...)`.
	td.addRule("dropImages", {
		filter: "img",
		replacement: () => "",
	});

	// Drop the anchor-link icon TradingView injects into every heading.
	td.addRule("headingIconLink", {
		filter: (node) => node.nodeName === "SPAN" && hasClass(node, "icon-link"),
		replacement: () => "",
	});

	// Unwrap the self-link that wraps heading text (keep the text/inline markup).
	td.addRule("headingSelfLink", {
		filter: (node) =>
			node.nodeName === "A" &&
			!!node.parentNode &&
			/^H[1-6]$/.test(node.parentNode.nodeName),
		replacement: (content) => content,
	});

	// Preserve TradingView's real heading anchor as a `{#id}` attribute. The id
	// is the index key and the page's actual URL fragment (e.g.
	// language/operators#the-ternary-operator), and TV's anchors don't always
	// match a naive slug - so we keep the authoritative one, never re-slugify.
	td.addRule("manualHeading", {
		filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
		replacement: (content, node) => {
			const level = Number(node.nodeName.charAt(1));
			const id = (node as unknown as Element).getAttribute("id");
			const anchor = id ? ` {#${id}}` : "";
			return `\n\n${"#".repeat(level)} ${content.trim()}${anchor}\n\n`;
		},
	});

	return td;
}

const turndown = buildTurndown();

export interface ManualPageMeta {
	title: string;
	url: string;
	section: string;
}

/** Convert a full Manual page's HTML into a Markdown document with frontmatter. */
export function convertManualPage(
	pageHtml: string,
	meta: ManualPageMeta,
): string {
	const contentHtml = extractContentHtml(pageHtml);
	let markdown = turndown.turndown(contentHtml);

	// Rewrite root-relative links/images (e.g. /pine-script-docs/...,
	// /pine-script-reference/...) to absolute URLs so they resolve standalone.
	markdown = markdown.replace(/\]\(\/(?!\/)/g, `](${SITE_ORIGIN}/`);

	// De-gunk Reference Manual anchors: TV's href template percent-encodes the
	// `{dot}`/`{colon}`/`{question}` placeholder tokens, but the page's real
	// element id uses literal punctuation (`#fun_ta.ema`, `#op_?:`, `#op_[]`).
	// Decoding both makes the link resolve AND exposes the bare symbol that
	// pine-data / `po lookup` already knows (strip the `fun_`/`var_`/`const_`/
	// `type_`/`op_`/`an_` kind prefix to get the lookup key).
	// Migration guides link to older-version reference manuals too (v3-v6).
	markdown = markdown.replace(
		/(\(https:\/\/www\.tradingview\.com\/pine-script-reference\/v\d+\/#)([^)\s]*)\)/g,
		(_m, base, fragment) => `${base}${decodeReferenceAnchor(fragment)})`,
	);

	// TV injects zero-width spaces as line-break hints inside code-bearing
	// headings/prose; they're invisible cruft in Markdown and can break
	// heading-text matching downstream.
	markdown = markdown.replace(/\u200b/g, "");

	// Collapse runs of 3+ blank lines the custom code rules can introduce.
	markdown = markdown.replace(/\n{3,}/g, "\n\n").trim();

	const frontmatter = [
		"---",
		`title: ${yamlString(meta.title)}`,
		`source: ${meta.url}`,
		`section: ${yamlString(meta.section)}`,
		"---",
	].join("\n");

	return `${frontmatter}\n\n${markdown}\n`;
}

/**
 * Decode a Reference Manual URL fragment (e.g. `fun_ta%7Bdot%7Dema`,
 * `op_%5B%5D`) into TradingView's literal anchor id (`fun_ta.ema`, `op_[]`) -
 * which is also a clean, parseable symbol once the kind prefix is stripped.
 */
function decodeReferenceAnchor(fragment: string): string {
	return decodeURIComponent(fragment)
		.replace(/\{dot\}/g, ".")
		.replace(/\{colon\}/g, ":")
		.replace(/\{question\}/g, "?");
}

function yamlString(value: string): string {
	// Quote when the value could be misread as YAML; escape embedded quotes.
	if (/[:#"'[\]{}&*!|>%@`]/.test(value) || /^\s|\s$/.test(value)) {
		return `"${value.replace(/"/g, '\\"')}"`;
	}
	return value;
}
