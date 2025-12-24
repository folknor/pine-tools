import type { ParsedDocument } from "../documents/ParsedDocument";
import type { HoverInfo, Position } from "../types";
import { getSymbolInfo } from "./lookup";

export interface HoverOptions {
	/** Whether to show full documentation or just a summary */
	mode?: "full" | "summary";
}

/**
 * Get hover information for a symbol at a position.
 */
export function getHover(
	doc: ParsedDocument,
	position: Position,
	options: HoverOptions = {},
): HoverInfo | null {
	const symbol = doc.getWordAtPosition(position);
	if (!symbol) return null;

	const info = getSymbolInfo(symbol);
	if (!info) return null;

	const mode = options.mode ?? "full";

	// Build markdown content
	const parts: string[] = [];

	// Header
	parts.push(`### ${symbol}`);

	// Syntax (for functions)
	if (info.syntax) {
		parts.push(`\`\`\`pine\n${info.syntax}\n\`\`\``);
	}

	// Description
	if (info.description) {
		const desc =
			mode === "summary"
				? `${info.description.split(".")[0]}.`
				: info.description;
		parts.push(desc);
	}

	// Return type or type
	if (info.returns) {
		parts.push(`**Returns:** \`${info.returns}\``);
	} else if (info.type) {
		parts.push(`**Type:** \`${info.type}\``);
	}

	// Parameters (for functions, in full mode)
	if (mode === "full" && info.parameters && info.parameters.length > 0) {
		parts.push("**Parameters:**");
		for (const param of info.parameters) {
			if (param.documentation) {
				parts.push(`- \`${param.label}\`: ${param.documentation}`);
			} else {
				parts.push(`- \`${param.label}\``);
			}
		}
	}

	// Namespace
	if (info.namespace) {
		parts.push(`_Namespace: ${info.namespace}_`);
	}

	// Deprecated warning
	if (info.deprecated) {
		parts.push("⚠️ **Deprecated**");
	}

	return {
		contents: parts.join("\n\n"),
	};
}
