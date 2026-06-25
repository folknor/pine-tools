// Declaration-time checks and registrations for the Pine checker, extracted
// from checker.ts. Free functions over the validator instance `v`. Covers UDT/
// enum registration, the CE10149 type-annotation checks, CE10095 redeclaration,
// CE10190 builtin shadowing, exported-param typing, and CE10110/10112/10113
// function redefinition. The scope stack push/pop and collectDeclarations stay
// on the validator (heavily called from the statement walk). see INV023, INV033,
// INV035, INV052, INV091, INV096.

import { TYPE_NAMES } from "../../../../pine-data/v6";
import { DiagnosticSeverity } from "../common/errors";
import { TYPE_KEYWORDS } from "../constants/keywords";
import type { FunctionDeclaration, Statement } from "../parser/ast";
import { mapToPineType } from "./builtins";
import type { UnifiedPineValidator } from "./checker";
import { type PineType, TypeChecker } from "./types";

export function annotationToSymbolType(
	v: UnifiedPineValidator,
	name: string,
): PineType {
	const mapped = mapToPineType(name);
	if (mapped !== "unknown") return mapped;
	const base = TypeChecker.baseTypeName(name);
	return v.declaredTypeNames.has(base) ? (base as PineType) : "unknown";
}

// Record an enum's member names so `E.member` can be typed as the enum.
// see INV096
export function recordEnumMembers(
	v: UnifiedPineValidator,
	statement: Statement,
): void {
	if (statement.type !== "EnumDeclaration") return;
	const members = statement.members;
	if (members && members.length > 0) {
		v.enumMemberNames.set(statement.name, new Set(members));
	}
}

export function registerTypeDeclaration(
	v: UnifiedPineValidator,
	statement: Statement,
): void {
	if (statement.type !== "TypeDeclaration") return;
	v.declaredTypeNames.add(statement.name);
	const fields = new Map<string, PineType>();
	for (const field of statement.fields ?? []) {
		if (!field.typeAnnotation) continue;
		const mapped = mapToPineType(field.typeAnnotation.name);
		const base = TypeChecker.baseTypeName(field.typeAnnotation.name);
		fields.set(
			field.name,
			mapped !== "unknown"
				? mapped
				: v.declaredTypeNames.has(base)
					? (base as PineType)
					: "unknown",
		);
	}
	v.udtFieldTypes.set(statement.name, fields);
}

// TV's CE10190 (probed 2026-06-04, see INV023 / TODO #40): declaring
// a variable named after a built-in VARIABLE errors when the built-in
// was referenced anywhere EARLIER in source - any scope, global
// redeclarations included. Without a prior use only the CW10011
// warning (SemanticAnalyzer channel) applies. v6-only, like the other
// shadow/unused machinery - legacy scripts stay lenient (G004).
export function checkBuiltinShadowDeclaration(
	v: UnifiedPineValidator,
	name: string,
	line: number,
	column: number,
	version: string,
): void {
	if (version !== "6") return;
	if (!v.usedBuiltins.has(name)) return;
	v.addError(
		line,
		column,
		name.length,
		`Cannot shadow the built-in variable '${name}' because it has already been used as a built-in.`,
		DiagnosticSeverity.Error,
	);
}

// TV's CE10149: a declaration's type annotation must name a known type -
// a built-in type keyword, a built-in object type (linefill, polyline,
// chart.point, ... from the pine-data types catalog), or a UDT / enum
// declared EARLIER in source (use-before-declaration is the same
// CE10149; all probed 2026-06-05). Dotted names other than catalog
// entries (lib.Type via an import alias) are accepted unvalidated -
// import member sets are unknown. see INV033
export function checkTypeAnnotationName(
	v: UnifiedPineValidator,
	statement: Statement & { typeAnnotation?: { name: string } },
	version: string,
): void {
	if (version !== "6" || !statement.typeAnnotation) return;
	const raw = statement.typeAnnotation.name;
	// Collection-in-template annotations, all anchored at the template
	// span (probed 2026-06-05, see INV038):
	// - `array<array<float>>` is CE10022 "Arrays of type {inner} are not
	//   supported." ({inner} is the nested base - "map" for array<map<...>>),
	// - `matrix<array<float>>` is CE10023 "Matrix of type {inner} are not
	//   supported.",
	// - `map<string, array<float>>` gets CE10025's constructor-call
	//   wording instead (the nested collection sits in a template SLOT,
	//   not as the sole element type).
	// All distinct from the CE10025 constructor-call form on array.new<...>().
	const nestedAnnotation = raw.match(
		/^(?:(?:series|simple|input|const)\s+)?(array|matrix|map)\s*<(.*)$/,
	);
	if (nestedAnnotation) {
		const outer = nestedAnnotation[1];
		const templateRest = nestedAnnotation[2];
		const innerCollection = templateRest.match(
			/\b(array|matrix|map)\s*</,
		)?.[1];
		if (innerCollection) {
			const decl0 = statement as { startLine?: number; startColumn?: number };
			const stmt = statement as { line: number; column: number };
			const startColumn = decl0.startColumn ?? stmt.column;
			const lt = raw.indexOf("<");
			const message =
				outer === "map"
					? "Cannot use a collection in a type template of another collection. Create a user-defined type with that collection as a field and use it instead."
					: outer === "matrix"
						? `Matrix of type ${innerCollection} are not supported.`
						: `Arrays of type ${innerCollection} are not supported.`;
			v.addError(
				decl0.startLine ?? stmt.line,
				startColumn + lt,
				raw.length - lt,
				message,
				DiagnosticSeverity.Error,
			);
			return;
		}
	}
	const base = invalidAnnotationBase(v, raw);
	if (base === null) return;
	const decl = statement as {
		startLine?: number;
		startColumn?: number;
		line: number;
		column: number;
	};
	// Only flag when the annotation and the variable name sit on the
	// same physical line. Hard-wrapped corpus files glue prose / split
	// identifiers into IDENT IDENT = shapes across lines, which parse
	// as user-type declarations; those are wrap artifacts with no TV
	// verdict, not type-keyword mistakes. see INV033
	if (decl.startLine !== undefined && decl.startLine !== decl.line) return;
	v.addError(
		decl.startLine ?? decl.line,
		decl.startColumn ?? decl.column,
		base.length,
		`"${base}" is not a valid type keyword.`,
		DiagnosticSeverity.Error,
	);
}

// Returns the annotation's base name when it does NOT name a known type
// (built-in keyword, pine-data object type, or an earlier UDT/enum),
// null when the annotation is acceptable. Shared by the declaration and
// UDF-parameter CE10149 paths. see INV033
export function invalidAnnotationBase(
	v: UnifiedPineValidator,
	raw: string,
): string | null {
	// Strip qualifier prefix, generic suffix, and array suffix:
	// "series float", "array<MyType>", "Foo[]" all reduce to a base name.
	const base = raw
		.replace(/^(series|simple|input|const)\s+/, "")
		.replace(/<.*$/, "")
		.replace(/\[\]$/, "")
		.trim();
	if (!base) return null;
	if (TYPE_KEYWORDS.has(base)) return null;
	if (TYPE_NAMES.has(base)) return null; // incl. dotted chart.point
	if (base.includes(".")) return null; // import-alias types - unvalidated
	if (v.declaredTypeNames.has(base)) return null;
	return base;
}

// TV's CE10149 fires on UDF/method parameter annotations too, anchored
// at the annotation's first token (probed `f(source x)` at the keyword,
// `g(Bar b)` for an undeclared UDT; earlier-declared UDT params accepted).
// see INV033
export function checkParamTypeAnnotations(
	v: UnifiedPineValidator,
	params: Array<{
		typeAnnotation?: { name: string; line?: number; column?: number };
	}>,
	version: string,
): void {
	if (version !== "6") return;
	for (const param of params) {
		const ann = param.typeAnnotation;
		if (!ann || ann.line === undefined || ann.column === undefined) continue;
		const base = invalidAnnotationBase(v, ann.name);
		if (base === null) continue;
		v.addError(
			ann.line,
			ann.column,
			base.length,
			`"${base}" is not a valid type keyword.`,
			DiagnosticSeverity.Error,
		);
	}
}

// TV requires every parameter of an EXPORTED function or method in a
// library to carry an explicit type ("All exported functions args
// should be typified"), anchored at each untyped param. Non-exported
// UDFs infer param types and are exempt. see INV052
export function checkExportedParamsTypified(
	v: UnifiedPineValidator,
	isExport: boolean | undefined,
	params: Array<{
		name: string;
		typeAnnotation?: { name: string };
		line?: number;
		column?: number;
	}>,
	version: string,
): void {
	if (version !== "6" || !isExport) return;
	for (const param of params) {
		if (param.typeAnnotation) continue;
		if (param.line === undefined || param.column === undefined) continue;
		v.addError(
			param.line,
			param.column,
			param.name.length,
			"All exported functions args should be typified",
			DiagnosticSeverity.Error,
		);
	}
}

// TV's CE10095: declaring a name that this same scope already declared
// (params count as declared by the function scope). v6-gated like the
// other declaration checks - legacy versions used `=` for
// reassignment. Anchored at the statement start. see INV035
export function checkRedeclaration(
	v: UnifiedPineValidator,
	name: string,
	statement: {
		startLine?: number;
		startColumn?: number;
		line: number;
		column: number;
	},
	version: string,
): void {
	// `_` is a discard placeholder TV allows re-declaring freely
	// (`_ = '--- SECTION ---'` separators; probed clean). see INV035
	if (name === "_") return;
	const frame = v.declScopes[v.declScopes.length - 1];
	if (!frame) return;
	if (version === "6" && frame.has(name)) {
		const startLine = statement.startLine ?? statement.line;
		const startColumn = statement.startColumn ?? statement.column;
		const span =
			statement.line === startLine
				? statement.column - startColumn + name.length
				: name.length;
		v.addError(
			startLine,
			startColumn,
			span,
			`"${name}" is already defined`,
			DiagnosticSeverity.Error,
		);
	}
	frame.add(name);
}

// Function redefinition (CE10110/10112/10113). Two declarations of the same
// name with the same arity are illegal unless some parameter position is
// "distinct" - both typed with different types, or exactly one typed (an
// untyped param is "undetermined", distinct from any concrete type). Methods
// need no special-casing: their typed receiver distinguishes same-named
// methods on different types. v6 only (G004). see INV091
export function checkFunctionRedefinition(
	v: UnifiedPineValidator,
	statement: FunctionDeclaration,
	version: string,
): void {
	if (version !== "6") return;
	const name = statement.name;
	let sigs = v.functionDeclSignatures.get(name);
	if (!sigs) {
		sigs = [];
		v.functionDeclSignatures.set(name, sigs);
	}
	const cur = statement.params;
	for (const prev of sigs) {
		if (prev.length !== cur.length) continue; // different arity -> legal
		let distinct = false;
		for (let i = 0; i < cur.length; i++) {
			const a = prev[i].typeAnnotation?.name;
			const b = cur[i].typeAnnotation?.name;
			const aTyped = a != null;
			const bTyped = b != null;
			if (aTyped !== bTyped || (aTyped && bTyped && a !== b)) {
				distinct = true;
				break;
			}
		}
		if (distinct) continue; // a valid overload
		// Redefinition. TV anchors at the '(' after the name; code by typing.
		const column = statement.column + name.length;
		if (cur.length === 0) {
			v.addTemplateError({
				line: statement.line,
				column,
				length: 1,
				message:
					'Function "{functionName}" already defined. Either the type or the number of required parameters in overloaded versions of functions must be different.',
				severity: DiagnosticSeverity.Error,
				code: "CE10112",
				ctx: { functionName: name },
			});
		} else if (
			cur.every((p) => p.typeAnnotation?.name != null) &&
			prev.every((p) => p.typeAnnotation?.name != null)
		) {
			v.addTemplateError({
				line: statement.line,
				column,
				length: 1,
				message:
					'The "{functionName}" function has overloads with the same parameters. The type of parameters must be different in overloaded versions of functions.',
				severity: DiagnosticSeverity.Error,
				code: "CE10110",
				ctx: { functionName: name },
			});
		} else {
			v.addTemplateError({
				line: statement.line,
				column,
				length: 1,
				message:
					'Function "{functionName}" already defined. The "{functionName1}" function has overloads using the same number of required parameters without them having distinct types. Function overloads with the same number of required parameters must have explicit parameter types that are unique among overloads.',
				severity: DiagnosticSeverity.Error,
				code: "CE10113",
				ctx: { functionName: name, functionName1: name },
			});
		}
		break; // one error per redefinition
	}
	sigs.push(cur);
}
