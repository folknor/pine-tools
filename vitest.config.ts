import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: {
			// Node.js globals for test environment
			Node: "readonly",
		},
		environment: "node",
		include: ["test/**/*.test.ts"],
		exclude: ["node_modules", "dist"],
		reporter: ["default", "verbose"],
		pool: "forks",
		singleFork: true,
		testTimeout: 10000, // Increased timeout for CLI tests
	},
	coverage: {
		provider: "v8",
		reporter: ["text", "json", "html"],
		exclude: ["node_modules/**", "dist/**", "test/**", "**/*.d.ts"],
	},
});
