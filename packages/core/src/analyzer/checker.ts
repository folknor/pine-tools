// Pine Script Type Checker and Validator
// Performs semantic analysis and type checking on the AST

import { DiagnosticSeverity, type ValidationError } from "../common/errors";
import type {
	ArrayExpression,
	BinaryExpression,
	CallArgument,
	CallExpression,
	Expression,
	ExpressionStatement,
	FunctionParam,
	Identifier,
	IfExpression,
	IfStatement,
	IndexExpression,
	Literal,
	MemberExpression,
	Program,
	ReturnStatement,
	Statement,
	SwitchExpression,
	TernaryExpression,
	TupleDeclaration,
	UnaryExpression,
} from "../parser/ast";
import {
	type ArgumentInfo,
	buildFunctionSignatures,
	type FunctionSignature,
	getBuiltinVarInfo,
	getConstParamDocType,
	getMinArgsForVariadic,
	getPolymorphicReturnType,
	getPolymorphicType,
	getMinimalRequiredParams,
	hasReturnTypeParam,
	hasOverloads,
	hasOverloadSignatures,
	isBuiltinConstant,
	GENERIC_FUNCTION_BASES,
	isTopLevelOnly,
	isVariadicFunction,
	KNOWN_NAMESPACES,
	mapReturnTypeToPineType,
	mapToPineType,
	NAMESPACE_PROPERTIES,
	namedParamUnionMembers,
	paramRequiresConst,
	positionalConstParam,
	positionalParamUnionMembers,
	resolveCallReturnRaw,
} from "./builtins";
import { TYPE_NAMES } from "../../../../pine-data/v6";
import { TYPE_KEYWORDS } from "../constants/keywords";
import { type Symbol as SymbolInfo, SymbolTable } from "./symbols";
import { type PineType, TypeChecker } from "./types";

// Re-export for backward compatibility
export { DiagnosticSeverity, type ValidationError } from "../common/errors";

// Flatten a member-call callee into its dotted name (`strategy.risk.max_drawdown`).
// Walks `.object` recursively so two-level builtin namespaces resolve, not just
// `ns.member`. Returns "" if any link in the chain isn't a plain identifier
// property access (e.g. `foo().bar`, `arr[0].baz`). see INV054
function memberChainName(expr: Expression): string {
	if (expr.type === "Identifier") return (expr as Identifier).name;
	if (expr.type === "MemberExpression") {
		const m = expr as MemberExpression;
		const base = memberChainName(m.object);
		if (!base) return "";
		return `${base}.${m.property.name}`;
	}
	return "";
}

export class UnifiedPineValidator {
	private errors: ValidationError[] = [];
	private symbolTable: SymbolTable;
	private functionSignatures: Map<string, FunctionSignature>;
	private expressionTypes: Map<Expression, PineType> = new Map();
	// Function-name → per-tuple-element return types, for user-defined
	// functions / methods whose body's final expression is a tuple
	// (ArrayExpression). Used by inferTupleElementTypes so destructuring
	// assignments like `[a, b, c] = f()` recover the element types
	// rather than defaulting everything to `series<float>`. see INV010.
	// Captured tuple-return shapes per UDF name. A name can carry several
	// arities (e.g. a 2-tuple method and a 3-tuple function overload both
	// named `valueAtTime`), so each entry is a list of shapes. see INV010.
	private udfTupleReturnTypes: Map<string, PineType[][]> = new Map();
	private blockDepth: number = 0;
	// Built-in variables referenced (as built-ins) so far, in source
	// order. Declaring a variable with one of these names afterwards is
	// TV's CE10190; without a prior use it is only the CW10011 warning
	// (probed 2026-06-04, see INV023 / TODO #40).
	private usedBuiltins: Set<string> = new Set();
	// UDT / enum names declared so far, in source order. A declaration's
	// type annotation must name one of these (or a built-in type) - and
	// use-before-declaration is the same CE10149 (probed). see INV033
	private declaredTypeNames: Set<string> = new Set();
	// Enum names specifically (subset of declaredTypeNames). A bare enum
	// name in value position is TV's CE10074 ("Cannot use the "E" as a
	// value...") while a bare UDT name is accepted - so the value-position
	// check needs to tell the two apart. see INV048
	private declaredEnumNames: Set<string> = new Set();
	// UDF / method names declared so far, in source order. The CE10271
	// undefined-callable check consults this instead of the symbol table
	// because variables SHARE the symbol namespace and hide functions:
	// `loss = loss(...)`, `[sto] = sto()`, and a later body-local
	// pre-collected over a global UDF (`float ema2 = ...` inside a body
	// calling global `ema2()`) are all TV-legal calls. see INV036
	private declaredFunctionNames: Set<string> = new Set();
	// Namespaces bound by an `import` - the alias if present, else the
	// library name (the path's middle segment: `import User/ta/8` binds the
	// namespace `ta`). Members of these are library calls we cannot resolve,
	// so the builtin-namespace member-call check skips them even when the
	// name collides with a built-in namespace. see INV053
	private importedNamespaces: Set<string> = new Set();
	// Lexical stack of names DECLARED in each scope, for TV's CE10095
	// ("X" is already defined): re-declaring a name in the SAME scope is
	// an error - typed or untyped, after var/varip, and a function param
	// re-declared in its body (all probed). Shadowing a PARENT scope is
	// only the CW10011/CW10013 warning (INV020), hence a stack and not a
	// single set. Unlike the symbol table, if-bodies get their own frame
	// here (TV scopes them) and builtins never enter it. see INV035
	private declScopes: Array<Set<string>> = [];

	constructor() {
		this.symbolTable = new SymbolTable();
		this.functionSignatures = buildFunctionSignatures();
	}

	validate(ast: Program, version: string = "6"): ValidationError[] {
		this.errors = [];
		this.symbolTable = new SymbolTable();
		this.expressionTypes.clear();
		this.udfTupleReturnTypes.clear();
		this.usedBuiltins.clear();
		this.declaredTypeNames.clear();
		this.declaredEnumNames.clear();
		this.declaredFunctionNames.clear();
		this.importedNamespaces.clear();
		this.declScopes = [new Set()];

		// Pre-scan imports so a member call on an imported namespace is
		// recognised regardless of source order (the main pass below is
		// single-pass top-to-bottom). see INV053
		for (const statement of ast.body) {
			if (statement.type === "ImportStatement") {
				const ns = statement.alias ?? statement.libraryPath.split("/")[1];
				if (ns) this.importedNamespaces.add(ns);
			}
		}

		// Single pass: collect declarations and validate together
		// This ensures function parameters are in scope during validation
		for (const statement of ast.body) {
			this.validateStatement(statement, version);
		}

		// Check for unused variables (only for v6)
		if (version === "6") {
			this.checkUnusedVariables();
		}

		return this.errors;
	}

	private collectDeclarations(
		statement: Statement,
		version: string = "6",
	): void {
		if (statement.type === "VariableDeclaration") {
			const symbol: SymbolInfo = {
				name: statement.name,
				type: "unknown",
				line: statement.line,
				column: statement.column,
				used: false,
				kind: "variable",
				declaredWith: statement.varType,
			};

			// Use type annotation if present, otherwise infer from initialization
			if (statement.typeAnnotation) {
				symbol.type = mapToPineType(statement.typeAnnotation.name);
			} else if (statement.init) {
				const initType = this.inferExpressionType(statement.init, version);
				// A bare-na initializer gives the variable NO type (TV's CE10097
				// makes the declaration itself the error in v6; in v4/v5 the type
				// comes from later := assignments). Recording "na" here would
				// trip every later use/assignment of the variable. see INV032
				symbol.type = TypeChecker.isNaType(initType) ? "unknown" : initType;
			}

			this.symbolTable.define(symbol);
		} else if (statement.type === "TupleDeclaration") {
			// Handle tuple destructuring: [a, b, c] = expr
			const tupleDecl = statement as TupleDeclaration;
			const elementTypes = this.inferTupleElementTypes(tupleDecl, version);
			this.defineTupleVariables(tupleDecl, elementTypes);
		} else if (statement.type === "FunctionDeclaration") {
			// NOTE: Function declarations are handled in validateStatement
			// to ensure proper scope management. This method is only called
			// from within the function scope that's already been entered.

			// Collect declarations from function body (without managing scope)
			for (const stmt of statement.body) {
				this.collectDeclarations(stmt, version);
			}
		} else if (
			statement.type === "TypeDeclaration" ||
			statement.type === "EnumDeclaration"
		) {
			this.declaredTypeNames.add(statement.name); // see INV033
			if (statement.type === "EnumDeclaration") {
				this.declaredEnumNames.add(statement.name); // see INV048
			}
			const symbol: SymbolInfo = {
				name: statement.name,
				type: "unknown",
				line: statement.line,
				column: statement.column,
				used: false,
				kind: "variable", // Treat as variable/namespace for now
				declaredWith: null,
			};
			this.symbolTable.define(symbol);
		} else if (statement.type === "MethodDeclaration") {
			// Handle method declarations like function declarations
			for (const stmt of statement.body) {
				this.collectDeclarations(stmt, version);
			}
		} else if (statement.type === "ImportStatement") {
			// Register import alias as a namespace/variable
			if (statement.alias) {
				const symbol: SymbolInfo = {
					name: statement.alias,
					type: "unknown", // Library type
					line: statement.line,
					column: statement.column,
					used: false,
					kind: "variable", // Treat as namespace
					declaredWith: null,
				};
				this.symbolTable.define(symbol);
			}
		} else if (statement.type === "SequenceStatement") {
			// Handle comma-separated declarations: x = 1, y = 2, z = 3
			for (const stmt of statement.statements) {
				this.collectDeclarations(stmt, version);
			}
		}
	}

	// TV's CE10190 (probed 2026-06-04, see INV023 / TODO #40): declaring
	// a variable named after a built-in VARIABLE errors when the built-in
	// was referenced anywhere EARLIER in source - any scope, global
	// redeclarations included. Without a prior use only the CW10011
	// warning (SemanticAnalyzer channel) applies. v6-only, like the other
	// shadow/unused machinery - legacy scripts stay lenient (G004).
	private checkBuiltinShadowDeclaration(
		name: string,
		line: number,
		column: number,
		version: string,
	): void {
		if (version !== "6") return;
		if (!this.usedBuiltins.has(name)) return;
		this.addError(
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
	private checkTypeAnnotationName(
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
				this.addError(
					decl0.startLine ?? stmt.line,
					startColumn + lt,
					raw.length - lt,
					message,
					DiagnosticSeverity.Error,
				);
				return;
			}
		}
		const base = this.invalidAnnotationBase(raw);
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
		this.addError(
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
	private invalidAnnotationBase(raw: string): string | null {
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
		if (this.declaredTypeNames.has(base)) return null;
		return base;
	}

	// TV's CE10149 fires on UDF/method parameter annotations too, anchored
	// at the annotation's first token (probed `f(source x)` at the keyword,
	// `g(Bar b)` for an undeclared UDT; earlier-declared UDT params accepted).
	// see INV033
	private checkParamTypeAnnotations(
		params: Array<{ typeAnnotation?: { name: string; line?: number; column?: number } }>,
		version: string,
	): void {
		if (version !== "6") return;
		for (const param of params) {
			const ann = param.typeAnnotation;
			if (!ann || ann.line === undefined || ann.column === undefined) continue;
			const base = this.invalidAnnotationBase(ann.name);
			if (base === null) continue;
			this.addError(
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
	private checkExportedParamsTypified(
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
			this.addError(
				param.line,
				param.column,
				param.name.length,
				"All exported functions args should be typified",
				DiagnosticSeverity.Error,
			);
		}
	}

	// The governing condition expressions of a conditional-expression node
	// (ternary condition, if-expression condition, switch discriminant +
	// case conditions), or null for any other node. see INV040
	private governingConditions(expr: Expression): Expression[] | null {
		switch (expr.type) {
			case "TernaryExpression":
				return [(expr as TernaryExpression).condition];
			case "IfExpression":
				return [(expr as IfExpression).condition];
			case "SwitchExpression": {
				const sw = expr as SwitchExpression;
				const conds: Expression[] = [];
				if (sw.discriminant) conds.push(sw.discriminant);
				for (const c of sw.cases) if (c.condition) conds.push(c.condition);
				return conds;
			}
			default:
				return null;
		}
	}

	// The qualifier a conditional expression's conditions impose on its
	// result: a series condition makes the whole value series; otherwise an
	// input condition makes it input (TV types BOTH the series-comparison
	// switch AND the input.bool-driven ternary/switch as qualified - the
	// plot-title CE10123 probes); null when no condition is qualified, so
	// const-condition results stay const-usable. see INV040
	private conditionQualifier(
		conditions: Expression[],
		version: string,
	): "series" | "input" | null {
		let sawInput = false;
		for (const c of conditions) {
			const t = this.inferExpressionType(c, version) as string;
			if (t.startsWith("series")) return "series";
			if (t.startsWith("input<")) sawInput = true;
		}
		return sawInput ? "input" : null;
	}

	private pushDeclScope(seedNames?: string[]): void {
		const frame = new Set<string>();
		if (seedNames) for (const n of seedNames) frame.add(n);
		this.declScopes.push(frame);
	}

	private popDeclScope(): void {
		this.declScopes.pop();
	}

	// TV's CE10095: declaring a name that this same scope already declared
	// (params count as declared by the function scope). v6-gated like the
	// other declaration checks - legacy versions used `=` for
	// reassignment. Anchored at the statement start. see INV035
	private checkRedeclaration(
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
		const frame = this.declScopes[this.declScopes.length - 1];
		if (!frame) return;
		if (version === "6" && frame.has(name)) {
			const startLine = statement.startLine ?? statement.line;
			const startColumn = statement.startColumn ?? statement.column;
			const span =
				statement.line === startLine
					? statement.column - startColumn + name.length
					: name.length;
			this.addError(
				startLine,
				startColumn,
				span,
				`"${name}" is already defined`,
				DiagnosticSeverity.Error,
			);
		}
		frame.add(name);
	}

	private validateStatement(statement: Statement, version: string = "6"): void {
		const _prevBlockDepth = this.blockDepth;
		switch (statement.type) {
			case "VariableDeclaration": {
				// An EXPORTED library variable must carry BOTH a `const`
				// modifier AND a type; TV flags every other form (type-no-const,
				// const-no-type, bare) with one message at the `export` keyword.
				// see INV052
				if (
					version === "6" &&
					statement.isExport &&
					(statement.varType !== "const" || !statement.typeAnnotation)
				) {
					this.addError(
						statement.startLine ?? statement.line,
						statement.startColumn ?? statement.column,
						"export".length,
						"Exported variable should have const modifier and type",
						DiagnosticSeverity.Error,
					);
				}
				this.checkBuiltinShadowDeclaration(
					statement.name,
					statement.line,
					statement.column,
					version,
				);
				this.checkTypeAnnotationName(statement, version);
				this.checkRedeclaration(statement.name, statement, version);
				// TV emits CE10025 a SECOND time at the statement start when a
				// nested-collection constructor is a declaration initializer
				// (probed: `var x = array.new<array<float>>()` errors at the
				// call AND at column 1). see INV038
				if (
					version === "6" &&
					statement.init?.type === "CallExpression" &&
					this.hasCollectionTemplateArg(statement.init as CallExpression)
				) {
					const init = statement.init as CallExpression;
					const startLine = statement.startLine ?? statement.line;
					const startColumn = statement.startColumn ?? statement.column;
					this.addError(
						startLine,
						startColumn,
						init.endLine === startLine && init.endColumn
							? init.endColumn - startColumn
							: statement.name.length,
						UnifiedPineValidator.NESTED_COLLECTION_MESSAGE,
						DiagnosticSeverity.Error,
					);
				}
				// A void-returning builtin call cannot initialize a variable:
				// TV's CE10098 "Void expression cannot be assigned to a
				// variable" (probed array.push / matrix.reverse, 2026-06-10).
				// We previously inferred void calls as "unknown" (assignable
				// to anything) and missed this for all 127 void builtins; the
				// census surfaced the matrix.* block that exposed it.
				// see INV055
				if (
					version === "6" &&
					statement.init?.type === "CallExpression" &&
					this.isVoidCall(statement.init as CallExpression, version)
				) {
					const init = statement.init as CallExpression;
					const startLine = statement.startLine ?? statement.line;
					const startColumn = statement.startColumn ?? statement.column;
					this.addError(
						startLine,
						startColumn,
						init.endLine === startLine && init.endColumn
							? init.endColumn - startColumn
							: statement.name.length,
						"Void expression cannot be assigned to a variable",
						DiagnosticSeverity.Error,
					);
				}

				// Pine has no array literals: `arr = [1, 2, 3]` is TV's
				// CE10156 'Syntax error at input "["' at the bracket, even
				// when closed (probed - see INV046). Tuple expressions are
				// only valid in return positions; a single-name declaration
				// init is never one. (TupleDeclaration destructures are a
				// different statement type and unaffected.)
				if (version === "6" && statement.init?.type === "ArrayExpression") {
					const arr = statement.init as ArrayExpression;
					this.addError(
						arr.startLine ?? arr.line,
						arr.startColumn ?? arr.column,
						1,
						'Syntax error at input "["',
						DiagnosticSeverity.Error,
					);
				}

				// First, register the variable in the symbol table
				const symbol: SymbolInfo = {
					name: statement.name,
					type: "unknown",
					line: statement.line,
					column: statement.column,
					used: false,
					kind: "variable",
					declaredWith: statement.varType,
				};

				// Use type annotation if present, otherwise infer from initialization
				if (statement.typeAnnotation) {
					symbol.type = mapToPineType(statement.typeAnnotation.name);
				} else if (statement.init) {
					const initType = this.inferExpressionType(statement.init, version);
					// Bare-na initializer: no type for the variable - the
					// declaration itself is the (v6) error. see INV032 and the
					// identical branch in collectDeclarations.
					symbol.type = TypeChecker.isNaType(initType) ? "unknown" : initType;
				}

				this.symbolTable.define(symbol);

				// Then validate the initialization expression
				if (statement.init) {
					this.validateExpression(statement.init, version);

					// Check type compatibility
					const initType = this.inferExpressionType(statement.init, version);
					// TV anchors declaration diagnostics at the statement start
					// (type keyword / var keyword), not the variable name. see INV032
					const startLine = statement.startLine ?? statement.line;
					const startColumn = statement.startColumn ?? statement.column;
					const span =
						statement.line === startLine
							? statement.column - startColumn + statement.name.length
							: statement.name.length;

					if (statement.typeAnnotation && initType !== "unknown") {
						const annotationName = statement.typeAnnotation.name;
						const declaredBase = TypeChecker.baseTypeName(annotationName);
						if (
							version === "6" &&
							TypeChecker.strictAssignApplies(initType, declaredBase)
						) {
							// TV's CE10173: declared base must match the initializer's
							// base exactly, except int->float widening and na to any
							// base but bool; qualifiers are free. Probed - see INV032.
							if (!TypeChecker.strictAssignOk(initType, declaredBase)) {
								// TV renders a bare declared keyword as "const T"; keep
								// an explicit annotation qualifier when present.
								const declRendered = /^(series|simple|input|const)\s/.test(
									annotationName,
								)
									? annotationName
									: `const ${declaredBase}`;
								this.addError(
									startLine,
									startColumn,
									span,
									`Cannot assign a value of the "${TypeChecker.renderQualifiedType(initType)}" type to the "${statement.name}" variable. The variable is declared with the "${declRendered}" type.`,
									DiagnosticSeverity.Error,
								);
							}
						} else {
							// Lenient path for everything the strict rule doesn't
							// cover (UDTs, collections, void, legacy versions).
							const varSymbol = this.symbolTable.lookupLocal(statement.name);
							if (
								varSymbol &&
								varSymbol.type !== "unknown" &&
								!TypeChecker.isAssignable(initType, varSymbol.type)
							) {
								this.addError(
									statement.line,
									statement.column,
									statement.name.length,
									`Cannot assign ${TypeChecker.displayType(initType)} to ${TypeChecker.displayType(varSymbol.type)}`,
									DiagnosticSeverity.Error,
								);
							}
						}
					} else if (
						!statement.typeAnnotation &&
						version === "6" &&
						TypeChecker.isNaType(initType)
					) {
						// TV's CE10097: a bare-na initializer needs a type keyword
						// (na alone gives the variable no type). Probed - see INV032.
						this.addError(
							startLine,
							startColumn,
							span,
							"Value with NA type cannot be assigned to a variable that was defined without type keyword",
							DiagnosticSeverity.Error,
						);
					}
				}
				break;
			}

			case "TupleDeclaration": {
				// Handle tuple destructuring: [a, b, c] = expr
				const tupleDecl = statement as TupleDeclaration;
				for (const name of tupleDecl.names) {
					this.checkBuiltinShadowDeclaration(
						name,
						tupleDecl.line,
						tupleDecl.column,
						version,
					);
					// Tuple names enter the redeclaration scope like plain
					// declarations: a later `m = ...` is CE10095, and so is a
					// duplicate name WITHIN one tuple (`[a, a] = ...`) - both
					// anchored at the statement start (probed). see INV035
					this.checkRedeclaration(name, tupleDecl, version);
				}
				const elementTypes = this.inferTupleElementTypes(tupleDecl, version);
				this.defineTupleVariables(tupleDecl, elementTypes);

				// Validate the init expression
				this.validateExpression(tupleDecl.init, version);
				break;
			}

			case "ExpressionStatement":
				this.validateExpression(statement.expression, version);
				break;

			case "FunctionDeclaration": {
				// First, infer the function return type from the body
				let returnType: PineType = "unknown";

				if (statement.returnType) {
					// Use explicit return type annotation if present
					returnType = mapToPineType(statement.returnType.name);
				} else {
					// Infer return type from function body
					returnType = this.inferFunctionReturnType(
						statement.body,
						version,
						statement.params,
					);
				}

				// If the body's final expression is a tuple, capture the
				// element types so `[a, b, c] = f()` recovers them at the
				// destructure site. see INV010.
				const tupleTypes = this.inferUdfTupleReturnTypes(
					statement.body,
					version,
					statement.params,
				);
				if (tupleTypes)
					this.recordUdfTupleReturn(statement.name, tupleTypes);

				// Register the function in the symbol table at the outer scope
				this.declaredFunctionNames.add(statement.name); // see INV036
				this.symbolTable.define({
					name: statement.name,
					type: returnType,
					line: statement.line,
					column: statement.column,
					used: false,
					kind: "function",
					declaredWith: null,
				});

				this.symbolTable.enterScope();
				this.blockDepth++;

				this.checkParamTypeAnnotations(statement.params, version);
				this.checkExportedParamsTypified(
					statement.isExport,
					statement.params,
					version,
				);

				// Add function parameters to scope
				for (const param of statement.params) {
					// Use explicit type annotation if present, otherwise "unknown"
					// Using "unknown" for untyped params avoids false positives from heuristics
					const paramType: PineType = param.typeAnnotation
						? mapToPineType(param.typeAnnotation.name)
						: "unknown";

					this.symbolTable.define({
						name: param.name,
						type: paramType,
						line: statement.line,
						column: statement.column,
						used: false,
						kind: "variable",
						declaredWith: null,
					});
				}

				// Collect declarations within function body FIRST
				for (const stmt of statement.body) {
					this.collectDeclarations(stmt, version);
				}

				// THEN validate function body (with all variables in scope).
				// Params count as declared by the function scope (re-declaring
				// one in the body is CE10095, probed). see INV035
				this.pushDeclScope(statement.params.map((p) => p.name));
				for (const stmt of statement.body) {
					this.validateStatement(stmt, version);
				}
				this.popDeclScope();
				this.symbolTable.exitScope();
				this.blockDepth--;
				break;
			}

			case "IfStatement": {
				this.validateExpression(statement.condition, version);
				const condType = this.inferExpressionType(statement.condition, version);
				// Skip check if type is unknown (can't verify, don't complain).
				// TV's wording and anchor: 'The condition of the "if" statement
				// must evaluate to a "bool" value.' at the CONDITION expression
				// (corpus verdict 8fcd16c1 lines 317:4/328:4; we used to anchor
				// at the if keyword with our own wording, double-counting the
				// pair in the diff). see INV041
				if (condType !== "unknown" && !TypeChecker.isBoolType(condType)) {
					this.addError(
						statement.condition.line || statement.line,
						statement.condition.column || statement.column,
						10,
						'The condition of the "if" statement must evaluate to a "bool" value.',
						DiagnosticSeverity.Error,
					);
				}

				// In v6, each if branch is a real scope: TV scopes branch-local
				// declarations (CE10095 redeclaration, INV035) AND rejects
				// references to them from outside ("Undeclared identifier",
				// TV-confirmed on `[stopLoss, takeProfit]` after if/else
				// branch declarations) - declarations collect INTO the branch
				// scope so they no longer leak. Pre-v6 published scripts rely
				// on the leak (230 corpus records on v4/v5 files appeared
				// under an ungated draft), so legacy keeps the flat model
				// (G004). see INV037
				const scopeBranches = version === "6";
				if (scopeBranches) this.symbolTable.enterScope();
				this.blockDepth++;
				this.pushDeclScope();
				for (const stmt of statement.consequent) {
					this.collectDeclarations(stmt, version);
				}
				for (const stmt of statement.consequent) {
					this.validateStatement(stmt, version);
				}
				this.popDeclScope();
				this.blockDepth--;
				if (scopeBranches) this.symbolTable.exitScope();

				if (statement.alternate) {
					if (scopeBranches) this.symbolTable.enterScope();
					this.blockDepth++;
					this.pushDeclScope();
					for (const stmt of statement.alternate) {
						this.collectDeclarations(stmt, version);
					}
					for (const stmt of statement.alternate) {
						this.validateStatement(stmt, version);
					}
					this.popDeclScope();
					this.blockDepth--;
					if (scopeBranches) this.symbolTable.exitScope();
				}
				break;
			}

			case "ForStatement":
			case "ForInStatement":
				// For loops create a new scope and define the iterator variable
				this.symbolTable.enterScope();
				this.blockDepth++;

				// Add the iterator variable to the scope. The counted form's
				// iterator is always int; the for-in element (single form, or
				// `iterator2` of `for [index, value] in`) has the collection's
				// element type, which we don't derive yet - use "unknown" to
				// stay lenient. see plan/31.
				if ("iterator" in statement) {
					this.symbolTable.define({
						name: statement.iterator,
						type:
							statement.type === "ForInStatement" && !statement.iterator2
								? "unknown"
								: "int",
						line: statement.line,
						column: statement.column,
						used: false,
						kind: "variable",
						declaredWith: null,
					});
				}
				if ("iterator2" in statement && statement.iterator2) {
					this.symbolTable.define({
						name: statement.iterator2,
						type: "unknown",
						line: statement.line,
						column: statement.column,
						used: false,
						kind: "variable",
						declaredWith: null,
					});
				}

				// Validate range/collection expressions
				if ("from" in statement) {
					this.validateExpression(statement.from, version);
				}
				if ("to" in statement) {
					this.validateExpression(statement.to, version);
				}
				if ("collection" in statement) {
					this.validateExpression(statement.collection, version);
				}

				// Collect declarations first
				for (const stmt of statement.body) {
					this.collectDeclarations(stmt, version);
				}
				// Then validate. Iterators count as declared by the loop scope.
				// see INV035
				this.pushDeclScope(
					[
						"iterator" in statement ? statement.iterator : undefined,
						"iterator2" in statement ? statement.iterator2 : undefined,
					].filter((n): n is string => typeof n === "string"),
				);
				for (const stmt of statement.body) {
					this.validateStatement(stmt, version);
				}
				this.popDeclScope();

				this.symbolTable.exitScope();
				this.blockDepth--;
				break;

			case "WhileStatement":
				if ("condition" in statement) {
					this.validateExpression(statement.condition, version);
					// Same rule and template as the if-condition check: TV's
					// CE10101 with blockName "while", anchored at the CONDITION
					// expression (probed `while close` / `while n`). see INV041
					const whileCondType = this.inferExpressionType(statement.condition, version);
					if (whileCondType !== "unknown" && !TypeChecker.isBoolType(whileCondType)) {
						this.addError(
							statement.condition.line || statement.line,
							statement.condition.column || statement.column,
							10,
							'The condition of the "while" statement must evaluate to a "bool" value.',
							DiagnosticSeverity.Error,
						);
					}
				}
				this.symbolTable.enterScope();
				this.blockDepth++;
				this.pushDeclScope();
				for (const stmt of statement.body) {
					this.validateStatement(stmt, version);
				}
				this.popDeclScope();
				this.symbolTable.exitScope();
				this.blockDepth--;
				break;

			case "ReturnStatement":
				this.validateExpression(statement.value, version);
				break;

			case "AssignmentStatement": {
				// `matrix = 0.0` - a type-keyword/namespace name used as a user
				// variable parses as AssignmentStatement (the declaration path
				// rejects keyword names), so the name would otherwise keep
				// resolving to the line-0 builtin and later reads would trip
				// the CE10272 type-as-value check. TV accepts these names as
				// variables (INV031) - register a user symbol. see INV048
				if (
					statement.operator === "=" &&
					statement.target.type === "Identifier"
				) {
					const targetName = (statement.target as Identifier).name;
					const existing = this.symbolTable.lookup(targetName);
					if (existing && existing.line === 0) {
						// Same na-initializer guard as collectDeclarations: a
						// bare-na RHS gives the variable NO type. see INV032
						const initType = this.inferExpressionType(
							statement.value,
							version,
						);
						this.symbolTable.define({
							name: targetName,
							type: TypeChecker.isNaType(initType) ? "unknown" : initType,
							line: statement.line,
							column: statement.column,
							used: true, // parity: builtin-seeded names never warn unused
							kind: "variable",
							declaredWith: null,
						});
					}
				}
				// The target is a write position, not a value use - route an
				// Identifier target straight to validateIdentifier (same shape
				// as member objects). see INV048
				if (statement.target.type === "Identifier") {
					this.validateIdentifier(statement.target);
				} else {
					this.validateExpression(statement.target, version);
				}
				this.validateExpression(statement.value, version);

				// Pine has no array literals: a `[...]` tuple expression is
				// only valid in return positions (UDF tails, request.security
				// args). Assigning one to a single name is TV's CE10156
				// 'Syntax error at input "["' at the bracket (probed for both
				// `=` and `:=` - see INV046).
				if (version === "6" && statement.value.type === "ArrayExpression") {
					const arr = statement.value as ArrayExpression;
					this.addError(
						arr.startLine ?? arr.line,
						arr.startColumn ?? arr.column,
						1,
						'Syntax error at input "["',
						DiagnosticSeverity.Error,
					);
				}

				// Reassigning a void-returning call: TV names the target's type
				// ('Cannot assign a value of the "void" type ...'). We infer void
				// as "unknown", so the strict-assign check below skips it; handle
				// void explicitly. Only when the target's type is known (else we
				// cannot name it). see INV055
				if (
					version === "6" &&
					statement.operator === ":=" &&
					statement.target.type === "Identifier" &&
					statement.value.type === "CallExpression" &&
					this.isVoidCall(statement.value as CallExpression, version)
				) {
					const targetType = this.inferExpressionType(
						statement.target,
						version,
					);
					if (targetType !== "unknown") {
						this.addError(
							statement.line,
							statement.column,
							1,
							`Cannot assign a value of the "void" type to the "${(statement.target as Identifier).name}" variable. The variable is declared with the "${TypeChecker.baseTypeName(targetType as string)}" type.`,
							DiagnosticSeverity.Error,
						);
					}
				}

				// Check type compatibility (isAssignable handles all coercion rules)
				const targetType = this.inferExpressionType(statement.target, version);
				const valueType = this.inferExpressionType(statement.value, version);
				if (targetType !== "unknown" && valueType !== "unknown") {
					const targetBase = TypeChecker.baseTypeName(targetType as string);
					if (
						version === "6" &&
						statement.operator === ":=" &&
						statement.target.type === "Identifier" &&
						TypeChecker.strictAssignApplies(valueType, targetBase)
					) {
						// TV's CE10173 on reassignment: same strict base-type rule
						// as declarations (int->float widening, na to any base but
						// bool, qualifiers free), rendered with UNQUALIFIED type
						// names - probed `x = 1` / `x := 2.5` and `b := na`. see INV032
						if (!TypeChecker.strictAssignOk(valueType, targetBase)) {
							const valueBase = TypeChecker.isNaType(valueType)
								? "na"
								: TypeChecker.baseTypeName(valueType as string);
							this.addError(
								statement.line,
								statement.column,
								1,
								`Cannot assign a value of the "${valueBase}" type to the "${(statement.target as Identifier).name}" variable. The variable is declared with the "${targetBase}" type.`,
								DiagnosticSeverity.Error,
							);
						}
					} else if (!TypeChecker.isAssignable(valueType, targetType)) {
						this.addError(
							statement.line,
							statement.column,
							1, // length of operator
							`Cannot assign ${TypeChecker.displayType(valueType)} to ${TypeChecker.displayType(targetType)}`,
							DiagnosticSeverity.Error,
						);
					}
				}
				break;
			}

			case "MethodDeclaration": {
				// Handle method declarations like function declarations
				// First, infer the method return type from the body
				let returnType: PineType = "unknown";

				if (statement.returnType) {
					returnType = mapToPineType(statement.returnType.name);
				} else {
					returnType = this.inferFunctionReturnType(
						statement.body,
						version,
						statement.params,
					);
				}

				// see INV010 - same tuple-return capture as FunctionDeclaration.
				const tupleTypes = this.inferUdfTupleReturnTypes(
					statement.body,
					version,
					statement.params,
				);
				if (tupleTypes)
					this.recordUdfTupleReturn(statement.name, tupleTypes);

				// Register the method in the symbol table. Use kind:"method"
				// rather than "function" so it lives in the method namespace
				// and does not clobber a same-named variable. Bare-identifier
				// lookups (e.g. `n - 1` where `n` is an `int` variable AND a
				// method exists) resolve to the variable; call-site lookups
				// fall back to the method namespace. see INV006.
				this.declaredFunctionNames.add(statement.name); // see INV036
				this.symbolTable.define({
					name: statement.name,
					type: returnType,
					line: statement.line,
					column: statement.column,
					used: false,
					kind: "method",
					declaredWith: null,
				});

				this.symbolTable.enterScope();
				this.blockDepth++;

				this.checkParamTypeAnnotations(statement.params, version);
				this.checkExportedParamsTypified(
					statement.isExport,
					statement.params,
					version,
				);

				// Add method parameters to scope with proper type
				for (const param of statement.params) {
					let paramType: PineType = "unknown";
					if (param.typeAnnotation) {
						paramType = mapToPineType(param.typeAnnotation.name);
					}
					this.symbolTable.define({
						name: param.name,
						type: paramType,
						line: statement.line,
						column: statement.column,
						used: false,
						kind: "variable",
						declaredWith: null,
					});
				}

				// Collect and validate method body. Params count as declared
				// by the method scope. see INV035
				for (const stmt of statement.body) {
					this.collectDeclarations(stmt, version);
				}
				this.pushDeclScope(statement.params.map((p) => p.name));
				for (const stmt of statement.body) {
					this.validateStatement(stmt, version);
				}
				this.popDeclScope();

				this.symbolTable.exitScope();
				this.blockDepth--;
				break;
			}

			case "ImportStatement": {
				// Register the import alias as a namespace symbol. validate()
				// runs a SINGLE top-level pass through validateStatement -
				// collectDeclarations only runs inside block bodies - so
				// registering here is what makes `exiu.Operator.crossover`
				// resolve. (Plain `alias.fn(...)` calls never noticed the
				// missing symbol because call validation routes namespaced
				// callees elsewhere; non-call member access reaches
				// validateIdentifier and errored.) see plan/31 re-measure.
				if (statement.alias) {
					this.symbolTable.define({
						name: statement.alias,
						type: "unknown", // Library type
						line: statement.line,
						column: statement.column,
						used: false,
						kind: "variable", // Treat as namespace
						declaredWith: null,
					});
				}
				break;
			}

			case "SequenceStatement": {
				// Validate each statement in the sequence
				for (const stmt of statement.statements) {
					this.validateStatement(stmt, version);
				}
				break;
			}

			case "EnumDeclaration":
			case "TypeDeclaration": {
				// Register enum/type as a symbol so it can be used as a namespace
				this.declaredTypeNames.add(statement.name); // see INV033
				if (statement.type === "EnumDeclaration") {
					this.declaredEnumNames.add(statement.name); // see INV048
				}
				const symbol: SymbolInfo = {
					name: statement.name,
					type: "unknown", // User-defined type
					line: statement.line,
					column: statement.column,
					used: false,
					kind: "variable", // Treat as namespace for member access
					declaredWith: null,
				};
				this.symbolTable.define(symbol);
				break;
			}
		}
	}

	private validateExpression(expr: Expression, version: string = "6"): void {
		switch (expr.type) {
			case "Identifier":
				this.validateIdentifier(expr);
				this.checkNonValueReference(expr, version);
				break;

			case "CallExpression":
				this.validateCallExpression(expr, version);
				break;

			case "MemberExpression": {
				// The object is a namespace/receiver position, not a value use -
				// route an Identifier object straight to validateIdentifier so
				// checkNonValueReference doesn't fire on `chart.bg_color`,
				// `ta.sma`, etc. see INV048
				const memberObj = expr.object;
				if (memberObj.type === "Identifier") {
					this.validateIdentifier(memberObj);
				} else {
					this.validateExpression(memberObj, version);
				}
				// A built-in TYPE reached as a namespace member (`chart.point`)
				// used in value position is TV's CE10272 - probed 2026-06-07,
				// `x = chart.point` errors at the member span. see INV048
				if (
					version === "6" &&
					memberObj.type === "Identifier" &&
					expr.property?.type === "Identifier"
				) {
					const fullName = `${memberObj.name}.${expr.property.name}`;
					if (TYPE_NAMES.has(fullName)) {
						this.addError(
							expr.line || 0,
							expr.column || 0,
							fullName.length,
							`Undeclared identifier "${fullName}"`,
							DiagnosticSeverity.Error,
						);
					}
				}
				break;
			}

			case "BinaryExpression":
				this.validateExpression(expr.left, version);
				this.validateExpression(expr.right, version);
				this.validateBinaryExpression(expr, version);
				break;

			case "UnaryExpression":
				this.validateExpression(expr.argument, version);
				this.validateUnaryExpression(expr, version);
				break;

			case "TernaryExpression":
				this.validateExpression(expr.condition, version);
				this.validateExpression(expr.consequent, version);
				this.validateExpression(expr.alternate, version);
				this.validateTernaryExpression(expr, version);
				break;

			case "ArrayExpression":
				for (const el of expr.elements) {
					this.validateExpression(el, version);
				}
				break;

			case "IndexExpression":
				this.validateExpression(expr.object, version);
				this.validateExpression(expr.index, version);
				break;

			case "SwitchExpression": {
				// Validate all cases in the switch expression
				const switchExpr = expr as SwitchExpression;
				if (switchExpr.discriminant) {
					this.validateExpression(switchExpr.discriminant, version);
				}
				for (const switchCase of switchExpr.cases) {
					if (switchCase.condition) {
						this.validateExpression(switchCase.condition, version);
					}
					// `result` is contained in the last statement, so walk
					// `statements` INSTEAD of `result` when present (see
					// SwitchCase). Each arm body is its own local scope.
					if (switchCase.statements) {
						this.symbolTable.enterScope();
						this.blockDepth++;
						this.pushDeclScope();
						for (const stmt of switchCase.statements) {
							this.collectDeclarations(stmt, version);
						}
						for (const stmt of switchCase.statements) {
							this.validateStatement(stmt, version);
						}
						this.popDeclScope();
						this.blockDepth--;
						this.symbolTable.exitScope();
					} else {
						this.validateExpression(switchCase.result, version);
					}
				}
				break;
			}

			case "IfExpression": {
				// An if/else in expression position - branches are statement
				// blocks, each its own local scope (mirrors SwitchExpression
				// arm handling above). see INV031
				const ifExpr = expr as IfExpression;
				this.validateExpression(ifExpr.condition, version);
				for (const branch of [ifExpr.consequent, ifExpr.alternate]) {
					if (!branch) continue;
					this.symbolTable.enterScope();
					this.blockDepth++;
					this.pushDeclScope();
					for (const stmt of branch) {
						this.collectDeclarations(stmt, version);
					}
					for (const stmt of branch) {
						this.validateStatement(stmt, version);
					}
					this.popDeclScope();
					this.blockDepth--;
					this.symbolTable.exitScope();
				}
				break;
			}
		}
	}

	private validateIdentifier(identifier: Identifier): void {
		const symbol = this.symbolTable.lookup(identifier.name);

		if (!symbol) {
			// Check if it's a namespace member access
			if (identifier.name.includes(".")) {
				return;
			}

			const similar = this.symbolTable.findSimilarSymbols(identifier.name, 2);
			let message = `Undefined variable '${identifier.name}'`;
			if (similar.length > 0) {
				message += `. Did you mean '${similar[0]}'?`;
			}
			this.addError(
				identifier.line,
				identifier.column,
				identifier.name.length,
				message,
				DiagnosticSeverity.Error,
			);
			return;
		}

		// Mark as used
		this.symbolTable.markUsed(identifier.name);

		// Built-in symbols are seeded at line 0; a reference resolving to
		// one is a use "as a built-in" for the CE10190 check (a user
		// declaration shadowing it resolves to the user symbol instead,
		// so post-shadow references don't count). see INV023 / TODO #40.
		if (symbol.line === 0 && getBuiltinVarInfo(identifier.name)) {
			this.usedBuiltins.add(identifier.name);
		}
	}

	// TV's CE10272 / CE10074: a name that only exists as a built-in TYPE or
	// NAMESPACE referenced bare in value position is an undeclared identifier
	// (`x = line`, `x = ta`, `x = int`, `x = strategy`, `x = series` - all
	// probed CE10272 2026-06-07), and a bare user ENUM name is CE10074
	// ("Cannot use ... as a value", zero-width anchor) while a bare user
	// TYPE (UDT) name is accepted (probed clean). Only the bare-Identifier
	// dispatch in validateExpression routes here - member objects and
	// callees don't, so `ta.sma(...)` / `chart.bg_color` stay silent.
	// see INV048
	private checkNonValueReference(identifier: Identifier, version: string): void {
		if (version !== "6") return;
		const name = identifier.name;
		const symbol = this.symbolTable.lookup(name);
		// Unresolved names already got "Undefined variable" in
		// validateIdentifier; don't stack a second error.
		if (!symbol) return;
		if (symbol.line !== 0) {
			// User-declared symbol (or UDT/enum/import alias).
			if (this.declaredEnumNames.has(name)) {
				this.addError(
					identifier.line,
					identifier.column,
					0,
					`Cannot use the "${name}" as a value. Use one of the enum's fields instead.`,
					DiagnosticSeverity.Error,
				);
			}
			return;
		}
		// A name that is ALSO a bare built-in variable is a real value -
		// `dayofweek` is both a series int variable and the constants
		// namespace (dayofweek.monday). The only such collision in v6.
		if (getBuiltinVarInfo(name)) return;
		if (
			TYPE_KEYWORDS.has(name) ||
			TYPE_NAMES.has(name) ||
			KNOWN_NAMESPACES.includes(name)
		) {
			this.addError(
				identifier.line,
				identifier.column,
				name.length,
				`Undeclared identifier "${name}"`,
				DiagnosticSeverity.Error,
			);
		}
	}

	private validateBinaryExpression(
		expr: BinaryExpression,
		version: string = "6",
	): void {
		const leftType = this.inferExpressionType(expr.left, version);
		const rightType = this.inferExpressionType(expr.right, version);

		// Check for direct na comparison (x == na or x != na)
		if (expr.operator === "==" || expr.operator === "!=") {
			const isLeftNaIdentifier =
				expr.left.type === "Identifier" && expr.left.name === "na";
			const isRightNaIdentifier =
				expr.right.type === "Identifier" && expr.right.name === "na";

			if (isLeftNaIdentifier || isRightNaIdentifier) {
				this.addError(
					expr.line,
					expr.column,
					2,
					`Cannot compare a value to 'na' directly. Use the 'na()' function instead.`,
					DiagnosticSeverity.Error,
				);
				return; // Don't report additional type errors for this
			}
		}

		// Logical operators require bool operands.
		// Note: TypeChecker.areTypesCompatible (types.ts) also checks this, but we check here
		// first to provide better error messages that identify which operand is wrong.
		// The areTypesCompatible check below serves as a fallback for edge cases.
		// Errors anchor at the offending OPERAND, one error per bad operand -
		// TV's convention (`true and "hello"` errors at the string's column;
		// `if ph or pl` with two float operands gets two errors). Matching the
		// anchors keeps the position-keyed TV diff clean. see INV028
		if (expr.operator === "and" || expr.operator === "or") {
			let reported = false;
			if (leftType !== "unknown" && !TypeChecker.isBoolType(leftType)) {
				this.addError(
					expr.left.line || expr.line,
					expr.left.column || expr.column,
					1,
					`Operator '${expr.operator}' requires bool operands, but left operand is ${TypeChecker.displayType(leftType)}`,
					DiagnosticSeverity.Error,
				);
				reported = true;
			}
			if (rightType !== "unknown" && !TypeChecker.isBoolType(rightType)) {
				this.addError(
					expr.right.line || expr.line,
					expr.right.column || expr.column,
					1,
					`Operator '${expr.operator}' requires bool operands, but right operand is ${TypeChecker.displayType(rightType)}`,
					DiagnosticSeverity.Error,
				);
				reported = true;
			}
			if (reported) {
				return; // Don't double-report via the compatibility fallback
			}
		}

		if (!TypeChecker.areTypesCompatible(leftType, rightType, expr.operator)) {
			// Anchor at the operand that breaks the operator's operand class
			// when that is decidable (arithmetic/comparison want numeric
			// operands - `2 * color.blue` errors at the color, `color.red >
			// color.blue` at both); fall back to the whole expression for
			// mutual incompatibilities. see INV028
			const ARITH_OR_COMPARE = ["-", "*", "/", "%", "<", ">", "<=", ">="];
			const offenders: Expression[] = [];
			if (ARITH_OR_COMPARE.includes(expr.operator)) {
				if (!TypeChecker.isNumericType(leftType)) offenders.push(expr.left);
				if (!TypeChecker.isNumericType(rightType)) offenders.push(expr.right);
			}
			if (offenders.length > 0) {
				for (const operand of offenders) {
					this.addError(
						operand.line || expr.line,
						operand.column || expr.column,
						1,
						`Type mismatch: cannot apply '${expr.operator}' to ${TypeChecker.displayType(leftType)} and ${TypeChecker.displayType(rightType)}`,
						DiagnosticSeverity.Error,
					);
				}
			} else {
				this.addError(
					expr.line,
					expr.column,
					1,
					`Type mismatch: cannot apply '${expr.operator}' to ${leftType} and ${rightType}`,
					DiagnosticSeverity.Error,
				);
			}
		}
	}

	private validateUnaryExpression(
		expr: UnaryExpression,
		version: string = "6",
	): void {
		if (expr.operator === "not") {
			const argType = this.inferExpressionType(expr.argument, version);
			if (!TypeChecker.isBoolType(argType) && argType !== "unknown") {
				this.addError(
					expr.line,
					expr.column,
					3, // length of "not"
					`Type mismatch: 'not' operator requires bool, got ${TypeChecker.displayType(argType)}`,
					DiagnosticSeverity.Error,
				);
			}
		}
	}

	private validateTernaryExpression(
		expr: TernaryExpression,
		version: string = "6",
	): void {
		const condType = this.inferExpressionType(expr.condition, version);
		if (!TypeChecker.isBoolType(condType) && condType !== "unknown") {
			this.addError(
				expr.condition.line || expr.line,
				expr.condition.column || expr.column,
				1,
				`Ternary condition must be bool, got ${TypeChecker.displayType(condType)}`,
				DiagnosticSeverity.Error,
			);
		}

		// Check that both branches have compatible types - stricter than
		// isAssignable. pine-lint --tv accepts cross-type mixes here
		// (color|string, color|int, even simple<string>|series<float>) but
		// those are nonsense values that can't be assigned to a typed
		// variable. We flag anyway. see INV001.
		const conseqType = this.inferExpressionType(expr.consequent, version);
		const altType = this.inferExpressionType(expr.alternate, version);

		if (
			conseqType === "unknown" ||
			altType === "unknown" ||
			conseqType === "na" ||
			altType === "na"
		) {
			return;
		}

		if (!this.areTernaryBranchTypesCompatible(conseqType, altType)) {
			this.addError(
				expr.line,
				expr.column,
				1,
				`Ternary branches must have compatible types. Got '${TypeChecker.displayType(conseqType)}' and '${TypeChecker.displayType(altType)}'`,
				DiagnosticSeverity.Error,
			);
		}
	}

	// Strict ternary branch compatibility: branches must share a type
	// category (numeric/bool/string/color), modulo series/simple stripping.
	// see INV001.
	private areTernaryBranchTypesCompatible(
		type1: PineType,
		type2: PineType,
	): boolean {
		if (type1 === type2) return true;

		const base1 = this.getBaseType(type1);
		const base2 = this.getBaseType(type2);
		if (base1 === base2) return true;

		if (TypeChecker.isNumericType(type1) && TypeChecker.isNumericType(type2)) {
			return true;
		}
		if (TypeChecker.isBoolType(type1) && TypeChecker.isBoolType(type2)) {
			return true;
		}
		if (TypeChecker.isStringType(type1) && TypeChecker.isStringType(type2)) {
			return true;
		}
		if (TypeChecker.isColorType(type1) && TypeChecker.isColorType(type2)) {
			return true;
		}
		if (TypeChecker.isDisplayFlag(type1) && TypeChecker.isDisplayFlag(type2)) {
			return true;
		}

		return false;
	}

	private getBaseType(type: PineType): string {
		const match = (type as string).match(/^(?:series|simple|input|const)<(.+)>$/);
		return match ? match[1] : (type as string);
	}

	// A collection type used as a type template argument of another
	// collection (`array.new<array<float>>`, `map.new<string,
	// array<float>>`) is TV's CE10025 - probed; TV emits the message
	// TWICE, at the call and at the enclosing statement start (the
	// declaration case adds the second). see INV038
	private static readonly NESTED_COLLECTION_MESSAGE =
		"Cannot use a collection in a type template of another collection. Create a user-defined type with that collection as a field and use it instead.";

	private hasCollectionTemplateArg(call: CallExpression): boolean {
		return (call.typeArguments ?? []).some((t) =>
			/^(array|matrix|map)\s*</.test(t.trim()),
		);
	}

	private validateCallExpression(
		call: CallExpression,
		version: string = "6",
	): void {
		if (version === "6" && this.hasCollectionTemplateArg(call)) {
			this.addError(
				call.line,
				call.column,
				(call.endColumn ?? call.column + 1) - call.column,
				UnifiedPineValidator.NESTED_COLLECTION_MESSAGE,
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

		// NOTE: Complex callee expressions (e.g., chained calls like `foo().bar()`,
		// indexed access like `arr[0]()`) are not validated. This is acceptable
		// because Pine Script rarely uses such patterns, and the type inference
		// for these cases would require significant additional complexity.
		if (!functionName) return;

		// Get function signature
		const signature = this.functionSignatures.get(functionName);

		// Check for top-level only functions in local scope
		if (isTopLevelOnly(functionName) && this.blockDepth > 0) {
			this.addError(
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
			const argType = this.inferExpressionType(firstArg.value, version);
			if (argType.startsWith("map<")) {
				const repr =
					firstArg.value.type === "Identifier"
						? (firstArg.value as Identifier).name
						: firstArg.value.type === "Literal"
							? String((firstArg.value as Literal).raw ?? "")
							: "";
				this.errors.push({
					line: firstArg.value.line,
					column: firstArg.value.column,
					length: 0,
					message:
						'Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.',
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
				!this.declaredFunctionNames.has(functionName)
			) {
				this.addError(
					call.line,
					call.column,
					functionName.length,
					`Could not find function or function reference '${functionName}'`,
					DiagnosticSeverity.Error,
				);
			} else if (
				version === "6" &&
				call.callee.type === "MemberExpression" &&
				call.callee.object.type === "Identifier"
			) {
				// `ns.member(...)` where `ns` is a built-in namespace and
				// `member` is unknown there - same CE10271 (probed `ta.bogus`,
				// `math.notreal`; see INV053). Bounded to the data-backed
				// subset of #41: only built-in namespaces (we have the full
				// member catalog), and only when `ns` is NOT user-shadowed (an
				// `import ... as ns` alias / user var has a non-builtin symbol,
				// line !== 0 - its members we cannot resolve). A member that
				// IS a known builtin (function via the signature lookup above,
				// or a const/variable in NAMESPACE_PROPERTIES) is left alone:
				// calling a built-in variable like `ta.tr(...)` is TV-silent,
				// and calling a const like `color.red(...)` IS a TV error but
				// the const-vs-variable split is murky, so we conservatively
				// skip all known members - we never want a false positive on a
				// real member.
				const nsName = call.callee.object.name;
				const objSym = this.symbolTable.lookup(nsName);
				const userShadowed = !!objSym && objSym.line !== 0;
				if (
					!userShadowed &&
					!this.importedNamespaces.has(nsName) &&
					KNOWN_NAMESPACES.includes(nsName) &&
					!(functionName in NAMESPACE_PROPERTIES) &&
					!GENERIC_FUNCTION_BASES.has(functionName)
				) {
					this.addError(
						call.line,
						call.column,
						functionName.length,
						`Could not find function or function reference '${functionName}'`,
						DiagnosticSeverity.Error,
					);
				}
			}
			return;
		}

		// Validate arguments
		this.validateFunctionArguments(call, functionName, signature, version);

		// Validate argument expressions
		for (const arg of call.arguments) {
			this.validateExpression(arg.value, version);
		}
	}

	// A call to a builtin whose resolved return is exactly `void`. Used by
	// the two void-assignment checks (declaration -> CE10098, reassignment ->
	// type mismatch); we infer void calls as "unknown" elsewhere, so these
	// must detect void directly. see INV055
	private isVoidCall(call: CallExpression, version: string): boolean {
		const fnName = memberChainName(call.callee);
		if (!fnName) return false;
		const argTypes = call.arguments.map((a) =>
			this.inferExpressionType(a.value, version),
		);
		return resolveCallReturnRaw(fnName, argTypes) === "void";
	}

	private validateFunctionArguments(
		call: CallExpression,
		functionName: string,
		signature: FunctionSignature,
		version: string = "6",
	): void {
		const args = call.arguments;

		// Build map of provided arguments
		const providedArgs = new Map<
			string,
			{ arg: CallArgument; type: PineType }
		>();
		const positionalArgs: { arg: CallArgument; type: PineType }[] = [];

		for (const arg of args) {
			const argType = this.inferExpressionType(arg.value, version);
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

		if (!isVariadic && positionalArgs.length > totalCount) {
			this.addError(
				call.line,
				call.column,
				functionName.length,
				`Too many arguments for '${functionName}'. Expected ${totalCount}, got ${positionalArgs.length}`,
				DiagnosticSeverity.Error,
			);
		}

		// For variadic functions, require at least minimum number of arguments
		if (isVariadic) {
			const minArgs = getMinArgsForVariadic(functionName);
			if (positionalArgs.length < minArgs) {
				this.addError(
					call.line,
					call.column,
					functionName.length,
					`'${functionName}' requires at least ${minArgs} argument${minArgs > 1 ? "s" : ""}, got ${positionalArgs.length}`,
					DiagnosticSeverity.Error,
				);
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

		// Validate each parameter
		for (let i = 0; i < signature.parameters.length; i++) {
			const param = signature.parameters[i];

			// Check named argument
			const namedArg = providedArgs.get(param.name);
			if (namedArg) {
				// Validate type (named args are unambiguous, so we can check them).
				// Union/polymorphic params map to "unknown" and fall through here.
				if (checkArgTypes && param.type && param.type !== "unknown") {
					if (!TypeChecker.isAssignable(namedArg.type, param.type)) {
						this.addError(
							call.line,
							call.column,
							param.name.length,
							`Type mismatch for parameter '${param.name}': expected ${param.type}, got ${namedArg.type}`,
							DiagnosticSeverity.Error,
						);
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
				if (checkArgTypes && param.type && param.type !== "unknown") {
					if (!TypeChecker.isAssignable(posArg.type, param.type)) {
						this.addError(
							call.line,
							call.column,
							functionName.length,
							`Type mismatch for argument ${i + 1}: expected ${param.type}, got ${posArg.type}`,
							DiagnosticSeverity.Error,
						);
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
				this.addError(
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
				this.addError(
					call.line,
					call.column,
					functionName.length,
					`No value assigned to the "${name}" parameter in ${functionName}()`,
					DiagnosticSeverity.Error,
				);
			}
		}

		// Check for invalid named parameters
		for (const [name] of providedArgs.entries()) {
			if (!signature.parameters.some((p) => p.name === name)) {
				const validNames = signature.parameters.map((p) => p.name).join(", ");
				this.addError(
					call.line,
					call.column,
					name.length,
					`Invalid parameter '${name}'. Valid parameters: ${validNames}`,
					DiagnosticSeverity.Error,
				);
			}
		}

		// Special case validations
		this.validateSpecialCases(call, functionName, args);

		// CE10123: const-required params receiving a non-const argument. see INV014
		this.checkConstArgs(call, functionName, signature, version);

		// Base-type check for union-typed params the main loop skips. see INV016
		this.checkUnionArgs(call, functionName, version);
	}

	// Whether an expression's inferred type is trustworthy enough to flag an
	// arg-type mismatch on. Literals and operator expressions have solid type
	// rules; built-in vars/constants/calls carry types straight from pine-data.
	// User identifiers and user-defined-function calls are excluded - our
	// inference for those is the known-shaky path (UDF returns, etc.), and a
	// wrong base there would surface as a false positive. see INV016.
	private isReliablyTyped(expr: Expression): boolean {
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
				return name !== "" && this.functionSignatures.has(name);
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
	private checkUnionArgs(
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
			let where: string;
			if (arg.name) {
				sawNamed = true;
				members = namedParamUnionMembers(functionName, arg.name);
				where = `parameter '${arg.name}'`;
			} else {
				positionalNum++;
				// A positional arg after a named one is malformed ordering (TV's
				// own error); positional->param indices are unreliable, so don't
				// emit a misleading type mismatch on top. see INV016
				if (sawNamed || functionHasOverloads) continue;
				members = positionalParamUnionMembers(functionName, positionalNum - 1);
				where = `argument ${positionalNum}`;
			}
			if (!members) continue;
			// Only trust the arg's type when it comes from a reliable source.
			// Broad union-checking otherwise amplifies every type-inference gap
			// (UDF returns, user vars) into a false positive on valid code - e.g.
			// `color.from_gradient(Vol, ...)` where `Vol = someUdf()` is a float we
			// mis-infer as bool. Mirrors describeNonConstArg's conservatism. INV016
			if (!this.isReliablyTyped(arg.value)) continue;
			const argType = this.inferExpressionType(arg.value, version);
			const argBase = this.getBaseType(argType);
			if (!SCALARS.has(argBase)) continue; // unknown/na/non-scalar -> skip
			const numeric = argBase === "int" || argBase === "float";
			const ok =
				members.includes(argBase) ||
				(numeric && (members.includes("int") || members.includes("float")));
			if (!ok) {
				this.addError(
					arg.value.line,
					arg.value.column,
					0,
					`Type mismatch for ${where}: expected ${members.join("/")}, got ${argType}`,
					DiagnosticSeverity.Error,
				);
			}
		}
	}

	// CE10123: a parameter that requires a compile-time constant received a
	// provably non-const argument. Our internal types drop the const/simple/input
	// qualifier (mapToPineType collapses them), so this reads the raw qualifier
	// from pine-data directly. Both the const-required set and the per-overload
	// return qualifiers are data-driven (see builtins.ts) and were verified
	// exhaustively against `pine-lint --tv`. see INV014.
	private checkConstArgs(
		call: CallExpression,
		functionName: string,
		signature: FunctionSignature,
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
			const desc = this.describeNonConstArg(arg.value, version);
			if (!desc) continue;
			this.errors.push({
				line: arg.value.line,
				column: arg.value.column,
				length: 0,
				message:
					'Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.',
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

	// Decide whether an argument expression is PROVABLY non-const, and if so
	// describe it (argumentType + user-friendly repr) for the CE10123 message.
	// Deliberately conservative: returns null whenever we can't be certain
	// (user variables, composite expressions, user-defined functions), so we
	// never flag something TV would accept. Catches the common cases: built-in
	// calls whose resolved overload returns simple/series/input (e.g.
	// timestamp("UTC", y, m, d, ...)) and non-const built-in variables. see INV014
	private describeNonConstArg(
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
					this.inferExpressionType(a.value, version),
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
					const sym = this.symbolTable.lookup(idName);
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
			default:
				return null;
		}
	}

	/**
	 * Special-case semantic validations that check parameter relationships.
	 * These are intentionally hardcoded here (not in pine-data) because they're
	 * behavioral checks rather than type/signature data.
	 */
	private validateSpecialCases(
		call: CallExpression,
		functionName: string,
		args: CallArgument[],
	): void {
		// plotshape: common mistake - using "shape" instead of "style"
		if (functionName === "plotshape" || functionName.endsWith(".plotshape")) {
			for (const arg of args) {
				if (arg.name === "shape") {
					this.addError(
						call.line,
						call.column,
						5,
						'Invalid parameter "shape". Did you mean "style"?',
						DiagnosticSeverity.Error,
					);
				}
			}
		}

		// indicator/strategy: timeframe_gaps requires timeframe
		if (functionName === "indicator" || functionName === "strategy") {
			const hasTimeframeGaps = args.some((a) => a.name === "timeframe_gaps");
			const hasTimeframe = args.some((a) => a.name === "timeframe");

			if (hasTimeframeGaps && !hasTimeframe) {
				this.addError(
					call.line,
					call.column,
					functionName.length,
					'"timeframe_gaps" has no effect without a "timeframe" argument',
					DiagnosticSeverity.Warning,
				);
			}
		}
	}

	/**
	 * Infer the return type of a user-defined function from its body.
	 */
	private inferFunctionReturnType(
		body: Statement[],
		version: string,
		params?: FunctionParam[],
	): PineType {
		// Enter a temporary scope for type inference
		this.symbolTable.enterScope();

		// Isolate the expression-type cache for the duration of this pass.
		// This pass guesses `series<float>` for untyped params (below), and
		// caching body-expression types under that guess poisons the later
		// validation pass, which registers untyped params as `unknown`: e.g.
		// `cond ? "1440" : tf` was cached as string|series<float> here and
		// then flagged as an incompatible ternary, where an uncached lookup
		// would have skipped the check. see INV005 / #18.
		const savedExpressionTypes = this.expressionTypes;
		this.expressionTypes = new Map();

		// Add function parameters to temporary scope. Honour the declared
		// type when present - without this, a `bool a` parameter would be
		// registered as `series<float>` here, the body's `a and b`
		// expression would be cached with `a: series<float>`, and the
		// subsequent full validation pass would read the wrong type from
		// cache and report "Operator 'and' requires bool operands, but
		// left operand is series<float>". For untyped UDF params, fall
		// back to `series<float>` as before. see INV005.
		if (params) {
			for (const param of params) {
				const paramType: PineType = param.typeAnnotation
					? mapToPineType(param.typeAnnotation.name)
					: "series<float>";
				this.symbolTable.define({
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

		// Temporarily collect declarations from function body
		for (const stmt of body) {
			this.collectDeclarations(stmt, version);
		}

		let returnType: PineType = "unknown";

		// Look for return statements in the function body
		for (const stmt of body) {
			if (stmt.type === "ReturnStatement") {
				const returnStmt = stmt as ReturnStatement;
				returnType = this.inferExpressionType(returnStmt.value, version);
				break;
			}
		}

		// If no explicit return, check if the last statement is an expression
		if (returnType === "unknown" && body.length > 0) {
			const lastStmt = body[body.length - 1];
			if (lastStmt.type === "ExpressionStatement") {
				const exprStmt = lastStmt as ExpressionStatement;
				returnType = this.inferExpressionType(exprStmt.expression, version);
			}
		}

		// Exit the temporary scope and drop this pass's cache entries
		this.symbolTable.exitScope();
		this.expressionTypes = savedExpressionTypes;

		return returnType;
	}

	/**
	 * Infer types for tuple elements from the init expression.
	 * For request.security with array argument, extracts element types.
	 */
	private inferTupleElementTypes(
		tupleDecl: TupleDeclaration,
		version: string = "6",
	): PineType[] {
		return this.tupleInitElementTypes(
			tupleDecl.init,
			version,
			tupleDecl.names.length,
		);
	}

	// Per-element types for a tuple-producing init expression. Beyond the
	// CallExpression shapes (request.security's tuple expression arg, UDF
	// tuple returns - see INV010), the init can be an if/switch EXPRESSION
	// whose branch tails are themselves tuple-producing; without descending
	// into them every element defaulted to series<float> and a destructured
	// bool drew "condition must be bool" FPs downstream. see INV049.
	// (A BARE tuple literal init is itself invalid Pine - the parser emits
	// TV's `Syntax error at input "["` - but we still type its elements
	// for recovery.)
	private tupleInitElementTypes(
		expr: Expression,
		version: string,
		expectedCount?: number,
	): PineType[] {
		switch (expr.type) {
			case "ArrayExpression": {
				return (expr as ArrayExpression).elements.map((elem) =>
					this.inferExpressionType(elem, version),
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

				// For request.security, look for the expression/array argument
				if (funcName === "request.security" && call.arguments.length >= 3) {
					const exprArg = call.arguments[2].value;
					if (exprArg.type === "ArrayExpression") {
						// Extract types from array elements
						for (const elem of (exprArg as ArrayExpression).elements) {
							elementTypes.push(this.inferExpressionType(elem, version));
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
						this.udfTupleReturnTypes.get(funcName) ??
						this.receiverMethodTupleShapes(call);
					if (shapes) {
						const byArity =
							expectedCount === undefined
								? undefined
								: shapes.find((s) => s.length === expectedCount);
						for (const t of byArity ?? shapes[0]) elementTypes.push(t);
					}
				}
				return elementTypes;
			}

			case "IfExpression": {
				const ifExpr = expr as IfExpression;
				return this.mergeTupleBranchTypes([
					this.branchTailTupleTypes(ifExpr.consequent, version, expectedCount),
					this.branchTailTupleTypes(ifExpr.alternate, version, expectedCount),
				]);
			}

			case "SwitchExpression": {
				const switchExpr = expr as SwitchExpression;
				return this.mergeTupleBranchTypes(
					switchExpr.cases.map((c) =>
						// When `statements` is present, `result` is the last
						// statement's expression - visit statements INSTEAD of
						// result (see SwitchCase in ast.ts / TODO #33).
						c.statements
							? this.branchTailTupleTypes(c.statements, version, expectedCount)
							: this.tupleInitElementTypes(c.result, version, expectedCount),
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
	private receiverMethodTupleShapes(
		call: CallExpression,
	): PineType[][] | undefined {
		if (call.callee.type !== "MemberExpression") return undefined;
		const member = call.callee;
		if (member.object.type !== "Identifier") return undefined;
		if (KNOWN_NAMESPACES.includes(member.object.name)) return undefined;
		return this.udfTupleReturnTypes.get(member.property.name);
	}

	// Tuple element types a statement block evaluates to: the tail
	// statement's value expression, descending nested if tails (the same
	// descent tailTupleExpr does for UDF bodies, but yielding types so
	// branches can merge).
	private branchTailTupleTypes(
		stmts: Statement[] | undefined,
		version: string,
		expectedCount?: number,
	): PineType[] {
		if (!stmts || stmts.length === 0) return [];
		const last = stmts[stmts.length - 1];
		if (last.type === "ExpressionStatement") {
			return this.tupleInitElementTypes(
				(last as ExpressionStatement).expression,
				version,
				expectedCount,
			);
		}
		if (last.type === "ReturnStatement") {
			const value = (last as ReturnStatement).value;
			return value
				? this.tupleInitElementTypes(value, version, expectedCount)
				: [];
		}
		if (last.type === "IfStatement") {
			const ifStmt = last as IfStatement;
			return this.mergeTupleBranchTypes([
				this.branchTailTupleTypes(ifStmt.consequent, version, expectedCount),
				this.branchTailTupleTypes(ifStmt.alternate, version, expectedCount),
			]);
		}
		return [];
	}

	// Merge per-branch tuple element types. For each element prefer the
	// first branch with a real type: a default branch is typically
	// `[na, na, false]`, so an `na` element defers to a sibling branch
	// that knows better (the same reasoning behind tailTupleExpr's
	// consequent preference - see INV030).
	private mergeTupleBranchTypes(branches: PineType[][]): PineType[] {
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
	private recordUdfTupleReturn(name: string, types: PineType[]): void {
		const existing = this.udfTupleReturnTypes.get(name);
		if (!existing) {
			this.udfTupleReturnTypes.set(name, [types]);
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
	private inferUdfTupleReturnTypes(
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
		const savedExpressionTypes = this.expressionTypes;
		this.expressionTypes = new Map();
		this.symbolTable.enterScope();
		if (params) {
			for (const param of params) {
				const paramType: PineType = param.typeAnnotation
					? mapToPineType(param.typeAnnotation.name)
					: "series<float>";
				this.symbolTable.define({
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
			this.collectDeclarations(stmt, version);
		}

		const types = this.branchTailTupleTypes(body, version);
		this.symbolTable.exitScope();
		this.expressionTypes = savedExpressionTypes;
		return types.length > 0 ? types : undefined;
	}

	/**
	 * Define tuple element variables in the symbol table.
	 */
	private defineTupleVariables(
		tupleDecl: TupleDeclaration,
		elementTypes: PineType[],
	): void {
		for (let i = 0; i < tupleDecl.names.length; i++) {
			const name = tupleDecl.names[i];
			// Use inferred type from init expression, or default to series<float>
			const varType = elementTypes[i] || "series<float>";

			this.symbolTable.define({
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

	private inferExpressionType(
		expr: Expression,
		version: string = "6",
	): PineType {
		// Check cache
		if (this.expressionTypes.has(expr)) {
			const cached = this.expressionTypes.get(expr);
			if (cached) return cached;
		}

		let type: PineType = "unknown";

		switch (expr.type) {
			case "Literal":
				type = TypeChecker.inferLiteralType(
					(expr as Literal).value,
					(expr as Literal).raw,
				);
				break;

			case "Identifier": {
				const idName = (expr as Identifier).name;
				// `na` lexes as a keyword, so its symbol-table entry carries no
				// value type ("unknown" - the RESERVED_KEYWORDS registration
				// overwrites the pine-data variable's simple<na>). Its expression
				// type is the na type itself, which the declaration/assignment
				// checks rely on. see INV032
				if (idName === "na") {
					type = "na";
					break;
				}
				const symbol = this.symbolTable.lookup(idName);
				type = symbol ? symbol.type : "unknown";
				break;
			}

			case "CallExpression": {
				const callExpr = expr as CallExpression;
				let funcName = "";
				if (callExpr.callee.type === "Identifier") {
					funcName = callExpr.callee.name;
				} else if (callExpr.callee.type === "MemberExpression") {
					const member = callExpr.callee;
					if (member.object.type === "Identifier") {
						funcName = `${member.object.name}.${member.property.name}`;
					}
				}

				// Handle generic type arguments: array.new<float>() -> array<float>
				if (callExpr.typeArguments && callExpr.typeArguments.length > 0) {
					const typeArg = callExpr.typeArguments[0];
					// array.new<T> returns array<T>, matrix.new<T> returns matrix<T>
					if (funcName === "array.new" || funcName.startsWith("array.new")) {
						type = `array<${typeArg}>` as PineType;
						break;
					}
					if (funcName === "matrix.new" || funcName.startsWith("matrix.new")) {
						type = `matrix<${typeArg}>` as PineType;
						break;
					}
					if (funcName === "map.new") {
						const valueArg = callExpr.typeArguments[1];
						type = (
							valueArg ? `map<${typeArg}, ${valueArg}>` : `map<${typeArg}>`
						) as PineType;
						break;
					}
				}

				// array.from(arg0, ...) - element type is taken from the first argument,
				// matching pine-lint (e.g. array.from(1,2,3) -> array<int>).
				if (funcName === "array.from" && callExpr.arguments.length > 0) {
					const elem = this.inferExpressionType(
						callExpr.arguments[0].value,
						version,
					);
					// baseTypeName strips both qualifier forms - the space form
					// and the bracketed one (input<bool> elements from input.*
					// calls would otherwise produce array<input<bool>>). see INV040
					const bare = TypeChecker.baseTypeName(elem);
					type = `array<${bare}>` as PineType;
					break;
				}

				// Special handling for request.security with non-tuple returns
				if (funcName === "request.security" && callExpr.arguments.length >= 3) {
					const exprArg = callExpr.arguments[2].value;
					if (exprArg.type !== "ArrayExpression") {
						type = this.inferExpressionType(exprArg, version);
						break;
					}
				}

				// request.security_lower_tf returns one array element per intrabar:
				// its static return is the placeholder array<type>, with the element
				// type following the expression argument (request.security above is
				// the same idea without the array wrapper). Left unresolved, the
				// placeholder propagated into array.max(sub) -> 'type' and tripped
				// the assignment check. see INV027
				if (
					funcName === "request.security_lower_tf" &&
					callExpr.arguments.length >= 3
				) {
					const exprArg = callExpr.arguments[2].value;
					if (exprArg.type !== "ArrayExpression") {
						const elem = this.inferExpressionType(exprArg, version);
						if (elem !== "unknown") {
							const m = elem.match(/^(?:series|simple|input|const)<(.+)>$/);
							type = `array<${m ? m[1] : elem}>` as PineType;
							break;
						}
					}
				}

				// First check if this is a polymorphic function
				// Build argument info with names for data-driven polymorphism
				const argInfos: ArgumentInfo[] = callExpr.arguments.map((arg) => ({
					name: arg.name,
					type: this.inferExpressionType(arg.value, version),
				}));
				const argTypes = argInfos.map((info) => info.type);
				const polyReturnType = getPolymorphicReturnType(
					funcName,
					argTypes,
					argInfos,
				);
				// The 'type' placeholder (an unresolved generic element) must never
				// leak into compatibility checks - e.g. the 'element' rule extracts
				// 'type' from an arg typed array<type>. Fall through to the
				// unknown guard below instead. see INV027
				if (
					polyReturnType &&
					(polyReturnType as string) !== "type" &&
					!polyReturnType.includes("<type>")
				) {
					type = polyReturnType;
					break;
				}

				// A polymorphic function whose return follows an argument we
				// couldn't type must NOT fall back to its frozen overload-#0 return.
				// nz/fixnan freeze to "simple color", so nz(<unresolved>) would be
				// mis-typed as color and spuriously trip downstream arg-type checks
				// (e.g. int(nz(tonumber(x)))). Yield unknown instead. see INV016.
				// Same for return-follows-param functions without the polymorphic
				// flag: ta.valuewhen freezes to color, so valuewhen(c, <untyped
				// param>, 0) minus another one was flagged as color arithmetic. see #18
				if (getPolymorphicType(funcName) || hasReturnTypeParam(funcName)) {
					type = "unknown";
					break;
				}

				// Then check function signatures for built-ins
				const signature = this.functionSignatures.get(funcName);
				if (signature?.returns) {
					const ret = signature.returns;
					// A generic placeholder return ("type", "matrix<type>", ...)
					// follows the element type of the function's collection
					// argument (e.g. matrix.transpose(matrix<bool>) -> matrix<bool>).
					// Resolve it from the first concretely-typed collection arg;
					// when none is available yield unknown - the placeholder must
					// never reach compatibility checks. (A two-parameter map<k,v>
					// placeholder can't be resolved this way; it degrades to
					// unknown via the same path.) see INV027
					if (ret === "type" || ret.includes("<type>")) {
						let elem: string | null = null;
						for (const ai of argInfos) {
							const m = ai.type.match(/^(?:array|matrix)<(.+)>$/);
							if (m && m[1] !== "type" && m[1] !== "unknown") {
								elem = m[1];
								break;
							}
						}
						type = elem
							? ((ret === "type" ? elem : ret.replace("type", elem)) as PineType)
							: "unknown";
						break;
					}
					type = mapReturnTypeToPineType(ret);
					break;
				}

				// Check if it's a user-defined function or method with a
				// registered return type. Use lookupCallable so we also see
				// methods (which live in a separate namespace from variables).
				// see INV006.
				const udfSymbol = this.symbolTable.lookupCallable(funcName);
				if (
					udfSymbol &&
					(udfSymbol.kind === "function" || udfSymbol.kind === "method") &&
					udfSymbol.type !== "unknown"
				) {
					type = udfSymbol.type;
					break;
				}

				// Fallback to TypeChecker for common built-ins
				type = TypeChecker.getBuiltinReturnType(funcName, argTypes);
				break;
			}

			case "BinaryExpression": {
				const binaryExpr = expr as BinaryExpression;
				const leftType = this.inferExpressionType(binaryExpr.left, version);
				const rightType = this.inferExpressionType(binaryExpr.right, version);
				type = TypeChecker.getBinaryOpType(
					leftType,
					rightType,
					binaryExpr.operator,
				);
				break;
			}

			case "UnaryExpression": {
				const unaryExpr = expr as UnaryExpression;
				if (unaryExpr.operator === "not") {
					type = "bool";
				} else if (unaryExpr.operator === "-") {
					type = this.inferExpressionType(unaryExpr.argument, version);
				} else {
					type = this.inferExpressionType(unaryExpr.argument, version);
				}
				break;
			}

			case "TernaryExpression": {
				const ternaryExpr = expr as TernaryExpression;
				const conseqType = this.inferExpressionType(
					ternaryExpr.consequent,
					version,
				);
				const altType = this.inferExpressionType(
					ternaryExpr.alternate,
					version,
				);

				if (conseqType === "unknown" && altType === "unknown") {
					type = "unknown";
					break;
				}

				// An na branch carries no type information - the other branch is
				// the ternary's type. When that other branch is unknown, the
				// result must stay unknown, NOT become na: `cond ? mapVar.get(k)
				// : na` typed as na tripped CE10097 on perfectly typed
				// declarations. see INV032
				if (conseqType === "unknown" && altType !== "unknown") {
					type = TypeChecker.isNaType(altType) ? "unknown" : altType;
					break;
				}
				if (altType === "unknown" && conseqType !== "unknown") {
					type = TypeChecker.isNaType(conseqType) ? "unknown" : conseqType;
					break;
				}

				// Handle na ? na : value pattern
				if (conseqType === "na") {
					type = altType;
				} else if (altType === "na") {
					type = conseqType;
				} else if (TypeChecker.isAssignable(conseqType, altType)) {
					type = conseqType;
				} else if (TypeChecker.isAssignable(altType, conseqType)) {
					type = altType;
				} else if (
					TypeChecker.isNumericType(conseqType) &&
					TypeChecker.isNumericType(altType)
				) {
					// Both numeric - use wider type
					if (conseqType.includes("float") || altType.includes("float")) {
						type =
							conseqType.startsWith("series") || altType.startsWith("series")
								? "series<float>"
								: "float";
					} else {
						type =
							conseqType.startsWith("series") || altType.startsWith("series")
								? "series<int>"
								: "int";
					}
				} else {
					type = "unknown";
				}
				break;
			}

			case "IndexExpression": {
				const indexExpr = expr as IndexExpression;
				const arrayType = this.inferExpressionType(indexExpr.object, version);

				// Handle series<T>[index] → T
				const seriesMatch = arrayType.match(/^series<(.+)>$/);
				if (seriesMatch) {
					type = seriesMatch[1] as PineType;
					break;
				}

				// Handle array<T>[index] → T
				const arrayMatch = arrayType.match(/^array<(.+)>$/);
				if (arrayMatch) {
					type = arrayMatch[1] as PineType;
					break;
				}

				type = arrayType === "unknown" ? "unknown" : arrayType;
				break;
			}

			case "SwitchExpression": {
				// Condition-driven qualification (series/input wrap) is applied
				// centrally at the tail of this function. see INV040
				const switchExpr = expr as SwitchExpression;
				if (switchExpr.cases.length > 0) {
					type = this.inferExpressionType(switchExpr.cases[0].result, version);
				}
				break;
			}

			case "IfExpression": {
				// The value is the consequent's tail expression (mirrors the
				// SwitchExpression first-arm rule above). see INV031
				const ifExpr = expr as IfExpression;
				const tail = ifExpr.consequent[ifExpr.consequent.length - 1];
				if (tail?.type === "ExpressionStatement") {
					type = this.inferExpressionType(
						(tail as ExpressionStatement).expression,
						version,
					);
				}
				break;
			}

			case "MemberExpression": {
				const memberExpr = expr as MemberExpression;

				// Try to get namespace.property full name
				if (
					memberExpr.object?.type === "Identifier" &&
					memberExpr.property?.type === "Identifier"
				) {
					const propertyName = `${memberExpr.object.name}.${memberExpr.property.name}`;
					const namespaceName = memberExpr.object.name;

					// Check if it's a known namespace property
					if (propertyName in NAMESPACE_PROPERTIES) {
						type = NAMESPACE_PROPERTIES[propertyName];
						break;
					}

					// Check if it's a known function (some functions can be accessed without parentheses)
					// e.g., ta.tr is a function but can be used as ta.tr without ()
					const funcSig = this.functionSignatures.get(propertyName);
					if (funcSig) {
						// Return the function's return type
						type = funcSig.returns
							? mapReturnTypeToPineType(funcSig.returns)
							: "unknown";
						break;
					}

					// A built-in TYPE reached as a member (`chart.point`) is a
					// real property of the namespace - just not a value. The
					// value-position CE10272 is emitted by validateExpression;
					// don't stack the misleading unknown-property wording on
					// top. see INV048
					if (TYPE_NAMES.has(propertyName)) {
						break;
					}

					// Check if namespace exists but property doesn't (v6 only)
					if (version === "6") {
						if (KNOWN_NAMESPACES.includes(namespaceName)) {
							this.addError(
								memberExpr.line || 0,
								memberExpr.column || 0,
								propertyName.length,
								`Unknown property '${memberExpr.property.name}' on namespace '${namespaceName}'`,
								DiagnosticSeverity.Error,
							);
						}
					}
				}

				type = "unknown";
				break;
			}
		}

		// input.*() results are input-QUALIFIED ("input bool" etc.) but the
		// polymorphic defval path collapses them to the bare base. Re-wrap
		// bare primitives from the pine-data raw return so input-ness
		// propagates into conditional results and the const-arg check
		// (input.source stays series<float> - already bracketed). see INV040
		if (
			expr.type === "CallExpression" &&
			type !== "unknown" &&
			!(type as string).includes("<")
		) {
			const ce = expr as CallExpression;
			let inputFnName = "";
			if (ce.callee.type === "Identifier") {
				inputFnName = (ce.callee as Identifier).name;
			} else if (
				ce.callee.type === "MemberExpression" &&
				(ce.callee as MemberExpression).object.type === "Identifier"
			) {
				const m = ce.callee as MemberExpression;
				inputFnName = `${(m.object as Identifier).name}.${m.property.name}`;
			}
			if (inputFnName === "input" || inputFnName.startsWith("input.")) {
				const raw = resolveCallReturnRaw(
					inputFnName,
					ce.arguments.map((a) => this.inferExpressionType(a.value, version)),
				);
				if (raw && /^input\b/.test(raw)) {
					type = `input<${type}>` as PineType;
				}
			}
		}

		// A conditional expression (ternary / if-expression / switch) driven
		// by series or input conditions yields a result of that qualifier -
		// TV's plot-title CE10123 probes type both `close > open ? "U" : "D"`
		// (series string) and the input.bool-driven forms (input string).
		// Wrap bare primitive results only. see INV040
		if (type !== "unknown" && !(type as string).includes("<")) {
			const conds = this.governingConditions(expr);
			if (conds && conds.length > 0) {
				const q = this.conditionQualifier(conds, version);
				if (q) type = `${q}<${type}>` as PineType;
			}
		}

		this.expressionTypes.set(expr, type);
		return type;
	}

	private checkUnusedVariables(): void {
		const unused = this.symbolTable.getAllUnusedSymbols();
		for (const symbol of unused) {
			this.addError(
				symbol.line,
				symbol.column,
				symbol.name.length,
				`Variable '${symbol.name}' is declared but never used`,
				DiagnosticSeverity.Warning,
			);
		}
	}

	// NOTE: canPromoteType was removed as redundant with TypeChecker.isAssignable()
	// All type coercion rules (simple->series, int->float, etc.) are in types.ts

	private addError(
		line: number,
		column: number,
		length: number,
		message: string,
		severity: DiagnosticSeverity,
	): void {
		this.errors.push({ line, column, length, message, severity });
	}
}
