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

export class SemanticAnalyzer {
	private warnings: SemanticWarning[] = [];
	private inConditionalScope: boolean = false;
	private conditionalScopeDepth: number = 0;
	// name -> declaration position, so unused-variable warnings can point at
	// the declaration instead of 0:0
	private declaredVariables: Map<string, { line: number; column: number }> =
		new Map();
	private usedVariables: Set<string> = new Set();

	analyze(ast: Program): SemanticWarning[] {
		this.warnings = [];
		this.inConditionalScope = false;
		this.conditionalScopeDepth = 0;
		this.declaredVariables.clear();
		this.usedVariables.clear();

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

	private analyzeBinaryExpression(expr: BinaryExpression): void {
		this.analyzeExpression(expr.left);
		this.analyzeExpression(expr.right);
	}

	private analyzeTernaryExpression(expr: TernaryExpression): void {
		this.analyzeExpression(expr.condition);
		this.analyzeExpression(expr.consequent);
		this.analyzeExpression(expr.alternate);
	}

	private analyzeSwitchExpression(expr: SwitchExpression): void {
		if (expr.discriminant) {
			this.analyzeExpression(expr.discriminant);
		}
		for (const switchCase of expr.cases) {
			if (switchCase.condition) {
				this.analyzeExpression(switchCase.condition);
			}
			// `result` is contained in the last statement, so walk
			// `statements` INSTEAD of `result` when present (see SwitchCase).
			if (switchCase.statements) {
				for (const stmt of switchCase.statements) {
					this.analyzeStatement(stmt);
				}
			} else {
				this.analyzeExpression(switchCase.result);
			}
		}
	}

	private enterConditionalScope(): void {
		this.conditionalScopeDepth++;
		this.inConditionalScope = true;
	}

	private exitConditionalScope(): void {
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

		// Check if this is a series function that should not be called conditionally
		if (this.isSeriesFunction(functionName)) {
			this.addWarning(
				call.line,
				call.column,
				functionName.length,
				`The function '${functionName}' should be called on each calculation for consistency. It is recommended to extract the call from this scope`,
				DiagnosticSeverity.Warning,
				"CONDITIONAL_SERIES",
			);
		}
	}

	private isSeriesFunction(functionName: string): boolean {
		// Check if function returns a series type using pine-data
		// These functions should not be called conditionally
		const func = FUNCTIONS_BY_NAME.get(functionName);
		if (func?.returns) {
			// Check if return type is series
			if (func.returns.startsWith("series")) {
				return true;
			}
		}

		// Fallback: namespace-based heuristic for functions not in pine-data
		// or for user-defined functions that follow naming conventions
		return (
			functionName.startsWith("ta.") ||
			functionName.startsWith("request.") ||
			functionName.startsWith("str.")
		);
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
