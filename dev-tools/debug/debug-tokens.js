const { Lexer } = require("../../dist/srcparser/lexer");
const fs = require("node:fs");

const code = fs.readFileSync(
	"pinescripts/indicators-processed/ehlers-correlation-angle.pine",
	"utf8",
);
const lexer = new Lexer(code);
const tokens = lexer.tokenize();

// Find tokens around lines 28-31
console.log("Tokens around lines 28-31:");
for (let i = 0; i < tokens.length; i++) {
	const token = tokens[i];
	if (token.line >= 25 && token.line <= 35) {
		console.log(
			`Line ${token.line}: ${token.type} = "${token.value}" (col ${token.column})`,
		);
	}
}
