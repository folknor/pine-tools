// User-defined-type field resolution and checks for the Pine checker, extracted
// from checker.ts. Free functions over the validator instance `v`. Covers UDT
// field typing, the CE10198 "object has no field" check, and the CE10170
// field-default type check. see INV093, INV094.

import {
	LIBRARY_FOREIGN_TYPE_REFS,
	TYPE_NAMES,
} from "../../../../pine-data/v6";
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
		const type = symbol
			? TypeChecker.baseTypeName(symbol.type as string)
			: "unknown";
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

/**
 * TV requires a library to be imported EXPLICITLY when a UDT you use has fields
 * referencing THAT library's types: using `PF.Profile` after importing only
 * lib_profile draws one error per referencing field type, naming the declaring
 * library. We were silent (INV140 p07, the live residual of TODO #41).
 *
 * The trigger is a MEMBER ACCESS on a value of the type, not the declaration:
 * `PF.Profile p = na` alone is clean on TV, and so is a param that is never
 * used - only touching a member does it (probed q01/q05/q08). One error per
 * distinct foreign type per SCRIPT, in field-declaration order.
 *
 * FP-safe by construction: a library we do not vendor has no
 * LIBRARY_FOREIGN_TYPE_REFS entry, and a field type whose alias did not resolve
 * to one of that library's own imports was never recorded, so both stay silent.
 *
 * ANCHOR - TV uses two different ones, and both are matched here. A METHOD CALL
 * (`p.hide()`) anchors at the call. A plain FIELD access (`p.poc`) anchors at
 * the SCRIPT DECLARATION statement instead, which first read like a degenerate
 * fallback (it landed on 2:1 in two probes) but is real: moving the
 * `indicator()` call down the file moved the anchor with it. Callers pass the
 * position appropriate to their trigger. see INV143
 */
export function checkTransitiveLibraryImports(
	v: UnifiedPineValidator,
	receiverType: string | null | undefined,
	line: number,
	column: number,
	length: number,
): void {
	if (!receiverType) return;
	const base = TypeChecker.baseTypeName(receiverType);
	const dot = base.indexOf(".");
	if (dot <= 0) return;
	const libraryPath = v.importedLibraryPaths.get(base.slice(0, dot));
	if (!libraryPath) return;
	const refs = LIBRARY_FOREIGN_TYPE_REFS[libraryPath]?.[base.slice(dot + 1)];
	if (!refs) return;
	const imported = new Set(v.importedLibraryPaths.values());
	for (const ref of refs) {
		if (imported.has(ref.library)) continue;
		const key = `${ref.type}@${ref.library}`;
		if (v.reportedTransitiveImports.has(key)) continue;
		v.reportedTransitiveImports.add(key);
		v.addError(
			line,
			column,
			length,
			`The type "${ref.type}" is declared in the "${ref.library}" library, but the library is not explicitly imported. To use the type, import that library`,
			DiagnosticSeverity.Error,
		);
	}
}

export function checkUdtFieldAccess(
	v: UnifiedPineValidator,
	expr: MemberExpression,
	version: string,
): void {
	if (version !== "6") return;
	const receiverType = resolveUdtExpressionType(v, expr.object);
	// Field-access trigger for the transitive-import rule, anchored at the script
	// declaration statement per TV. With no declaration statement to anchor to
	// (an incomplete script) we stay silent rather than invent a position.
	if (v.declarationStatementPos) {
		checkTransitiveLibraryImports(
			v,
			receiverType,
			v.declarationStatementPos.line,
			v.declarationStatementPos.column,
			expr.property.name.length,
		);
	}
	if (receiverType) {
		const fields = v.udtFieldTypes.get(TypeChecker.baseTypeName(receiverType));
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

// Duplicate UDT field (CE10186): two fields with the same name inside one
// `type` declaration. TV anchors at the SECOND (duplicate) occurrence and
// rejects it; the first field's type wins. v6 only (G004). see INV097
export function checkDuplicateUdtFields(
	v: UnifiedPineValidator,
	statement: TypeDeclaration,
	version: string,
): void {
	if (version !== "6" || !statement.fields) return;
	const seen = new Set<string>();
	for (const field of statement.fields) {
		if (seen.has(field.name)) {
			v.addTemplateError({
				line: field.line ?? statement.line,
				column: field.column ?? statement.column,
				length: field.name.length,
				message: "Duplicated field: '{fieldName}'.",
				severity: DiagnosticSeverity.Error,
				code: "CE10186",
				ctx: { fieldName: field.name },
			});
			continue;
		}
		seen.add(field.name);
	}
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
		const desc = v.describeArgForTemplate(field.defaultValue, defType, version);
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
