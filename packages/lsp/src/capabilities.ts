import {
	CodeActionKind,
	SemanticTokensRegistrationType,
	type ServerCapabilities,
	TextDocumentSyncKind,
} from "vscode-languageserver/node";
import { PineLanguageService } from "../../language-service/src";

/**
 * Returns the server capabilities for the Pine Script LSP.
 */
export function getCapabilities(): ServerCapabilities {
	return {
		textDocumentSync: {
			openClose: true,
			change: TextDocumentSyncKind.Full,
		},
		completionProvider: {
			triggerCharacters: [".", "="],
			resolveProvider: false,
		},
		hoverProvider: true,
		signatureHelpProvider: {
			triggerCharacters: ["(", ","],
		},
		documentFormattingProvider: true,
		documentSymbolProvider: true,
		definitionProvider: true,
		referencesProvider: true,
		renameProvider: {
			prepareProvider: true,
		},
		codeActionProvider: {
			codeActionKinds: [CodeActionKind.QuickFix],
		},
		inlayHintProvider: true,
		foldingRangeProvider: true,
		semanticTokensProvider: {
			legend: PineLanguageService.getSemanticTokensLegend(),
			full: true,
		},
	};
}
