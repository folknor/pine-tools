# Releasing

Releases are cut locally and pushed straight to GitHub with `gh` - there is
no CI. The release artifacts include gitignored local build output (the
`.vsix`, the bundled CLI) that a clean checkout could not reproduce, so the
release is assembled on the maintainer's machine.

## Prerequisites

- `gh` installed and authenticated (`gh auth login`).
- `zip` available on PATH.
- A clean working tree on `main`, up to date with `origin`.

## Steps

1. Bump `version` in `package.json` (this is the single source of truth; the
   tag is `v<version>` and the `.vsix`, `pine-lint --version`, and every
   artifact's `manifest.json` all read from it).

2. Add a matching section to `CHANGELOG.md`:

   ```markdown
   ## <version>

   - What changed
   ```

   The release notes are extracted from the `## <version>` heading down to the
   next `## ` heading. If no section is found, a generic note is used.

3. Commit the version bump and changelog.

4. (Optional) Preview without tagging or publishing:

   ```bash
   pnpm run release -- --dry-run
   ```

   This builds and stages all artifacts under `build/release/` and prints the
   notes it would post, but does not tag, push, or create a release.

5. Cut the release:

   ```bash
   pnpm run release
   ```

   This runs the test suite, builds and packages everything, tags `v<version>`,
   pushes the tag, and creates the GitHub release with the artifacts attached.

## What it produces

The release uploads four version-stamped artifacts:

| Artifact | Contents |
|----------|----------|
| `pine-tools-<version>.vsix` | The VS Code extension bundle. |
| `pine-lint` | The self-contained Node CLI (executable; `#!/usr/bin/env node`). |
| `pine-data-v6-<version>.zip` | `pine-data/v6/*.json` + the `pine-manual/v6` tree + `manifest.json`. |
| `pine-manual-v6-<version>.zip` | The `pine-manual/v6` tree + `manifest.json`. |

`manifest.json` records the version, tag, short git SHA, and build time.

## Flags

- `--dry-run` - build and stage artifacts, but do not tag, push, or release.
- `--skip-tests` - skip the test suite (not recommended for a real release).

## Preflight checks

`pnpm run release` aborts before doing anything irreversible if:

- `gh` is not authenticated.
- The working tree is dirty.
- The tag `v<version>` already exists locally or on `origin`.
- `pine-manual/v6` or `pine-data/v6/*.json` is missing.
