/**
 * Offline union of overloaded-function parameter types.
 *
 * The scraper captures every overload's argument types into `overloadArgs`
 * (a per-overload list of {name,type}); this module turns that raw dump into a
 * single type string per parameter - entirely offline, so the rule can be
 * iterated without re-scraping TradingView. See TODO #17.
 */

export interface OverloadArg {
	name: string;
	type: string;
	// Per-overload arg description (used by generate's buildOverloads / flat-
	// description backfill; the union itself only reads `type`). See TODO #25.
	description?: string;
}

export interface OverloadCapture {
	parameters?: Array<{ name: string }>;
	overloads?: string[];
	overloadArgs?: OverloadArg[][];
}

const PRIMITIVES = new Set(["int", "float", "bool", "string", "color"]);

// Qualifier widening order: a param accepted as `series` also accepts the
// narrower qualifiers, so the union takes the widest qualifier seen.
const QUALIFIER_RANK: Record<string, number> = {
	const: 0,
	input: 1,
	simple: 2,
	series: 3,
};

// Canonical ordering for deterministic union output; primitives first.
const TYPE_ORDER = ["int", "float", "bool", "string", "color"];

interface Parsed {
	qualifier: string | null;
	rest: string;
	raw: string;
}

function parse(typeString: string): Parsed {
	const m = typeString.match(/^(const|input|simple|series)\s+(.+)$/);
	return m
		? { qualifier: m[1], rest: m[2].trim(), raw: typeString }
		: { qualifier: null, rest: typeString.trim(), raw: typeString };
}

// A clean primitive union is `<qualifier> prim(/prim)*` with no templated types.
function isCleanPrimitive(p: Parsed): boolean {
	if (p.qualifier === null) return false;
	if (/[<>]/.test(p.rest)) return false;
	return p.rest.split("/").every((t) => PRIMITIVES.has(t.trim()));
}

function orderPrimitives(prims: Set<string>): string[] {
	return [...prims].sort((a, b) => {
		const ia = TYPE_ORDER.indexOf(a);
		const ib = TYPE_ORDER.indexOf(b);
		if (ia !== -1 && ib !== -1) return ia - ib;
		if (ia !== -1) return -1;
		if (ib !== -1) return 1;
		return a.localeCompare(b);
	});
}

// Merge primitive-union fragments (e.g. ["int/float", "int"]) into one ordered
// "int/float". Returns null if any member is not a primitive scalar.
function mergePrimitives(fragments: string[]): string | null {
	const prims = new Set<string>();
	for (const fragment of fragments) {
		for (const t of fragment.split("/")) {
			const base = t.trim();
			if (!PRIMITIVES.has(base)) return null;
			prims.add(base);
		}
	}
	return orderPrimitives(prims).join("/");
}

/**
 * Union a set of per-overload type strings for ONE parameter.
 *  1. all clean primitive unions → widest qualifier + merged primitive set
 *     (nz, math.abs, int, color.b)
 *  2. all the same collection kind (array/matrix/map) → union element types
 *     (array.abs: array<int/float> ∪ array<int> → array<int/float>)
 *  3. all identical → keep that string (e.g. "series sort_order")
 *  4. differing/mixed (a broad overload alongside narrower ones) → "unknown"
 * - the universal-param case (na.x: "simple int/float" in overload #0 vs the
 *       everything-accepting type in the `series bool` overload).
 */
export function unionTypes(typeStrings: string[]): string {
	const uniq = [...new Set(typeStrings)];
	const parsed = uniq.map(parse);

	// 1. clean primitive unions
	if (parsed.every(isCleanPrimitive)) {
		let bestRank = -1;
		let bestQualifier = "series";
		for (const p of parsed) {
			const rank = QUALIFIER_RANK[p.qualifier as string];
			if (rank > bestRank) {
				bestRank = rank;
				bestQualifier = p.qualifier as string;
			}
		}
		return `${bestQualifier} ${mergePrimitives(parsed.map((p) => p.rest))}`;
	}

	// 2. same collection kind → union element types
	const coll = uniq.map((t) => t.match(/^(array|matrix|map)<(.+)>$/));
	if (coll.every(Boolean) && new Set(coll.map((m) => m?.[1])).size === 1) {
		const kind = coll[0]?.[1];
		const elements = coll.map((m) => m?.[2] as string);
		const innerMerged = mergePrimitives(elements);
		if (innerMerged) return `${kind}<${innerMerged}>`;
		const inners = new Set(elements);
		if (inners.size === 1) return `${kind}<${[...inners][0]}>`;
		return "unknown";
	}

	// 3. all identical
	if (uniq.length === 1) return uniq[0];

	// 4. differing / mixed → accept-anything
	return "unknown";
}

/**
 * Are the overloads NESTED - i.e. does every overload's ordered parameter-name
 * list match a prefix of the longest overload's list? If so, the overloads
 * differ only by trailing OPTIONAL parameters (e.g. math.round's `precision`,
 * input.int's `minval`/`maxval`/`step`): the 1-arg form is a prefix of the
 * 2-arg form. Such a subset parameter has a real, unionable type.
 *
 * If NOT nested, the overloads are genuinely DIVERGENT alternative forms whose
 * parameter sets disagree by position (e.g. box.new / line.new point-vs-scalar
 * coordinates, ta.pivothigh's prepended `source`). There a subset parameter is
 * overload-specific and must stay "unknown" so `hasOverloads()` keeps bypassing
 * positional validation rather than checking a call against the wrong form.
 */
function overloadsAreNested(overloadArgs: OverloadArg[][]): boolean {
	const nameLists = overloadArgs.map((args) => args.map((a) => a.name));
	const longest = nameLists.reduce(
		(a, b) => (b.length > a.length ? b : a),
		[] as string[],
	);
	return nameLists.every((list) => list.every((n, i) => longest[i] === n));
}

/**
 * Compute union types for an overloaded function's parameters from its
 * `overloadArgs` capture.
 *
 * For NESTED overloads (prefix-chain - see overloadsAreNested) every captured
 * parameter is unioned over the overloads where it appears, because trailing
 * params are simply optional. For DIVERGENT overloads only parameters present
 * in EVERY overload are unioned; the rest are left out so the caller keeps them
 * "unknown" and `hasOverloads()` still bypasses positional validation.
 */
export function unionOverloadParams(
	detail: OverloadCapture,
): Map<string, string> {
	const result = new Map<string, string>();
	const overloadArgs = detail.overloadArgs;
	if (!overloadArgs || overloadArgs.length < 2) return result;

	const overloadCount = overloadArgs.length;
	const nested = overloadsAreNested(overloadArgs);
	const byName = new Map<string, { types: string[]; seen: Set<number> }>();

	overloadArgs.forEach((args, i) => {
		for (const { name, type } of args) {
			const entry = byName.get(name) ?? { types: [], seen: new Set<number>() };
			entry.types.push(type);
			entry.seen.add(i);
			byName.set(name, entry);
		}
	});

	for (const [name, entry] of byName) {
		if (!nested && entry.seen.size !== overloadCount) continue;
		result.set(name, unionTypes(entry.types));
	}

	return result;
}

// Strip a leading qualifier to the bare base type ("series color" -> "color").
function baseType(s: string): string {
	return (s || "").trim().replace(/^(const|input|simple|series)\s+/, "");
}

/**
 * Detect a "return-follows-source" parameter: an overloaded function whose
 * return type varies in lockstep with ONE scalar parameter (e.g. ta.valuewhen,
 * ta.change - the return is the type of `source`, but the scraped static return
 * is frozen to overload #0). Returns that param's name, or null.
 *
 * Conservative on purpose: requires the return to vary over primitives, NO
 * collection (array/matrix/map) param present (those are element-followers,
 * already covered by the "element" flag), and EXACTLY ONE scalar param whose
 * primitive-union set equals the set of overload return base types. Ambiguous
 * cases (two matching params, or a coincidental config param) return null.
 */
export function detectReturnTypeParam(detail: OverloadCapture): string | null {
	const overloads = detail.overloads;
	if (!overloads || overloads.length < 2) return null;

	const returnBases = new Set<string>();
	for (const o of overloads) {
		const ret = o.match(/→\s*(.+)$/)?.[1];
		if (!ret) return null;
		returnBases.add(baseType(ret));
	}
	if (returnBases.size < 2) return null;
	if (![...returnBases].every((b) => PRIMITIVES.has(b))) return null;

	const unioned = unionOverloadParams(detail);

	// Any collection param → element-follower territory; leave to the "element"
	// flag rather than risk a wrong scalar match.
	for (const t of unioned.values()) {
		if (/[<>]/.test(t)) return null;
	}

	let match: null | string = null;
	for (const [name, type] of unioned) {
		if (type === "unknown") continue;
		const bases = new Set(baseType(type).split("/"));
		if (
			bases.size === returnBases.size &&
			[...returnBases].every((b) => bases.has(b))
		) {
			if (match) return null; // ambiguous - more than one scalar match
			match = name;
		}
	}
	if (!match) return null;

	// Set-equality alone can match coincidentally: math.round's returns are
	// {int, float} only because the PRECISION overloads return float - the
	// `number` param never drives the return base (round(float) -> int).
	// Require the per-overload mapping candidate-base -> return-base to be
	// FUNCTIONAL: the same candidate base set must never produce two
	// different return bases (round maps "int/float" to both int and float;
	// ta.valuewhen maps color->color, int->int, int/float->float, bool->bool).
	// see INV032
	const overloadArgs = detail.overloadArgs;
	if (overloadArgs && overloadArgs.length === overloads.length) {
		const seen = new Map<string, string>();
		for (let i = 0; i < overloads.length; i++) {
			const ret = overloads[i].match(/→\s*(.+)$/)?.[1];
			const arg = overloadArgs[i]?.find((a) => a.name === match);
			if (!ret || !arg) continue;
			const key = baseType(arg.type);
			const retBase = baseType(ret);
			const prior = seen.get(key);
			if (prior !== undefined && prior !== retBase) return null;
			seen.set(key, retBase);
		}
	}
	return match;
}
