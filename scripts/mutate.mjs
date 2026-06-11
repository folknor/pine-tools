#!/usr/bin/env node
// Mutator - the (b) piece of TODO #48's mutation-testing harness.
//
// Takes a clean .pine source and produces single-site mutants: mechanical
// breakages TV should reject. There is no AST printer in the codebase, so
// mutation happens at the TEXT level, with sites LOCATED via the lexer
// (token line/col -> string offset) - formatting and comments survive, no
// printer needed. ONE mutation per mutant, so each survivor points at
// exactly one gap.
//
// Operators are designed around TV's error taxonomy (the CE code each
// breakage should provoke), not around our existing checks - that is how
// you find gaps we have NO check for:
//
//   drop-required-arg   -> CE10165  No value assigned to the "..." parameter
//   typo-member         -> CE10271  Could not find function ... (INV036/053)
//   wrong-type-literal  -> CE10123  Cannot call "f" with argument ... (INV061)
//   typo-param-name     -> CE10120  The "f" function does not have an
//                                   argument with the name "..." (INV061)
//   delete-decl         -> CE10272  Undeclared identifier (INV048)
//
// Module usage (the orchestrator, mutation-run.mjs):
//   import { generateMutants, OPERATORS } from "./mutate.mjs";
//   const mutants = generateMutants(source, { operators, sitesPer, seed });
//
// CLI usage (inspection):
//   node scripts/mutate.mjs <file.pine> [--operators a,b] [--sites-per N]
//        [--seed N] [--print <i>] [--out <path>]
//   --print emits mutant i's full source (to stdout, or to --out <path>)

import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const require = createRequire(import.meta.url);
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { Lexer } = require(
	resolve(ROOT, "dist/packages/core/src/parser/lexer.js"),
);

const FUNCTIONS = require(resolve(ROOT, "pine-data/v6/functions.json"));
const VARIABLES = require(resolve(ROOT, "pine-data/v6/variables.json"));
const CONSTANTS = require(resolve(ROOT, "pine-data/v6/constants.json"));

const FN_BY_NAME = new Map(FUNCTIONS.map((f) => [f.name, f]));
const KNOWN_NAMES = new Set([
	...FUNCTIONS.map((f) => f.name),
	...VARIABLES.map((v) => v.name),
	...CONSTANTS.map((c) => c.name),
]);

// Deterministic PRNG so a (fixture, seed) pair always yields the same
// site rotation - runs are bounded and reproducible, per the #48 design.
function mulberry32(seed) {
	let a = seed >>> 0;
	return () => {
		a |= 0;
		a = (a + 0x6d2b79f5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}

// --- source <-> token plumbing ----------------------------------------------

function lineStarts(source) {
	const starts = [0];
	for (let i = 0; i < source.length; i++) {
		if (source[i] === "\n") starts.push(i + 1);
	}
	return starts;
}

function makeCtx(source) {
	const tokens = new Lexer(source).tokenize();
	const starts = lineStarts(source);
	const offsetOf = (t) => starts[t.line - 1] + (t.column - 1);
	return { source, tokens, offsetOf };
}

function splice(source, start, end, replacement) {
	return source.slice(0, start) + replacement + source.slice(end);
}

// Find every call expression in the token stream: a callee chain
// IDENTIFIER (DOT IDENTIFIER)* immediately followed by LPAREN, with the
// matching RPAREN located by depth and the top-level argument spans
// (named-arg name tokens identified). Calls torn across statement
// boundaries (no matching RPAREN) are skipped.
function findCalls(ctx) {
	const { tokens } = ctx;
	const calls = [];
	for (let i = 0; i < tokens.length; i++) {
		if (tokens[i].type !== "IDENTIFIER") continue;
		// Walk the member chain forward.
		let j = i;
		const chain = [tokens[i]];
		while (
			tokens[j + 1]?.type === "DOT" &&
			tokens[j + 2]?.type === "IDENTIFIER"
		) {
			chain.push(tokens[j + 2]);
			j += 2;
		}
		// Don't start mid-chain (previous token a DOT).
		if (tokens[i - 1]?.type === "DOT") continue;
		if (tokens[j + 1]?.type !== "LPAREN") continue;
		const lparen = j + 1;
		// Find the matching RPAREN and top-level arg boundaries.
		let depth = 0;
		let rparen = -1;
		const argStarts = []; // token index of each arg's first token
		const commas = []; // token indices of top-level commas
		for (let k = lparen; k < tokens.length; k++) {
			const t = tokens[k];
			if (t.type === "LPAREN" || t.type === "LBRACKET") depth++;
			else if (t.type === "RPAREN" || t.type === "RBRACKET") {
				depth--;
				if (depth === 0 && t.type === "RPAREN") {
					rparen = k;
					break;
				}
			} else if (t.type === "COMMA" && depth === 1) commas.push(k);
		}
		if (rparen === -1) continue;
		// Arg spans: [lparen+1 .. comma-1], [comma+1 .. ...], last ends rparen-1.
		if (rparen > lparen + 1) {
			let s = lparen + 1;
			for (const c of commas) {
				argStarts.push({ start: s, end: c - 1 });
				s = c + 1;
			}
			argStarts.push({ start: s, end: rparen - 1 });
		}
		const args = argStarts.map(({ start, end }) => {
			const named =
				(tokens[start]?.type === "IDENTIFIER" ||
					tokens[start]?.type === "KEYWORD") &&
				tokens[start + 1]?.type === "ASSIGN";
			return { start, end, named, nameTok: named ? tokens[start] : null };
		});
		calls.push({
			name: chain.map((t) => t.value).join("."),
			nameTokens: chain,
			lparen,
			rparen,
			commas,
			args,
		});
	}
	return calls;
}

// A typo'd name guaranteed absent from the catalog.
function typoName(name) {
	let candidate = `${name}x`;
	while (KNOWN_NAMES.has(candidate)) candidate += "x";
	return candidate;
}

// --- operators ---------------------------------------------------------------
//
// Each operator: { expectedClass, describe, findSites(ctx) -> [site] } where
// site = { line, col, desc, apply() -> mutant source }.

export const OPERATORS = {
	// Remove the LAST positional argument of a catalog call whose params are
	// all required and all supplied positionally - the remaining call misses
	// a required arg on every overload-free signature.
	"drop-required-arg": {
		expectedClass: "CE10165",
		describe: "remove the last positional argument of a fully-required call",
		findSites(ctx) {
			const sites = [];
			for (const call of findCalls(ctx)) {
				const fn = FN_BY_NAME.get(call.name);
				if (!fn) continue;
				if ((fn.overloads ?? []).length > 0) continue;
				if (fn.flags?.variadic) continue;
				if (fn.parameters.some((p) => !p.type || p.type === "unknown"))
					continue;
				const requiredCount = fn.parameters.filter((p) => p.required).length;
				if (requiredCount === 0) continue;
				if (call.args.length === 0 || call.args.some((a) => a.named)) continue;
				if (call.args.length > requiredCount) continue; // drop would hit an optional
				const { tokens, offsetOf, source } = ctx;
				const lastArg = call.args[call.args.length - 1];
				// Splice from the comma before the last arg (or from after the
				// lparen when it is the only arg) to just before the rparen.
				const from =
					call.args.length === 1
						? offsetOf(tokens[call.lparen]) + 1
						: offsetOf(tokens[call.commas[call.commas.length - 1]]);
				const to = offsetOf(tokens[call.rparen]);
				const t = tokens[lastArg.start];
				sites.push({
					line: t.line,
					col: t.column,
					desc: `${call.name}(...): drop arg ${call.args.length} ("${fn.parameters[call.args.length - 1].name}")`,
					apply: () => splice(source, from, to, ""),
				});
			}
			return sites;
		},
	},

	// Typo the final member of a builtin namespaced call (ta.sma -> ta.smax).
	"typo-member": {
		expectedClass: "CE10271",
		describe: "typo the member name of a builtin namespaced call",
		findSites(ctx) {
			const sites = [];
			for (const call of findCalls(ctx)) {
				if (call.nameTokens.length < 2) continue;
				if (!FN_BY_NAME.has(call.name)) continue;
				const { offsetOf, source } = ctx;
				const memberTok = call.nameTokens[call.nameTokens.length - 1];
				const from = offsetOf(memberTok);
				const to = from + memberTok.value.length;
				const replacement = typoName(call.name).slice(
					call.name.length - memberTok.value.length,
				);
				sites.push({
					line: memberTok.line,
					col: memberTok.column,
					desc: `${call.name} -> ${call.name.slice(0, -memberTok.value.length)}${replacement}`,
					apply: () => splice(source, from, to, replacement),
				});
			}
			return sites;
		},
	},

	// Replace a single-token positional STRING argument with 42 where the
	// catalog types that param as a string - a provable CE10123.
	"wrong-type-literal": {
		expectedClass: "CE10123",
		describe: "replace a string literal argument with 42",
		findSites(ctx) {
			const sites = [];
			for (const call of findCalls(ctx)) {
				const fn = FN_BY_NAME.get(call.name);
				if (!fn) continue;
				if ((fn.overloads ?? []).length > 0) continue;
				const { tokens, offsetOf, source } = ctx;
				call.args.forEach((arg, idx) => {
					if (arg.named || arg.start !== arg.end) return;
					const t = tokens[arg.start];
					if (t.type !== "STRING") return;
					const param = fn.parameters[idx];
					if (!param?.type?.includes("string")) return;
					const from = offsetOf(t);
					sites.push({
						line: t.line,
						col: t.column,
						desc: `${call.name}(... ${t.value} -> 42 ...) [param "${param.name}": ${param.type}]`,
						apply: () => splice(source, from, from + t.value.length, "42"),
					});
				});
			}
			return sites;
		},
	},

	// Typo a NAMED argument's name in a catalog call (overlay= -> overlayx=).
	"typo-param-name": {
		expectedClass: "CE10120",
		describe: "typo a named argument's parameter name",
		findSites(ctx) {
			const sites = [];
			for (const call of findCalls(ctx)) {
				const fn = FN_BY_NAME.get(call.name);
				if (!fn) continue;
				const { offsetOf, source } = ctx;
				const paramNames = new Set(fn.parameters.map((p) => p.name));
				for (const arg of call.args) {
					if (!arg.named) continue;
					if (!paramNames.has(arg.nameTok.value)) continue; // already broken
					let typo = `${arg.nameTok.value}x`;
					while (paramNames.has(typo)) typo += "x";
					const from = offsetOf(arg.nameTok);
					sites.push({
						line: arg.nameTok.line,
						col: arg.nameTok.column,
						desc: `${call.name}(${arg.nameTok.value}= -> ${typo}=)`,
						apply: () =>
							splice(source, from, from + arg.nameTok.value.length, typo),
					});
				}
			}
			return sites;
		},
	},

	// Delete a single-line top-level declaration whose name is used later.
	"delete-decl": {
		expectedClass: "CE10272",
		describe: "delete a top-level single-line declaration that is used later",
		findSites(ctx) {
			const sites = [];
			const { tokens, source } = ctx;
			const starts = lineStarts(source);
			const lines = source.split("\n");
			for (let i = 0; i < tokens.length; i++) {
				const t = tokens[i];
				// Statement start: IDENTIFIER at column 1 followed by `=` (a
				// plain declaration; `:=`/`var`/typed forms are skipped - this
				// operator wants the simplest unambiguous shape).
				if (t.type !== "IDENTIFIER" || t.column !== 1) continue;
				if (tokens[i + 1]?.type !== "ASSIGN") continue;
				if (tokens[i - 1] && tokens[i - 1].type !== "NEWLINE") continue;
				// Single-line statements only: the declaration must end on its
				// own line (next line blank, comment, or column-1 code - no
				// wrapped continuations to reason about).
				const next = lines[t.line]; // 0-based: the line AFTER t.line
				if (next !== undefined && /^[ \t]/.test(next) && next.trim() !== "")
					continue;
				// The name must be USED later (a later token outside this line).
				const usedLater = tokens.some(
					(u, k) =>
						k > i &&
						u.type === "IDENTIFIER" &&
						u.value === t.value &&
						u.line > t.line &&
						tokens[k + 1]?.type !== "ASSIGN",
				);
				if (!usedLater) continue;
				const from = starts[t.line - 1];
				const to = t.line < starts.length ? starts[t.line] : source.length;
				sites.push({
					line: t.line,
					col: 1,
					desc: `delete declaration "${lines[t.line - 1].trim().slice(0, 60)}"`,
					apply: () => splice(source, from, to, ""),
				});
			}
			return sites;
		},
	},
};

// --- driver -------------------------------------------------------------------

// Generate up to sitesPer mutants per operator, site choice rotated by seed.
export function generateMutants(
	source,
	{ operators = Object.keys(OPERATORS), sitesPer = 1, seed = 1 } = {},
) {
	const ctx = makeCtx(source);
	const mutants = [];
	for (const op of operators) {
		const def = OPERATORS[op];
		if (!def) throw new Error(`unknown operator: ${op}`);
		const sites = def
			.findSites(ctx)
			.sort((a, b) => a.line - b.line || a.col - b.col);
		if (sites.length === 0) continue;
		const rng = mulberry32(seed * 7919 + op.length);
		const picked = new Set();
		for (let n = 0; n < Math.min(sitesPer, sites.length); n++) {
			let idx = Math.floor(rng() * sites.length);
			while (picked.has(idx)) idx = (idx + 1) % sites.length;
			picked.add(idx);
			const site = sites[idx];
			mutants.push({
				operator: op,
				expectedClass: def.expectedClass,
				site: { line: site.line, col: site.col, desc: site.desc },
				totalSites: sites.length,
				mutant: site.apply(),
			});
		}
	}
	return mutants;
}

// --- CLI ----------------------------------------------------------------------

const isMain =
	process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
	const args = process.argv.slice(2);
	const file = args.find((a) => !a.startsWith("--"));
	const opt = (name, dflt) => {
		const i = args.indexOf(`--${name}`);
		return i !== -1 ? args[i + 1] : dflt;
	};
	if (!file) {
		console.error(
			"usage: mutate.mjs <file.pine> [--operators a,b] [--sites-per N] [--seed N] [--print <i>]",
		);
		process.exit(1);
	}
	const source = readFileSync(file, "utf8");
	const mutants = generateMutants(source, {
		operators: opt("operators", Object.keys(OPERATORS).join(",")).split(","),
		sitesPer: Number(opt("sites-per", "1")),
		seed: Number(opt("seed", "1")),
	});
	const printIdx = opt("print", null);
	if (printIdx !== null) {
		const m = mutants[Number(printIdx)];
		if (!m) {
			console.error(`no mutant ${printIdx} (have ${mutants.length})`);
			process.exit(1);
		}
		const out = opt("out", null);
		if (out) writeFileSync(out, m.mutant);
		else process.stdout.write(m.mutant);
	} else {
		for (const [i, m] of mutants.entries()) {
			console.log(
				`[${i}] ${m.operator}  ${m.site.line}:${m.site.col}  expect=${m.expectedClass}  (${m.totalSites} sites)  ${m.site.desc}`,
			);
		}
		if (mutants.length === 0) console.log("no mutable sites found");
	}
}
