import type {
	BinaryExpression,
	CallExpression,
	Expression,
	ExpressionStatement,
	FunctionDeclaration,
	Identifier,
	IfExpression,
	IfStatement,
	MemberExpression,
	ReturnStatement,
	Statement,
	SwitchExpression,
	TernaryExpression,
	UnaryExpression,
} from "../parser/ast";
import {
	getBuiltinVarInfo,
	isBuiltinConstant,
	resolveCallReturnRaw,
} from "./builtins";
import type { UnifiedPineValidator } from "./checker";
import { memberChainName } from "./checker-helpers";
import {
	joinQualifier,
	leadingQualifierOf,
	type Provenance,
	type Qualifier,
} from "./qualifier";
import { TypeChecker } from "./types";

export interface ProvenancePolicy {
	// Conservative by default. Loop 1's live callers preserve previous verdicts;
	// later gates opt in when they are ready to trust UDFs and user vars. see INV122
	trustUdfAndUserVars?: boolean;
}

export interface UdfBodyRecord {
	declaration: FunctionDeclaration;
	body: Statement[];
}

function baseOf(raw: string): string {
	return TypeChecker.baseTypeName(raw);
}

function unknownToNull(prov: Provenance): Provenance | null {
	return prov.base === "unknown" ? null : prov;
}

function resultBase(
	v: UnifiedPineValidator,
	expr: Expression,
	version: string,
): string | null {
	const base = TypeChecker.baseTypeName(
		String(v.inferExpressionType(expr, version)),
	);
	return base === "unknown" ? null : base;
}

function returnExpression(body: Statement[]): Expression | null {
	for (const stmt of body) {
		if (stmt.type === "ReturnStatement") {
			return (stmt as ReturnStatement).value;
		}
	}
	return branchValue(body);
}

// The value of an if-expression branch is its tail expression, mirroring how
// SwitchCase.result is the arm's value expression (the last statement's value),
// not the whole branch body. A branch whose tail is not an expression has no
// readable value -> null (lenient).
function branchValue(body: Statement[]): Expression | null {
	const tail = body[body.length - 1];
	return tail?.type === "ExpressionStatement"
		? (tail as ExpressionStatement).expression
		: null;
}

function joinProvenance(
	v: UnifiedPineValidator,
	exprs: Expression[],
	baseExpr: Expression,
	version: string,
	policy: ProvenancePolicy,
	seenUdfs: Set<string>,
): Provenance | null {
	let qualifier: Qualifier | null = null;
	for (const e of exprs) {
		const p = qualifierProvenanceInternal(v, e, version, policy, seenUdfs);
		if (!p) return null;
		qualifier = qualifier ? joinQualifier(qualifier, p.qualifier) : p.qualifier;
	}
	const base = resultBase(v, baseExpr, version);
	return base && qualifier ? { base, qualifier } : null;
}

/**
 * The qualifier of the value a BODY evaluates to.
 *
 * Mostly this is `returnExpression`'s single expression, but a body whose tail
 * is a STATEMENT-form `if` has no single value expression, and that tail is how
 * a user function returns a branch value:
 *
 * ```pine
 * f() =>
 *     if close > open
 *         "a"
 *     else
 *         "b"
 * ```
 *
 * TV types that `series string` - the qualifier comes from the CONDITION, not
 * from the branches, which are both const here. So the join is over condition
 * plus both branch values, exactly like the `IfExpression` and `Ternary` cases
 * below; the difference is only that this shape reaches us as a statement.
 * Recursive, so nested `if` tails fold too. A missing `else`, or a branch with
 * no readable value, yields null (lenient). see INV156
 */
function bodyValueProvenance(
	v: UnifiedPineValidator,
	body: Statement[],
	version: string,
	policy: ProvenancePolicy,
	seenUdfs: Set<string>,
): Provenance | null {
	const ret = returnExpression(body);
	if (ret) {
		return qualifierProvenanceInternal(v, ret, version, policy, seenUdfs);
	}
	const tail = body[body.length - 1];
	if (tail?.type !== "IfStatement") return null;
	const ifs = tail as IfStatement;
	if (!ifs.alternate) return null;
	const cons = bodyValueProvenance(
		v,
		ifs.consequent,
		version,
		policy,
		seenUdfs,
	);
	const alt = bodyValueProvenance(v, ifs.alternate, version, policy, seenUdfs);
	const cond = qualifierProvenanceInternal(
		v,
		ifs.condition,
		version,
		policy,
		seenUdfs,
	);
	if (!cons || !alt || !cond) return null;
	return {
		base: cons.base,
		qualifier: joinQualifier(
			joinQualifier(cons.qualifier, alt.qualifier),
			cond.qualifier,
		),
	};
}

function udfCallProvenance(
	v: UnifiedPineValidator,
	name: string,
	version: string,
	policy: ProvenancePolicy,
	seenUdfs: Set<string>,
): Provenance | null {
	if (!policy.trustUdfAndUserVars) return null;
	if (seenUdfs.has(name)) return null;
	if (v.methodDeclaredNames.has(name)) return null;
	const records = v.udfBodyRecords.get(name);
	if (records?.length !== 1) return null;
	seenUdfs.add(name);
	const prov = bodyValueProvenance(
		v,
		records[0].body,
		version,
		policy,
		seenUdfs,
	);
	seenUdfs.delete(name);
	return prov;
}

function qualifierProvenanceInternal(
	v: UnifiedPineValidator,
	expr: Expression,
	version: string,
	policy: ProvenancePolicy,
	seenUdfs: Set<string>,
): Provenance | null {
	switch (expr.type) {
		case "Literal": {
			const type = v.inferExpressionType(expr, version);
			return unknownToNull({ base: baseOf(String(type)), qualifier: "const" });
		}
		case "Identifier": {
			const name = (expr as Identifier).name;
			const info = getBuiltinVarInfo(name);
			if (info) {
				return { base: info.base, qualifier: info.qualifier as Qualifier };
			}
			const sym = v.symbolTable.lookup(name);
			const symType = sym?.type as string | undefined;
			const declared = symType ? leadingQualifierOf(symType) : undefined;
			// A `:=` after the declaration raises the qualifier for every later
			// read - `n = 5` / `n := int(close)` makes `n` a series int. The
			// promotion is recorded beside the symbol, so join it in here
			// rather than reading a qualifier off `symbol.type`. see INV157
			const promoted = sym ? v.promotedQualifierFor(sym) : undefined;
			const q =
				declared && promoted
					? joinQualifier(declared, promoted)
					: (promoted ?? declared);
			if (
				sym?.kind === "variable" &&
				q &&
				(policy.trustUdfAndUserVars || q === "series" || q === "input")
			) {
				return { base: baseOf(symType ?? "unknown"), qualifier: q };
			}
			return null;
		}
		case "MemberExpression": {
			const m = expr as MemberExpression;
			if (m.object.type !== "Identifier") return null;
			const name = `${(m.object as Identifier).name}.${m.property.name}`;
			if (isBuiltinConstant(name)) {
				const base = TypeChecker.baseTypeName(
					String(v.inferExpressionType(expr, version)),
				);
				return base === "unknown" ? null : { base, qualifier: "const" };
			}
			const info = getBuiltinVarInfo(name);
			if (info) {
				return { base: info.base, qualifier: info.qualifier as Qualifier };
			}
			return null;
		}
		case "CallExpression": {
			const ce = expr as CallExpression;
			const name = memberChainName(ce.callee);
			if (!name) return null;
			const argTypes = ce.arguments.map((a) =>
				v.inferExpressionType(a.value, version),
			);
			const raw = resolveCallReturnRaw(name, argTypes);
			const q = raw ? leadingQualifierOf(raw) : undefined;
			if (raw && q) return { base: baseOf(raw), qualifier: q };
			return udfCallProvenance(v, name, version, policy, seenUdfs);
		}
		case "UnaryExpression":
			return qualifierProvenanceInternal(
				v,
				(expr as UnaryExpression).argument,
				version,
				policy,
				seenUdfs,
			);
		case "BinaryExpression": {
			const b = expr as BinaryExpression;
			return joinProvenance(
				v,
				[b.left, b.right],
				expr,
				version,
				policy,
				seenUdfs,
			);
		}
		case "TernaryExpression": {
			const t = expr as TernaryExpression;
			return joinProvenance(
				v,
				[t.condition, t.consequent, t.alternate],
				expr,
				version,
				policy,
				seenUdfs,
			);
		}
		case "SwitchExpression": {
			if (!policy.trustUdfAndUserVars) return null;
			const sw = expr as SwitchExpression;
			const parts: Expression[] = [];
			if (sw.discriminant) parts.push(sw.discriminant);
			for (const c of sw.cases) {
				if (c.condition) parts.push(c.condition);
				parts.push(c.result);
			}
			return parts.length
				? joinProvenance(v, parts, expr, version, policy, seenUdfs)
				: null;
		}
		case "IfExpression": {
			// New branch (HEAD's exprQualifier had no IfExpression case and fell to
			// the null default). Like SwitchExpression it must floor to null under
			// the conservative policy, or a series-conditioned if-expression argument
			// fed to the INV113 check would flip from null to "series" and manufacture
			// a new CE10123 - a Loop 1 verdict change. see INV122 (R2-H4)
			if (!policy.trustUdfAndUserVars) return null;
			const ife = expr as IfExpression;
			// Join the condition with each branch's VALUE expression (its tail),
			// exactly like the Ternary join over condition/consequent/alternate and
			// like SwitchCase.result. Pushing every ExpressionStatement of both
			// branches would over-approximate the qualifier with non-value
			// statements. An if-expression used as a value always has an else
			// branch; a branch with no readable value expression -> null (lenient).
			const consVal = branchValue(ife.consequent);
			const altVal = ife.alternate ? branchValue(ife.alternate) : null;
			if (!consVal || !altVal) return null;
			return joinProvenance(
				v,
				[ife.condition, consVal, altVal],
				expr,
				version,
				policy,
				seenUdfs,
			);
		}
		default:
			return null;
	}
}

// Single canonical resolver for "what is this expression's qualifier and base".
// The conservative default policy reproduces the legacy exprQualifier outputs;
// the trusting policy unlocks the UDF and broad user-var branches. see INV122
export function qualifierProvenance(
	v: UnifiedPineValidator,
	expr: Expression,
	version: string,
	policy: ProvenancePolicy = {},
): Provenance | null {
	return qualifierProvenanceInternal(v, expr, version, policy, new Set());
}

/**
 * `array.from(0, 0, 0)` in an `array<float>` context.
 *
 * `array.from` has both an `int`-element overload and an `int/float` one
 * returning `array<float>`, and TV picks between them using the CONST-ness of
 * the arguments, not their literal spelling: with every argument a const int
 * the call widens to `array<float>`, and one non-const `int` argument stops it.
 * Probed 2026-08-23 - `array<float> a = array.from(k, k, k)` with `int k = 0`
 * is CE10173 "Cannot assign a value of the array<int> type", while
 * `array.from(0, 0, 0)`, `array.from(0, 1 + 2)`, the same call as a `T.new`
 * argument and as a `t.v :=` right-hand side are all clean. A single non-const
 * argument mixed in (`array.from(0, k)`) errors. see INV155
 *
 * This is the collection form of the ordinary const-int-to-float promotion
 * (`float x = 0`), so it is decided the same way - by the argument's provenance
 * - rather than by testing for a Literal node.
 */
export function arrayFromWidensToFloat(
	v: UnifiedPineValidator,
	value: Expression,
	valueType: string,
	targetType: string,
	version: string,
): boolean {
	if (TypeChecker.baseTypeName(valueType) !== "array<int>") return false;
	if (TypeChecker.baseTypeName(targetType) !== "array<float>") return false;
	if (value.type !== "CallExpression") return false;
	const call = value as CallExpression;
	if (memberChainName(call.callee) !== "array.from") return false;
	if (call.arguments.length === 0) return false;
	return call.arguments.every((arg) => {
		const prov = qualifierProvenance(v, arg.value, version);
		return prov?.qualifier === "const" && prov.base === "int";
	});
}
