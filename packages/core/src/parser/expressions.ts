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

	// Consume the newline(s) after a TRAILING operator (`x = cond ?`,
	// `a and`) so the right operand on the next line joins the
	// expression - but report TV's wrap-indent violation when the
	// continuation line's indent is a multiple of 4 (Pine's
	// line-wrapping rule - INV017): TV rejects such wraps with CE10156
	// 'Syntax error at input "end of line without line continuation"'
	// anchored at the wrapping line's end (probed at top level and
	// inside a nested local scope - see INV042). We emit TV's error but
	// still join, so the statement parses whole and downstream
	// diagnostics survive. Inside ( ) / [ ] continuation is free-form -
	// no NEWLINE tokens are emitted there, and the depth guard keeps
	// any parser-tracked residue out.
	private skipPostOperatorNewlines(): void {
		if (!this.p.check(TokenType.NEWLINE)) return;
		const eol = this.p.peek();
		while (this.p.check(TokenType.NEWLINE)) {
			this.p.advance();
		}
		const next = this.p.peek();
		if (
			next.type !== TokenType.EOF &&
			(next.indent ?? 0) % 4 === 0 &&
			this.p.parenDepth === 0 &&
			this.p.bracketDepth === 0
		) {
			this.p.parserErrors.push({
				line: eol.line,
				column: eol.column,
				message:
					'Syntax error at input "end of line without line continuation"',
			});
		}
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
			// Skip newlines after ? for multi-line ternary (flags
			// multiple-of-4 continuation indents - see INV042)
			this.skipPostOperatorNewlines();
			const consequent = this.expression();
			// Skip newlines before : for multi-line ternary (when consequent ends on previous line)
			while (this.p.check(TokenType.NEWLINE)) {
				this.p.advance();
			}
			this.p.consume(TokenType.COLON, 'Expected ":" in ternary expression');
			// Skip newlines after : for multi-line ternary (flags
			// multiple-of-4 continuation indents - see INV042)
			this.skipPostOperatorNewlines();
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
				// Skip newlines after operator (line continuation; flags
				// multiple-of-4 continuation indents - see INV042)
				this.skipPostOperatorNewlines();
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
				// Skip newlines after operator (line continuation; flags
				// multiple-of-4 continuation indents - see INV042)
				this.skipPostOperatorNewlines();
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
				// Skip newlines after operator (line continuation; flags
				// multiple-of-4 continuation indents - see INV042)
				this.skipPostOperatorNewlines();
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
				// Skip newlines after operator (line continuation; flags
				// multiple-of-4 continuation indents - see INV042)
				this.skipPostOperatorNewlines();
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
				// Skip newlines after operator (line continuation; flags
				// multiple-of-4 continuation indents - see INV042)
				this.skipPostOperatorNewlines();
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
		// This handles cases where binary operators span multiple lines.
		// Two gates (INV047 / #46(c)):
		// - a continuation line that itself looks like a STATEMENT START
		//   (IDENT followed by = / :=) is NOT an operand - refuse, so a
		//   trailing unary `-` (a hard-wrapped comment tail of `-----`)
		//   cannot consume the next statement's declaration whole
		//   (`src = close` became part of the minus chain);
		// - a multiple-of-4 indent violates Pine's wrap rule (INV017):
		//   TV rejects `c = a and not` / `b` with CE10156 at the EOL
		//   (probed INV047 p09) - record TV's error but STILL JOIN so the
		//   declaration's name exists (the INV042 record-and-join pattern;
		//   refusing outright turned every use into an undefined-variable
		//   record).
		if (this.p.check(TokenType.NEWLINE)) {
			const eol = this.p.peek();
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
				const after = this.p.tokens[this.p.current + 2];
				const looksLikeStatementStart =
					nextToken.type === TokenType.IDENTIFIER &&
					(after?.type === TokenType.ASSIGN ||
						after?.type === TokenType.COMPOUND_ASSIGN);
				if (!looksLikeStatementStart) {
					if (
						(nextToken.indent ?? 0) % 4 === 0 &&
						this.p.parenDepth === 0 &&
						this.p.bracketDepth === 0
					) {
						this.p.parserErrors.push({
							line: eol.line,
							column: eol.column,
							message:
								'Syntax error at input "end of line without line continuation"',
						});
					}
					this.p.advance(); // skip newline
				}
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

	// A NEWLINE token inside a call only exists when the lexer hit a
	// broken string literal and reset its depth bookkeeping (INV047) -
	// at bracket depth > 0 it suppresses them. Decide structurally
	// whether the line after it is the call's own torn continuation or
	// the next statement: a line whose bracket balance goes NEGATIVE
	// closes a group it didn't open (e.g. `group="X")`), so it belongs
	// to this call; a balanced line (`sensitivity = input.float(...)`) is
	// a complete statement and must NOT be swallowed as arguments.
	private nextLineClosesCall(): boolean {
		let i = this.p.current;
		while (this.p.tokens[i]?.type === TokenType.NEWLINE) i++;
		let balance = 0;
		while (i < this.p.tokens.length) {
			const t = this.p.tokens[i].type;
			if (t === TokenType.NEWLINE || t === TokenType.EOF) return false;
			if (t === TokenType.LPAREN || t === TokenType.LBRACKET) {
				balance++;
			} else if (t === TokenType.RPAREN || t === TokenType.RBRACKET) {
				balance--;
				if (balance < 0) return true;
			}
			i++;
		}
		return false;
	}

	// In-call error recovery (see INV047 / TODO #46(b)): a malformed
	// argument used to THROW out of the whole statement, so the parser
	// bailed at the newline and re-parsed the call's continuation lines
	// as comma declarations - "already defined" / stray-token shrapnel
	// on every wrapped mangled call. TV instead anchors ONE error at the
	// mangle and keeps parsing (probed: CE10156 at `index` for
	// `label.new(bar index, ...` - INV047 p04). Skip to the next `,` or
	// `)` at this call's depth so the argument loop can continue; stop at
	// a NEWLINE (only present when the lexer already declared a statement
	// boundary - broken-string recovery) and let the loop's boundary
	// decision take over.
	private skipToCallArgumentBoundary(): void {
		let depth = 0;
		while (!this.p.isAtEnd()) {
			const t = this.p.peek().type;
			if (t === TokenType.LPAREN || t === TokenType.LBRACKET) {
				depth++;
			} else if (t === TokenType.RPAREN || t === TokenType.RBRACKET) {
				if (depth === 0 && t === TokenType.RPAREN) return;
				if (depth > 0) depth--;
			} else if (t === TokenType.COMMA && depth === 0) {
				return;
			} else if (t === TokenType.NEWLINE) {
				return;
			}
			this.p.advance();
		}
	}

	finishCall(
		callee: AST.Expression,
		typeArguments?: string[],
	): AST.CallExpression {
		const args: AST.CallArgument[] = [];
		let recovered = false;
		let tornAtBoundary = false;

		if (!this.p.check(TokenType.RPAREN)) {
			argLoop: while (true) {
				// NEWLINE here = broken-string lexer reset (see
				// nextLineClosesCall). Consume it only when the following
				// line structurally belongs to this call; otherwise the call
				// is torn at a statement boundary - close it here so the next
				// statement (often a declaration) is NOT swallowed as
				// arguments. see INV047 / TODO #46(b)
				while (this.p.check(TokenType.NEWLINE)) {
					if (!this.nextLineClosesCall()) {
						tornAtBoundary = true;
						break argLoop;
					}
					while (this.p.check(TokenType.NEWLINE)) {
						this.p.advance();
					}
				}
				if (this.p.check(TokenType.RPAREN) || this.p.isAtEnd()) {
					break;
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
				// Snapshot the depth counters: an argument parse that throws
				// mid-group (e.g. inside an `[...]` options array torn open by
				// a broken string) leaves them where the throw happened, and
				// the in-call recovery below swallows the throw - so the
				// statement-level synchronize() reset never runs. A stuck
				// depth silently disables every depth-gated rule for the rest
				// of the file (the INV042 wrap check, NBSP handling). see
				// INV047 / #46(b)
				const savedParenDepth = this.p.parenDepth;
				const savedBracketDepth = this.p.bracketDepth;
				try {
					if (
						(this.p.check(TokenType.IDENTIFIER) ||
							this.p.check(TokenType.KEYWORD)) &&
						nextTok?.type === TokenType.ASSIGN
					) {
						const nameTok = this.p.advance();
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
						args.push({
							name: nameTok.value,
							nameLine: nameTok.line,
							nameColumn: nameTok.column,
							value,
						});
					} else {
						// Positional argument
						const value = this.expression();
						args.push({ value });
					}
				} catch (e) {
					// An argument whose parse throws (e.g. a stray token where
					// a value should start) recovers in-call like the
					// malformed-tail case below. see INV047 / TODO #46(b)
					const at = this.p.peek();
					this.p.parserErrors.push({
						line: at.line,
						column: at.column,
						message: e instanceof Error ? e.message : String(e),
					});
					recovered = true;
					this.p.parenDepth = savedParenDepth;
					this.p.bracketDepth = savedBracketDepth;
					this.skipToCallArgumentBoundary();
				}

				if (this.p.match(TokenType.COMMA)) {
					continue;
				}
				if (this.p.check(TokenType.NEWLINE)) {
					continue; // top of loop decides continuation vs boundary
				}
				if (this.p.check(TokenType.RPAREN) || this.p.isAtEnd()) {
					break;
				}

				// A token that is neither `,` nor `)` here means the argument
				// is malformed. Record ONE anchored error (with the helpful
				// wording for the common mistakes) and recover INSIDE the
				// call - skip to the next argument boundary and keep going -
				// instead of throwing the whole statement away. see
				// INV047 / TODO #46(b); TV anchors one CE10156 at the mangle.
				const current = this.p.peek();
				const next = this.p.peekNext();
				const prev = this.p.previous();
				let message: string;
				if (
					(current.type === TokenType.IDENTIFIER ||
						current.type === TokenType.KEYWORD) &&
					next?.type === TokenType.ASSIGN
				) {
					// Looks like another argument (missing comma)
					message = `Missing comma before '${current.value}' argument at line ${current.line}`;
				} else if (
					prev?.type === TokenType.IDENTIFIER &&
					current.type === TokenType.IDENTIFIER
				) {
					// Two identifiers in a row (e.g. "bar index" for "bar_index")
					message = `Unexpected identifier '${current.value}' - did you mean '${prev.value}_${current.value}'? At line ${current.line}`;
				} else {
					message = `Unexpected token: ${current.value}`;
				}
				this.p.parserErrors.push({
					line: current.line,
					column: current.column,
					message,
				});
				recovered = true;
				this.skipToCallArgumentBoundary();
				// Consume the boundary comma so the next iteration starts AT
				// the next argument (re-entering on the comma would throw a
				// second "Unexpected token: ," record).
				this.p.match(TokenType.COMMA);
			}
		}
		// A call torn open by mangled source (in-call recovery fired, or the
		// lexer declared a statement boundary mid-call) closes HERE without
		// a second "Expected )" record: the anchored in-call/lexer error
		// already names the problem, and the partial CallExpression keeps
		// the statement intact. see INV047 / #46(b)
		let rparen: Token;
		if (this.p.check(TokenType.RPAREN)) {
			rparen = this.p.advance();
		} else if (recovered || tornAtBoundary) {
			rparen = this.p.previous();
		} else {
			rparen = this.p.consume(TokenType.RPAREN, 'Expected ")" after arguments');
		}
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
		if (recovered || tornAtBoundary) {
			// Incomplete argument list - exempt from arg-count checks.
			callExpr.recovered = true;
		}

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

		// Switch expression (can appear as value in variable declaration).
		// NOT when `switch` is used as a plain pre-v6 variable in expression
		// position (`switch[1] == 0`, `switch == 1`) - those fall through to
		// the keyword-as-Identifier branch below; entering the arm machinery
		// manufactured "Expected =>" noise over the following lines. A real
		// switch expression is followed by its discriminant or a newline,
		// never by `[`, a comparison, or an arithmetic operator. see #46(d)
		if (
			this.p.check([TokenType.KEYWORD, ["switch"]]) &&
			this.p.peekNext()?.type !== TokenType.LBRACKET &&
			this.p.peekNext()?.type !== TokenType.COMPARE &&
			this.p.peekNext()?.type !== TokenType.ASSIGN &&
			this.p.peekNext()?.type !== TokenType.COMPOUND_ASSIGN
		) {
			this.p.advance();
			return this.p.switchExpression();
		}

		// If expression (`int m = if cond` ... `else` ...) - Pine statements
		// return their tail value. Previously `if` fell through to the
		// generic keyword-as-Identifier branch, which shredded the enclosing
		// block. Parse with the statement machinery, re-tag. see INV031
		if (this.p.match([TokenType.KEYWORD, ["if"]])) {
			const stmt = this.p.ifStatement();
			return {
				type: "IfExpression",
				condition: stmt.condition,
				consequent: stmt.consequent,
				alternate: stmt.alternate,
				line: stmt.line,
				column: stmt.column,
			};
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
			const openBracket = this.p.previous();
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
				// line/column stay on the CLOSING bracket (historical anchor
				// for downstream consumers); start* carry the `[` so checks
				// that anchor at the opener (INV046) can. see ast.ts
				line: closeBracket.line,
				column: closeBracket.column,
				startLine: openBracket.line,
				startColumn: openBracket.column,
			};
		}

		throw new Error(`Unexpected token: ${this.p.peek().value}`);
	}
}
