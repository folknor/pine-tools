#!/usr/bin/env node

// Rebuild the CLI bundle and copy it to `~/.local/bin/pine-lint` as a real
// file (not a symlink — some harnesses mis-handle symlinks). The bundle
// produced by build-extension.js already carries a `#!/usr/bin/env node`
// shebang, so the copy is directly executable once we chmod +x.
// Re-run this whenever the CLI source changes.

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");
const bundledCli = path.join(
	repoRoot,
	"dist",
	"packages",
	"cli",
	"src",
	"cli.js",
);
const installDir = path.join(os.homedir(), ".local", "bin");
const installPath = path.join(installDir, "pine-lint");

console.log("Building bundled CLI...");
const build = spawnSync("pnpm", ["run", "build"], {
	cwd: repoRoot,
	stdio: "inherit",
});
if (build.status !== 0) {
	console.error("Build failed.");
	process.exit(build.status ?? 1);
}

if (!fs.existsSync(bundledCli)) {
	console.error(`Bundled CLI missing after build: ${bundledCli}`);
	process.exit(1);
}

fs.mkdirSync(installDir, { recursive: true });

let replaced = null;
try {
	const stat = fs.lstatSync(installPath);
	if (stat.isSymbolicLink()) {
		replaced = `symlink -> ${fs.readlinkSync(installPath)}`;
	} else if (stat.isFile()) {
		replaced = "regular file";
	} else {
		replaced = "existing entry";
	}
	fs.unlinkSync(installPath);
} catch (e) {
	if (e.code !== "ENOENT") throw e;
}

fs.copyFileSync(bundledCli, installPath);
fs.chmodSync(installPath, 0o755);

const bytes = fs.statSync(installPath).size;
console.log(
	`Installed: ${installPath} (${bytes} bytes, copied from ${bundledCli})`,
);
if (replaced) console.log(`Replaced: ${replaced}`);

const pathEntries = (process.env.PATH ?? "").split(path.delimiter);
if (!pathEntries.includes(installDir)) {
	console.warn(
		`Warning: ${installDir} is not on $PATH. Add it (e.g. in ~/.zshrc) for the command to resolve.`,
	);
}
