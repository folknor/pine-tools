// Main service export
export { PineLanguageService } from "./PineLanguageService";
export type { HoverOptions } from "./PineLanguageService";

// Document classes
export { DocumentManager, ParsedDocument } from "./documents";

// Types
export {
	// Position & Range
	type Position,
	type Range,
	type Location,
	// Diagnostics
	DiagnosticSeverity,
	type Diagnostic,
	// Completions
	CompletionItemKind,
	InsertTextFormat,
	type CompletionItem,
	// Hover
	type HoverInfo,
	// Signature Help
	type ParameterInfo,
	type SignatureInfo,
	type SignatureHelp,
	// Formatting
	type TextEdit,
	type FormattingOptions,
	// Symbols
	SymbolKind,
	type DocumentSymbol,
	type SymbolInfo,
} from "./types";

// Feature implementations (for direct use if needed)
export {
	getCompletions,
	getAllCompletions,
	getNamespaceCompletions,
} from "./features/completions";
export { getHover } from "./features/hover";
export { getSignatureHelp } from "./features/signatures";
export { getDiagnostics } from "./features/diagnostics";
export { format, formatToString } from "./features/formatting";
export {
	getSymbolInfo,
	getAllFunctionNames,
	getAllVariableNames,
	getAllConstantNames,
} from "./features/lookup";
