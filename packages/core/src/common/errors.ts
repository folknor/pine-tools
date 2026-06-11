// Shared error types and diagnostic severity levels
// Used across the analyzer and language service

export enum DiagnosticSeverity {
	Error = 0,
	Warning = 1,
	Information = 2,
	Hint = 3,
}

export interface ValidationError {
	line: number;
	column: number;
	length: number;
	message: string;
	severity: DiagnosticSeverity;
	// pine-lint-compatible structured form (optional). When set, `message` is
	// the unfilled template and `ctx` is the value map that fills it.
	code?: string;
	ctx?: Record<string, string>;
}

// Render a ValidationError's message for display: structured (code + ctx)
// errors carry an unfilled pine-lint template - substitute the placeholders
// the same way the CLI's fillTemplate does. Plain messages pass through.
// Every human-facing consumer (CLI, editor diagnostics, test helpers) must
// go through this, or template errors leak "{placeholders}". see INV061
export function renderMessage(
	e: Pick<ValidationError, "message" | "ctx">,
): string {
	if (!e.ctx) return e.message;
	return e.message.replace(/\{(\w+)\}/g, (match, key) => {
		const value = e.ctx?.[key];
		return value === undefined ? match : String(value);
	});
}

// Error factory functions for common error types
export function createError(
	line: number,
	column: number,
	length: number,
	message: string,
): ValidationError {
	return { line, column, length, message, severity: DiagnosticSeverity.Error };
}

export function createWarning(
	line: number,
	column: number,
	length: number,
	message: string,
): ValidationError {
	return {
		line,
		column,
		length,
		message,
		severity: DiagnosticSeverity.Warning,
	};
}

export function createInfo(
	line: number,
	column: number,
	length: number,
	message: string,
): ValidationError {
	return {
		line,
		column,
		length,
		message,
		severity: DiagnosticSeverity.Information,
	};
}

export function createHint(
	line: number,
	column: number,
	length: number,
	message: string,
): ValidationError {
	return { line, column, length, message, severity: DiagnosticSeverity.Hint };
}
