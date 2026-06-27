export type Qualifier = "const" | "input" | "simple" | "series";

// Pine's promotion order: const < input < simple < series. see INV122
export const QUALIFIER_ORDER: readonly Qualifier[] = [
	"const",
	"input",
	"simple",
	"series",
] as const;

export function qualRank(q: Qualifier): number {
	return QUALIFIER_ORDER.indexOf(q);
}

export function joinQualifier(a: Qualifier, b: Qualifier): Qualifier {
	return qualRank(a) >= qualRank(b) ? a : b;
}

export function leadingQualifierOf(raw: string): Qualifier | undefined {
	const m = raw.trim().match(/^(const|input|simple|series)\b/);
	return m ? (m[1] as Qualifier) : undefined;
}

export interface Provenance {
	base: string;
	qualifier: Qualifier;
}
