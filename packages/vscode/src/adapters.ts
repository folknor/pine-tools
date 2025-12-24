/**
 * Temporary adapters for using language-service features in VS Code extension.
 * TODO: Remove this once the extension is refactored to use the LSP client.
 */

import * as vscode from "vscode";
import { ParsedDocument } from "../../language-service/src/documents";
import {
	getHover as getHoverImpl,
	getSignatureHelp as getSignatureHelpImpl,
	getAllCompletions as getAllCompletionsImpl,
	getNamespaceCompletions as getNamespaceCompletionsImpl,
} from "../../language-service/src/features";
import {
	getParameterCompletions as getParameterCompletionsImpl,
	getConstantCompletions as getConstantCompletionsImpl,
} from "../../language-service/src/features/completions";
import type {
	CompletionItem as ServiceCompletionItem,
	CompletionItemKind as ServiceCompletionItemKind,
	InsertTextFormat as ServiceInsertTextFormat,
} from "../../language-service/src/types";

/**
 * Adapter for getHover - converts from symbol string to vscode.Hover
 */
export function getHoverInfo(symbol: string): vscode.Hover | undefined {
	// Create a minimal document just for lookup
	const doc = new ParsedDocument("temp://temp.pine", symbol, 1);
	const hover = getHoverImpl(doc, { line: 0, character: 0 });

	if (!hover) return undefined;

	return new vscode.Hover(new vscode.MarkdownString(hover.contents));
}

/**
 * Adapter for signature help - creates a provider
 */
export function createSignatureHelpProvider(): vscode.SignatureHelpProvider {
	return {
		provideSignatureHelp(document, position) {
			const doc = new ParsedDocument(
				document.uri.toString(),
				document.getText(),
				document.version,
			);

			const sig = getSignatureHelpImpl(doc, {
				line: position.line,
				character: position.character,
			});

			if (!sig) return undefined;

			const result = new vscode.SignatureHelp();
			result.signatures = sig.signatures.map((s) => {
				const sigInfo = new vscode.SignatureInformation(
					s.label,
					s.documentation
						? new vscode.MarkdownString(s.documentation)
						: undefined,
				);
				sigInfo.parameters = s.parameters.map(
					(p) =>
						new vscode.ParameterInformation(
							p.label,
							p.documentation
								? new vscode.MarkdownString(p.documentation)
								: undefined,
						),
				);
				return sigInfo;
			});
			result.activeSignature = sig.activeSignature;
			result.activeParameter = sig.activeParameter;

			return result;
		},
	};
}

/**
 * Convert service CompletionItemKind to vscode CompletionItemKind
 */
export function convertCompletionItemKind(
	kind: ServiceCompletionItemKind,
): vscode.CompletionItemKind {
	// The enum values match exactly, but TypeScript needs the cast
	return kind as unknown as vscode.CompletionItemKind;
}

/**
 * Convert service InsertTextFormat to vscode InsertTextFormat
 */
function convertInsertTextFormat(
	format?: ServiceInsertTextFormat,
): number | undefined {
	if (!format) return undefined;
	// Return the numeric value directly
	return format;
}

/**
 * Convert service CompletionItem to vscode.CompletionItem
 */
function convertCompletionItem(item: ServiceCompletionItem): vscode.CompletionItem {
	const vsItem = new vscode.CompletionItem(
		item.label,
		convertCompletionItemKind(item.kind),
	);

	if (item.detail) {
		vsItem.detail = item.detail;
	}

	if (item.documentation) {
		vsItem.documentation = new vscode.MarkdownString(item.documentation);
	}

	if (item.insertText) {
		vsItem.insertText = item.insertText;
	}

	// Note: VS Code CompletionItem doesn't have insertTextFormat in newer versions
	// The format is determined by the insertText type (string vs SnippetString)

	return vsItem;
}

/**
 * Wrapper for getAllCompletions
 */
export function getAllCompletions(): vscode.CompletionItem[] {
	return getAllCompletionsImpl().map(convertCompletionItem);
}

/**
 * Wrapper for getNamespaceCompletions
 */
export function getNamespaceCompletions(
	namespace: string,
): vscode.CompletionItem[] {
	return getNamespaceCompletionsImpl(namespace).map(convertCompletionItem);
}

/**
 * Wrapper for getParameterCompletions
 */
export function getParameterCompletions(
	functionName: string,
): vscode.CompletionItem[] {
	return getParameterCompletionsImpl(functionName).map(convertCompletionItem);
}

/**
 * Wrapper for getConstantCompletions
 */
export function getConstantCompletions(
	functionName: string,
	paramName: string,
): vscode.CompletionItem[] {
	return getConstantCompletionsImpl(functionName, paramName).map(
		convertCompletionItem,
	);
}
