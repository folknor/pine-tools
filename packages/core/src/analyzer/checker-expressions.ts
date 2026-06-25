// Operator and conditional-expression validation for the Pine checker,
// extracted from checker.ts. Free functions over the validator instance `v`
// (the pure predicates boolContextOk/expectedArithmeticOperandType need no
// instance). Covers binary/unary/ternary operand checks and the CE10235
// if/switch-expression branch-compatibility check. The expression dispatcher
// (validateExpression), type inference, and rendering helpers stay on the
// validator. see INV001, INV028, INV059, INV070, INV089.

import { DiagnosticSeverity } from "../common/errors";
import type {
	BinaryExpression,
	Expression,
	ExpressionStatement,
	Identifier,
	IfExpression,
	IfStatement,
	SwitchExpression,
	TernaryExpression,
	UnaryExpression,
} from "../parser/ast";
import type { UnifiedPineValidator } from "./checker";
import { CE10123_TEMPLATE, isOpaqueHandleType } from "./checker-helpers";
import { type PineType, TypeChecker } from "./types";

// The if/switch EXPRESSION nodes whose branches the CE10235 check walks. An
// `else if` chain lowers to a nested IfStatement in the `alternate` block.
type BranchNode = IfExpression | IfStatement | SwitchExpression;

// A value is acceptable in a bool context (if/while/ternary condition,
// and/or/not operand) when it IS bool, when we can't tell, or - on
// legacy v4/v5 sources only - when it is numeric: those versions
// auto-coerce numbers in bool contexts (TV compiles them with an
// "accepts a 'bool' argument" WARNING; v6 rejects them - INV057
// lateral finding + INV059). String/color stay flagged everywhere.
export function boolContextOk(t: PineType, version: string): boolean {
	if (t === "unknown" || TypeChecker.isBoolType(t)) return true;
	return version !== "6" && TypeChecker.isNumericType(t);
}

export function validateBinaryExpression(
	v: UnifiedPineValidator,
	expr: BinaryExpression,
	version: string = "6",
): void {
	const leftType = v.inferExpressionType(expr.left, version);
	const rightType = v.inferExpressionType(expr.right, version);

	// Check for direct na comparison (x == na or x != na)
	if (expr.operator === "==" || expr.operator === "!=") {
		const isLeftNaIdentifier =
			expr.left.type === "Identifier" && expr.left.name === "na";
		const isRightNaIdentifier =
			expr.right.type === "Identifier" && expr.right.name === "na";

		if (isLeftNaIdentifier || isRightNaIdentifier) {
			v.addError(
				expr.line,
				expr.column,
				2,
				`Cannot compare a value to "na" directly. Use the "na()" function instead.`,
				DiagnosticSeverity.Error,
			);
			return; // Don't report additional type errors for this
		}
	}

	// Logical operators require bool operands.
	// Note: TypeChecker.areTypesCompatible (types.ts) also checks this, but we check here
	// first to provide better error messages that identify which operand is wrong.
	// The areTypesCompatible check below serves as a fallback for edge cases.
	// Errors anchor at the offending OPERAND, one error per bad operand -
	// TV's convention (`true and "hello"` errors at the string's column;
	// `if ph or pl` with two float operands gets two errors). Matching the
	// anchors keeps the position-keyed TV diff clean. see INV028
	if (expr.operator === "and" || expr.operator === "or") {
		if (!boolContextOk(leftType, version)) {
			addBoolOperatorError(
				v,
				expr.operator,
				"expr0",
				expr.left,
				leftType,
				version,
			);
		}
		if (!boolContextOk(rightType, version)) {
			addBoolOperatorError(
				v,
				expr.operator,
				"expr1",
				expr.right,
				rightType,
				version,
			);
		}
		// The per-operand check IS the complete check for logical
		// operators - operands that pass it (bool, unknown, or
		// legacy-numeric per boolContextOk) are individually acceptable,
		// so the mixed-type compatibility fallback below must not run
		// (it would flag v5's `bool and int` coercion mix). see INV059
		return;
	}

	// Legacy scripts are lenient on opaque handles (TV v4/v5 accept a
	// plot/hline handle in a comparison; only v6 rejects it). see INV089
	if (
		version !== "6" &&
		(isOpaqueHandleType(leftType) || isOpaqueHandleType(rightType))
	) {
		return;
	}

	if (
		!TypeChecker.areTypesCompatible(
			leftType,
			rightType,
			expr.operator,
			version !== "6",
		)
	) {
		// Anchor at the operand that breaks the operator's operand class
		// when that is decidable (arithmetic/comparison want numeric
		// operands - `2 * color.blue` errors at the color, `color.red >
		// color.blue` at both); fall back to the whole expression for
		// mutual incompatibilities. see INV028
		const ARITH_OR_COMPARE = ["+", "-", "*", "/", "%", "<", ">", "<=", ">="];
		const offenders: Array<{
			expr: Expression;
			type: PineType;
			argName: "expr0" | "expr1";
		}> = [];
		if (ARITH_OR_COMPARE.includes(expr.operator)) {
			if (!TypeChecker.isNumericType(leftType)) {
				offenders.push({ expr: expr.left, type: leftType, argName: "expr0" });
			}
			if (!TypeChecker.isNumericType(rightType)) {
				offenders.push({ expr: expr.right, type: rightType, argName: "expr1" });
			}
		}
		if (offenders.length > 0) {
			const expected = ["<", ">", "<=", ">="].includes(expr.operator)
				? "simple float"
				: expectedArithmeticOperandType(leftType, rightType);
			for (const offender of offenders) {
				addOperatorTypeError(
					v,
					expr.operator,
					offender.argName,
					offender.expr,
					offender.type,
					expected,
					version,
				);
			}
		} else {
			v.addError(
				expr.line,
				expr.column,
				1,
				`Type mismatch: cannot apply '${expr.operator}' to ${leftType} and ${rightType}`,
				DiagnosticSeverity.Error,
			);
		}
	}
}

export function expectedArithmeticOperandType(
	leftType: PineType,
	rightType: PineType,
): string {
	const otherNumeric = TypeChecker.isNumericType(leftType)
		? leftType
		: rightType;
	return TypeChecker.baseTypeName(otherNumeric) === "float"
		? "const float"
		: "const int";
}

export function addBoolOperatorError(
	v: UnifiedPineValidator,
	operator: string,
	argDisplayName: string,
	expr: Expression,
	argType: PineType,
	version: string,
	qualifier: "const" | "simple" = "const",
): void {
	let expectedQualifier: "const" | "simple" | "series" = qualifier;
	if (qualifier === "const") {
		if (expr.type === "CallExpression") {
			expectedQualifier = "series";
		} else if (expr.type === "Identifier") {
			const sym = v.symbolTable.lookup((expr as Identifier).name);
			if (sym && sym.line !== 0) expectedQualifier = "simple";
		}
	}
	addOperatorTypeError(
		v,
		operator,
		argDisplayName,
		expr,
		argType,
		`${expectedQualifier} bool`,
		version,
	);
}

export function addOperatorTypeError(
	v: UnifiedPineValidator,
	operator: string,
	argDisplayName: string,
	expr: Expression,
	argType: PineType,
	expectedType: string,
	version: string,
): void {
	const desc = v.describeArgForTemplate(expr, argType, version);
	v.addTemplateError({
		line: expr.line,
		column: expr.column,
		length: 0,
		message: CE10123_TEMPLATE,
		severity: DiagnosticSeverity.Error,
		code: "CE10123",
		ctx: {
			argDisplayName,
			argUserFriendlyRepresentation: desc.repr,
			argumentType: desc.typeStr,
			currentTypeDocStr: expectedType,
			funId: `operator ${operator}`,
			typePostfix: "",
		},
	});
}

export function validateUnaryExpression(
	v: UnifiedPineValidator,
	expr: UnaryExpression,
	version: string = "6",
): void {
	if (expr.operator === "not") {
		const argType = v.inferExpressionType(expr.argument, version);
		if (!boolContextOk(argType, version)) {
			addBoolOperatorError(
				v,
				"not",
				"expr0",
				expr.argument,
				argType,
				version,
				"simple",
			);
		}
	}
}

export function validateTernaryExpression(
	v: UnifiedPineValidator,
	expr: TernaryExpression,
	version: string = "6",
): void {
	const condType = v.inferExpressionType(expr.condition, version);
	if (!boolContextOk(condType, version)) {
		addBoolOperatorError(v, "?:", "expr0", expr.condition, condType, version);
	}

	// Check that both branches have compatible types - stricter than
	// isAssignable. pine-lint --tv accepts cross-type mixes here
	// (color|string, color|int, even simple<string>|series<float>) but
	// those are nonsense values that can't be assigned to a typed
	// variable. We flag anyway. see INV001.
	const conseqType = v.inferExpressionType(expr.consequent, version);
	const altType = v.inferExpressionType(expr.alternate, version);

	if (
		conseqType === "unknown" ||
		altType === "unknown" ||
		conseqType === "na" ||
		altType === "na"
	) {
		return;
	}

	if (!areTernaryBranchTypesCompatible(v, conseqType, altType)) {
		const expectedFromConseq = TypeChecker.isColorType(conseqType);
		const offendingExpr = expectedFromConseq ? expr.alternate : expr.consequent;
		const offendingType = expectedFromConseq ? altType : conseqType;
		const expectedType = expectedFromConseq ? conseqType : altType;
		const desc = v.describeArgForTemplate(
			offendingExpr,
			offendingType,
			version,
		);
		v.addTemplateError({
			line: offendingExpr.line || expr.line,
			column: offendingExpr.column || expr.column,
			length: 0,
			message: CE10123_TEMPLATE,
			severity: DiagnosticSeverity.Error,
			code: "CE10123",
			ctx: {
				argDisplayName: expectedFromConseq ? "expr2" : "expr1",
				argUserFriendlyRepresentation: desc.repr,
				argumentType: desc.typeStr,
				currentTypeDocStr: v.renderTvType(expectedType, "const"),
				funId: "operator ?:",
				typePostfix: "",
			},
		});
	}
}

// Strict ternary branch compatibility: branches must share a type
// category (numeric/bool/string/color), modulo series/simple stripping.
// see INV001.
export function areTernaryBranchTypesCompatible(
	v: UnifiedPineValidator,
	type1: PineType,
	type2: PineType,
): boolean {
	if (type1 === type2) return true;

	const base1 = v.getBaseType(type1);
	const base2 = v.getBaseType(type2);
	if (base1 === base2) return true;

	if (TypeChecker.isNumericType(type1) && TypeChecker.isNumericType(type2)) {
		return true;
	}
	if (TypeChecker.isBoolType(type1) && TypeChecker.isBoolType(type2)) {
		return true;
	}
	if (TypeChecker.isStringType(type1) && TypeChecker.isStringType(type2)) {
		return true;
	}
	if (TypeChecker.isColorType(type1) && TypeChecker.isColorType(type2)) {
		return true;
	}
	if (TypeChecker.isDisplayFlag(type1) && TypeChecker.isDisplayFlag(type2)) {
		return true;
	}

	return false;
}

// Collect the value-producing type of every branch of an if/switch
// EXPRESSION. A block's value is its tail statement: an expression
// statement contributes its type; a nested if (the `else if` chain lowers
// to an IfStatement in the alternate) recurses; any other tail (assignment,
// void call) is skipped conservatively (no type -> no false mismatch).
export function collectBranchResultTypes(
	v: UnifiedPineValidator,
	node: BranchNode,
	version: string,
	out: PineType[],
): void {
	const blockTail = (block: { type: string }[] | undefined): void => {
		if (!block || block.length === 0) return;
		const tail = block[block.length - 1];
		if (tail.type === "IfStatement" || tail.type === "IfExpression") {
			collectBranchResultTypes(v, tail as unknown as BranchNode, version, out);
		} else if (tail.type === "ExpressionStatement") {
			out.push(
				v.inferExpressionType(
					(tail as unknown as ExpressionStatement).expression,
					version,
				),
			);
		}
	};
	if (node.type === "SwitchExpression") {
		for (const c of (node as SwitchExpression).cases) {
			if (c.statements) blockTail(c.statements as { type: string }[]);
			else if (c.result) out.push(v.inferExpressionType(c.result, version));
		}
	} else {
		// IfExpression / IfStatement share { consequent, alternate } blocks.
		blockTail(node.consequent);
		blockTail(node.alternate);
	}
}

// TV's CE10235: every branch of an if/switch EXPRESSION must return a
// compatible type (`x = if c \n "a" \n else \n 1` is rejected). Same
// category rule as the ternary branch check (areTernaryBranchTypesCompatible
// - int/float and na/unknown are compatible; string vs numeric vs bool vs
// color are not), TV-confirmed identical on the boundary cases (probed p02/
// p06/p07/p08, 2026-06-19). Unlike ternary - where TV is lenient and we are
// deliberately stricter (INV001) - TV itself flags if/switch, so this is a
// plain false-negative fix. v6-only (legacy stays lenient, G004). Anchored
// at the if/switch keyword. see INV070.
export function checkIfSwitchBranchTypes(
	v: UnifiedPineValidator,
	node: BranchNode,
	version: string,
): void {
	if (version !== "6") return;
	const types: PineType[] = [];
	collectBranchResultTypes(v, node, version, types);
	const concrete = types.filter(
		(t) => t !== "unknown" && !TypeChecker.isNaType(t),
	);
	if (concrete.length < 2) return;
	const ref = concrete[0];
	const incompatible = concrete
		.slice(1)
		.some((t) => !areTernaryBranchTypesCompatible(v, ref, t));
	if (incompatible) {
		const kw = node.type === "SwitchExpression" ? "switch" : "if";
		v.addError(
			node.line,
			node.column,
			kw.length,
			`Return type of one of the "if" or "switch" blocks is not compatible with return type of other block(s) (${concrete
				.map((t) => TypeChecker.displayType(t))
				.join("; ")})`,
			DiagnosticSeverity.Error,
		);
	}
}
