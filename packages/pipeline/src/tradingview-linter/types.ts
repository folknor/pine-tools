/**
 * Pine-lint types
 * TypeScript definitions for TradingView's Pine Script validation API responses
 */

export interface Position {
	line: number;
	column: number;
}

export interface Range {
	start: Position;
	end: Position;
}

export interface PineLintError {
	start: Position;
	end: Position;
	message: string;
}

export interface PineLintVariable {
	name: string;
	type: string; // e.g., "input int", "series float", "const color"
	definition: Range;
	scopeId?: string;
}

export interface PineLintFunction {
	name: string;
	// Add more fields as needed based on actual API response
}

export interface PineLintType {
	name: string;
	// Add more fields as needed
}

export interface PineLintEnum {
	name: string;
	// Add more fields as needed
}

export interface PineLintResultPayload {
	errors?: PineLintError[];
	warnings?: PineLintError[];
	variables?: PineLintVariable[];
	functions?: PineLintFunction[];
	types?: PineLintType[];
	enums?: PineLintEnum[];
	scopes?: unknown; // Rarely used, omitted by default
}

export interface PineLintResponse {
	success: boolean;
	error?: string;
	result?: PineLintResultPayload;
}

export interface PineLintOptions {
	username?: string;
	fullResponse?: boolean;
	timeout?: number;
}
