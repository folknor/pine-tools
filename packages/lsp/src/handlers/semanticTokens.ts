/**
 * Semantic Tokens handler.
 * Handles textDocument/semanticTokens/full requests.
 */

import type {
	Connection,
	SemanticTokens,
	SemanticTokensParams,
} from "vscode-languageserver/node";
import type { PineLanguageService } from "../../../language-service/src";

/**
 * Setup semantic tokens handler.
 */
export function setupSemanticTokensHandler(
	connection: Connection,
	languageService: PineLanguageService,
): void {
	connection.languages.semanticTokens.on(
		(params: SemanticTokensParams): SemanticTokens => {
			const result = languageService.getSemanticTokens(params.textDocument.uri);
			return {
				data: result.data,
			};
		},
	);
}
