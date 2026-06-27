// Pine Script Type Checker and Validator
// Performs semantic analysis and type checking on the AST

import { LIBRARY_EXPORTS_BY_PATH, TYPE_NAMES } from "../../../../pine-data/v6";
import { DiagnosticSeverity, type ValidationError } from "../common/errors";
import { TYPE_KEYWORDS } from "../constants/keywords";
import type {
	ArrayExpression,
	BinaryExpression,
	CallExpression,
	Expression,
	ExpressionStatement,
	FunctionDeclaration,
	FunctionParam,
	Identifier,
	IfExpression,
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
	getBuiltinQualifiedType,
	getBuiltinVarInfo,
	getPolymorphicReturnType,
	getPolymorphicType,
	hasReturnTypeParam,
	KNOWN_NAMESPACES,
	mapReturnTypeToPineType,
	mapToPineType,
	NAMESPACE_PROPERTIES,
	resolveCallReturnRaw,
} from "./builtins";
import { isVoidCall, validateCallExpression } from "./checker-calls";
import {
	annotationToSymbolType,
	checkBuiltinShadowDeclaration,
	checkExportedParamsTypified,
	checkFunctionRedefinition,
	checkParamTypeAnnotations,
	checkRedeclaration,
	checkTypeAnnotationName,
	recordEnumMembers,
	registerTypeDeclaration,
} from "./checker-declarations";
import {
	addOperatorTypeError,
	boolContextOk,
	checkIfSwitchBranchTypes,
	validateBinaryExpression,
	validateTernaryExpression,
	validateUnaryExpression,
} from "./checker-expressions";
import {
	ARRAY_ELEMENT_RETURN_METHODS,
	ARRAY_SELF_RETURN_METHODS,
	CE10123_TEMPLATE,
	MAP_SELF_RETURN_METHODS,
	MATRIX_ARRAY_RETURN_METHODS,
	MATRIX_SELF_RETURN_METHODS,
	memberChainName,
	NESTED_COLLECTION_MESSAGE,
	SCALAR_BASE_TYPES,
} from "./checker-helpers";
import type { UdfBodyRecord } from "./checker-provenance";
import {
	defineTupleVariables,
	inferTupleElementTypes,
	inferUdfTupleReturnTypes,
	recordUdfTupleReturn,
	tupleInitArity,
} from "./checker-tuples";
import {
	checkDuplicateUdtFields,
	checkTypeFieldDefaults,
	checkUdtFieldAccess,
	resolveUdtFieldType,
} from "./checker-udt";
import { type Symbol as SymbolInfo, SymbolTable } from "./symbols";
import { type PineType, TypeChecker } from "./types";

// Re-export for backward compatibility
export { DiagnosticSeverity, type ValidationError } from "../common/errors";

export class UnifiedPineValidator {
	private errors: ValidationError[] = [];
	// NOTE: several members below are `public` rather than `private` because the
	// checker is split across checker-*.ts modules (tuples, calls, declarations,
	// udt). Those modules are free functions taking this instance as `v` and need
	// access to the shared state + spine. Treat them as module-internal.
	public symbolTable: SymbolTable;
	public functionSignatures: Map<string, FunctionSignature>;
	public expressionTypes: Map<Expression, PineType> = new Map();
	// Function-name → per-tuple-element return types, for user-defined
	// functions / methods whose body's final expression is a tuple
	// (ArrayExpression). Used by inferTupleElementTypes so destructuring
	// assignments like `[a, b, c] = f()` recover the element types
	// rather than defaulting everything to `series<float>`. see INV010.
	// Captured tuple-return shapes per UDF name. A name can carry several
	// arities (e.g. a 2-tuple method and a 3-tuple function overload both
	// named `valueAtTime`), so each entry is a list of shapes. see INV010.
	public udfTupleReturnTypes: Map<string, PineType[][]> = new Map();
	public blockDepth: number = 0;
	// Built-in variables referenced (as built-ins) so far, in source
	// order. Declaring a variable with one of these names afterwards is
	// TV's CE10190; without a prior use it is only the CW10011 warning
	// (probed 2026-06-04, see INV023 / TODO #40).
	public usedBuiltins: Set<string> = new Set();
	// UDT / enum names declared so far, in source order. A declaration's
	// type annotation must name one of these (or a built-in type) - and
	// use-before-declaration is the same CE10149 (probed). see INV033
	public declaredTypeNames: Set<string> = new Set();
	// Enum names specifically (subset of declaredTypeNames). A bare enum
	// name in value position is TV's CE10074 ("Cannot use the "E" as a
	// value...") while a bare UDT name is accepted - so the value-position
	// check needs to tell the two apart. see INV048
	public declaredEnumNames: Set<string> = new Set();
	// Enum name -> its member names. `E.member` is typed as the enum (the name),
	// so the operator checks reject `E.a == 1` / `E.a + 1` (CE10123). see INV096
	public enumMemberNames: Map<string, Set<string>> = new Map();
	// UDF / method names declared so far, in source order. The CE10271
	// undefined-callable check consults this instead of the symbol table
	// because variables SHARE the symbol namespace and hide functions:
	// `loss = loss(...)`, `[sto] = sto()`, and a later body-local
	// pre-collected over a global UDF (`float ema2 = ...` inside a body
	// calling global `ema2()`) are all TV-legal calls. see INV036
	public declaredFunctionNames: Set<string> = new Set();
	public udtFieldTypes: Map<string, Map<string, PineType>> = new Map();
	public reportedUdtFieldErrors: Set<string> = new Set();
	// Namespaces bound by an `import` - the alias if present, else the
	// library name (the path's middle segment: `import User/ta/8` binds the
	// namespace `ta`). Members of these are library calls we cannot resolve,
	// so the builtin-namespace member-call check skips them even when the
	// name collides with a built-in namespace. see INV053
	public importedNamespaces: Set<string> = new Set();
	// Imported namespace -> its full "Author/Lib/Version" path, for the
	// libraries whose export set we vendor (pine-data/v6/libraries). Lets the
	// member-call check VALIDATE members of those libraries (CE10271 on an
	// unknown export) instead of skipping them - the data-backed slice of #41.
	// see INV067
	public importedLibraryPaths: Map<string, string> = new Map();
	// Lexical stack of names DECLARED in each scope, for TV's CE10095
	// ("X" is already defined): re-declaring a name in the SAME scope is
	// an error - typed or untyped, after var/varip, and a function param
	// re-declared in its body (all probed). Shadowing a PARENT scope is
	// only the CW10011/CW10013 warning (INV020), hence a stack and not a
	// single set. Unlike the symbol table, if-bodies get their own frame
	// here (TV scopes them) and builtins never enter it. see INV035
	public declScopes: Array<Set<string>> = [];
	// Name of the UDF / method whose body is currently being validated, or
	// null at top level. Pine v6 forbids recursion: a direct self-call inside
	// the body resolves to nothing (TV reports CE10271 "Could not find function
	// ... 'f'", because the name is not yet bound while its own body compiles).
	// Only DIRECT self-recursion needs this; mutual recursion is already caught
	// by the source-order CE10271 rule (the callee is undefined at that point).
	// see INV086
	public currentFunctionName: string | null = null;
	// UDF names declared more than once (overload sets). A call to an
	// overloaded name from inside one overload's body dispatches to a SIBLING
	// overload, not itself, so it is NOT recursion - TV accepts it (probed
	// 2026-06-25, see INV086 overload-sibling-dispatch). The self-recursion
	// check below therefore only fires for names declared exactly once.
	public overloadedFunctionNames: Set<string> = new Set();
	// Per-name list of the param signatures declared so far, for the
	// redefinition check: two same-arity declarations whose params are not
	// distinguishable by explicit type are TV's CE10110/CE10112/CE10113. see
	// INV091
	public functionDeclSignatures: Map<string, FunctionParam[][]> = new Map();
	// UDF body registry for structural qualifier provenance. It deliberately
	// stores declarations separately from return-type inference. see INV122
	public udfBodyRecords: Map<string, UdfBodyRecord[]> = new Map();
	// Names declared as a METHOD. A method can share a name with a function
	// (legal overload); UDF call-site validation skips such names since the
	// captured function signature may not be the overload a plain call resolves
	// to. see INV095
	public methodDeclaredNames: Set<string> = new Set();
	// Loop-nesting depth (for/for-in/while). `break`/`continue` outside any loop
	// are TV's CE10135/CE10136. Distinct from blockDepth, which also counts
	// if-blocks (where break IS allowed if a loop encloses them). see INV092
	private loopDepth = 0;

	constructor(
		public readonly localLibraryExportsBySourcePath: Map<
			string,
			Set<string>
		> = new Map(),
		public readonly parserClean = true,
	) {
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
		this.enumMemberNames.clear();
		this.declaredFunctionNames.clear();
		this.udtFieldTypes.clear();
		this.reportedUdtFieldErrors.clear();
		this.importedNamespaces.clear();
		this.importedLibraryPaths.clear();
		this.declScopes = [new Set()];
		this.currentFunctionName = null;
		this.overloadedFunctionNames.clear();
		this.functionDeclSignatures.clear();
		this.udfBodyRecords.clear();
		this.methodDeclaredNames.clear();
		this.loopDepth = 0;

		// Pre-pass: tally top-level function declarations so overloaded names
		// (declared 2+ times) are known regardless of source order. The
		// self-recursion check skips them - an overloaded self-named call is
		// sibling dispatch, not recursion. see INV086
		{
			const seen = new Set<string>();
			for (const statement of ast.body) {
				if (statement.type === "FunctionDeclaration") {
					if (seen.has(statement.name)) {
						this.overloadedFunctionNames.add(statement.name);
					}
					seen.add(statement.name);
				} else if (statement.type === "MethodDeclaration") {
					// A name can be BOTH a function and a method (TV-legal
					// overload). Methods parse as a separate node, so record them
					// to keep UDF call-site validation from applying the function
					// overload to a method call. see INV095
					this.methodDeclaredNames.add((statement as { name: string }).name);
				}
			}
		}

		// Pre-scan imports so a member call on an imported namespace is
		// recognised regardless of source order (the main pass below is
		// single-pass top-to-bottom). see INV053
		for (const statement of ast.body) {
			if (statement.type === "ImportStatement") {
				const ns = statement.alias ?? statement.libraryPath.split("/")[1];
				if (ns) {
					this.importedNamespaces.add(ns);
					// Record the path so the member-call check can validate
					// members against the vendored export set (INV067). The last
					// import wins on an ns collision, matching TV's single-binding.
					const localExports = statement.sourcePath
						? this.localLibraryExportsBySourcePath.get(statement.sourcePath)
						: undefined;
					if (localExports) {
						this.localLibraryExportsBySourcePath.set(
							statement.libraryPath,
							localExports,
						);
						this.importedLibraryPaths.set(ns, statement.libraryPath);
					} else if (LIBRARY_EXPORTS_BY_PATH.has(statement.libraryPath)) {
						this.importedLibraryPaths.set(ns, statement.libraryPath);
					}
				}
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

	public collectDeclarations(
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
				symbol.type = annotationToSymbolType(
					this,
					statement.typeAnnotation.name,
				);
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
			const elementTypes = inferTupleElementTypes(this, tupleDecl, version);
			defineTupleVariables(this, tupleDecl, elementTypes);
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
			if (statement.type === "TypeDeclaration") {
				registerTypeDeclaration(this, statement);
			} else {
				this.declaredTypeNames.add(statement.name); // see INV033
				this.declaredEnumNames.add(statement.name); // see INV048
				recordEnumMembers(this, statement); // see INV096
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

	private recordUdfBody(statement: FunctionDeclaration): void {
		let records = this.udfBodyRecords.get(statement.name);
		if (!records) {
			records = [];
			this.udfBodyRecords.set(statement.name, records);
		}
		records.push({ declaration: statement, body: statement.body });
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
				checkBuiltinShadowDeclaration(
					this,
					statement.name,
					statement.line,
					statement.column,
					version,
				);
				checkTypeAnnotationName(this, statement, version);
				checkRedeclaration(this, statement.name, statement, version);
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
						NESTED_COLLECTION_MESSAGE,
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
					isVoidCall(this, statement.init as CallExpression, version)
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

				// A tuple-returning call (or block expression) bound to a SINGLE
				// variable is TV's CE10092 - a tuple can only be destructured
				// (`[a, b] = f()`), never bound to one name. Uses the same
				// arity classifier as the destructure path (INV058): it is
				// args-aware, so a builtin's SCALAR overload (`ta.vwap(hlc3)`)
				// is left alone while its tuple overload and always-tuple
				// builtins (`ta.macd`) are flagged - the arity-aware overload
				// resolution INV105 deferred. A bare tuple literal `a = [1, 2]`
				// is the parser's CE10156 (INV049), so skip ArrayExpression. v6
				// only (builtin returns data is v6, G004). see INV105 / INV109
				if (
					version === "6" &&
					statement.init &&
					statement.init.type !== "ArrayExpression" &&
					tupleInitArity(this, statement.init, version).kind === "tuple"
				) {
					this.addTemplateError({
						line: statement.startLine ?? statement.line,
						column: statement.startColumn ?? statement.column,
						length: statement.name.length,
						message:
							'Invalid assignment. Cannot assign a tuple to a variable "{name}".',
						severity: DiagnosticSeverity.Error,
						code: "CE10092",
						ctx: { name: statement.name },
					});
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
					symbol.type = annotationToSymbolType(
						this,
						statement.typeAnnotation.name,
					);
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
								!TypeChecker.isAssignable(
									initType,
									varSymbol.type,
									version !== "6",
								)
							) {
								// TV uses the same CE10173 template and statement-start
								// anchor here as on the strict path, with collections/
								// UDTs rendered bare and drawing types series-qualified.
								// Probed - see INV063.
								const declRendered = /^(series|simple|input|const)\s/.test(
									annotationName,
								)
									? annotationName
									: TypeChecker.renderAssignDiagnosticType(annotationName);
								this.addError(
									startLine,
									startColumn,
									span,
									`Cannot assign a value of the "${TypeChecker.renderAssignDiagnosticType(initType)}" type to the "${statement.name}" variable. The variable is declared with the "${declRendered}" type.`,
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
					checkBuiltinShadowDeclaration(
						this,
						name,
						tupleDecl.line,
						tupleDecl.column,
						version,
					);
					// Tuple names enter the redeclaration scope like plain
					// declarations: a later `m = ...` is CE10095, and so is a
					// duplicate name WITHIN one tuple (`[a, a] = ...`) - both
					// anchored at the statement start (probed). see INV035
					checkRedeclaration(this, name, tupleDecl, version);
				}
				const elementTypes = inferTupleElementTypes(this, tupleDecl, version);
				defineTupleVariables(this, tupleDecl, elementTypes);

				// TV's two tuple-destructure errors, both anchored at the
				// statement start (probes p01-p10): SHAPE when the RHS cannot
				// produce a tuple, COUNT when it produces the wrong arity.
				// TV also emits an internal "variableType.itemType is not a
				// function" artifact alongside the SHAPE error - do not
				// replicate (G001). A bare tuple-literal RHS is already the
				// parser's CE10156 (INV049), so skip it here. v6 only: the
				// builtin returns data backing the classifier is v6 (G004).
				// see INV058 / TODO #51.
				if (version === "6" && tupleDecl.init.type !== "ArrayExpression") {
					const arity = tupleInitArity(this, tupleDecl.init, version);
					if (arity.kind === "scalar") {
						this.addError(
							tupleDecl.line,
							tupleDecl.column,
							1,
							'Cannot assign a variable to a tuple. The right side must be a function call or structure ("if", "switch", "for", "while") returning a tuple with the same number of elements.',
							DiagnosticSeverity.Error,
						);
					} else if (
						arity.kind === "tuple" &&
						!arity.arities.includes(tupleDecl.names.length)
					) {
						this.addError(
							tupleDecl.line,
							tupleDecl.column,
							1,
							`Syntax error: The quantities of tuple elements on each side of the assignment operator do not match. The right side has ${arity.arities[0]} but the left side has ${tupleDecl.names.length}.`,
							DiagnosticSeverity.Error,
						);
					}
				}

				// Validate the init expression
				this.validateExpression(tupleDecl.init, version);
				break;
			}

			case "ExpressionStatement": {
				// `break`/`continue` parse as a bare Identifier statement; outside
				// any loop they are TV's CE10135/CE10136. see INV092
				const stmtExpr = statement.expression;
				if (
					version === "6" &&
					this.loopDepth === 0 &&
					stmtExpr.type === "Identifier" &&
					(stmtExpr.name === "break" || stmtExpr.name === "continue")
				) {
					this.addTemplateError({
						line: stmtExpr.line,
						column: stmtExpr.column,
						length: stmtExpr.name.length,
						message: `"${stmtExpr.name}" is only allowed inside loops.`,
						severity: DiagnosticSeverity.Error,
						code: stmtExpr.name === "break" ? "CE10135" : "CE10136",
					});
				}
				this.validateExpression(statement.expression, version);
				break;
			}

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
				const tupleTypes = inferUdfTupleReturnTypes(
					this,
					statement.body,
					version,
					statement.params,
				);
				if (tupleTypes) recordUdfTupleReturn(this, statement.name, tupleTypes);

				// Redefinition: a same-arity declaration not distinguishable by
				// explicit param types is illegal (CE10110/10112/10113). see INV091
				checkFunctionRedefinition(this, statement, version);

				// Register the function in the symbol table at the outer scope
				this.recordUdfBody(statement);
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

				checkParamTypeAnnotations(this, statement.params, version);
				checkExportedParamsTypified(
					this,
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
				// Track the enclosing function name so a direct self-call is
				// flagged as CE10271 (Pine forbids recursion). see INV086
				const prevFunctionName = this.currentFunctionName;
				this.currentFunctionName = statement.name;
				this.pushDeclScope(statement.params.map((p) => p.name));
				for (const stmt of statement.body) {
					this.validateStatement(stmt, version);
				}
				// A function whose implicit RETURN is a trailing if-statement with
				// incompatible branch types is TV's CE10235 - the same rule as an
				// if/switch EXPRESSION, but `if` in return position parses as an
				// IfStatement, which the expression path never reaches. (A switch
				// tail is a SwitchExpression and is already covered.) see INV106
				const fnTail = statement.body[statement.body.length - 1];
				if (version === "6" && fnTail?.type === "IfStatement") {
					checkIfSwitchBranchTypes(this, fnTail, version);
				}
				this.popDeclScope();
				this.currentFunctionName = prevFunctionName;
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
				if (!boolContextOk(condType, version)) {
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
			case "ForInStatement": {
				// For loops create a new scope and define the iterator variable
				this.symbolTable.enterScope();
				this.blockDepth++;
				this.loopDepth++; // break/continue allowed below here. see INV092

				// The for-in ELEMENT variable (single form's iterator, or
				// `iterator2` of `for [index, value] in`) carries the
				// collection's element type - derive it as `series <E>` from an
				// `array<E>` / `map<K,V>` (value side) collection so loop-var
				// misuse is type-checked (`for v in array<float>` then
				// `str.length(v)` is TV's CE10123). Falls back to "unknown" when
				// the element type isn't derivable (matrix, unknown element,
				// non-collection) - lenient, as before. The tuple INDEX stays
				// "int" and the counted form's iterator stays "int". see INV071
				let elemType: PineType = "unknown";
				if (
					statement.type === "ForInStatement" &&
					"collection" in statement &&
					statement.collection
				) {
					const base = TypeChecker.baseTypeName(
						this.inferExpressionType(statement.collection, version) as string,
					);
					const am = base.match(/^array<(.+)>$/);
					const mm = base.match(/^map<\s*[^,]+,\s*(.+)>$/);
					const elem = am ? am[1] : mm ? mm[1].trim() : undefined;
					if (elem && elem !== "unknown") {
						// Canonical bracket form - `isNumericType` etc. only
						// recognise `series<float>`, not the space form.
						elemType = `series<${elem}>` as PineType;
					} else if (
						version === "6" &&
						(statement.collection.type === "Identifier" ||
							statement.collection.type === "MemberExpression") &&
						SCALAR_BASE_TYPES.has(TypeChecker.baseTypeName(base))
					) {
						// `for x in close` - a scalar is not iterable. TV's CE10123
						// for the `foreach` pseudo-function: the collection ("id")
						// arg is a scalar where an `array<type>` is expected.
						// Restricted to the five scalar primitives (matrix/array/map
						// are iterable; unknown/UDT stay lenient to avoid FPs), and to
						// a plain variable/field receiver: the history-reference `[]`
						// operator (`arr[histId]`) PRESERVES the array type but our
						// element-type inference collapses it to the element scalar, so
						// an IndexExpression collection would false-positive. see INV098
						const desc = this.describeArgForTemplate(
							statement.collection,
							this.inferExpressionType(statement.collection, version),
							version,
						);
						this.addTemplateError({
							line: statement.collection.line || statement.line,
							column: statement.collection.column || statement.column,
							length: 0,
							message: CE10123_TEMPLATE,
							severity: DiagnosticSeverity.Error,
							code: "CE10123",
							ctx: {
								argDisplayName: "id",
								argUserFriendlyRepresentation: desc.repr,
								argumentType: desc.typeStr,
								currentTypeDocStr: "array<type>",
								funId: "foreach",
								typePostfix: "",
							},
						});
					}
				}
				if ("iterator" in statement) {
					const isForInValue =
						statement.type === "ForInStatement" && !statement.iterator2;
					// Counted-for counter is `series int` (TV types it so - a
					// series value is then rejected in a simple-int slot, e.g.
					// `ta.ema(close, i)`, CE10123). The for-in tuple INDEX stays
					// `int` (INV071 residual). see INV088
					const iterType: PineType = isForInValue
						? elemType
						: statement.type === "ForStatement"
							? "series<int>"
							: "int";
					this.symbolTable.define({
						name: statement.iterator,
						type: iterType,
						line: statement.line,
						column: statement.column,
						used: false,
						kind: "variable",
						declaredWith: null,
						loopVar: true, // immutable - see INV099
					});
				}
				if ("iterator2" in statement && statement.iterator2) {
					this.symbolTable.define({
						name: statement.iterator2,
						type: elemType,
						line: statement.line,
						column: statement.column,
						used: false,
						kind: "variable",
						declaredWith: null,
						loopVar: true, // immutable - see INV099
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
				this.loopDepth--;
				break;
			}

			case "WhileStatement":
				if ("condition" in statement) {
					this.validateExpression(statement.condition, version);
					// Same rule and template as the if-condition check: TV's
					// CE10101 with blockName "while", anchored at the CONDITION
					// expression (probed `while close` / `while n`). see INV041
					const whileCondType = this.inferExpressionType(
						statement.condition,
						version,
					);
					if (!boolContextOk(whileCondType, version)) {
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
				this.loopDepth++; // break/continue allowed below here. see INV092
				this.pushDeclScope();
				for (const stmt of statement.body) {
					this.validateStatement(stmt, version);
				}
				this.popDeclScope();
				this.symbolTable.exitScope();
				this.blockDepth--;
				this.loopDepth--;
				break;

			case "ReturnStatement":
				this.validateExpression(statement.value, version);
				break;

			case "AssignmentStatement": {
				// Reassigning a `for` counter / `for...in` element is TV's
				// CE10174 - loop variables are immutable. Any mutation operator
				// (`:=` / compound `+=` etc.; `=` is a redeclaration, a separate
				// error) on a loopVar-flagged symbol, anchored at the target.
				// see INV099
				if (
					version === "6" &&
					statement.operator !== "=" &&
					statement.target.type === "Identifier"
				) {
					const targetSym = this.symbolTable.lookup(
						(statement.target as Identifier).name,
					);
					if (targetSym?.loopVar) {
						this.addTemplateError({
							line: statement.target.line || statement.line,
							column: statement.target.column || statement.column,
							length: (statement.target as Identifier).name.length,
							message: 'Variable "{variableName}" cannot be mutable',
							severity: DiagnosticSeverity.Error,
							code: "CE10174",
							ctx: { variableName: (statement.target as Identifier).name },
						});
					}
				}
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
						const initType = this.inferExpressionType(statement.value, version);
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
					isVoidCall(this, statement.value as CallExpression, version)
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
					} else if (
						!TypeChecker.isAssignable(valueType, targetType, version !== "6")
					) {
						// Identifier targets get TV's CE10173 template (probed - see
						// INV063); member/index targets keep the internal wording
						// because the template needs a variable name (unprobed shape).
						const message =
							statement.target.type === "Identifier"
								? `Cannot assign a value of the "${TypeChecker.renderAssignDiagnosticType(valueType)}" type to the "${(statement.target as Identifier).name}" variable. The variable is declared with the "${TypeChecker.renderAssignDiagnosticType(targetType)}" type.`
								: `Cannot assign ${TypeChecker.displayType(valueType)} to ${TypeChecker.displayType(targetType)}`;
						this.addError(
							statement.line,
							statement.column,
							1, // length of operator
							message,
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
				const tupleTypes = inferUdfTupleReturnTypes(
					this,
					statement.body,
					version,
					statement.params,
				);
				if (tupleTypes) recordUdfTupleReturn(this, statement.name, tupleTypes);

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

				checkParamTypeAnnotations(this, statement.params, version);
				checkExportedParamsTypified(
					this,
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
				// Implicit-return trailing if-statement branch types (CE10235),
				// as in FunctionDeclaration above. see INV106
				const mTail = statement.body[statement.body.length - 1];
				if (version === "6" && mTail?.type === "IfStatement") {
					checkIfSwitchBranchTypes(this, mTail, version);
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
				if (statement.type === "TypeDeclaration") {
					registerTypeDeclaration(this, statement);
					checkTypeFieldDefaults(this, statement, version);
					checkDuplicateUdtFields(this, statement, version);
				} else {
					this.declaredTypeNames.add(statement.name); // see INV033
					this.declaredEnumNames.add(statement.name); // see INV048
					recordEnumMembers(this, statement); // see INV096
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

	private inferReceiverMethodReturn(
		call: CallExpression,
		version: string,
	): PineType | null {
		if (call.callee.type !== "MemberExpression") return null;
		const member = call.callee as MemberExpression;
		const method = member.property.name;
		const receiverType = TypeChecker.baseTypeName(
			this.inferExpressionType(member.object, version) as string,
		);

		const arrayMatch = receiverType.match(/^array<(.+)>$/);
		if (arrayMatch) {
			if (ARRAY_ELEMENT_RETURN_METHODS.has(method)) {
				return arrayMatch[1] as PineType;
			}
			if (ARRAY_SELF_RETURN_METHODS.has(method)) {
				return receiverType as PineType;
			}
		}

		const matrixMatch = receiverType.match(/^matrix<(.+)>$/);
		if (matrixMatch) {
			if (method === "get") {
				return matrixMatch[1] as PineType;
			}
			if (MATRIX_SELF_RETURN_METHODS.has(method)) {
				return receiverType as PineType;
			}
			if (MATRIX_ARRAY_RETURN_METHODS.has(method)) {
				return `array<${matrixMatch[1]}>` as PineType;
			}
		}

		const mapMatch = receiverType.match(/^map<\s*[^,]+,\s*(.+)>$/);
		if (mapMatch) {
			if (method === "get") {
				return mapMatch[1].trim() as PineType;
			}
			if (MAP_SELF_RETURN_METHODS.has(method)) {
				return receiverType as PineType;
			}
		}

		return null;
	}

	public validateExpression(expr: Expression, version: string = "6"): void {
		switch (expr.type) {
			case "Identifier":
				this.validateIdentifier(expr);
				this.checkNonValueReference(expr, version);
				break;

			case "CallExpression":
				validateCallExpression(this, expr, version);
				break;

			case "MemberExpression": {
				// The object is a namespace/receiver position, not a value use -
				// route an Identifier object straight to validateIdentifier so
				// checkNonValueReference doesn't fire on `chart.bg_color`,
				// `ta.sma`, etc. see INV048
				const memberObj = expr.object;
				if (memberObj.type === "Identifier") {
					this.validateIdentifier(memberObj, memberChainName(expr));
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
				checkUdtFieldAccess(this, expr, version);
				break;
			}

			case "BinaryExpression":
				this.validateExpression(expr.left, version);
				this.validateExpression(expr.right, version);
				validateBinaryExpression(this, expr, version);
				break;

			case "UnaryExpression":
				this.validateExpression(expr.argument, version);
				validateUnaryExpression(this, expr, version);
				break;

			case "TernaryExpression":
				this.validateExpression(expr.condition, version);
				this.validateExpression(expr.consequent, version);
				this.validateExpression(expr.alternate, version);
				validateTernaryExpression(this, expr, version);
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
				// A switch WITH a subject desugars each case to `subject == case`,
				// so a case value incomparable with the subject is TV's CE10123 for
				// `operator ==` (probed `switch close` / `"a"` case -> expr1
				// "literal string" but "series float" expected). Reuses the same
				// `areTypesCompatible` predicate as the real `==` operator. Both
				// sides must be concretely typed (unknown stays lenient). v6 only
				// (G004). see INV104
				const subjType = switchExpr.discriminant
					? this.inferExpressionType(switchExpr.discriminant, version)
					: null;
				const subjDocStr =
					switchExpr.discriminant && subjType
						? this.describeArgForTemplate(
								switchExpr.discriminant,
								subjType,
								version,
							).typeStr
						: "";
				if (switchExpr.discriminant) {
					this.validateExpression(switchExpr.discriminant, version);
				}
				for (const switchCase of switchExpr.cases) {
					if (switchCase.condition) {
						this.validateExpression(switchCase.condition, version);
						if (version === "6" && subjType && subjType !== "unknown") {
							const caseType = this.inferExpressionType(
								switchCase.condition,
								version,
							);
							if (
								caseType !== "unknown" &&
								!TypeChecker.areTypesCompatible(subjType, caseType, "==", false)
							) {
								addOperatorTypeError(
									this,
									"==",
									"expr1",
									switchCase.condition,
									caseType,
									subjDocStr,
									version,
								);
							}
						}
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
				checkIfSwitchBranchTypes(this, switchExpr, version);
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
				checkIfSwitchBranchTypes(this, ifExpr, version);
				break;
			}
		}
	}

	private validateIdentifier(
		identifier: Identifier,
		fullMemberName?: string,
	): void {
		const symbol = this.symbolTable.lookup(identifier.name);

		if (!symbol) {
			// Check if it's a namespace member access
			if (identifier.name.includes(".")) {
				return;
			}

			if (fullMemberName) {
				this.addError(
					identifier.line,
					identifier.column,
					fullMemberName.length,
					`Undeclared identifier "${fullMemberName}"`,
					DiagnosticSeverity.Error,
				);
				return;
			}

			const similar = this.symbolTable.findSimilarSymbols(identifier.name, 2);
			let message = `Undefined variable '${identifier.name}'`;
			if (similar.length > 0) {
				message += `. Did you mean '${similar[0]}'?`;
			}
			if (similar.length === 0) {
				message = `Undeclared identifier "${identifier.name}"`;
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
	private checkNonValueReference(
		identifier: Identifier,
		version: string,
	): void {
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

	public getBaseType(type: PineType): string {
		const match = (type as string).match(
			/^(?:series|simple|input|const)<(.+)>$/,
		);
		return match ? match[1] : (type as string);
	}

	public hasCollectionTemplateArg(call: CallExpression): boolean {
		return (call.typeArguments ?? []).some((t) =>
			/^(array|matrix|map)\s*</.test(t.trim()),
		);
	}

	// Render an internal PineType in TV's qualified display form ("series
	// float"). Our lattice collapses const/input/simple to the bare base, so a
	// bare type's qualifier is unrecoverable - `bareQualifier` supplies the
	// best guess for the context (user variables initialized from literals
	// probe as "const", INV061 p09). see INV061
	public renderTvType(t: PineType, bareQualifier: string): string {
		const m = (t as string).match(/^(series|simple|input|const)<(.+)>$/);
		if (m) return `${m[1]} ${m[2]}`;
		if (
			t === "unknown" ||
			t === "na" ||
			t === "void" ||
			// Opaque handle types carry no series/const qualifier (TV renders
			// `plot`, not `series plot`). see INV089
			t === "plot" ||
			t === "hline" ||
			t === "line" ||
			t === "label" ||
			t === "box" ||
			t === "table" ||
			(t as string).includes("<")
		) {
			return t;
		}
		return `${bareQualifier} ${t}`;
	}

	// The {argUserFriendlyRepresentation} and {argumentType} slots of CE10123
	// for ANY argument expression, matching TV's probed forms: literals render
	// bare ("red", 42) as "literal <base>"; identifiers/members render as
	// source text with the catalog qualifier; operator expressions and calls
	// render as `call "operator +" (series float)` / `call "ta.sma" (series
	// float)`. Best-effort on shapes TV was not probed for. see INV061
	public describeArgForTemplate(
		expr: Expression,
		inferred: PineType,
		version: string,
	): { repr: string; typeStr: string } {
		switch (expr.type) {
			case "Literal": {
				const lit = expr as Literal;
				if (typeof lit.value === "string") {
					// TV renders the string CONTENT, unquoted ("red" -> red).
					const repr = String(lit.value).replace(/^(["'])(.*)\1$/s, "$2");
					return { repr, typeStr: "literal string" };
				}
				if (typeof lit.value === "boolean") {
					return { repr: lit.raw, typeStr: "literal bool" };
				}
				if (lit.raw.startsWith("#")) {
					return { repr: lit.raw, typeStr: "literal color" };
				}
				const base =
					lit.raw.includes(".") || /[eE]/.test(lit.raw) ? "float" : "int";
				return { repr: lit.raw, typeStr: `literal ${base}` };
			}
			case "Identifier":
			case "MemberExpression": {
				const name =
					expr.type === "Identifier"
						? (expr as Identifier).name
						: memberChainName(expr);
				const qualified = name ? getBuiltinQualifiedType(name) : undefined;
				const sym =
					expr.type === "Identifier"
						? this.symbolTable.lookup((expr as Identifier).name)
						: undefined;
				const bareQualifier = sym && sym.line !== 0 ? "series" : "const";
				return {
					repr: name || "?",
					typeStr: qualified ?? this.renderTvType(inferred, bareQualifier),
				};
			}
			case "CallExpression": {
				const ce = expr as CallExpression;
				const name = memberChainName(ce.callee);
				const argTypes = ce.arguments.map((a) =>
					this.inferExpressionType(a.value, version),
				);
				const raw = name ? resolveCallReturnRaw(name, argTypes) : undefined;
				const typeStr =
					raw && raw !== "void"
						? name === "ta.change"
							? "series float"
							: raw
						: this.renderTvType(inferred, "series");
				return { repr: `call "${name || "?"}" (${typeStr})`, typeStr };
			}
			case "BinaryExpression":
			case "UnaryExpression": {
				const op = (expr as BinaryExpression | UnaryExpression).operator;
				const typeStr = this.renderTvType(inferred, "series");
				return { repr: `call "operator ${op}" (${typeStr})`, typeStr };
			}
			case "TernaryExpression": {
				const typeStr = this.renderTvType(inferred, "series");
				return { repr: `call "operator ?:" (${typeStr})`, typeStr };
			}
			default: {
				const typeStr = this.renderTvType(inferred, "series");
				return { repr: typeStr, typeStr };
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

	public inferExpressionType(
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
				// Flatten the WHOLE callee chain - two-level builtin namespaces
				// (strategy.closedtrades.entry_comment) otherwise leave funcName
				// empty and the call's catalog return type unresolved (the same
				// INV054 bug shape, here in the inference path). see INV059.
				const funcName =
					callExpr.callee.type === "Identifier"
						? callExpr.callee.name
						: memberChainName(callExpr.callee);

				const ctorMatch = funcName.match(/^(.+)\.new$/);
				if (ctorMatch && this.declaredTypeNames.has(ctorMatch[1])) {
					type = ctorMatch[1] as PineType;
					break;
				}

				const receiverMethodReturn = this.inferReceiverMethodReturn(
					callExpr,
					version,
				);
				if (receiverMethodReturn) {
					type = receiverMethodReturn;
					break;
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
							? ((ret === "type"
									? elem
									: ret.replace("type", elem)) as PineType)
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
				} else if (
					TypeChecker.isAssignable(conseqType, altType, version !== "6")
				) {
					type = conseqType;
				} else if (
					TypeChecker.isAssignable(altType, conseqType, version !== "6")
				) {
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

				const udtFieldType = resolveUdtFieldType(this, memberExpr);
				if (udtFieldType) {
					type = udtFieldType;
					break;
				}

				// Try to get namespace.property full name
				if (
					memberExpr.object?.type === "Identifier" &&
					memberExpr.property?.type === "Identifier"
				) {
					const propertyName = `${memberExpr.object.name}.${memberExpr.property.name}`;
					const namespaceName = memberExpr.object.name;

					// `E.member` where E is a declared enum and member is real ->
					// the value is typed as the enum (its name), so the operator
					// checks reject `E.a == 1` / `E.a + 1`. see INV096
					const enumMembers = this.enumMemberNames.get(namespaceName);
					if (enumMembers?.has(memberExpr.property.name)) {
						type = namespaceName as PineType;
						break;
					}

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

					// Check if namespace exists but property doesn't (v6 only).
					// TV reuses CE10272 with the full dotted name, same as the
					// INV048 type-as-value case - probed, see INV063.
					if (version === "6") {
						if (KNOWN_NAMESPACES.includes(namespaceName)) {
							this.addError(
								memberExpr.line || 0,
								memberExpr.column || 0,
								propertyName.length,
								`Undeclared identifier "${propertyName}"`,
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

	public addError(
		line: number,
		column: number,
		length: number,
		message: string,
		severity: DiagnosticSeverity,
	): void {
		this.errors.push({ line, column, length, message, severity });
	}

	// Structured (code + ctx) twin of addError for pine-lint template errors.
	// A named method - not a bare this.errors.push - so that
	// audit-error-reachability can enumerate and instrument these sites the
	// same way it does addError/addWarning ones. see INV061
	public addTemplateError(error: ValidationError): void {
		this.errors.push(error);
	}
}
