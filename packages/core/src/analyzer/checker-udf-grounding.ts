import type {
	Expression,
	ExpressionStatement,
	FunctionParam,
	IfExpression,
	IfStatement,
	ReturnStatement,
	Statement,
	SwitchExpression,
} from "../parser/ast";
import { mapToPineType } from "./builtins";
import type { UnifiedPineValidator } from "./checker";
import { type PineType, TypeChecker } from "./types";

export function udfIdentityKey(
	name: string,
	kind: "function" | "method",
	params: FunctionParam[],
): string {
	const signature = params
		.map((param) => param.typeAnnotation?.name ?? "_")
		.join(",");
	return `${kind}:${name}(${signature})`;
}

function hasSeries(type: PineType): boolean {
	return (type as string).startsWith("series<");
}

function qualifiedType(base: string, series: boolean): PineType {
	return (series ? `series<${base}>` : base) as PineType;
}

export function joinPineType(a: PineType, b: PineType): PineType {
	if (a === b) return a;
	if (a === "unknown" || b === "unknown") return "unknown";
	if (TypeChecker.isNaType(a)) return b;
	if (TypeChecker.isNaType(b)) return a;

	const aBase = TypeChecker.baseTypeName(a as string);
	const bBase = TypeChecker.baseTypeName(b as string);
	const series = hasSeries(a) || hasSeries(b);

	if (
		(aBase === "int" && bBase === "float") ||
		(aBase === "float" && bBase === "int")
	) {
		return qualifiedType("float", series);
	}

	if (aBase === bBase) {
		return qualifiedType(aBase, series);
	}

	return "unknown";
}

export function defineParamsWithBindings(
	v: UnifiedPineValidator,
	params: FunctionParam[] | undefined,
	bindings: Map<string, PineType> | undefined,
): void {
	if (!params) return;
	for (const param of params) {
		const paramType: PineType = param.typeAnnotation
			? mapToPineType(param.typeAnnotation.name)
			: (bindings?.get(param.name) ?? "unknown");
		v.symbolTable.define({
			name: param.name,
			type: paramType,
			line: param.line ?? 0,
			column: param.column ?? 0,
			used: false,
			kind: "variable",
			declaredWith: null,
		});
	}
}

function explicitReturnTypes(
	v: UnifiedPineValidator,
	body: Statement[],
	version: string,
): PineType[] {
	const types: PineType[] = [];
	for (const stmt of body) {
		if (stmt.type === "ReturnStatement") {
			types.push(
				v.inferExpressionType((stmt as ReturnStatement).value, version),
			);
			continue;
		}
		if (stmt.type === "IfStatement") {
			const ifStmt = stmt as IfStatement;
			types.push(...explicitReturnTypes(v, ifStmt.consequent, version));
			types.push(...explicitReturnTypes(v, ifStmt.alternate ?? [], version));
			continue;
		}
		const loopBody = (stmt as { body?: Statement[] }).body;
		if (Array.isArray(loopBody)) {
			types.push(...explicitReturnTypes(v, loopBody, version));
		}
		const seq = (stmt as { statements?: Statement[] }).statements;
		if (Array.isArray(seq)) {
			types.push(...explicitReturnTypes(v, seq, version));
		}
	}
	return types;
}

// Scalar type leaves a tail EXPRESSION evaluates to. A trailing if/switch
// expression is descended arm-by-arm so its branches union (mixed bases ->
// unknown) instead of collapsing to the first arm, mirroring the tuple path's
// tupleInitElementTypes/branchTailTupleTypes. inferExpressionType alone would
// take only cases[0].result / the consequent tail (the first-arm rule), which
// is exactly defect 2 for the switch/if-expression shapes. see INV123
function tailExprScalarTypes(
	v: UnifiedPineValidator,
	expr: Expression,
	version: string,
): PineType[] {
	if (expr.type === "IfExpression") {
		const ifExpr = expr as IfExpression;
		return [
			...tailScalarTypes(v, ifExpr.consequent, version),
			...tailScalarTypes(v, ifExpr.alternate, version),
		];
	}
	if (expr.type === "SwitchExpression") {
		const sw = expr as SwitchExpression;
		// When a case carries `statements`, its `result` is the last statement's
		// expression - visit the statement tail instead (SwitchCase in ast.ts).
		return sw.cases.flatMap((c) =>
			c.statements
				? tailScalarTypes(v, c.statements, version)
				: tailExprScalarTypes(v, c.result, version),
		);
	}
	return [v.inferExpressionType(expr, version)];
}

function tailScalarTypes(
	v: UnifiedPineValidator,
	body: Statement[] | undefined,
	version: string,
): PineType[] {
	if (!body || body.length === 0) return [];
	const last = body[body.length - 1];
	if (last.type === "ExpressionStatement") {
		return tailExprScalarTypes(
			v,
			(last as ExpressionStatement).expression,
			version,
		);
	}
	if (last.type === "ReturnStatement") {
		return tailExprScalarTypes(v, (last as ReturnStatement).value, version);
	}
	if (last.type === "IfStatement") {
		const ifStmt = last as IfStatement;
		return [
			...tailScalarTypes(v, ifStmt.consequent, version),
			...tailScalarTypes(v, ifStmt.alternate, version),
		];
	}
	return [];
}

export function inferGroundedScalarReturn(
	v: UnifiedPineValidator,
	body: Statement[],
	version: string,
): PineType {
	let returnType: PineType | undefined;
	for (const t of [
		...explicitReturnTypes(v, body, version),
		...tailScalarTypes(v, body, version),
	]) {
		returnType = returnType ? joinPineType(returnType, t) : t;
	}
	return returnType ?? "unknown";
}
