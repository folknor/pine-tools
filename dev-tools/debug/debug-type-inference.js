// Debug script to test type inference logic
console.log("Testing type promotion logic...");

// Simulate the canPromoteType function
function canPromoteType(from, to) {
	// float -> series<float>
	if (from === "float" && to === "series<float>") return true;
	// int -> series<int>
	if (from === "int" && to === "series<int>") return true;
	// bool -> series<bool>
	if (from === "bool" && to === "series<bool>") return true;
	// string -> series<string>
	if (from === "string" && to === "series<string>") return true;
	// color -> series<color>
	if (from === "color" && to === "series<color>") return true;

	// int -> float (numeric promotion)
	if (from === "int" && to === "float") return true;
	// int -> series<float> (int to series<float> promotion)
	if (from === "int" && to === "series<float>") return true;
	// series<int> -> series<float> (series int to series float promotion)
	if (from === "series<int>" && to === "series<float>") return true;

	return false;
}

// Test cases
console.log(
	"float -> series<float>:",
	canPromoteType("float", "series<float>"),
); // Should be true
console.log(
	"series<float> -> float:",
	canPromoteType("series<float>", "float"),
); // Should be false

// Simulate the TypeChecker.isAssignable function
function isAssignable(from, to) {
	if (from === to) return true;
	if (to === "unknown" || from === "unknown") return true;
	if (from === "na") return true; // na is assignable to any type

	// int -> float coercion
	if (from === "int" && to === "float") return true;
	if (from === "series<int>" && to === "series<float>") return true;

	// Simple -> series coercion
	if (from === "int" && to === "series<int>") return true;
	if (from === "float" && to === "series<float>") return true;
	if (from === "bool" && to === "series<bool>") return true;
	if (from === "string" && to === "series<string>") return true;
	if (from === "color" && to === "series<color>") return true;

	return false;
}

// Test the actual scenario
const varType = "float";
const initType = "series<float>";

console.log("\nScenario: var float hp = 0.0; hp := price (series<float>)");
console.log(
	"isAssignable(series<float>, float):",
	isAssignable(initType, varType),
); // Should be false
console.log(
	"canPromoteType(float, series<float>):",
	canPromoteType(varType, initType),
); // Should be true

// Test our logic
if (!isAssignable(initType, varType)) {
	console.log("Assignment not allowed, checking promotion...");
	if (canPromoteType(varType, initType)) {
		console.log(
			"✅ Type promotion allowed - should promote float to series<float>",
		);
	} else {
		console.log("❌ Type promotion not allowed - should error");
	}
} else {
	console.log("✅ Assignment allowed - no error");
}
