/**
 * Semantic lints - defects that COMPILE and are still wrong.
 *
 * Everything else in `analyzer/` and `parser/semanticAnalyzer.ts` mirrors
 * TradingView: an error TV raises, or a warning TV emits (CW100xx). These
 * rules are different in kind. TV's `translate_light` endpoint is SILENT on
 * every one of them (probed 2026-08-15, see INV144) - they describe scripts
 * that compile cleanly and then behave in a way the author did not intend, or
 * that fail later at chart load / runtime rather than at compile time.
 *
 * Because they are ours and not TV's, they:
 *   - are always warnings, never errors,
 *   - carry a `rule` id rather than a TV `CW` code,
 *   - land on the `lint` stage in the CLI output, so a consumer diffing us
 *     against TV can drop them wholesale.
 *
 * Rules are deliberately structural. Where a rule cannot be decided without
 * guessing intent, it stays silent: a false positive on a semantic lint is
 * worse than a miss, because it teaches the reader to ignore the channel.
 */

import { DiagnosticSeverity } from "../common/errors";
import type {
	AssignmentStatement,
	CallExpression,
	Expression,
	Identifier,
	Literal,
	Program,
	Statement,
	VariableDeclaration,
} from "../parser/ast";
import type { SemanticWarning } from "../parser/semanticAnalyzer";

/**
 * Plot budget. "Each script is limited to a maximum plot count of 64. All
 * `plot*()` calls and alertcondition() calls count towards the plot count"
 * (Manual, visuals/plots#plot-count-limit). Note `hline()` does NOT count,
 * and a call with a non-const `color` argument counts as TWO - see
 * `checkPlotBudget` for why we deliberately under-count.
 */
const PLOT_LIMIT = 64;

/**
 * `request.*()` budget: 40 UNIQUE calls (64 on the Ultimate plan), per
 * Manual writing/limitations#number-of-calls. Identical calls collapse to
 * one, which is why this is counted over deduplicated call text.
 */
const REQUEST_LIMIT = 40;

/** `request.footprint()` is capped at one unique call per script (same page). */
const FOOTPRINT_LIMIT = 1;

/** Calls that draw against the plot budget: `plot*()` plus `alertcondition()`. */
function countsTowardPlotBudget(name: string): boolean {
	return name.startsWith("plot") || name === "alertcondition";
}

/** Closes an open position. `strategy.cancel*` only withdraws a PENDING order. */
const EXIT_FUNCTIONS = new Set([
	"strategy.exit",
	"strategy.close",
	"strategy.close_all",
]);

const ENTRY_FUNCTIONS = new Set(["strategy.entry", "strategy.order"]);

const COMPOUND_ASSIGN = new Set(["+=", "-=", "*=", "/=", "%="]);

export function runSemanticLints(ast: Program): SemanticWarning[] {
	const ctx = new LintContext(ast);
	return [
		...checkRepaintingSecurity(ctx),
		...checkPlotBudget(ctx),
		...checkRequestBudget(ctx),
		...checkAccumulatorLifetime(ctx),
		...checkEntryWithoutExit(ctx),
	].sort((a, b) => a.line - b.line || a.column - b.column);
}

// ─────────────────────────────────────────────────────────
// Shared walk
// ─────────────────────────────────────────────────────────

interface CallSite {
	call: CallExpression;
	/** Dotted callee name (`request.security`), or "" for a computed callee. */
	name: string;
}

class LintContext {
	readonly calls: CallSite[] = [];
	/** Calls that are the object of an index expression - `f(...)[1]`. */
	readonly indexedCalls = new Set<CallExpression>();
	/**
	 * Bodies of the script's own functions, by name, so a rule can look at what
	 * a call actually evaluates rather than only at its arguments. Methods are
	 * keyed separately because a method call reads as `obj.name()` - the dotted
	 * callee name never matches the bare declaration name. see INV151
	 */
	readonly functionBodies = new Map<string, Statement[]>();
	readonly methodBodies = new Map<string, Statement[]>();

	constructor(readonly ast: Program) {
		walkStatements(ast.body, (stmt) => {
			if (stmt.type === "FunctionDeclaration")
				this.functionBodies.set(stmt.name, stmt.body);
			else if (stmt.type === "MethodDeclaration")
				this.methodBodies.set(stmt.name, stmt.body);
			for (const expr of statementExpressions(stmt)) this.collect(expr);
		});
	}

	/**
	 * The script's own body for a call, or undefined for a builtin. A dotted
	 * callee resolves against the METHOD table by its final segment only - an
	 * `obj.f()` call cannot reach a plain function declaration, so consulting
	 * `functionBodies` there would match `request.security` to a UDF named
	 * `security`.
	 */
	bodyOf(call: CallExpression): Statement[] | undefined {
		if (call.callee.type === "Identifier")
			return this.functionBodies.get(call.callee.name);
		if (call.callee.type === "MemberExpression")
			return this.methodBodies.get(call.callee.property.name);
		return undefined;
	}

	private collect(expr: Expression): void {
		walkExpression(expr, (node) => {
			if (node.type === "CallExpression") {
				this.calls.push({ call: node, name: calleeName(node.callee) });
			} else if (
				node.type === "IndexExpression" &&
				node.object.type === "CallExpression"
			) {
				this.indexedCalls.add(node.object);
			}
		});
	}

	callsNamed(...names: string[]): CallSite[] {
		const wanted = new Set(names);
		return this.calls.filter((c) => wanted.has(c.name));
	}
}

/**
 * Dotted name of a callee, or "" when it is not a plain identifier chain.
 * `request.security` -> "request.security"; `arr.get(0)()` -> "".
 */
function calleeName(callee: Expression): string {
	if (callee.type === "Identifier") return callee.name;
	if (callee.type === "MemberExpression") {
		const object = calleeName(callee.object);
		return object ? `${object}.${callee.property.name}` : "";
	}
	return "";
}

/** Every statement in the tree, outermost first. Blocks are visited in order. */
function walkStatements(
	stmts: Statement[],
	visit: (stmt: Statement) => void,
): void {
	for (const stmt of stmts) {
		visit(stmt);
		for (const block of statementBlocks(stmt)) walkStatements(block, visit);
	}
}

/** The nested statement lists a statement owns. */
function statementBlocks(stmt: Statement): Statement[][] {
	switch (stmt.type) {
		case "IfStatement":
			return stmt.alternate
				? [stmt.consequent, stmt.alternate]
				: [stmt.consequent];
		case "ForStatement":
		case "ForInStatement":
		case "WhileStatement":
		case "FunctionDeclaration":
		case "MethodDeclaration":
			return [stmt.body];
		case "SequenceStatement":
			return [stmt.statements];
		default:
			return [];
	}
}

/** The expressions a statement owns directly (not those of nested blocks). */
function statementExpressions(stmt: Statement): Expression[] {
	switch (stmt.type) {
		case "VariableDeclaration":
			return stmt.init ? [stmt.init] : [];
		case "TupleDeclaration":
			return [stmt.init];
		case "AssignmentStatement":
			return [stmt.target, stmt.value];
		case "ExpressionStatement":
			return [stmt.expression];
		case "IfStatement":
		case "WhileStatement":
			return [stmt.condition];
		case "ForStatement":
			return stmt.step ? [stmt.from, stmt.to, stmt.step] : [stmt.from, stmt.to];
		case "ForInStatement":
			return [stmt.collection];
		case "ReturnStatement":
			return [stmt.value];
		default:
			return [];
	}
}

/**
 * Every node in an expression tree, outermost first.
 *
 * `IfExpression` and `SwitchExpression` carry STATEMENT bodies, so the walk
 * crosses back into statement land - a `request.security()` inside a switch
 * arm is still a call the budget rules must see.
 */
function walkExpression(
	expr: Expression,
	visit: (node: Expression) => void,
): void {
	visit(expr);
	switch (expr.type) {
		case "CallExpression":
			walkExpression(expr.callee, visit);
			for (const arg of expr.arguments) walkExpression(arg.value, visit);
			break;
		case "MemberExpression":
			walkExpression(expr.object, visit);
			break;
		case "BinaryExpression":
			walkExpression(expr.left, visit);
			walkExpression(expr.right, visit);
			break;
		case "UnaryExpression":
			walkExpression(expr.argument, visit);
			break;
		case "TernaryExpression":
			walkExpression(expr.condition, visit);
			walkExpression(expr.consequent, visit);
			walkExpression(expr.alternate, visit);
			break;
		case "ArrayExpression":
			for (const element of expr.elements) walkExpression(element, visit);
			break;
		case "IndexExpression":
			walkExpression(expr.object, visit);
			walkExpression(expr.index, visit);
			break;
		case "IfExpression":
			walkExpression(expr.condition, visit);
			for (const block of [expr.consequent, expr.alternate ?? []]) {
				walkStatements(block, (stmt) => {
					for (const sub of statementExpressions(stmt))
						walkExpression(sub, visit);
				});
			}
			break;
		case "SwitchExpression":
			if (expr.discriminant) walkExpression(expr.discriminant, visit);
			for (const arm of expr.cases) {
				if (arm.condition) walkExpression(arm.condition, visit);
				// `statements` supersedes `result` when present - walking both
				// would double-count every call in a multi-statement arm.
				if (arm.statements) {
					walkStatements(arm.statements, (stmt) => {
						for (const sub of statementExpressions(stmt))
							walkExpression(sub, visit);
					});
				} else {
					walkExpression(arm.result, visit);
				}
			}
			break;
		default:
			break;
	}
}

/** Named argument, or the positional one at `index` if the call has no names there. */
function argumentAt(
	call: CallExpression,
	name: string,
	index: number,
): Expression | undefined {
	for (const arg of call.arguments) {
		if (arg.name === name) return arg.value;
	}
	const positional = call.arguments.filter((a) => a.name === undefined);
	return positional[index]?.value;
}

/** Stable text for a node, so identical calls can be recognised as identical. */
function serialize(expr: Expression): string {
	switch (expr.type) {
		case "Identifier":
			return expr.name;
		case "Literal":
			return expr.raw ?? String(expr.value);
		case "CallExpression":
			return `${serialize(expr.callee)}(${expr.arguments
				.map((a) => (a.name ? `${a.name}=` : "") + serialize(a.value))
				.join(",")})`;
		case "MemberExpression":
			return `${serialize(expr.object)}.${expr.property.name}`;
		case "BinaryExpression":
			return `(${serialize(expr.left)}${expr.operator}${serialize(expr.right)})`;
		case "UnaryExpression":
			return `(${expr.operator}${serialize(expr.argument)})`;
		case "TernaryExpression":
			return `(${serialize(expr.condition)}?${serialize(expr.consequent)}:${serialize(expr.alternate)})`;
		case "ArrayExpression":
			return `[${expr.elements.map(serialize).join(",")}]`;
		case "IndexExpression":
			return `${serialize(expr.object)}[${serialize(expr.index)}]`;
		default:
			// If/switch expressions have no cheap canonical form. Anchoring on the
			// source position keeps them UNIQUE, which is the conservative side:
			// it can only push a script over a budget, never hide one.
			return `${expr.type}@${expr.line}:${expr.column}`;
	}
}

function warn(
	node: { line: number; column: number },
	length: number,
	rule: string,
	message: string,
): SemanticWarning {
	return {
		line: node.line,
		column: node.column,
		length,
		message,
		severity: DiagnosticSeverity.Warning,
		rule,
	};
}

/** Anchor position of a call - the callee, so the squiggle sits on the name. */
function anchor(call: CallExpression): { line: number; column: number } {
	return { line: call.callee.line, column: call.callee.column };
}

// ─────────────────────────────────────────────────────────
// REPAINTING_SECURITY
// ─────────────────────────────────────────────────────────

/**
 * A `request.security()` that reads the CURRENT, still-forming higher-timeframe
 * bar. History shows the settled value and realtime shows a moving one, so the
 * backtest measures something the market will not reproduce.
 *
 * The `lookahead` argument never EXEMPTS a call - two earlier versions let it,
 * and both keyed on spelling rather than on the program: the first went silent
 * on any NAMED `lookahead=`, the second (INV146) narrowed that to
 * `barmerge.lookahead_off` resolved positionally too. But `lookahead_off` is
 * the DEFAULT - writing it out produces the identical program to omitting it -
 * so an exemption for it made the same call warn or not according to how its
 * author spelled a no-op. `request.security(sym, "D", close)` and
 * `request.security(sym, "D", close, lookahead = barmerge.lookahead_off)` are
 * one call, and the second is the one that used to slip a repainting read
 * through unnoticed.
 *
 * The exemption's real subject was lower-timeframe requests, which need no
 * offset - but HTF vs LTF is not statically decidable here, and an un-annotated
 * request is exactly as likely to be an LTF one, so keying on `lookahead_off`
 * only suppressed the LTF false positives of authors who happened to write the
 * default out. Dropping it takes the corpus rate from 17.2% to 26.7% of v6
 * files; an un-offset `request.security` is the Manual's headline repainting
 * bug, and that is a believable rate for scraped public scripts. see INV152
 *
 * What `lookahead` DOES decide is which of two different defects this is, and
 * the two get separate rule ids because acting on them differs:
 *
 *   - `barmerge.lookahead_on` with no offset requests the value at the START of
 *     the requested period, so on history it returns data that did not exist
 *     yet. That is future leak - `LOOKAHEAD_BIAS` - and the fix is to add the
 *     offset, keeping `lookahead_on`.
 *   - `lookahead_off`, written or defaulted, leaks nothing: history shows the
 *     value at the END of the period. It still repaints, because realtime shows
 *     the bar still forming - `REPAINTING_SECURITY`, and on a LOWER-timeframe
 *     request there is nothing to fix at all.
 *
 * Emitting the future-leak wording for both was expensive downstream: it reads
 * as a correctness finding, and acting on it for a `lookahead_off` call means
 * adding an offset AND switching to `lookahead_on`, which shifts every signal
 * by one higher-timeframe bar. A sweep of ~60 such conversions, plus CHANGELOG
 * entries asserting the calls had supplied data that did not exist yet, had to
 * be reverted. see INV153
 *
 * Silent whenever the author has demonstrably considered it:
 *   - a history offset anywhere in `expression` (`close[1]`, `ta.sma(c,14)[1]`,
 *     or the Manual's `close[barstate.isrealtime ? 1 : 0]` idiom), including
 *     one taken inside a helper the expression calls - see
 *     `containsHistoryOffset` / INV151,
 *   - a history offset on the CALL (`request.security(...)[1]`),
 *   - a `timeframe` argument that is provably the chart's own timeframe
 *     (`""` or `timeframe.period`) - same-timeframe requests have no
 *     unfinished-bar problem, and flagging them is upstream's biggest false
 *     positive class here.
 *
 * Restricted to `request.security`. `request.security_lower_tf` returns
 * intrabar collections whose repaint story is different enough that the same
 * structural test would be guesswork.
 */
function checkRepaintingSecurity(ctx: LintContext): SemanticWarning[] {
	const findings: SemanticWarning[] = [];

	for (const { call } of ctx.callsNamed("request.security")) {
		if (ctx.indexedCalls.has(call)) continue;

		// `lookahead` never exempts, it only picks the message - see the header.
		// Writing the default out is not evidence of anything. see INV152/INV153
		const timeframe = argumentAt(call, "timeframe", 1);
		if (timeframe && isChartTimeframe(timeframe)) continue;

		const expression = argumentAt(call, "expression", 2);
		if (!expression) continue;
		if (containsHistoryOffset(expression, ctx)) continue;

		const lookahead = argumentAt(call, "lookahead", 4);
		const leaks =
			lookahead !== undefined &&
			serialize(lookahead) === "barmerge.lookahead_on";

		findings.push(
			warn(
				anchor(call),
				"request.security".length,
				leaks ? "LOOKAHEAD_BIAS" : "REPAINTING_SECURITY",
				leaks
					? "'request.security' with 'lookahead = barmerge.lookahead_on' and no history offset returns the requested period's value from the START of that period, so on historical bars it reads data that did not exist yet. Offset the expression by one bar (close[1]), keeping 'lookahead_on'."
					: "'request.security' reads the current, still-forming bar of the requested timeframe, so this value repaints: history settles on the period's final value while realtime shows it moving. For a HIGHER timeframe, offset the expression by one bar (close[1]) together with 'lookahead = barmerge.lookahead_on' - note that shifts the value by one period. A same- or lower-timeframe request needs no change.",
			),
		);
	}

	return findings;
}

/** `""` or `timeframe.period` - the request stays on the chart's timeframe. */
function isChartTimeframe(expr: Expression): boolean {
	if (expr.type === "Literal") {
		// A string Literal's `value` keeps its delimiters (`"\"\""` for an empty
		// string), so the emptiness test has to strip them - three of them for
		// the triple-delimited multiline form. see INV145
		const text = String(expr.value);
		const quote = text[0];
		if (quote !== '"' && quote !== "'") return false;
		const width = text.startsWith(quote.repeat(3)) ? 3 : 1;
		return text.slice(width, -width) === "";
	}
	return serialize(expr) === "timeframe.period";
}

/**
 * Any `[...]` history access reachable from the subtree, whatever the offset
 * expression - INCLUDING one taken inside a function the subtree calls.
 *
 * Looking only at the literal argument text was wrong in a way the language
 * forces on the author: TV rejects the history operator on a tuple-returning
 * call (`Cannot call "operator SQBR"`), so a multi-value non-repainting request
 * has NO form other than moving the offset into a helper -
 * `request.security(sym, "D", f())` with `f() => [close[1], open[1]]`. That is
 * the documented idiom, and the old test flagged it as repainting. Following
 * the callee's body is what makes the rule test the expression the request
 * actually evaluates. see INV151
 *
 * `visited` stops the walk revisiting a body. Pine forbids recursion, so this
 * guards against a malformed tree rather than against legal code.
 */
function containsHistoryOffset(
	expr: Expression,
	ctx: LintContext,
	visited: Set<Statement[]> = new Set(),
): boolean {
	let found = false;
	const called: CallExpression[] = [];
	walkExpression(expr, (node) => {
		if (node.type === "IndexExpression") found = true;
		else if (node.type === "CallExpression") called.push(node);
	});
	if (found) return true;

	for (const call of called) {
		const body = ctx.bodyOf(call);
		if (!body || visited.has(body)) continue;
		visited.add(body);
		let hit = false;
		walkStatements(body, (stmt) => {
			if (hit) return;
			for (const sub of statementExpressions(stmt)) {
				if (containsHistoryOffset(sub, ctx, visited)) {
					hit = true;
					return;
				}
			}
		});
		if (hit) return true;
	}
	return false;
}

// ─────────────────────────────────────────────────────────
// PLOT_BUDGET
// ─────────────────────────────────────────────────────────

/**
 * More `plot*()` / `alertcondition()` calls than the chart will accept.
 *
 * The real cost of a call is not always one: a `plot()` whose `color` argument
 * is stronger than "const color" counts as two. We deliberately count every
 * call as one, which makes the total a LOWER BOUND - a script we flag is over
 * budget under any weighting, while a script we stay silent on may still be
 * over. Undercounting is the only side that cannot produce a false positive,
 * and the qualifier of a `color` argument is exactly the kind of inference
 * this module refuses to guess at.
 */
function checkPlotBudget(ctx: LintContext): SemanticWarning[] {
	const plots = ctx.calls.filter((c) => countsTowardPlotBudget(c.name));
	if (plots.length <= PLOT_LIMIT) return [];

	// Anchor on the call that breaks the budget, not on the first one - the
	// author needs to see where the allowance ran out.
	const breach = plots[PLOT_LIMIT];
	return [
		warn(
			anchor(breach.call),
			breach.name.length,
			"PLOT_BUDGET",
			`This script makes ${plots.length} plot-budget calls; a script may use at most ${PLOT_LIMIT}. Calls with a non-const 'color' argument count as two, so the real total may be higher.`,
		),
	];
}

// ─────────────────────────────────────────────────────────
// REQUEST_BUDGET
// ─────────────────────────────────────────────────────────

/**
 * More UNIQUE `request.*()` calls than a script may make.
 *
 * Uniqueness is the whole rule: repeating a call with identical arguments
 * reuses the first request's data and costs nothing, which is why a `for` loop
 * around one fixed `request.security()` is fine and the same loop with a
 * varying `timeframe` is a runtime error. Counted over serialized call text,
 * so the two shapes separate correctly.
 *
 * The limit is 40 on standard plans and 64 on Ultimate; we warn at 40 and say
 * so, since we cannot know the reader's plan.
 */
function checkRequestBudget(ctx: LintContext): SemanticWarning[] {
	const findings: SemanticWarning[] = [];
	const seen = new Set<string>();
	const footprints = new Set<string>();
	let breach: CallSite | undefined;
	let footprintBreach: CallSite | undefined;

	for (const site of ctx.calls) {
		if (!site.name.startsWith("request.")) continue;
		const key = serialize(site.call);

		if (site.name === "request.footprint") {
			if (!footprints.has(key)) {
				footprints.add(key);
				if (footprints.size > FOOTPRINT_LIMIT && !footprintBreach) {
					footprintBreach = site;
				}
			}
		}

		if (seen.has(key)) continue;
		seen.add(key);
		if (seen.size > REQUEST_LIMIT && !breach) breach = site;
	}

	if (breach) {
		findings.push(
			warn(
				anchor(breach.call),
				breach.name.length,
				"REQUEST_BUDGET",
				`This script makes ${seen.size} unique 'request.*()' calls; the limit is ${REQUEST_LIMIT} (${64} on the Ultimate plan). Identical calls are free - only distinct argument sets count.`,
			),
		);
	}

	if (footprintBreach) {
		findings.push(
			warn(
				anchor(footprintBreach.call),
				footprintBreach.name.length,
				"REQUEST_BUDGET",
				`This script makes ${footprints.size} unique 'request.footprint()' calls; a script may make only ${FOOTPRINT_LIMIT}.`,
			),
		);
	}

	return findings;
}

// ─────────────────────────────────────────────────────────
// ACCUMULATOR_LIFETIME
// ─────────────────────────────────────────────────────────

/**
 * A `var` accumulator that a loop adds to again on every bar, with no reset.
 *
 *     var float sum = 0.0
 *     for i = 0 to 9
 *         sum := sum + close[i]   // ten more closes every bar, forever
 *
 * The author wanted "sum of the last ten closes" and gets a number that grows
 * for the life of the chart. `var` is what makes it wrong: without it the value
 * is visibly constant and the mistake is obvious, whereas this produces a
 * plausible series that merely drifts - the defect that survives a backtest.
 *
 * The `while` form fails more quietly still. The state the condition tests
 * survives the bar, so the loop simply never runs again after the first:
 *
 *     var int counter = 0
 *     while counter < 5
 *         counter += 1            // on bar 2, counter is already 5
 *
 * Silent when the script resets the name ANYWHERE (`name := <expr not
 * mentioning name>`) - a reused buffer is correct code - and when a run-once
 * guard encloses the loop, since building a table on the first bar is a
 * legitimate reason to accumulate without one.
 */
function checkAccumulatorLifetime(ctx: LintContext): SemanticWarning[] {
	const seeds = new Map<string, VariableDeclaration>();
	walkStatements(ctx.ast.body, (stmt) => {
		if (stmt.type !== "VariableDeclaration") return;
		if (stmt.varType !== "var" && stmt.varType !== "varip") return;
		if (!stmt.init || !isNumericSeed(stmt.init)) return;
		seeds.set(stmt.name, stmt);
	});
	if (seeds.size === 0) return [];

	const reset = new Set<string>();
	walkStatements(ctx.ast.body, (stmt) => {
		if (stmt.type !== "AssignmentStatement") return;
		if (stmt.operator !== ":=") return;
		if (stmt.target.type !== "Identifier") return;
		if (!references(stmt.value, stmt.target.name)) reset.add(stmt.target.name);
	});

	const findings: SemanticWarning[] = [];
	const reported = new Set<string>();

	const scan = (stmts: Statement[], runOnce: boolean): void => {
		for (const stmt of stmts) {
			const isLoop =
				stmt.type === "ForStatement" ||
				stmt.type === "ForInStatement" ||
				stmt.type === "WhileStatement";

			if (isLoop && !runOnce) {
				for (const [name, decl] of seeds) {
					if (reported.has(name) || reset.has(name)) continue;
					const hit = findSelfAccumulation(stmt.body, name);
					if (!hit) continue;
					reported.add(name);
					findings.push(
						warn(
							hit,
							name.length,
							"ACCUMULATOR_LIFETIME",
							stmt.type === "WhileStatement"
								? `'${name}' is declared with ${decl.varType}, so it keeps its value across bars. On the next bar the while condition is already false and this loop never runs again. Reset '${name}' before the loop, or drop ${decl.varType} if it is per-bar state.`
								: `'${name}' is declared with ${decl.varType}, so it persists across bars and this loop adds to it again on every bar - it grows without bound. Drop ${decl.varType} for a per-bar total, or reset '${name}' before the loop.`,
						),
					);
				}
			}

			const guarded =
				runOnce ||
				(stmt.type === "IfStatement" && isRunOnceGuard(stmt.condition));
			for (const block of statementBlocks(stmt)) scan(block, guarded);
		}
	};

	scan(ctx.ast.body, false);
	return findings;
}

/** `0`, `-1`, `0.0`, or `na` - a scalar seed, as opposed to a collection. */
function isNumericSeed(expr: Expression): boolean {
	if (expr.type === "Literal") return typeof expr.value === "number";
	if (expr.type === "Identifier") return expr.name === "na";
	if (expr.type === "UnaryExpression" && expr.operator === "-") {
		return isNumericSeed(expr.argument);
	}
	return false;
}

/** Whether an identifier appears anywhere in an expression. */
function references(expr: Expression, name: string): boolean {
	let found = false;
	walkExpression(expr, (node) => {
		if (node.type === "Identifier" && node.name === name) found = true;
	});
	return found;
}

/**
 * The first `name += ...` / `name := <expr mentioning name>` that a loop body
 * runs UNCONDITIONALLY, or undefined. Returns the assignment so the warning
 * lands on the accumulating statement rather than on the declaration.
 *
 * Conditionality is the whole discriminator. An increment guarded by an `if`
 * inside the loop is EVENT-driven - the running total of some occurrence over
 * the life of the chart, which is what a `var` counter is for:
 *
 *     for i = 0 to fvgs.size() - 1
 *         if close < fvgs.get(i).y1
 *             mitigated += 1      // a statistic, not a bug
 *
 * An unconditional one re-adds the whole loop range on every bar, which is
 * the defect. So the search descends into nested LOOPS (still unconditional -
 * more iterations, same problem) but stops at `if`/`switch` bodies.
 */
function findSelfAccumulation(
	body: Statement[],
	name: string,
): AssignmentStatement | undefined {
	for (const stmt of body) {
		if (stmt.type === "AssignmentStatement") {
			if (stmt.target.type !== "Identifier" || stmt.target.name !== name) {
				continue;
			}
			if (COMPOUND_ASSIGN.has(stmt.operator)) return stmt;
			if (stmt.operator === ":=" && references(stmt.value, name)) return stmt;
			continue;
		}
		if (
			stmt.type === "ForStatement" ||
			stmt.type === "ForInStatement" ||
			stmt.type === "WhileStatement"
		) {
			const nested = findSelfAccumulation(stmt.body, name);
			if (nested) return nested;
		}
	}
	return undefined;
}

/** `barstate.isfirst` / `barstate.islast` / `bar_index == 0` in a condition. */
function isRunOnceGuard(condition: Expression): boolean {
	let found = false;
	walkExpression(condition, (node) => {
		if (node.type === "MemberExpression") {
			const name = serialize(node);
			if (name === "barstate.isfirst" || name === "barstate.islast")
				found = true;
		}
		if (
			node.type === "BinaryExpression" &&
			node.operator === "==" &&
			isBarIndexZero(node.left, node.right)
		) {
			found = true;
		}
	});
	return found;
}

function isBarIndexZero(left: Expression, right: Expression): boolean {
	const pair = [left, right];
	const hasBarIndex = pair.some(
		(e): e is Identifier => e.type === "Identifier" && e.name === "bar_index",
	);
	const hasZero = pair.some(
		(e): e is Literal => e.type === "Literal" && e.value === 0,
	);
	return hasBarIndex && hasZero;
}

// ─────────────────────────────────────────────────────────
// ENTRY_WITHOUT_EXIT
// ─────────────────────────────────────────────────────────

/**
 * A strategy that opens positions and never closes them.
 *
 * Script-level rather than per-entry: matching each `strategy.entry` id to its
 * exits needs flow analysis, and a heuristic that guessed would misfire on
 * legitimate multi-entry designs. The blunt form - entries exist, no exit
 * mechanism exists anywhere - is unambiguous.
 *
 * `strategy.cancel` / `strategy.cancel_all` are NOT exits: they withdraw a
 * pending order and leave an open position untouched.
 *
 * Silent on REVERSAL strategies. `strategy.entry` closes an opposing position
 * before opening its own, so a script issuing entries in both directions -
 * TradingView's own stock strategies are built this way - bounds its exposure
 * without ever naming an exit function. Counting those was upstream's largest
 * false positive class on real scripts (see INV144's corpus sweep).
 */
function checkEntryWithoutExit(ctx: LintContext): SemanticWarning[] {
	const entries = ctx.calls.filter((c) => ENTRY_FUNCTIONS.has(c.name));
	if (entries.length === 0) return [];
	if (ctx.calls.some((c) => EXIT_FUNCTIONS.has(c.name))) return [];
	if (hasReversingEntries(ctx)) return [];

	const first = entries[0];
	return [
		warn(
			anchor(first.call),
			first.name.length,
			"ENTRY_WITHOUT_EXIT",
			"This script opens positions but never closes them - no 'strategy.exit', 'strategy.close' or 'strategy.close_all' anywhere, and no opposing entry to reverse into. An entry without an exit is unbounded risk ('strategy.cancel' withdraws a pending order, it does not close a position).",
		),
	];
}

/**
 * Whether the script issues `strategy.entry` calls in BOTH directions, so an
 * open position is always closed by its opposite.
 *
 * A direction we cannot read statically (a variable, a ternary) counts as
 * reversing: unknown means we cannot show the exposure is unbounded, and this
 * rule reports only what it can show. `strategy.order` is excluded - it does
 * not close an opposing position.
 */
function hasReversingEntries(ctx: LintContext): boolean {
	let long = false;
	let short = false;

	for (const { call } of ctx.callsNamed("strategy.entry")) {
		const direction = argumentAt(call, "direction", 1);
		if (!direction) continue;
		const name = serialize(direction);
		if (name === "strategy.long") long = true;
		else if (name === "strategy.short") short = true;
		else return true;
	}

	return long && short;
}
