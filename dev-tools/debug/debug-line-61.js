const { Lexer } = require("../../dist/srcparser/lexer");

const source = `    else if bar_index > 4`;

const lexer = new Lexer(source);
const tokens = lexer.tokenize();

console.log("Tokens for line 61:");
tokens.forEach((token, i) => {
	console.log(
		`${i}: ${token.type} "${token.value}" (line: ${token.line}, col: ${token.column}, indent: ${token.indent})`,
	);
});
