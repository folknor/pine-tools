// Semantic Analyzer for Pine Script - Detects code quality issues and best practices violations

import { FUNCTIONS_BY_NAME } from "../../../../pine-data/v6";
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
	MemberExpression,
	MethodDeclaration,
	Program,
	Statement,
	SwitchExpression,
	TernaryExpression,
	VariableDeclaration,
	WhileStatement,
} from "./ast";

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
	// Innermost-first record of WHY we are in conditional scope - drives
	// the context-specific CONDITIONAL_SERIES wording (TV's CW10002/3/4).
	private conditionalScopeKinds: ConditionalScopeKind[] = [];

	analyze(ast: Program): SemanticWarning[] {
		this.warnings = [];
		this.inConditionalScope = false;
		this.conditionalScopeDepth = 0;
		this.declaredVariables.clear();
		this.usedVariables.clear();
		this.historyDependentUdfs.clear();
		this.conditionalScopeKinds = [];

		// First pass: collect all variable declarations
		this.collectVariableDeclarations(ast);

		// Second pass: analyze statements and track usage
		for (const statement of ast.body) {
			this.analyzeStatement(statement);
		}

		// Third pass: check for unused variables
		this.checkUnusedVariables();

		return this.warnings;
	}

	private analyzeStatement(statement: Statement): void {
		switch (statement.type) {
			case "VariableDeclaration":
				this.analyzeVariableDeclaration(statement);
				break;

			case "TupleDeclaration":
				// [a, b, c] = f(...) - the RHS is a normal expression
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
		// Check for unused variables will be handled at the symbol table level
		// Just analyze the initialization expression
		if (declaration.init) {
			this.analyzeExpression(declaration.init);
		}
	}

	private analyzeFunctionDeclaration(
		declaration: FunctionDeclaration | MethodDeclaration,
	): void {
		// Analyze function/method body
		for (const statement of declaration.body) {
			this.analyzeStatement(statement);
		}
	}

	private analyzeIfStatement(statement: IfStatement): void {
		// Enter conditional scope
		this.enterConditionalScope();

		// Analyze condition
		this.analyzeExpression(statement.condition);

		// Analyze consequent (then block)
		for (const stmt of statement.consequent) {
			this.analyzeStatement(stmt);
		}

		// Exit conditional scope for consequent
		this.exitConditionalScope();

		// Analyze alternate (else block) if present
		if (statement.alternate) {
			this.enterConditionalScope();
			for (const stmt of statement.alternate) {
				this.analyzeStatement(stmt);
			}
			this.exitConditionalScope();
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

		// Analyze loop body
		for (const stmt of statement.body) {
			this.analyzeStatement(stmt);
		}

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

		// Analyze loop body
		for (const stmt of statement.body) {
			this.analyzeStatement(stmt);
		}

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
		this.analyzeExpression(statement.value);
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
				// No further analysis needed for literals
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

	// CW10003 also covers history-dependent calls executed conditionally by
	// ternary and and/or operations and inside switch arms (po:
	// errors/CW10003; the manual's switch example warns on ta.crossover in
	// an arm). Lazy evaluation decides what is conditional: an and/or's
	// LEFT operand and a ternary's condition always execute; the right
	// operand / branches only sometimes. see TODO #32.

	private analyzeBinaryExpression(expr: BinaryExpression): void {
		this.analyzeExpression(expr.left);
		if (expr.operator === "and" || expr.operator === "or") {
			this.enterConditionalScope("andor");
			this.analyzeExpression(expr.right);
			this.exitConditionalScope();
		} else {
			this.analyzeExpression(expr.right);
		}
	}

	private analyzeTernaryExpression(expr: TernaryExpression): void {
		this.analyzeExpression(expr.condition);
		this.enterConditionalScope("ternary");
		this.analyzeExpression(expr.consequent);
		this.analyzeExpression(expr.alternate);
		this.exitConditionalScope();
	}

	private analyzeSwitchExpression(expr: SwitchExpression): void {
		if (expr.discriminant) {
			this.analyzeExpression(expr.discriminant);
		}
		for (const [index, switchCase] of expr.cases.entries()) {
			if (switchCase.condition) {
				// The FIRST arm's condition always executes; later
				// conditions only evaluate when earlier ones were false.
				if (index === 0) {
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
			this.enterConditionalScope();
			if (switchCase.statements) {
				for (const stmt of switchCase.statements) {
					this.analyzeStatement(stmt);
				}
			} else {
				this.analyzeExpression(switchCase.result);
			}
			this.exitConditionalScope();
		}
	}

	private enterConditionalScope(kind: ConditionalScopeKind = "block"): void {
		this.conditionalScopeKinds.push(kind);
		this.conditionalScopeDepth++;
		this.inConditionalScope = true;
	}

	private exitConditionalScope(): void {
		this.conditionalScopeKinds.pop();
		this.conditionalScopeDepth--;
		if (this.conditionalScopeDepth === 0) {
			this.inConditionalScope = false;
		}
	}

	private checkConditionalSeriesCall(call: CallExpression): void {
		let functionName = "";

		if (call.callee.type === "Identifier") {
			functionName = call.callee.name;
		} else if (call.callee.type === "MemberExpression") {
			const member = call.callee;
			if (member.object.type === "Identifier") {
				functionName = `${member.object.name}.${member.property.name}`;
			}
		}

		// Warn only on HISTORY-DEPENDENT calls executed conditionally -
		// TV's CW10003 criterion. The wording follows the innermost
		// conditional context, matching TV's three codes (probed
		// 2026-06-04, see INV018): CW10003 for local blocks, CW10004 for
		// ternary branches, CW10002 for and/or operands.
		// see plan/31 Finding 7 / TODO #32.
		if (this.isHistoryDependentFunction(functionName)) {
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
		return this.historyDependentUdfs.has(functionName);
	}

	private collectVariableDeclarations(ast: Program): void {
		for (const statement of ast.body) {
			this.collectDeclarationsInStatement(statement);
		}
	}

	private collectDeclarationsInStatement(statement: Statement): void {
		switch (statement.type) {
			case "VariableDeclaration":
				if (statement.name) {
					this.declaredVariables.set(statement.name, {
						line: statement.line,
						column: statement.column,
					});
				}
				break;

			case "TupleDeclaration":
				// [a, b, c] = f(...) - every tuple member is a declaration
				for (const name of statement.names) {
					if (name) {
						this.declaredVariables.set(name, {
							line: statement.line,
							column: statement.column,
						});
					}
				}
				break;

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
				// Record history-dependent user functions for the
				// CONDITIONAL_SERIES check. see TODO #32.
				if (this.scanStatementsForHistoryDependence(statement.body)) {
					this.historyDependentUdfs.add(statement.name);
				}
				break;

			// for/for-in iterator names are deliberately NOT collected: an
			// unused iterator is idiomatic (`for [i, v] in` using only `v`),
			// so flagging it would be noise. see plan/31 Finding 3.
		}

		// Recurse into child statements - shared across all block-carrying
		// statement variants so a new variant can't silently go unwalked.
		for (const child of this.childStatements(statement)) {
			this.collectDeclarationsInStatement(child);
		}
	}

	/**
	 * Scan a statement block for history-dependence: a use of the `[]`
	 * operator (IndexExpression) or a call to a history-dependent function
	 * (built-in flag or an already-recorded UDF). Mirrors TV's CW10003
	 * criterion for user functions - the page's own example is
	 * `previousValue(source) => source[1]`. see TODO #32.
	 */
	private scanStatementsForHistoryDependence(statements: Statement[]): boolean {
		for (const statement of statements) {
			for (const expr of this.statementExpressions(statement)) {
				if (this.scanExpressionForHistoryDependence(expr)) {
					return true;
				}
			}
			if (
				this.scanStatementsForHistoryDependence(this.childStatements(statement))
			) {
				return true;
			}
		}
		return false;
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

	private scanExpressionForHistoryDependence(expr: Expression): boolean {
		switch (expr.type) {
			case "IndexExpression":
				// The `[]` history-referencing operator
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
				if (name && this.isHistoryDependentFunction(name)) {
					return true;
				}
				return expr.arguments.some((a) =>
					this.scanExpressionForHistoryDependence(a.value),
				);
			}
			case "MemberExpression":
				return this.scanExpressionForHistoryDependence(expr.object);
			case "BinaryExpression":
				return (
					this.scanExpressionForHistoryDependence(expr.left) ||
					this.scanExpressionForHistoryDependence(expr.right)
				);
			case "UnaryExpression":
				return this.scanExpressionForHistoryDependence(expr.argument);
			case "TernaryExpression":
				return (
					this.scanExpressionForHistoryDependence(expr.condition) ||
					this.scanExpressionForHistoryDependence(expr.consequent) ||
					this.scanExpressionForHistoryDependence(expr.alternate)
				);
			case "ArrayExpression":
				return expr.elements.some((e) =>
					this.scanExpressionForHistoryDependence(e),
				);
			case "SwitchExpression":
				return (
					(expr.discriminant
						? this.scanExpressionForHistoryDependence(expr.discriminant)
						: false) ||
					expr.cases.some(
						(c) =>
							(c.condition
								? this.scanExpressionForHistoryDependence(c.condition)
								: false) ||
							(c.statements
								? this.scanStatementsForHistoryDependence(c.statements)
								: this.scanExpressionForHistoryDependence(c.result)),
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
