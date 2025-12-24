/**
 * Inlay Hints handler.
 * Handles textDocument/inlayHint requests.
 */

import type {
	Connection,
	InlayHint,
	InlayHintParams,
} from "vscode-languageserver/node";
import type { PineLanguageService } from "../../../language-service/src";
import { convertInlayHint } from "../converters";

/**
 * Setup inlay hints handler.
 */
export function setupInlayHintsHandler(
	connection: Connection,
	languageService: PineLanguageService,
): void {
	connection.languages.inlayHint.on(
		(params: InlayHintParams): InlayHint[] | null => {
			const hints = languageService.getInlayHints(
				params.textDocument.uri,
				params.range,
			);

			if (hints.length === 0) return null;

			return hints.map(convertInlayHint);
		},
	);
}
