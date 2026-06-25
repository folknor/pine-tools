// Pure, stateless helpers for the Pine checker. Extracted from checker.ts so
// the validator class proper holds only state + orchestration. Everything here
// is a free function or const that depends on nothing in UnifiedPineValidator.

import type { Expression, Identifier, MemberExpression } from "../parser/ast";
import { type PineType, TypeChecker } from "./types";

// The five scalar primitives. A value of one of these types carries NO
// builtin methods (probed INV065 p06/p07: `x.abs()` / `s.length()` are both
// CE10271), so a method-call on a scalar can only resolve to a user-defined
// method - never a builtin. Used by the shadowed-namespace member-call check.
export const SCALAR_BASE_TYPES = new Set(["int", "float", "bool", "string", "color"]);
export const ARRAY_ELEMENT_RETURN_METHODS = new Set([
	"first",
	"get",
	"last",
	"pop",
	"remove",
	"shift",
]);
export const ARRAY_SELF_RETURN_METHODS = new Set(["concat", "copy", "slice"]);
export const MAP_SELF_RETURN_METHODS = new Set(["copy"]);
export const MATRIX_SELF_RETURN_METHODS = new Set(["copy", "submatrix"]);
export const MATRIX_ARRAY_RETURN_METHODS = new Set(["col", "row"]);

// Flatten a member-call callee into its dotted name (`strategy.risk.max_drawdown`).
// Walks `.object` recursively so two-level builtin namespaces resolve, not just
// `ns.member`. Returns "" if any link in the chain isn't a plain identifier
// property access (e.g. `foo().bar`, `arr[0].baz`). see INV054
export function memberChainName(expr: Expression): string {
	if (expr.type === "Identifier") return (expr as Identifier).name;
	if (expr.type === "MemberExpression") {
		const m = expr as MemberExpression;
		const base = memberChainName(m.object);
		if (!base) return "";
		return `${base}.${m.property.name}`;
	}
	return "";
}

// Resolve the concrete element type a collection mutator's value/key arg must
// match, from the receiver's type. array<E> -> E; map<K,V> -> K for the `key`
// param, V otherwise (map keys are primitives, so the first comma is always the
// K/V split). Returns null when the element type is unresolved (unknown/`type`)
// so the caller stays lenient. see INV087
export function collectionElementTarget(
	receiverType: PineType,
	kind: string,
	paramName: string,
): string | null {
	const r = String(receiverType);
	if (kind === "array") {
		if (!r.startsWith("array<") || !r.endsWith(">")) return null;
		const e = r.slice(6, -1).trim();
		return e === "unknown" || e === "type" ? null : e;
	}
	if (!r.startsWith("map<") || !r.endsWith(">")) return null;
	const inner = r.slice(4, -1);
	const c = inner.indexOf(",");
	if (c < 0) return null;
	const pick = (
		paramName === "key" ? inner.slice(0, c) : inner.slice(c + 1)
	).trim();
	return pick === "unknown" || pick === "type" ? null : pick;
}

// Element-type compatibility for collection mutators. Stricter than isAssignable
// on numerics: a widening int -> float is fine, but a narrowing float -> int is
// rejected (TV CE10123, probed 2026-06-25). na and unresolved args stay lenient.
// see INV087
export function elementArgAssignable(argType: PineType, target: string): boolean {
	if (argType === "unknown" || TypeChecker.isNaType(argType)) return true;
	const ab = TypeChecker.baseTypeName(String(argType));
	const tb = TypeChecker.baseTypeName(target);
	if (ab === tb) return true;
	if (tb === "float" && ab === "int") return true; // widening only
	return false;
}

// A pure `simple`-qualified primitive param ("simple int", ...). A series value
// is NOT allowed in such a slot (TV CE10123 "series int ... but simple int is
// expected", e.g. ta.ema length). Excludes union/combined forms - "simple
// series int" is series, "simple int/float" is a union. see INV088
export function isSimpleQualifiedParam(rawType?: string): boolean {
	return /^simple\s+(int|float|bool|string|color)$/.test((rawType ?? "").trim());
}

export function isSeriesQualified(argType: PineType): boolean {
	const s = String(argType);
	return s.startsWith("series<") || s.startsWith("series ");
}

// Opaque handle types returned by output/drawing builtins. They carry no
// qualifier and never participate in arithmetic/comparison - but only v6
// enforces that; TV v4/v5 are lenient (e.g. a v4 `plot()` handle compared
// with `>` is accepted - probed 2026-06-25). see INV089
export function isOpaqueHandleType(t: PineType): boolean {
	return (
		t === "plot" ||
		t === "hline" ||
		t === "line" ||
		t === "label" ||
		t === "box" ||
		t === "table"
	);
}

// array.from is the variadic same-element constructor: arg0 fixes the element
// type and every later arg must match it (numerics unify to int/float -
// `array.from(1, 2.0)` is array<float>). TV reports the FIRST incompatible arg
// as CE10122 with `expectedType` derived from arg0. The base set mirrors
// array.from's per-arg0-type overloads (po lookup array.from). see INV090
export function arrayFromExpectedType(arg0Base: string): string | null {
	if (arg0Base === "int" || arg0Base === "float") return "series int/float";
	if (
		arg0Base === "bool" ||
		arg0Base === "string" ||
		arg0Base === "color" ||
		arg0Base === "line" ||
		arg0Base === "label" ||
		arg0Base === "box" ||
		arg0Base === "table" ||
		arg0Base === "linefill"
	) {
		return `series ${arg0Base}`;
	}
	return null; // UDT / enum / na / unknown arg0 -> stay lenient
}

export function arrayFromArgMatches(argType: PineType, arg0Base: string): boolean {
	if (argType === "unknown" || TypeChecker.isNaType(argType)) return true;
	const ab = TypeChecker.baseTypeName(String(argType));
	if (arg0Base === "int" || arg0Base === "float") {
		return ab === "int" || ab === "float";
	}
	return ab === arg0Base;
}

// A collection type used as a type template argument of another collection
// (`array.new<array<float>>`, `map.new<string, array<float>>`) is TV's CE10025
// - probed; TV emits the message TWICE, at the call and at the enclosing
// statement start (the declaration case adds the second). see INV038
export const NESTED_COLLECTION_MESSAGE =
	"Cannot use a collection in a type template of another collection. Create a user-defined type with that collection as a field and use it instead.";

// TV's CE10123 arg-type template, shared by every arg-type emit site. The
// {typePostfix} slot is empty in every probe, which is why TV's rendered
// message carries a double space before "is expected". see INV061
export const CE10123_TEMPLATE =
	'Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but a "{currentTypeDocStr}" {typePostfix} is expected.';

// CE10122: a variadic same-element constructor (array.from) got an element
// incompatible with the one arg0 fixed. Note "one from" (vs CE10123's "a")
// and no trailing period - matched to TV's raw template. see INV090
export const CE10122_TEMPLATE =
	'Cannot call "{funId}" with argument "{argDisplayName}"="{argUserFriendlyRepresentation}". An argument of "{argumentType}" type was used but one from "{expectedType}" is expected';
