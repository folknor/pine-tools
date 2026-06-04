// Simple Pine Script Parser (focused on function call validation).
// Expression-precedence methods live in `./expressions` as the
// ExpressionParser class; Parser owns an instance and forwards to it
// via the 11 one-line delegators below.

import { TYPE_KEYWORDS, VAR_TYPE_KEYWORDS } from "../constants/keywords";
import type * as AST from "./ast";
import { ExpressionParser } from "./expressions";
import { Lexer, type LexerError, type Token, TokenType } from "./lexer";

export interface ParserError {
	line: number;
	column: number;
	message: string;
}

export class Parser {
	// Token machinery and tracking state are public so co-located sub-
	// parsers (expressions, statements, …) in sibling modules can read
	// and update them. Keeping them on Parser keeps the canonical
	// parse-state in one object; the sub-parsers are plain logic
	// modules over that state.
	public tokens: Token[] = [];
	public current: number = 0;
	public parenDepth: number = 0; // Track parenthesis nesting depth
	public bracketDepth: number = 0; // Track bracket nesting depth for arrays
	private lexerErrors: LexerError[] = [];
	public parserErrors: ParserError[] = [];
	private detectedVersion: string | null = null;
	private exprs!: ExpressionParser;

	constructor(source: string) {
		const lexer = new Lexer(source);
		this.tokens = lexer
			.tokenize()
			.filter(
				(t) => t.type !== TokenType.WHITESPACE && t.type !== TokenType.COMMENT,
			);
		this.lexerErrors = lexer.getErrors();
		this.detectedVersion = lexer.getDetectedVersion();
		this.exprs = new ExpressionParser(this);
	}

	getLexerErrors(): LexerError[] {
		return this.lexerErrors;
	}

	getParserErrors(): ParserError[] {
		return this.parserErrors;
	}

	getDetectedVersion(): string | null {
		return this.detectedVersion;
	}

	parse(): AST.Program {
		const body: AST.Statement[] = [];

		while (!this.isAtEnd()) {
			try {
				const stmt = this.statement();
				if (stmt) body.push(stmt);
			} catch (e) {
				// Collect parser error
				const token = this.peek();
				const errorMsg = e instanceof Error ? e.message : String(e);
				this.parserErrors.push({
					line: token.line,
					column: token.column,
					message: errorMsg,
				});
				// Skip to next statement on error
				this.synchronize();
			}
		}

		return {
			type: "Program",
			body,
			line: 1,
			column: 1,
		};
	}

	private statement(): AST.Statement | null {
		// Skip newlines between statements (but not inside parentheses or brackets)
		while (
			this.check(TokenType.NEWLINE) &&
			this.parenDepth === 0 &&
			this.bracketDepth === 0
		) {
			this.advance();
		}

		// If we've reached EOF after skipping newlines, there's nothing left to parse
		if (this.isAtEnd()) {
			return null;
		}

		// Skip annotations
		if (this.check(TokenType.ANNOTATION)) {
			this.advance();
			return null;
		}

		// Import statement: import User/Library/Version [as alias]
		if (this.match([TokenType.KEYWORD, ["import"]])) {
			return this.importStatement();
		}

		// Export function or method: export funcName(...) => ...
		// Export method: export method methodName(...) => ...
		if (this.match([TokenType.KEYWORD, ["export"]])) {
			return this.exportDeclaration();
		}

		// Method declaration: method methodName(...) => ...
		if (this.match([TokenType.KEYWORD, ["method"]])) {
			return this.methodDeclaration(false, this.previous().indent ?? 0);
		}

		// If statement
		if (this.match([TokenType.KEYWORD, ["if"]])) {
			return this.ifStatement();
		}

		// For statement
		if (this.match([TokenType.KEYWORD, ["for"]])) {
			return this.forStatement();
		}

		// While statement
		if (this.match([TokenType.KEYWORD, ["while"]])) {
			return this.whileStatement();
		}

		// Return statement
		if (this.match([TokenType.KEYWORD, ["return"]])) {
			return this.returnStatement();
		}

		// Switch expression (Pine Script v6)
		// switch
		//     condition => expr
		//     => defaultExpr
		if (this.match([TokenType.KEYWORD, ["switch"]])) {
			// Parse switch as an expression statement (it returns a value)
			const switchExpr = this.switchExpression();
			return {
				type: "ExpressionStatement",
				expression: switchExpr,
				line: switchExpr.line,
				column: switchExpr.column,
			};
		}

		// Type or Enum declaration (Pine Script v6)
		if (this.match([TokenType.KEYWORD, ["type", "enum"]])) {
			return this.typeOrEnumDeclaration(this.previous().value);
		}

		// Variable declaration with optional type annotation:
		// var name = expr
		// varip name = expr
		// const name = expr
		// var float name = expr
		// int name = expr
		// float name = expr
		if (this.match([TokenType.KEYWORD, ["var", "varip", "const"]])) {
			const varKeyword = this.previous().value as "var" | "varip" | "const";
			let typeAnnotation: string | undefined;

			// Check if next token is also a type keyword (e.g., var float x = 1.0)
			if (this.isVarTypeKeyword()) {
				typeAnnotation = this.advance().value;
				typeAnnotation += this.parseGenericTypeSuffix();
			}

			return this.variableDeclaration(varKeyword, typeAnnotation);
		}

		// Type-annotated variable declaration without var: int x = 1, float y = 2.0, array<float> z = array.new<float>()
		// Also handles comma-separated: int _m2 = 0, int _m3 = 0, int _m4 = 0
		if (this.isVarTypeKeyword()) {
			const checkpoint = this.current;
			let typeAnnotation = this.advance().value;
			typeAnnotation += this.parseGenericTypeSuffix();

			// Check if next token is identifier followed by =
			if (
				this.check(TokenType.IDENTIFIER) &&
				this.peekNext()?.type === TokenType.ASSIGN
			) {
				// This is a type-annotated variable declaration
				const firstDecl = this.variableDeclaration(null, typeAnnotation);

				// Check for comma-separated declarations: int x = 0, int y = 0 OR int x = 0, y = 1
				if (this.check(TokenType.COMMA)) {
					const statements: AST.Statement[] = [firstDecl];
					let lastType = typeAnnotation; // Track last used type for inheritance

					while (this.match(TokenType.COMMA)) {
						// Each subsequent part can be:
						// 1. type identifier = expression (new type)
						// 2. identifier = expression (inherits last type)
						if (this.isVarTypeKeyword()) {
							let nextType = this.advance().value;
							nextType += this.parseGenericTypeSuffix();

							if (
								this.check(TokenType.IDENTIFIER) &&
								this.peekNext()?.type === TokenType.ASSIGN
							) {
								const nextDecl = this.variableDeclaration(null, nextType);
								statements.push(nextDecl);
								lastType = nextType;
							} else {
								break;
							}
						} else if (
							this.check(TokenType.IDENTIFIER) &&
							this.peekNext()?.type === TokenType.ASSIGN
						) {
							// Untyped declaration - inherits last type
							const nextDecl = this.variableDeclaration(null, lastType);
							statements.push(nextDecl);
						} else {
							break;
						}
					}

					return {
						type: "SequenceStatement",
						statements,
						line: firstDecl.line,
						column: firstDecl.column,
					} as AST.SequenceStatement;
				}

				return firstDecl;
			}

			// Not a variable declaration, backtrack
			this.current = checkpoint;
		}

		// Check for function definition: name(params) =>
		if (this.check(TokenType.IDENTIFIER)) {
			const checkpoint = this.current;
			const nameToken = this.advance();

			if (this.match(TokenType.LPAREN)) {
				// Check if this looks like a function definition (params are identifiers)
				// or a function call (params could be any expression)
				try {
					const params = this.parseFunctionParams();
					this.consume(
						TokenType.RPAREN,
						'Expected ")" after function parameters',
					);

					// Check for arrow =>
					if (this.match(TokenType.ARROW)) {
						// It's a function definition!
						return this.functionDeclaration(
							nameToken.value,
							params,
							nameToken.line,
							nameToken.column,
							nameToken.indent ?? 0,
						);
					}
				} catch (_e) {
					// Not a function definition (parsing params failed), backtrack
					this.current = checkpoint;
				}
			}

			// Not a function definition, backtrack
			this.current = checkpoint;
		}

		// Check for tuple destructuring: [a, b, c] = expr
		if (this.check(TokenType.LBRACKET)) {
			const checkpoint = this.current;
			try {
				return this.tupleDestructuring();
			} catch (_e) {
				this.current = checkpoint;
			}
		}

		// Check for user-defined type annotation: TypeName varName = expr
		// This handles UDT declarations like: Candle cdl = data.get(i)
		if (
			this.check(TokenType.IDENTIFIER) &&
			this.peekNext()?.type === TokenType.IDENTIFIER &&
			this.tokens[this.current + 2]?.type === TokenType.ASSIGN &&
			this.tokens[this.current + 2]?.value === "="
		) {
			const typeName = this.advance().value; // consume type name
			return this.variableDeclaration(null, typeName);
		}

		// Check if it's an identifier followed by = (variable declaration without var)
		// But only if it's '=' not ':='
		// Also handles comma-separated declarations: x = 1, y = 2, z = 3
		if (
			this.check(TokenType.IDENTIFIER) &&
			this.peekNext()?.type === TokenType.ASSIGN &&
			this.peekNext()?.value === "="
		) {
			const firstDecl = this.variableDeclaration(null);

			// Check for comma-separated declarations
			if (this.check(TokenType.COMMA)) {
				const statements: AST.Statement[] = [firstDecl];

				while (this.match(TokenType.COMMA)) {
					// Each subsequent part should be: identifier = expression
					if (!this.check(TokenType.IDENTIFIER)) {
						break;
					}
					const nextDecl = this.variableDeclaration(null);
					statements.push(nextDecl);
				}

				return {
					type: "SequenceStatement",
					statements,
					line: firstDecl.line,
					column: firstDecl.column,
				};
			}

			return firstDecl;
		}

		// Check for assignment: target := expr or target = expr or target += expr (compound)
		// Also handles comma-separated assignments: a := 1, b := 2, c := 3
		const checkpoint = this.current;
		try {
			const target = this.expression();
			if (
				this.match(TokenType.ASSIGN) ||
				this.match(TokenType.COMPOUND_ASSIGN)
			) {
				const operator = this.previous().value;
				const value = this.expression();
				const firstAssignment: AST.AssignmentStatement = {
					type: "AssignmentStatement",
					target,
					operator,
					value,
					line: target.line,
					column: target.column,
				};

				// Check for comma-separated assignments
				if (this.check(TokenType.COMMA)) {
					const statements: AST.Statement[] = [firstAssignment];

					while (this.match(TokenType.COMMA)) {
						const nextTarget = this.expression();
						if (
							!this.match(TokenType.ASSIGN) &&
							!this.match(TokenType.COMPOUND_ASSIGN)
						) {
							throw new Error("Expected assignment operator after comma");
						}
						const nextOperator = this.previous().value;
						const nextValue = this.expression();
						statements.push({
							type: "AssignmentStatement",
							target: nextTarget,
							operator: nextOperator,
							value: nextValue,
							line: nextTarget.line,
							column: nextTarget.column,
						});
					}

					return {
						type: "SequenceStatement",
						statements,
						line: firstAssignment.line,
						column: firstAssignment.column,
					};
				}

				return firstAssignment;
			}
			// Not an assignment, backtrack
			this.current = checkpoint;
		} catch (_e) {
			this.current = checkpoint;
		}

		// Expression statement (function calls, etc.)
		return this.expressionStatement();
	}

	/**
	 * Parse tuple destructuring: [a, b, c] = expr
	 */
	private tupleDestructuring(): AST.TupleDeclaration {
		const startToken = this.peek();
		this.consume(TokenType.LBRACKET, 'Expected "["');

		const names: string[] = [];
		if (!this.check(TokenType.RBRACKET)) {
			do {
				const nameToken = this.consume(
					TokenType.IDENTIFIER,
					"Expected variable name in tuple",
				);
				names.push(nameToken.value);
			} while (this.match(TokenType.COMMA));
		}

		this.consume(TokenType.RBRACKET, 'Expected "]"');
		this.consume(TokenType.ASSIGN, 'Expected "=" after tuple');

		const init = this.expression();

		return {
			type: "TupleDeclaration",
			names,
			init,
			line: startToken.line,
			column: startToken.column,
		};
	}

	private variableDeclaration(
		varType: "var" | "varip" | "const" | null,
		typeName?: string,
	): AST.VariableDeclaration {
		const token = this.consume(TokenType.IDENTIFIER, "Expected variable name");

		let init: AST.Expression | null = null;
		if (this.match(TokenType.ASSIGN)) {
			init = this.expression();
		}

		return {
			type: "VariableDeclaration",
			name: token.value,
			varType,
			init,
			typeAnnotation: typeName ? { name: typeName } : undefined,
			line: token.line,
			column: token.column,
		};
	}

	private expressionStatement():
		| AST.ExpressionStatement
		| AST.SequenceStatement {
		const expr = this.expression();

		// Check for comma-separated expressions/assignments (e.g., func1(), a := b)
		if (this.check(TokenType.COMMA)) {
			const statements: AST.Statement[] = [
				{
					type: "ExpressionStatement",
					expression: expr,
					line: expr.line,
					column: expr.column,
				},
			];

			while (this.match(TokenType.COMMA)) {
				// Check if next part is an assignment (identifier followed by := or = or +=)
				const nextExpr = this.expression();
				if (
					this.check(TokenType.ASSIGN) ||
					this.check(TokenType.COMPOUND_ASSIGN)
				) {
					const op = this.advance().value;
					const value = this.expression();
					const stmt: AST.AssignmentStatement = {
						type: "AssignmentStatement",
						target: nextExpr,
						value,
						operator: op,
						line: nextExpr.line,
						column: nextExpr.column,
					};
					statements.push(stmt);
				} else {
					statements.push({
						type: "ExpressionStatement",
						expression: nextExpr,
						line: nextExpr.line,
						column: nextExpr.column,
					});
				}
			}

			return {
				type: "SequenceStatement",
				statements,
				line: expr.line,
				column: expr.column,
			};
		}

		return {
			type: "ExpressionStatement",
			expression: expr,
			line: expr.line,
			column: expr.column,
		};
	}

	/**
	 * Parse an indentation-delimited statement block (if/else/for/while
	 * bodies). Two guards, both load-bearing - see plan/31:
	 *
	 * - NEWLINE tokens carry no indent, so they must be skipped BEFORE
	 *   any boundary check; reading their `indent || 0` as a dedent
	 *   ended every block after its first statement (#31 Finding 1).
	 * - The body must be indented STRICTLY MORE than the introducing
	 *   keyword (`baseIndent`) - otherwise a bodyless block swallows
	 *   following same-column statements to end-of-file. see INV008.
	 *
	 * Statements on the keyword's own line (e.g. the nested `if` of an
	 * `else if`) are parsed without indent tracking, matching the old
	 * loops. `stopAtElse` ends the block at an `else` keyword (the
	 * if-consequent case); the caller decides whether that `else` is its
	 * own by comparing indents.
	 */
	private parseIndentedBlock(
		startLine: number,
		baseIndent: number,
		stopAtElse = false,
	): AST.Statement[] {
		const body: AST.Statement[] = [];
		let bodyIndent: number | null = null;

		while (!this.isAtEnd()) {
			const currentToken = this.peek();

			// Skip NEWLINE tokens when determining body boundaries
			if (currentToken.type === TokenType.NEWLINE) {
				this.advance();
				continue;
			}

			if (stopAtElse && this.check([TokenType.KEYWORD, ["else"]])) {
				break;
			}

			const currentIndent = currentToken.indent || 0;

			// Set expected body indentation from first statement
			if (bodyIndent === null && currentToken.line > startLine) {
				if (currentIndent <= baseIndent) {
					// No properly-indented body - the block is empty. see INV008.
					break;
				}
				bodyIndent = currentIndent;
			}

			// Stop if we've returned to base indentation level or less
			if (
				bodyIndent !== null &&
				currentToken.line > startLine &&
				currentIndent < bodyIndent
			) {
				break;
			}

			const stmt = this.statement();
			if (stmt) {
				body.push(stmt);
			} else {
				break;
			}
		}

		return body;
	}

	private ifStatement(): AST.IfStatement {
		const startToken = this.previous();
		const condition = this.expression();

		// Skip newlines after condition
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		// The strict-indent guard in parseIndentedBlock matters here: a
		// bodyless `if` once swallowed the rest of the file when malformed
		// continuation text (`or rename if conflict` left over from a
		// wrap-without-// comment) parsed as a column-1 `if`. see INV008.
		const ifIndent = startToken.indent ?? 0;
		const consequent = this.parseIndentedBlock(startToken.line, ifIndent, true);

		// Attach an `else` only if it sits at the same indent as the `if` -
		// a shallower `else` belongs to an enclosing `if` and must be left
		// for that level to consume. (The lexer gives the inline `if` of an
		// `else if` the `else`'s own indent, so chains nest correctly.)
		let alternate: AST.Statement[] | undefined;
		if (
			this.check([TokenType.KEYWORD, ["else"]]) &&
			(this.peek().indent ?? ifIndent) === ifIndent
		) {
			const elseToken = this.advance();

			// Skip newlines after 'else' keyword
			while (this.check(TokenType.NEWLINE)) {
				this.advance();
			}

			alternate = this.parseIndentedBlock(
				elseToken.line,
				elseToken.indent ?? ifIndent,
			);
		}

		return {
			type: "IfStatement",
			condition,
			consequent,
			alternate,
			line: startToken.line,
			column: startToken.column,
		};
	}

	/**
	 * Consume a for-loop iterator name. Type names (`line`, `label`, ...)
	 * are legal variable names in Pine and appear as iterators in real
	 * published scripts (`for [i, line] in lines`), so accept type
	 * keywords alongside identifiers. see plan/31.
	 */
	private consumeIteratorName(message: string): string {
		if (this.check(TokenType.IDENTIFIER) || this.isTypeKeyword()) {
			return this.advance().value;
		}
		throw new Error(`${message} at line ${this.peek().line}`);
	}

	private forStatement(): AST.ForStatement | AST.ForInStatement {
		const startToken = this.previous();

		// Tuple iterator form: for [index, value] in collection
		if (this.match(TokenType.LBRACKET)) {
			const iterator = this.consumeIteratorName("Expected iterator variable");
			this.consume(TokenType.COMMA, 'Expected "," in for-in tuple');
			const iterator2 = this.consumeIteratorName(
				"Expected second iterator variable",
			);
			this.consume(TokenType.RBRACKET, 'Expected "]" after for-in tuple');
			if (!this.match([TokenType.KEYWORD, ["in"]])) {
				throw new Error(
					`Expected "in" in for loop at line ${this.peek().line}`,
				);
			}
			const collection = this.expression();

			// Skip newlines after collection expression
			while (this.check(TokenType.NEWLINE)) {
				this.advance();
			}

			const body = this.parseIndentedBlock(
				startToken.line,
				startToken.indent ?? 0,
			);

			return {
				type: "ForInStatement",
				iterator,
				iterator2,
				collection,
				body,
				line: startToken.line,
				column: startToken.column,
			};
		}

		// Optional iterator type annotation: `for int i = 0 to 10` /
		// `for float v in arr`. A type keyword directly followed by another
		// name is the annotation; a type keyword followed by `in`/`=` is the
		// iterator name itself (`for line in lines`). The annotation is
		// consumed and dropped - iterator types are not tracked in the AST.
		if (
			this.isTypeKeyword() &&
			(this.peekNext()?.type === TokenType.IDENTIFIER ||
				(this.peekNext()?.type === TokenType.KEYWORD &&
					TYPE_KEYWORDS.has(this.peekNext()?.value ?? "")))
		) {
			this.advance();
		}

		const iterator = this.consumeIteratorName("Expected iterator variable");

		// Check for "for x in collection" syntax
		if (this.check(TokenType.KEYWORD) && this.peek().value === "in") {
			this.advance(); // consume 'in'
			const collection = this.expression();

			// Skip newlines after collection expression
			while (this.check(TokenType.NEWLINE)) {
				this.advance();
			}

			const body = this.parseIndentedBlock(
				startToken.line,
				startToken.indent ?? 0,
			);

			return {
				type: "ForInStatement",
				iterator,
				collection,
				body,
				line: startToken.line,
				column: startToken.column,
			};
		}

		this.consume(TokenType.ASSIGN, 'Expected "=" in for loop');
		const from = this.expression();
		this.match([TokenType.KEYWORD, ["to"]]); // optional 'to' keyword
		const to = this.expression();

		// Optional step value: "by <expr>"
		let step: AST.Expression | undefined;
		if (this.match([TokenType.KEYWORD, ["by"]])) {
			step = this.expression();
		}

		// Skip newlines after to expression
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		const body = this.parseIndentedBlock(
			startToken.line,
			startToken.indent ?? 0,
		);

		return {
			type: "ForStatement",
			iterator,
			from,
			to,
			step,
			body,
			line: startToken.line,
			column: startToken.column,
		};
	}

	private whileStatement(): AST.WhileStatement {
		const startToken = this.previous();
		const condition = this.expression();

		// Skip newlines after condition
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		const body = this.parseIndentedBlock(
			startToken.line,
			startToken.indent ?? 0,
		);

		return {
			type: "WhileStatement",
			condition,
			body,
			line: startToken.line,
			column: startToken.column,
		};
	}

	private returnStatement(): AST.ReturnStatement {
		const startToken = this.previous();
		const value = this.expression();

		return {
			type: "ReturnStatement",
			value,
			line: startToken.line,
			column: startToken.column,
		};
	}

	private functionDeclaration(
		name: string,
		params: AST.FunctionParam[],
		line: number,
		column: number,
		baseIndent = 0,
	): AST.FunctionDeclaration {
		// Parse function body using indentation
		// In Pine Script, function bodies after => can be:
		// 1. Single expression: f(x) => x * 2
		// 2. Multi-line block with increased indentation:
		//    f(x) =>
		//        y = x * 2
		//        y + 1
		const body: AST.Statement[] = [];

		// Skip newlines after the => token
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		// Check if next token is on a new line with deeper indentation
		const nextToken = this.peek();
		if (nextToken.line === line) {
			// Single-line function: same line as =>
			try {
				const expr = this.expression();
				body.push({
					type: "ReturnStatement",
					value: expr,
					line: expr.line,
					column: expr.column,
				} as AST.ReturnStatement);
			} catch (_e) {
				// Error parsing expression - function may be incomplete
			}
		} else {
			// Multi-line function: parse all statements at deeper indentation
			// Determine the expected function body indentation from the first token
			let functionBodyIndent: number | null = null;

			while (!this.isAtEnd()) {
				const currentToken = this.peek();
				const currentIndent = currentToken.indent || 0;

				// Skip NEWLINE tokens when determining function body boundaries
				if (currentToken.type === TokenType.NEWLINE) {
					this.advance();
					continue;
				}

				// Set expected body indentation from first statement. The body
				// must be indented STRICTLY MORE than the declaration itself -
				// otherwise a bodyless declaration swallows following
				// same-column statements to end-of-file. see INV008 / plan/31.
				if (functionBodyIndent === null && currentToken.line > line) {
					if (currentIndent <= baseIndent) {
						break;
					}
					functionBodyIndent = currentIndent;
				}

				// Stop if we've returned to base indentation level or less
				// AND we're past the function declaration line
				if (
					currentToken.line > line &&
					functionBodyIndent !== null &&
					currentIndent < functionBodyIndent
				) {
					break;
				}

				// Parse statement at this indentation level
				try {
					const stmt = this.statement();
					if (stmt) {
						body.push(stmt);
					} else {
						break;
					}
				} catch (_e) {
					// Error parsing statement - try to recover
					break;
				}
			}
		}

		return {
			type: "FunctionDeclaration",
			name,
			params,
			body,
			line,
			column,
		};
	}

	/**
	 * Parse import statement: import User/Library/Version [as alias]
	 * The path is special - slashes are path separators, not division
	 */
	private importStatement(): AST.ImportStatement {
		const startToken = this.previous();

		// Parse library path: username/libraryName/version
		// This is a special syntax where / is NOT division
		let libraryPath = "";

		// First segment: username (identifier)
		if (this.check(TokenType.IDENTIFIER)) {
			libraryPath = this.advance().value;
		} else {
			throw new Error(`Expected library username at line ${this.peek().line}`);
		}

		// Expect /
		if (this.match(TokenType.DIVIDE)) {
			libraryPath += "/";
		} else {
			throw new Error(
				`Expected "/" in import path at line ${this.peek().line}`,
			);
		}

		// Second segment: libraryName (identifier)
		if (this.check(TokenType.IDENTIFIER)) {
			libraryPath += this.advance().value;
		} else {
			throw new Error(`Expected library name at line ${this.peek().line}`);
		}

		// Expect /
		if (this.match(TokenType.DIVIDE)) {
			libraryPath += "/";
		} else {
			throw new Error(
				`Expected "/" in import path at line ${this.peek().line}`,
			);
		}

		// Third segment: version (number)
		if (this.check(TokenType.NUMBER)) {
			libraryPath += this.advance().value;
		} else {
			throw new Error(
				`Expected library version number at line ${this.peek().line}`,
			);
		}

		// Optional: as alias
		let alias: string | undefined;
		if (this.check(TokenType.KEYWORD) && this.peek().value === "as") {
			this.advance(); // consume 'as'
			if (this.check(TokenType.IDENTIFIER)) {
				alias = this.advance().value;
			} else {
				throw new Error(
					`Expected alias name after 'as' at line ${this.peek().line}`,
				);
			}
		}

		return {
			type: "ImportStatement",
			libraryPath,
			alias,
			line: startToken.line,
			column: startToken.column,
		};
	}

	/**
	 * Parse export declaration. Valid follow tokens:
	 *   export funcName(...) => ...           (function)
	 *   export method methodName(...) => ...  (method)
	 *   export enum Name ...                  (enum, see INV002)
	 *   export type Name ...                  (type, see INV002)
	 */
	private exportDeclaration():
		| AST.FunctionDeclaration
		| AST.MethodDeclaration
		| AST.TypeDeclaration
		| AST.EnumDeclaration {
		// The `export` keyword starts the line, so its indent is the
		// declaration's base indent (the name token's is undefined).
		const exportIndent = this.previous().indent ?? 0;

		if (this.match([TokenType.KEYWORD, ["method"]])) {
			return this.methodDeclaration(true, exportIndent);
		}

		// `export enum Name ...` / `export type Name ...` - Pine v6 library
		// exports. Without this branch the parser falls into the function-
		// declaration path below, hits a parse error ("Expected function name
		// after 'export'") and the enum never registers as a symbol, so every
		// reference like `Name.Member` becomes "Undefined variable 'Name'".
		// see INV002.
		if (this.match([TokenType.KEYWORD, ["enum", "type"]])) {
			return this.typeOrEnumDeclaration(this.previous().value);
		}

		const nameToken = this.consume(
			TokenType.IDENTIFIER,
			"Expected function name after 'export'",
		);
		this.consume(TokenType.LPAREN, 'Expected "(" after function name');
		const params = this.parseFunctionParams();
		this.consume(TokenType.RPAREN, 'Expected ")" after function parameters');
		this.consume(TokenType.ARROW, 'Expected "=>" after function parameters');

		const funcDecl = this.functionDeclaration(
			nameToken.value,
			params,
			nameToken.line,
			nameToken.column,
			exportIndent,
		);
		funcDecl.isExport = true;
		return funcDecl;
	}

	/**
	 * Parse a type or enum declaration body, given the already-consumed
	 * `type`/`enum` keyword. The body is an indented block that we skip
	 * (members are not currently tracked in the AST - only the declaration
	 * itself, so it can be registered as a namespace symbol).
	 */
	private typeOrEnumDeclaration(
		kind: string,
	): AST.TypeDeclaration | AST.EnumDeclaration {
		const nameToken = this.consume(
			TokenType.IDENTIFIER,
			`Expected ${kind} name`,
		);

		const startToken = this.previous();

		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		const firstBodyToken = this.peek();
		if (firstBodyToken.line > startToken.line) {
			const bodyIndent = firstBodyToken.indent || 0;
			const baseIndent = startToken.indent || 0;

			if (bodyIndent > baseIndent) {
				while (!this.isAtEnd()) {
					const currentToken = this.peek();
					// NEWLINE tokens that start blank lines carry the
					// leading-whitespace count as their `indent` (e.g. 0 for
					// an empty line). A NEWLINE is not a content token, so
					// we must skip it before deciding whether the body has
					// ended - otherwise a blank line inside a type body
					// (indent 0) terminates the skip and field declarations
					// past it leak into top-level parsing. see INV007.
					if (currentToken.type === TokenType.NEWLINE) {
						this.advance();
						continue;
					}
					const isLineStart = currentToken.indent !== undefined;

					if (
						isLineStart &&
						currentToken.line > startToken.line &&
						currentToken.indent !== undefined &&
						currentToken.indent < bodyIndent
					) {
						break;
					}
					this.advance();
				}
			}
		}

		return {
			type: kind === "type" ? "TypeDeclaration" : "EnumDeclaration",
			name: nameToken.value,
			line: nameToken.line,
			column: nameToken.column,
		} as AST.TypeDeclaration | AST.EnumDeclaration;
	}

	/**
	 * Parse method declaration: [export] method methodName(...) => ...
	 */
	private methodDeclaration(
		isExport: boolean,
		baseIndent = 0,
	): AST.MethodDeclaration {
		const nameToken = this.consume(
			TokenType.IDENTIFIER,
			"Expected method name after 'method'",
		);
		this.consume(TokenType.LPAREN, 'Expected "(" after method name');
		const params = this.parseFunctionParams();
		this.consume(TokenType.RPAREN, 'Expected ")" after method parameters');
		this.consume(TokenType.ARROW, 'Expected "=>" after method parameters');

		// Parse method body - same logic as function body
		const body: AST.Statement[] = [];
		const line = nameToken.line;

		// Skip newlines after the => token
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		// Check if next token is on a new line with deeper indentation
		const nextToken = this.peek();
		if (nextToken.line === line) {
			// Single-line method: same line as =>
			try {
				const expr = this.expression();
				body.push({
					type: "ReturnStatement",
					value: expr,
					line: expr.line,
					column: expr.column,
				} as AST.ReturnStatement);
			} catch (_e) {
				// Error parsing expression - method may be incomplete
			}
		} else {
			// Multi-line method: parse all statements at deeper indentation
			let methodBodyIndent: number | null = null;

			while (!this.isAtEnd()) {
				const currentToken = this.peek();
				const currentIndent = currentToken.indent || 0;

				// Skip NEWLINE tokens
				if (currentToken.type === TokenType.NEWLINE) {
					this.advance();
					continue;
				}

				// Set expected body indentation from first statement. The body
				// must be indented STRICTLY MORE than the declaration itself -
				// see INV008 / plan/31.
				if (methodBodyIndent === null && currentToken.line > line) {
					if (currentIndent <= baseIndent) {
						break;
					}
					methodBodyIndent = currentIndent;
				}

				// Stop if we've returned to base indentation level or less
				if (
					currentToken.line > line &&
					methodBodyIndent !== null &&
					currentIndent < methodBodyIndent
				) {
					break;
				}

				try {
					const stmt = this.statement();
					if (stmt) {
						body.push(stmt);
					} else {
						break;
					}
				} catch (_e) {
					break;
				}
			}
		}

		return {
			type: "MethodDeclaration",
			name: nameToken.value,
			params,
			body,
			isExport,
			line: nameToken.line,
			column: nameToken.column,
		};
	}

	/**
	 * Parse switch expression (Pine Script v6)
	 * switch
	 *     condition => expr
	 *     => defaultExpr
	 */
	public switchExpression(): AST.Expression {
		const startToken = this.previous();

		// Check for discriminant expression on the same line (e.g., "switch pos")
		// If there's an identifier or expression before the newline, parse it as discriminant
		let discriminant: AST.Expression | undefined;
		if (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
			// Parse discriminant using a restricted method that stops at newlines.
			// This prevents "switch x\n    -1 => ..." from being parsed as "switch (x - 1)".
			discriminant = this.parseSwitchDiscriminant(startToken.line);
		}

		// Skip newlines after 'switch' (or discriminant)
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		// Parse switch cases until we hit a line with less indentation
		const cases: { condition?: AST.Expression; result: AST.Expression }[] = [];
		let switchIndent: number | null = null;

		while (!this.isAtEnd()) {
			// Skip newlines
			while (this.check(TokenType.NEWLINE)) {
				this.advance();
			}

			if (this.isAtEnd()) break;

			const currentToken = this.peek();
			const currentIndent = currentToken.indent || 0;

			// Set expected switch body indentation from first case
			if (switchIndent === null && currentToken.line > startToken.line) {
				switchIndent = currentIndent;
			}

			// Stop if we've returned to base indentation level or less
			if (
				switchIndent !== null &&
				currentToken.line > startToken.line &&
				currentIndent < switchIndent
			) {
				break;
			}

			// Check for default case (just =>)
			if (this.match(TokenType.ARROW)) {
				const result = this.parseSwitchCaseBody(switchIndent || 0);
				cases.push({ result });
				continue;
			}

			// Parse condition => result
			const condition = this.expression();
			if (this.match(TokenType.ARROW)) {
				const result = this.parseSwitchCaseBody(switchIndent || 0);
				cases.push({ condition, result });
			} else {
				// Not a valid case, stop parsing
				break;
			}
		}

		// Return a proper SwitchExpression AST node
		return {
			type: "SwitchExpression",
			discriminant,
			cases,
			line: startToken.line,
			column: startToken.column,
		};
	}

	/**
	 * Parse switch discriminant expression, stopping at newlines.
	 * This is a restricted version of expression() that doesn't continue
	 * parsing across newlines for binary operators. This prevents:
	 *   switch x
	 *       -1 => ...
	 * from being parsed as "switch (x - 1)" instead of "switch x" with case "-1".
	 */
	private parseSwitchDiscriminant(switchLine: number): AST.Expression {
		// Parse the first operand
		let expr = this.unary();

		// Continue parsing binary operators only if they're on the same line
		while (!this.isAtEnd()) {
			// Stop at newline - don't continue to next line
			if (this.check(TokenType.NEWLINE)) {
				break;
			}

			// Check for binary operators on the same line
			const currentToken = this.peek();
			if (currentToken.line !== switchLine) {
				break;
			}

			// Handle binary operators
			if (
				this.match(
					TokenType.PLUS,
					TokenType.MINUS,
					TokenType.MULTIPLY,
					TokenType.DIVIDE,
					TokenType.MODULO,
				)
			) {
				const operator = this.previous().value;
				const right = this.unary();
				expr = {
					type: "BinaryExpression",
					operator,
					left: expr,
					right,
					line: expr.line,
					column: expr.column,
				};
			} else if (this.match(TokenType.COMPARE)) {
				const operator = this.previous().value;
				const right = this.unary();
				expr = {
					type: "BinaryExpression",
					operator,
					left: expr,
					right,
					line: expr.line,
					column: expr.column,
				};
			} else if (this.check(TokenType.KEYWORD)) {
				const keyword = this.peek().value;
				if (keyword === "and" || keyword === "or") {
					this.advance();
					const right = this.unary();
					expr = {
						type: "BinaryExpression",
						operator: keyword,
						left: expr,
						right,
						line: expr.line,
						column: expr.column,
					};
				} else {
					break;
				}
			} else {
				break;
			}
		}

		return expr;
	}

	/**
	 * Parse an expression restricted to a single line.
	 * This is used for switch case results to prevent parsing across newlines.
	 */
	private parseSingleLineExpression(line: number): AST.Expression {
		// First parse using the discriminant parser (which handles binary ops on same line)
		let expr = this.parseSwitchDiscriminant(line);

		// Also handle ternary operator on the same line
		if (
			!this.check(TokenType.NEWLINE) &&
			!this.isAtEnd() &&
			this.peek().line === line &&
			this.match(TokenType.TERNARY)
		) {
			const consequent = this.parseSingleLineExpression(line);
			this.consume(TokenType.COLON, 'Expected ":" in ternary expression');
			const alternate = this.parseSingleLineExpression(line);
			expr = {
				type: "TernaryExpression",
				condition: expr,
				consequent,
				alternate,
				line: expr.line,
				column: expr.column,
			};
		}

		return expr;
	}

	/**
	 * Parse switch case body (single-line expression or multi-line block)
	 * For multi-line case bodies like:
	 *     condition =>
	 *         stmt1
	 *         stmt2
	 *         resultExpr
	 */
	private parseSwitchCaseBody(caseIndent: number): AST.Expression {
		const arrowToken = this.previous();

		// Check if there's content on the same line as =>
		if (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
			// Single-line case: condition => expression
			// Use restricted parsing to avoid continuing across newlines.
			// This prevents "=> expr\n    -1 => ..." from being parsed as "expr - 1".
			return this.parseSingleLineExpression(arrowToken.line);
		}

		// Multi-line case body: parse statements until indentation decreases
		// Skip newlines after =>
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		if (this.isAtEnd()) {
			// No body after =>, return na as placeholder
			return {
				type: "Identifier",
				name: "na",
				line: arrowToken.line,
				column: arrowToken.column,
			};
		}

		// Get the body indentation (should be greater than case indentation)
		const firstBodyToken = this.peek();
		const bodyIndent = firstBodyToken.indent || 0;

		// If not more indented than case, treat as empty body
		if (bodyIndent <= caseIndent) {
			return {
				type: "Identifier",
				name: "na",
				line: arrowToken.line,
				column: arrowToken.column,
			};
		}

		// Parse statements in the body
		const bodyStatements: AST.Statement[] = [];

		while (!this.isAtEnd()) {
			// Skip newlines
			while (this.check(TokenType.NEWLINE)) {
				this.advance();
			}

			if (this.isAtEnd()) break;

			const currentToken = this.peek();
			const currentIndent = currentToken.indent || 0;

			// Stop if indentation has decreased to or below case level
			if (currentIndent <= caseIndent) {
				break;
			}

			// Also stop if we've returned to the same indentation as case line
			// (which means we're at the next case)
			if (currentIndent === caseIndent) {
				break;
			}

			// Parse the next statement
			const stmt = this.statement();
			if (stmt) {
				bodyStatements.push(stmt);
			} else {
				break;
			}
		}

		// The result is the last statement's expression
		// If the last statement is an ExpressionStatement, use its expression
		// Otherwise wrap the statements somehow
		if (bodyStatements.length === 0) {
			return {
				type: "Identifier",
				name: "na",
				line: arrowToken.line,
				column: arrowToken.column,
			};
		}

		const lastStmt = bodyStatements[bodyStatements.length - 1];
		if (lastStmt.type === "ExpressionStatement") {
			// The last expression is the result
			// NOTE: Multi-statement arrow bodies lose intermediate statements in the AST.
			// e.g., `f() => a = 1\n    b = 2\n    a + b` only preserves `a + b`.
			// A proper fix would add a BlockExpression node containing all statements,
			// with the last expression as the result. Low priority since it only affects
			// complex multi-line arrow functions and doesn't cause validation errors.
			return lastStmt.expression;
		}

		// If the last statement isn't an expression, still try to return something
		// This handles cases like variable declarations that should return their value
		if (lastStmt.type === "VariableDeclaration" && lastStmt.init) {
			return lastStmt.init;
		}

		// Fallback: return na
		return {
			type: "Identifier",
			name: "na",
			line: lastStmt.line,
			column: lastStmt.column,
		};
	}

	// Type keywords defined in constants/keywords.ts

	private isTypeKeyword(): boolean {
		const token = this.peek();
		return token.type === TokenType.KEYWORD && TYPE_KEYWORDS.has(token.value);
	}

	/** Check if current token is a variable type keyword (not a qualifier) */
	private isVarTypeKeyword(): boolean {
		return this.check([TokenType.KEYWORD, [...VAR_TYPE_KEYWORDS]]);
	}

	/**
	 * Parse generic type syntax like <float>, <int>, <array<float>>, including array[] syntax.
	 * Returns the suffix to append to the base type, or empty string if no generic syntax found.
	 */
	private parseGenericTypeSuffix(): string {
		// Check for generic type syntax: array<float>, matrix<int>, etc.
		if (this.check(TokenType.COMPARE) && this.peek().value === "<") {
			this.advance(); // consume <
			let suffix = "";
			// Consume the type parameter (e.g., "float")
			if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.KEYWORD)) {
				suffix = `<${this.advance().value}`;
				// Handle nested generics like array<array<float>>
				while (this.check(TokenType.COMPARE) && this.peek().value === "<") {
					this.advance(); // consume <
					if (
						this.check(TokenType.IDENTIFIER) ||
						this.check(TokenType.KEYWORD)
					) {
						suffix += `<${this.advance().value}`;
					}
					if (this.check(TokenType.COMPARE) && this.peek().value === ">") {
						this.advance(); // consume >
						suffix += ">";
					}
				}
				// Consume closing >
				if (this.check(TokenType.COMPARE) && this.peek().value === ">") {
					this.advance(); // consume >
					suffix += ">";
				}
			}
			return suffix;
		}
		// Check for simple array type syntax: float[], int[], etc.
		if (this.check(TokenType.LBRACKET)) {
			this.advance(); // consume [
			if (this.check(TokenType.RBRACKET)) {
				this.advance(); // consume ]
				return "[]";
			}
		}
		return "";
	}

	private parseFunctionParams(): AST.FunctionParam[] {
		const params: AST.FunctionParam[] = [];

		// Skip any leading newlines
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		if (this.check(TokenType.RPAREN)) {
			return params; // No parameters
		}

		do {
			// Skip newlines between parameters (multi-line function definitions)
			while (this.check(TokenType.NEWLINE)) {
				this.advance();
			}

			// Pine Script function params can be:
			// - paramName (simple)
			// - type paramName (typed, type can be keyword like int/float or identifier like custom type)
			// - paramName = defaultValue (with default)
			// - type paramName = defaultValue (typed with default)

			let typeAnnotation: AST.TypeAnnotation | undefined;
			let paramName: string;

			// Parse type annotation and parameter name
			// Pine Script supports:
			// - paramName (simple)
			// - type paramName (e.g., float source)
			// - qualifier type paramName (e.g., simple int length, series float price)
			// - type keywords as param names (e.g., color = color.white)

			// Collect type keywords (qualifiers and base types)
			const typeKeywords: string[] = [];
			while (this.isTypeKeyword()) {
				// Check what follows: if it's an identifier, < (generic), [ (array
				// suffix), or any keyword, this is part of the type. If it's = / , /
				// ) , this keyword is the parameter name.
				const next = this.peekNext();
				if (
					next?.type === TokenType.IDENTIFIER ||
					next?.type === TokenType.KEYWORD || // Any keyword can be a param name (e.g., 'type', 'color')
					(next?.type === TokenType.COMPARE && next.value === "<") ||
					next?.type === TokenType.LBRACKET // array suffix `T[]` - see INV004
				) {
					// More type info or param name follows
					typeKeywords.push(this.advance().value);
				} else {
					// This keyword is the parameter name itself
					break;
				}
			}

			// Check for generic type syntax: array<float>, matrix<int>, map<string, float>
			if (
				typeKeywords.length > 0 &&
				this.check(TokenType.COMPARE) &&
				this.peek().value === "<"
			) {
				this.advance(); // consume <
				let genericType = "<";
				let depth = 1;
				// Consume everything until matching >
				while (!this.isAtEnd() && depth > 0) {
					const token = this.advance();
					if (token.type === TokenType.COMPARE && token.value === "<") {
						depth++;
					} else if (token.type === TokenType.COMPARE && token.value === ">") {
						depth--;
					}
					genericType += token.value;
					// Add space after comma for readability
					if (token.type === TokenType.COMMA && depth > 0) {
						genericType += " ";
					}
				}
				typeKeywords[typeKeywords.length - 1] += genericType;
			}

			// `simple Tz timezone` / `series Tz timezone` - a qualifier
			// followed by a user-defined type name (IDENTIFIER, not a
			// type-keyword) followed by the param name. The qualifier loop
			// above stops as soon as it sees an IDENTIFIER, so without this
			// step we'd treat `Tz` as the param name and choke on
			// `timezone`. Detect the pattern by peeking: current is
			// IDENTIFIER, next is IDENTIFIER (or KEYWORD usable as a name).
			// see INV003.
			if (typeKeywords.length > 0 && this.check(TokenType.IDENTIFIER)) {
				const next = this.peekNext();
				if (
					next?.type === TokenType.IDENTIFIER ||
					next?.type === TokenType.KEYWORD
				) {
					typeKeywords.push(this.advance().value);
				}
			}

			// `T[]` array-suffix syntax (e.g. `float[] xs`). The qualifier
			// loop above already consumed `T` (the LBRACKET-aware continuation
			// condition was extended in this same fix); now glue the `[]`
			// onto the last collected type. see INV004.
			if (typeKeywords.length > 0 && this.check(TokenType.LBRACKET)) {
				this.advance(); // consume [
				if (this.check(TokenType.RBRACKET)) {
					this.advance(); // consume ]
					typeKeywords[typeKeywords.length - 1] += "[]";
				}
			}

			if (typeKeywords.length > 0) {
				typeAnnotation = { name: typeKeywords.join(" ") };
				// Next token should be the parameter name (identifier or keyword used as name)
				// Keywords like 'type', 'color', 'string' etc. can be used as param names
				if (this.check(TokenType.IDENTIFIER)) {
					paramName = this.advance().value;
				} else if (this.check(TokenType.KEYWORD)) {
					// Keyword used as parameter name (e.g., string type, color color)
					paramName = this.advance().value;
				} else {
					throw new Error("Expected parameter name after type");
				}
			} else if (this.check(TokenType.KEYWORD)) {
				// Keyword used as parameter name (e.g., color = color.white, type = "SMA")
				paramName = this.advance().value;
			} else {
				// First token should be identifier (could be type or param name)
				const firstIdent = this.consume(
					TokenType.IDENTIFIER,
					"Expected parameter name or type",
				);

				// Check if next token is an identifier (then first was type, second is name)
				if (this.check(TokenType.IDENTIFIER)) {
					typeAnnotation = { name: firstIdent.value };
					paramName = this.advance().value;
				} else {
					// First identifier is the parameter name
					paramName = firstIdent.value;
				}
			}

			let defaultValue: AST.Expression | undefined;
			if (this.match(TokenType.ASSIGN)) {
				defaultValue = this.expression();
			}

			params.push({
				name: paramName,
				typeAnnotation,
				defaultValue,
			});

			// Skip newlines after parameter (before comma or closing paren)
			while (this.check(TokenType.NEWLINE)) {
				this.advance();
			}
		} while (this.match(TokenType.COMMA));

		// Skip trailing newlines before closing paren
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		return params;
	}

	// Expression-precedence methods delegate to ExpressionParser in
	// ./expressions. They stay on Parser as thin pass-throughs so
	// existing call sites in the statement/declaration parsers below
	// don't have to change. The actual implementations live in the
	// sibling file.

	private expression(): AST.Expression {
		return this.exprs.expression();
	}
	private ternary(): AST.Expression {
		return this.exprs.ternary();
	}

	private logicalOr(): AST.Expression {
		return this.exprs.logicalOr();
	}

	private logicalAnd(): AST.Expression {
		return this.exprs.logicalAnd();
	}

	private comparison(): AST.Expression {
		return this.exprs.comparison();
	}

	private addition(): AST.Expression {
		return this.exprs.addition();
	}

	private multiplication(): AST.Expression {
		return this.exprs.multiplication();
	}

	private unary(): AST.Expression {
		return this.exprs.unary();
	}

	private postfix(): AST.Expression {
		return this.exprs.postfix();
	}

	private finishCall(
		callee: AST.Expression,
		typeArguments?: string[],
	): AST.CallExpression {
		return this.exprs.finishCall(callee, typeArguments);
	}

	private primary(): AST.Expression {
		return this.exprs.primary();
	}

	// Utility methods
	public match(...types: (TokenType | [TokenType, string[]])[]): boolean {
		for (const type of types) {
			if (Array.isArray(type)) {
				const [tokenType, values] = type;
				if (this.check(tokenType) && values.includes(this.peek().value)) {
					this.advance();
					return true;
				}
			} else {
				if (this.check(type)) {
					this.advance();
					return true;
				}
			}
		}
		return false;
	}

	public check(type: TokenType | [TokenType, string[]]): boolean {
		if (this.isAtEnd()) return false;
		if (Array.isArray(type)) {
			const [tokenType, values] = type;
			return (
				this.peek().type === tokenType && values.includes(this.peek().value)
			);
		}
		return this.peek().type === type;
	}

	public advance(): Token {
		if (!this.isAtEnd()) this.current++;
		return this.previous();
	}

	public isAtEnd(): boolean {
		return this.peek().type === TokenType.EOF;
	}

	public peek(): Token {
		return this.tokens[this.current];
	}

	public peekNext(): Token | null {
		if (this.current + 1 >= this.tokens.length) return null;
		return this.tokens[this.current + 1];
	}

	public previous(): Token {
		return this.tokens[this.current - 1];
	}

	public consume(type: TokenType, message: string): Token {
		if (this.check(type)) return this.advance();
		throw new Error(`${message} at line ${this.peek().line}`);
	}

	// Called after a parse error. We must skip past whatever tripped the
	// parser before trying the next statement, otherwise we cascade
	// (every token in the broken expression looks like a fresh statement
	// start to the top-level parse loop, each producing its own error).
	//
	// The heuristic: walk until the next token that starts a NEW line
	// AT COLUMN 1 - i.e. a true top-level statement, dedented out of
	// whatever nested context the error happened in. Same effect as the
	// previous behaviour when the next line *is* at column 1, but skips
	// over nested broken code (switch arm bodies, function bodies, …)
	// rather than treating each interior line as a fresh top-level
	// statement.
	//
	// Fallback anchors: top-level statement-start keywords (`if`, `for`,
	// `while`, `var`, `varip`, `const`) - kept for cases where the bad
	// token *is* at column 1 and we want to resume immediately. see INV012.
	private synchronize(): void {
		this.advance();

		while (!this.isAtEnd()) {
			const token = this.peek();

			// Token starts a new line at column 1 - a true top-level
			// statement boundary, regardless of what indented context the
			// error originally came from.
			if (token.indent === 0 && token.line > 1) return;

			// Statement-start keyword we recognise - resume here.
			if (token.type === TokenType.KEYWORD) {
				if (
					["if", "for", "while", "var", "varip", "const"].includes(token.value)
				) {
					return;
				}
			}

			this.advance();
		}
	}
}
