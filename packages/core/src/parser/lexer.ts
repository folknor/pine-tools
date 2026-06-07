// Pine Script v6 Lexer/Tokenizer
import { LEXER_KEYWORDS } from "../constants/keywords";

export enum TokenType {
	// Literals
	NUMBER = "NUMBER",
	STRING = "STRING",
	BOOL = "BOOL",
	COLOR = "COLOR",

	// Identifiers and Keywords
	IDENTIFIER = "IDENTIFIER",
	KEYWORD = "KEYWORD",

	// Operators
	ASSIGN = "ASSIGN", // =, :=
	COMPOUND_ASSIGN = "COMPOUND_ASSIGN", // +=, -=, *=, /=, %=
	PLUS = "PLUS", // +
	MINUS = "MINUS", // -
	MULTIPLY = "MULTIPLY", // *
	DIVIDE = "DIVIDE", // /
	MODULO = "MODULO", // %
	COMPARE = "COMPARE", // ==, !=, <, >, <=, >=
	LOGICAL = "LOGICAL", // and, or, not
	TERNARY = "TERNARY", // ?

	// Delimiters
	LPAREN = "LPAREN", // (
	RPAREN = "RPAREN", // )
	LBRACKET = "LBRACKET", // [
	RBRACKET = "RBRACKET", // ]
	COMMA = "COMMA", // ,
	DOT = "DOT", // .
	COLON = "COLON", // :
	ARROW = "ARROW", // =>

	// Special
	NEWLINE = "NEWLINE",
	COMMENT = "COMMENT",
	ANNOTATION = "ANNOTATION", // //@version=6
	EOF = "EOF",
	WHITESPACE = "WHITESPACE",
	ERROR = "ERROR", // Invalid/unexpected character
}

export interface Token {
	type: TokenType;
	value: string;
	line: number;
	column: number;
	length: number;
	indent?: number; // Indentation level (number of spaces at line start)
}

export interface LexerError {
	line: number;
	column: number;
	message: string;
}

// Keywords are defined in constants/keywords.ts (uses LEXER_KEYWORDS)

export class Lexer {
	private source: string;
	private pos: number = 0;
	private line: number = 1;
	private column: number = 1;
	private tokens: Token[] = [];
	private currentIndent: number = 0; // Track current line's indentation
	private atLineStart: boolean = true; // Track if we're at the start of a line
	private lexerErrors: LexerError[] = [];
	private detectedVersion: string | null = null;
	// One CE10005 per file - NBSP-obfuscated scripts carry thousands. see INV029
	private nbspErrorReported: boolean = false;
	// Open ( / [ nesting depth. Newlines inside a bracket group are
	// continuations, not statement boundaries, so no NEWLINE token is
	// emitted while depth > 0 - this is what lets `x = (` ... `)` and
	// multi-line calls/tuples span lines. Clamped at 0 so a stray `)` in
	// a broken file can't suppress newlines for the rest of the source.
	// see TODO #34 / plan/31.
	private bracketDepth: number = 0;
	// Positions of currently-open ( / [ so an opener still unmatched at
	// EOF can be reported where TV reports it: the earliest unclosed `(`
	// is CE10015 "Syntax error: Missing closing parenthesis" anchored at
	// the opener's line, column 1; an unclosed `[` is CE10156 at the
	// bracket itself. A closer pops the nearest opener regardless of
	// which character it is - mismatched pairs only occur in already-
	// broken files. see INV046
	private openBrackets: Array<{
		char: "(" | "[";
		line: number;
		column: number;
	}> = [];

	constructor(source: string) {
		this.source = source;
	}

	tokenize(): Token[] {
		while (this.pos < this.source.length) {
			this.scanToken();
		}
		// An opener still unmatched at EOF: report the EARLIEST one (TV
		// stops at its first error, so one record per file). see INV046
		const unclosed = this.openBrackets[0];
		if (unclosed) {
			this.lexerErrors.push(
				unclosed.char === "("
					? {
							line: unclosed.line,
							column: 1,
							message: "Syntax error: Missing closing parenthesis",
						}
					: {
							line: unclosed.line,
							column: unclosed.column,
							message: 'Syntax error at input "["',
						},
			);
		}
		this.addToken(TokenType.EOF, "", 0);
		return this.tokens;
	}

	getErrors(): LexerError[] {
		return this.lexerErrors;
	}

	private scanToken(): void {
		const _start = this.pos;
		const _startColumn = this.column;
		const char = this.advance();

		switch (char) {
			case " ":
			case "\t":
			case "\u00a0":
				// Count indentation at line start. U+00A0 (non-breaking
				// space) appears as indentation in real published scripts;
				// silently dropping it gave body tokens indent 0 and made
				// function bodies swallow the rest of the file. see plan/31.
				// (TV does NOT treat NBSP indentation as block indent - it
				// wrap-joins such lines - but our lenient reading keeps
				// bodies intact; see INV029 probe b.)
				if (this.atLineStart) {
					this.currentIndent += char === "\t" ? 4 : 1;
				} else if (
					char === "\u00a0" &&
					this.bracketDepth === 0 &&
					!this.nbspErrorReported
				) {
					// Mid-line NBSP at bracket depth 0 is a lexical error in
					// TV: CE10005 "no viable alternative at character",
					// anchored at the NBSP itself. Inside ( ) / [ ] TV accepts
					// NBSP as plain whitespace (both probed 2026-06-04 - see
					// INV029). Report only the FIRST one: NBSP-obfuscated
					// published scripts carry tens of thousands of NBSPs (one
					// corpus file has 41749), and TV itself emits exactly one
					// CE10005 and stops. Recover by treating it as a plain
					// space so downstream diagnostics survive.
					this.nbspErrorReported = true;
					this.lexerErrors.push({
						line: this.line,
						column: this.column - 1,
						message: 'no viable alternative at character "\u00a0"',
					});
				}
				break;

			case "\r":
				// A lone \r is a line terminator; \r\n pairs break at the \n.
				// TV, VS Code, and LSP all split on \r\n | \r | \n, so a file
				// with \r\r\n endings holds TWO breaks per line and a CR-only
				// file breaks at every \r. Skipping \r entirely made CR-only
				// files one giant comment line and halved \r\r\n line numbers
				// against TV's. see G005 / TODO #38.
				if (this.peek() !== "\n") {
					this.handleLineBreak();
				}
				break;

			case "\n":
				this.handleLineBreak();
				break;

			case "(":
				this.bracketDepth++;
				this.openBrackets.push({
					char: "(",
					line: this.line,
					column: this.column - 1,
				});
				this.addToken(TokenType.LPAREN, "(", 1);
				break;
			case ")":
				this.bracketDepth = Math.max(0, this.bracketDepth - 1);
				this.openBrackets.pop();
				this.addToken(TokenType.RPAREN, ")", 1);
				break;
			case "[":
				this.bracketDepth++;
				this.openBrackets.push({
					char: "[",
					line: this.line,
					column: this.column - 1,
				});
				this.addToken(TokenType.LBRACKET, "[", 1);
				break;
			case "]":
				this.bracketDepth = Math.max(0, this.bracketDepth - 1);
				this.openBrackets.pop();
				this.addToken(TokenType.RBRACKET, "]", 1);
				break;
			case ",":
				this.addToken(TokenType.COMMA, ",", 1);
				break;
			case ".":
				// Check if this is a number starting with . (e.g., .1 = 0.1)
				if (this.isDigit(this.peek())) {
					this.scanNumberStartingWithDot();
				} else {
					this.addToken(TokenType.DOT, ".", 1);
				}
				break;
			case "?":
				this.addToken(TokenType.TERNARY, "?", 1);
				break;

			case "+":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPOUND_ASSIGN, "+=", 2);
				} else {
					this.addToken(TokenType.PLUS, "+", 1);
				}
				break;
			case "-":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPOUND_ASSIGN, "-=", 2);
				} else {
					this.addToken(TokenType.MINUS, "-", 1);
				}
				break;
			case "*":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPOUND_ASSIGN, "*=", 2);
				} else {
					this.addToken(TokenType.MULTIPLY, "*", 1);
				}
				break;
			case "%":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPOUND_ASSIGN, "%=", 2);
				} else {
					this.addToken(TokenType.MODULO, "%", 1);
				}
				break;

			case "/":
				if (this.peek() === "/") {
					this.scanComment();
				} else if (this.peek() === "*") {
					this.scanBlockComment();
				} else if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPOUND_ASSIGN, "/=", 2);
				} else {
					this.addToken(TokenType.DIVIDE, "/", 1);
				}
				break;

			case ":":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.ASSIGN, ":=", 2);
				} else {
					this.addToken(TokenType.COLON, ":", 1);
				}
				break;

			case "=":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPARE, "==", 2);
				} else if (this.peek() === ">") {
					this.advance();
					this.addToken(TokenType.ARROW, "=>", 2);
				} else {
					this.addToken(TokenType.ASSIGN, "=", 1);
				}
				break;

			case "!":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPARE, "!=", 2);
				} else {
					// Pine Script uses 'not' for negation, not '!'
					// Produce an error token so the parser can report a meaningful error
					this.addToken(TokenType.ERROR, "!", 1);
				}
				break;

			case "<":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPARE, "<=", 2);
				} else {
					this.addToken(TokenType.COMPARE, "<", 1);
				}
				break;

			case ">":
				if (this.peek() === "=") {
					this.advance();
					this.addToken(TokenType.COMPARE, ">=", 2);
				} else {
					this.addToken(TokenType.COMPARE, ">", 1);
				}
				break;

			case "#":
				// Check for hex color literal (#RRGGBB or #RRGGBBAA)
				this.scanHexColor();
				break;

			case '"':
			case "'":
				this.scanString(char);
				break;

			default:
				if (this.isDigit(char)) {
					this.scanNumber();
				} else if (this.isAlpha(char)) {
					this.scanIdentifier();
				}
				break;
		}
	}

	// Shared by the "\n" and lone-"\r" cases in scanToken. see G005.
	private handleLineBreak(): void {
		if (this.bracketDepth === 0) {
			this.addToken(TokenType.NEWLINE, "\n", 1);
		}
		this.line++;
		this.column = 1;
		this.atLineStart = true;
		this.currentIndent = 0;
	}

	private scanComment(): void {
		const start = this.pos - 1;
		const _startColumn = this.column - 1;

		// Advance past the second '/'
		this.advance();

		// Check for annotation (//@version=6)
		if (this.peek() === "@") {
			while (this.peek() !== "\n" && this.peek() !== "\r" && !this.isAtEnd()) {
				this.advance();
			}
			const value = this.source.substring(start, this.pos);
			this.addToken(TokenType.ANNOTATION, value, value.length);

			// Extract version information
			this.extractVersionFromAnnotation(value);
			return;
		}

		// Regular comment (a lone \r terminates the line too - see G005)
		while (this.peek() !== "\n" && this.peek() !== "\r" && !this.isAtEnd()) {
			this.advance();
		}
		const value = this.source.substring(start, this.pos);
		this.addToken(TokenType.COMMENT, value, value.length);

		// A version directive written with whitespace (`// @version=5`,
		// `//@version = 5`) lands here as a COMMENT rather than an ANNOTATION.
		// Still scan it for the version so detection is whitespace-tolerant,
		// but DON'T reclassify it as an annotation: doing so would turn every
		// `// @param` / `// @function` doc comment into an annotation token and
		// cascade the parser. see G004
		this.extractVersionFromAnnotation(value);
	}

	private extractVersionFromAnnotation(annotation: string): void {
		// Parse //@version=X where X is 2, 4, 5, or 6. Tolerate whitespace
		// between // and @version and around the = (e.g. `// @version = 5`).
		const match = annotation.match(/\/\/\s*@version\s*=\s*(\d+)/);
		if (match) {
			this.detectedVersion = match[1];
		}
	}

	getDetectedVersion(): string | null {
		return this.detectedVersion;
	}

	private scanBlockComment(): void {
		const start = this.pos - 1;
		const startLine = this.line;
		const startColumn = this.column - 1;
		// Pine has NO block comments - TV lexes `/` `*` as two operator
		// tokens and the parse fails emergently: a line-leading `/*` gets
		// CE10156 'Syntax error at input "new line"' at column 1, a
		// mid-line one gets CE10156 'Syntax error at input "*"' at the
		// `*` (both probed - see INV043). We keep consuming the comment
		// as trivia so one stray C-style comment doesn't shred the rest
		// of the file, but report TV's error at TV's anchor.
		this.lexerErrors.push(
			this.atLineStart
				? {
						line: startLine,
						column: 1,
						message: 'Syntax error at input "new line"',
					}
				: {
						line: startLine,
						column: startColumn + 1,
						message: 'Syntax error at input "*"',
					},
		);
		this.advance(); // consume *

		while (!this.isAtEnd()) {
			if (this.peek() === "*" && this.peekNext() === "/") {
				this.advance(); // *
				this.advance(); // /
				break;
			}
			if (this.peek() === "\n" || (this.peek() === "\r" && this.peekNext() !== "\n")) {
				this.line++;
				this.column = 0;
			}
			this.advance();
		}

		const value = this.source.substring(start, this.pos);
		this.addToken(TokenType.COMMENT, value, value.length, {
			line: startLine,
			column: startColumn,
		});
	}

	private scanString(quote: string): void {
		const start = this.pos - 1;
		const startLine = this.line;
		const startColumn = this.column - 1;

		while (this.peek() !== quote && !this.isAtEnd()) {
			if (this.peek() === "\\") {
				this.advance(); // Skip escape char
				// Valid escape sequences: \n, \t, \\, \", \', etc.
				// Just skip the next character whatever it is
				if (!this.isAtEnd()) {
					this.advance(); // Skip escaped char
				}
			} else if (this.peek() === "\n" || (this.peek() === "\r" && this.peekNext() !== "\n")) {
				// Multiline strings are valid in Pine Script v6 (though deprecated)
				// Each wrapped line adds exactly one space regardless of indentation
				// We preserve the raw source; normalization happens at a higher level if needed
				// (\r\n breaks at the \n; a lone \r is its own break - see G005)
				//
				// The string continues onto the next line only if that line
				// starts with whitespace or is blank. A non-whitespace char at
				// column 1 (even the closing quote itself) terminates the
				// literal with TV's CE10017, anchored at column 1 of the line
				// where the literal opens. see INV025
				const after = this.source[this.pos + 1];
				if (
					after !== undefined &&
					after !== " " &&
					after !== "\t" &&
					after !== "\u00a0" &&
					after !== "\n" &&
					after !== "\r"
				) {
					// TV has TWO broken-string wordings (probed 2026-06-07,
					// INV047 p10-p16): the v6 compiler emits CE10017 anchored
					// at the broken line's column 1 when a closing quote
					// exists ANYWHERE later in the source, and CE10004
					// `mismatched character '\n' expecting <quote>` anchored
					// at the EOL when the broken string is the source's last
					// quote. The pre-v6 compiler ALWAYS uses the mismatched
					// wording at the EOL (p15 - same shape, later quote
					// present, still mismatched). see TODO #47
					const hasLaterQuote = this.source.indexOf(quote, this.pos) !== -1;
					if (this.detectedVersion === "6" && hasLaterQuote) {
						this.lexerErrors.push({
							line: startLine,
							column: 1,
							message:
								"Missing enclosing character in the literal string. Enclose literal strings using a set of quotation marks (\") or apostrophes (') on the same code line.",
						});
					} else {
						this.lexerErrors.push({
							line: this.line,
							column: this.column,
							message: `mismatched character '\\n' expecting '${quote}'`,
						});
					}
					const broken = this.source.substring(start, this.pos);
					this.addToken(TokenType.STRING, broken, broken.length, {
						line: startLine,
						column: startColumn,
					});
					// The statement holding the broken literal is unsalvageable,
					// and the closers for any openers counted on it are usually
					// swallowed by the shifted string lexing that follows (e.g.
					// `"],` lexes as one STRING token). Leaving bracketDepth > 0
					// here suppressed NEWLINE emission for the REST of the file,
					// silently merging every later statement - declarations
					// evaporated and hundreds of phantom "undefined variable"
					// records followed. Treat the break as a hard statement
					// boundary instead: reset the depth bookkeeping so the next
					// line lexes fresh. see INV047
					this.bracketDepth = 0;
					this.openBrackets.length = 0;
					return; // the line break is re-scanned as a normal NEWLINE
				}
				this.line++;
				this.column = 0;
				this.advance(); // consume the newline
			} else {
				this.advance();
			}
		}

		if (this.isAtEnd()) {
			// Unterminated string - reached end of file without closing quote
			this.lexerErrors.push({
				line: startLine,
				column: startColumn + (this.pos - start),
				message: `mismatched character '<EOF>' expecting '${quote}'`,
			});
			const value = this.source.substring(start, this.pos);
			this.addToken(TokenType.STRING, value, value.length, {
				line: startLine,
				column: startColumn,
			});
			return;
		}

		this.advance(); // Closing quote
		const value = this.source.substring(start, this.pos);
		this.addToken(TokenType.STRING, value, value.length, {
			line: startLine,
			column: startColumn,
		});
	}

	private scanNumber(): void {
		const start = this.pos - 1;

		while (this.isDigit(this.peek())) {
			this.advance();
		}

		// Decimal part - handle both "1.5" and "1." (trailing dot)
		if (this.peek() === ".") {
			const nextChar = this.peekNext();
			// Check if this is a decimal point (followed by digit) or trailing dot (followed by non-identifier)
			if (this.isDigit(nextChar) || !this.isAlpha(nextChar)) {
				this.advance(); // consume .
				while (this.isDigit(this.peek())) {
					this.advance();
				}
			}
		}

		// Scientific notation
		if (this.peek() === "e" || this.peek() === "E") {
			this.advance();
			if (this.peek() === "+" || this.peek() === "-") {
				this.advance();
			}
			while (this.isDigit(this.peek())) {
				this.advance();
			}
		}

		const value = this.source.substring(start, this.pos);
		this.addToken(TokenType.NUMBER, value, value.length);
	}

	/**
	 * Scan a number that starts with a decimal point (e.g., .1, .5, .123)
	 * The '.' has already been consumed when this is called.
	 */
	private scanNumberStartingWithDot(): void {
		const start = this.pos - 1; // Include the '.' we already consumed

		// Consume digits after the decimal point
		while (this.isDigit(this.peek())) {
			this.advance();
		}

		// Scientific notation (e.g., .1e5)
		if (this.peek() === "e" || this.peek() === "E") {
			this.advance();
			if (this.peek() === "+" || this.peek() === "-") {
				this.advance();
			}
			while (this.isDigit(this.peek())) {
				this.advance();
			}
		}

		const value = this.source.substring(start, this.pos);
		this.addToken(TokenType.NUMBER, value, value.length);
	}

	private scanHexColor(): void {
		const start = this.pos - 1; // Include the '#'

		// Count hex digits after #
		let hexCount = 0;
		while (this.isHexDigit(this.peek()) && hexCount < 8) {
			this.advance();
			hexCount++;
		}

		// Valid hex colors are #RRGGBB (6 digits) or #RRGGBBAA (8 digits)
		if (hexCount === 6 || hexCount === 8) {
			const value = this.source.substring(start, this.pos);
			this.addToken(TokenType.COLOR, value, value.length);
		} else {
			// Invalid hex color - treat as error or identifier
			// For now, just consume it as an identifier-like token
			while (this.isAlphaNumeric(this.peek())) {
				this.advance();
			}
			const value = this.source.substring(start, this.pos);
			this.addToken(TokenType.IDENTIFIER, value, value.length);
		}
	}

	private scanIdentifier(): void {
		const start = this.pos - 1;

		while (this.isAlphaNumeric(this.peek()) || this.peek() === "_") {
			this.advance();
		}

		const value = this.source.substring(start, this.pos);

		// Check for boolean literals first (before keywords)
		if (value === "true" || value === "false") {
			this.addToken(TokenType.BOOL, value, value.length);
		} else if (LEXER_KEYWORDS.has(value)) {
			this.addToken(TokenType.KEYWORD, value, value.length);
		} else {
			this.addToken(TokenType.IDENTIFIER, value, value.length);
		}
	}

	private advance(): string {
		const char = this.source.charAt(this.pos);
		this.pos++;
		this.column++;
		return char;
	}

	private peek(): string {
		if (this.isAtEnd()) return "\0";
		return this.source.charAt(this.pos);
	}

	private peekNext(): string {
		if (this.pos + 1 >= this.source.length) return "\0";
		return this.source.charAt(this.pos + 1);
	}

	private isAtEnd(): boolean {
		return this.pos >= this.source.length;
	}

	private isDigit(char: string): boolean {
		return char >= "0" && char <= "9";
	}

	private isHexDigit(char: string): boolean {
		return (
			(char >= "0" && char <= "9") ||
			(char >= "a" && char <= "f") ||
			(char >= "A" && char <= "F")
		);
	}

	private isAlpha(char: string): boolean {
		return (
			(char >= "a" && char <= "z") ||
			(char >= "A" && char <= "Z") ||
			char === "_"
		);
	}

	private isAlphaNumeric(char: string): boolean {
		return this.isAlpha(char) || this.isDigit(char);
	}

	// `at` overrides the token's stamped position - required for tokens
	// that can span lines (strings, block comments), where the default
	// `this.column - length` arithmetic lands on the END line with a
	// nonsense (often negative) column. see TODO #37 / INV019.
	private addToken(
		type: TokenType,
		value: string,
		length: number,
		at?: { line: number; column: number },
	): void {
		// Only set indent on the first real token of each line
		let indentValue = this.atLineStart ? this.currentIndent : undefined;

		// Special case: 'if' after 'else' should have the same indentation as 'else'
		// This handles 'else if' statements where both tokens should have the same indent
		if (type === TokenType.KEYWORD && value === "if" && !this.atLineStart) {
			// Check if the previous token was 'else' on the same line
			const prevToken = this.tokens[this.tokens.length - 1];
			if (
				prevToken &&
				prevToken.type === TokenType.KEYWORD &&
				prevToken.value === "else" &&
				prevToken.line === this.line
			) {
				indentValue = prevToken.indent;
			}
		}

		// Mark that we're no longer at the start of the line (except for NEWLINE tokens)
		if (
			type !== TokenType.NEWLINE &&
			type !== TokenType.WHITESPACE &&
			this.atLineStart
		) {
			this.atLineStart = false;
		}

		this.tokens.push({
			type,
			value,
			line: at?.line ?? this.line,
			column: at?.column ?? this.column - length,
			length,
			indent: indentValue,
		});
	}
}
