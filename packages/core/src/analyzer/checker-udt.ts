// User-defined-type field resolution and checks for the Pine checker, extracted
// from checker.ts. Free functions over the validator instance `v`. Covers UDT
// field typing, the CE10198 "object has no field" check, and the CE10170
// field-default type check. see INV093, INV094.

import { TYPE_NAMES } from "../../../../pine-data/v6";
import { DiagnosticSeverity } from "../common/errors";
import type {
	CallExpression,
	Expression,
	Identifier,
	MemberExpression,
	TypeDeclaration,
} from "../parser/ast";
import { KNOWN_NAMESPACES } from "./builtins";
import type { UnifiedPineValidator } from "./checker";
import { elementArgAssignable, memberChainName } from "./checker-helpers";
import { type PineType, TypeChecker } from "./types";

export function resolveUdtExpressionType(
	v: UnifiedPineValidator,
	expr: Expression,
): PineType | null {
	if (expr.type === "Identifier") {
		const symbol = v.symbolTable.lookup((expr as Identifier).name);
		const type = symbol ? TypeChecker.baseTypeName(symbol.type as string) : "unknown";
		return v.udtFieldTypes.has(type) ? (type as PineType) : null;
	}
	if (expr.type === "CallExpression") {
		const call = expr as CallExpression;
		const name =
			call.callee.type === "Identifier"
				? call.callee.name
				: memberChainName(call.callee);
		const ctor = name.match(/^(.+)\.new$/);
		return ctor && v.udtFieldTypes.has(ctor[1]) ? (ctor[1] as PineType) : null;
	}
	if (expr.type === "MemberExpression") {
		return resolveUdtFieldType(v, expr as MemberExpression);
	}
	return null;
}

export function resolveUdtFieldType(
	v: UnifiedPineValidator,
	expr: MemberExpression,
): PineType | null {
	const receiverType = resolveUdtExpressionType(v, expr.object);
	if (!receiverType) return null;
	const fields = v.udtFieldTypes.get(TypeChecker.baseTypeName(receiverType));
	if (!fields) return null;
	return fields.get(expr.property.name) ?? null;
}

export function checkUdtFieldAccess(
	v: UnifiedPineValidator,
	expr: MemberExpression,
	version: string,
): void {
	if (version !== "6") return;
	const receiverType = resolveUdtExpressionType(v, expr.object);
	if (receiverType) {
		const fields = v.udtFieldTypes.get(
			TypeChecker.baseTypeName(receiverType),
		);
		if (!fields || fields.has(expr.property.name)) return;
		emitNoField(v, expr);
		return;
	}
	// Field access on a scalar value (`close.foo`) - scalars have no fields,
	// so any member read is TV's CE10198. Restricted to a plain IDENTIFIER
	// receiver: inferring a deep-namespace member object (`strategy.commission`)
	// would surface its own "Undeclared identifier" as a side effect, and a
	// scalar sub-expression receiver is vanishingly rare. Guard against
	// namespace/type/enum names (`color.red`, `math.pi`, `chart.point`),
	// which are not scalar VALUES. see INV093
	const obj = expr.object;
	if (obj.type !== "Identifier") return;
	const n = obj.name;
	if (
		KNOWN_NAMESPACES.includes(n) ||
		TYPE_NAMES.has(n) ||
		v.declaredTypeNames.has(n) ||
		v.declaredEnumNames.has(n) ||
		v.importedNamespaces.has(n)
	) {
		return;
	}
	const objBase = TypeChecker.baseTypeName(
		v.inferExpressionType(obj, version) as string,
	);
	if (
		objBase === "int" ||
		objBase === "float" ||
		objBase === "bool" ||
		objBase === "string" ||
		objBase === "color"
	) {
		emitNoField(v, expr);
	}
}

// TV's CE10198 "Object has no field X", anchored at the member expression
// with the field name's length, deduped per property occurrence. see INV093
export function emitNoField(
	v: UnifiedPineValidator,
	expr: MemberExpression,
): void {
	const key = `${expr.property.line}:${expr.property.column}:${expr.property.name}`;
	if (v.reportedUdtFieldErrors.has(key)) return;
	v.reportedUdtFieldErrors.add(key);
	v.addError(
		expr.line || expr.property.line || 0,
		expr.column || expr.property.column || 0,
		expr.property.name.length,
		`Object has no field ${expr.property.name}`,
		DiagnosticSeverity.Error,
	);
}

// UDT field default value type check (CE10170): a literal default must be
// assignable to the field's declared type - int->float widening is fine, but
// float->int narrowing (and any base mismatch) is rejected (the INV087
// element rule). The parser captures only literal defaults; non-literals stay
// lenient. v6 only (G004). see INV094
export function checkTypeFieldDefaults(
	v: UnifiedPineValidator,
	statement: TypeDeclaration,
	version: string,
): void {
	if (version !== "6" || !statement.fields) return;
	for (const field of statement.fields) {
		if (!field.defaultValue || !field.typeAnnotation) continue;
		const fb = TypeChecker.baseTypeName(field.typeAnnotation.name);
		if (fb !== "int" && fb !== "float" && fb !== "bool" && fb !== "string") {
			continue; // color/array/map/UDT field defaults -> lenient
		}
		const defType = v.inferExpressionType(field.defaultValue, version);
		if (elementArgAssignable(defType, fb)) continue;
		const desc = v.describeArgForTemplate(
			field.defaultValue,
			defType,
			version,
		);
		v.addTemplateError({
			line: field.line ?? statement.line,
			column: field.column ?? statement.column,
			length: field.name.length,
			message:
				"Default value of type {defValTypeExpression} can not be assigned to an argument of type {explicitType}",
			severity: DiagnosticSeverity.Error,
			code: "CE10170",
			ctx: {
				defValTypeExpression: desc.typeStr,
				explicitType: `series ${fb}`,
			},
		});
	}
}
