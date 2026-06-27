import type {
	BinaryExpression,
	CallExpression,
	Expression,
	ExpressionStatement,
	FunctionDeclaration,
	Identifier,
	IfExpression,
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
	const ret = returnExpression(records[0].body);
	if (!ret) return null;
	seenUdfs.add(name);
	const prov = qualifierProvenanceInternal(v, ret, version, policy, seenUdfs);
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
			const q = symType ? leadingQualifierOf(symType) : undefined;
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
