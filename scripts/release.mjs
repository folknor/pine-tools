#!/usr/bin/env node

// Cut a GitHub release for pine-tools.
//
// This builds the four release artifacts locally, tags the current commit,
// and uploads everything to a GitHub release via `gh`. There is no CI: the
// artifacts include gitignored local build output (the .vsix, the bundled
// CLI) that a clean checkout could not reproduce, so the release is assembled
// on the maintainer's machine and pushed directly.
//
// Artifacts (all version-stamped):
//   1. pine-data-v6-<version>.zip   - pine-data/v6/*.json + the pine-manual/v6
//                                      tree + manifest.json
//   2. pine-manual-v6-<version>.zip - the pine-manual/v6 tree + manifest.json
//   3. pine-lint                    - the self-contained Node CLI bundle
//   4. pine-tools-<version>.vsix    - the VS Code extension bundle
//
// The version is the single source of truth in package.json; the tag is
// `v<version>` and must not already exist. Run `pnpm run release` after
// bumping the version and updating CHANGELOG.md.
//
// Flags:
//   --dry-run      Build and stage artifacts, but do not tag, push, or release.
//   --skip-tests   Skip the test suite (not recommended for a real release).

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run");
const skipTests = args.has("--skip-tests");

function die(msg) {
	console.error(`\nERROR: ${msg}`);
	process.exit(1);
}

// Run a command, inheriting stdio, and abort the release if it fails.
function run(cmd, cmdArgs, opts = {}) {
	const res = spawnSync(cmd, cmdArgs, {
		cwd: repoRoot,
		stdio: "inherit",
		...opts,
	});
	if (res.status !== 0) {
		die(`command failed: ${cmd} ${cmdArgs.join(" ")}`);
	}
	return res;
}

// Run a command and capture trimmed stdout (for short queries like git sha).
function capture(cmd, cmdArgs) {
	const res = spawnSync(cmd, cmdArgs, { cwd: repoRoot, encoding: "utf8" });
	if (res.status !== 0) {
		die(`command failed: ${cmd} ${cmdArgs.join(" ")}\n${res.stderr ?? ""}`);
	}
	return res.stdout.trim();
}

// ---------------------------------------------------------------------------
// 1. Preflight
// ---------------------------------------------------------------------------

const pkg = JSON.parse(
	fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"),
);
const version = pkg.version;
const tag = `v${version}`;

console.log(`Preparing release ${tag}${dryRun ? " (dry run)" : ""}`);

// gh must be installed and authenticated.
if (!dryRun) {
	const gh = spawnSync("gh", ["auth", "status"], { cwd: repoRoot });
	if (gh.status !== 0) {
		die("`gh` is not installed or not authenticated. Run `gh auth login`.");
	}
}

// Working tree must be clean so the release reflects a committed state.
const dirty = capture("git", ["status", "--porcelain"]);
if (dirty && !dryRun) {
	die(
		"working tree is not clean. Commit or stash changes before releasing.\n" +
			dirty,
	);
}

// The tag must not already exist locally or on the remote.
const localTag = spawnSync("git", ["rev-parse", "-q", "--verify", `refs/tags/${tag}`], {
	cwd: repoRoot,
});
if (localTag.status === 0) {
	die(`tag ${tag} already exists locally. Bump the version in package.json.`);
}
const remoteTag = capture("git", ["ls-remote", "--tags", "origin", tag]);
if (remoteTag) {
	die(`tag ${tag} already exists on origin. Bump the version in package.json.`);
}

const gitSha = capture("git", ["rev-parse", "--short", "HEAD"]);

// The tracked Manual must be present.
const manualSrc = path.join(repoRoot, "pine-manual", "v6");
if (!fs.existsSync(manualSrc) || fs.readdirSync(manualSrc).length === 0) {
	die("pine-manual/v6 is missing or empty. Run `pnpm run generate:manual`.");
}

// The pine-data JSON catalogs must be present.
const dataSrc = path.join(repoRoot, "pine-data", "v6");
const dataJson = fs.existsSync(dataSrc)
	? fs.readdirSync(dataSrc).filter((f) => f.endsWith(".json"))
	: [];
if (dataJson.length === 0) {
	die("pine-data/v6/*.json is missing. Run `pnpm run generate`.");
}

// ---------------------------------------------------------------------------
// 2. Build
// ---------------------------------------------------------------------------

if (!skipTests) {
	console.log("\nRunning test suite...");
	run("pnpm", ["test"]);
} else {
	console.log("\nSkipping tests (--skip-tests).");
}

// `package` = clean + build:prod + vsce package. Produces the .vsix in dist/
// and the production CLI bundle at dist/packages/cli/src/cli.js.
console.log("\nBuilding extension + CLI bundle + packaging .vsix...");
run("pnpm", ["run", "package"]);

const cliBundle = path.join(repoRoot, "dist", "packages", "cli", "src", "cli.js");
if (!fs.existsSync(cliBundle)) {
	die(`CLI bundle missing after build: ${cliBundle}`);
}

const vsixName = `pine-tools-${version}.vsix`;
const vsixPath = path.join(repoRoot, "dist", vsixName);
if (!fs.existsSync(vsixPath)) {
	die(`.vsix missing after package: ${vsixPath}`);
}

// ---------------------------------------------------------------------------
// 3. Assemble artifacts
// ---------------------------------------------------------------------------

const releaseDir = path.join(repoRoot, "build", "release");
fs.rmSync(releaseDir, { recursive: true, force: true });
fs.mkdirSync(releaseDir, { recursive: true });

const manifest = {
	name: "pine-tools",
	version,
	tag,
	gitSha,
	builtAt: new Date().toISOString(),
};

// Stage a directory and zip its contents into <name>.zip under releaseDir.
function zipFromStaging(stagingName, zipName, fill) {
	const staging = path.join(releaseDir, stagingName);
	fs.mkdirSync(staging, { recursive: true });
	fill(staging);
	fs.writeFileSync(
		path.join(staging, "manifest.json"),
		`${JSON.stringify(manifest, null, 2)}\n`,
	);
	const zipPath = path.join(releaseDir, zipName);
	// `zip -r <abs.zip> .` from inside the staging dir preserves relative paths.
	run("zip", ["-rq", zipPath, "."], { cwd: staging });
	return zipPath;
}

console.log("\nAssembling artifacts...");

// Artifact 1: pine-data JSON + manual tree.
const dataZip = zipFromStaging(
	"staging-data",
	`pine-data-v6-${version}.zip`,
	(staging) => {
		const dataDst = path.join(staging, "pine-data", "v6");
		fs.mkdirSync(dataDst, { recursive: true });
		for (const f of dataJson) {
			fs.copyFileSync(path.join(dataSrc, f), path.join(dataDst, f));
		}
		fs.cpSync(manualSrc, path.join(staging, "pine-manual", "v6"), {
			recursive: true,
		});
	},
);

// Artifact 2: the manual tree on its own.
const manualZip = zipFromStaging(
	"staging-manual",
	`pine-manual-v6-${version}.zip`,
	(staging) => {
		fs.cpSync(manualSrc, path.join(staging, "pine-manual", "v6"), {
			recursive: true,
		});
	},
);

// Artifact 3: the self-contained CLI bundle, named `pine-lint`.
const pineLint = path.join(releaseDir, "pine-lint");
fs.copyFileSync(cliBundle, pineLint);
fs.chmodSync(pineLint, 0o755);

// Artifact 4: the .vsix (copied alongside the rest for a single upload set).
const vsixOut = path.join(releaseDir, vsixName);
fs.copyFileSync(vsixPath, vsixOut);

const artifacts = [pineLint, vsixOut, dataZip, manualZip];

console.log("\nArtifacts staged in build/release:");
for (const a of artifacts) {
	const kb = (fs.statSync(a).size / 1024).toFixed(0);
	console.log(`  ${path.basename(a)}  (${kb} KB)`);
}

// ---------------------------------------------------------------------------
// 4. Release notes from CHANGELOG.md
// ---------------------------------------------------------------------------

// Pull the section for this version: from `## <version>` to the next `## `.
function changelogSection(ver) {
	const changelogPath = path.join(repoRoot, "CHANGELOG.md");
	if (!fs.existsSync(changelogPath)) return null;
	const lines = fs.readFileSync(changelogPath, "utf8").split("\n");
	const escaped = ver.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const head = new RegExp(`^##\\s+\\[?${escaped}\\]?\\b`);
	const start = lines.findIndex((l) => head.test(l));
	if (start === -1) return null;
	let end = lines.length;
	for (let i = start + 1; i < lines.length; i++) {
		if (/^##\s/.test(lines[i])) {
			end = i;
			break;
		}
	}
	return lines.slice(start + 1, end).join("\n").trim() || null;
}

const notes =
	changelogSection(version) ??
	`Release ${tag}. See CHANGELOG.md for details.`;
const notesPath = path.join(releaseDir, "release-notes.md");
fs.writeFileSync(notesPath, `${notes}\n`);

// ---------------------------------------------------------------------------
// 5. Tag + release
// ---------------------------------------------------------------------------

if (dryRun) {
	console.log(
		`\nDry run complete. Would tag ${tag} and create a GitHub release.`,
	);
	console.log(`Release notes (from CHANGELOG):\n\n${notes}\n`);
	process.exit(0);
}

console.log(`\nTagging ${tag}...`);
run("git", ["tag", "-a", tag, "-m", `Release ${tag}`]);
run("git", ["push", "origin", tag]);

console.log(`\nCreating GitHub release ${tag}...`);
run("gh", [
	"release",
	"create",
	tag,
	...artifacts,
	"--title",
	tag,
	"--notes-file",
	notesPath,
]);

console.log(`\nRelease ${tag} published.`);
