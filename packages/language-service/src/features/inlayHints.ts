/**
 * Inlay hints provide inline annotations for parameter names at call sites.
 */

import { FUNCTIONS_BY_NAME } from "../../../../pine-data/v6";
import type {
	CallExpression,
	Expression,
	Statement,
} from "../../../core/src/parser/ast";
import type { ParsedDocument } from "../documents/ParsedDocument";
import { type InlayHint, InlayHintKind, type Range } from "../types";

/**
 * Get inlay hints for a document within a range.
 */
export function getInlayHints(doc: ParsedDocument, range: Range): InlayHint[] {
	const hints: InlayHint[] = [];

	for (const stmt of doc.ast.body) {
		collectInlayHintsFromStatement(stmt, doc, range, hints);
	}

	return hints;
}

/**
 * Collect inlay hints from a statement.
 */
function collectInlayHintsFromStatement(
	stmt: Statement,
	doc: ParsedDocument,
	range: Range,
	hints: InlayHint[],
): void {
	// Skip statements outside the range
	if (stmt.line !== undefined) {
		const line = stmt.line - 1; // Convert to 0-indexed
		if (line < range.start.line || line > range.end.line) {
			return;
		}
	}

	switch (stmt.type) {
		case "VariableDeclaration":
			if (stmt.init) {
				collectInlayHintsFromExpression(stmt.init, doc, range, hints);
			}
			break;
		case "ExpressionStatement":
			collectInlayHintsFromExpression(stmt.expression, doc, range, hints);
			break;
		case "IfStatement":
			collectInlayHintsFromExpression(stmt.condition, doc, range, hints);
			for (const s of stmt.consequent) {
				collectInlayHintsFromStatement(s, doc, range, hints);
			}
			if (stmt.alternate) {
				for (const s of stmt.alternate) {
					collectInlayHintsFromStatement(s, doc, range, hints);
				}
			}
			break;
		case "ForStatement":
			collectInlayHintsFromExpression(stmt.from, doc, range, hints);
			collectInlayHintsFromExpression(stmt.to, doc, range, hints);
			if (stmt.step) {
				collectInlayHintsFromExpression(stmt.step, doc, range, hints);
			}
			for (const s of stmt.body) {
				collectInlayHintsFromStatement(s, doc, range, hints);
			}
			break;
		case "ForInStatement":
			collectInlayHintsFromExpression(stmt.collection, doc, range, hints);
			for (const s of stmt.body) {
				collectInlayHintsFromStatement(s, doc, range, hints);
			}
			break;
		case "WhileStatement":
			collectInlayHintsFromExpression(stmt.condition, doc, range, hints);
			for (const s of stmt.body) {
				collectInlayHintsFromStatement(s, doc, range, hints);
			}
			break;
		case "FunctionDeclaration":
			for (const s of stmt.body) {
				collectInlayHintsFromStatement(s, doc, range, hints);
			}
			break;
	}
}

/**
 * Collect inlay hints from an expression.
 */
function collectInlayHintsFromExpression(
	expr: Expression,
	doc: ParsedDocument,
	range: Range,
	hints: InlayHint[],
): void {
	switch (expr.type) {
		case "CallExpression":
			collectInlayHintsFromCall(expr, doc, range, hints);
			// Also process arguments recursively for nested calls
			for (const arg of expr.arguments) {
				collectInlayHintsFromExpression(arg.value, doc, range, hints);
			}
			break;
		case "BinaryExpression":
			collectInlayHintsFromExpression(expr.left, doc, range, hints);
			collectInlayHintsFromExpression(expr.right, doc, range, hints);
			break;
		case "UnaryExpression":
			collectInlayHintsFromExpression(expr.argument, doc, range, hints);
			break;
		case "TernaryExpression":
			collectInlayHintsFromExpression(expr.condition, doc, range, hints);
			collectInlayHintsFromExpression(expr.consequent, doc, range, hints);
			collectInlayHintsFromExpression(expr.alternate, doc, range, hints);
			break;
		case "SwitchExpression":
			if (expr.discriminant) {
				collectInlayHintsFromExpression(expr.discriminant, doc, range, hints);
			}
			for (const c of expr.cases) {
				if (c.condition) {
					collectInlayHintsFromExpression(c.condition, doc, range, hints);
				}
				collectInlayHintsFromExpression(c.result, doc, range, hints);
			}
			break;
		case "IndexExpression":
			collectInlayHintsFromExpression(expr.object, doc, range, hints);
			collectInlayHintsFromExpression(expr.index, doc, range, hints);
			break;
		case "ArrayExpression":
			for (const element of expr.elements) {
				collectInlayHintsFromExpression(element, doc, range, hints);
			}
			break;
		case "MemberExpression":
			collectInlayHintsFromExpression(expr.object, doc, range, hints);
			break;
	}
}

/**
 * Get the function name from a call expression callee.
 */
function getCalleeName(callee: Expression): string | null {
	if (callee.type === "Identifier") {
		return callee.name;
	}
	if (callee.type === "MemberExpression") {
		const objName =
			callee.object.type === "Identifier" ? callee.object.name : null;
		const propName =
			callee.property.type === "Identifier" ? callee.property.name : null;
		if (objName && propName) {
			return `${objName}.${propName}`;
		}
	}
	return null;
}

/**
 * Parse parameter names from function syntax.
 */
function parseParameterNames(syntax: string): string[] {
	try {
		const match = syntax.match(/\(([^)]*)\)/);
		if (!match || !match[1].trim()) return [];

		const paramsString = match[1].trim();
		const names: string[] = [];

		let current = "";
		let depth = 0;
		for (const char of paramsString) {
			if (char === "(" || char === "[" || char === "<") depth++;
			else if (char === ")" || char === "]" || char === ">") depth--;
			else if (char === "," && depth === 0) {
				const name = extractParamName(current.trim());
				if (name) names.push(name);
				current = "";
				continue;
			}
			current += char;
		}
		if (current.trim()) {
			const name = extractParamName(current.trim());
			if (name) names.push(name);
		}

		return names;
	} catch {
		return [];
	}
}

/**
 * Extract parameter name from a parameter definition like "series float source" or "int length = 14"
 */
function extractParamName(param: string): string | null {
	// Remove default value if present
	const withoutDefault = param.split("=")[0].trim();
	// Get the last word (the parameter name)
	const parts = withoutDefault.split(/\s+/);
	return parts[parts.length - 1] || null;
}

/**
 * Collect inlay hints from a function call.
 */
function collectInlayHintsFromCall(
	call: CallExpression,
	doc: ParsedDocument,
	_range: Range,
	hints: InlayHint[],
): void {
	const funcName = getCalleeName(call.callee);
	if (!funcName) return;

	// Look up function in pine-data
	const func = FUNCTIONS_BY_NAME.get(funcName);
	if (!func || !func.syntax) return;

	// Parse parameter names from syntax
	const paramNames = parseParameterNames(func.syntax);
	if (paramNames.length === 0) return;

	// Add hints for positional arguments (those without explicit names)
	let positionalIndex = 0;
	for (const arg of call.arguments) {
		// Skip named arguments - they already show the name
		if (arg.name) continue;

		// Skip if we've run out of parameter names
		if (positionalIndex >= paramNames.length) break;

		const paramName = paramNames[positionalIndex];
		positionalIndex++;

		// Get position of the argument
		const argExpr = arg.value;
		if (argExpr.line === undefined || argExpr.column === undefined) continue;

		hints.push({
			position: {
				line: argExpr.line - 1, // Convert to 0-indexed
				character: argExpr.column - 1,
			},
			label: `${paramName}:`,
			kind: InlayHintKind.Parameter,
			paddingRight: true,
		});
	}
}
