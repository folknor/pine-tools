// Map TradingView's logical-line positions back to physical (line, col).
//
// TV reports diagnostics on wrapped statements against the LOGICAL line:
// anchored at the statement's first physical line, with the column
// accumulated over a join of the continuation lines. The join rule
// (probed 2026-06-04, see gotchas/G005):
//
//   - line comments are stripped; the whitespace before them is KEPT
//   - continuation lines have their leading whitespace stripped
//   - the parts are joined with a single space
//
// Example (fixtures/24ca62d3…): `ta.crossover` physically at 131:14
// is reported by TV at 128:103 = 41 (line 128 code) + 1 (join space)
// + 29 + 1 + 29 + 1 (lines 129/130) + 13 leading spaces stripped.
//
// This module inverts that: walk forward from the reported line while
// the column overflows the line's contributed length. Used by the
// TV-diff scripts only - our own linter always reports physical
// positions. see TODO #38.

// The code part of a line: everything up to a `//` comment that is not
// inside a string literal, INCLUDING the whitespace before the comment.
function codePartLength(line) {
	let quote = null;
	for (let i = 0; i < line.length; i++) {
		const ch = line[i];
		if (quote) {
			if (ch === "\\") i++;
			else if (ch === quote) quote = null;
		} else if (ch === '"' || ch === "'") {
			quote = ch;
		} else if (ch === "/" && line[i + 1] === "/") {
			return i;
		}
	}
	return line.length;
}

function leadingWhitespaceLength(line) {
	// u00a0 (nbsp): TV accepts nbsp indentation (see plan/31).
	const m = line.match(/^[ \t\u00a0]*/);
	return m ? m[0].length : 0;
}

/**
 * Map one TV-reported (line, col) - both 1-based - to the physical
 * position, given the source's physical lines. Returns the input
 * unchanged when it does not overflow (the common, unwrapped case) or
 * when the walk hits anything that breaks the continuation-line shape
 * (unindented next line, empty line, column landing in stripped
 * whitespace) - mapping bails rather than guessing.
 */
export function mapTvPositionToPhysical(lines, line, col) {
	const original = { line, col };
	let li = line - 1;
	if (li < 0 || li >= lines.length) return original;
	// First physical line contributes its full code part (indent kept).
	let contributed = codePartLength(lines[li]);
	let c = col;
	while (c > contributed) {
		c -= contributed + 1; // +1 for the join space
		li++;
		if (c < 1) return original; // pointed at the join space itself
		if (li >= lines.length) return original;
		const next = lines[li];
		const indent = leadingWhitespaceLength(next);
		// A continuation line must be indented and non-empty.
		if (indent === 0 || indent === next.length) return original;
		contributed = codePartLength(next) - indent;
		if (contributed <= 0) return original; // comment-only line
		if (c <= contributed) {
			return { line: li + 1, col: indent + c };
		}
	}
	return original;
}

/**
 * Remap an array of {line, col, ...} TV diagnostics against the source
 * text. Non-overflowing positions pass through untouched. The split
 * matches the lexer's line convention: breaks at \r\n, lone \r, and \n
 * (so \r\r\n is two breaks) - see G005.
 */
export function remapTvDiagnostics(source, diags) {
	const lines = source.split(/\r\n|\r|\n/);
	return diags.map((d) => {
		const mapped = mapTvPositionToPhysical(lines, d.line, d.col);
		if (mapped.line === d.line && mapped.col === d.col) return d;
		return { ...d, line: mapped.line, col: mapped.col, tvLogical: { line: d.line, col: d.col } };
	});
}
