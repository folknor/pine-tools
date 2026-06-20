#!/usr/bin/env -S node --experimental-strip-types

/**
 * Pine published-library fetcher (TradingView pine-facade).
 *
 * Resolves and downloads the SOURCE of a published, anonymously-readable Pine
 * library into `vendor/<user>/<lib>/<major>.pine`, where `generate:libraries`
 * then extracts its export set (INV067). Mirrors piners'
 * `piners-data/src/pine_facade.rs` two-step protocol exactly.
 *
 * Network step (the only one in this feature) - hits TradingView's
 * pine-facade. Public open-source ("open_no_auth") libraries need no auth,
 * just a User-Agent. Restricted/invite-only libraries are rejected.
 *
 * Usage:
 *   node --experimental-strip-types packages/pipeline/src/fetch-library.ts <user/lib/major> [...]
 *   node --experimental-strip-types packages/pipeline/src/fetch-library.ts TradingView/ta/12
 *
 * Published majors are immutable, so a fetched copy never needs refreshing.
 * After fetching, run `pnpm run build && pnpm run generate:libraries`.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = __dirname.includes("/dist/")
	? path.resolve(__dirname, "../../../..")
	: path.resolve(__dirname, "../../..");

const BASE = (
	process.env.PINERS_FACADE_URL ??
	"https://pine-facade.tradingview.com/pine-facade"
).replace(/\/+$/, "");
const USER_AGENT = "pine-tools (Pine library export fetcher)";
const VENDOR_DIR = path.join(PROJECT_ROOT, "vendor");

const argv = process.argv.slice(2);
const fromIdx = argv.indexOf("--from");
const refs =
	fromIdx !== -1
		? fs
				.readFileSync(argv[fromIdx + 1], "utf8")
				.split("\n")
				.map((l) => l.trim())
				.filter((l) => l && !l.startsWith("#"))
		: argv.filter((a) => !a.startsWith("--"));
if (refs.length === 0) {
	console.error(
		"usage: fetch-library.ts <user/lib/major> [...]  |  --from <file-of-refs>",
	);
	process.exit(1);
}

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;
function parseRef(ref: string): { user: string; lib: string; major: string } {
	const parts = ref.split("/");
	if (
		parts.length !== 3 ||
		!IDENT.test(parts[0]) ||
		!IDENT.test(parts[1]) ||
		!/^\d+$/.test(parts[2])
	) {
		throw new Error(
			`invalid library import path '${ref}' (expected User/Lib/Major)`,
		);
	}
	return { user: parts[0], lib: parts[1], major: parts[2] };
}

async function getJson(url: string): Promise<unknown> {
	const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
	if (res.status === 404) throw new Error(`404 (not found): ${url}`);
	if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
	return res.json();
}

/** lib_list -> the exact-match row's PUB id + access string. */
async function resolveRef(
	ref: string,
): Promise<{ pubId: string; access: string }> {
	const url = `${BASE}/lib_list/?lib_id_prefix=${encodeURIComponent(ref)}&ignore_case=true`;
	const rows = (await getJson(url)) as Array<{
		scriptIdPart?: string;
		libId?: string;
		scriptAccess?: string;
	}>;
	const row = rows.find((r) => r.libId === ref);
	if (!row?.scriptIdPart)
		throw new Error(`published library '${ref}' not found`);
	return {
		pubId: row.scriptIdPart,
		access: row.scriptAccess ?? "open_no_auth",
	};
}

/** get -> the full Pine source (CRLF), re-checking access. */
async function fetchSource(pubId: string, major: string): Promise<string> {
	const url = `${BASE}/get/${encodeURIComponent(pubId)}/${major}?no_4xx=true`;
	const payload = (await getJson(url)) as {
		source?: string;
		scriptAccess?: string;
	};
	if (payload.scriptAccess && payload.scriptAccess !== "open_no_auth") {
		throw new Error(
			`'${pubId}' is not anonymously readable: ${payload.scriptAccess}`,
		);
	}
	if (typeof payload.source !== "string")
		throw new Error(`'${pubId}' returned no source`);
	return payload.source;
}

let failures = 0;
for (const ref of refs) {
	try {
		const { user, lib, major } = parseRef(ref);
		const { pubId, access } = await resolveRef(ref);
		if (access !== "open_no_auth") {
			console.warn(`SKIP ${ref}: not anonymously readable (${access})`);
			failures++;
			continue;
		}
		// Normalize CRLF -> LF: TV serves CRLF, and our lexer doubles line
		// numbers on \r\r\n (G005). The vendored sources are all LF.
		const source = (await fetchSource(pubId, major)).replace(/\r\n/g, "\n");
		const file = path.join(VENDOR_DIR, user, lib, `${major}.pine`);
		fs.mkdirSync(path.dirname(file), { recursive: true });
		fs.writeFileSync(file, source);
		const deps = [...source.matchAll(/^\s*import\s+([\w]+\/[\w]+\/\d+)/gm)].map(
			(m) => m[1],
		);
		console.log(
			`OK   ${ref} -> ${path.relative(PROJECT_ROOT, file)} (${source.split("\n").length} lines, id ${pubId})` +
				(deps.length
					? `\n     imports: ${deps.join(", ")} - vendor any not already present`
					: ""),
		);
	} catch (err) {
		console.error(`FAIL ${ref}: ${(err as Error).message}`);
		failures++;
	}
}

console.log(
	`\n${refs.length - failures}/${refs.length} fetched. Next: pnpm run build && pnpm run generate:libraries`,
);
process.exit(failures > 0 ? 1 : 0);
