// Semantic Analyzer for Pine Script - Detects code quality issues and best practices violations

import {
	FUNCTIONS_BY_NAME,
	LIBRARY_HISTORY_DEPENDENT_BY_PATH,
	VARIABLES_BY_NAME,
} from "../../../../pine-data/v6";
import { DiagnosticSeverity } from "../common/errors";
import type {
	AssignmentStatement,
	BinaryExpression,
	CallExpression,
	Expression,
	ForInStatement,
	ForStatement,
	FunctionDeclaration,
	IfStatement,
	Literal,
	MemberExpression,
	MethodDeclaration,
	Program,
	Statement,
	SwitchExpression,
	TernaryExpression,
	VariableDeclaration,
	WhileStatement,
} from "./ast";

// TV's CW10001 wording, verbatim (probed 2026-06-04, see INV019).
const MULTILINE_STRING_MESSAGE =
	'Defining a string enclosed in a single pair of quotation marks (") or apostrophes (\') across multiple lines is deprecated. Split the string into smaller strings and concatenate them with the `+` operator instead ("like " + "this"). Alternatively, to create a multiline string, enclose the text in three pairs of apostrophes (\'\'\'like this\'\'\') or quotation marks ("""like this""").';

export interface SemanticWarning {
	line: number;
	column: number;
	length: number;
	message: string;
	severity: DiagnosticSeverity;
	rule: string;
}

// Why a region is conditional - selects the CONDITIONAL_SERIES wording
// (TV's CW10003 / CW10004 / CW10002 respectively).
type ConditionalScopeKind = "block" | "ternary" | "andor";
type TernaryBranch = "consequent" | "alternate";

interface ActiveTernaryContext {
	condition: Expression;
	alternate: Expression;
	branch: TernaryBranch;
}

export class SemanticAnalyzer {
	private warnings: SemanticWarning[] = [];
	private inConditionalScope: boolean = false;
	private conditionalScopeDepth: number = 0;
	// name -> declaration position, so unused-variable warnings can point at
	// the declaration instead of 0:0
	private declaredVariables: Map<string, { line: number; column: number }> =
		new Map();
	private usedVariables: Set<string> = new Set();
	// User functions/methods whose bodies are history-dependent (use the
	// `[]` operator or call history-dependent functions) - populated in
	// the collect pass, in source order, so declaration-before-use makes
	// transitive UDF->UDF dependence resolve. see TODO #32.
	private historyDependentUdfs: Set<string> = new Set();
	// Names of USER-DECLARED GLOBAL series variables (direct children of the
	// program body whose value is series-qualified). Distinct from `seriesVars`
	// (which also holds locals and transient params). Drives the global-index
	// history-dependence rule. Builtins (`close`, `high`) are never added here.
	// see INV126
	private globalSeriesVars: Set<string> = new Set();
	// UDFs that are history-dependent solely because their body indexes a user-
	// declared GLOBAL series var. Kept separate from `historyDependentUdfs`
	// because this flavour does not propagate to callers. see INV126
	private globalIndexDependentUdfs: Set<string> = new Set();
	// import alias -> library path (`import a/b/1 as lib` -> lib -> "a/b/1"),
	// so a `lib.member()` call can be resolved against the vendored library's
	// history-dependent export set. see INV118
	private importAliasToPath: Map<string, string> = new Map();
	// local var name -> import alias of its LIBRARY type (`var zg.Zigzag z` ->
	// z -> "zg"), so a `z.calculate()` method call on a library-typed value
	// resolves to that library's history-dependent export set. see INV118
	private localLibraryVar: Map<string, string> = new Map();
	// Innermost-first record of WHY we are in conditional scope - drives
	// the context-specific CONDITIONAL_SERIES wording (TV's CW10002/3/4).
	private conditionalScopeKinds: ConditionalScopeKind[] = [];
	// Untyped params of the function currently being analyzed in the
	// emission pass. They are "undetermined type" to TV. see INV120
	private currentUntypedParams: Set<string> = new Set();
	// Parallel to conditionalScopeKinds: whether the immediate governing
	// condition for this frame is undetermined. see INV120
	private conditionalGateUndetermined: boolean[] = [];
	// Name currently being initialized/reassigned while walking the RHS. Used
	// to keep the INV129 sibling-seed exception from silencing self-seeds.
	private currentAssignmentTarget: string | null = null;
	private ternaryContextStack: ActiveTernaryContext[] = [];
	private ambientUndeterminedGateDepth = 0;
	// Variables whose value is series-qualified (per-bar-varying) -
	// initialized or reassigned from a series expression. Built in the
	// collect pass in source order, so `b = close > open` then `if b`
	// resolves. Drives the series-condition gate (see seriesish docs).
	private seriesVars: Set<string> = new Set();
	// User variables TV displays as "undetermined type". If one appears in an
	// immediate gate, TV suppresses CW10003/4 for calls in that branch even when
	// another part of the gate is series. see INV131
	private undeterminedVars: Set<string> = new Set();
	// UDF name -> per-position series-ness of its returned TUPLE, so a
	// destructure `[a, b] = f()` can mark `a`/`b` series from f's return
	// (TV types `[..] = getStandardOHLC()` elements as series; we otherwise
	// leave them untyped and miss the series condition `if a > b`). Built in
	// the collect pass in source order. see INV117
	private udfReturnTupleSeries: Map<string, boolean[]> = new Map();
	// UDF names whose body TAIL returns a series-ish value. Used to gate the
	// library history-dependence flag: a history-dependent export warns CW10003
	// only when it produces a SERIES (`cust_series`), not when it is a side-
	// effect builder returning `this`/void (`StatsData.update`). see INV118
	private udfReturnsSeries: Set<string> = new Set();
	// UDFs whose series tail depends on an untyped param. TV exposes their call
	// result as "undetermined type"; if that value gates a branch, CW10003/4 is
	// suppressed for the branch. see INV131
	private udfReturnsUndetermined: Set<string> = new Set();
	// Lexical scope stack for shadow detection (TV's CW10013/CW10011):
	// each frame holds the names declared SO FAR in that scope, in source
	// order - TV only warns when the parent declaration precedes the
	// shadowing one (probed 2026-06-04, see INV020). Frame 0 is global.
	private scopeNames: Array<Set<string>> = [];
	// Parallel stack of names declared while inConditionalScope - i.e. in
	// a scope that "may not be executed at every update" (series-gated if
	// or switch arms, any loop body; function top-level bodies do NOT
	// count). `[]`-indexing these draws TV's CW10018 (probed 2026-06-04,
	// see INV021). Pushed/popped together with scopeNames.
	private conditionalLocalFrames: Array<Set<string>> = [];

	analyze(ast: Program): SemanticWarning[] {
		this.warnings = [];
		this.inConditionalScope = false;
		this.conditionalScopeDepth = 0;
		this.declaredVariables.clear();
		this.usedVariables.clear();
		this.historyDependentUdfs.clear();
		this.globalSeriesVars.clear();
		this.globalIndexDependentUdfs.clear();
		this.conditionalScopeKinds = [];
		this.currentUntypedParams = new Set();
		this.conditionalGateUndetermined = [];
		this.currentAssignmentTarget = null;
		this.ternaryContextStack = [];
		this.ambientUndeterminedGateDepth = 0;
		this.seriesVars.clear();
		this.undeterminedVars.clear();
		this.udfReturnTupleSeries.clear();
		this.udfReturnsSeries.clear();
		this.udfReturnsUndetermined.clear();
		this.importAliasToPath.clear();
		this.localLibraryVar.clear();
		this.scopeNames = [new Set()];
		this.conditionalLocalFrames = [new Set()];

		for (const statement of ast.body) {
			if (statement.type === "ImportStatement" && statement.alias) {
				this.importAliasToPath.set(statement.alias, statement.libraryPath);
			}
		}
		this.collectLibraryTypedVars(ast.body);

		// First pass: collect all variable declarations
		this.collectVariableDeclarations(ast);
		this.collectGlobalSeriesVars(ast.body);
		this.classifyGlobalIndexUdfs(ast.body);

		// Second pass: analyze statements and track usage
		for (const statement of ast.body) {
			this.analyzeStatement(statement);
		}

		// Third pass: check for unused variables
		this.checkUnusedVariables();

		return this.warnings;
	}

	/**
	 * The set of user functions/methods this file defines whose bodies are
	 * history-dependent (`[]` on own scope, or a call to a history-dependent
	 * function). Valid after `analyze()`. Used offline by `generate-libraries`
	 * to record which vendored-library EXPORTS are history-dependent, so the
	 * checker can flag a conditional `lib.export()` call (CW10003). see INV118
	 */
	getHistoryDependentNames(): ReadonlySet<string> {
		return this.historyDependentUdfs;
	}

	/** UDFs whose body tail returns a series value (after `analyze()`). */
	getSeriesReturningNames(): ReadonlySet<string> {
		return this.udfReturnsSeries;
	}

	/** Whether a function body's tail (return value) is series-ish. */
	private tailIsSeries(stmt: Statement | undefined): boolean {
		if (!stmt) return false;
		if (stmt.type === "ExpressionStatement")
			return this.isSeriesishExpression(stmt.expression);
		if (stmt.type === "ReturnStatement")
			return this.isSeriesishExpression(stmt.value);
		if (stmt.type === "IfStatement") {
			return (
				this.tailIsSeries(stmt.consequent[stmt.consequent.length - 1]) ||
				(stmt.alternate
					? this.tailIsSeries(stmt.alternate[stmt.alternate.length - 1])
					: false)
			);
		}
		return false;
	}

	private tailDependsOnDerivedUntyped(
		statements: Statement[],
		untypedParams: Set<string>,
	): boolean {
		if (untypedParams.size === 0) return false;
		return this.tailBlockDependsOnDerivedUntyped(
			statements,
			new Set(untypedParams),
			new Set(),
		);
	}

	private tailBlockDependsOnDerivedUntyped(
		statements: Statement[],
		derived: Set<string>,
		localSeries: Set<string>,
	): boolean {
		for (let i = 0; i < statements.length; i++) {
			const statement = statements[i];
			if (
				i === statements.length - 1 &&
				this.tailStatementDependsOnDerivedUntyped(
					statement,
					derived,
					localSeries,
				)
			) {
				return true;
			}
			this.recordDerivedUntypedEffects(statement, derived, localSeries);
		}
		return false;
	}

	private tailStatementDependsOnDerivedUntyped(
		statement: Statement,
		derived: Set<string>,
		localSeries: Set<string>,
	): boolean {
		if (statement.type === "ExpressionStatement") {
			return this.expressionDependsOnDerivedSeries(
				statement.expression,
				derived,
				localSeries,
			);
		}
		if (statement.type === "ReturnStatement") {
			return this.expressionDependsOnDerivedSeries(
				statement.value,
				derived,
				localSeries,
			);
		}
		if (statement.type === "IfStatement") {
			return (
				this.tailBlockDependsOnDerivedUntyped(
					statement.consequent,
					new Set(derived),
					new Set(localSeries),
				) ||
				(statement.alternate
					? this.tailBlockDependsOnDerivedUntyped(
							statement.alternate,
							new Set(derived),
							new Set(localSeries),
						)
					: false)
			);
		}
		if (statement.type === "SequenceStatement") {
			return this.tailBlockDependsOnDerivedUntyped(
				statement.statements,
				derived,
				localSeries,
			);
		}
		return false;
	}

	private expressionDependsOnDerivedSeries(
		expr: Expression,
		derived: Set<string>,
		localSeries: Set<string>,
	): boolean {
		return (
			this.expressionReferencesNames(expr, derived) &&
			this.isSeriesishExpressionWithLocalSeries(expr, localSeries)
		);
	}

	private recordDerivedUntypedEffects(
		statement: Statement,
		derived: Set<string>,
		localSeries: Set<string>,
	): void {
		switch (statement.type) {
			case "VariableDeclaration":
				if (statement.name && statement.init) {
					this.recordDerivedUntypedTarget(
						statement.name,
						statement.init,
						derived,
						localSeries,
					);
				}
				return;
			case "AssignmentStatement":
				if (statement.target.type === "Identifier") {
					this.recordDerivedUntypedTarget(
						statement.target.name,
						statement.value,
						derived,
						localSeries,
					);
				}
				return;
			case "TupleDeclaration": {
				const initReferencesDerived = this.expressionReferencesNames(
					statement.init,
					derived,
				);
				const initIsSeries = this.isSeriesishExpressionWithLocalSeries(
					statement.init,
					localSeries,
				);
				for (const name of statement.names) {
					if (!name) continue;
					if (initReferencesDerived) derived.add(name);
					if (initIsSeries) localSeries.add(name);
				}
				return;
			}
			case "FunctionDeclaration":
			case "MethodDeclaration":
				return;
		}
		for (const child of this.childStatements(statement)) {
			this.recordDerivedUntypedEffects(child, derived, localSeries);
		}
	}

	private recordDerivedUntypedTarget(
		name: string,
		value: Expression,
		derived: Set<string>,
		localSeries: Set<string>,
	): void {
		if (this.expressionReferencesNames(value, derived)) {
			derived.add(name);
		}
		if (this.isSeriesishExpressionWithLocalSeries(value, localSeries)) {
			localSeries.add(name);
		}
	}

	/** Map every `<alias>.<Type>`-annotated var (at any depth) to its alias. */
	private collectLibraryTypedVars(statements: Statement[]): void {
		for (const s of statements) {
			if (s.type === "VariableDeclaration" && s.name && s.typeAnnotation) {
				const t = s.typeAnnotation.name ?? "";
				const dot = t.indexOf(".");
				if (dot > 0 && this.importAliasToPath.has(t.slice(0, dot))) {
					this.localLibraryVar.set(s.name, t.slice(0, dot));
				}
			}
			this.collectLibraryTypedVars(this.childStatements(s));
		}
	}

	private analyzeStatement(statement: Statement): void {
		switch (statement.type) {
			case "VariableDeclaration":
				this.analyzeVariableDeclaration(statement);
				break;

			case "TupleDeclaration":
				// [a, b, c] = f(...) - each member is a declaration for
				// shadow purposes (TV warns CW10013 per member, anchored at
				// the tuple statement - probed, INV020); the RHS is a normal
				// expression.
				for (const name of statement.names) {
					this.declareName(name, statement.line, statement.column);
				}
				this.analyzeExpression(statement.init);
				break;

			case "ExpressionStatement":
				this.analyzeExpression(statement.expression);
				break;

			case "FunctionDeclaration":
			case "MethodDeclaration":
				this.analyzeFunctionDeclaration(statement);
				break;

			case "IfStatement":
				this.analyzeIfStatement(statement);
				break;

			case "ForStatement":
			case "ForInStatement":
				this.analyzeForStatement(statement);
				break;

			case "WhileStatement":
				this.analyzeWhileStatement(statement);
				break;

			case "AssignmentStatement":
				this.analyzeAssignmentStatement(statement);
				break;

			case "SequenceStatement":
				// Comma-separated statements: a = 1, b = 2
				for (const stmt of statement.statements) {
					this.analyzeStatement(stmt);
				}
				break;

			case "ReturnStatement":
				this.analyzeExpression(statement.value);
				break;

			// TypeDeclaration, EnumDeclaration, ImportStatement are name-only
			// nodes - nothing to walk. see plan/31 Finding 3.
		}
	}

	private analyzeVariableDeclaration(declaration: VariableDeclaration): void {
		this.declareName(declaration.name, declaration.line, declaration.column);
		// Unused-variable tracking is handled at the symbol table level -
		// here we only record the name for shadow detection and walk init.
		const init = declaration.init;
		if (init) {
			this.withAssignmentTarget(declaration.name, () => {
				this.analyzeExpression(init);
			});
		}
	}

	/**
	 * Record a declaration into the current scope frame and emit TV's
	 * shadow warnings (probed 2026-06-04, see INV020 / TODO #37):
	 *
	 * - CW10011 "Shadowing built-in variable 'X'" - fires in ANY scope
	 *   (global included) and for every declaration form (plain, var,
	 *   typed, tuple member, loop iterator). Built-in VARIABLES only -
	 *   built-in function and namespace names are silent (probed: nz,
	 *   str).
	 * - CW10013 "Shadowing variable 'X' which exists in parent scope..."
	 *   - fires for declarations in a non-global scope whose name was
	 *   declared EARLIER (source order) in any enclosing scope. Function
	 *   params do not warn (probed), so they are added via addNameOnly.
	 *
	 * When the name is a built-in, only CW10011 fires (TV emitted just
	 * CW10011 for `open` in a local scope even though built-ins "exist
	 * in parent scope" in spirit).
	 */
	private declareName(name: string, line: number, column: number): void {
		if (VARIABLES_BY_NAME.has(name)) {
			this.addWarning(
				line,
				column,
				name.length,
				`Shadowing built-in variable '${name}'`,
				DiagnosticSeverity.Warning,
				"SHADOW_BUILTIN",
			);
		} else if (
			this.scopeNames.length > 1 &&
			this.scopeNames.slice(0, -1).some((frame) => frame.has(name))
		) {
			this.addWarning(
				line,
				column,
				name.length,
				`Shadowing variable '${name}' which exists in parent scope. Did you want to use the ':=' operator instead of '=' ?`,
				DiagnosticSeverity.Warning,
				"SHADOW_VARIABLE",
			);
		}
		this.scopeNames[this.scopeNames.length - 1].add(name);
		// A declaration made under a series-gated condition or inside a
		// loop body lives in a scope that may not run every bar - record
		// it for the CW10018 history check (see INV021).
		if (this.inConditionalScope) {
			this.conditionalLocalFrames[this.conditionalLocalFrames.length - 1].add(
				name,
			);
		}
	}

	// Run `fn` inside a fresh lexical scope frame (if/loop/function body,
	// switch arm). Declarations inside land in the frame; enclosing
	// frames are the "parent scope" for CW10013.
	private withScopeFrame(fn: () => void): void {
		this.scopeNames.push(new Set());
		this.conditionalLocalFrames.push(new Set());
		try {
			fn();
		} finally {
			this.scopeNames.pop();
			this.conditionalLocalFrames.pop();
		}
	}

	private isConditionalLocal(name: string): boolean {
		// Inner scopes are always at least as conditional as their parent,
		// so a hit in ANY live frame means the visible binding was declared
		// under conditional execution.
		return this.conditionalLocalFrames.some((frame) => frame.has(name));
	}

	private analyzeFunctionDeclaration(
		declaration: FunctionDeclaration | MethodDeclaration,
	): void {
		// Analyze function/method body with params marked series
		const prevUntyped = this.currentUntypedParams;
		this.currentUntypedParams = new Set(
			declaration.params
				.filter((p) => p.name && !p.typeAnnotation)
				.map((p) => p.name),
		);
		try {
			this.withSeriesParams(declaration.params, () => {
				this.withScopeFrame(() => {
					// Params are scope names but do NOT shadow-warn (probed:
					// a param named after an earlier global is silent - INV020).
					const frame = this.scopeNames[this.scopeNames.length - 1];
					for (const param of declaration.params) {
						if (param.name) frame.add(param.name);
					}
					for (const statement of declaration.body) {
						this.analyzeStatement(statement);
					}
				});
			});
		} finally {
			this.currentUntypedParams = prevUntyped;
		}
	}

	/**
	 * Run `fn` with the function's params temporarily marked as series
	 * variables. A param is series-qualified only when it carries a TYPE
	 * annotation lacking a simple/const/input qualifier - TV infers `series
	 * int` for a typed `int direction` param and warns CW10003 on conditional
	 * calls gated by it (probed 2026-06-04, INV018). A bare UNTYPED param
	 * (`ma(source, length, MAtype)`) is "undetermined type" to TV, which is
	 * silent on conditional calls gated by it even when the call site passes a
	 * series argument (probed 2026-06-25, INV114) - so it must NOT be treated
	 * as series here, or the dominant `switch MAtype => ta.sma/ema/...` MA-
	 * selector idiom produces ~249 corpus false-positive CW10003 warnings.
	 */
	private withSeriesParams(
		params: (FunctionDeclaration | MethodDeclaration)["params"],
		fn: () => void,
	): void {
		const added: string[] = [];
		for (const param of params) {
			const t = param.typeAnnotation?.name ?? "";
			if (
				param.name &&
				t !== "" &&
				!/\b(simple|const|input)\b/.test(t) &&
				!this.seriesVars.has(param.name)
			) {
				this.seriesVars.add(param.name);
				added.push(param.name);
			}
		}
		try {
			fn();
		} finally {
			for (const n of added) {
				this.seriesVars.delete(n);
			}
		}
	}

	private analyzeIfStatement(statement: IfStatement): void {
		// The branches are conditional only when the CONDITION is series-
		// qualified - `if inputBool` selects the same branch on every bar,
		// so calls inside stay consistent (TV is silent there; probed -
		// see isSeriesishExpression). The condition itself always executes.
		const conditional = this.isSeriesishExpression(statement.condition);
		const undetermined = this.isUndeterminedGate(statement.condition);

		this.analyzeExpression(statement.condition);

		if (conditional) {
			this.enterConditionalScope("block", undetermined);
		} else if (undetermined) {
			this.enterAmbientUndeterminedGate();
		}
		try {
			this.withScopeFrame(() => {
				for (const stmt of statement.consequent) {
					this.analyzeStatement(stmt);
				}
			});
			if (statement.alternate) {
				const alternate = statement.alternate;
				this.withScopeFrame(() => {
					for (const stmt of alternate) {
						this.analyzeStatement(stmt);
					}
				});
			}
		} finally {
			if (conditional) this.exitConditionalScope();
			else if (undetermined) this.exitAmbientUndeterminedGate();
		}
	}

	private analyzeForStatement(statement: ForStatement | ForInStatement): void {
		// Enter conditional scope
		this.enterConditionalScope();

		// Analyze range/collection expressions
		if ("from" in statement) {
			this.analyzeExpression(statement.from);
		}
		if ("to" in statement) {
			this.analyzeExpression(statement.to);
		}
		if ("collection" in statement) {
			this.analyzeExpression(statement.collection);
		}

		this.withScopeFrame(() => {
			// The iterator is a declaration in the loop's scope; TV anchors
			// its shadow warning at the iterator NAME, which sits right
			// after `for ` (probed - INV020). The tuple for-in form `for
			// [i, v] in` puts the first name one further (past `[`) and the
			// second after `name, `.
			const base = statement.column + "for ".length;
			if (statement.type === "ForStatement") {
				this.declareName(statement.iterator, statement.line, base);
			} else {
				const tuple = statement.iterator2 !== undefined;
				const first = tuple ? base + 1 : base;
				this.declareName(statement.iterator, statement.line, first);
				if (statement.iterator2 !== undefined) {
					this.declareName(
						statement.iterator2,
						statement.line,
						first + statement.iterator.length + ", ".length,
					);
				}
			}

			// Analyze loop body
			for (const stmt of statement.body) {
				this.analyzeStatement(stmt);
			}
		});

		// Exit conditional scope
		this.exitConditionalScope();
	}

	private analyzeWhileStatement(statement: WhileStatement): void {
		// Enter conditional scope
		this.enterConditionalScope();

		// Analyze condition
		if ("condition" in statement) {
			this.analyzeExpression(statement.condition);
		}

		this.withScopeFrame(() => {
			for (const stmt of statement.body) {
				this.analyzeStatement(stmt);
			}
		});

		// Exit conditional scope
		this.exitConditionalScope();
	}

	// NOTE: there is deliberately no rule for reassignment inside conditional
	// scope. The former CONDITIONAL_REASSIGNMENT rule flagged the canonical
	// Pine `var` state-machine idiom; TV's CW10003 page shows conditional
	// reassignment as its recommended fix pattern, not a hazard. The real
	// hazard - conditionally CALLING series functions - is CONDITIONAL_SERIES.
	// see plan/31 Finding 4.
	private analyzeAssignmentStatement(statement: AssignmentStatement): void {
		// Analyze target and value expressions
		this.analyzeExpression(statement.target);
		this.withAssignmentTarget(
			statement.target.type === "Identifier" ? statement.target.name : null,
			() => {
				this.analyzeExpression(statement.value);
			},
		);
	}

	private withAssignmentTarget(name: string | null, fn: () => void): void {
		const prev = this.currentAssignmentTarget;
		this.currentAssignmentTarget = name;
		try {
			fn();
		} finally {
			this.currentAssignmentTarget = prev;
		}
	}

	private analyzeExpression(expr: Expression): void {
		switch (expr.type) {
			case "CallExpression":
				this.analyzeCallExpression(expr);
				break;

			case "MemberExpression":
				this.analyzeMemberExpression(expr);
				break;

			case "BinaryExpression":
				this.analyzeBinaryExpression(expr);
				break;

			case "UnaryExpression":
				this.analyzeExpression(expr.argument);
				break;

			case "TernaryExpression":
				this.analyzeTernaryExpression(expr);
				break;

			case "ArrayExpression":
				for (const element of expr.elements) {
					this.analyzeExpression(element);
				}
				break;

			case "IndexExpression":
				// CW10018: `[]` on a variable declared in a conditional scope
				// - its history series has gaps, so historical values are
				// unreliable. Per OCCURRENCE, anchored at the indexed
				// identifier (probed 2026-06-04, see INV021). Same series-
				// condition gate as CONDITIONAL_SERIES: input-gated arms are
				// silent, loops always count, and the warning keys on the
				// DECLARATION's scope, not the reference's.
				if (
					expr.object.type === "Identifier" &&
					this.isConditionalLocal(expr.object.name)
				) {
					this.addWarning(
						expr.object.line,
						expr.object.column,
						expr.object.name.length,
						`The variable '${expr.object.name}' is declared in local scope, which may not be executed at every update. So, obtaining its historical values may lead to unexpected results`,
						DiagnosticSeverity.Warning,
						"LOCAL_HISTORY",
					);
				}
				this.analyzeExpression(expr.object);
				this.analyzeExpression(expr.index);
				break;

			case "SwitchExpression":
				this.analyzeSwitchExpression(expr);
				break;

			case "Identifier":
				// Track variable usage
				this.usedVariables.add(expr.name);
				break;
			case "Literal":
				this.checkMultilineStringLiteral(expr);
				break;
		}
	}

	private analyzeCallExpression(call: CallExpression): void {
		// Check for series functions called conditionally
		if (this.inConditionalScope) {
			this.checkConditionalSeriesCall(call);
		}

		// Analyze callee first
		this.analyzeExpression(call.callee);

		// Then analyze arguments (this will catch nested calls like ta.sma inside array.set)
		for (const arg of call.arguments) {
			this.analyzeExpression(arg.value);
		}
	}

	private analyzeMemberExpression(expr: MemberExpression): void {
		this.analyzeExpression(expr.object);
	}

	// CW10001: a quoted string literal spanning multiple physical lines is
	// deprecated in v6. TV anchors the warning at COLUMN 1 of the line
	// where the literal opens, regardless of statement indentation or
	// where in the expression the literal sits (probed 2026-06-04, see
	// INV019 / TODO #37). The raw lexeme preserves the source newlines,
	// so spanning is detectable directly.
	private checkMultilineStringLiteral(literal: Literal): void {
		if (typeof literal.value !== "string") return;
		if (!/[\r\n]/.test(literal.raw)) return;
		this.addWarning(
			literal.line,
			1,
			1, // TV's end convention is opaque (see INV019); the diff keys on start
			MULTILINE_STRING_MESSAGE,
			DiagnosticSeverity.Warning,
			"MULTILINE_STRING",
		);
	}

	// CW10003 also covers history-dependent calls executed conditionally by
	// ternary and and/or operations and inside switch arms (po:
	// errors/CW10003; the manual's switch example warns on ta.crossover in
	// an arm). Lazy evaluation decides what is conditional: an and/or's
	// LEFT operand and a ternary's condition always execute; the right
	// operand / branches only sometimes. see TODO #32.

	private analyzeBinaryExpression(expr: BinaryExpression): void {
		this.analyzeExpression(expr.left);
		// The right operand of and/or is ALWAYS conditional - unlike the
		// if/ternary/switch gates, TV warns CW10002 even when the left
		// operand is an input (`input.bool() and ta.crossover(...)` warns;
		// `input.bool() ? ta.rsi(...) : x` does not - probed 2026-06-04,
		// see INV022). INV018's series-condition gate was an
		// over-extrapolation here.
		if (expr.operator === "and" || expr.operator === "or") {
			this.enterConditionalScope("andor");
			this.analyzeExpression(expr.right);
			this.exitConditionalScope();
		} else {
			this.analyzeExpression(expr.right);
		}
	}

	private analyzeTernaryExpression(expr: TernaryExpression): void {
		const conditional = this.isSeriesishExpression(expr.condition);
		const undetermined = this.isUndeterminedGate(expr.condition);
		this.analyzeExpression(expr.condition);
		if (conditional) {
			this.enterConditionalScope("ternary", undetermined);
		} else if (undetermined) {
			this.enterAmbientUndeterminedGate();
		}
		const ternaryContext: ActiveTernaryContext = {
			condition: expr.condition,
			alternate: expr.alternate,
			branch: "consequent",
		};
		this.ternaryContextStack.push(ternaryContext);
		try {
			this.analyzeExpression(expr.consequent);
			ternaryContext.branch = "alternate";
			this.analyzeExpression(expr.alternate);
		} finally {
			this.ternaryContextStack.pop();
			if (conditional) this.exitConditionalScope();
			else if (undetermined) this.exitAmbientUndeterminedGate();
		}
	}

	private analyzeSwitchExpression(expr: SwitchExpression): void {
		// Arms are conditional when the arm selection varies per bar: a
		// series discriminant, or (discriminant-less form) any series arm
		// condition. An input/simple discriminant selects the same arm on
		// every bar - the dominant MA-selector idiom - and TV is silent
		// there (probed; see isSeriesishExpression).
		const conditional = expr.discriminant
			? this.isSeriesishExpression(expr.discriminant)
			: expr.cases.some(
					(c) => c.condition && this.isSeriesishExpression(c.condition),
				);

		if (expr.discriminant) {
			this.analyzeExpression(expr.discriminant);
		}
		for (const [index, switchCase] of expr.cases.entries()) {
			if (switchCase.condition) {
				// The FIRST arm's condition always executes; later
				// conditions only evaluate when earlier ones were false.
				if (index === 0 || !conditional) {
					this.analyzeExpression(switchCase.condition);
				} else {
					this.enterConditionalScope();
					this.analyzeExpression(switchCase.condition);
					this.exitConditionalScope();
				}
			}
			// Arm bodies execute only when their condition matches.
			// `result` is contained in the last statement, so walk
			// `statements` INSTEAD of `result` when present (see SwitchCase).
			if (conditional) {
				this.enterConditionalScope(
					"block",
					expr.discriminant
						? this.isUndeterminedGate(expr.discriminant)
						: false,
				);
			}
			if (switchCase.statements) {
				const statements = switchCase.statements;
				this.withScopeFrame(() => {
					for (const stmt of statements) {
						this.analyzeStatement(stmt);
					}
				});
			} else {
				this.analyzeExpression(switchCase.result);
			}
			if (conditional) this.exitConditionalScope();
		}
	}

	private enterConditionalScope(
		kind: ConditionalScopeKind = "block",
		undetermined = false,
	): void {
		this.conditionalScopeKinds.push(kind);
		this.conditionalGateUndetermined.push(undetermined);
		this.conditionalScopeDepth++;
		this.inConditionalScope = true;
	}

	private exitConditionalScope(): void {
		this.conditionalScopeKinds.pop();
		this.conditionalGateUndetermined.pop();
		this.conditionalScopeDepth--;
		if (this.conditionalScopeDepth === 0) {
			this.inConditionalScope = false;
		}
	}

	private enterAmbientUndeterminedGate(): void {
		this.ambientUndeterminedGateDepth++;
	}

	private exitAmbientUndeterminedGate(): void {
		this.ambientUndeterminedGateDepth--;
	}

	private checkConditionalSeriesCall(call: CallExpression): void {
		// `functionName` is the DISPLAY name in the warning; `histDep` is the
		// detection result. They differ for library/method calls: detection
		// resolves the namespaced/typed receiver, but TV's wording uses the
		// BARE member name (so re-checking the display name would fail to
		// resolve - the receiver context is gone). see INV116 / INV118
		let functionName = "";
		let histDep = false;

		if (call.callee.type === "Identifier") {
			functionName = call.callee.name;
			histDep = this.isHistoryDependentFunction(functionName);
			if (!histDep && this.globalIndexDependentUdfs.has(functionName)) {
				histDep = true;
			}
		} else if (call.callee.type === "MemberExpression") {
			const member = call.callee;
			const full =
				member.object.type === "Identifier"
					? `${member.object.name}.${member.property.name}`
					: "";
			// A namespaced BUILTIN call (`ta.sma`) keeps the full name; a user
			// METHOD (`PH.draw_trendLine`) or LIBRARY member (`col.cust_series`)
			// call uses the BARE member name - both register/resolve under the
			// property, not `receiver.property`.
			if (full && this.isHistoryDependentFunction(full)) {
				histDep = true;
				functionName = FUNCTIONS_BY_NAME.get(full)?.flags?.historyDependent
					? full
					: member.property.name;
			} else if (
				this.historyDependentUdfs.has(member.property.name) ||
				this.globalIndexDependentUdfs.has(member.property.name)
			) {
				histDep = true;
				functionName = member.property.name;
			}
		}

		// Warn only on HISTORY-DEPENDENT calls executed conditionally -
		// TV's CW10003 criterion. The wording follows the innermost
		// conditional context, matching TV's three codes (probed
		// 2026-06-04, see INV018): CW10003 for local blocks, CW10004 for
		// ternary branches, CW10002 for and/or operands.
		// see plan/31 Finding 7 / TODO #32.
		if (histDep) {
			// Immediate-gate rule: suppress when the IMMEDIATE (innermost)
			// governing condition is undetermined. Reading ONLY the top frame
			// is what keeps an outer undetermined gate from silencing a call
			// whose innermost gate is series (P1). see INV120
			if (
				this.conditionalGateUndetermined[
					this.conditionalGateUndetermined.length - 1
				]
			) {
				return;
			}
			if (this.shouldSuppressSiblingSeedConsistencyWarning()) {
				return;
			}
			const kind =
				this.conditionalScopeKinds[this.conditionalScopeKinds.length - 1] ??
				"block";
			const message =
				kind === "andor"
					? `The '${functionName}()' call inside the conditional expression might not execute on every bar, which can cause inconsistent calculations because the function depends on historical results. For consistency, assign the call's result to a global variable and use that variable in the expression instead.`
					: kind === "ternary"
						? `The function '${functionName}' should be called on each calculation for consistency. It is recommended to extract the call from the ternary operator or from the scope`
						: `The function '${functionName}' should be called on each calculation for consistency. It is recommended to extract the call from this scope`;
			this.addWarning(
				call.line,
				call.column,
				functionName.length,
				message,
				DiagnosticSeverity.Warning,
				"CONDITIONAL_SERIES",
			);
		}
	}

	// TV is silent for the SMMA seed idiom under an untyped selector:
	// `if type == ...` / `result := na(w[1]) ? ta.sma(...) : f(w[1])`.
	// It still warns without the outer undetermined gate, and on self-seeds
	// such as `mg := na(mg[1]) ? ta.ema(...) : ...`. see INV129
	private shouldSuppressSiblingSeedConsistencyWarning(): boolean {
		if (!this.hasUndeterminedAncestorGate()) return false;
		const kind =
			this.conditionalScopeKinds[this.conditionalScopeKinds.length - 1];
		if (kind !== "ternary") return false;
		const ternary =
			this.ternaryContextStack[this.ternaryContextStack.length - 1];
		if (ternary?.branch !== "consequent") return false;
		const seed = this.naHistorySeedName(ternary.condition);
		if (!seed) return false;
		if (this.currentAssignmentTarget === seed) return false;
		return this.expressionReadsHistoryOfName(ternary.alternate, seed);
	}

	private hasUndeterminedAncestorGate(): boolean {
		if (this.ambientUndeterminedGateDepth > 0) return true;
		for (let i = 0; i < this.conditionalGateUndetermined.length - 1; i++) {
			if (this.conditionalGateUndetermined[i]) return true;
		}
		return false;
	}

	private naHistorySeedName(expr: Expression): string | null {
		if (
			expr.type !== "CallExpression" ||
			expr.callee.type !== "Identifier" ||
			expr.callee.name !== "na" ||
			expr.arguments.length !== 1
		) {
			return null;
		}
		return this.historyIndexIdentifierName(expr.arguments[0].value);
	}

	private historyIndexIdentifierName(expr: Expression): string | null {
		if (
			expr.type === "IndexExpression" &&
			expr.object.type === "Identifier" &&
			expr.index.type === "Literal" &&
			expr.index.value === 1
		) {
			return expr.object.name;
		}
		return null;
	}

	private expressionReadsHistoryOfName(
		expr: Expression,
		name: string,
	): boolean {
		const indexed = this.historyIndexIdentifierName(expr);
		if (indexed === name) return true;
		switch (expr.type) {
			case "CallExpression":
				return (
					this.expressionReadsHistoryOfName(expr.callee, name) ||
					expr.arguments.some((a) =>
						this.expressionReadsHistoryOfName(a.value, name),
					)
				);
			case "MemberExpression":
				return this.expressionReadsHistoryOfName(expr.object, name);
			case "BinaryExpression":
				return (
					this.expressionReadsHistoryOfName(expr.left, name) ||
					this.expressionReadsHistoryOfName(expr.right, name)
				);
			case "UnaryExpression":
				return this.expressionReadsHistoryOfName(expr.argument, name);
			case "TernaryExpression":
				return (
					this.expressionReadsHistoryOfName(expr.condition, name) ||
					this.expressionReadsHistoryOfName(expr.consequent, name) ||
					this.expressionReadsHistoryOfName(expr.alternate, name)
				);
			case "ArrayExpression":
				return expr.elements.some((e) =>
					this.expressionReadsHistoryOfName(e, name),
				);
			case "IndexExpression":
				return (
					this.expressionReadsHistoryOfName(expr.object, name) ||
					this.expressionReadsHistoryOfName(expr.index, name)
				);
			case "SwitchExpression":
				return (
					(expr.discriminant
						? this.expressionReadsHistoryOfName(expr.discriminant, name)
						: false) ||
					expr.cases.some(
						(c) =>
							(c.condition
								? this.expressionReadsHistoryOfName(c.condition, name)
								: false) || this.expressionReadsHistoryOfName(c.result, name),
					)
				);
			default:
				return false;
		}
	}

	/**
	 * Is `condition` an undetermined gate - one TV does not treat as a
	 * per-bar-varying selector? For current-function params, true iff it
	 * references an untyped param and, with those param names masked out of
	 * seriesVars, is not series. The masking is load-bearing for the
	 * shadowed-global case (`src` in 1477fbef). For user variables TV displays
	 * as "undetermined type", referencing the value in the immediate gate is
	 * enough to suppress CW10003/4 in the branch. Judge only the immediate
	 * condition. see INV120 / INV131
	 */
	private isUndeterminedGate(condition: Expression): boolean {
		if (
			this.undeterminedVars.size > 0 &&
			this.expressionReferencesNames(condition, this.undeterminedVars)
		) {
			return true;
		}
		if (this.currentUntypedParams.size === 0) return false;
		if (!this.expressionReferencesNames(condition, this.currentUntypedParams)) {
			return false;
		}
		// Deliberate transient mutation of shared seriesVars: delete the untyped
		// param names, ask the series oracle, then restore in finally. The series
		// check is synchronous so no other reader observes the gap - this borrows
		// seriesVars rather than cloning it.
		const masked: string[] = [];
		for (const name of this.currentUntypedParams) {
			if (this.seriesVars.delete(name)) masked.push(name);
		}
		try {
			return !this.isSeriesishExpression(condition);
		} finally {
			for (const name of masked) this.seriesVars.add(name);
		}
	}

	private expressionIsUndetermined(expr: Expression): boolean {
		switch (expr.type) {
			case "Identifier":
				return this.undeterminedVars.has(expr.name);
			case "CallExpression":
				return (
					this.callReturnsUndetermined(expr) ||
					this.expressionIsUndetermined(expr.callee) ||
					expr.arguments.some((a) => this.expressionIsUndetermined(a.value))
				);
			case "MemberExpression":
				return this.expressionIsUndetermined(expr.object);
			case "BinaryExpression":
				return (
					this.expressionIsUndetermined(expr.left) ||
					this.expressionIsUndetermined(expr.right)
				);
			case "UnaryExpression":
				return this.expressionIsUndetermined(expr.argument);
			case "TernaryExpression":
				return (
					this.expressionIsUndetermined(expr.condition) ||
					this.expressionIsUndetermined(expr.consequent) ||
					this.expressionIsUndetermined(expr.alternate)
				);
			case "ArrayExpression":
				return expr.elements.some((e) => this.expressionIsUndetermined(e));
			case "IndexExpression":
				return (
					this.expressionIsUndetermined(expr.object) ||
					this.expressionIsUndetermined(expr.index)
				);
			case "SwitchExpression":
				return (
					(expr.discriminant
						? this.expressionIsUndetermined(expr.discriminant)
						: false) ||
					expr.cases.some(
						(c) =>
							(c.condition
								? this.expressionIsUndetermined(c.condition)
								: false) ||
							(c.statements
								? c.statements.some((s) => this.statementIsUndeterminedValue(s))
								: this.expressionIsUndetermined(c.result)),
					)
				);
			case "IfExpression":
				return (
					this.expressionIsUndetermined(expr.condition) ||
					expr.consequent.some((s) => this.statementIsUndeterminedValue(s)) ||
					(expr.alternate
						? expr.alternate.some((s) => this.statementIsUndeterminedValue(s))
						: false)
				);
			default:
				return false;
		}
	}

	private statementIsUndeterminedValue(statement: Statement): boolean {
		switch (statement.type) {
			case "VariableDeclaration":
				return statement.init
					? this.expressionIsUndetermined(statement.init)
					: false;
			case "TupleDeclaration":
				return this.expressionIsUndetermined(statement.init);
			case "ExpressionStatement":
				return this.expressionIsUndetermined(statement.expression);
			case "AssignmentStatement":
				return this.expressionIsUndetermined(statement.value);
			case "ReturnStatement":
				return this.expressionIsUndetermined(statement.value);
			case "IfStatement":
				return (
					this.expressionIsUndetermined(statement.condition) ||
					statement.consequent.some((s) =>
						this.statementIsUndeterminedValue(s),
					) ||
					(statement.alternate
						? statement.alternate.some((s) =>
								this.statementIsUndeterminedValue(s),
							)
						: false)
				);
			case "SequenceStatement":
				return statement.statements.some((s) =>
					this.statementIsUndeterminedValue(s),
				);
			default:
				return false;
		}
	}

	private callReturnsUndetermined(call: CallExpression): boolean {
		if (call.callee.type === "Identifier") {
			return this.udfReturnsUndetermined.has(call.callee.name);
		}
		if (call.callee.type === "MemberExpression") {
			const member = call.callee;
			if (this.udfReturnsUndetermined.has(member.property.name)) {
				return true;
			}
			if (member.object.type === "Identifier") {
				return this.udfReturnsUndetermined.has(
					`${member.object.name}.${member.property.name}`,
				);
			}
		}
		return false;
	}

	private isSeriesishExpressionWithLocalSeries(
		expr: Expression,
		localSeries: Set<string>,
	): boolean {
		if (this.isSeriesishExpression(expr)) return true;
		switch (expr.type) {
			case "Identifier":
				return localSeries.has(expr.name);
			case "CallExpression":
				return expr.arguments.some((a) =>
					this.isSeriesishExpressionWithLocalSeries(a.value, localSeries),
				);
			case "MemberExpression":
				return this.isSeriesishExpressionWithLocalSeries(
					expr.object,
					localSeries,
				);
			case "BinaryExpression":
				return (
					this.isSeriesishExpressionWithLocalSeries(expr.left, localSeries) ||
					this.isSeriesishExpressionWithLocalSeries(expr.right, localSeries)
				);
			case "UnaryExpression":
				return this.isSeriesishExpressionWithLocalSeries(
					expr.argument,
					localSeries,
				);
			case "TernaryExpression":
				return (
					this.isSeriesishExpressionWithLocalSeries(
						expr.condition,
						localSeries,
					) ||
					this.isSeriesishExpressionWithLocalSeries(
						expr.consequent,
						localSeries,
					) ||
					this.isSeriesishExpressionWithLocalSeries(expr.alternate, localSeries)
				);
			case "ArrayExpression":
				return expr.elements.some((e) =>
					this.isSeriesishExpressionWithLocalSeries(e, localSeries),
				);
			case "IndexExpression":
				return true;
			case "SwitchExpression":
				return (
					(expr.discriminant
						? this.isSeriesishExpressionWithLocalSeries(
								expr.discriminant,
								localSeries,
							)
						: false) ||
					expr.cases.some(
						(c) =>
							(c.condition
								? this.isSeriesishExpressionWithLocalSeries(
										c.condition,
										localSeries,
									)
								: false) ||
							this.isSeriesishExpressionWithLocalSeries(c.result, localSeries),
					)
				);
			case "IfExpression":
				return (
					this.isSeriesishExpressionWithLocalSeries(
						expr.condition,
						localSeries,
					) ||
					this.statementListTailIsSeries(expr.consequent, localSeries) ||
					(expr.alternate
						? this.statementListTailIsSeries(expr.alternate, localSeries)
						: false)
				);
			default:
				return false;
		}
	}

	private statementListTailIsSeries(
		statements: Statement[],
		localSeries: Set<string>,
	): boolean {
		const tail = statements[statements.length - 1];
		if (!tail) return false;
		if (tail.type === "ExpressionStatement") {
			return this.isSeriesishExpressionWithLocalSeries(
				tail.expression,
				localSeries,
			);
		}
		if (tail.type === "ReturnStatement") {
			return this.isSeriesishExpressionWithLocalSeries(tail.value, localSeries);
		}
		if (tail.type === "IfStatement") {
			return (
				this.statementListTailIsSeries(tail.consequent, localSeries) ||
				(tail.alternate
					? this.statementListTailIsSeries(tail.alternate, localSeries)
					: false)
			);
		}
		if (tail.type === "SequenceStatement") {
			return this.statementListTailIsSeries(tail.statements, localSeries);
		}
		return false;
	}

	/**
	 * Is the expression series-qualified (per-bar-varying)? TV only emits
	 * the CW10002/3/4 warnings when the GOVERNING CONDITION is a series -
	 * an input/simple/const condition selects the same branch on every
	 * bar, so the local call's history stays consistent. Probed
	 * 2026-06-04 (INV018 probes 6-9): `if input.bool` and `switch
	 * <input string>` are silent; `if (b = close > open)` and series
	 * discriminants warn - TV tracks the qualifier through variable
	 * assignments, which `seriesVars` mirrors. Conservative direction:
	 * anything unprovable (UDT fields, unknown calls) counts as NOT
	 * series, trading FNs for zero FPs on the input-selector idiom.
	 */
	private isSeriesishExpression(expr: Expression): boolean {
		switch (expr.type) {
			case "Identifier":
				return (
					this.seriesVars.has(expr.name) ||
					(VARIABLES_BY_NAME.get(expr.name)?.type ?? "").startsWith("series")
				);
			case "MemberExpression": {
				if (expr.object.type === "Identifier") {
					const full = `${expr.object.name}.${expr.property.name}`;
					if ((VARIABLES_BY_NAME.get(full)?.type ?? "").startsWith("series")) {
						return true;
					}
				}
				return false;
			}
			case "IndexExpression":
				// The [] history operator yields a series
				return true;
			case "CallExpression": {
				let name = "";
				if (expr.callee.type === "Identifier") {
					name = expr.callee.name;
				} else if (
					expr.callee.type === "MemberExpression" &&
					expr.callee.object.type === "Identifier"
				) {
					name = `${expr.callee.object.name}.${expr.callee.property.name}`;
				}
				if (!name) return false;
				if (this.isHistoryDependentFunction(name)) return true;
				if ((FUNCTIONS_BY_NAME.get(name)?.returns ?? "").startsWith("series")) {
					return true;
				}
				// Series is contagious through arguments. A function's MINIMAL
				// documented overload often reads simple/const (`na(x) -> simple
				// bool`, `nz`, `math.*`), but TV widens the result qualifier to
				// the max of the argument qualifiers - so `na(mg[1])` is a series
				// bool and governs a per-bar branch. Without this, the McGinley
				// idiom `mg := na(mg[1]) ? ta.ema(...) : ...` looked
				// input-conditioned and we skipped the CW10004 warning. A const/
				// input/simple arg stays non-series, so the input-selector idiom
				// the conservative gate protects is untouched. see INV114
				return expr.arguments.some((a) => this.isSeriesishExpression(a.value));
			}
			case "BinaryExpression":
				return (
					this.isSeriesishExpression(expr.left) ||
					this.isSeriesishExpression(expr.right)
				);
			case "UnaryExpression":
				return this.isSeriesishExpression(expr.argument);
			case "TernaryExpression":
				return (
					this.isSeriesishExpression(expr.condition) ||
					this.isSeriesishExpression(expr.consequent) ||
					this.isSeriesishExpression(expr.alternate)
				);
			case "ArrayExpression":
				return expr.elements.some((e) => this.isSeriesishExpression(e));
			case "SwitchExpression":
				return (
					(expr.discriminant
						? this.isSeriesishExpression(expr.discriminant)
						: false) ||
					expr.cases.some(
						(c) =>
							(c.condition ? this.isSeriesishExpression(c.condition) : false) ||
							this.isSeriesishExpression(c.result),
					)
				);
			default:
				return false;
		}
	}

	/**
	 * A function is history-dependent when it relies on values from PAST
	 * executions of its own scope - the `[]` operator or internal state -
	 * so a conditional/iterative call builds an inconsistent time series
	 * (po: errors/CW10003). Built-ins carry `flags.historyDependent` from
	 * pine-data (the ta.* namespace); user functions/methods are detected
	 * by scanning their bodies (see scanStatementsForHistoryDependence).
	 * Side-effect functions (label.new) and stateless ones (math.max) are
	 * deliberately not flagged - the same page exempts them. The former
	 * return-type/namespace net (any `series` return, ta./request./str.)
	 * flagged canonical conditional drawing and string formatting.
	 */
	private isHistoryDependentFunction(functionName: string): boolean {
		const func = FUNCTIONS_BY_NAME.get(functionName);
		if (func?.flags?.historyDependent) {
			return true;
		}
		if (this.historyDependentUdfs.has(functionName)) {
			return true;
		}
		// `recv.member()` where `recv` is either an import alias (`col.cust_series`)
		// or a LIBRARY-TYPED local (`zigzag.calculate`, zigzag a `zg.Zigzag`):
		// resolve to the library's history-dependent export set. see INV118
		const dot = functionName.indexOf(".");
		if (dot > 0) {
			const recv = functionName.slice(0, dot);
			const member = functionName.slice(dot + 1);
			const alias = this.localLibraryVar.get(recv) ?? recv;
			const libPath = this.importAliasToPath.get(alias);
			if (
				libPath &&
				LIBRARY_HISTORY_DEPENDENT_BY_PATH.get(libPath)?.has(member)
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * The per-element series-ness of a function's returned TUPLE, or null if its
	 * tail is not a tuple literal. The return value is the body's tail
	 * statement: an expression/return statement yields its expression; an
	 * expression-`if` recurses into the branch that produces a tuple. Only the
	 * direct `[a, b, ...]` (ArrayExpression) shape is read - enough for the
	 * `[..] = getStandardOHLC()` idiom. see INV117
	 */
	private tailTupleSeries(stmt: Statement | undefined): boolean[] | null {
		if (!stmt) return null;
		const fromArray = (e: Expression): boolean[] | null =>
			e.type === "ArrayExpression"
				? e.elements.map((el) => this.isSeriesishExpression(el))
				: null;
		if (stmt.type === "ExpressionStatement") return fromArray(stmt.expression);
		if (stmt.type === "ReturnStatement") return fromArray(stmt.value);
		if (stmt.type === "IfStatement") {
			return (
				this.tailTupleSeries(stmt.consequent[stmt.consequent.length - 1]) ??
				(stmt.alternate
					? this.tailTupleSeries(stmt.alternate[stmt.alternate.length - 1])
					: null)
			);
		}
		return null;
	}

	private collectVariableDeclarations(ast: Program): void {
		for (const statement of ast.body) {
			this.collectDeclarationsInStatement(statement);
		}
	}

	private collectGlobalSeriesVars(body: Statement[]): void {
		for (const statement of body) {
			if (statement.type === "VariableDeclaration" && statement.name) {
				if (this.seriesVars.has(statement.name)) {
					this.globalSeriesVars.add(statement.name);
				}
			} else if (
				statement.type === "AssignmentStatement" &&
				statement.target.type === "Identifier"
			) {
				if (this.seriesVars.has(statement.target.name)) {
					this.globalSeriesVars.add(statement.target.name);
				}
			} else if (statement.type === "TupleDeclaration") {
				for (const name of statement.names) {
					if (name && this.seriesVars.has(name)) {
						this.globalSeriesVars.add(name);
					}
				}
			}
		}
	}

	private classifyGlobalIndexUdfs(body: Statement[]): void {
		for (const statement of body) {
			if (
				(statement.type === "FunctionDeclaration" ||
					statement.type === "MethodDeclaration") &&
				statement.name &&
				!this.historyDependentUdfs.has(statement.name) &&
				this.scanStatementsForGlobalIndex(
					statement.body,
					new Set(
						statement.params
							.map((param) => param.name)
							.filter((name): name is string => !!name),
					),
				)
			) {
				this.globalIndexDependentUdfs.add(statement.name);
			}
		}
	}

	private collectDeclarationsInStatement(
		statement: Statement,
		inSeriesConditional = false,
		inUndeterminedConditional = false,
	): void {
		switch (statement.type) {
			case "VariableDeclaration":
				if (statement.name) {
					this.declaredVariables.set(statement.name, {
						line: statement.line,
						column: statement.column,
					});
					if (
						inUndeterminedConditional ||
						(statement.init && this.expressionIsUndetermined(statement.init))
					) {
						this.undeterminedVars.add(statement.name);
					}
					if (statement.init && this.isSeriesishExpression(statement.init)) {
						this.seriesVars.add(statement.name);
					}
				}
				break;

			case "AssignmentStatement":
				// `v := <series expr>` makes v series-qualified - and so does a
				// `v := <const>` reassignment performed under a SERIES-gated
				// branch: the value SELECTED depends on a per-bar condition, so
				// v carries history. TV warns on a `state == 1` discriminant
				// gating ta.* once `state` was set inside `if <series>` (probed
				// 2026-06-25 - a `var` reassigned UNCONDITIONALLY to a const
				// stays const and is silent, so the gate must be the conditional
				// scope, not the `var` keyword). see INV115
				if (
					statement.target.type === "Identifier" &&
					(inSeriesConditional || this.isSeriesishExpression(statement.value))
				) {
					this.seriesVars.add(statement.target.name);
				}
				if (
					statement.target.type === "Identifier" &&
					(inUndeterminedConditional ||
						this.expressionIsUndetermined(statement.value))
				) {
					this.undeterminedVars.add(statement.target.name);
				}
				break;

			case "TupleDeclaration": {
				// [a, b, c] = f(...) - every tuple member is a declaration
				for (const name of statement.names) {
					if (name) {
						this.declaredVariables.set(name, {
							line: statement.line,
							column: statement.column,
						});
						if (
							inUndeterminedConditional ||
							this.expressionIsUndetermined(statement.init)
						) {
							this.undeterminedVars.add(name);
						}
					}
				}
				// Series-type the members from a UDF tuple return, so a later
				// `if a > b` is seen as series-conditional. see INV117
				const init = statement.init;
				const calleeName =
					init?.type === "CallExpression" && init.callee.type === "Identifier"
						? init.callee.name
						: undefined;
				const elemSeries = calleeName
					? this.udfReturnTupleSeries.get(calleeName)
					: undefined;
				if (elemSeries) {
					statement.names.forEach((name, i) => {
						if (name && elemSeries[i]) this.seriesVars.add(name);
					});
				}
				break;
			}

			case "FunctionDeclaration":
			case "MethodDeclaration":
				// Collect function parameters. FunctionParam carries no position of
				// its own; point at the declaring function instead.
				for (const param of statement.params) {
					if (param.name) {
						this.declaredVariables.set(param.name, {
							line: statement.line,
							column: statement.column,
						});
					}
				}
				// Record the series-ness of each element of a returned TUPLE, so
				// a destructure of this function's result can series-type its
				// members (the condition `if stClose > stOpen` case). see INV117
				{
					const tail = statement.body[statement.body.length - 1];
					const elemSeries = this.tailTupleSeries(tail);
					if (elemSeries) {
						this.udfReturnTupleSeries.set(statement.name, elemSeries);
					}
					if (this.tailIsSeries(tail)) {
						this.udfReturnsSeries.add(statement.name);
					}
					const untypedParams = new Set(
						statement.params
							.filter((p) => p.name && !p.typeAnnotation)
							.map((p) => p.name),
					);
					if (this.tailDependsOnDerivedUntyped(statement.body, untypedParams)) {
						this.udfReturnsUndetermined.add(statement.name);
					}
				}
				// Record history-dependent user functions for the
				// CONDITIONAL_SERIES check, seeding the scope with the params
				// so `src[1]` qualifies but `close[1]` does not. see TODO #32.
				// UNTYPED params are "undetermined" (INV114): a local reassigned
				// under a branch they gate becomes undetermined, and indexing it
				// must NOT count (draw_ob, INV116) - so pass them through.
				if (
					this.scanStatementsForHistoryDependence(
						statement.body,
						new Set(statement.params.map((p) => p.name).filter((n) => !!n)),
						new Set(
							statement.params
								.filter((p) => p.name && !p.typeAnnotation)
								.map((p) => p.name),
						),
					)
				) {
					this.historyDependentUdfs.add(statement.name);
				}
				// Collect the body with params marked series, so body locals
				// initialized from params land in seriesVars correctly -
				// then skip the shared recursion below (it would re-walk the
				// body without the param context).
				this.withSeriesParams(statement.params, () => {
					for (const child of statement.body) {
						this.collectDeclarationsInStatement(child);
					}
				});
				return;

			// for/for-in iterator names are deliberately NOT collected: an
			// unused iterator is idiomatic (`for [i, v] in` using only `v`),
			// so flagging it would be noise. see plan/31 Finding 3.
		}

		// Recurse into child statements - shared across all block-carrying
		// statement variants so a new variant can't silently go unwalked.
		// Propagate series-conditional context so a `:=` under a series-gated
		// if/else (incl. lowered `else if`) or while marks its target series.
		// A for/for-in body is deterministic per bar, so it does NOT induce
		// series on a const reassignment (only a series VALUE does). see INV115
		const childConditional =
			inSeriesConditional ||
			((statement.type === "IfStatement" ||
				statement.type === "WhileStatement") &&
				this.isSeriesishExpression(statement.condition));
		const childUndeterminedConditional =
			inUndeterminedConditional ||
			((statement.type === "IfStatement" ||
				statement.type === "WhileStatement") &&
				this.isUndeterminedGate(statement.condition));
		for (const child of this.childStatements(statement)) {
			this.collectDeclarationsInStatement(
				child,
				childConditional,
				childUndeterminedConditional,
			);
		}
	}

	/**
	 * Scan a statement block for history-dependence: a use of the `[]`
	 * operator on the function's OWN scope values (params/locals), or a
	 * call to a history-dependent function (built-in flag or an
	 * already-recorded UDF). Mirrors TV's CW10003 criterion for user
	 * functions - the page's own example is
	 * `previousValue(source) => source[1]`. Indexing a GLOBAL series
	 * (`close[1]`) does NOT qualify: a global's time series is committed
	 * every bar regardless of when the call executes, so its history is
	 * consistent (probed 2026-06-04, INV018 probe 4). `scopeNames` grows
	 * with local declarations as the scan walks. see TODO #32 / #36.
	 *
	 * NOTE: TV's translate_light endpoint does not emit CW10003 for user
	 * functions at all - it stays silent even on the manual's own UDF
	 * example (INV018 probe 5). The manual documents the warning, so we
	 * keep it: TV-endpoint silence is evidence, not authority.
	 */
	private scanStatementsForHistoryDependence(
		statements: Statement[],
		scopeNames: Set<string>,
		untypedParams: Set<string>,
		underUndetermined = false,
	): boolean {
		for (const statement of statements) {
			// A local assigned (declared OR reassigned) inside an undetermined
			// branch, or from a value that references an untyped param, becomes
			// undetermined. Indexing that local does NOT count as own-scope
			// history. Params indexed directly are unaffected. see INV116 / INV130
			if (statement.type === "VariableDeclaration" && statement.name) {
				if (
					underUndetermined ||
					(statement.init &&
						this.isUndeterminedLocalValue(statement.init, untypedParams))
				) {
					// A local derived from an untyped param is itself
					// undetermined, so indexing it is not UDF history. see INV130
					scopeNames.delete(statement.name);
				} else {
					scopeNames.add(statement.name);
				}
			} else if (statement.type === "TupleDeclaration") {
				for (const n of statement.names) {
					if (underUndetermined) scopeNames.delete(n);
					else scopeNames.add(n);
				}
			} else if (
				statement.type === "AssignmentStatement" &&
				statement.target.type === "Identifier" &&
				(underUndetermined ||
					this.isUndeterminedLocalValue(statement.value, untypedParams))
			) {
				scopeNames.delete(statement.target.name);
			}
			for (const expr of this.statementExpressions(statement)) {
				if (this.scanExpressionForHistoryDependence(expr, scopeNames)) {
					return true;
				}
			}
			const childUndetermined =
				underUndetermined ||
				((statement.type === "IfStatement" ||
					statement.type === "WhileStatement") &&
					this.expressionReferencesNames(statement.condition, untypedParams) &&
					!this.isSeriesishExpression(statement.condition));
			if (
				this.scanStatementsForHistoryDependence(
					this.childStatements(statement),
					scopeNames,
					untypedParams,
					childUndetermined,
				)
			) {
				return true;
			}
		}
		return false;
	}

	private isUndeterminedLocalValue(
		expr: Expression,
		untypedParams: Set<string>,
	): boolean {
		return (
			untypedParams.size > 0 &&
			this.expressionReferencesNames(expr, untypedParams)
		);
	}

	private scanStatementsForGlobalIndex(
		statements: Statement[],
		scopeNames: Set<string>,
	): boolean {
		for (const statement of statements) {
			if (statement.type === "VariableDeclaration" && statement.name) {
				scopeNames.add(statement.name);
			} else if (statement.type === "TupleDeclaration") {
				for (const name of statement.names) {
					if (name) scopeNames.add(name);
				}
			}
			for (const expr of this.statementExpressions(statement)) {
				if (this.exprIndexesGlobalSeries(expr, scopeNames)) {
					return true;
				}
			}
			if (
				this.scanStatementsForGlobalIndex(
					this.childStatements(statement),
					scopeNames,
				)
			) {
				return true;
			}
		}
		return false;
	}

	private exprIndexesGlobalSeries(
		expr: Expression,
		scopeNames: Set<string>,
	): boolean {
		switch (expr.type) {
			case "IndexExpression":
				if (
					expr.object.type === "Identifier" &&
					this.globalSeriesVars.has(expr.object.name) &&
					!scopeNames.has(expr.object.name)
				) {
					return true;
				}
				return (
					this.exprIndexesGlobalSeries(expr.object, scopeNames) ||
					this.exprIndexesGlobalSeries(expr.index, scopeNames)
				);
			case "CallExpression":
				return (
					this.exprIndexesGlobalSeries(expr.callee, scopeNames) ||
					expr.arguments.some((arg) =>
						this.exprIndexesGlobalSeries(arg.value, scopeNames),
					)
				);
			case "MemberExpression":
				return this.exprIndexesGlobalSeries(expr.object, scopeNames);
			case "BinaryExpression":
				return (
					this.exprIndexesGlobalSeries(expr.left, scopeNames) ||
					this.exprIndexesGlobalSeries(expr.right, scopeNames)
				);
			case "UnaryExpression":
				return this.exprIndexesGlobalSeries(expr.argument, scopeNames);
			case "TernaryExpression":
				return (
					this.exprIndexesGlobalSeries(expr.condition, scopeNames) ||
					this.exprIndexesGlobalSeries(expr.consequent, scopeNames) ||
					this.exprIndexesGlobalSeries(expr.alternate, scopeNames)
				);
			case "ArrayExpression":
				return expr.elements.some((element) =>
					this.exprIndexesGlobalSeries(element, scopeNames),
				);
			case "SwitchExpression":
				return (
					(expr.discriminant
						? this.exprIndexesGlobalSeries(expr.discriminant, scopeNames)
						: false) ||
					expr.cases.some(
						(c) =>
							(c.condition
								? this.exprIndexesGlobalSeries(c.condition, scopeNames)
								: false) ||
							(c.statements
								? this.scanStatementsForGlobalIndex(c.statements, scopeNames)
								: this.exprIndexesGlobalSeries(c.result, scopeNames)),
					)
				);
			default:
				return false;
		}
	}

	/** Does the expression reference any of the given names? */
	private expressionReferencesNames(
		expr: Expression,
		names: Set<string>,
	): boolean {
		switch (expr.type) {
			case "Identifier":
				return names.has(expr.name);
			case "CallExpression":
				return (
					this.expressionReferencesNames(expr.callee, names) ||
					expr.arguments.some((a) =>
						this.expressionReferencesNames(a.value, names),
					)
				);
			case "MemberExpression":
				return this.expressionReferencesNames(expr.object, names);
			case "BinaryExpression":
				return (
					this.expressionReferencesNames(expr.left, names) ||
					this.expressionReferencesNames(expr.right, names)
				);
			case "UnaryExpression":
				return this.expressionReferencesNames(expr.argument, names);
			case "TernaryExpression":
				return (
					this.expressionReferencesNames(expr.condition, names) ||
					this.expressionReferencesNames(expr.consequent, names) ||
					this.expressionReferencesNames(expr.alternate, names)
				);
			case "ArrayExpression":
				return expr.elements.some((e) =>
					this.expressionReferencesNames(e, names),
				);
			case "IndexExpression":
				return (
					this.expressionReferencesNames(expr.object, names) ||
					this.expressionReferencesNames(expr.index, names)
				);
			case "SwitchExpression":
				return (
					(expr.discriminant
						? this.expressionReferencesNames(expr.discriminant, names)
						: false) ||
					expr.cases.some(
						(c) =>
							(c.condition
								? this.expressionReferencesNames(c.condition, names)
								: false) ||
							(c.statements
								? c.statements.some((s) =>
										this.statementReferencesNames(s, names),
									)
								: this.expressionReferencesNames(c.result, names)),
					)
				);
			case "IfExpression":
				return (
					this.expressionReferencesNames(expr.condition, names) ||
					expr.consequent.some((s) =>
						this.statementReferencesNames(s, names),
					) ||
					(expr.alternate
						? expr.alternate.some((s) =>
								this.statementReferencesNames(s, names),
							)
						: false)
				);
			default:
				return false;
		}
	}

	private statementReferencesNames(
		statement: Statement,
		names: Set<string>,
	): boolean {
		if (
			statement.type === "FunctionDeclaration" ||
			statement.type === "MethodDeclaration"
		) {
			return false;
		}
		return (
			this.statementExpressions(statement).some((expr) =>
				this.expressionReferencesNames(expr, names),
			) ||
			this.childStatements(statement).some((child) =>
				this.statementReferencesNames(child, names),
			)
		);
	}

	/** Enumerate a statement's direct child expressions. */
	private statementExpressions(statement: Statement): Expression[] {
		switch (statement.type) {
			case "VariableDeclaration":
				return statement.init ? [statement.init] : [];
			case "TupleDeclaration":
				return [statement.init];
			case "ExpressionStatement":
				return [statement.expression];
			case "AssignmentStatement":
				return [statement.target, statement.value];
			case "ReturnStatement":
				return [statement.value];
			case "IfStatement":
				return [statement.condition];
			case "WhileStatement":
				return [statement.condition];
			case "ForStatement":
				return [
					statement.from,
					statement.to,
					...(statement.step ? [statement.step] : []),
				];
			case "ForInStatement":
				return [statement.collection];
			default:
				return [];
		}
	}

	private scanExpressionForHistoryDependence(
		expr: Expression,
		scopeNames: Set<string>,
	): boolean {
		switch (expr.type) {
			case "IndexExpression":
				// The `[]` history-referencing operator counts only when it
				// indexes the function's own scope values (params/locals) -
				// a global's history is consistent regardless of when the
				// call executes. see the scanStatements doc above.
				return (
					this.expressionReferencesNames(expr.object, scopeNames) ||
					this.scanExpressionForHistoryDependence(expr.object, scopeNames) ||
					this.scanExpressionForHistoryDependence(expr.index, scopeNames)
				);
			case "CallExpression": {
				let name = "";
				if (expr.callee.type === "Identifier") {
					name = expr.callee.name;
				} else if (
					expr.callee.type === "MemberExpression" &&
					expr.callee.object.type === "Identifier"
				) {
					name = `${expr.callee.object.name}.${expr.callee.property.name}`;
				}
				if (name && this.isHistoryDependentFunction(name)) {
					return true;
				}
				// A method call `recv.m()` registers under the BARE method name,
				// so transitive history-dependence through a user method needs the
				// bare-name lookup too (`scan` -> `this.getZigzagAndPattern(...)`).
				// see INV118
				if (
					expr.callee.type === "MemberExpression" &&
					this.historyDependentUdfs.has(expr.callee.property.name)
				) {
					return true;
				}
				return expr.arguments.some((a) =>
					this.scanExpressionForHistoryDependence(a.value, scopeNames),
				);
			}
			case "MemberExpression":
				return this.scanExpressionForHistoryDependence(expr.object, scopeNames);
			case "BinaryExpression":
				return (
					this.scanExpressionForHistoryDependence(expr.left, scopeNames) ||
					this.scanExpressionForHistoryDependence(expr.right, scopeNames)
				);
			case "UnaryExpression":
				return this.scanExpressionForHistoryDependence(
					expr.argument,
					scopeNames,
				);
			case "TernaryExpression":
				return (
					this.scanExpressionForHistoryDependence(expr.condition, scopeNames) ||
					this.scanExpressionForHistoryDependence(
						expr.consequent,
						scopeNames,
					) ||
					this.scanExpressionForHistoryDependence(expr.alternate, scopeNames)
				);
			case "ArrayExpression":
				return expr.elements.some((e) =>
					this.scanExpressionForHistoryDependence(e, scopeNames),
				);
			case "SwitchExpression":
				return (
					(expr.discriminant
						? this.scanExpressionForHistoryDependence(
								expr.discriminant,
								scopeNames,
							)
						: false) ||
					expr.cases.some(
						(c) =>
							(c.condition
								? this.scanExpressionForHistoryDependence(
										c.condition,
										scopeNames,
									)
								: false) ||
							(c.statements
								? this.scanStatementsForHistoryDependence(
										c.statements,
										scopeNames,
										// switch-arm statement blocks carry no param context
										// here; no undetermined-gate tracking (conservative).
										new Set(),
									)
								: this.scanExpressionForHistoryDependence(
										c.result,
										scopeNames,
									)),
					)
				);
			default:
				return false;
		}
	}

	/**
	 * Enumerate a statement's direct child statements. The single place that
	 * knows which Statement variants carry statement blocks. The collect pass
	 * recurses via this list; analyzeStatement keeps per-type handlers because
	 * it also manages conditional-scope state, but its case list must cover
	 * every variant named here. see plan/31 Finding 3.
	 */
	private childStatements(statement: Statement): Statement[] {
		switch (statement.type) {
			case "FunctionDeclaration":
			case "MethodDeclaration":
			case "ForStatement":
			case "ForInStatement":
			case "WhileStatement":
				return statement.body;
			case "IfStatement":
				return [...statement.consequent, ...(statement.alternate ?? [])];
			case "SequenceStatement":
				return statement.statements;
			default:
				return [];
		}
	}

	private checkUnusedVariables(): void {
		for (const [variableName, pos] of this.declaredVariables) {
			if (!this.usedVariables.has(variableName)) {
				// Skip common variables that are often used for plotting or external reference
				if (!this.isCommonlyUsedVariable(variableName)) {
					this.addWarning(
						pos.line,
						pos.column,
						variableName.length,
						`Variable '${variableName}' is declared but never used`,
						DiagnosticSeverity.Warning,
						"UNUSED_VARIABLE",
					);
				}
			}
		}
	}

	/**
	 * Check if a variable name is commonly used in Pine Script.
	 *
	 * NOTE: This list is intentionally hardcoded (not from pine-data) because:
	 * 1. These are UX heuristics for "unused variable" warnings, not API data
	 * 2. Common variable naming patterns are not in TradingView docs
	 * 3. These reduce noise from false positive "unused" warnings on plot variables
	 *
	 * The list includes common indicator names (ma, rsi, macd), color variables,
	 * boolean flags, and input parameter names that may appear unused but are
	 * actually used by plots or external references.
	 */
	private isCommonlyUsedVariable(name: string): boolean {
		const commonVariables = new Set([
			// Common plot variables
			"ma",
			"sma",
			"ema",
			"wma",
			"rsi",
			"macd",
			"bb",
			"atr",
			"cci",
			"stoch",
			// Common color variables
			"color",
			"col",
			"c",
			"bullish",
			"bearish",
			"up",
			"down",
			"buy",
			"sell",
			// Common boolean variables
			"show",
			"display",
			"plot",
			"draw",
			"enable",
			"disable",
			// Common input variables (might be used externally)
			"src",
			"source",
			"len",
			"length",
			"period",
			"mult",
			"multiplier",
			// Special Pine Script variables
			"close",
			"open",
			"high",
			"low",
			"volume",
			"time",
			"bar_index",
		]);

		return commonVariables.has(name.toLowerCase());
	}

	private addWarning(
		line: number,
		column: number,
		length: number,
		message: string,
		severity: DiagnosticSeverity,
		rule: string,
	): void {
		this.warnings.push({
			line,
			column,
			length,
			message,
			severity,
			rule,
		});
	}
}
