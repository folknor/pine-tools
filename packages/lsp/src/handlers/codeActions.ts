/**
 * Code Actions handler.
 * Handles textDocument/codeAction requests.
 */

import type {
	CodeAction,
	CodeActionParams,
	Connection,
} from "vscode-languageserver/node";
import type { PineLanguageService } from "../../../language-service/src";
import { convertCodeAction, convertLSPDiagnostic } from "../converters";

/**
 * Setup code action handler.
 */
export function setupCodeActionsHandler(
	connection: Connection,
	languageService: PineLanguageService,
): void {
	connection.onCodeAction((params: CodeActionParams): CodeAction[] => {
		const context = {
			diagnostics: params.context.diagnostics.map(convertLSPDiagnostic),
		};

		const actions = languageService.getCodeActions(
			params.textDocument.uri,
			params.range,
			context,
		);

		return actions.map(convertCodeAction);
	});
}
