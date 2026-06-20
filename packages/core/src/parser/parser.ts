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
		// ANNOTATION tokens (//@version, //@function, //@param doc comments)
		// are trivia to the parser, same as comments - //@version is already
		// extracted at the lexer level. Leaving them in the stream truncated
		// any BLOCK containing one: statement() returned null for them, and
		// block loops read a null statement as end-of-block, so a
		// `//@returns` line inside a function body leaked the rest of the
		// body to top level.
		this.tokens = lexer
			.tokenize()
			.filter(
				(t) =>
					t.type !== TokenType.WHITESPACE &&
					t.type !== TokenType.COMMENT &&
					t.type !== TokenType.ANNOTATION,
			);
		this.lexerErrors = lexer.getErrors();
		this.detectedVersion = lexer.getDetectedVersion();
		this.exprs = new ExpressionParser(this);
	}

	getLexerErrors(): LexerError[] {
		return this.lexerErrors;
	}

	getParserErrors(): ParserError[] {
		// Dedupe exact (line, column, message) repeats: speculative parse
		// paths (assignment detection, function-def lookahead) backtrack and
		// re-parse the same expression, and recovery paths that push errors
		// directly (in-call recovery - INV047/#46(b)) record once per pass.
		// An identical triplet carries no extra information.
		const seen = new Set<string>();
		return this.parserErrors.filter((e) => {
			const key = `${e.line}:${e.column}:${e.message}`;
			if (seen.has(key)) return false;
			seen.add(key);
			return true;
		});
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

		// A source with no statements at all (empty, or comments/
		// annotations only) is TV's CE10250 "Script doesn't contain any
		// statements" - probed; TV sends it without a position, which
		// the diff scripts normalize to 1:1 (see INV045). Suppressed
		// when other errors exist: a file whose only statement failed to
		// parse is broken, not empty, and TV reports the syntax error.
		if (
			body.length === 0 &&
			this.parserErrors.length === 0 &&
			this.lexerErrors.length === 0
		) {
			this.parserErrors.push({
				line: 1,
				column: 1,
				message: "Script doesn't contain any statements",
			});
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

		// NOTE: ANNOTATION tokens never reach this point - they are filtered
		// out with comments in the constructor (see there for why).

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
		// `method` is a contextual keyword. Only the `method <name> (` shape
		// is a declaration; pre-v6/v6 scripts also use `method` as a plain
		// variable name (`method = input.string(...)`, `method == "ADX" ?
		// ... : ...`, `method[1]`, `method.foo`), where committing to the
		// declaration path emitted a phantom "Expected method name after
		// 'method'" - TV accepts the identifier use. The name token may be an
		// IDENTIFIER or a reserved word (TV allows `method type(...)`,
		// `method float(...)`, `method label(...)`); the LPAREN-after-name
		// check is what separates the two (`method + (x)` stays an
		// expression). Mirrors the `switch`/`type`/`enum` guards above. see
		// INV051
		if (
			this.check([TokenType.KEYWORD, ["method"]]) &&
			(this.peekNext()?.type === TokenType.IDENTIFIER ||
				this.peekNext()?.type === TokenType.KEYWORD) &&
			this.tokens[this.current + 2]?.type === TokenType.LPAREN
		) {
			this.advance();
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
		// NOT when `switch` is assignment-shaped: pre-v6 scripts use it as a
		// plain variable name (`switch = 0`, `switch := 1`, `switch[1]`), and
		// entering the arm machinery there manufactured "Expected =>" noise
		// over the following lines. see #46(d)
		if (
			this.check([TokenType.KEYWORD, ["switch"]]) &&
			this.peekNext()?.type !== TokenType.ASSIGN &&
			this.peekNext()?.type !== TokenType.COMPOUND_ASSIGN &&
			this.peekNext()?.type !== TokenType.LBRACKET
		) {
			this.advance();
			// Parse switch as an expression statement (it returns a value)
			const switchExpr = this.switchExpression();
			return {
				type: "ExpressionStatement",
				expression: switchExpr,
				line: switchExpr.line,
				column: switchExpr.column,
			};
		}

		// Type or Enum declaration (Pine Script v6). Only when an IDENTIFIER
		// follows: `type` is also a common variable/param NAME, and a line
		// like `type == 'EMA' ? v2 : ...` (a UDF's return ternary) is an
		// expression statement, not a declaration - it threw "Expected type
		// name" once per chained line on the TV-clean 1f6fb53c… fixture.
		// see INV047 / #46(c)
		if (
			this.check([TokenType.KEYWORD, ["type", "enum"]]) &&
			this.peekNext()?.type === TokenType.IDENTIFIER
		) {
			this.advance();
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
			const firstDecl = this.varDeclarationAfterKeyword();

			// Comma-separated sequence starting with a var declaration:
			// `var float R1 = na, var float R2 = na`, or mixed with
			// expressions/assignments:
			// `var line up = na, line.delete(up), var label lb = na`
			if (this.check(TokenType.COMMA)) {
				const statements: AST.Statement[] = [firstDecl];
				while (this.match(TokenType.COMMA)) {
					// Trailing comma: either tolerated end-of-list
					// (`var a = line(na),`) or a wrap continuing the units on
					// the next line - commaUnitsContinue decides. see #46(c)
					if (!this.commaUnitsContinue()) {
						break;
					}
					if (this.match([TokenType.KEYWORD, ["var", "varip", "const"]])) {
						statements.push(this.varDeclarationAfterKeyword());
						continue;
					}
					// Type-annotated unit: `..., float [] recRet = na`. The
					// peekNext guard keeps namespace calls (`color.new(...)`,
					// peekNext is DOT) in the expression branch below.
					if (
						(this.isVarTypeKeyword() &&
							(this.peekNext()?.type === TokenType.IDENTIFIER ||
								this.peekNext()?.type === TokenType.LBRACKET ||
								(this.peekNext()?.type === TokenType.COMPARE &&
									this.peekNext()?.value === "<"))) ||
						this.isQualifiedVarTypeKeyword()
					) {
						const unitStartToken = this.peek();
						let unitType = this.advance().value;
						if (this.isVarTypeKeyword()) {
							// qualifier consumed above - append the base type
							unitType += ` ${this.advance().value}`;
						}
						unitType += this.parseGenericTypeSuffix();
						statements.push(
							this.variableDeclaration(null, unitType, unitStartToken),
						);
						continue;
					}
					{
						const unitStartToken = this.peek();
						const userType = this.tryUserTypeAnnotation();
						if (userType) {
							statements.push(
								this.variableDeclaration(null, userType, unitStartToken),
							);
							continue;
						}
					}
					// A `[`-led unit is a tuple destructure - see the untyped
					// comma loop / #46(c)
					if (this.check(TokenType.LBRACKET)) {
						const unitCheckpoint = this.current;
						try {
							statements.push(this.tupleDestructuring());
							continue;
						} catch (_e) {
							this.current = unitCheckpoint;
						}
					}
					const expr = this.expression();
					if (
						this.check(TokenType.ASSIGN) ||
						this.check(TokenType.COMPOUND_ASSIGN)
					) {
						const op = this.advance().value;
						const value = this.expression();
						statements.push({
							type: "AssignmentStatement",
							target: expr,
							operator: op,
							value,
							line: expr.line,
							column: expr.column,
						});
					} else {
						statements.push({
							type: "ExpressionStatement",
							expression: expr,
							line: expr.line,
							column: expr.column,
						});
					}
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

		// A bare `series`/`simple` qualifier with no base type before a
		// declaration (`series x = close`) is TV's CE10147; consume the
		// qualifier, record the error, and keep the declaration so the
		// rest of the line parses normally. see INV024 probes 8-9
		if (
			this.check([TokenType.KEYWORD, ["series", "simple"]]) &&
			this.peekNext()?.type === TokenType.IDENTIFIER &&
			this.tokens[this.current + 2]?.type === TokenType.ASSIGN &&
			this.tokens[this.current + 2]?.value === "="
		) {
			const qualifierToken = this.advance();
			this.qualifierFormError(qualifierToken);
			return this.variableDeclaration(null, undefined, qualifierToken);
		}

		// Type-annotated variable declaration without var: int x = 1, float y = 2.0, array<float> z = array.new<float>()
		// Also handles comma-separated: int _m2 = 0, int _m3 = 0, int _m4 = 0
		// An optional `series`/`simple` qualifier may lead (`series bool
		// x = ...`); it folds into the annotation. see INV024.
		if (this.isVarTypeKeyword() || this.isQualifiedVarTypeKeyword()) {
			const checkpoint = this.current;
			const typeStartToken = this.peek();
			let typeAnnotation = this.advance().value;
			if (this.isVarTypeKeyword()) {
				// qualifier consumed above - append the base type
				typeAnnotation += ` ${this.advance().value}`;
			}
			typeAnnotation += this.parseGenericTypeSuffix();

			// Check if next token is identifier followed by =
			if (
				this.check(TokenType.IDENTIFIER) &&
				this.peekNext()?.type === TokenType.ASSIGN
			) {
				// A bare qualifier with no base type (`series x = close`) is
				// TV's CE10147 - see qualifierFormError / INV024 probes 8-9.
				if (typeAnnotation === "series" || typeAnnotation === "simple") {
					this.qualifierFormError(typeStartToken);
				}
				// This is a type-annotated variable declaration
				const firstDecl = this.variableDeclaration(
					null,
					typeAnnotation,
					typeStartToken,
				);

				// Check for comma-separated declarations: int x = 0, int y = 0 OR int x = 0, y = 1
				if (this.check(TokenType.COMMA)) {
					const statements: AST.Statement[] = [firstDecl];

					while (this.match(TokenType.COMMA)) {
						// Trailing comma may wrap the unit list onto the next
						// line - see commaUnitsContinue / #46(c)
						if (!this.commaUnitsContinue()) {
							break;
						}
						// Each subsequent part can be:
						// 1. type identifier = expression (own annotation)
						// 2. identifier = expression (untyped)
						if (this.isVarTypeKeyword() || this.isQualifiedVarTypeKeyword()) {
							const unitStartToken = this.peek();
							let nextType = this.advance().value;
							if (this.isVarTypeKeyword()) {
								// qualifier consumed above - append the base type
								nextType += ` ${this.advance().value}`;
							}
							nextType += this.parseGenericTypeSuffix();

							if (
								this.check(TokenType.IDENTIFIER) &&
								this.peekNext()?.type === TokenType.ASSIGN
							) {
								const nextDecl = this.variableDeclaration(
									null,
									nextType,
									unitStartToken,
								);
								statements.push(nextDecl);
							} else {
								break;
							}
						} else if (
							this.check(TokenType.IDENTIFIER) &&
							this.peekNext()?.type === TokenType.ASSIGN
						) {
							// Untyped unit - typed independently from its initializer.
							// An annotation binds only to the unit it directly precedes:
							// TV types `bool a = true, b = 1` as const bool, const int
							// (probed 2026-06-04). Inheriting the previous unit's
							// annotation manufactured int-to-bool FPs. see INV027
							const nextDecl = this.variableDeclaration(null, undefined);
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

			// Recovery: `type name[expr] = ...` - a subscripted declaration
			// target. TV reports one error at the '[' ("Mismatched input '['
			// expecting '='", probed 2026-06-04 - see INV024). Without this
			// the backtrack re-parses the line as junk expression statements,
			// breaking the enclosing block and cascading undefined-variable
			// errors over the rest of the file. Parse it as a declaration,
			// skip the subscript, record the one error TV reports.
			if (
				this.check(TokenType.IDENTIFIER) &&
				this.peekNext()?.type === TokenType.LBRACKET
			) {
				// Scan without consuming: IDENT [ ... ] =
				let i = this.current + 1; // at LBRACKET
				let depth = 0;
				while (i < this.tokens.length) {
					const t = this.tokens[i].type;
					if (t === TokenType.LBRACKET) {
						depth++;
					} else if (t === TokenType.RBRACKET) {
						depth--;
						if (depth === 0) break;
					} else if (t === TokenType.NEWLINE) {
						break;
					}
					i++;
				}
				if (
					depth === 0 &&
					this.tokens[i]?.type === TokenType.RBRACKET &&
					this.tokens[i + 1]?.type === TokenType.ASSIGN &&
					this.tokens[i + 1]?.value === "="
				) {
					const nameToken = this.advance(); // IDENT
					const bracket = this.peek(); // LBRACKET
					this.parserErrors.push({
						line: bracket.line,
						column: bracket.column,
						message: "Mismatched input '[' expecting '='",
					});
					this.current = i + 1; // at ASSIGN
					this.advance(); // consume '='
					this.skipWrapContinuationNewline();
					const init = this.expression();
					return {
						type: "VariableDeclaration",
						name: nameToken.value,
						varType: null,
						init,
						typeAnnotation: { name: typeAnnotation },
						line: nameToken.line,
						column: nameToken.column,
					};
				}
			}

			// Not a variable declaration, backtrack
			this.current = checkpoint;
		}

		// Check for function definition: name(params) =>
		// `method` is the contextual method-declaration keyword ONLY when
		// followed by `<name>(` (handled by the INV051 guard far above);
		// `method(...)` with `(` directly after is a function NAMED `method`,
		// which TV accepts (probed 2026-06-19). It lexes as KEYWORD, so the
		// IDENTIFIER check below misses it - allow it explicitly. If it turns
		// out to be a call (no `=>`), the block backtracks. see INV069
		const methodAsFuncName =
			this.check([TokenType.KEYWORD, ["method"]]) &&
			this.peekNext()?.type === TokenType.LPAREN;
		if (this.check(TokenType.IDENTIFIER) || methodAsFuncName) {
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
		// (e.g. `Candle cdl = data.get(i)`) or the namespaced form
		// `lib.TypeName varName = expr` from an import alias. Handles
		// comma-separated declarations (`BarVol b1 = ..., BarVol b2 = ...`)
		// like the type-keyword branch below.
		{
			const typeStartToken = this.peek();
			const userType = this.tryUserTypeAnnotation();
			if (userType) {
				const firstDecl = this.variableDeclaration(
					null,
					userType,
					typeStartToken,
				);

				if (this.check(TokenType.COMMA)) {
					const statements: AST.Statement[] = [firstDecl];
					let lastType = userType;

					while (this.match(TokenType.COMMA)) {
						const unitStartToken = this.peek();
						const nextType = this.tryUserTypeAnnotation();
						if (nextType) {
							statements.push(
								this.variableDeclaration(null, nextType, unitStartToken),
							);
							lastType = nextType;
						} else if (
							this.check(TokenType.IDENTIFIER) &&
							this.peekNext()?.type === TokenType.ASSIGN
						) {
							// Untyped declaration - inherits last type
							statements.push(this.variableDeclaration(null, lastType));
						} else {
							break;
						}
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
					// Trailing comma may wrap the unit list onto the next
					// line - see commaUnitsContinue / #46(c)
					if (!this.commaUnitsContinue()) {
						break;
					}
					// `var`/`varip`/`const`-led units are valid comma
					// declarations too (`TFhrdata = rollingTF.new(), var
					// volRolling = array.new<float>()` - the b16b3948…
					// fixture is TV-clean). Breaking here left the unit as a
					// mid-line leftover that ended the enclosing body and
					// spilled its scope. see INV047 / #46(c)
					if (this.match([TokenType.KEYWORD, ["var", "varip", "const"]])) {
						statements.push(this.varDeclarationAfterKeyword());
						continue;
					}
					// A `[`-led unit is a tuple destructure
					// (`ph_ = ta.pivothigh(...), [tH, ph] = request.security(...)`
					// - a6d1bf91… is TV-silent there); parsing it as an array
					// expression left the tuple names undeclared. see #46(c)
					if (this.check(TokenType.LBRACKET)) {
						const unitCheckpoint = this.current;
						try {
							statements.push(this.tupleDestructuring());
							continue;
						} catch (_e) {
							this.current = unitCheckpoint;
						}
					}
					// `name := expr` / `name += expr` units are REASSIGNMENTS,
					// not declarations - `u11 = 0.0, u11 := nz(u11[1])` is an
					// idiomatic declare-then-seed pair. Emitting a declaration
					// here made the second unit a CE10095 FP. Only `name =`
					// declares. see INV035
					const unitOp = this.peekNext();
					if (
						this.check(TokenType.IDENTIFIER) &&
						unitOp?.type === TokenType.ASSIGN &&
						unitOp.value === "="
					) {
						const nextDecl = this.variableDeclaration(null);
						statements.push(nextDecl);
						continue;
					}
					// Anything else is an expression or assignment unit
					// (`x2 = id.get_x2(), id.set_xy2(x1, y1)`,
					// `a = 1, b.c := 2` - the var-led sequence above already
					// supported these; the b16b3948… fixture is TV-clean).
					// see #46(c)
					const target = this.expression();
					if (
						this.check(TokenType.ASSIGN) ||
						this.check(TokenType.COMPOUND_ASSIGN)
					) {
						this.advance(); // the := / compound operator
						const operator = this.previous().value;
						this.skipWrapContinuationNewline();
						const value = this.expression();
						statements.push({
							type: "AssignmentStatement",
							target,
							operator,
							value,
							line: target.line,
							column: target.column,
						});
					} else {
						statements.push({
							type: "ExpressionStatement",
							expression: target,
							line: target.line,
							column: target.column,
						});
					}
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
				this.skipWrapContinuationNewline();
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
						// Trailing comma may wrap the unit list onto the next
						// line - see commaUnitsContinue / #46(c)
						if (!this.commaUnitsContinue()) {
							break;
						}
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
		// The `=` may LEAD the next line when its indent is a valid wrap
		// continuation (not a multiple of 4 - INV017): `[m, m1, ...]` then
		// `   = request.security_lower_tf(...)`. The f7bc17b0… fixture is
		// TV-clean on this shape. see #46(c)
		if (this.check(TokenType.NEWLINE)) {
			const next = this.peekNext();
			if (next?.type === TokenType.ASSIGN && (next.indent ?? 0) % 4 !== 0) {
				this.advance();
			}
		}
		const assignToken = this.consume(
			TokenType.ASSIGN,
			'Expected "=" after tuple',
		);
		// The RHS may start on a wrapped (possibly blank-line-separated)
		// continuation line, same as variableDeclaration's init. Without
		// this, `[a, b] = ` + blank + wrapped RHS backtracked into an
		// ArrayExpression USE of the names - undefined-variable FPs at the
		// destructure site. see INV031
		this.skipWrapContinuationNewline();

		const init = this.expression();

		// Tuples only DECLARE - `[a, b] := f()` is invalid Pine, TV's
		// CE10156 anchored at the `:=` (probed - see INV044). Both `=`
		// and `:=` lex as ASSIGN, so the consume above accepts either;
		// flag the reassignment form. Reported only after the whole
		// tuple statement parsed, so a backtracking caller that discards
		// this parse can't leave a spurious error behind.
		if (assignToken.value === ":=") {
			this.parserErrors.push({
				line: assignToken.line,
				column: assignToken.column,
				message: 'Syntax error at input ":="',
			});
		}

		// A BARE tuple literal as the init is invalid Pine - tuples are
		// only produced by function calls and if/switch expression tails.
		// TV: `Syntax error at input "["` anchored at the RHS opener
		// (probed - see INV049 p02). Reported here, after the full parse,
		// for the same backtracking-safety reason as the `:=` case above;
		// the declaration is still returned so the checker can type the
		// elements for recovery.
		if (init.type === "ArrayExpression") {
			const arr = init as AST.ArrayExpression;
			this.parserErrors.push({
				line: arr.startLine ?? arr.line,
				column: arr.startColumn ?? arr.column,
				message: 'Syntax error at input "["',
			});
		}

		return {
			type: "TupleDeclaration",
			names,
			init,
			line: startToken.line,
			column: startToken.column,
		};
	}

	/**
	 * Parse one declaration after an already-consumed var/varip/const
	 * keyword: optional type annotation (built-in keyword, generic suffix,
	 * or user-defined incl. the namespaced `lib.MyType` form from an
	 * import alias), then `name = expr`.
	 */
	private varDeclarationAfterKeyword(): AST.VariableDeclaration {
		const keywordToken = this.previous();
		const varKeyword = keywordToken.value as "var" | "varip" | "const";

		// `var const array<float> xs = ...` - a `const` qualifier may follow
		// var/varip (TV accepts the combination). The persistence mode stays
		// `var`; the redundant qualifier is consumed and dropped.
		if (varKeyword !== "const") {
			this.match([TokenType.KEYWORD, ["const"]]);
		}

		let typeAnnotation: string | undefined;

		// An optional `series`/`simple` qualifier may follow var/varip
		// (`var series float c = ...`); it folds into the annotation. TV
		// rejects the qualifier-after-const combination (CE10147) and a
		// qualifier with no type at all (`var series x = ...`) - both
		// probed 2026-06-04/05. see INV024.
		let qualifier = "";
		let qualifierToken: Token | undefined;
		if (this.isQualifiedVarTypeKeyword()) {
			qualifierToken = this.peek();
			qualifier = `${this.advance().value} `;
		} else if (
			this.check([TokenType.KEYWORD, ["series", "simple"]]) &&
			this.peekNext()?.type === TokenType.IDENTIFIER &&
			this.tokens[this.current + 2]?.type === TokenType.ASSIGN &&
			this.tokens[this.current + 2]?.value === "="
		) {
			// `var series x = ...` - qualifier with no base type (CE10147,
			// probe 10). Consume it, record the error, keep the declaration.
			this.qualifierFormError(this.peek());
			this.advance();
		}

		// Check if next token is also a type keyword (e.g., var float x = 1.0).
		// A type keyword directly followed by `=` is the variable NAME, not
		// an annotation (`var color = na` declares `color`) - leave it for
		// variableDeclaration, which accepts keyword names. see INV031
		if (this.isVarTypeKeyword() && this.peekNext()?.type !== TokenType.ASSIGN) {
			typeAnnotation = qualifier + this.advance().value;
			typeAnnotation += this.parseGenericTypeSuffix();
			if (qualifierToken && varKeyword === "const") {
				this.qualifierFormError(qualifierToken);
			}
		} else {
			typeAnnotation = this.tryUserTypeAnnotation() ?? undefined;
			if (qualifierToken && typeAnnotation === undefined) {
				this.qualifierFormError(qualifierToken);
			}
		}

		return this.variableDeclaration(varKeyword, typeAnnotation, keywordToken);
	}

	// TV's CE10147 "Cannot specify a type form X without also specifying
	// the type." - fired for a bare qualifier with no base type
	// (`series x = ...`, `var simple y = ...`) AND for a qualifier after
	// `const` even when a full type follows (`const simple int d = ...`).
	// Anchored at the qualifier token. Probed - see INV024 probes 7-10.
	private qualifierFormError(qualifierToken: Token): void {
		this.parserErrors.push({
			line: qualifierToken.line,
			column: qualifierToken.column,
			message: `Cannot specify a type form "${qualifierToken.value}" without also specifying the type.`,
		});
	}

	/**
	 * Try to consume a user-defined/namespaced type annotation when the
	 * lookahead is exactly `Type name =` with Type being one of:
	 *
	 *     MyType            (user-defined type)
	 *     lib.MyType        (type from an import alias)
	 *     chart.point[]     (namespaced built-in / any of the above + [])
	 *
	 * Returns the dotted type name (incl. a `[]` suffix), or null without
	 * consuming anything. The trailing `name =` requirement keeps this
	 * from misreading member access or calls as declarations.
	 */
	private tryUserTypeAnnotation(): string | null {
		if (!this.check(TokenType.IDENTIFIER)) {
			return null;
		}

		// Scan the candidate without consuming: IDENT (. IDENT)? ([])?
		let i = this.current;
		let typeName = this.tokens[i].value;
		i++;
		if (
			this.tokens[i]?.type === TokenType.DOT &&
			this.tokens[i + 1]?.type === TokenType.IDENTIFIER
		) {
			typeName += `.${this.tokens[i + 1].value}`;
			i += 2;
		}
		if (
			this.tokens[i]?.type === TokenType.LBRACKET &&
			this.tokens[i + 1]?.type === TokenType.RBRACKET
		) {
			typeName += "[]";
			i += 2;
		}

		// Require `name =` to follow, otherwise this is not a declaration
		if (
			this.tokens[i]?.type === TokenType.IDENTIFIER &&
			this.tokens[i + 1]?.type === TokenType.ASSIGN &&
			this.tokens[i + 1]?.value === "="
		) {
			this.current = i; // consume the type tokens; `name` is next
			return typeName;
		}
		return null;
	}

	/**
	 * Skip a line break that is a wrap continuation: the next line's
	 * content is indented by a NON-multiple of 4 (Pine's line-wrapping
	 * rule - see INV017). Used right after `=`/`:=` so forms like
	 *     float step =
	 *       switch
	 *           ...
	 * parse as one declaration. A multiple-of-4 next line is a block
	 * statement and is left alone.
	 */
	// After a consumed comma in a comma-separated unit list (declarations,
	// var sequences, assignments, inline arm bodies), decide whether the
	// list CONTINUES on a following line: a trailing comma wraps the list
	// when the next line's indent is a valid continuation (not a multiple
	// of 4 - INV017; blank lines allowed). Consumes the newlines and
	// returns true; returns false when the comma was merely trailing
	// (`'25' => 1 ,`) and the list ends. TV accepts multi-line comma
	// sequences (`y2 = id.get_y2(), y1 = id.get_y1(),` wrapping onto
	// further units - the b16b3948… fixture lints 0 on TV). see #46(c)/(d)
	private commaUnitsContinue(): boolean {
		if (this.isAtEnd()) return false;
		if (!this.check(TokenType.NEWLINE)) return true; // same line
		let i = this.current;
		while (this.tokens[i]?.type === TokenType.NEWLINE) i++;
		const next = this.tokens[i];
		if (next && next.type !== TokenType.EOF && (next.indent ?? 0) % 4 !== 0) {
			this.current = i;
			return true;
		}
		return false;
	}

	private skipWrapContinuationNewline(): void {
		while (this.check(TokenType.NEWLINE)) {
			const eol = this.peek();
			const next = this.peekNext();
			if (next?.type === TokenType.NEWLINE) {
				// blank line inside the wrap - keep looking
				this.advance();
				continue;
			}
			if (next && (next.indent ?? 0) % 4 !== 0) {
				this.advance();
			} else if (next && next.type !== TokenType.EOF) {
				// A multiple-of-4 continuation is only valid as a
				// block-statement RHS (`float step =` newline `    switch`,
				// `x =` newline `    if cond` ...). Anything else - a plain
				// expression at indent 4 or a column-1 line - is TV's CE10156
				// at the EOL (probed `x =` / `close` p05 and `x =` /
				// `    10 + 20` p08, both CE10156). Record the error but
				// STILL JOIN, so the declaration's names exist and the rest
				// of the file doesn't drown in phantom undefined-variable
				// records (the a0c3871d… tuple destructures). see #46(c)
				const isIndentedBlockRHS =
					(next.indent ?? 0) > 0 &&
					next.type === TokenType.KEYWORD &&
					["if", "switch", "for", "while"].includes(next.value);
				if (!isIndentedBlockRHS) {
					this.parserErrors.push({
						line: eol.line,
						column: eol.column,
						message:
							'Syntax error at input "end of line without line continuation"',
					});
					this.advance();
				}
			}
			break;
		}
	}

	private variableDeclaration(
		varType: "var" | "varip" | "const" | null,
		typeName?: string,
		startToken?: Token,
	): AST.VariableDeclaration {
		// A type keyword can BE the variable name when directly followed by
		// `=` - `var color color = na`, `line line = na` are idiomatic Pine
		// and TV accepts them (probed, see INV031). Without this the consume
		// threw and shredded the enclosing block.
		const token =
			this.isVarTypeKeyword() && this.peekNext()?.type === TokenType.ASSIGN
				? this.advance()
				: this.consume(TokenType.IDENTIFIER, "Expected variable name");

		let init: AST.Expression | null = null;
		if (this.match(TokenType.ASSIGN)) {
			this.skipWrapContinuationNewline();
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
			startLine: (startToken ?? token).line,
			startColumn: (startToken ?? token).column,
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
				// Trailing comma may wrap the unit list onto the next line
				// (`array.set(indices, 0, i1),` per line - the fed84547…
				// fixture is TV-silent there) - see commaUnitsContinue / #46(c)
				if (!this.commaUnitsContinue()) {
					break;
				}
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

			// Indent boundaries apply only to LINE-START tokens; a mid-line
			// leftover (no indent) stays in the block and parses as the next
			// statement - `indent || 0` used to read it as indent 0 and end
			// the block. see INV047 / TODO #46(c)
			if (currentToken.indent !== undefined) {
				const currentIndent = currentToken.indent;

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
			}

			try {
				const stmt = this.statement();
				if (stmt) {
					body.push(stmt);
				} else {
					break;
				}
			} catch (e) {
				// Record and resume at the next block line - propagating the
				// throw killed every enclosing block and spilled the rest of
				// the outer body. Depth counters reset like synchronize().
				// see INV047 / TODO #46(c)
				const at = this.peek();
				this.parserErrors.push({
					line: at.line,
					column: at.column,
					message: e instanceof Error ? e.message : String(e),
				});
				this.parenDepth = 0;
				this.bracketDepth = 0;
				while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
					this.advance();
				}
			}
		}

		return body;
	}

	// Public so ExpressionParser can parse if-EXPRESSIONS
	// (`int m = if cond` ...) with the same machinery. see INV031
	public ifStatement(): AST.IfStatement {
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

		// A COMPLETE counted-for header followed by a wrap-continuation line
		// (indent not a multiple of 4 - INV017's rule) is TV's CE10161: the
		// continuation glues onto the header, breaking the statement
		// (`for i = 1 to 7` with a 5-space body line). Probed 2026-06-05 -
		// anchor at the `for` keyword; a 4-multiple body indent and a
		// genuinely wrapped header (expression continuing PAST the newline)
		// are both fine. Recovery: keep treating the lines as the body so
		// the rest of the file parses. see INV034
		if (this.check(TokenType.NEWLINE)) {
			const next = this.peekNext();
			if (
				next &&
				next.type !== TokenType.NEWLINE &&
				(next.indent ?? 0) % 4 !== 0 &&
				(next.indent ?? 0) > (startToken.indent ?? 0)
			) {
				this.parserErrors.push({
					line: startToken.line,
					column: startToken.column,
					message: 'Incorrect "for" statement. Expecting "to <expression>".',
				});
			}
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
			// Single-line function: same line as =>. Like inline switch
			// arms (TODO #33/#35), the body can be a comma-separated
			// statement sequence ending in the return value:
			//   f(x) => a := x, a * 2
			try {
				body.push(...this.parseInlineArrowBody());
			} catch (_e) {
				// Error parsing expression - function may be incomplete
			}
		} else {
			// Multi-line function: parse all statements at deeper indentation
			// Determine the expected function body indentation from the first token
			let functionBodyIndent: number | null = null;

			while (!this.isAtEnd()) {
				const currentToken = this.peek();

				// Skip NEWLINE tokens when determining function body boundaries
				if (currentToken.type === TokenType.NEWLINE) {
					this.advance();
					continue;
				}

				// The indent boundary checks apply only to LINE-START tokens
				// (only those carry an indent). A MID-LINE leftover token -
				// e.g. the `index` after `box_right = bar` parses on a mangled
				// line - used to read as indent 0 via `indent || 0` and END
				// the body, spilling every later body statement to top level
				// where the params were unresolvable. It stays in the body and
				// parses as the next statement. see INV047 / TODO #46(c)
				if (currentToken.indent !== undefined) {
					const currentIndent = currentToken.indent;

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
				}

				// Parse statement at this indentation level
				try {
					const stmt = this.statement();
					if (stmt) {
						body.push(stmt);
					} else {
						break;
					}
				} catch (e) {
					// Record the error and resume at the NEXT body line instead
					// of ending the body - breaking here spilled the remaining
					// body statements out of the param scope. The depth
					// counters get the same reset as synchronize() (a throw
					// mid-group leaves them stuck). see INV047 / TODO #46(c)
					const at = this.peek();
					this.parserErrors.push({
						line: at.line,
						column: at.column,
						message: e instanceof Error ? e.message : String(e),
					});
					this.parenDepth = 0;
					this.bracketDepth = 0;
					while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
						this.advance();
					}
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
		| AST.EnumDeclaration
		| AST.VariableDeclaration {
		// The `export` keyword starts the line, so its indent is the
		// declaration's base indent (the name token's is undefined).
		const exportToken = this.previous();
		const exportIndent = exportToken.indent ?? 0;

		// `export method <name>(...)` is a method declaration; `export
		// method(...)` is an exported function NAMED `method` (TV accepts it -
		// see INV069). Guard on the name+LPAREN shape, mirroring the non-export
		// INV051 guard; otherwise fall through to the function path below, which
		// now accepts `method` as the function name.
		if (
			this.check([TokenType.KEYWORD, ["method"]]) &&
			(this.peekNext()?.type === TokenType.IDENTIFIER ||
				this.peekNext()?.type === TokenType.KEYWORD) &&
			this.tokens[this.current + 2]?.type === TokenType.LPAREN
		) {
			this.advance();
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

		// Exported variable declaration (Pine v6 libraries). All four forms
		// PARSE - `export const int x = 1`, `export int x = 1`,
		// `export const x = 1`, `export x = 1` - but TV's SemanticAnalyzer
		// requires both a `const` modifier AND a type (the checker flags the
		// deficient ones; see INV052). Without this routing they fell into
		// the function path below and got a phantom "Expected function name
		// after 'export'" plus an undefined-variable cascade on the name.
		// A function is the only `export name(...)` form (IDENTIFIER + LPAREN).
		const asExportVar = (
			decl: AST.VariableDeclaration,
		): AST.VariableDeclaration => {
			decl.isExport = true;
			// TV anchors the exported-variable diagnostic at `export`, not at
			// the const/type/name token.
			decl.startLine = exportToken.line;
			decl.startColumn = exportToken.column;
			return decl;
		};
		// const-led: `export const [type] name = ...`
		if (this.match([TokenType.KEYWORD, ["const"]])) {
			return asExportVar(this.varDeclarationAfterKeyword());
		}
		// type-led: `export <type> name = ...` (only when the var shape
		// `type name =` follows - guards against anything funkier).
		if (this.isVarTypeKeyword() || this.isQualifiedVarTypeKeyword()) {
			const checkpoint = this.current;
			const typeStartToken = this.peek();
			let typeAnnotation = this.advance().value;
			if (this.isVarTypeKeyword()) {
				typeAnnotation += ` ${this.advance().value}`;
			}
			typeAnnotation += this.parseGenericTypeSuffix();
			if (
				this.check(TokenType.IDENTIFIER) &&
				this.peekNext()?.type === TokenType.ASSIGN
			) {
				return asExportVar(
					this.variableDeclaration(null, typeAnnotation, typeStartToken),
				);
			}
			this.current = checkpoint;
		}
		// bare: `export name = ...` (IDENTIFIER not followed by LPAREN).
		if (
			this.check(TokenType.IDENTIFIER) &&
			this.peekNext()?.type !== TokenType.LPAREN
		) {
			return asExportVar(
				this.variableDeclaration(null, undefined, this.peek()),
			);
		}

		// `export method(...)` - a function named `method` (the method-decl
		// shape was already routed above). `method` lexes as KEYWORD, so accept
		// it here as the function name; otherwise require an identifier. INV069.
		const nameToken =
			this.check([TokenType.KEYWORD, ["method"]]) &&
			this.peekNext()?.type === TokenType.LPAREN
				? this.advance()
				: this.consume(
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
		const fields: AST.TypeField[] = [];

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
					if (kind === "type" && isLineStart && currentToken.indent === bodyIndent) {
						const field = this.scanTypeFieldAtCurrent();
						if (field) fields.push(field);
					}

					// Enum field values must be STRING literals - TV's CE10125
					// ('Incorrect field type "LINEAR" of enum "Scale". Unexpected
					// type: "literal int". Expected type: "literal string"'),
					// anchored at the field name. Probed: int values error,
					// string values and bare fields are clean. see INV039
					if (
						kind === "enum" &&
						isLineStart &&
						currentToken.type === TokenType.IDENTIFIER
					) {
						const eq = this.tokens[this.current + 1];
						const val = this.tokens[this.current + 2];
						if (eq?.type === TokenType.ASSIGN && eq.value === "=" && val) {
							let badType: string | null = null;
							if (val.type === TokenType.NUMBER) {
								badType =
									/[.eE]/.test(val.value) && !/^0[xX]/.test(val.value)
										? "literal float"
										: "literal int";
							} else if (val.type === TokenType.BOOL) {
								badType = "literal bool";
							}
							if (badType) {
								this.parserErrors.push({
									line: currentToken.line,
									column: currentToken.column,
									message: `Incorrect field type "${currentToken.value}" of enum "${nameToken.value}". Unexpected type: "${badType}". Expected type: "literal string"`,
								});
							}
						}
					}
					this.advance();
				}
			}
		}

		return {
			type: kind === "type" ? "TypeDeclaration" : "EnumDeclaration",
			name: nameToken.value,
			fields: kind === "type" ? fields : undefined,
			line: nameToken.line,
			column: nameToken.column,
		} as AST.TypeDeclaration | AST.EnumDeclaration;
	}

	private scanTypeFieldAtCurrent(): AST.TypeField | null {
		let i = this.current;
		let typeName: string | undefined;
		const start = this.tokens[i];
		if (!start) return null;

		if (start.type === TokenType.KEYWORD && this.isTypeTokenAt(i)) {
			typeName = start.value;
			i++;
			const scanned = this.scanGenericTypeSuffixAt(i);
			typeName += scanned.suffix;
			i = scanned.next;
		} else if (start.type === TokenType.IDENTIFIER) {
			const next = this.tokens[i + 1];
			if (next?.type === TokenType.IDENTIFIER) {
				typeName = start.value;
				i++;
			} else if (
				next?.type === TokenType.DOT &&
				this.tokens[i + 2]?.type === TokenType.IDENTIFIER &&
				this.tokens[i + 3]?.type === TokenType.IDENTIFIER
			) {
				typeName = `${start.value}.${this.tokens[i + 2].value}`;
				i += 3;
			}
		}

		const fieldToken = this.tokens[i];
		if (!typeName || fieldToken?.type !== TokenType.IDENTIFIER) return null;
		return {
			name: fieldToken.value,
			typeAnnotation: { name: typeName },
			line: fieldToken.line,
			column: fieldToken.column,
		};
	}

	private isTypeTokenAt(index: number): boolean {
		const token = this.tokens[index];
		return (
			token?.type === TokenType.KEYWORD &&
			(VAR_TYPE_KEYWORDS as readonly string[]).includes(token.value)
		);
	}

	private scanGenericTypeSuffixAt(index: number): { suffix: string; next: number } {
		let i = index;
		let suffix = "";
		if (this.tokens[i]?.type === TokenType.COMPARE && this.tokens[i].value === "<") {
			let depth = 0;
			while (this.tokens[i] && this.tokens[i].type !== TokenType.EOF) {
				const token = this.tokens[i];
				suffix += token.value;
				if (token.type === TokenType.COMPARE && token.value === "<") depth++;
				if (token.type === TokenType.COMPARE && token.value === ">") {
					depth--;
					if (depth === 0) {
						i++;
						break;
					}
				}
				i++;
			}
		} else if (
			this.tokens[i]?.type === TokenType.LBRACKET &&
			this.tokens[i + 1]?.type === TokenType.RBRACKET
		) {
			suffix = "[]";
			i += 2;
		}
		return { suffix, next: i };
	}

	/**
	 * Parse method declaration: [export] method methodName(...) => ...
	 */
	private methodDeclaration(
		isExport: boolean,
		baseIndent = 0,
	): AST.MethodDeclaration {
		// The method name may be a plain IDENTIFIER or a reserved word - TV
		// accepts `method type(...)`, `method float(...)`, `method label(...)`
		// (probed INV051). Fall back to consume(IDENTIFIER) only to raise the
		// standard error when neither follows (e.g. `method => ...`).
		const nameToken =
			this.check(TokenType.IDENTIFIER) || this.check(TokenType.KEYWORD)
				? this.advance()
				: this.consume(
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
			// Single-line method: same line as =>. Comma-separated statement
			// units ending in the return value, like inline switch arms and
			// function bodies. see TODO #35.
			try {
				body.push(...this.parseInlineArrowBody());
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
		const cases: AST.SwitchCase[] = [];
		let switchIndent: number | null = null;

		while (!this.isAtEnd()) {
			// Skip newlines
			while (this.check(TokenType.NEWLINE)) {
				this.advance();
			}

			if (this.isAtEnd()) break;

			const currentToken = this.peek();

			// Indent boundaries apply only to LINE-START tokens (mid-line
			// leftovers carry no indent - see parseIndentedBlock / #46(c))
			if (currentToken.indent !== undefined) {
				const currentIndent = currentToken.indent;

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
			}

			// Check for default case (just =>)
			if (this.match(TokenType.ARROW)) {
				cases.push(this.parseSwitchCaseBody(switchIndent || 0));
				continue;
			}

			// Parse condition => result
			try {
				const condition = this.expression();
				// The => may LEAD the next line when its indent is a valid
				// wrap continuation (not a multiple of 4) - TV accepts the
				// condition-then-wrapped-arrow arm (probed INV047 p07, the
				// switch typed simple string). see TODO #46(d)
				if (this.check(TokenType.NEWLINE)) {
					const next = this.peekNext();
					if (next?.type === TokenType.ARROW && (next.indent ?? 0) % 4 !== 0) {
						this.advance();
					}
				}
				if (this.match(TokenType.ARROW)) {
					cases.push({
						condition,
						...this.parseSwitchCaseBody(switchIndent || 0),
					});
				} else {
					// Condition without a `=>` is not a valid arm. Record ONE
					// error and resume at the next line - abandoning the
					// whole switch made every later arm's `=>` an orphan
					// "Unexpected token: =>". see TODO #46(d)
					const at = this.peek();
					this.parserErrors.push({
						line: at.line,
						column: at.column,
						message: `Expected "=>" in switch case at line ${at.line}`,
					});
					while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
						this.advance();
					}
				}
			} catch (e) {
				// A throwing arm recovers the same way - record, reset the
				// depth counters (like synchronize), resume at the next line.
				const at = this.peek();
				this.parserErrors.push({
					line: at.line,
					column: at.column,
					message: e instanceof Error ? e.message : String(e),
				});
				this.parenDepth = 0;
				this.bracketDepth = 0;
				while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
					this.advance();
				}
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
	 *
	 * Binary operators are parsed with proper precedence (a small
	 * precedence climber over same-line tokens). The original flat
	 * left-associative loop mangled mixed expressions:
	 * `a < b and c < d` became `((a < b) and c) < d`, producing bogus
	 * "cannot apply '<' to bool and float" errors in switch arms.
	 */
	private parseSwitchDiscriminant(switchLine: number): AST.Expression {
		const saved = this.sameLineAnchor;
		this.sameLineAnchor = switchLine;
		try {
			return this.parseSameLineBinary(0);
		} finally {
			this.sameLineAnchor = saved;
		}
	}

	// Precedence levels for parseSameLineBinary, loosest first.
	private static readonly SAME_LINE_PRECEDENCE: ReadonlyArray<
		(token: Token) => boolean
	> = [
		(t) => t.type === TokenType.KEYWORD && t.value === "or",
		(t) => t.type === TokenType.KEYWORD && t.value === "and",
		(t) => t.type === TokenType.COMPARE,
		(t) => t.type === TokenType.PLUS || t.type === TokenType.MINUS,
		(t) =>
			t.type === TokenType.MULTIPLY ||
			t.type === TokenType.DIVIDE ||
			t.type === TokenType.MODULO,
	];

	// The line the restricted same-line parser is currently anchored to.
	// Advances when a wrap continuation (non-multiple-of-4 indent, see
	// INV017) carries the expression onto a new line, so wrapped switch
	// arms like `5 => f(a) + \n     f(b)` parse as one expression while
	// the next ARM (multiple-of-4 indent) still terminates it.
	private sameLineAnchor = 0;

	private parseSameLineBinary(level: number): AST.Expression {
		if (level >= Parser.SAME_LINE_PRECEDENCE.length) {
			return this.unary();
		}

		let expr = this.parseSameLineBinary(level + 1);
		const matches = Parser.SAME_LINE_PRECEDENCE[level];

		while (!this.isAtEnd()) {
			if (this.check(TokenType.NEWLINE)) {
				// Operator-leading wrap: `expr\n  + more`
				const next = this.peekNext();
				if (next && (next.indent ?? 0) % 4 !== 0 && matches(next)) {
					this.advance(); // consume the newline
					this.sameLineAnchor = next.line;
				} else {
					break;
				}
			}
			const currentToken = this.peek();
			if (currentToken.line !== this.sameLineAnchor || !matches(currentToken)) {
				break;
			}
			this.advance();
			// Operator-trailing wrap: `expr +\n  more`
			this.skipWrapContinuationNewline();
			this.sameLineAnchor = this.peek().line;
			const right = this.parseSameLineBinary(level + 1);
			expr = {
				type: "BinaryExpression",
				operator: currentToken.value,
				left: expr,
				right,
				line: expr.line,
				column: expr.column,
			};
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

		// Also handle ternary operator on the same line. The branches may
		// wrap onto continuation lines when their indent satisfies Pine's
		// wrap rule (not a multiple of 4 - INV017); TV accepts a trailing-`?`
		// arm whose branches sit on the next lines (probed INV047 p06, SW
		// typed const string). Each join re-anchors the restricted parser to
		// the continuation line.
		if (
			!this.check(TokenType.NEWLINE) &&
			!this.isAtEnd() &&
			this.peek().line === line &&
			this.match(TokenType.TERNARY)
		) {
			const consequentLine = this.skipArmWrapNewline(line);
			const consequent = this.parseSingleLineExpression(consequentLine);
			// A leading `:` on a valid continuation line joins too
			if (this.check(TokenType.NEWLINE)) {
				const next = this.peekNext();
				if (
					next &&
					next.type === TokenType.COLON &&
					(next.indent ?? 0) % 4 !== 0
				) {
					this.advance();
				}
			}
			this.consume(TokenType.COLON, 'Expected ":" in ternary expression');
			const alternateLine = this.skipArmWrapNewline(consequentLine);
			const alternate = this.parseSingleLineExpression(alternateLine);
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

	private parseInlineSwitchArmExpression(line: number): AST.Expression {
		let expr = this.parseSingleLineExpression(line);
		while (true) {
			let i = this.current;
			if (this.check(TokenType.NEWLINE)) {
				while (this.tokens[i]?.type === TokenType.NEWLINE) i++;
			}
			const op = this.tokens[i];
			if (
				!op ||
				op.type === TokenType.EOF ||
				(op.indent ?? 0) % 4 === 0 ||
				!Parser.SAME_LINE_PRECEDENCE.some((matches) => matches(op))
			) {
				break;
			}
			this.current = i;
			const opToken = this.advance();
			const right = this.parseSingleLineExpression(opToken.line);
			expr = {
				type: "BinaryExpression",
				operator: opToken.value,
				left: expr,
				right,
				line: expr.line,
				column: expr.column,
			};
		}
		return expr;
	}

	// Consume a newline after a trailing operator inside a switch-arm
	// expression when the next line is a valid wrap continuation (indent
	// not a multiple of 4 - INV017). Returns the line the expression
	// continues on, so the restricted same-line parser re-anchors there.
	// see INV047 p06 / TODO #46(c)
	private skipArmWrapNewline(line: number): number {
		if (this.check(TokenType.NEWLINE)) {
			const next = this.peekNext();
			if (next && next.type !== TokenType.EOF && (next.indent ?? 0) % 4 !== 0) {
				this.advance();
				return next.line;
			}
		}
		return line;
	}

	/**
	 * Parse a switch case body, returning the arm's value expression plus,
	 * when the arm carries statements, the full statement list (so the
	 * analyzers can walk assignments/declarations the value expression
	 * alone doesn't contain). Handles:
	 *     condition => expr
	 *     condition => target := expr        (inline statement, see TODO #33)
	 *     => f(...), na                      (inline comma sequence)
	 *     condition =>                       (multi-line block)
	 *         stmt1
	 *         resultExpr
	 */
	private parseSwitchCaseBody(caseIndent: number): {
		result: AST.Expression;
		statements?: AST.Statement[];
	} {
		const arrowToken = this.previous();

		// Check if there's content on the same line as =>
		if (!this.check(TokenType.NEWLINE) && !this.isAtEnd()) {
			return this.parseInlineSwitchCaseBody(arrowToken);
		}

		// Multi-line case body: parse statements until indentation decreases
		// Skip newlines after =>
		while (this.check(TokenType.NEWLINE)) {
			this.advance();
		}

		if (this.isAtEnd()) {
			// No body after =>, return na as placeholder
			return {
				result: {
					type: "Identifier",
					name: "na",
					line: arrowToken.line,
					column: arrowToken.column,
				},
			};
		}

		// Get the body indentation (should be greater than case indentation)
		const firstBodyToken = this.peek();
		const bodyIndent = firstBodyToken.indent || 0;

		// If not more indented than case, treat as empty body
		if (bodyIndent <= caseIndent) {
			return {
				result: {
					type: "Identifier",
					name: "na",
					line: arrowToken.line,
					column: arrowToken.column,
				},
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

			// Indent boundary applies only to LINE-START tokens (mid-line
			// leftovers carry no indent - see parseIndentedBlock / #46(c))
			if (currentToken.indent !== undefined) {
				// Stop if indentation has decreased to or below case level
				// (back at case level means we're at the next case)
				if (currentToken.indent <= caseIndent) {
					break;
				}
			}

			// Parse the next statement
			try {
				const stmt = this.statement();
				if (stmt) {
					bodyStatements.push(stmt);
				} else {
					break;
				}
			} catch (e) {
				// Record and resume at the next body line (see
				// parseIndentedBlock / #46(c)-(d))
				const at = this.peek();
				this.parserErrors.push({
					line: at.line,
					column: at.column,
					message: e instanceof Error ? e.message : String(e),
				});
				this.parenDepth = 0;
				this.bracketDepth = 0;
				while (!this.isAtEnd() && !this.check(TokenType.NEWLINE)) {
					this.advance();
				}
			}
		}

		if (bodyStatements.length === 0) {
			return {
				result: {
					type: "Identifier",
					name: "na",
					line: arrowToken.line,
					column: arrowToken.column,
				},
			};
		}

		return {
			result: this.armResultExpression(bodyStatements),
			statements: bodyStatements,
		};
	}

	/**
	 * Parse an inline switch case body: one or more comma-separated
	 * statements on the same line as the `=>`. Each unit is an expression
	 * optionally followed by an assignment operator (`x := y`, `k += 1`).
	 * Uses restricted single-line expression parsing so the body doesn't
	 * continue across newlines into the next case. see TODO #33.
	 */
	private parseInlineSwitchCaseBody(arrowToken: Token): {
		result: AST.Expression;
		statements?: AST.Statement[];
	} {
		const statements: AST.Statement[] = [];
		let anchorLine = arrowToken.line;

		for (;;) {
			statements.push(
				this.parseInlineStatementUnit(() =>
					this.parseInlineSwitchArmExpression(anchorLine),
				),
			);
			if (!this.match(TokenType.COMMA)) {
				break;
			}
			if (this.check(TokenType.NEWLINE) || this.isAtEnd()) {
				// A trailing comma may CONTINUE the unit list on a following
				// line (blank lines between allowed) when that line is a
				// valid wrap continuation (indent not a multiple of 4 -
				// INV017). TV accepts multi-line comma-separated arm bodies
				// (`true => f(...),` / blank / `   g(...)` - the b16b3948…
				// fixture lints 0 on TV). A multiple-of-4 line is the next
				// arm / statement - the comma is just trailing
				// (`'25' => 1 ,`), tolerate and stop. see TODO #46(d)
				let i = this.current;
				while (this.tokens[i]?.type === TokenType.NEWLINE) i++;
				const next = this.tokens[i];
				if (
					next &&
					next.type !== TokenType.EOF &&
					(next.indent ?? 0) % 4 !== 0
				) {
					this.current = i;
					anchorLine = next.line;
				} else {
					break;
				}
			}
		}

		const lastStmt = statements[statements.length - 1];

		// A lone expression arm carries no statement information beyond its
		// result - omit `statements` so walkers don't visit it twice.
		if (statements.length === 1 && lastStmt.type === "ExpressionStatement") {
			return { result: lastStmt.expression };
		}

		return { result: this.armResultExpression(statements), statements };
	}

	/**
	 * Parse an inline (same line as `=>`) function/method body: one or
	 * more comma-separated statement units, the LAST becoming the return
	 * value. `f(x) => a := x, a * 2` yields
	 * [AssignmentStatement, ReturnStatement(a * 2)]. see TODO #35.
	 */
	private parseInlineArrowBody(): AST.Statement[] {
		const statements: AST.Statement[] = [];

		for (;;) {
			statements.push(this.parseInlineStatementUnit(() => this.expression()));
			if (!this.match(TokenType.COMMA)) {
				break;
			}
			// Tolerate a trailing comma at end of line
			if (this.check(TokenType.NEWLINE) || this.isAtEnd()) {
				break;
			}
		}

		// The last unit is the function's return value
		const lastStmt = statements[statements.length - 1];
		if (lastStmt.type === "ExpressionStatement") {
			statements[statements.length - 1] = {
				type: "ReturnStatement",
				value: lastStmt.expression,
				line: lastStmt.line,
				column: lastStmt.column,
			};
		}
		return statements;
	}

	/**
	 * Parse one inline statement unit: an expression optionally followed
	 * by an assignment operator. `name = expr` DECLARES (Pine's `=`), so
	 * it yields a VariableDeclaration - emitting an AssignmentStatement
	 * there left the name undeclared and produced "Undefined variable"
	 * errors on later uses. `:=`/compound ops yield AssignmentStatement.
	 */
	private parseInlineStatementUnit(
		parseExpr: () => AST.Expression,
	): AST.Statement {
		const expr = parseExpr();
		if (this.check(TokenType.ASSIGN) || this.check(TokenType.COMPOUND_ASSIGN)) {
			const opToken = this.advance();
			const value = parseExpr();
			if (
				opToken.type === TokenType.ASSIGN &&
				opToken.value === "=" &&
				expr.type === "Identifier"
			) {
				return {
					type: "VariableDeclaration",
					name: expr.name,
					varType: null,
					init: value,
					line: expr.line,
					column: expr.column,
				};
			}
			return {
				type: "AssignmentStatement",
				target: expr,
				operator: opToken.value,
				value,
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
	 * Derive a switch arm's value expression from its statement list: the
	 * last statement's expression/value/init, or `na` when the last
	 * statement has no value form.
	 */
	private armResultExpression(statements: AST.Statement[]): AST.Expression {
		const lastStmt = statements[statements.length - 1];
		if (lastStmt.type === "ExpressionStatement") {
			return lastStmt.expression;
		}
		if (lastStmt.type === "AssignmentStatement") {
			return lastStmt.value;
		}
		if (lastStmt.type === "VariableDeclaration" && lastStmt.init) {
			return lastStmt.init;
		}
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
	 * Check for a `series`/`simple` qualifier directly followed by a base
	 * type keyword - the qualifier-led declaration form
	 * (`series bool x = ...`). Callers consume the qualifier and fold it
	 * into the annotation; mapToPineType understands the combined string
	 * ("series bool" -> series<bool>). see INV024.
	 */
	private isQualifiedVarTypeKeyword(): boolean {
		if (!this.check([TokenType.KEYWORD, ["series", "simple"]])) {
			return false;
		}
		const next = this.peekNext();
		return (
			next?.type === TokenType.KEYWORD &&
			(VAR_TYPE_KEYWORDS as readonly string[]).includes(next.value)
		);
	}

	/**
	 * Parse generic type syntax like <float>, <int>, <array<float>>, including array[] syntax.
	 * Returns the suffix to append to the base type, or empty string if no generic syntax found.
	 */
	private parseGenericTypeSuffix(): string {
		// Check for generic type syntax: array<float>, matrix<int>,
		// map<string, float>, array<chart.point>, nested generics. Consume
		// until the matching `>` with depth counting - the same approach as
		// the function-param type parser, which handles commas and dotted
		// member types that a token-by-token whitelist missed.
		if (this.check(TokenType.COMPARE) && this.peek().value === "<") {
			this.advance(); // consume <
			let suffix = "<";
			let depth = 1;
			while (!this.isAtEnd() && depth > 0) {
				const token = this.advance();
				if (token.type === TokenType.COMPARE && token.value === "<") {
					depth++;
				} else if (token.type === TokenType.COMPARE && token.value === ">") {
					depth--;
				}
				suffix += token.value;
				// Add space after comma for readability
				if (token.type === TokenType.COMMA && depth > 0) {
					suffix += " ";
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

			// The param's first token - if a type annotation results, this is
			// where it starts (TV anchors CE10149 there). see INV033
			const paramStartTok = this.peek();

			// Parse type annotation and parameter name
			// Pine Script supports:
			// - paramName (simple)
			// - type paramName (e.g., float source)
			// - qualifier type paramName (e.g., simple int length, series float price)
			// - type keywords as param names (e.g., color = color.white)

			// Collect type keywords (qualifiers and base types)
			const typeKeywords: string[] = [];
			// `const` qualifier on a UDF param (`f(const int x)`) is valid
			// Pine - TV lints it clean. `const` stays out of TYPE_KEYWORDS
			// (a bare `const` is not a type name), so consume the qualifier
			// here; the base type follows through the normal loop and the
			// checker strips the prefix (invalidAnnotationBase).
			if (
				this.check([TokenType.KEYWORD, ["const"]]) &&
				(this.peekNext()?.type === TokenType.KEYWORD ||
					this.peekNext()?.type === TokenType.IDENTIFIER)
			) {
				typeKeywords.push(this.advance().value);
			}
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
					next?.type === TokenType.DOT &&
					this.tokens[this.current + 2]?.type === TokenType.IDENTIFIER
				) {
					// Qualifier + namespaced type: `series chart.point p`
					let dotted = this.advance().value;
					this.advance(); // consume .
					dotted += `.${this.advance().value}`;
					typeKeywords.push(dotted);
				} else if (
					next?.type === TokenType.IDENTIFIER ||
					next?.type === TokenType.KEYWORD ||
					// Qualifier + IDENTIFIER-type + array suffix:
					// `simple linefill[] arr`. Built-in object types that aren't
					// hardcoded type-keywords (linefill, polyline) and import-alias
					// types lex as IDENTIFIER, so the qualifier loop above stops at
					// them; without LBRACKET here the type identifier is mistaken
					// for the param name and the `[` fails ("Expected ')' after
					// function parameters"). The `[]` is then glued on just below.
					// see INV068 (`line[]`/`label[]` already worked - those ARE
					// type-keywords consumed by the qualifier loop).
					next?.type === TokenType.LBRACKET
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
				typeAnnotation = {
					name: typeKeywords.join(" "),
					line: paramStartTok?.line,
					column: paramStartTok?.column,
				};
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
				let typeName = firstIdent.value;

				// `ns.Type name` - namespaced type (`chart.point start`,
				// `lib.MyType x` from an import alias)
				if (
					this.check(TokenType.DOT) &&
					this.peekNext()?.type === TokenType.IDENTIFIER
				) {
					this.advance(); // consume .
					typeName += `.${this.advance().value}`;
				}

				// `UserType[] name` - array suffix on a user-defined type
				// (`barInfo[] biList`). Same shape INV004 fixed for built-in
				// types, in the user-type path.
				if (
					this.check(TokenType.LBRACKET) &&
					this.peekNext()?.type === TokenType.RBRACKET
				) {
					this.advance(); // consume [
					this.advance(); // consume ]
					typeName += "[]";
				}

				// Check if next token is an identifier (then first was type,
				// second is name; keywords are usable as param names)
				if (this.check(TokenType.IDENTIFIER) || this.check(TokenType.KEYWORD)) {
					typeAnnotation = {
						name: typeName,
						line: paramStartTok?.line,
						column: paramStartTok?.column,
					};
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
				line: paramStartTok?.line,
				column: paramStartTok?.column,
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
		// A statement that throws mid-group (e.g. a call argument list torn
		// open by a broken string literal) leaves the depth counters where
		// the throw happened. Sync lands at a top-level statement boundary,
		// where depth is 0 by construction - leaving it positive disabled
		// the between-statements NEWLINE skip for the REST of the file and
		// quietly re-routed later `name = expr` declarations through the
		// assignment path (undeclared-variable cascades). see INV047
		this.parenDepth = 0;
		this.bracketDepth = 0;
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
