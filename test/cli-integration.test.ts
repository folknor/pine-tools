/**
 * CLI Integration Tests
 * Tests CLI integration with different file types and edge cases
 */

import { execSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("CLI Integration Tests", () => {
	const tempDir = path.join(os.tmpdir(), `pine-cli-integration-${Date.now()}`);
	const cliPath = path.join(__dirname, "..", "dist", "src", "cli.js");

	beforeAll(() => {
		fs.mkdirSync(tempDir, { recursive: true });
	});

	afterAll(() => {
		fs.rmSync(tempDir, { recursive: true, force: true });
	});

	const runCLI = (filePath: string) => {
		try {
			const output = execSync(`node "${cliPath}" "${filePath}"`, {
				encoding: "utf8",
				cwd: __dirname,
			});
			return { success: true, output: JSON.parse(output) };
		} catch (error: any) {
			try {
				const parsed = JSON.parse(error.stdout);
				return { success: false, output: parsed };
			} catch {
				return {
					success: false,
					output: { success: false, error: error.message },
				};
			}
		}
	};

	describe("Pine Script Language Features", () => {
		it("should handle strategy declarations", () => {
			const strategyFile = path.join(tempDir, "strategy.pine");
			fs.writeFileSync(
				strategyFile,
				`//@version=6
strategy("Test Strategy", overlay=true)
length = input.int(20, "Length")
sma = ta.sma(close, length)
if ta.crossover(close, sma)
    strategy.entry("Long", strategy.long)
if ta.crossunder(close, sma)
    strategy.close("Long")
plot(sma, "SMA")
`,
			);

			const result = runCLI(strategyFile);
			expect(result.success).toBe(true);
			expect(result.output.result.errors).toEqual([]);
		});

		it("should handle library declarations", () => {
			const libraryFile = path.join(tempDir, "library.pine");
			fs.writeFileSync(
				libraryFile,
				`//@version=6
library("Test Library", overlay=true)
export f_sma(source, length) =>
    ta.sma(source, length)

export f_cross(source1, source2) =>
    ta.crossover(source1, source2)
`,
			);

			const result = runCLI(libraryFile);
			expect(result.success).toBe(true);
			expect(result.output.result.errors).toEqual([]);
		});

		it("should handle user-defined functions", () => {
			const udfFile = path.join(tempDir, "udf.pine");
			fs.writeFileSync(
				udfFile,
				`//@version=6
indicator("UDF Test")

// User-defined function
customMA(source, length) =>
    ta.ema(ta.sma(source, length), length)

myMA = customMA(close, 20)
plot(myMA, "Custom MA")
`,
			);

			const result = runCLI(udfFile);
			expect(result.success).toBe(true);
			expect(result.output.result.errors).toEqual([]);
		});

		it("should handle type definitions (v6)", () => {
			const typeFile = path.join(tempDir, "types.pine");
			fs.writeFileSync(
				typeFile,
				`//@version=6
indicator("Type Test")

type Point
    float x
    float y
    float timestamp

createPoint(x, y) =>
    Point.new(x, y, time)

p1 = createPoint(close, high)
plot(p1.x, "X Value")
`,
			);

			const result = runCLI(typeFile);
			expect(result.success).toBe(true);
			expect(result.output.result.errors).toEqual([]);
		});
	});

	describe("Complex Validation Scenarios", () => {
		it("should detect function parameter count mismatches", () => {
			const paramFile = path.join(tempDir, "params.pine");
			fs.writeFileSync(
				paramFile,
				`//@version=6
indicator("Parameter Test")

// Too many parameters for alertcondition (max 3)
alertcondition(true, "Title", "Message", "Extra", "Another")

// Missing required parameter for input.string
str_input = input.string()

// Wrong parameter name for plotshape (should be style, not shape)
plotshape(close > open, shape=shape.triangleup)
`,
			);

			const result = runCLI(paramFile);
			expect(result.success).toBe(true);
			expect(result.output.result.errors.length).toBeGreaterThan(0);

			const errors = result.output.result.errors;
			const hasAlertError = errors.some(
				(e: any) =>
					e.message.includes("Too many parameters") &&
					e.message.includes("alertcondition"),
			);
			const hasInputError = errors.some(
				(e: any) =>
					e.message.includes("Missing") && e.message.includes("input.string"),
			);
			const hasPlotError = errors.some(
				(e: any) =>
					e.message.includes("shape") && e.message.includes("plotshape"),
			);

			expect(hasAlertError || hasInputError || hasPlotError).toBe(true);
		});

		it("should handle namespace function validation", () => {
			const namespaceFile = path.join(tempDir, "namespace.pine");
			fs.writeFileSync(
				namespaceFile,
				`//@version=6
indicator("Namespace Test")

// Valid namespace functions
sma20 = ta.sma(close, 20)
ema20 = ta.ema(close, 20)
rsi14 = ta.rsi(close, 14)
crossUp = ta.crossover(close, sma20)

// Invalid namespace functions
invalid_ta = ta.nonexistent(close)
invalid_math = math.fake_function(close)
invalid_str = str.invalid_function("test")
`,
			);

			const result = runCLI(namespaceFile);
			expect(result.success).toBe(true);

			const errors = result.output.result.errors;
			const hasNamespaceError = errors.some(
				(e: any) =>
					e.message.includes("nonexistent") ||
					e.message.includes("fake_function") ||
					e.message.includes("invalid_function"),
			);
			expect(hasNamespaceError).toBe(true);
		});
	});

	describe("File Path Handling", () => {
		it("should handle relative file paths", () => {
			const result = runCLI("./pinescripts/test-scripts/valid.pine");
			expect(result.success).toBe(true);
		});

		it("should handle absolute file paths", () => {
			const validFixture = path.join(
				__dirname,
				"../pinescripts/test-scripts",
				"valid.pine",
			);
			const result = runCLI(validFixture);
			expect(result.success).toBe(true);
		});

		it("should handle file paths with spaces", () => {
			const spacedFile = path.join(tempDir, "file with spaces.pine");
			fs.writeFileSync(
				spacedFile,
				`//@version=6
indicator("Spaces Test")
plot(close)
`,
			);

			const result = runCLI(spacedFile);
			expect(result.success).toBe(true);
		});

		it("should handle file paths with special characters", () => {
			const specialFile = path.join(tempDir, "test-file_v1.2.pine");
			fs.writeFileSync(
				specialFile,
				`//@version=6
indicator("Special Chars Test")
plot(close)
`,
			);

			const result = runCLI(specialFile);
			expect(result.success).toBe(true);
		});
	});

	describe("Output Consistency", () => {
		it("should produce consistent error format across different error types", () => {
			const mixedFile = path.join(tempDir, "mixed-errors.pine");
			fs.writeFileSync(
				mixedFile,
				`//@version=6
indicator("Mixed Errors")

// Syntax error (missing closing paren)
sma = ta.sma(close, 20

// Validation error
plot(undefinedVar)

// Parameter error
alertcondition(true, "Title", "Message", "Extra")
`,
			);

			const result = runCLI(mixedFile);
			expect(result.success).toBe(true);

			const errors = result.output.result.errors;
			errors.forEach((error: any) => {
				expect(error).toHaveProperty("start");
				expect(error).toHaveProperty("end");
				expect(error).toHaveProperty("message");
				expect(typeof error.start.line).toBe("number");
				expect(typeof error.start.column).toBe("number");
				expect(typeof error.end.line).toBe("number");
				expect(typeof error.end.column).toBe("number");
				expect(typeof error.message).toBe("string");
			});
		});

		it("should maintain error order (lexer errors first)", () => {
			const orderFile = path.join(tempDir, "order-test.pine");
			fs.writeFileSync(
				orderFile,
				`//@version=6
indicator("Order Test")

// Syntax error on line 5
sma = ta.sma(close, 20

// Validation error on line 6
plot(undefinedVar)
`,
			);

			const result = runCLI(orderFile);
			expect(result.success).toBe(true);

			const errors = result.output.result.errors;
			if (errors.length >= 2) {
				// Lexer errors (syntax) should come before validation errors
				const syntaxError = errors.find(
					(e: any) =>
						e.message.includes("Expected") || e.message.includes("Unexpected"),
				);
				const validationError = errors.find((e: any) =>
					e.message.includes("undefinedVar"),
				);

				if (syntaxError && validationError) {
					const syntaxIndex = errors.indexOf(syntaxError);
					const validationIndex = errors.indexOf(validationError);
					expect(syntaxIndex).toBeLessThan(validationIndex);
				}
			}
		});
	});

	describe("Real-world Scenarios", () => {
		it("should handle a complete trading strategy", () => {
			const strategyFile = path.join(tempDir, "complete-strategy.pine");
			fs.writeFileSync(
				strategyFile,
				`//@version=6
strategy("Complete Strategy", "CS", overlay=true, default_qty_type=strategy.percent_of_equity, default_qty_value=10)

// Inputs
length = input.int(20, "MA Length", minval=5, maxval=200)
src = input.source(close, "Source")
riskReward = input.float(2.0, "Risk/Reward", minval=1.0, maxval=5.0, step=0.1)

// Indicators
fastMA = ta.ema(src, math.floor(length / 2))
slowMA = ta.ema(src, length)
atr = ta.atr(14)

// Signals
longCondition = ta.crossover(fastMA, slowMA)
shortCondition = ta.crossunder(fastMA, slowMA)

// Risk Management
longStop = strategy.position_avg_price - atr * 2
shortStop = strategy.position_avg_price + atr * 2
longTarget = strategy.position_avg_price + atr * riskReward
shortTarget = strategy.position_avg_price - atr * riskReward

// Execute trades
if longCondition and strategy.position_size == 0
    strategy.entry("Long", strategy.long, comment="Long Entry")
    
if shortCondition and strategy.position_size == 0
    strategy.entry("Short", strategy.short, comment="Short Entry")

if strategy.position_size > 0
    strategy.exit("Long", stop=longStop, limit=longTarget)
    
if strategy.position_size < 0
    strategy.exit("Short", stop=shortStop, limit=shortTarget)

// Plots
plot(fastMA, "Fast MA", color=color.blue)
plot(slowMA, "Slow MA", color=color.red)
plotshape(longCondition, "Long", style=shape.triangleup, location=location.belowbar, color=color.green, size=size.small)
plotshape(shortCondition, "Short", style=shape.triangledown, location=location.abovebar, color=color.red, size=size.small)
`,
			);

			const result = runCLI(strategyFile);
			expect(result.success).toBe(true);
			expect(result.output.result.errors).toEqual([]);
		});

		it("should handle complex indicator with multiple features", () => {
			const indicatorFile = path.join(tempDir, "complex-indicator.pine");
			fs.writeFileSync(
				indicatorFile,
				`//@version=6
indicator("Complex Indicator", "CI", overlay=true, max_lines_count=10, max_labels_count=50)

// Type definitions
type Signal
    bool isLong
    bool isShort
    float strength
    int timestamp

type Level
    float price
    string label
    color levelColor

// Inputs
length = input.int(20, "Length", minval=5, maxval=100)
mult = input.float(2.0, "Multiplier", minval=0.1, maxval=5.0)
showLabels = input.bool(true, "Show Labels")
labelColor = input.color(color.yellow, "Label Color")

// Calculations
basis = ta.sma(close, length)
dev = mult * ta.stdev(close, length)
upper = basis + dev
lower = basis - dev
middle = basis

// Signal generation
bullSignal = ta.crossover(close, lower)
bearSignal = ta.crossunder(close, upper)
signalStrength = math.abs(close - middle) / dev

// Create signal objects
currentSignal = bullSignal ? 
    Signal.new(true, false, signalStrength, time) : 
    bearSignal ? 
        Signal.new(false, true, signalStrength, time) : 
        na

// Level calculations
resistanceLevels = ta.pivothigh(high, 10, 10)
supportLevels = ta.pivotlow(low, 10, 10)

// Plots
plot(middle, "Middle", color=color.gray, linewidth=2)
plot(upper, "Upper", color=color.red)
plot(lower, "Lower", color=color.green)
fill(upper, lower, color.new(color.green, 90), "Cloud")

// Signal shapes
plotshape(bullSignal, "Buy", style=shape.labelup, location=location.belowbar, 
    color=color.green, textcolor=color.white, size=size.small, text="BUY")
plotshape(bearSignal, "Sell", style=shape.labeldown, location=location.abovebar, 
    color=color.red, textcolor=color.white, size=size.small, text="SELL")

// Labels for levels
if showLabels and not na(resistanceLevels)
    label.new(bar_index[1], resistanceLevels, "R", 
        color=labelColor, textcolor=color.white, size=size.small)
        
if showLabels and not na(supportLevels)
    label.new(bar_index[1], supportLevels, "S", 
        color=labelColor, textcolor=color.white, size=size.small)

// Alert conditions
alertcondition(bullSignal, "Bull Signal", "Price crossed above lower band")
alertcondition(bearSignal, "Bear Signal", "Price crossed below upper band")
`,
			);

			const result = runCLI(indicatorFile);
			expect(result.success).toBe(true);
			expect(result.output.result.errors).toEqual([]);
		});
	});
});
