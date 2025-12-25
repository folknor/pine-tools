// Main service export

// Document classes
export { DocumentManager, ParsedDocument } from "./documents";
export {
	type CodeActionContext,
	getCodeActions,
} from "./features/codeActions";
// Feature implementations (for direct use if needed)
export {
	getAllCompletions,
	getCompletions,
	getNamespaceCompletions,
} from "./features/completions";
export { type DefinitionResult, getDefinition } from "./features/definition";
export { getDiagnostics } from "./features/diagnostics";
export { getFoldingRanges } from "./features/folding";
export { format, formatToString } from "./features/formatting";
export { getHover } from "./features/hover";
export { getInlayHints } from "./features/inlayHints";
export {
	getAllConstantNames,
	getAllFunctionNames,
	getAllVariableNames,
	getSymbolInfo,
} from "./features/lookup";
export { getReferences, type ReferencesOptions } from "./features/references";
export {
	type PrepareRenameResult,
	prepareRename,
	type RenameResult,
	rename,
} from "./features/rename";
export {
	getSemanticTokens,
	getSemanticTokensLegend,
} from "./features/semanticTokens";
export { getSignatureHelp } from "./features/signatures";
export { getDocumentSymbols } from "./features/symbols";
export type { HoverOptions } from "./PineLanguageService";
export { PineLanguageService } from "./PineLanguageService";
// Types
export {
	type CodeAction,
	CodeActionKind,
	type CompletionItem,
	// Completions
	CompletionItemKind,
	type Diagnostic,
	// Diagnostics
	DiagnosticSeverity,
	type DocumentSymbol,
	type FoldingRange,
	FoldingRangeKind,
	type FormattingOptions,
	// Hover
	type HoverInfo,
	type InlayHint,
	InlayHintKind,
	InsertTextFormat,
	type Location,
	// Signature Help
	type ParameterInfo,
	// Position & Range
	type Position,
	type Range,
	type SemanticToken,
	SemanticTokenModifier,
	type SemanticTokensResult,
	SemanticTokenType,
	type SignatureHelp,
	type SignatureInfo,
	type SymbolInfo,
	// Symbols
	SymbolKind,
	// Formatting
	type TextEdit,
	type WorkspaceEdit,
} from "./types";
