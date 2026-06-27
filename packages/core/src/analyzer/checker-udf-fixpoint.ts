import type {
	CallArgument,
	CallExpression,
	Expression,
	FunctionDeclaration,
	FunctionParam,
	IfStatement,
	MethodDeclaration,
	Program,
	Statement,
	SwitchExpression,
	TupleDeclaration,
	VariableDeclaration,
} from "../parser/ast";
import type { UnifiedPineValidator } from "./checker";
import {
	defineParamsWithBindings,
	inferGroundedScalarReturn,
	joinPineType,
	udfIdentityKey,
} from "./checker-udf-grounding";
import type { PineType } from "./types";

interface UdfRecord {
	identity: string;
	name: string;
	kind: "function" | "method";
	params: FunctionParam[];
	body: Statement[];
	line: number;
	column: number;
}

interface CallSitePair {
	paramName: string;
	argExpr: Expression;
}

interface CallSite {
	calleeIdentity: string;
	enclosingUdfIdentity?: string;
	pairs: CallSitePair[];
}

export function resolveUdfParamBindings(
	v: UnifiedPineValidator,
	ast: Program,
	version: string,
): void {
	const savedExpressionTypes = v.expressionTypes;
	v.symbolTable.enterScope();
	try {
		v.expressionTypes = new Map();
		const udfs = collectTopLevelUdfs(ast);
		if (udfs.length === 0) return;

		const byIdentity = new Map(udfs.map((u) => [u.identity, u]));
		const byName = new Map<string, UdfRecord[]>();
		for (const u of udfs) {
			const list = byName.get(u.name) ?? [];
			list.push(u);
			byName.set(u.name, list);
		}

		v.udfAmbiguousReturnNames = new Set(
			[...byName].filter(([, list]) => list.length > 1).map(([name]) => name),
		);

		const callSites: CallSite[] = [];
		for (const statement of ast.body) {
			collectCallSitesFromStatement(statement, undefined, byName, v, callSites);
		}

		for (const statement of ast.body) {
			if (isTopLevelVarStatement(statement)) {
				v.collectDeclarations(statement, version);
			}
		}
		for (const u of udfs) {
			v.symbolTable.define({
				name: u.name,
				type: "unknown",
				line: u.line,
				column: u.column,
				used: false,
				kind: u.kind,
				declaredWith: null,
			});
		}

		const cap = udfs.length + 2;
		for (let round = 0; round < cap; round++) {
			v.expressionTypes = new Map();
			let changed = false;

			for (const u of udfs) {
				const ret = inferGroundedScalarReturnUnder(
					v,
					u,
					version,
					v.udfParamBindings.get(u.identity),
				);
				const published = v.udfAmbiguousReturnNames.has(u.name)
					? "unknown"
					: ret;
				const existing = v.symbolTable.lookupCallable(u.name);
				if (existing?.type !== published || existing.kind !== u.kind) {
					v.symbolTable.define({
						name: u.name,
						type: published,
						line: u.line,
						column: u.column,
						used: false,
						kind: u.kind,
						declaredWith: null,
					});
					changed = true;
				}
			}

			for (const statement of ast.body) {
				if (isTopLevelVarStatement(statement)) {
					v.collectDeclarations(statement, version);
				}
			}

			for (const cs of callSites) {
				const callee = byIdentity.get(cs.calleeIdentity);
				if (!callee) continue;
				const bindings = getOrCreateBinding(v, cs.calleeIdentity);
				const enclosing = cs.enclosingUdfIdentity
					? byIdentity.get(cs.enclosingUdfIdentity)
					: undefined;
				if (enclosing) {
					v.symbolTable.enterScope();
					defineParamsWithBindings(
						v,
						enclosing.params,
						v.udfParamBindings.get(enclosing.identity),
					);
				}
				try {
					for (const pair of cs.pairs) {
						const argType = v.inferExpressionType(pair.argExpr, version);
						changed = contribute(bindings, pair.paramName, argType) || changed;
					}
				} finally {
					if (enclosing) v.symbolTable.exitScope();
				}
			}

			if (!changed) break;
		}
	} finally {
		v.symbolTable.exitScope();
		v.expressionTypes = savedExpressionTypes;
	}
}

function collectTopLevelUdfs(ast: Program): UdfRecord[] {
	const records: UdfRecord[] = [];
	for (const statement of ast.body) {
		if (
			statement.type !== "FunctionDeclaration" &&
			statement.type !== "MethodDeclaration"
		) {
			continue;
		}
		const decl = statement as FunctionDeclaration | MethodDeclaration;
		const kind = statement.type === "MethodDeclaration" ? "method" : "function";
		records.push({
			identity: udfIdentityKey(decl.name, kind, decl.params),
			name: decl.name,
			kind,
			params: decl.params,
			body: decl.body,
			line: decl.line,
			column: decl.column,
		});
	}
	return records;
}

function isTopLevelVarStatement(statement: Statement): boolean {
	return (
		statement.type === "VariableDeclaration" ||
		statement.type === "TupleDeclaration" ||
		statement.type === "SequenceStatement"
	);
}

function inferGroundedScalarReturnUnder(
	v: UnifiedPineValidator,
	u: UdfRecord,
	version: string,
	bindings: Map<string, PineType> | undefined,
): PineType {
	const savedExpressionTypes = v.expressionTypes;
	v.expressionTypes = new Map();
	v.symbolTable.enterScope();
	try {
		defineParamsWithBindings(v, u.params, bindings);
		for (const stmt of u.body) {
			v.collectDeclarations(stmt, version);
		}
		return inferGroundedScalarReturn(v, u.body, version);
	} finally {
		v.symbolTable.exitScope();
		v.expressionTypes = savedExpressionTypes;
	}
}

function getOrCreateBinding(
	v: UnifiedPineValidator,
	identity: string,
): Map<string, PineType> {
	let bindings = v.udfParamBindings.get(identity);
	if (!bindings) {
		bindings = new Map();
		v.udfParamBindings.set(identity, bindings);
	}
	return bindings;
}

function contribute(
	bindings: Map<string, PineType>,
	paramName: string,
	argType: PineType,
): boolean {
	const current = bindings.get(paramName);
	const next = current ? joinPineType(current, argType) : argType;
	if (current === next) return false;
	bindings.set(paramName, next);
	return true;
}

function collectCallSitesFromStatement(
	statement: Statement,
	enclosingUdfIdentity: string | undefined,
	byName: Map<string, UdfRecord[]>,
	v: UnifiedPineValidator,
	out: CallSite[],
): void {
	if (
		statement.type === "FunctionDeclaration" ||
		statement.type === "MethodDeclaration"
	) {
		const decl = statement as FunctionDeclaration | MethodDeclaration;
		const kind = statement.type === "MethodDeclaration" ? "method" : "function";
		const identity = udfIdentityKey(decl.name, kind, decl.params);
		for (const stmt of decl.body) {
			collectCallSitesFromStatement(stmt, identity, byName, v, out);
		}
		return;
	}

	for (const expr of statementExpressions(statement)) {
		collectCallSitesFromExpression(expr, enclosingUdfIdentity, byName, v, out);
	}

	const body = (statement as { body?: Statement[] }).body;
	if (Array.isArray(body)) {
		for (const stmt of body) {
			collectCallSitesFromStatement(stmt, enclosingUdfIdentity, byName, v, out);
		}
	}
	const ifStmt = statement as Partial<IfStatement>;
	if (Array.isArray(ifStmt.consequent)) {
		for (const stmt of ifStmt.consequent) {
			collectCallSitesFromStatement(stmt, enclosingUdfIdentity, byName, v, out);
		}
	}
	if (Array.isArray(ifStmt.alternate)) {
		for (const stmt of ifStmt.alternate) {
			collectCallSitesFromStatement(stmt, enclosingUdfIdentity, byName, v, out);
		}
	}
	const seq = (statement as { statements?: Statement[] }).statements;
	if (Array.isArray(seq)) {
		for (const stmt of seq) {
			collectCallSitesFromStatement(stmt, enclosingUdfIdentity, byName, v, out);
		}
	}
}

function statementExpressions(statement: Statement): Expression[] {
	switch (statement.type) {
		case "VariableDeclaration":
			return (statement as VariableDeclaration).init
				? [(statement as VariableDeclaration).init as Expression]
				: [];
		case "TupleDeclaration":
			return [(statement as TupleDeclaration).init];
		case "ExpressionStatement":
			return [(statement as { expression: Expression }).expression];
		case "AssignmentStatement":
			return [(statement as { target: Expression; value: Expression }).value];
		case "ReturnStatement":
			return [(statement as { value: Expression }).value];
		case "IfStatement":
			return [(statement as IfStatement).condition];
		case "ForStatement":
			return [
				(statement as { from: Expression }).from,
				(statement as { to: Expression }).to,
				...((statement as { step?: Expression }).step
					? [(statement as { step: Expression }).step]
					: []),
			];
		case "ForInStatement":
			return [(statement as { collection: Expression }).collection];
		case "WhileStatement":
			return [(statement as { condition: Expression }).condition];
		default:
			return [];
	}
}

function collectCallSitesFromExpression(
	expr: Expression,
	enclosingUdfIdentity: string | undefined,
	byName: Map<string, UdfRecord[]>,
	v: UnifiedPineValidator,
	out: CallSite[],
): void {
	if (expr.type === "CallExpression") {
		const call = expr as CallExpression;
		const calleeName =
			call.callee.type === "Identifier"
				? call.callee.name
				: call.callee.type === "MemberExpression" &&
						call.callee.property.type === "Identifier"
					? call.callee.property.name
					: "";
		const callee = resolveCallee(calleeName, call.arguments, byName, v);
		if (callee) {
			out.push({
				calleeIdentity: callee.identity,
				enclosingUdfIdentity,
				pairs: pairArgs(callee.params, call.arguments),
			});
		}
		collectCallSitesFromExpression(
			call.callee,
			enclosingUdfIdentity,
			byName,
			v,
			out,
		);
		for (const arg of call.arguments) {
			collectCallSitesFromExpression(
				arg.value,
				enclosingUdfIdentity,
				byName,
				v,
				out,
			);
		}
		return;
	}

	for (const child of childExpressions(expr)) {
		collectCallSitesFromExpression(child, enclosingUdfIdentity, byName, v, out);
	}
}

function resolveCallee(
	calleeName: string,
	args: CallArgument[],
	byName: Map<string, UdfRecord[]>,
	v: UnifiedPineValidator,
): UdfRecord | undefined {
	if (!calleeName || v.methodDeclaredNames.has(calleeName)) return undefined;
	const candidates = byName.get(calleeName) ?? [];
	if (candidates.length === 0) return undefined;
	const positionalCount = args.filter((a) => !a.name).length;
	const named = new Set(args.flatMap((a) => (a.name ? [a.name] : [])));
	const matches = candidates.filter((u) => {
		if (positionalCount > u.params.length) return false;
		for (const name of named) {
			if (!u.params.some((p) => p.name === name)) return false;
		}
		return true;
	});
	return matches.length === 1 ? matches[0] : undefined;
}

function pairArgs(
	params: FunctionParam[],
	args: CallArgument[],
): CallSitePair[] {
	const pairs: CallSitePair[] = [];
	let positional = 0;
	for (const arg of args) {
		const param = arg.name
			? params.find((p) => p.name === arg.name)
			: params[positional++];
		if (param && !param.typeAnnotation) {
			pairs.push({ paramName: param.name, argExpr: arg.value });
		}
	}
	return pairs;
}

function childExpressions(expr: Expression): Expression[] {
	switch (expr.type) {
		case "MemberExpression":
			return [
				(expr as { object: Expression; property: Expression }).object,
				(expr as { object: Expression; property: Expression }).property,
			];
		case "BinaryExpression":
			return [
				(expr as { left: Expression; right: Expression }).left,
				(expr as { left: Expression; right: Expression }).right,
			];
		case "UnaryExpression":
			return [(expr as { argument: Expression }).argument];
		case "TernaryExpression":
			return [
				(expr as { condition: Expression }).condition,
				(expr as { consequent: Expression }).consequent,
				(expr as { alternate: Expression }).alternate,
			];
		case "ArrayExpression":
			return (expr as { elements: Expression[] }).elements;
		case "IndexExpression":
			return [
				(expr as { object: Expression; index: Expression }).object,
				(expr as { object: Expression; index: Expression }).index,
			];
		case "IfExpression":
			return [
				(expr as { condition: Expression }).condition,
				...statementListExpressions(
					(expr as { consequent: Statement[] }).consequent,
				),
				...statementListExpressions(
					(expr as { alternate?: Statement[] }).alternate ?? [],
				),
			];
		case "SwitchExpression": {
			const sw = expr as SwitchExpression;
			return [
				...(sw.discriminant ? [sw.discriminant] : []),
				...sw.cases.flatMap((c) => [
					...(c.condition ? [c.condition] : []),
					...(c.statements
						? statementListExpressions(c.statements)
						: [c.result]),
				]),
			];
		}
		default:
			return [];
	}
}

function statementListExpressions(statements: Statement[]): Expression[] {
	return statements.flatMap(statementExpressions);
}
