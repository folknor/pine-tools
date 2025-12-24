import { describe, it, expect, beforeEach } from "vitest";
import {
	PineLanguageService,
	DiagnosticSeverity,
	CompletionItemKind,
} from "../src";

describe("PineLanguageService", () => {
	let service: PineLanguageService;

	beforeEach(() => {
		service = new PineLanguageService();
	});

	describe("Document Management", () => {
		it("should open and close documents", () => {
			service.openDocument("test.pine", "x = 1", 1);
			expect(service.getDocument("test.pine")).toBeDefined();

			service.closeDocument("test.pine");
			expect(service.getDocument("test.pine")).toBeUndefined();
		});

		it("should update documents", () => {
			service.openDocument("test.pine", "x = 1", 1);
			service.updateDocument("test.pine", "x = 2", 2);

			const doc = service.getDocument("test.pine");
			expect(doc?.content).toBe("x = 2");
			expect(doc?.version).toBe(2);
		});
	});

	describe("Completions", () => {
		it("should return namespace completions after dot", () => {
			service.openDocument("test.pine", "x = ta.", 1);
			const completions = service.getCompletions("test.pine", {
				line: 0,
				character: 7,
			});

			expect(completions.length).toBeGreaterThan(0);
			expect(completions.some((c) => c.label === "sma")).toBe(true);
			expect(completions.some((c) => c.label === "ema")).toBe(true);
		});

		it("should return all completions at empty position", () => {
			service.openDocument("test.pine", "", 1);
			const completions = service.getCompletions("test.pine", {
				line: 0,
				character: 0,
			});

			// Should have keywords
			expect(completions.some((c) => c.label === "if")).toBe(true);
			expect(completions.some((c) => c.label === "for")).toBe(true);

			// Should have namespaces
			expect(completions.some((c) => c.label === "ta")).toBe(true);
			expect(completions.some((c) => c.label === "math")).toBe(true);

			// Should have global functions
			expect(completions.some((c) => c.label === "plot")).toBe(true);

			// Should have standalone variables
			expect(completions.some((c) => c.label === "close")).toBe(true);
		});

		it("should return parameter completions inside function call", () => {
			service.openDocument("test.pine", 'x = input.int(', 1);
			const completions = service.getCompletions("test.pine", {
				line: 0,
				character: 14,
			});

			// Should have parameter names
			expect(completions.some((c) => c.label === "defval")).toBe(true);
			expect(completions.some((c) => c.label === "title")).toBe(true);
		});
	});

	describe("Hover", () => {
		it("should return hover for function", () => {
			service.openDocument("test.pine", "x = ta.sma(close, 14)", 1);
			const hover = service.getHover("test.pine", { line: 0, character: 7 });

			expect(hover).not.toBeNull();
			expect(hover?.contents).toContain("sma");
		});

		it("should return hover for variable", () => {
			service.openDocument("test.pine", "x = close", 1);
			const hover = service.getHover("test.pine", { line: 0, character: 5 });

			expect(hover).not.toBeNull();
			expect(hover?.contents).toContain("close");
		});

		it("should return null for unknown symbol", () => {
			service.openDocument("test.pine", "x = unknownThing", 1);
			const hover = service.getHover("test.pine", { line: 0, character: 5 });

			expect(hover).toBeNull();
		});
	});

	describe("Signature Help", () => {
		it("should return signature for function call", () => {
			service.openDocument("test.pine", "x = ta.sma(", 1);
			const sig = service.getSignatureHelp("test.pine", {
				line: 0,
				character: 11,
			});

			expect(sig).not.toBeNull();
			expect(sig?.signatures.length).toBeGreaterThan(0);
			expect(sig?.signatures[0].label).toContain("sma");
		});

		it("should track active parameter", () => {
			service.openDocument("test.pine", "x = ta.sma(close, ", 1);
			const sig = service.getSignatureHelp("test.pine", {
				line: 0,
				character: 18,
			});

			expect(sig).not.toBeNull();
			expect(sig?.activeParameter).toBe(1);
		});
	});

	describe("Diagnostics", () => {
		it("should return parse errors", () => {
			service.openDocument("test.pine", "x = ", 1);
			const diagnostics = service.getDiagnostics("test.pine");

			expect(diagnostics.length).toBeGreaterThan(0);
			expect(diagnostics[0].severity).toBe(DiagnosticSeverity.Error);
		});

		it("should warn about missing version header", () => {
			service.openDocument("test.pine", "x = 1", 1);
			const diagnostics = service.getDiagnostics("test.pine");

			expect(
				diagnostics.some((d) => d.message.includes("//@version=6")),
			).toBe(true);
		});

		it("should not warn if version header present", () => {
			service.openDocument("test.pine", "//@version=6\nx = 1", 1);
			const diagnostics = service.getDiagnostics("test.pine");

			expect(
				diagnostics.some((d) => d.message.includes("//@version=6")),
			).toBe(false);
		});

		it("should detect plotshape shape= error", () => {
			service.openDocument(
				"test.pine",
				"//@version=6\nplotshape(true, shape=shape.circle)",
				1,
			);
			const diagnostics = service.getDiagnostics("test.pine");

			expect(
				diagnostics.some((d) => d.message.includes('Did you mean "style"')),
			).toBe(true);
		});
	});

	describe("Formatting", () => {
		it("should trim trailing whitespace", () => {
			const result = PineLanguageService.formatCode("x = 1   \ny = 2  ");
			expect(result).toBe("x = 1\ny = 2\n");
		});

		it("should collapse multiple blank lines", () => {
			const result = PineLanguageService.formatCode("x = 1\n\n\n\ny = 2");
			expect(result).toBe("x = 1\n\ny = 2\n");
		});

		it("should ensure final newline", () => {
			const result = PineLanguageService.formatCode("x = 1");
			expect(result).toBe("x = 1\n");
		});
	});

	describe("Static Helpers", () => {
		it("should look up symbol info", () => {
			const info = PineLanguageService.getSymbolInfo("ta.sma");
			expect(info).not.toBeNull();
			expect(info?.kind).toBe("function");
			expect(info?.name).toBe("ta.sma");
		});

		it("should return null for unknown symbol", () => {
			const info = PineLanguageService.getSymbolInfo("unknownSymbol");
			expect(info).toBeNull();
		});

		it("should list all namespaces", () => {
			const namespaces = PineLanguageService.getAllNamespaces();
			expect(namespaces).toContain("ta");
			expect(namespaces).toContain("math");
			expect(namespaces).toContain("str");
		});

		it("should list functions by namespace", () => {
			const functions = PineLanguageService.getAllFunctions("ta");
			expect(functions).toContain("ta.sma");
			expect(functions).toContain("ta.ema");
		});
	});
});
