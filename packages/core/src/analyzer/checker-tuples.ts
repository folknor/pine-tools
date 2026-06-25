// Tuple-shape inference for the Pine checker, extracted from checker.ts. These
// recover per-element types and arities for tuple destructures (`[a, b] = f()`)
// and the two tuple-destructure diagnostics. Free functions over the validator
// instance `v`; they call back into v.inferExpressionType and the symbol table.
// see INV010, INV030, INV049, INV058.

import type {
	ArrayExpression,
	CallExpression,
	Expression,
	ExpressionStatement,
	FunctionParam,
	IfExpression,
	IfStatement,
	ReturnStatement,
	Statement,
	SwitchExpression,
	TupleDeclaration,
} from "../parser/ast";
import {
	builtinCallTupleness,
	builtinTupleReturns,
	KNOWN_NAMESPACES,
	mapToPineType,
} from "./builtins";
import type { UnifiedPineValidator } from "./checker";
import { memberChainName } from "./checker-helpers";
import { type PineType, TypeChecker } from "./types";

/**
 * Infer types for tuple elements from the init expression.
 * For request.security with array argument, extracts element types.
 */
export function inferTupleElementTypes(
	v: UnifiedPineValidator,
	tupleDecl: TupleDeclaration,
	version: string = "6",
): PineType[] {
	return tupleInitElementTypes(
		v,
		tupleDecl.init,
		version,
		tupleDecl.names.length,
	);
}

// Per-element types for a tuple-producing init expression. Beyond the
// CallExpression shapes (request.security's tuple expression arg, UDF tuple
// returns - see INV010), the init can be an if/switch EXPRESSION whose branch
// tails are themselves tuple-producing; without descending into them every
// element defaulted to series<float> and a destructured bool drew "condition
// must be bool" FPs downstream. see INV049.
// (A BARE tuple literal init is itself invalid Pine - the parser emits TV's
// `Syntax error at input "["` - but we still type its elements for recovery.)
export function tupleInitElementTypes(
	v: UnifiedPineValidator,
	expr: Expression,
	version: string,
	expectedCount?: number,
): PineType[] {
	switch (expr.type) {
		case "ArrayExpression": {
			return (expr as ArrayExpression).elements.map((elem) =>
				v.inferExpressionType(elem, version),
			);
		}

		case "CallExpression": {
			const elementTypes: PineType[] = [];
			const call = expr as CallExpression;
			let funcName = "";
			if (call.callee.type === "Identifier") {
				funcName = call.callee.name;
			} else if (call.callee.type === "MemberExpression") {
				const member = call.callee;
				if (member.object.type === "Identifier") {
					funcName = `${member.object.name}.${member.property.name}`;
				}
			}

			// request.security / request.security_lower_tf pass the tuple
			// shape of their expression arg through: a tuple literal, a
			// tuple-returning call (UDF or builtin), or an if/switch
			// expression all yield a tuple of that arity - recurse on the
			// arg as if it were the init itself. For _lower_tf each
			// element is an ARRAY of the expression's element type (one
			// value per intrabar). see TODO #51.
			if (
				funcName === "request.security" ||
				funcName === "request.security_lower_tf"
			) {
				const named = call.arguments.find((a) => a.name === "expression");
				const exprArg =
					named?.value ??
					(call.arguments.length >= 3 ? call.arguments[2].value : undefined);
				if (exprArg) {
					const inner = tupleInitElementTypes(
						v,
						exprArg,
						version,
						expectedCount,
					);
					for (const t of inner) {
						if (funcName === "request.security_lower_tf") {
							const base = TypeChecker.baseTypeName(t as string);
							elementTypes.push(
								t === "unknown" ? "unknown" : (`array<${base}>` as PineType),
							);
						} else {
							elementTypes.push(t);
						}
					}
				}
			}

			// User-defined function whose body evaluates to a tuple -
			// recover the per-element types we captured when the
			// function was validated. Without this every element defaults
			// to `series<float>` and a destructured bool / int / color
			// element gets wrongly typed downstream. see INV010. A name
			// can carry several shapes (overloads); prefer the one whose
			// arity matches the destructure.
			if (elementTypes.length === 0 && funcName) {
				const shapes =
					v.udfTupleReturnTypes.get(funcName) ??
					receiverMethodTupleShapes(v, call);
				if (shapes) {
					const byArity =
						expectedCount === undefined
							? undefined
							: shapes.find((s) => s.length === expectedCount);
					for (const t of byArity ?? shapes[0]) elementTypes.push(t);
				}
			}

			// Builtin whose tuple shape lives in the catalog's overload
			// returns (ta.macd/bb/kc/dmi/supertrend, and ta.vwap whose
			// merged `returns` is frozen to its scalar overload). see
			// TODO #51 blocker 3.
			if (elementTypes.length === 0 && funcName) {
				const shapes = builtinTupleReturns(funcName);
				if (shapes.length > 0) {
					const byArity =
						expectedCount === undefined
							? undefined
							: shapes.find((s) => s.length === expectedCount);
					for (const t of byArity ?? shapes[0])
						elementTypes.push(mapToPineType(t));
				}
			}
			return elementTypes;
		}

		case "IfExpression": {
			const ifExpr = expr as IfExpression;
			return mergeTupleBranchTypes([
				branchTailTupleTypes(v, ifExpr.consequent, version, expectedCount),
				branchTailTupleTypes(v, ifExpr.alternate, version, expectedCount),
			]);
		}

		case "SwitchExpression": {
			const switchExpr = expr as SwitchExpression;
			return mergeTupleBranchTypes(
				switchExpr.cases.map((c) =>
					// When `statements` is present, `result` is the last
					// statement's expression - visit statements INSTEAD of
					// result (see SwitchCase in ast.ts / TODO #33).
					c.statements
						? branchTailTupleTypes(v, c.statements, version, expectedCount)
						: tupleInitElementTypes(v, c.result, version, expectedCount),
				),
			);
		}
	}

	return [];
}

// `[v, t] = data.valueAtTime(ts)` - a UDF method called on a receiver
// registers under its bare name, so the dotted lookup misses. Fall back
// to the property name, but never for a builtin namespace object
// (`ta.macd` must not hit a same-named user method).
export function receiverMethodTupleShapes(
	v: UnifiedPineValidator,
	call: CallExpression,
): PineType[][] | undefined {
	if (call.callee.type !== "MemberExpression") return undefined;
	const member = call.callee;
	if (member.object.type !== "Identifier") return undefined;
	if (KNOWN_NAMESPACES.includes(member.object.name)) return undefined;
	return v.udfTupleReturnTypes.get(member.property.name);
}

// Classify how many tuple elements an init expression can produce, for
// TV's two tuple-destructure errors (probes p01-p10, INV058): the SHAPE
// error (RHS cannot produce a tuple at all) and the COUNT error (tuple
// of the wrong arity). "unknown" disables both - anything we cannot
// positively classify must stay silent; the first draft of this check
// treated unclassifiable as scalar and shipped 51 FPs (TODO #51).
export function tupleInitArity(
	v: UnifiedPineValidator,
	expr: Expression,
	version: string,
):
	| { kind: "tuple"; arities: number[] }
	| { kind: "scalar" }
	| { kind: "unknown" } {
	switch (expr.type) {
		case "ArrayExpression":
			return {
				kind: "tuple",
				arities: [(expr as ArrayExpression).elements.length],
			};

		// None of these can produce a tuple in Pine - tuples only come
		// from calls and block structures (TV's SHAPE wording). A bare
		// identifier is scalar regardless of its type.
		case "Literal":
		case "Identifier":
		case "BinaryExpression":
		case "UnaryExpression":
		case "TernaryExpression":
		case "MemberExpression":
		case "IndexExpression":
			return { kind: "scalar" };

		case "CallExpression": {
			const call = expr as CallExpression;
			// In-call recovery dropped arguments (INV047) - and the named
			// args below would be incomplete.
			if (call.recovered) return { kind: "unknown" };
			const funcName = memberChainName(call.callee);
			if (!funcName) return { kind: "unknown" };

			// request.* passes its expression arg's shape through, scalar
			// included (probe p08: scalar expr destructured is the SHAPE
			// error).
			if (
				funcName === "request.security" ||
				funcName === "request.security_lower_tf"
			) {
				const named = call.arguments.find((a) => a.name === "expression");
				const exprArg =
					named?.value ??
					(call.arguments.length >= 3 ? call.arguments[2].value : undefined);
				return exprArg
					? tupleInitArity(v, exprArg, version)
					: { kind: "unknown" };
			}

			// UDF / user-method tuple shapes captured by INV057.
			const udfShapes =
				v.udfTupleReturnTypes.get(funcName) ??
				receiverMethodTupleShapes(v, call);
			if (udfShapes)
				return {
					kind: "tuple",
					arities: udfShapes.map((s) => s.length),
				};

			// A declared UDF with no captured tuple shape: scalar only when
			// its inferred return type is concrete (capture and return
			// inference share the same tail descent, so a tuple our capture
			// missed would have left the return type unknown too).
			if (v.declaredFunctionNames.has(funcName)) {
				const sym = v.symbolTable.lookup(funcName);
				if (
					sym &&
					(sym.kind === "function" || sym.kind === "method") &&
					sym.type !== "unknown"
				) {
					return { kind: "scalar" };
				}
				return { kind: "unknown" };
			}

			// Builtin: catalog overload returns, args-aware for the mixed
			// scalar/tuple case (ta.vwap). Void returns are scalar for the
			// SHAPE question (probe p07).
			return builtinCallTupleness(
				funcName,
				call.arguments.filter((a) => !a.name).length,
				call.arguments.flatMap((a) => (a.name ? [a.name] : [])),
			);
		}

		case "IfExpression": {
			const ifExpr = expr as IfExpression;
			return mergeBranchArities([
				branchTailArity(v, ifExpr.consequent, version),
				branchTailArity(v, ifExpr.alternate, version),
			]);
		}

		case "SwitchExpression": {
			const switchExpr = expr as SwitchExpression;
			return mergeBranchArities(
				switchExpr.cases.map((c) =>
					c.statements
						? branchTailArity(v, c.statements, version)
						: tupleInitArity(v, c.result, version),
				),
			);
		}
	}
	return { kind: "unknown" };
}

export function branchTailArity(
	v: UnifiedPineValidator,
	stmts: Statement[] | undefined,
	version: string,
):
	| { kind: "tuple"; arities: number[] }
	| { kind: "scalar" }
	| { kind: "unknown" } {
	if (!stmts || stmts.length === 0) return { kind: "unknown" };
	const last = stmts[stmts.length - 1];
	if (last.type === "ExpressionStatement") {
		return tupleInitArity(v, (last as ExpressionStatement).expression, version);
	}
	if (last.type === "ReturnStatement") {
		const value = (last as ReturnStatement).value;
		return value ? tupleInitArity(v, value, version) : { kind: "unknown" };
	}
	if (last.type === "IfStatement") {
		const ifStmt = last as IfStatement;
		return mergeBranchArities([
			branchTailArity(v, ifStmt.consequent, version),
			branchTailArity(v, ifStmt.alternate, version),
		]);
	}
	return { kind: "unknown" };
}

// All branches scalar -> scalar (probe p09: an if with scalar tails
// destructured is the SHAPE error). All tuple -> union of arities.
// Anything mixed or unknown -> unknown (TV's behavior for a structure
// mixing scalar and tuple tails is unprobed - stay silent).
export function mergeBranchArities(
	branches: Array<
		| { kind: "tuple"; arities: number[] }
		| { kind: "scalar" }
		| { kind: "unknown" }
	>,
):
	| { kind: "tuple"; arities: number[] }
	| { kind: "scalar" }
	| { kind: "unknown" } {
	if (branches.length === 0) return { kind: "unknown" };
	if (branches.some((b) => b.kind === "unknown")) return { kind: "unknown" };
	if (branches.every((b) => b.kind === "scalar")) return { kind: "scalar" };
	if (branches.every((b) => b.kind === "tuple")) {
		const arities = [
			...new Set(
				branches.flatMap((b) => (b.kind === "tuple" ? b.arities : [])),
			),
		];
		return { kind: "tuple", arities };
	}
	return { kind: "unknown" };
}

// Tuple element types a statement block evaluates to: the tail
// statement's value expression, descending nested if tails (the same
// descent tailTupleExpr does for UDF bodies, but yielding types so
// branches can merge).
export function branchTailTupleTypes(
	v: UnifiedPineValidator,
	stmts: Statement[] | undefined,
	version: string,
	expectedCount?: number,
): PineType[] {
	if (!stmts || stmts.length === 0) return [];
	const last = stmts[stmts.length - 1];
	if (last.type === "ExpressionStatement") {
		return tupleInitElementTypes(
			v,
			(last as ExpressionStatement).expression,
			version,
			expectedCount,
		);
	}
	if (last.type === "ReturnStatement") {
		const value = (last as ReturnStatement).value;
		return value ? tupleInitElementTypes(v, value, version, expectedCount) : [];
	}
	if (last.type === "IfStatement") {
		const ifStmt = last as IfStatement;
		return mergeTupleBranchTypes([
			branchTailTupleTypes(v, ifStmt.consequent, version, expectedCount),
			branchTailTupleTypes(v, ifStmt.alternate, version, expectedCount),
		]);
	}
	return [];
}

// Merge per-branch tuple element types. For each element prefer the
// first branch with a real type: a default branch is typically
// `[na, na, false]`, so an `na` element defers to a sibling branch
// that knows better (the same reasoning behind tailTupleExpr's
// consequent preference - see INV030).
export function mergeTupleBranchTypes(branches: PineType[][]): PineType[] {
	const candidates = branches.filter((types) => types.length > 0);
	if (candidates.length === 0) return [];
	const length = Math.max(...candidates.map((types) => types.length));
	const merged: PineType[] = [];
	for (let i = 0; i < length; i++) {
		let pick: PineType | undefined;
		for (const types of candidates) {
			const t = types[i];
			if (!t) continue;
			if (t !== "na") {
				pick = t;
				break;
			}
			if (!pick) pick = t;
		}
		merged.push(pick ?? "series<float>");
	}
	return merged;
}

// Record a captured tuple-return shape under the UDF's name. Same-arity
// re-captures replace (idempotent across passes); a different arity is a
// genuine overload (function + method overloads share a name) and
// accumulates so the destructure site can pick by element count.
export function recordUdfTupleReturn(
	v: UnifiedPineValidator,
	name: string,
	types: PineType[],
): void {
	const existing = v.udfTupleReturnTypes.get(name);
	if (!existing) {
		v.udfTupleReturnTypes.set(name, [types]);
		return;
	}
	const sameArity = existing.findIndex((t) => t.length === types.length);
	if (sameArity >= 0) existing[sameArity] = types;
	else existing.push(types);
}

/**
 * If the function body evaluates to a tuple, infer per-element types
 * under the same temp scope inferFunctionReturnType uses. The tail
 * descent (branchTailTupleTypes) covers trailing tuple literals,
 * `return`s, and if/switch tails whose arms produce tuples (the
 * hslToRGB shape - a trailing discriminantless switch with tuple
 * arms). Returns undefined when the body doesn't produce a tuple.
 * see INV010, INV030.
 */
export function inferUdfTupleReturnTypes(
	v: UnifiedPineValidator,
	body: Statement[],
	version: string,
	params?: FunctionParam[],
): PineType[] | undefined {
	if (body.length === 0) return undefined;

	// Mirror inferFunctionReturnType's temp-scope setup so the
	// element-type inference sees the parameters and any locals - and
	// its cache isolation: this pass guesses series<float> for untyped
	// params, and caching under that guess poisons the validation pass.
	// see INV026.
	const savedExpressionTypes = v.expressionTypes;
	v.expressionTypes = new Map();
	v.symbolTable.enterScope();
	if (params) {
		for (const param of params) {
			const paramType: PineType = param.typeAnnotation
				? mapToPineType(param.typeAnnotation.name)
				: "series<float>";
			v.symbolTable.define({
				name: param.name,
				type: paramType,
				line: 0,
				column: 0,
				used: false,
				kind: "variable",
				declaredWith: null,
			});
		}
	}
	for (const stmt of body) {
		v.collectDeclarations(stmt, version);
	}

	const types = branchTailTupleTypes(v, body, version);
	v.symbolTable.exitScope();
	v.expressionTypes = savedExpressionTypes;
	return types.length > 0 ? types : undefined;
}

/**
 * Define tuple element variables in the symbol table.
 */
export function defineTupleVariables(
	v: UnifiedPineValidator,
	tupleDecl: TupleDeclaration,
	elementTypes: PineType[],
): void {
	for (let i = 0; i < tupleDecl.names.length; i++) {
		const name = tupleDecl.names[i];
		// Use the inferred element type. When inference produced nothing
		// (an import-alias call - #41's data gap - or any shape we can't
		// classify), the element is UNKNOWN, not series<float>: guessing
		// float made every destructured color/bool from a library call a
		// type-mismatch FP downstream (INV049 residual, INV059).
		const varType = elementTypes[i] || "unknown";

		v.symbolTable.define({
			name,
			type: varType,
			line: tupleDecl.line,
			column: tupleDecl.column,
			used: false,
			kind: "variable",
			declaredWith: null,
		});
	}
}
