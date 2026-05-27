#!/usr/bin/env node
// Walks /home/folk/Programs for .pine files, dedupes by sha256 of contents,
// and copies unique files into ./fixtures/<hash>.pine.
//
// Usage: node scripts/collect-pine-fixtures.mjs [source-dir] [dest-dir]

import { createHash } from "node:crypto";
import { readFile, readdir, mkdir, stat, copyFile } from "node:fs/promises";
import { resolve, join, relative } from "node:path";

const SOURCE = resolve(process.argv[2] ?? "/home/folk/Programs");
const DEST = resolve(process.argv[3] ?? "fixtures");

const SKIP_DIRS = new Set([
	"node_modules",
	".git",
	".pnpm",
	".cache",
	"dist",
	"build",
	"out",
	"target",
	".next",
	".turbo",
]);

async function* walk(dir) {
	let entries;
	try {
		entries = await readdir(dir, { withFileTypes: true });
	} catch {
		return;
	}
	for (const entry of entries) {
		const full = join(dir, entry.name);
		if (entry.isSymbolicLink()) continue;
		if (entry.isDirectory()) {
			if (SKIP_DIRS.has(entry.name)) continue;
			if (full === DEST) continue;
			yield* walk(full);
		} else if (entry.isFile() && entry.name.endsWith(".pine")) {
			yield full;
		}
	}
}

async function main() {
	await mkdir(DEST, { recursive: true });

	const seen = new Map();
	let scanned = 0;
	let copied = 0;
	let duplicates = 0;

	for await (const file of walk(SOURCE)) {
		scanned++;
		let contents;
		try {
			contents = await readFile(file);
		} catch (err) {
			console.warn(`skip ${file}: ${err.message}`);
			continue;
		}
		const hash = createHash("sha256").update(contents).digest("hex");
		if (seen.has(hash)) {
			duplicates++;
			continue;
		}
		seen.set(hash, file);
		const target = join(DEST, `${hash}.pine`);
		await copyFile(file, target);
		copied++;
	}

	console.log(`scanned:    ${scanned}`);
	console.log(`copied:     ${copied}`);
	console.log(`duplicates: ${duplicates}`);
	console.log(`dest:       ${relative(process.cwd(), DEST) || DEST}`);
}

main().catch((err) => {
	console.error(err);
	process.exit(1);
});
