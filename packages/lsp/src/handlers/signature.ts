/**
 * Signature help handler.
 * Provides parameter hints during function calls.
 */

import {
	Connection,
	SignatureHelpParams,
} from "vscode-languageserver/node";
import { PineLanguageService } from "../../../language-service/src";
import { convertSignatureHelp } from "../converters";

/**
 * Setup signature help handler.
 */
export function setupSignatureHandler(
	connection: Connection,
	languageService: PineLanguageService,
): void {
	connection.onSignatureHelp((params: SignatureHelpParams) => {
		const signatureHelp = languageService.getSignatureHelp(
			params.textDocument.uri,
			params.position,
		);

		if (!signatureHelp) return null;

		return convertSignatureHelp(signatureHelp);
	});
}
