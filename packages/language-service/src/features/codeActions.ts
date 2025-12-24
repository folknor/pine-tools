/**
 * Code actions provide quick fixes for diagnostics and refactorings.
 */

import type { ParsedDocument } from "../documents/ParsedDocument";
import {
	type CodeAction,
	CodeActionKind,
	type Diagnostic,
	type Range,
} from "../types";

export interface CodeActionContext {
	diagnostics: Diagnostic[];
}

/**
 * Get code actions for a document at a given range.
 * Matches diagnostics to available quick fixes.
 */
export function getCodeActions(
	doc: ParsedDocument,
	_range: Range,
	context: CodeActionContext,
): CodeAction[] {
	const actions: CodeAction[] = [];

	for (const diagnostic of context.diagnostics) {
		const fixes = getQuickFixesForDiagnostic(doc, diagnostic);
		actions.push(...fixes);
	}

	return actions;
}

/**
 * Generate quick fixes for a specific diagnostic.
 */
function getQuickFixesForDiagnostic(
	doc: ParsedDocument,
	diagnostic: Diagnostic,
): CodeAction[] {
	const fixes: CodeAction[] = [];
	const msg = diagnostic.message;

	// Fix: Add //@version=6 when missing
	if (msg.includes("Recommend using //@version=6")) {
		fixes.push({
			title: "Add //@version=6",
			kind: CodeActionKind.QuickFix,
			diagnostics: [diagnostic],
			isPreferred: true,
			edit: {
				changes: {
					[doc.uri]: [
						{
							range: {
								start: { line: 0, character: 0 },
								end: { line: 0, character: 0 },
							},
							newText: "//@version=6\n",
						},
					],
				},
			},
		});
	}

	// Fix: plotshape shape= → style=
	if (
		msg.includes('Invalid parameter "shape"') &&
		msg.includes('Did you mean "style"')
	) {
		fixes.push({
			title: 'Change "shape" to "style"',
			kind: CodeActionKind.QuickFix,
			diagnostics: [diagnostic],
			isPreferred: true,
			edit: {
				changes: {
					[doc.uri]: [
						{
							range: diagnostic.range,
							newText: "style",
						},
					],
				},
			},
		});
	}

	// Fix: plotchar shape= → char=
	if (
		msg.includes('Invalid parameter "shape"') &&
		msg.includes('Did you mean "char"')
	) {
		fixes.push({
			title: 'Change "shape" to "char"',
			kind: CodeActionKind.QuickFix,
			diagnostics: [diagnostic],
			isPreferred: true,
			edit: {
				changes: {
					[doc.uri]: [
						{
							range: diagnostic.range,
							newText: "char",
						},
					],
				},
			},
		});
	}

	// Fix: Wrap time() with not na()
	if (
		msg.includes("Wrap session checks as: not na(time(") ||
		msg.includes("bool-NA pitfalls")
	) {
		// For the time() boolean pitfall, we need to find the full time() call
		const text = doc.content;
		const timeMatch = /time\(timeframe\.period,\s*\w+\)/g;
		let match: RegExpExecArray | null;

		match = timeMatch.exec(text);
		while (match !== null) {
			const pos = doc.positionAt(match.index);
			if (pos.line === diagnostic.range.start.line) {
				const endPos = doc.positionAt(match.index + match[0].length);
				fixes.push({
					title: "Wrap with not na(...)",
					kind: CodeActionKind.QuickFix,
					diagnostics: [diagnostic],
					isPreferred: true,
					edit: {
						changes: {
							[doc.uri]: [
								{
									range: {
										start: pos,
										end: endPos,
									},
									newText: `not na(${match[0]})`,
								},
							],
						},
					},
				});
				break;
			}
			match = timeMatch.exec(text);
		}
	}

	return fixes;
}
