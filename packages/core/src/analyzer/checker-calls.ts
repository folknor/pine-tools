// Call-site and argument validation for the Pine checker, extracted from
// checker.ts. Free functions over the validator instance `v`; they emit
// CE10115/CE10120/CE10122/CE10123/CE10165/CE10271 and friends. The rendering
// helpers (describeArgForTemplate/renderTvType), bool-context test, and type
// inference they lean on stay on the validator and are reached via `v`.
// see INV014, INV016, INV050, INV053, INV054, INV055, INV056, INV061,
// INV062, INV067, INV086, INV087, INV088, INV090, INV095.

import { LIBRARY_EXPORTS_BY_PATH, TYPE_NAMES } from "../../../../pine-data/v6";
import { DiagnosticSeverity } from "../common/errors";
import type {
	BinaryExpression,
	CallArgument,
	CallExpression,
	Expression,
	Identifier,
	Literal,
	MemberExpression,
	TernaryExpression,
	UnaryExpression,
} from "../parser/ast";
import {
	type FunctionSignature,
	GENERIC_FUNCTION_BASES,
	getBuiltinVarInfo,
	getConstParamDocType,
	getMinArgsForVariadic,
	getMinimalRequiredParams,
	getOverloadSignatures,
	hasOverloadSignatures,
	hasOverloads,
	isBuiltinConstant,
	isTopLevelOnly,
	isVariadicFunction,
	KNOWN_NAMESPACE_PREFIXES,
	KNOWN_NAMESPACES,
	NAMESPACE_PROPERTIES,
	namedParamUnionMembers,
	type ParameterInfo,
	paramRequiresConst,
	positionalConstParam,
	positionalParamUnionMembers,
	resolveCallReturnRaw,
	unionParamInfo,
} from "./builtins";
import type { UnifiedPineValidator } from "./checker";
import {
	arrayFromArgMatches,
	arrayFromExpectedType,
	CE10122_TEMPLATE,
	CE10123_TEMPLATE,
	collectionElementTarget,
	elementArgAssignable,
	isSeriesQualified,
	isSimpleQualifiedParam,
	memberChainName,
	NESTED_COLLECTION_MESSAGE,
	SCALAR_BASE_TYPES,
} from "./checker-helpers";
import { type PineType, TypeChecker } from "./types";

// User-function call-site validation (CE10115/CE10165/CE10123). The local
// checker validated builtin calls but not UDF calls. Uses the param
// signatures captured for the redefinition check. Conservative, to avoid
// FPs: only NON-overloaded UDFs (exactly one signature); count checks gated
// on a clean parse (a recovery-truncated call must not misfire); arg-type
// checks only on TYPED PRIMITIVE params (untyped/UDT/collection params accept
// anything we can't prove wrong); positional args only. v6 only (G004). see
// INV095
export function validateUserFunctionCall(
	v: UnifiedPineValidator,
	call: CallExpression,
	functionName: string,
	version: string,
): void {
	const sigs = v.functionDeclSignatures.get(functionName);
	if (sigs?.length !== 1) return; // unknown or overloaded -> lenient
	if (v.methodDeclaredNames.has(functionName)) return; // also a method
	const params = sigs[0];

	const posArgs: CallArgument[] = [];
	const named = new Set<string>();
	for (const arg of call.arguments) {
		if (arg.name) named.add(arg.name);
		else posArgs.push(arg);
	}

	// Too many positional args (CE10115), anchored at the first extra arg.
	if (v.parserClean && posArgs.length > params.length) {
		const anchor = posArgs[params.length]?.value ?? call;
		v.addTemplateError({
			line: anchor.line,
			column: anchor.column,
			length: 0,
			message:
				'Too many arguments passed into the "{funName}()" function call. Passed {passedArgsCount} arguments{expectMsg}{expectArgsCount}.',
			severity: DiagnosticSeverity.Error,
			code: "CE10115",
			ctx: {
				funName: functionName,
				passedArgsCount: String(posArgs.length),
				expectMsg: " but expected ",
				expectArgsCount: String(params.length),
			},
		});
		return; // an over-long call: don't also report missing/type
	}

	// Missing required params (CE10165) - a param with no default, supplied
	// neither positionally nor by name.
	if (v.parserClean) {
		for (let i = 0; i < params.length; i++) {
			const p = params[i];
			if (p.defaultValue) continue; // optional
			if (i < posArgs.length || named.has(p.name)) continue; // provided
			v.addTemplateError({
				line: call.line,
				column: call.column,
				length: functionName.length,
				message:
					'No value assigned to the "{name}" parameter in {functionName}()',
				severity: DiagnosticSeverity.Error,
				code: "CE10165",
				ctx: { functionName, name: p.name },
			});
		}
	}

	// Arg TYPE (CE10123) for typed primitive params.
	for (let i = 0; i < posArgs.length && i < params.length; i++) {
		const ann = params[i].typeAnnotation?.name;
		if (!ann) continue; // untyped param -> accepts anything
		const base = TypeChecker.baseTypeName(ann);
		if (
			base !== "int" &&
			base !== "float" &&
			base !== "bool" &&
			base !== "string" &&
			base !== "color"
		) {
			continue; // UDT / collection / unknown param -> lenient
		}
		const argExpr = posArgs[i].value;
		const argType = v.inferExpressionType(argExpr, version);
		if (TypeChecker.isAssignable(argType, base as PineType)) continue;
		const desc = v.describeArgForTemplate(argExpr, argType, version);
		v.addTemplateError({
			line: argExpr.line,
			column: argExpr.column,
			length: 0,
			message: CE10123_TEMPLATE,
			severity: DiagnosticSeverity.Error,
			code: "CE10123",
			ctx: {
				argDisplayName: params[i].name,
				argUserFriendlyRepresentation: desc.repr,
				argumentType: desc.typeStr,
				// UDF params default to the series qualifier (TV renders
				// `int x` as "series int"); keep an explicit qualifier as-is.
				currentTypeDocStr: ann === base ? `series ${base}` : ann,
				funId: functionName,
				typePostfix: "",
			},
		});
	}
}

export function validateCallExpression(
	v: UnifiedPineValidator,
	call: CallExpression,
	version: string = "6",
): void {
	if (version === "6" && v.hasCollectionTemplateArg(call)) {
		v.addError(
			call.line,
			call.column,
			(call.endColumn ?? call.column + 1) - call.column,
			NESTED_COLLECTION_MESSAGE,
			DiagnosticSeverity.Error,
		);
	}

	// Get function name
	let functionName = "";
	if (call.callee.type === "Identifier") {
		functionName = call.callee.name;
	} else if (call.callee.type === "MemberExpression") {
		// Flatten the whole chain, not just `ns.member`. Two-level builtin
		// namespaces (strategy.risk.*, strategy.opentrades.*,
		// strategy.closedtrades.*, chart.point.*) otherwise leave
		// functionName empty and skip ALL validation - including the
		// topLevelOnly local-scope check. see INV054
		functionName = memberChainName(call.callee);
	}

	// Validate argument EXPRESSIONS for every call, resolvable or not.
	// This used to run only for catalog functions (after the !signature
	// early-return below), leaving the arguments of UDF calls, import-alias
	// member calls, and method calls completely unvalidated - no
	// undefined-variable check, nothing. Found by the first #48 mutation
	// run (delete-decl survivor: TV CE10272 on an input variable deleted
	// out from under a library call). see INV062. A parser-marked torn
	// argument prefix is skipped because the syntax diagnostic already owns it.
	// see INV082
	for (const arg of call.arguments) {
		if (!arg.skipSemanticValidation) v.validateExpression(arg.value, version);
	}

	// NOTE: Complex callee expressions (e.g., chained calls like `foo().bar()`,
	// indexed access like `arr[0]()`) are not validated. This is acceptable
	// because Pine Script rarely uses such patterns, and the type inference
	// for these cases would require significant additional complexity.
	if (!functionName) return;

	const ctorMatch = functionName.match(/^(.+)\.new$/);
	if (ctorMatch && v.declaredTypeNames.has(ctorMatch[1])) return;

	// Get function signature. Generic constructors (array.new<T>, map.new<K,V>,
	// matrix.new<T>) are keyed in the catalog WITH the template suffix, but the
	// call's callee is the bare base (`array.new`), so a plain lookup misses and
	// their args were never validated. Resolve the template signature so arg
	// checks run (e.g. the INV107 size narrowing). All their params are optional,
	// so no spurious CE10165. see INV107
	let signature = v.functionSignatures.get(functionName);
	if (!signature && GENERIC_FUNCTION_BASES.has(functionName)) {
		for (const [key, sig] of v.functionSignatures) {
			if (key.startsWith(`${functionName}<`)) {
				signature = sig;
				break;
			}
		}
	}

	// Check for top-level only functions in local scope
	if (isTopLevelOnly(functionName) && v.blockDepth > 0) {
		v.addError(
			call.line,
			call.column,
			functionName.length,
			`Function '${functionName}' cannot be called from a local scope. It must be called from the global scope.`,
			DiagnosticSeverity.Error,
		);
	}

	// str.tostring rejects map arguments (overload list lacks map<K,V>);
	// pine-lint emits CE10123 here.
	if (functionName === "str.tostring" && call.arguments.length > 0) {
		const firstArg = call.arguments[0];
		const argType = v.inferExpressionType(firstArg.value, version);
		if (argType.startsWith("map<")) {
			const repr =
				firstArg.value.type === "Identifier"
					? (firstArg.value as Identifier).name
					: firstArg.value.type === "Literal"
						? String((firstArg.value as Literal).raw ?? "")
						: "";
			v.addTemplateError({
				line: firstArg.value.line,
				column: firstArg.value.column,
				length: 0,
				message: CE10123_TEMPLATE,
				severity: DiagnosticSeverity.Error,
				code: "CE10123",
				ctx: {
					argDisplayName: "value",
					argUserFriendlyRepresentation: repr,
					argumentType: argType,
					currentTypeDocStr: "series float",
					funId: "str.tostring",
					typePostfix: "",
				},
			});
		}
	}

	if (!signature) {
		// No builtin signature: an Identifier callee must then be a UDF /
		// method declared EARLIER in source - TV's CE10271 "Could not
		// find function or function reference 'X'" (probed: undefined
		// name, call-before-definition, and a plain VARIABLE used as a
		// callee all error; see INV036).
		if (
			version === "6" &&
			call.callee.type === "Identifier" &&
			(!v.declaredFunctionNames.has(functionName) ||
				(functionName === v.currentFunctionName &&
					!v.overloadedFunctionNames.has(functionName)))
		) {
			// Undefined callable, OR a direct self-call: Pine forbids
			// recursion, so a non-overloaded function referencing itself
			// inside its own body is the same CE10271 (its name is not yet
			// bound while the body compiles). Overloaded names are excluded -
			// a self-named call there dispatches to a sibling overload. see
			// INV086
			v.addError(
				call.line,
				call.column,
				functionName.length,
				`Could not find function or function reference '${functionName}'`,
				DiagnosticSeverity.Error,
			);
		} else if (
			version === "6" &&
			call.callee.type === "MemberExpression" &&
			functionName.includes(".")
		) {
			const rootName = functionName.slice(0, functionName.indexOf("."));
			const nsPath = functionName.slice(0, functionName.lastIndexOf("."));
			const memberName = functionName.slice(functionName.lastIndexOf(".") + 1);
			const objSym = v.symbolTable.lookup(rootName);
			const userShadowed = !!objSym && objSym.line !== 0;
			if (
				v.parserClean &&
				!objSym &&
				!v.importedNamespaces.has(rootName) &&
				!KNOWN_NAMESPACES.includes(rootName) &&
				!TYPE_NAMES.has(rootName) &&
				!v.declaredTypeNames.has(rootName) &&
				!(functionName in NAMESPACE_PROPERTIES) &&
				!GENERIC_FUNCTION_BASES.has(functionName)
			) {
				v.addError(
					call.line,
					call.column,
					functionName.length,
					`Could not find method or method reference '${functionName}'`,
					DiagnosticSeverity.Error,
				);
			}

			// `ns.member(...)` where `ns` is a built-in namespace PATH and
			// `member` is unknown there - same CE10271 (probed `ta.bogus`,
			// `math.notreal`; see INV053). `functionName` is the flattened
			// dotted callee (memberChainName, "" if any link is not a plain
			// property access), so this covers both `ta.bogus` and deeper
			// paths like `chart.point.newx` - the latter slipped through the
			// old `callee.object.type === "Identifier"` guard, a CE10271 FN
			// the #48 mutation harness surfaced (see INV064).
			//
			// Bounded to the data-backed subset of #41: the member's
			// namespace PATH (everything up to the last dot) must be a real
			// catalog namespace (KNOWN_NAMESPACE_PREFIXES), and the ROOT must
			// NOT be user-shadowed (an `import ... as ns` alias / user var has
			// a non-builtin symbol, line !== 0 - its members we cannot
			// resolve). A member that IS a known builtin (function via the
			// signature lookup above, or a const/variable in
			// NAMESPACE_PROPERTIES) is left alone: calling a built-in variable
			// like `ta.tr(...)` is TV-silent, and calling a const like
			// `color.red(...)` IS a TV error but the const-vs-variable split
			// is murky, so we conservatively skip all known members - we never
			// want a false positive on a real member.
			const scalarShadow =
				userShadowed &&
				!!objSym &&
				SCALAR_BASE_TYPES.has(
					TypeChecker.baseTypeName(objSym.type as string),
				) &&
				!v.declaredFunctionNames.has(memberName);
			if (
				(!userShadowed || scalarShadow) &&
				!v.importedNamespaces.has(rootName) &&
				KNOWN_NAMESPACE_PREFIXES.has(nsPath) &&
				!(functionName in NAMESPACE_PROPERTIES) &&
				!GENERIC_FUNCTION_BASES.has(functionName)
			) {
				v.addError(
					call.line,
					call.column,
					functionName.length,
					scalarShadow
						? `Could not find method or method reference '${functionName}'`
						: `Could not find function or function reference '${functionName}'`,
					DiagnosticSeverity.Error,
				);
			}

			// Imported-library member: `lib.export(...)` where `lib` is an
			// imported namespace whose vendored export set we have
			// (pine-data/v6/libraries). Valid iff `member` is one of the
			// library's exports (probed p02 `ta.dema`), a builtin function of a
			// colliding namespace (`ta.sma` - resolved by the signature lookup
			// above, never reaches here; p03), or a builtin const/var
			// (NAMESPACE_PROPERTIES). Otherwise CE10271 "function or function
			// reference" (probed p01 `ta.emax`; INV067) - the data-backed import
			// slice of #41. Single-dot callees only (library exports are flat).
			// Not gated on userShadowed: for an imported library the binding IS
			// the shadow symbol. Libraries we don't vendor have no entry, so
			// they stay lenient.
			const libExports =
				LIBRARY_EXPORTS_BY_PATH.get(
					v.importedLibraryPaths.get(rootName) ?? "",
				) ??
				v.localLibraryExportsBySourcePath.get(
					v.importedLibraryPaths.get(rootName) ?? "",
				);
			if (
				libExports &&
				functionName.indexOf(".") === functionName.lastIndexOf(".") &&
				!libExports.has(memberName) &&
				!(functionName in NAMESPACE_PROPERTIES) &&
				!GENERIC_FUNCTION_BASES.has(functionName)
			) {
				v.addError(
					call.line,
					call.column,
					functionName.length,
					`Could not find function or function reference '${functionName}'`,
					DiagnosticSeverity.Error,
				);
			}

			// Method call on a local UDT instance: `a.foo()` where `a : A` (a
			// declared UDT), `foo` is neither a field of A nor a user method/func
			// in scope. TV's CE10271 "method or method reference" (probed). Gated:
			// single-dot callee, parserClean, `a` a user var whose base is a LOCAL
			// UDT (imported-library UDTs/methods stay lenient - we lack their
			// surface). declaredFunctionNames is source-ordered, so a method used
			// before its declaration is flagged too - matching TV (forward method
			// refs are CE10271, probed 2026-06-25). `copy` is excluded: every UDT
			// instance has a built-in `.copy()` (probed - TV accepts `a.copy()`
			// with no user method). see INV103
			if (
				v.parserClean &&
				userShadowed &&
				objSym &&
				nsPath === rootName &&
				memberName !== "copy" &&
				!v.importedNamespaces.has(rootName) &&
				v.udtFieldTypes.has(TypeChecker.baseTypeName(objSym.type as string)) &&
				!v.udtFieldTypes
					.get(TypeChecker.baseTypeName(objSym.type as string))
					?.has(memberName) &&
				!v.declaredFunctionNames.has(memberName)
			) {
				v.addError(
					call.line,
					call.column,
					functionName.length,
					`Could not find method or method reference '${functionName}'`,
					DiagnosticSeverity.Error,
				);
			}
		}
		// A valid UDF call (declared Identifier callee, not the self-call
		// already flagged above): validate arg count and typed-param arg
		// types against the captured signature. see INV095
		if (
			version === "6" &&
			call.callee.type === "Identifier" &&
			v.declaredFunctionNames.has(functionName) &&
			functionName !== v.currentFunctionName
		) {
			validateUserFunctionCall(v, call, functionName, version);
		}
		return;
	}

	// Validate arguments against the signature (the argument EXPRESSIONS
	// were already walked above, before signature resolution).
	validateFunctionArguments(v, call, functionName, signature, version);
}

// A call to a builtin whose resolved return is exactly `void`. Used by
// the two void-assignment checks (declaration -> CE10098, reassignment ->
// type mismatch); we infer void calls as "unknown" elsewhere, so these
// must detect void directly. see INV055
export function isVoidCall(
	v: UnifiedPineValidator,
	call: CallExpression,
	version: string,
): boolean {
	const fnName = memberChainName(call.callee);
	if (!fnName) return false;
	const argTypes = call.arguments.map((a) =>
		v.inferExpressionType(a.value, version),
	);
	return resolveCallReturnRaw(fnName, argTypes) === "void";
}

// Per-overload positional/named arg type-checking. The MERGED signature of an
// overloaded drawing-object builtin types its legacy params (line.new's
// x1/y1/x2/y2, label.new's x/y) as "unknown", so the generic positional loop -
// already bypassed for overloaded functions - never checks them. Resolve which
// overload the call selects by best fit over the call's RELIABLY-typed args,
// then report the first reliable type mismatch in that overload as CE10123,
// matching TV. Conservative to avoid FPs: requires a UNIQUE best-fit overload
// (no tie), counts/reports mismatches only on cleanly-typed args against
// cleanly-typed params (so a valid call, whose true overload has zero
// mismatches, is silent), and REPORTS only on params the merged signature lost
// to "unknown" (clean merged params are already covered by the named-arg loop /
// INV107, so this never double-fires). see INV110
function checkOverloadResolvedArgs(
	v: UnifiedPineValidator,
	_call: CallExpression,
	functionName: string,
	signature: FunctionSignature,
	positionalArgs: { arg: CallArgument; type: PineType }[],
	providedArgs: Map<string, { arg: CallArgument; type: PineType }>,
	version: string,
): void {
	const overloads = getOverloadSignatures(functionName);
	if (overloads.length < 2) return;
	const posCount = positionalArgs.length;

	// Candidate overloads: every provided named arg is a param of the overload,
	// and the positional args do not overflow it.
	const candidates = overloads.filter((ov) => {
		for (const name of providedArgs.keys()) {
			if (!ov.parameters.some((p) => p.name === name)) return false;
		}
		return posCount <= ov.parameters.length;
	});
	if (candidates.length === 0) return;

	// Base type with any qualifier stripped (mirrors builtins.baseOfRawType).
	const baseOf = (raw: string): string => {
		const s = raw.trim();
		const br = s.match(/^(?:const|input|simple|series)<(.+)>$/);
		if (br) return br[1].trim();
		return s.replace(/^(const|input|simple|series)\s+/, "").trim();
	};
	const isScalarArg = (t: PineType): boolean =>
		SCALAR_BASE_TYPES.has(TypeChecker.baseTypeName(String(t)));
	const isScalarUnionRaw = (raw: string): boolean =>
		raw.includes("/") &&
		raw.split("/").every((m) => SCALAR_BASE_TYPES.has(m.trim()));

	// Classify an arg against a param: -1 mismatch, +1 match, 0 neutral (cannot
	// tell). The merged type collapses unions ("series int/float") and the UDT
	// `chart.point` to "unknown", so consult the rawType to recover the signal
	// that distinguishes the point-pair overload from the legacy x/y form.
	const classify = (
		argType: PineType,
		param: ParameterInfo | undefined,
	): number => {
		if (!param || argType === "unknown") return 0;
		const raw = param.rawType ? baseOf(String(param.rawType)) : "";
		// A clearly-scalar arg cannot be a chart.point.
		if (raw === "chart.point") return isScalarArg(argType) ? -1 : 0;
		if (!param.type || param.type === "unknown") {
			if (isScalarUnionRaw(raw)) {
				return raw
					.split("/")
					.some((m) => TypeChecker.isAssignable(argType, m.trim() as PineType))
					? 1
					: -1;
			}
			return 0;
		}
		return TypeChecker.isAssignable(argType, param.type) ? 1 : -1;
	};

	const score = (ov: FunctionSignature): { mm: number; mt: number } => {
		let mm = 0;
		let mt = 0;
		const tally = (c: number) => {
			if (c < 0) mm++;
			else if (c > 0) mt++;
		};
		for (let i = 0; i < posCount; i++)
			tally(classify(positionalArgs[i].type, ov.parameters[i]));
		for (const [name, prov] of providedArgs)
			tally(
				classify(
					prov.type,
					ov.parameters.find((p) => p.name === name),
				),
			);
		return { mm, mt };
	};

	// Resolve to the best-fit overload: fewest mismatches, then most matches.
	let best = candidates[0];
	let bestS = score(best);
	let tie = false;
	for (let k = 1; k < candidates.length; k++) {
		const s = score(candidates[k]);
		if (s.mm < bestS.mm || (s.mm === bestS.mm && s.mt > bestS.mt)) {
			best = candidates[k];
			bestS = s;
			tie = false;
		} else if (s.mm === bestS.mm && s.mt === bestS.mt) {
			tie = true;
		}
	}
	// Resolved cleanly (no mismatch in the selected overload) or ambiguously
	// (two overloads tie at the best score) -> stay lenient.
	if (bestS.mm === 0 || tie) return;

	// Only the legacy params the merged signature dropped to "unknown" are ours
	// to report (clean merged params are covered by the named-arg loop / INV107),
	// and only scalar / scalar-union params render a meaningful CE10123.
	const mergedLossy = (name: string): boolean => {
		const m = signature.parameters.find((p) => p.name === name);
		return !m?.type || m.type === "unknown";
	};
	const reportable = (param: ParameterInfo): boolean => {
		const raw = param.rawType ? baseOf(String(param.rawType)) : "";
		return SCALAR_BASE_TYPES.has(raw) || isScalarUnionRaw(raw);
	};
	const report = (
		value: Expression,
		argType: PineType,
		param: ParameterInfo,
	): void => {
		const desc = v.describeArgForTemplate(value, argType, version);
		v.addTemplateError({
			line: value.line,
			column: value.column,
			length: 0,
			message: CE10123_TEMPLATE,
			severity: DiagnosticSeverity.Error,
			code: "CE10123",
			ctx: {
				argDisplayName: param.name,
				argUserFriendlyRepresentation: desc.repr,
				argumentType: desc.typeStr,
				currentTypeDocStr: param.rawType ?? String(param.type),
				funId: functionName,
				typePostfix: "",
			},
		});
	};

	// Report the FIRST reportable mismatch in the resolved overload (TV reports
	// one, at the offending argument) - positional first, then named.
	for (let i = 0; i < posCount; i++) {
		const param = best.parameters[i];
		if (!param || classify(positionalArgs[i].type, param) >= 0) continue;
		if (!reportable(param) || !mergedLossy(param.name)) continue;
		report(positionalArgs[i].arg.value, positionalArgs[i].type, param);
		return;
	}
	for (const [name, prov] of providedArgs) {
		const param = best.parameters.find((p) => p.name === name);
		if (!param || classify(prov.type, param) >= 0) continue;
		if (!reportable(param) || !mergedLossy(name)) continue;
		report(prov.arg.value, prov.type, param);
		return;
	}
}

export function validateFunctionArguments(
	v: UnifiedPineValidator,
	call: CallExpression,
	functionName: string,
	signature: FunctionSignature,
	version: string = "6",
): void {
	const args = call.arguments;

	// Build map of provided arguments
	const providedArgs = new Map<string, { arg: CallArgument; type: PineType }>();
	const positionalArgs: { arg: CallArgument; type: PineType }[] = [];

	for (const arg of args) {
		const argType = v.inferExpressionType(arg.value, version);
		if (arg.name) {
			providedArgs.set(arg.name, { arg, type: argType });
		} else {
			positionalArgs.push({ arg, type: argType });
		}
	}

	// Check argument count
	const totalCount = signature.parameters.length;

	// Check if function is variadic
	const isVariadic = isVariadicFunction(functionName);

	// TV's CE10115, anchored across the argument list (start at the first
	// argument - probed `ta.sma(close, 14, 99)`, INV061 p01). see INV061
	if (!isVariadic && positionalArgs.length > totalCount) {
		const anchor = args[0]?.value ?? call;
		v.addTemplateError({
			line: anchor.line,
			column: anchor.column,
			length: 0,
			message:
				'Too many arguments passed into the "{funName}()" function call. Passed {passedArgsCount} arguments{expectMsg}{expectArgsCount}.',
			severity: DiagnosticSeverity.Error,
			code: "CE10115",
			ctx: {
				funName: functionName,
				passedArgsCount: String(positionalArgs.length),
				expectMsg: " but expected ",
				expectArgsCount: String(totalCount),
			},
		});
	}

	// For variadic functions, require at least minimum number of arguments.
	// TV's wording (probed math.max(1), INV059 p04): terse arg count.
	if (isVariadic) {
		const minArgs = getMinArgsForVariadic(functionName);
		if (positionalArgs.length < minArgs) {
			v.addError(
				call.line,
				call.column,
				functionName.length,
				`Wrong number of args: ${positionalArgs.length}`,
				DiagnosticSeverity.Error,
			);
		}

		// array.from element-type consistency: arg0 fixes the element type,
		// later args must match it. Variadic, so the loop above never type-
		// checks the args - do it here. First incompatible arg -> CE10122,
		// matching TV (probed 2026-06-25). v6 only (G004). see INV090
		if (
			functionName === "array.from" &&
			version === "6" &&
			positionalArgs.length >= 1 &&
			positionalArgs[0].type !== "unknown"
		) {
			const arg0Base = TypeChecker.baseTypeName(String(positionalArgs[0].type));
			const expected = arrayFromExpectedType(arg0Base);
			if (expected) {
				for (let i = 1; i < positionalArgs.length; i++) {
					const provided = positionalArgs[i];
					if (arrayFromArgMatches(provided.type, arg0Base)) continue;
					const desc = v.describeArgForTemplate(
						provided.arg.value,
						provided.type,
						version,
					);
					v.addTemplateError({
						line: provided.arg.value.line,
						column: provided.arg.value.column,
						length: 0,
						message: CE10122_TEMPLATE,
						severity: DiagnosticSeverity.Error,
						code: "CE10122",
						ctx: {
							argDisplayName: `arg_${i}`,
							argUserFriendlyRepresentation: desc.repr,
							argumentType: desc.typeStr,
							expectedType: expected,
							funId: functionName,
						},
					});
					break; // TV reports only the first incompatible element
				}
			}
		}
		return; // Skip further parameter validation for variadic functions
	}

	// #17 landed: pine-data now emits union types for overloaded/polymorphic
	// params, so the old polymorphic arg-validation bypass (INV009) is gone
	// (#24). Safety nets: (1) union types (e.g. "series int/float", nz's
	// widened "series int/float/bool/string/color") collapse to "unknown"
	// via mapToPineType and are skipped by the `!== "unknown"` guard, so only
	// CLEAN-typed params are checked (catches e.g. math.round(close, "x"));
	// (2) arg-type checks are v6-only - pine-data ships v6 signatures, and
	// validating v4/v5 calls against them is unsound (e.g. input's removed
	// `type` param), so legacy scripts are left lenient. see G004 / #24.
	// `functionHasOverloads` (any still-unknown param) still bypasses
	// positional checks; return-type inference uses the polymorphic flag
	// separately (getPolymorphicReturnType).
	const functionHasOverloads = hasOverloads(functionName);
	const checkArgTypes = version === "6";

	// Per-overload arg type-checking for the functions the generic positional
	// loop bypasses (overloaded - their merged signature has unknown-typed
	// params). Recovers the legacy drawing-object arg checks (line.new x1/y1
	// etc). see INV110
	if (checkArgTypes && functionHasOverloads && !call.recovered) {
		checkOverloadResolvedArgs(
			v,
			call,
			functionName,
			signature,
			positionalArgs,
			providedArgs,
			version,
		);
	}

	// Collection mutators (array.push/set/insert/unshift/fill, map.put, ...)
	// type their value/key param as "series <type of the array's/map's
	// elements>" - a placeholder mapToPineType collapses to "unknown", so the
	// generic loop below skips it (and hasOverloads bypasses positional checks
	// entirely). Resolve the receiver's concrete element type and check the
	// value/key arg directly: TV rejects a narrowing (literal float into
	// array<int>) but accepts a widening (int into <float>). see INV087
	if (checkArgTypes) {
		const receiverType =
			providedArgs.get("id")?.type ?? positionalArgs[0]?.type;
		if (receiverType) {
			for (let i = 0; i < signature.parameters.length; i++) {
				const param = signature.parameters[i];
				const kindMatch = /type of the (array|map)'s elements/.exec(
					String(param.rawType ?? param.type),
				);
				if (!kindMatch) continue;
				const target = collectionElementTarget(
					receiverType,
					kindMatch[1],
					param.name,
				);
				if (!target) continue; // element type unresolved -> stay lenient
				const provided = providedArgs.get(param.name) ?? positionalArgs[i];
				if (!provided) continue;
				if (elementArgAssignable(provided.type, target)) continue;
				const desc = v.describeArgForTemplate(
					provided.arg.value,
					provided.type,
					version,
				);
				v.addTemplateError({
					line: provided.arg.value.line,
					column: provided.arg.value.column,
					length: 0,
					message: CE10123_TEMPLATE,
					severity: DiagnosticSeverity.Error,
					code: "CE10123",
					ctx: {
						argDisplayName: param.name,
						argUserFriendlyRepresentation: desc.repr,
						argumentType: desc.typeStr,
						currentTypeDocStr: `series ${target}`,
						funId: functionName,
						typePostfix: "",
					},
				});
			}
		}
	}

	// Collection RECEIVER type (CE10123): a param typed "any array/map/matrix
	// type" is the receiver ("id"/"id1"). mapToPineType collapses it to "unknown"
	// and these functions are "overloaded" (unknown params), so the generic loop
	// never checks it - `array.get(close, 0)` was silent. A scalar receiver is
	// TV's CE10123 with the kind's doc type ("array<type>" / "map<type, type>" /
	// "matrix<type>"). Only the five scalar primitives are flagged; na / UDT /
	// unknown receivers stay lenient. see INV101
	if (checkArgTypes) {
		for (let i = 0; i < signature.parameters.length; i++) {
			const param = signature.parameters[i];
			const m = /^any (array|map|matrix) type$/.exec(
				String(param.rawType ?? ""),
			);
			if (!m) continue;
			const provided = providedArgs.get(param.name) ?? positionalArgs[i];
			if (!provided) continue;
			if (
				!SCALAR_BASE_TYPES.has(TypeChecker.baseTypeName(String(provided.type)))
			) {
				continue;
			}
			const docStr =
				m[1] === "array"
					? "array<type>"
					: m[1] === "map"
						? "map<type, type>"
						: "matrix<type>";
			const desc = v.describeArgForTemplate(
				provided.arg.value,
				provided.type,
				version,
			);
			v.addTemplateError({
				line: provided.arg.value.line,
				column: provided.arg.value.column,
				length: 0,
				message: CE10123_TEMPLATE,
				severity: DiagnosticSeverity.Error,
				code: "CE10123",
				ctx: {
					argDisplayName: param.name,
					argUserFriendlyRepresentation: desc.repr,
					argumentType: desc.typeStr,
					currentTypeDocStr: docStr,
					funId: functionName,
					typePostfix: "",
				},
			});
		}
	}

	// array/matrix concat element-type consistency (CE10123): the two collection
	// args must share an element type. id1 fixes it; a mismatched id2 is TV's
	// CE10123 reported at the ELEMENT level (id2, "series <id2-elem>" used but
	// "series <id1-elem>" expected). Widening int->float is allowed (mutator
	// rule). Both element types must resolve, else lenient. see INV102
	if (
		checkArgTypes &&
		(functionName === "array.concat" || functionName === "matrix.concat")
	) {
		const kind = functionName.startsWith("array") ? "array" : "matrix";
		const t1 = providedArgs.get("id1")?.type ?? positionalArgs[0]?.type;
		const provided2 = providedArgs.get("id2") ?? positionalArgs[1];
		if (t1 && provided2) {
			const elem1 = collectionElementTarget(t1, kind, "id1");
			const elem2 = collectionElementTarget(provided2.type, kind, "id2");
			if (elem1 && elem2 && !elementArgAssignable(elem2 as PineType, elem1)) {
				const desc = v.describeArgForTemplate(
					provided2.arg.value,
					provided2.type,
					version,
				);
				v.addTemplateError({
					line: provided2.arg.value.line,
					column: provided2.arg.value.column,
					length: 0,
					message: CE10123_TEMPLATE,
					severity: DiagnosticSeverity.Error,
					code: "CE10123",
					ctx: {
						argDisplayName: "id2",
						argUserFriendlyRepresentation: desc.repr,
						argumentType: `series ${TypeChecker.baseTypeName(elem2)}`,
						currentTypeDocStr: `series ${TypeChecker.baseTypeName(elem1)}`,
						funId: functionName,
						typePostfix: "",
					},
				});
			}
		}
	}

	// A `simple`-qualified param (e.g. ta.ema's `length: simple int`) rejects
	// a series value. The param's qualifier is lost when mapToPineType
	// collapses "simple int" -> "int", and these functions are often
	// "overloaded" (a union param maps to unknown), so the generic loop never
	// catches it. Read the qualifier off rawType and flag a series arg
	// directly. Gate on isAssignable so a base-incompatible arg (handled
	// elsewhere) is not double-reported here. see INV088
	if (checkArgTypes) {
		for (let i = 0; i < signature.parameters.length; i++) {
			const param = signature.parameters[i];
			if (!param.type || !isSimpleQualifiedParam(param.rawType)) continue;
			const provided = providedArgs.get(param.name) ?? positionalArgs[i];
			if (!provided || !isSeriesQualified(provided.type)) continue;
			if (!TypeChecker.isAssignable(provided.type, param.type)) continue;
			const desc = v.describeArgForTemplate(
				provided.arg.value,
				provided.type,
				version,
			);
			v.addTemplateError({
				line: provided.arg.value.line,
				column: provided.arg.value.column,
				length: 0,
				message: CE10123_TEMPLATE,
				severity: DiagnosticSeverity.Error,
				code: "CE10123",
				ctx: {
					argDisplayName: param.name,
					argUserFriendlyRepresentation: desc.repr,
					argumentType: desc.typeStr,
					currentTypeDocStr: param.rawType ?? String(param.type),
					funId: functionName,
					typePostfix: "",
				},
			});
		}
	}

	// CE10123: a `simple <special-enum>` param (request.security's
	// `lookahead: simple barmerge_lookahead`, scale_type, ...) fed a
	// series-qualified arg. INV088 covers `simple <scalar>`; the special enum
	// types collapse to "unknown" in mapToPineType, so neither the generic loop
	// nor INV088 sees them, and the ARG's base is unknown too. exprQualifier
	// proves the arg promotes to series (a ternary over a series condition);
	// the arg base IS the param's special type (just series-qualified), so the
	// argumentType renders as `series <param-base>` (matching TV). A const /
	// simple / input arg (a bare `barmerge.lookahead_on`) is left alone. see
	// INV113
	if (checkArgTypes) {
		for (let i = 0; i < signature.parameters.length; i++) {
			const param = signature.parameters[i];
			const raw = (param.rawType ?? "").trim();
			const m = raw.match(/^simple\s+([A-Za-z_][A-Za-z0-9_.]*)$/);
			if (!m || SCALAR_BASE_TYPES.has(m[1])) continue;
			const provided = providedArgs.get(param.name) ?? positionalArgs[i];
			if (!provided) continue;
			const argExpr = provided.arg.value;
			if (exprQualifier(v, argExpr, version) !== "series") continue;
			// TV renders a special-enum composite's repr bare ("operator ?:"),
			// not the string case's `call "operator ?:" (type)` wrapper; a leaf
			// var/member is rendered by name (probed - variable form "la").
			let repr: string;
			if (argExpr.type === "TernaryExpression") {
				repr = "operator ?:";
			} else if (
				argExpr.type === "BinaryExpression" ||
				argExpr.type === "UnaryExpression"
			) {
				repr = `operator ${(argExpr as BinaryExpression | UnaryExpression).operator}`;
			} else {
				repr = v.describeArgForTemplate(
					argExpr,
					`series ${m[1]}` as PineType,
					version,
				).repr;
			}
			v.addTemplateError({
				line: argExpr.line,
				column: argExpr.column,
				length: 0,
				message: CE10123_TEMPLATE,
				severity: DiagnosticSeverity.Error,
				code: "CE10123",
				ctx: {
					argDisplayName: param.name,
					argUserFriendlyRepresentation: repr,
					argumentType: `series ${m[1]}`,
					currentTypeDocStr: raw,
					funId: functionName,
					typePostfix: "",
				},
			});
		}
	}

	// CE10123: a FLOAT LITERAL in an `int` param slot. TV narrows strictly
	// (float->int is rejected, though int->float widens), but isAssignable treats
	// int<->float bidirectionally, so the main loop misses `ta.sma(close, 14.5)`
	// and `array.new<int>(2.5)` (the latter also positional-bypassed as a generic).
	// Scoped to a float LITERAL into a cleanly int-typed param: unambiguous - a
	// literal is never series, so no overlap with the INV088 simple-qualifier
	// check - and it runs regardless of the overload/generic positional bypass.
	// Positional args are skipped on real-overload functions (ambiguous slots);
	// named args are always safe. A float VARIABLE stays lenient (our float
	// inference for those is the shakier path). see INV107
	if (checkArgTypes) {
		for (let i = 0; i < signature.parameters.length; i++) {
			const param = signature.parameters[i];
			if (
				!param.type ||
				param.type === "unknown" ||
				TypeChecker.baseTypeName(String(param.type)) !== "int"
			) {
				continue;
			}
			const provided =
				providedArgs.get(param.name) ??
				(hasOverloadSignatures(functionName) ? undefined : positionalArgs[i]);
			if (provided?.arg.value.type !== "Literal") continue;
			if (TypeChecker.baseTypeName(String(provided.type)) !== "float") continue;
			const desc = v.describeArgForTemplate(
				provided.arg.value,
				provided.type,
				version,
			);
			v.addTemplateError({
				line: provided.arg.value.line,
				column: provided.arg.value.column,
				length: 0,
				message: CE10123_TEMPLATE,
				severity: DiagnosticSeverity.Error,
				code: "CE10123",
				ctx: {
					argDisplayName: param.name,
					argUserFriendlyRepresentation: desc.repr,
					argumentType: desc.typeStr,
					currentTypeDocStr: param.rawType ?? String(param.type),
					funId: functionName,
					typePostfix: "",
				},
			});
		}
	}

	// CE10068: a param whose accepted values are a fixed set of NAMESPACED enum
	// members (e.g. strategy.entry's `direction`: strategy.long/strategy.short)
	// received a bare literal. TV reports the allowed members, not a type
	// mismatch (CE10068, not CE10123). Gated tightly to avoid FPs:
	//  - every allowedValue must be a dotted member (`strategy.long`). The
	//    other allowedValues shape is bare idents (`close`, "Traditional") for
	//    params that accept a series var or a plain string literal - flagging a
	//    literal there would be wrong (max_bars_back(close), pivot type "Classic").
	//  - the argument must be a numeric/string LITERAL: a namespaced constant is
	//    an Identifier/MemberExpression, never a literal, so a literal is
	//    unambiguously invalid (and a valid `strategy.long` / ternary of members
	//    / variable stays lenient).
	//  - positional args are only checked on single-signature functions; real
	//    overloads (fill's plot/hline forms) scramble positions, so a positional
	//    title can land in `display`'s slot. Named args are always unambiguous.
	// see INV100
	if (checkArgTypes) {
		for (let i = 0; i < signature.parameters.length; i++) {
			const param = signature.parameters[i];
			// param.type === "unknown": a special enum type the checker doesn't
			// model (strategy_direction, plot_display, barmerge_*, ...). This
			// EXCLUDES modeled string-typed params - both genuine string enums
			// (out of scope) and scrape-corrupted ones like strategy()'s
			// `close_entries_rule` (a `const string` taking "FIFO"/"ANY", whose
			// allowedValues wrongly scraped a stray "strategy.exit" cross-ref).
			if (
				param.type !== "unknown" ||
				!param.allowedValues?.length ||
				!param.allowedValues.every((vv) => vv.includes("."))
			) {
				continue;
			}
			const provided =
				providedArgs.get(param.name) ??
				(hasOverloadSignatures(functionName) ? undefined : positionalArgs[i]);
			if (provided?.arg.value.type !== "Literal") continue;
			v.addTemplateError({
				line: provided.arg.value.line,
				column: provided.arg.value.column,
				length: 0,
				message:
					'Invalid argument "{argumentName}" in "{funName}" call. Possible values: [{possibleValues}]',
				severity: DiagnosticSeverity.Error,
				code: "CE10068",
				ctx: {
					argumentName: param.name,
					funName: functionName,
					possibleValues: param.allowedValues.join(", "),
				},
			});
		}
	}

	// Validate each parameter
	for (let i = 0; i < signature.parameters.length; i++) {
		const param = signature.parameters[i];

		// Check named argument
		const namedArg = providedArgs.get(param.name);
		if (namedArg) {
			// Validate type (named args are unambiguous, so we can check them).
			// Union/polymorphic params map to "unknown" and fall through here.
			// TV's CE10123 template, anchored at the argument VALUE (probed
			// INV059 p01-p03, INV061 p03-p09). see INV061
			if (checkArgTypes && param.type && param.type !== "unknown") {
				if (!TypeChecker.isAssignable(namedArg.type, param.type)) {
					const desc = v.describeArgForTemplate(
						namedArg.arg.value,
						namedArg.type,
						version,
					);
					v.addTemplateError({
						line: namedArg.arg.value.line,
						column: namedArg.arg.value.column,
						length: 0,
						message: CE10123_TEMPLATE,
						severity: DiagnosticSeverity.Error,
						code: "CE10123",
						ctx: {
							argDisplayName: param.name,
							argUserFriendlyRepresentation: desc.repr,
							argumentType: desc.typeStr,
							currentTypeDocStr: param.rawType ?? String(param.type),
							funId: functionName,
							typePostfix: "",
						},
					});
				}
			}
			continue;
		}

		// Check positional argument. Functions with any still-unknown param
		// (overloaded) skip positional checking - positions are ambiguous
		// across overload forms. Cleanly-typed params (incl. ex-polymorphic
		// ones) are validated on v6 scripts.
		if (i < positionalArgs.length) {
			if (functionHasOverloads) {
				continue;
			}
			const posArg = positionalArgs[i];
			// Positional args use the same CE10123 template - TV resolves the
			// param name (probed `plot(close, 42)` names "title", INV061 p02).
			if (checkArgTypes && param.type && param.type !== "unknown") {
				if (!TypeChecker.isAssignable(posArg.type, param.type)) {
					const desc = v.describeArgForTemplate(
						posArg.arg.value,
						posArg.type,
						version,
					);
					v.addTemplateError({
						line: posArg.arg.value.line,
						column: posArg.arg.value.column,
						length: 0,
						message: CE10123_TEMPLATE,
						severity: DiagnosticSeverity.Error,
						code: "CE10123",
						ctx: {
							argDisplayName: param.name,
							argUserFriendlyRepresentation: desc.repr,
							argumentType: desc.typeStr,
							currentTypeDocStr: param.rawType ?? String(param.type),
							funId: functionName,
							typePostfix: "",
						},
					});
				}
			}
			continue;
		}

		// Parameter not provided - TV's CE10165, one error per missing
		// param, anchored at the callee (probed: ta.sma() enumerates both
		// source and length; dual variable/function names like ta.tr()
		// still require their args - the bare VARIABLE form is a separate
		// symbol). Requiredness comes from the INV050 probe sweep: the
		// reference prose under-documents optionality, so probe data is
		// the only reliable source. Skipped for overloaded functions
		// (both the unknown-typed-param heuristic and the overloads[]
		// field - the probe covers TV's preferred overload only, and a
		// call may satisfy another: label.new x/y vs point), for calls
		// truncated by in-call error recovery (INV047 / #46(b) - the
		// args are incomplete, not absent), and on non-v6 scripts (G004
		// - pine-data ships v6 signatures only). see INV050
		if (
			!param.optional &&
			checkArgTypes &&
			!functionHasOverloads &&
			!hasOverloadSignatures(functionName) &&
			!call.recovered
		) {
			v.addError(
				call.line,
				call.column,
				functionName.length,
				`No value assigned to the "${param.name}" parameter in ${functionName}()`,
				DiagnosticSeverity.Error,
			);
		}
	}

	// Overloaded functions: the blanket missing-arg check above skips them
	// (a call may satisfy a DIFFERENT overload than the INV050 probe
	// enumerated). But a call providing fewer positional args than the
	// MINIMAL-arity overload's required count satisfies NO overload - a
	// sound CE10165. Measured against that overload's own param order, so
	// ta.highest(10) (the 1-arg form) is fine while matrix.sum(m) flags the
	// missing id2. see INV056
	if (checkArgTypes && !call.recovered && hasOverloadSignatures(functionName)) {
		const minReq = getMinimalRequiredParams(functionName);
		for (let j = positionalArgs.length; j < minReq.length; j++) {
			const name = minReq[j];
			if (providedArgs.has(name)) continue;
			v.addError(
				call.line,
				call.column,
				functionName.length,
				`No value assigned to the "${name}" parameter in ${functionName}()`,
				DiagnosticSeverity.Error,
			);
		}
	}

	// Check for invalid named parameters - TV's CE10120, anchored at the
	// argument NAME (probed `plotshape(..., shape = ...)`, INV059 p05 /
	// INV061 p06). see INV061
	for (const [name, entry] of providedArgs.entries()) {
		if (!signature.parameters.some((p) => p.name === name)) {
			v.addTemplateError({
				line: entry.arg.nameLine ?? call.line,
				column: entry.arg.nameColumn ?? call.column,
				length: name.length,
				message:
					'The "{signature}" function does not have an argument with the name "{name}"',
				severity: DiagnosticSeverity.Error,
				code: "CE10120",
				ctx: { name, signature: functionName },
			});
		}
	}

	// Special case validations
	validateSpecialCases(v, call, functionName, args);

	// CE10123: const-required params receiving a non-const argument. see INV014
	checkConstArgs(v, call, functionName, signature, version);

	// Base-type check for union-typed params the main loop skips. see INV016
	checkUnionArgs(v, call, functionName, version);
}

// Whether an expression's inferred type is trustworthy enough to flag an
// arg-type mismatch on. Literals and operator expressions have solid type
// rules; built-in vars/constants/calls carry types straight from pine-data.
// User identifiers and user-defined-function calls are excluded - our
// inference for those is the known-shaky path (UDF returns, etc.), and a
// wrong base there would surface as a false positive. see INV016.
export function isReliablyTyped(
	v: UnifiedPineValidator,
	expr: Expression,
): boolean {
	switch (expr.type) {
		case "Literal":
		case "BinaryExpression":
		case "UnaryExpression":
			return true;
		case "Identifier":
			return getBuiltinVarInfo((expr as Identifier).name) !== undefined;
		case "MemberExpression": {
			const m = expr as MemberExpression;
			if (m.object.type !== "Identifier") return false;
			const name = `${(m.object as Identifier).name}.${m.property.name}`;
			return isBuiltinConstant(name) || getBuiltinVarInfo(name) !== undefined;
		}
		case "CallExpression": {
			const ce = expr as CallExpression;
			let name = "";
			if (ce.callee.type === "Identifier") {
				name = (ce.callee as Identifier).name;
			} else if (ce.callee.type === "MemberExpression") {
				const mm = ce.callee as MemberExpression;
				if (mm.object.type === "Identifier") {
					name = `${(mm.object as Identifier).name}.${mm.property.name}`;
				}
			}
			// Built-in call (return type from pine-data) - trust it; a UDF call
			// is not in functionSignatures, so it's excluded.
			return name !== "" && v.functionSignatures.has(name);
		}
		default:
			return false;
	}
}

// Validate arguments against UNION-typed params (e.g. nz's
// `series int/float/color`, int's `series int/float`). The main arg loop maps
// a union to "unknown" via mapToPineType and skips it (the INV013 safety net),
// so nz(<bool>)/int(true) - real CE10123 errors in TV - slipped through. The
// merged param type is already the cross-overload union (union-types.ts), so
// an arg whose base is outside it is rejected by every overload. Conservative:
// only flags a KNOWN scalar base that's absent from the union (int/float are
// interchangeable); unknown/na/non-scalar args are left alone, so no FPs.
// Positional checking is skipped for overloaded funcs (ambiguous positions),
// matching the main loop. see INV016.
export function checkUnionArgs(
	v: UnifiedPineValidator,
	call: CallExpression,
	functionName: string,
	version: string,
): void {
	if (version !== "6") return; // arg-type checks are v6-only. see G004
	const SCALARS = new Set(["int", "float", "bool", "string", "color"]);
	const functionHasOverloads = hasOverloads(functionName);
	let positionalNum = 0;
	let sawNamed = false;
	for (const arg of call.arguments) {
		let members: string[] | null;
		let paramInfo: { name: string; docType: string } | null;
		if (arg.name) {
			sawNamed = true;
			members = namedParamUnionMembers(functionName, arg.name);
			paramInfo = unionParamInfo(functionName, -1, arg.name);
		} else {
			positionalNum++;
			// A positional arg after a named one is malformed ordering (TV's
			// own error); positional->param indices are unreliable, so don't
			// emit a misleading type mismatch on top. see INV016
			if (sawNamed || functionHasOverloads) continue;
			const index = positionalNum - 1;
			members = positionalParamUnionMembers(functionName, index);
			paramInfo = unionParamInfo(functionName, index);
		}
		if (!members) continue;
		// Only trust the arg's type when it comes from a reliable source.
		// Broad union-checking otherwise amplifies every type-inference gap
		// (UDF returns, user vars) into a false positive on valid code - e.g.
		// `color.from_gradient(Vol, ...)` where `Vol = someUdf()` is a float we
		// mis-infer as bool. Mirrors describeNonConstArg's conservatism. INV016
		if (!isReliablyTyped(v, arg.value)) continue;
		const argType = v.inferExpressionType(arg.value, version);
		const argBase = v.getBaseType(argType);
		if (!SCALARS.has(argBase)) continue; // unknown/na/non-scalar -> skip
		const numeric = argBase === "int" || argBase === "float";
		const ok =
			members.includes(argBase) ||
			(numeric && (members.includes("int") || members.includes("float")));
		if (!ok) {
			const desc = v.describeArgForTemplate(arg.value, argType, version);
			v.addTemplateError({
				line: arg.value.line,
				column: arg.value.column,
				length: 0,
				message: CE10123_TEMPLATE,
				severity: DiagnosticSeverity.Error,
				code: "CE10123",
				ctx: {
					argDisplayName: paramInfo?.name ?? arg.name ?? String(positionalNum),
					argUserFriendlyRepresentation: desc.repr,
					argumentType: desc.typeStr,
					currentTypeDocStr: `simple ${members[0]}`,
					funId: functionName,
					typePostfix: "",
				},
			});
		}
	}
}

// CE10123: a parameter that requires a compile-time constant received a
// provably non-const argument. Our internal types drop the const/simple/input
// qualifier (mapToPineType collapses them), so this reads the raw qualifier
// from pine-data directly. Both the const-required set and the per-overload
// return qualifiers are data-driven (see builtins.ts) and were verified
// exhaustively against `pine-lint --tv`. see INV014.
export function checkConstArgs(
	v: UnifiedPineValidator,
	call: CallExpression,
	functionName: string,
	_signature: FunctionSignature,
	version: string,
): void {
	if (version !== "6") return; // arg-type checks are v6-only. see G004
	const args = call.arguments;
	const positionalCount = args.filter((a) => !a.name).length;
	let positionalIndex = -1;
	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		// Resolve which const-required param this argument targets. Named args
		// are unambiguous (by name across overloads); positional args must be
		// resolved arity-aware (overloads can reshuffle positions). see INV014
		let paramName: string | undefined;
		let docType: string | undefined;
		if (arg.name) {
			if (paramRequiresConst(functionName, arg.name)) {
				paramName = arg.name;
				docType = getConstParamDocType(functionName, arg.name) ?? "const";
			}
		} else {
			positionalIndex++;
			const hit = positionalConstParam(
				functionName,
				positionalIndex,
				positionalCount,
			);
			if (hit) {
				paramName = hit.name;
				docType = hit.docType;
			}
		}
		if (!paramName || !docType) continue;
		const desc = describeNonConstArg(v, arg.value, version);
		if (!desc) continue;
		v.addTemplateError({
			line: arg.value.line,
			column: arg.value.column,
			length: 0,
			message: CE10123_TEMPLATE,
			severity: DiagnosticSeverity.Error,
			code: "CE10123",
			ctx: {
				argDisplayName: paramName,
				argUserFriendlyRepresentation: desc.repr,
				argumentType: desc.typeStr,
				currentTypeDocStr: docType,
				funId: functionName,
				typePostfix: "",
			},
		});
	}
}

// Qualifier lattice for arg-qualifier inference: const < input < simple <
// series (TV's promotion order). see INV112
const QUALIFIER_NAMES = ["const", "input", "simple", "series"] as const;
type QualName = (typeof QUALIFIER_NAMES)[number];
const qrankOf = (q: QualName): number => QUALIFIER_NAMES.indexOf(q);

// Infer the qualifier of an expression (const/input/simple/series), promoting
// composites to their strongest operand: a ternary or binary over a series
// operand is series. Returns null when it cannot be determined for ANY leaf,
// so callers stay conservative (a `true ? "a" : "b"` of all-const leaves is
// const and must not be flagged; an unresolvable leaf yields null = lenient).
// see INV112
export function exprQualifier(
	v: UnifiedPineValidator,
	expr: Expression,
	version: string,
): QualName | null {
	switch (expr.type) {
		case "Literal":
			return "const";
		case "Identifier": {
			const name = (expr as Identifier).name;
			const info = getBuiltinVarInfo(name);
			if (info) return info.qualifier as QualName;
			const sym = v.symbolTable.lookup(name);
			const symType = sym?.type as string | undefined;
			const m = symType?.match(/^(series|input|simple|const)[< ]/);
			if (sym?.kind === "variable" && m) return m[1] as QualName;
			return null;
		}
		case "MemberExpression": {
			const m = expr as MemberExpression;
			if (m.object.type !== "Identifier") return null;
			const name = `${(m.object as Identifier).name}.${m.property.name}`;
			if (isBuiltinConstant(name)) return "const";
			const info = getBuiltinVarInfo(name);
			if (info) return info.qualifier as QualName;
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
			const lead = raw?.match(/^(const|input|simple|series)\b/);
			return lead ? (lead[1] as QualName) : null;
		}
		case "UnaryExpression":
			return exprQualifier(v, (expr as UnaryExpression).argument, version);
		case "BinaryExpression": {
			const b = expr as BinaryExpression;
			const l = exprQualifier(v, b.left, version);
			const r = exprQualifier(v, b.right, version);
			if (l === null || r === null) return null;
			return qrankOf(l) >= qrankOf(r) ? l : r;
		}
		case "TernaryExpression": {
			const t = expr as TernaryExpression;
			const parts = [t.condition, t.consequent, t.alternate].map((e) =>
				exprQualifier(v, e, version),
			);
			if (parts.some((p) => p === null)) return null;
			return (parts as QualName[]).reduce((a, b) =>
				qrankOf(a) >= qrankOf(b) ? a : b,
			);
		}
		default:
			return null;
	}
}

// Decide whether an argument expression is PROVABLY non-const, and if so
// describe it (argumentType + user-friendly repr) for the CE10123 message.
// Deliberately conservative: returns null whenever we can't be certain
// (user variables, composite expressions, user-defined functions), so we
// never flag something TV would accept. Catches the common cases: built-in
// calls whose resolved overload returns simple/series/input (e.g.
// timestamp("UTC", y, m, d, ...)) and non-const built-in variables. see INV014
export function describeNonConstArg(
	v: UnifiedPineValidator,
	expr: Expression,
	version: string,
): { typeStr: string; repr: string } | null {
	switch (expr.type) {
		case "CallExpression": {
			const ce = expr as CallExpression;
			let name = "";
			if (ce.callee.type === "Identifier") {
				name = (ce.callee as Identifier).name;
			} else if (ce.callee.type === "MemberExpression") {
				const m = ce.callee as MemberExpression;
				if (m.object.type === "Identifier") {
					name = `${(m.object as Identifier).name}.${m.property.name}`;
				}
			}
			if (!name) return null;
			const argTypes = ce.arguments.map((a) =>
				v.inferExpressionType(a.value, version),
			);
			const raw = resolveCallReturnRaw(name, argTypes);
			// Only a positively non-const (simple/series/input) resolved return
			// is grounds to flag; const or unknown -> leave it alone.
			if (raw && /^(simple|series|input)\b/.test(raw)) {
				return { typeStr: raw, repr: `call "${name}" (${raw})` };
			}
			return null;
		}
		case "Identifier": {
			const idName = (expr as Identifier).name;
			const info = getBuiltinVarInfo(idName);
			if (info && info.qualifier !== "const") {
				return {
					typeStr: `${info.qualifier} ${info.base}`,
					repr: idName,
				};
			}
			// A USER variable is provably non-const only when its inferred
			// type is series- or input-QUALIFIED (`series<string>` from a
			// switch over series conditions, `input<string>` from an
			// input.bool-driven ternary/switch) - unqualified inferences
			// stay on the conservative null path. TV-confirmed on
			// plot(title=trend) for both qualifiers. see INV040
			if (!info) {
				const sym = v.symbolTable.lookup(idName);
				const symType = sym?.type as string | undefined;
				const m = symType?.match(/^(series|input)<(.+)>$/);
				if (sym?.kind === "variable" && m) {
					return { typeStr: `${m[1]} ${m[2]}`, repr: idName };
				}
			}
			return null;
		}
		case "MemberExpression": {
			const m = expr as MemberExpression;
			if (m.object.type !== "Identifier") return null;
			const name = `${(m.object as Identifier).name}.${m.property.name}`;
			if (isBuiltinConstant(name)) return null;
			const info = getBuiltinVarInfo(name);
			if (info && info.qualifier !== "const") {
				return { typeStr: `${info.qualifier} ${info.base}`, repr: name };
			}
			return null;
		}
		// Composite args (`close > 0 ? "a" : "b"`, `close > 0`): provably
		// non-const when the inferred qualifier promotes above const. TV renders
		// these as `call "operator ?:" (series string)` / `call "operator >"
		// (series bool)`. A const composite (`true ? "a" : "b"`) yields "const"
		// and is left alone. see INV112
		case "TernaryExpression":
		case "BinaryExpression": {
			const q = exprQualifier(v, expr, version);
			if (!q || q === "const") return null;
			const base = TypeChecker.baseTypeName(
				String(v.inferExpressionType(expr, version)),
			);
			if (base === "unknown") return null;
			const op =
				expr.type === "TernaryExpression"
					? "?:"
					: (expr as BinaryExpression).operator;
			return {
				typeStr: `${q} ${base}`,
				repr: `call "operator ${op}" (${q} ${base})`,
			};
		}
		default:
			return null;
	}
}

/**
 * Special-case semantic validations that check parameter relationships.
 * These are intentionally hardcoded here (not in pine-data) because they're
 * behavioral checks rather than type/signature data.
 */
export function validateSpecialCases(
	v: UnifiedPineValidator,
	_call: CallExpression,
	functionName: string,
	args: CallArgument[],
): void {
	// (The former plotshape shape->style suggestion was a pure duplicate:
	// the generic invalid-parameter check already fires on `shape=` and TV
	// emits exactly one error there. Removed - see INV059 p05.)

	// indicator/strategy: timeframe_gaps requires timeframe. A TV ERROR,
	// not a warning, anchored at the argument with TV's wording naming
	// the call (probed - INV059 p06).
	if (functionName === "indicator" || functionName === "strategy") {
		const gapsArg = args.find((a) => a.name === "timeframe_gaps");
		const hasTimeframe = args.some((a) => a.name === "timeframe");

		if (gapsArg && !hasTimeframe) {
			v.addError(
				gapsArg.value.line,
				gapsArg.value.column,
				functionName.length,
				`"timeframe_gaps" has no effect because the "${functionName}()" call has no "timeframe" argument`,
				DiagnosticSeverity.Error,
			);
		}
	}
}
