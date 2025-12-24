/**
 * Semantic tokens provide rich token classification for syntax highlighting.
 */

import { FUNCTIONS_BY_NAME, VARIABLES, CONSTANTS } from "../../../../pine-data/v6";
import type {
	Expression,
	Statement,
} from "../../../core/src/parser/ast";
import type { ParsedDocument } from "../documents/ParsedDocument";
import {
	type SemanticToken,
	SemanticTokenModifier,
	type SemanticTokensResult,
	SemanticTokenType,
} from "../types";

// Built-in symbols lookup
const BUILTIN_VARIABLES = new Set(VARIABLES.map((v) => v.name));
const BUILTIN_CONSTANTS = new Set(CONSTANTS.map((c) => c.name));

/**
 * Get semantic tokens for a document.
 */
export function getSemanticTokens(doc: ParsedDocument): SemanticTokensResult {
	const tokens: SemanticToken[] = [];

	for (const stmt of doc.ast.body) {
		collectTokensFromStatement(stmt, tokens);
	}

	// Sort tokens by position
	tokens.sort((a, b) => {
		if (a.line !== b.line) return a.line - b.line;
		return a.character - b.character;
	});

	// Encode as delta format
	return encodeTokens(tokens);
}

/**
 * Collect semantic tokens from a statement.
 */
function collectTokensFromStatement(
	stmt: Statement,
	tokens: SemanticToken[],
): void {
	switch (stmt.type) {
		case "VariableDeclaration":
			// Variable declaration - mark the name
			if (stmt.line !== undefined && stmt.column !== undefined) {
				const modifiers = [SemanticTokenModifier.Declaration];
				if (stmt.varType === "const") {
					modifiers.push(SemanticTokenModifier.Readonly);
				}
				tokens.push({
					line: stmt.line - 1,
					character: stmt.column - 1,
					length: stmt.name.length,
					tokenType: stmt.varType === "const" ? SemanticTokenType.Variable : SemanticTokenType.Variable,
					tokenModifiers: modifiers,
				});
			}
			if (stmt.init) {
				collectTokensFromExpression(stmt.init, tokens);
			}
			break;

		case "FunctionDeclaration":
			// Function declaration - mark the name
			if (stmt.line !== undefined && stmt.column !== undefined) {
				tokens.push({
					line: stmt.line - 1,
					character: stmt.column - 1,
					length: stmt.name.length,
					tokenType: SemanticTokenType.Function,
					tokenModifiers: [SemanticTokenModifier.Declaration, SemanticTokenModifier.Definition],
				});
			}
			// Mark parameters
			for (const param of stmt.params) {
				// We don't have exact position for params, skip for now
			}
			// Process body
			for (const s of stmt.body) {
				collectTokensFromStatement(s, tokens);
			}
			break;

		case "MethodDeclaration":
			if (stmt.line !== undefined && stmt.column !== undefined) {
				tokens.push({
					line: stmt.line - 1,
					character: stmt.column - 1,
					length: stmt.name.length,
					tokenType: SemanticTokenType.Method,
					tokenModifiers: [SemanticTokenModifier.Declaration, SemanticTokenModifier.Definition],
				});
			}
			for (const s of stmt.body) {
				collectTokensFromStatement(s, tokens);
			}
			break;

		case "ExpressionStatement":
			collectTokensFromExpression(stmt.expression, tokens);
			break;

		case "IfStatement":
			collectTokensFromExpression(stmt.condition, tokens);
			for (const s of stmt.consequent) {
				collectTokensFromStatement(s, tokens);
			}
			if (stmt.alternate) {
				for (const s of stmt.alternate) {
					collectTokensFromStatement(s, tokens);
				}
			}
			break;

		case "ForStatement":
			collectTokensFromExpression(stmt.from, tokens);
			collectTokensFromExpression(stmt.to, tokens);
			if (stmt.step) {
				collectTokensFromExpression(stmt.step, tokens);
			}
			for (const s of stmt.body) {
				collectTokensFromStatement(s, tokens);
			}
			break;

		case "ForInStatement":
			collectTokensFromExpression(stmt.collection, tokens);
			for (const s of stmt.body) {
				collectTokensFromStatement(s, tokens);
			}
			break;

		case "WhileStatement":
			collectTokensFromExpression(stmt.condition, tokens);
			for (const s of stmt.body) {
				collectTokensFromStatement(s, tokens);
			}
			break;

		case "AssignmentStatement":
			collectTokensFromExpression(stmt.target, tokens);
			collectTokensFromExpression(stmt.value, tokens);
			break;

		case "ReturnStatement":
			collectTokensFromExpression(stmt.value, tokens);
			break;

		case "SequenceStatement":
			for (const s of stmt.statements) {
				collectTokensFromStatement(s, tokens);
			}
			break;

		case "ImportStatement":
			// Mark import alias as module
			if (stmt.alias && stmt.line !== undefined && stmt.column !== undefined) {
				// Approximate position - would need better tracking
			}
			break;
	}
}

/**
 * Collect semantic tokens from an expression.
 */
function collectTokensFromExpression(
	expr: Expression,
	tokens: SemanticToken[],
): void {
	switch (expr.type) {
		case "Identifier":
			if (expr.line !== undefined && expr.column !== undefined) {
				const isBuiltinVar = BUILTIN_VARIABLES.has(expr.name);
				const isBuiltinConst = BUILTIN_CONSTANTS.has(expr.name);
				const isBuiltinFunc = FUNCTIONS_BY_NAME.has(expr.name);

				const modifiers: SemanticTokenModifier[] = [];
				if (isBuiltinVar || isBuiltinConst || isBuiltinFunc) {
					modifiers.push(SemanticTokenModifier.DefaultLibrary);
				}
				if (isBuiltinConst) {
					modifiers.push(SemanticTokenModifier.Readonly);
				}

				let tokenType = SemanticTokenType.Variable;
				if (isBuiltinFunc) {
					tokenType = SemanticTokenType.Function;
				}

				tokens.push({
					line: expr.line - 1,
					character: expr.column - 1,
					length: expr.name.length,
					tokenType,
					tokenModifiers: modifiers,
				});
			}
			break;

		case "Literal":
			if (expr.line !== undefined && expr.column !== undefined) {
				let tokenType = SemanticTokenType.Number;
				if (typeof expr.value === "string") {
					tokenType = SemanticTokenType.String;
				}
				tokens.push({
					line: expr.line - 1,
					character: expr.column - 1,
					length: expr.raw.length,
					tokenType,
					tokenModifiers: [],
				});
			}
			break;

		case "CallExpression":
			// Mark function call
			collectTokensFromExpression(expr.callee, tokens);
			for (const arg of expr.arguments) {
				collectTokensFromExpression(arg.value, tokens);
			}
			break;

		case "MemberExpression":
			collectTokensFromExpression(expr.object, tokens);
			// Mark property as namespace or property
			if (expr.property.line !== undefined && expr.property.column !== undefined) {
				// Check if this is a namespace.function pattern
				const objName = expr.object.type === "Identifier" ? expr.object.name : null;
				const propName = expr.property.name;
				const fullName = objName ? `${objName}.${propName}` : propName;

				const isBuiltinFunc = FUNCTIONS_BY_NAME.has(fullName);
				const isBuiltinConst = BUILTIN_CONSTANTS.has(fullName);

				const modifiers: SemanticTokenModifier[] = [];
				if (isBuiltinFunc || isBuiltinConst) {
					modifiers.push(SemanticTokenModifier.DefaultLibrary);
				}
				if (isBuiltinConst) {
					modifiers.push(SemanticTokenModifier.Readonly);
				}

				tokens.push({
					line: expr.property.line - 1,
					character: expr.property.column - 1,
					length: propName.length,
					tokenType: isBuiltinFunc ? SemanticTokenType.Function : SemanticTokenType.Property,
					tokenModifiers: modifiers,
				});
			}
			break;

		case "BinaryExpression":
			collectTokensFromExpression(expr.left, tokens);
			collectTokensFromExpression(expr.right, tokens);
			break;

		case "UnaryExpression":
			collectTokensFromExpression(expr.argument, tokens);
			break;

		case "TernaryExpression":
			collectTokensFromExpression(expr.condition, tokens);
			collectTokensFromExpression(expr.consequent, tokens);
			collectTokensFromExpression(expr.alternate, tokens);
			break;

		case "ArrayExpression":
			for (const el of expr.elements) {
				collectTokensFromExpression(el, tokens);
			}
			break;

		case "IndexExpression":
			collectTokensFromExpression(expr.object, tokens);
			collectTokensFromExpression(expr.index, tokens);
			break;

		case "SwitchExpression":
			if (expr.discriminant) {
				collectTokensFromExpression(expr.discriminant, tokens);
			}
			for (const c of expr.cases) {
				if (c.condition) {
					collectTokensFromExpression(c.condition, tokens);
				}
				collectTokensFromExpression(c.result, tokens);
			}
			break;
	}
}

/**
 * Encode tokens into the LSP delta format.
 * Each token is represented by 5 integers:
 * - deltaLine: line relative to previous token
 * - deltaStartChar: character relative to previous token (or 0 if on new line)
 * - length: token length
 * - tokenType: token type index
 * - tokenModifiers: bit mask of modifiers
 */
function encodeTokens(tokens: SemanticToken[]): SemanticTokensResult {
	const data: number[] = [];
	let prevLine = 0;
	let prevChar = 0;

	for (const token of tokens) {
		const deltaLine = token.line - prevLine;
		const deltaChar = deltaLine === 0 ? token.character - prevChar : token.character;

		// Encode modifiers as bit mask
		let modifiersMask = 0;
		for (const mod of token.tokenModifiers) {
			modifiersMask |= (1 << mod);
		}

		data.push(
			deltaLine,
			deltaChar,
			token.length,
			token.tokenType,
			modifiersMask,
		);

		prevLine = token.line;
		prevChar = token.character;
	}

	return { data };
}

/**
 * Get the token type legend (for LSP registration).
 */
export function getSemanticTokensLegend() {
	return {
		tokenTypes: [
			"namespace",
			"type",
			"class",
			"enum",
			"interface",
			"struct",
			"typeParameter",
			"parameter",
			"variable",
			"property",
			"enumMember",
			"event",
			"function",
			"method",
			"macro",
			"keyword",
			"modifier",
			"comment",
			"string",
			"number",
			"regexp",
			"operator",
		],
		tokenModifiers: [
			"declaration",
			"definition",
			"readonly",
			"static",
			"deprecated",
			"abstract",
			"async",
			"modification",
			"documentation",
			"defaultLibrary",
		],
	};
}
