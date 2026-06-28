export interface OneBasedPosition {
	line: number;
	column: number;
}

/**
 * Build a mapper from the lexer's raw line convention to the line convention
 * users see in normal file views. The lexer intentionally follows TV and counts
 * `\r\r\n` as two breaks; emitted diagnostics collapse the stray CR back to the
 * displayed source line. see INV128 / G005
 */
export function createSourcePositionMapper(
	source: string,
): (position: OneBasedPosition) => OneBasedPosition {
	const rawToDisplay = buildRawToDisplayLineMap(source);
	return (position) => {
		const line = rawToDisplay[position.line] ?? position.line;
		return line === position.line ? position : { ...position, line };
	};
}

// NOTE: kept byte-for-byte in sync with the copy in scripts/lib/tv-positions.mjs
// (the TV-diff scripts can't import this TS module). Change both together.
export function buildRawToDisplayLineMap(source: string): number[] {
	const rawToDisplay = [0, 1];
	let rawLine = 1;
	let displayLine = 1;
	let i = 0;

	while (i < source.length) {
		const ch = source[i];
		if (ch === "\r") {
			let runEnd = i;
			while (source[runEnd] === "\r") runEnd++;

			if (source[runEnd] === "\n") {
				const crCount = runEnd - i;
				for (let n = 0; n < crCount - 1; n++) {
					rawLine++;
					rawToDisplay[rawLine] = displayLine;
				}
				rawLine++;
				displayLine++;
				rawToDisplay[rawLine] = displayLine;
				i = runEnd + 1;
			} else {
				while (i < runEnd) {
					rawLine++;
					displayLine++;
					rawToDisplay[rawLine] = displayLine;
					i++;
				}
			}
			continue;
		}

		if (ch === "\n") {
			rawLine++;
			displayLine++;
			rawToDisplay[rawLine] = displayLine;
		}
		i++;
	}

	return rawToDisplay;
}
