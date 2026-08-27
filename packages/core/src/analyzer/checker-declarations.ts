// Declaration-time checks and registrations for the Pine checker, extracted
// from checker.ts. Free functions over the validator instance `v`. Covers UDT/
// enum registration, the CE10149 type-annotation checks, CE10095 redeclaration,
// CE10190 builtin shadowing, exported-param typing, and CE10110/10112/10113
// function redefinition. The scope stack push/pop and collectDeclarations stay
// on the validator (heavily called from the statement walk). see INV023, INV033,
// INV035, INV052, INV091, INV096.

import { LIBRARY_EXPORTS_BY_PATH, TYPE_NAMES } from "../../../../pine-data/v6";
import { DiagnosticSeverity } from "../common/errors";
import { TYPE_KEYWORDS } from "../constants/keywords";
import type {
	Expression,
	FunctionDeclaration,
	FunctionParam,
	Identifier,
	Statement,
} from "../parser/ast";
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
		const innerCollection = templateRest.match(/\b(array|matrix|map)\s*</)?.[1];
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

/**
 * A dotted type annotation (`ffUtil.News`) names a type exported by an imported
 * library. Valid iff that name is in the library's export set - TV rejects the
 * rest with the same "is not a valid type keyword" wording it uses for local
 * types, quoting the FULL dotted name (probed `ffUtil.Newz`, 2026-07-15).
 *
 * Lenient wherever we cannot know, so this never manufactures a false positive:
 * a root that is not an imported namespace, an import whose export set we lack
 * (unvendored / license-excluded / parse-quarantined), or a deeper path than
 * `alias.Name` all return null. Only a library whose FULL surface we hold can
 * contradict a name. Builtin dotted types (`chart.point`) never reach here -
 * TYPE_NAMES catches them first.
 *
 * see INV139
 */
function importAliasTypeInvalid(
	v: UnifiedPineValidator,
	base: string,
): string | null {
	if (base.indexOf(".") !== base.lastIndexOf(".")) return null;
	const alias = base.slice(0, base.indexOf("."));
	const member = base.slice(base.indexOf(".") + 1);
	if (!v.importedNamespaces.has(alias)) return null;
	const path = v.importedLibraryPaths.get(alias);
	if (!path) return null; // export set unavailable - stay lenient
	const exports =
		LIBRARY_EXPORTS_BY_PATH.get(path) ??
		v.localLibraryExportsBySourcePath.get(path);
	if (!exports) return null;
	return exports.has(member) ? null : base;
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
	if (base.includes(".")) return importAliasTypeInvalid(v, base);
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

// A UDF parameter DEFAULT may only be a literal or a BUILT-IN reference.
// TradingView splits the rejections across four codes, and they must be
// picked by the expression's SHAPE rather than by the messages, which are
// unreliable: CE10133 says "cannot be a function, variable or calculation"
// while TV plainly ACCEPTS `y = close`, and CE10132 says "a type's field"
// while firing on a plain function parameter. Probed 2026-08-27, 28 cells -
// see investigations/INV172-udf-parameter-defaults/probes/grid.mjs.
//
//   user variable        CE10132  anchored at the EXPRESSION
//   any call             CE10133  anchored at the PARAMETER NAME
//   binary/ternary/cmp   CE10134  anchored at the PARAMETER NAME
//   bare `na`, untyped   CE10169  anchored at the PARAMETER NAME
//
// Accepted, and each measured rather than assumed: every literal including a
// negative one, a parenthesised literal, a built-in variable (`close`), a
// built-in constant (`color.red`, `text.align_right`), and `na` when the
// parameter IS typed (`int y = na`).
//
// UNARY expressions are accepted WHATEVER they wrap - `-userVar` is clean at
// TV while the bare `userVar` is CE10132. That is almost certainly a hole in
// TV's own rule, and we deliberately reproduce it rather than "fix" it:
// flagging there would reject scripts TradingView compiles. see INV172
function defaultValueViolation(
	v: UnifiedPineValidator,
	expr: Expression,
	typed: boolean,
): { code: string; message: string; atExpression: boolean } | null {
	switch (expr.type) {
		case "Literal":
			return null;
		case "UnaryExpression":
			return null; // TV does not look inside one - see the note above
		case "CallExpression":
			return {
				code: "CE10133",
				message:
					"The default value cannot be a function, variable or calculation.",
				atExpression: false,
			};
		case "BinaryExpression":
		case "TernaryExpression":
			return {
				code: "CE10134",
				message:
					'The default value assigned to a parameter must be either a literal value (e.g., "5") or a built-in variable (e.g., "close").',
				atExpression: false,
			};
		case "Identifier": {
			const name = (expr as Identifier).name;
			if (name === "na") {
				// `na` is fine once the parameter states its type - TV's own
				// message says so and the probe confirms `int y = na` is clean.
				return typed
					? null
					: {
							code: "CE10169",
							message:
								'"na" cannot be used as the default value if the parameter\'s type is not defined. Use "<type> <parameterName> = na" instead',
							atExpression: false,
						};
			}
			// A BUILT-IN variable or constant is allowed; a user one is not.
			// Built-ins are defined at line 0 by initializeBuiltins, which is
			// the same test the rest of the checker uses to tell them apart.
			const sym = v.symbolTable.lookup(name);
			if (!sym || sym.line === 0) return null;
			return {
				code: "CE10132",
				message: `Cannot use "${name}" as the default value of a type's field. The default value cannot be a function, variable or calculation.`,
				atExpression: true,
			};
		}
		case "MemberExpression":
			// `color.red`, `text.align_right` - a built-in namespaced constant.
			// A member of a USER value cannot appear here (a default is
			// evaluated before any user value exists), so nothing to split.
			return null;
		default:
			// ArrayExpression, IndexExpression, IfExpression, SwitchExpression -
			// unprobed as defaults, so accepted. A miss on an unmeasured shape
			// beats inventing a code for it; each is one probe away whenever
			// someone wants them. see INV172
			return null;
	}
}

export function checkParamDefaults(
	v: UnifiedPineValidator,
	params: FunctionParam[],
	version: string,
): void {
	if (version !== "6") return;
	for (const param of params) {
		if (!param.defaultValue) continue;
		if (param.line === undefined || param.column === undefined) continue;
		const hit = defaultValueViolation(
			v,
			param.defaultValue,
			!!param.typeAnnotation,
		);
		if (!hit) continue;
		const atExpr = hit.atExpression;
		v.addTemplateError({
			line: atExpr ? param.defaultValue.line : param.line,
			column: atExpr ? param.defaultValue.column : param.column,
			length: atExpr ? 0 : param.name.length,
			message: hit.message,
			severity: DiagnosticSeverity.Error,
			code: hit.code,
		});
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
		// Record the conflict so type-dependent gates (the union-arg check)
		// can treat references to this name as untrustworthy. see INV124
		v.redeclaredNames.add(name);
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
		// TV's CE10111, which the arity comparison below cannot see: overloads
		// whose REQUIRED parameter lists match are illegal however many optional
		// parameters either one adds, so `f(float x)` and `f(float x, float
		// scale = 1.0)` collide at different arities - and `f(float x, int s =
		// 1)` and `f(float x, float t = 2.0)` collide at the SAME arity even
		// though the full lists differ, which is why this runs first. An
		// untyped required parameter is "undetermined" and collides with
		// nothing (probed: p1/p5/p11 are all TV-clean), the same never-guess
		// rule the same-arity check applies. see INV165
		if (checkRequiredParamCollision(v, statement, prev, cur)) break;
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

/**
 * TV's CE10111 - two overloads with the same REQUIRED parameter types.
 *
 * Split out from the arity-based check above because it compares a different
 * list: `f(float x)` and `f(float x, float scale = 1.0)` have different
 * arities and are still illegal, since the optional parameter cannot
 * disambiguate a call that omits it.
 *
 * Deliberately narrower than "required lists are equal" in two places, both
 * probe-backed (INV165):
 *
 * - **Every required parameter must be TYPED on both sides.** An untyped one
 *   is "undetermined" and collides with nothing - `f(x)` / `f(x, y = 1)` is
 *   TV-clean, as is untyped-against-typed. This is the same never-guess rule
 *   the same-arity check applies, and the reason this cannot simply compare
 *   name-erased lists.
 * - **At least one side must declare an optional parameter.** With no
 *   optionals anywhere the required lists ARE the full lists, which is the
 *   same-arity check's territory (CE10110/CE10112/CE10113); firing here too
 *   would double-report.
 *
 * Returns whether it reported, so the caller stops at one error per
 * declaration.
 */
function checkRequiredParamCollision(
	v: UnifiedPineValidator,
	statement: FunctionDeclaration,
	prev: FunctionParam[],
	cur: FunctionParam[],
): boolean {
	const required = (params: FunctionParam[]) =>
		params.filter((p) => p.defaultValue === undefined);
	const reqPrev = required(prev);
	const reqCur = required(cur);

	if (prev.length === reqPrev.length && cur.length === reqCur.length) {
		return false; // no optionals: the same-arity check owns this case
	}
	if (reqPrev.length !== reqCur.length) return false;
	if (![...reqPrev, ...reqCur].every((p) => p.typeAnnotation?.name != null)) {
		return false; // an undetermined parameter distinguishes nothing
	}
	if (
		reqCur.some(
			(p, i) => p.typeAnnotation?.name !== reqPrev[i].typeAnnotation?.name,
		)
	) {
		return false; // some required position has a distinct type
	}

	// TV anchors at the '(' after the name, same as the checks above.
	v.addTemplateError({
		line: statement.line,
		column: statement.column + statement.name.length,
		length: 1,
		message:
			'The "{functionName}" function has overloads with the same required parameters. The type of required parameters must be different in overloaded versions of functions.',
		severity: DiagnosticSeverity.Error,
		code: "CE10111",
		ctx: { functionName: statement.name },
	});
	return true;
}
