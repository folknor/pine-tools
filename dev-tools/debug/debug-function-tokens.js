const { Lexer } = require("../../dist/srcparser/lexer");

const source = `ehlers_dft_adapted_rsi(price, window, overbought, oversold, frac) =>
    // Initialize variables
    var float hp = 0.0`;

const lexer = new Lexer(source);
const tokens = lexer.tokenize();

console.log("Tokens for function:");
tokens.forEach((token, i) => {
	console.log(
		`${i}: ${token.type} "${token.value}" (line: ${token.line}, col: ${token.column}, indent: ${token.indent})`,
	);
});
