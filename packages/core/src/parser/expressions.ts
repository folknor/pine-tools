// Expression-precedence parsing for Pine Script.
//
// Extracted from parser.ts to keep that file at a navigable size. The
// 11 expression methods (expression / ternary / logicalOr / logicalAnd
// / comparison / addition / multiplication / unary / postfix /
// finishCall / primary) live here as methods on `ExpressionParser`,
// which is owned by `Parser` and shares its mutable token-stream state
// (tokens, current, parenDepth, bracketDepth) through the public
// surface of Parser.
//
// Token helpers and `switchExpression` are public on Parser so this
// module can call them via `this.p.X`. Mutual recursion among
// expression methods stays on `this` (calls into ExpressionParser).

import type * as AST from "./ast";
import { type Token, TokenType } from "./lexer";
import type { Parser } from "./parser";

export class ExpressionParser {
	constructor(public p: Parser) {}

	// Operator line-wrap lookahead. A wrapped continuation may carry BLANK
	// LINES between the operand line and the operator line - TV joins them
	// (probed: INV027 ternary `?`, INV030 logical `or`) - so look past
	// consecutive NEWLINEs, not just one. When the first real token
	// satisfies `matches`, consume the newlines and report a continuation;
	// otherwise consume nothing.
	//
	// The blank-line path (more than one NEWLINE) additionally requires the
	// operator line to satisfy Pine's wrap-indent rule (indent not a
	// multiple of 4 - see INV017): without it, a switch arm like `    -1 =>`
	// after a blank line reads as a `- 1` continuation of the previous
	// arm's body. The single-NEWLINE path keeps its historical leniency.
	private skipWrapNewlines(matches: (t: Token) => boolean): boolean {
		if (!this.p.check(TokenType.NEWLINE)) return false;
		let i = this.p.current;
		while (this.p.tokens[i]?.type === TokenType.NEWLINE) i++;
		const tok = this.p.tokens[i];
		if (!tok || !matches(tok)) return false;
		const newlines = i - this.p.current;
		if (newlines > 1 && (tok.indent ?? 0) % 4 === 0) return false;
		while (this.p.check(TokenType.NEWLINE)) {
			this.p.advance();
		}
		return true;
	}

	expression(): AST.Expression {
		return this.ternary();
	}

	ternary(): AST.Expression {
		const expr = this.logicalOr();

		// Handle line continuation: newline(s) followed by ? (ternary operator
		// at line start). see skipWrapNewlines / INV027
		this.skipWrapNewlines((t) => t.type === TokenType.TERNARY);

		if (this.p.match(TokenType.TERNARY)) {
			// Skip newlines after ? for multi-line ternary
			while (this.p.check(TokenType.NEWLINE)) {
				this.p.advance();
			}
			const consequent = this.expression();
			// Skip newlines before : for multi-line ternary (when consequent ends on previous line)
			while (this.p.check(TokenType.NEWLINE)) {
				this.p.advance();
			}
			this.p.consume(TokenType.COLON, 'Expected ":" in ternary expression');
			// Skip newlines after : for multi-line ternary
			while (this.p.check(TokenType.NEWLINE)) {
				this.p.advance();
			}
			const alternate = this.expression();

			return {
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

	logicalOr(): AST.Expression {
		let expr = this.logicalAnd();

		while (true) {
			// Skip newlines (incl. blank lines - see skipWrapNewlines) that
			// are line continuations: next real token is 'or'
			if (
				this.p.check(TokenType.NEWLINE) &&
				!this.skipWrapNewlines(
					(t) => t.type === TokenType.KEYWORD && t.value === "or",
				)
			) {
				break; // Not a continuation, end the expression
			}

			if (this.p.match([TokenType.KEYWORD, ["or"]])) {
				const operator = this.p.previous().value;
				// Skip newlines after operator (line continuation)
				while (this.p.check(TokenType.NEWLINE)) {
					this.p.advance();
				}
				const right = this.logicalAnd();
				expr = {
					type: "BinaryExpression",
					operator,
					left: expr,
					right,
					line: expr.line,
					column: expr.column,
				};
			} else {
				break;
			}
		}

		return expr;
	}

	logicalAnd(): AST.Expression {
		let expr = this.comparison();

		while (true) {
			// Skip newlines (incl. blank lines - see skipWrapNewlines) that
			// are line continuations: next real token is 'and'
			if (
				this.p.check(TokenType.NEWLINE) &&
				!this.skipWrapNewlines(
					(t) => t.type === TokenType.KEYWORD && t.value === "and",
				)
			) {
				break; // Not a continuation, end the expression
			}

			if (this.p.match([TokenType.KEYWORD, ["and"]])) {
				const operator = this.p.previous().value;
				// Skip newlines after operator (line continuation)
				while (this.p.check(TokenType.NEWLINE)) {
					this.p.advance();
				}
				const right = this.comparison();
				expr = {
					type: "BinaryExpression",
					operator,
					left: expr,
					right,
					line: expr.line,
					column: expr.column,
				};
			} else {
				break;
			}
		}

		return expr;
	}

	comparison(): AST.Expression {
		let expr = this.addition();

		while (true) {
			// Skip newlines (incl. blank lines - see skipWrapNewlines) that
			// are line continuations: next real token is a comparison operator
			if (
				this.p.check(TokenType.NEWLINE) &&
				!this.skipWrapNewlines((t) => t.type === TokenType.COMPARE)
			) {
				break; // Not a continuation, end the expression
			}

			if (this.p.match(TokenType.COMPARE)) {
				const operator = this.p.previous().value;
				// Skip newlines after operator (line continuation)
				while (this.p.check(TokenType.NEWLINE)) {
					this.p.advance();
				}
				const right = this.addition();
				expr = {
					type: "BinaryExpression",
					operator,
					left: expr,
					right,
					line: expr.line,
					column: expr.column,
				};
			} else {
				break;
			}
		}

		return expr;
	}

	addition(): AST.Expression {
		let expr = this.multiplication();

		while (true) {
			// Skip newlines (incl. blank lines - see skipWrapNewlines) that
			// are line continuations: next real token is + or -
			if (
				this.p.check(TokenType.NEWLINE) &&
				!this.skipWrapNewlines(
					(t) => t.type === TokenType.PLUS || t.type === TokenType.MINUS,
				)
			) {
				break; // Not a continuation, end the expression
			}

			if (this.p.match(TokenType.PLUS, TokenType.MINUS)) {
				const operator = this.p.previous().value;
				// Skip newlines after operator (line continuation)
				while (this.p.check(TokenType.NEWLINE)) {
					this.p.advance();
				}
				const right = this.multiplication();
				expr = {
					type: "BinaryExpression",
					operator,
					left: expr,
					right,
					line: expr.line,
					column: expr.column,
				};
			} else {
				break;
			}
		}

		return expr;
	}

	multiplication(): AST.Expression {
		let expr = this.unary();

		while (true) {
			// Skip newlines (incl. blank lines - see skipWrapNewlines) that
			// are line continuations: next real token is *, /, or % - OR we
			// just processed a '/' and the next real token starts an operand
			if (
				this.p.check(TokenType.NEWLINE) &&
				!this.skipWrapNewlines(
					(t) =>
						t.type === TokenType.MULTIPLY ||
						t.type === TokenType.DIVIDE ||
						t.type === TokenType.MODULO ||
						(this.p.previous().type === TokenType.DIVIDE &&
							(t.type === TokenType.IDENTIFIER ||
								t.type === TokenType.NUMBER ||
								t.type === TokenType.LPAREN)),
				)
			) {
				break; // Not a continuation, end the expression
			}

			if (
				this.p.match(TokenType.MULTIPLY, TokenType.DIVIDE, TokenType.MODULO)
			) {
				const operator = this.p.previous().value;
				// Skip newlines after operator (line continuation)
				while (this.p.check(TokenType.NEWLINE)) {
					this.p.advance();
				}
				const right = this.unary();
				expr = {
					type: "BinaryExpression",
					operator,
					left: expr,
					right,
					line: expr.line,
					column: expr.column,
				};
			} else {
				break;
			}
		}

		return expr;
	}

	unary(): AST.Expression {
		// Skip newlines that are clearly line continuations in expressions
		// This handles cases where binary operators span multiple lines
		if (this.p.check(TokenType.NEWLINE)) {
			const nextToken = this.p.peekNext();
			// If next token suggests continuation (identifier, number, paren, unary op), skip newline
			if (
				nextToken &&
				(nextToken.type === TokenType.IDENTIFIER ||
					nextToken.type === TokenType.NUMBER ||
					nextToken.type === TokenType.LPAREN ||
					nextToken.type === TokenType.MINUS ||
					(nextToken.type === TokenType.KEYWORD && nextToken.value === "not"))
			) {
				this.p.advance(); // skip newline
			}
		}

		if (
			this.p.match(TokenType.MINUS) ||
			this.p.match(TokenType.PLUS) || // unary plus: `+1`
			this.p.match([TokenType.KEYWORD, ["not"]])
		) {
			const operator = this.p.previous().value;
			const right = this.unary();
			return {
				type: "UnaryExpression",
				operator,
				argument: right,
				line: this.p.previous().line,
				column: this.p.previous().column,
			};
		}

		return this.postfix();
	}

	postfix(): AST.Expression {
		let expr = this.primary();

		while (true) {
			// Allow line continuation for expressions (except for certain cases)
			// Skip newlines but allow continuation if we're in the middle of an expression
			if (this.p.check(TokenType.NEWLINE)) {
				// Check if the next token after newline suggests continuation
				const nextToken = this.p.peekNext();

				// A wrapped continuation line must NOT be indented by a
				// multiple of 4 - that is Pine's own line-wrapping rule
				// (a multiple-of-4 indent means a block statement, e.g. a
				// switch arm or an if body). Without this check, an arm
				// like `cond => 1` followed by `(a - b) > 2 => ...` glued
				// into the call `1(a - b)`. TV rejects multiple-of-4 wraps
				// (CE10013) - probes in INV017. see INV017.
				const continuationIndent = (nextToken?.indent ?? 0) % 4 !== 0;

				// Allow continuation if next token is an operator, function call, or dot access
				// But break if it looks like a new statement (LBRACKET is always treated as new statement)
				if (
					nextToken &&
					continuationIndent &&
					(nextToken.type === TokenType.MULTIPLY ||
						nextToken.type === TokenType.DIVIDE ||
						nextToken.type === TokenType.PLUS ||
						nextToken.type === TokenType.MINUS ||
						nextToken.type === TokenType.COMPARE ||
						(nextToken.type === TokenType.KEYWORD &&
							["and", "or"].includes(nextToken.value)) ||
						nextToken.type === TokenType.LPAREN ||
						nextToken.type === TokenType.DOT)
				) {
					// Skip the newline and continue
					this.p.advance();
				} else if (this.p.parenDepth === 0 && this.p.bracketDepth === 0) {
					// Not in parentheses/brackets and doesn't look like continuation - break
					break;
				} else {
					// In parentheses or brackets - allow continuation by skipping newline
					this.p.advance();
				}
			}

			// Handle generic type arguments: array.new<float>()
			if (this.p.check(TokenType.COMPARE) && this.p.peek().value === "<") {
				// Look ahead to see if this is a generic type argument (followed by identifier and >)
				const savedPos = this.p.current;
				this.p.advance(); // consume <

				// Collect type arguments
				const typeArgs: string[] = [];

				// Consume type identifier(s) - could be "float", "int", "box", "chart.point", etc.
				// Also handles map<key, value> syntax with multiple type arguments
				if (
					this.p.check(TokenType.IDENTIFIER) ||
					this.p.check(TokenType.KEYWORD)
				) {
					while (true) {
						let typeArg = this.p.advance().value;

						// Handle dotted type names like chart.point
						while (this.p.check(TokenType.DOT)) {
							this.p.advance(); // consume .
							if (
								this.p.check(TokenType.IDENTIFIER) ||
								this.p.check(TokenType.KEYWORD)
							) {
								typeArg += `.${this.p.advance().value}`;
							}
						}

						// Handle nested generics like array<array<float>>
						while (
							this.p.check(TokenType.COMPARE) &&
							this.p.peek().value === "<"
						) {
							typeArg += "<";
							this.p.advance();
							if (
								this.p.check(TokenType.IDENTIFIER) ||
								this.p.check(TokenType.KEYWORD)
							) {
								typeArg += this.p.advance().value;
								// Handle dotted type names in nested generics
								while (this.p.check(TokenType.DOT)) {
									this.p.advance();
									if (
										this.p.check(TokenType.IDENTIFIER) ||
										this.p.check(TokenType.KEYWORD)
									) {
										typeArg += `.${this.p.advance().value}`;
									}
								}
							}
							if (
								this.p.check(TokenType.COMPARE) &&
								this.p.peek().value === ">"
							) {
								typeArg += ">";
								this.p.advance();
							}
						}

						typeArgs.push(typeArg);

						// Check for another type argument (comma followed by identifier/keyword)
						if (!this.p.check(TokenType.COMMA)) {
							break;
						}
						this.p.advance();
						if (
							!(
								this.p.check(TokenType.IDENTIFIER) ||
								this.p.check(TokenType.KEYWORD)
							)
						) {
							break;
						}
						// Continue loop to parse the next type arg
					}

					// Consume closing >
					if (this.p.check(TokenType.COMPARE) && this.p.peek().value === ">") {
						this.p.advance();
						// Now should see ( for function call
						if (this.p.match(TokenType.LPAREN)) {
							this.p.parenDepth++; // Increment before finishCall (which decrements)
							expr = this.finishCall(expr, typeArgs);
							continue;
						}
					}
				}
				// If pattern didn't match, restore position
				this.p.current = savedPos;
			}

			if (this.p.match(TokenType.LPAREN)) {
				// Function call
				this.p.parenDepth++; // Increment depth when opening parenthesis
				expr = this.finishCall(expr);
			} else if (this.p.match(TokenType.DOT)) {
				// Member access - property can be identifier or keyword (e.g., input.float)
				let property: Token;
				if (this.p.check(TokenType.IDENTIFIER)) {
					property = this.p.advance();
				} else if (this.p.check(TokenType.KEYWORD)) {
					property = this.p.advance();
				} else {
					throw new Error(
						`Expected property name at line ${this.p.peek().line}`,
					);
				}
				expr = {
					type: "MemberExpression",
					object: expr,
					property: {
						type: "Identifier",
						name: property.value,
						line: property.line,
						column: property.column,
					},
					line: expr.line,
					column: expr.column,
				};
			} else if (this.p.check(TokenType.LBRACKET)) {
				// A [ that follows a statement-level line break is a new
				// statement (tuple declaration or tuple return), not subscript
				// access. The tell is a NEWLINE token directly before it: the
				// lexer only emits NEWLINE at bracket depth 0, so a wrapped
				// subscript inside parens (`f(...)\n  [1])`) has none, while an
				// indented tuple line after e.g. a switch arm sits behind the
				// NEWLINEs its block loop consumed. (A column-1 check misses
				// the indented-tuple case.)
				if (this.p.previous().type === TokenType.NEWLINE) {
					break;
				}
				this.p.advance(); // consume [
				// Array/index access
				const index = this.expression();
				this.p.consume(TokenType.RBRACKET, 'Expected "]"');
				expr = {
					type: "IndexExpression",
					object: expr,
					index,
					line: expr.line,
					column: expr.column,
				};
			} else {
				break;
			}
		}

		return expr;
	}

	finishCall(
		callee: AST.Expression,
		typeArguments?: string[],
	): AST.CallExpression {
		const args: AST.CallArgument[] = [];

		if (!this.p.check(TokenType.RPAREN)) {
			do {
				// Skip newlines between arguments
				while (this.p.check(TokenType.NEWLINE)) {
					this.p.advance();
				}

				// Check for named argument: name = value
				// Allow both IDENTIFIER and KEYWORD as parameter names (Pine Script uses keywords like 'color', 'title', etc. as parameter names)
				// Also handle line continuation: name\n= value
				let nextTok = this.p.peekNext();
				if (nextTok?.type === TokenType.NEWLINE) {
					// Look past the newline to check for =
					const afterNewline = this.p.tokens[this.p.current + 2];
					if (afterNewline?.type === TokenType.ASSIGN) {
						nextTok = afterNewline;
					}
				}
				if (
					(this.p.check(TokenType.IDENTIFIER) ||
						this.p.check(TokenType.KEYWORD)) &&
					nextTok?.type === TokenType.ASSIGN
				) {
					const name = this.p.advance().value;
					// Skip newlines before = (allows: arg\n= value)
					while (this.p.check(TokenType.NEWLINE)) {
						this.p.advance();
					}
					this.p.advance(); // consume =
					// Skip newlines after = (allows: arg =\n value)
					while (this.p.check(TokenType.NEWLINE)) {
						this.p.advance();
					}
					const value = this.expression();
					args.push({ name, value });
				} else {
					// Positional argument
					const value = this.expression();
					args.push({ value });
				}

				// Skip newlines after argument
				while (this.p.check(TokenType.NEWLINE)) {
					this.p.advance();
				}
			} while (this.p.match(TokenType.COMMA));
		}

		// Provide helpful error message for common mistakes
		if (!this.p.check(TokenType.RPAREN)) {
			// Check if this looks like another argument (missing comma)
			const current = this.p.peek();
			const next = this.p.peekNext();
			if (
				(current?.type === TokenType.IDENTIFIER ||
					current?.type === TokenType.KEYWORD) &&
				next?.type === TokenType.ASSIGN
			) {
				throw new Error(
					`Missing comma before '${current.value}' argument at line ${current.line}`,
				);
			}
			// Check for two identifiers in a row (e.g., "bar index" instead of "bar_index")
			// After parsing "bar" as expression, we're at "index" - check if previous was also identifier
			const prev = this.p.previous();
			if (
				prev?.type === TokenType.IDENTIFIER &&
				current?.type === TokenType.IDENTIFIER
			) {
				throw new Error(
					`Unexpected identifier '${current.value}' - did you mean '${prev.value}_${current.value}'? At line ${current.line}`,
				);
			}
		}
		const rparen = this.p.consume(
			TokenType.RPAREN,
			'Expected ")" after arguments',
		);
		this.p.parenDepth--; // Decrement depth when closing parenthesis

		const callExpr: AST.CallExpression = {
			type: "CallExpression",
			callee,
			arguments: args,
			line: callee.line,
			column: callee.column,
			endLine: rparen.line,
			endColumn: rparen.column,
		};

		if (typeArguments && typeArguments.length > 0) {
			callExpr.typeArguments = typeArguments;
		}

		return callExpr;
	}

	primary(): AST.Expression {
		// Literals
		if (this.p.match(TokenType.NUMBER)) {
			const token = this.p.previous();
			return {
				type: "Literal",
				value: parseFloat(token.value),
				raw: token.value,
				line: token.line,
				column: token.column,
			};
		}

		if (this.p.match(TokenType.STRING)) {
			const token = this.p.previous();
			return {
				type: "Literal",
				value: token.value,
				raw: token.value,
				line: token.line,
				column: token.column,
			};
		}

		if (this.p.match(TokenType.BOOL)) {
			const token = this.p.previous();
			return {
				type: "Literal",
				value: token.value === "true",
				raw: token.value,
				line: token.line,
				column: token.column,
			};
		}

		if (this.p.match(TokenType.COLOR)) {
			const token = this.p.previous();
			return {
				type: "Literal",
				value: token.value, // Keep hex color as string (e.g., "#d8e3ac")
				raw: token.value,
				line: token.line,
				column: token.column,
			};
		}

		// Parse 'na' as an Identifier so it works both as a constant and function call
		// The analyzer handles na() returning bool and na as a constant value
		if (this.p.match([TokenType.KEYWORD, ["na"]])) {
			const token = this.p.previous();
			return {
				type: "Identifier",
				name: "na",
				line: token.line,
				column: token.column,
			};
		}

		// Switch expression (can appear as value in variable declaration)
		if (this.p.match([TokenType.KEYWORD, ["switch"]])) {
			return this.p.switchExpression();
		}

		// Identifier
		if (this.p.match(TokenType.IDENTIFIER) || this.p.match(TokenType.KEYWORD)) {
			const token = this.p.previous();
			return {
				type: "Identifier",
				name: token.value,
				line: token.line,
				column: token.column,
			};
		}

		// Grouping
		if (this.p.match(TokenType.LPAREN)) {
			this.p.parenDepth++; // Increment depth for grouping
			const expr = this.expression();
			this.p.consume(TokenType.RPAREN, 'Expected ")" after expression');
			this.p.parenDepth--; // Decrement depth after closing
			return expr;
		}

		// Array literal
		if (this.p.match(TokenType.LBRACKET)) {
			this.p.bracketDepth++; // Track bracket depth for multiline arrays
			const elements: AST.Expression[] = [];
			// Skip newlines after opening bracket
			while (this.p.check(TokenType.NEWLINE)) {
				this.p.advance();
			}
			if (!this.p.check(TokenType.RBRACKET)) {
				do {
					// Skip newlines before element
					while (this.p.check(TokenType.NEWLINE)) {
						this.p.advance();
					}
					elements.push(this.expression());
					// Skip newlines after element
					while (this.p.check(TokenType.NEWLINE)) {
						this.p.advance();
					}
				} while (this.p.match(TokenType.COMMA));
			}
			// Skip newlines before closing bracket
			while (this.p.check(TokenType.NEWLINE)) {
				this.p.advance();
			}
			const closeBracket = this.p.consume(TokenType.RBRACKET, 'Expected "]"');
			this.p.bracketDepth--; // Decrement after closing
			return {
				type: "ArrayExpression",
				elements,
				line: closeBracket.line,
				column: closeBracket.column,
			};
		}

		throw new Error(`Unexpected token: ${this.p.peek().value}`);
	}
}
